#!/usr/bin/env python3
"""Label every body paragraph of all ~255 Wikipedia articles using an LLM.

Uses the classifier's own paragraph segmentation (via .calibrate-fetch-cache.json)
to close the alignment gap. DeepSeek has no batch API (unlike Anthropic's
Batches endpoint the plan originally assumed — see LLM_LABELLING.md), so
requests run as concurrent synchronous chat-completion calls instead. DeepSeek
caches repeated prompt prefixes automatically (no explicit action needed) and
prices cache hits far below cache misses, so usage is tracked separately for
each. Persists raw labels plus the model ID, prompt version, and a per-article
content hash for staleness detection.

Usage:
    # Step 1: Prepare the request list.
    python3 scripts/llm_label_corpus.py --prepare --model MODEL_ID \\
        --output labels-requests.jsonl

    # Step 2: Run all requests concurrently and save results.
    python3 scripts/llm_label_corpus.py --run labels-requests.jsonl \\
        --output labels-corpus.json

    # Step 3: Check staleness (compare content hashes).
    python3 scripts/llm_label_corpus.py --stale labels-corpus.json

Requires:
    pip install openai   (DeepSeek's API is OpenAI-compatible)
    DEEPSEEK_API_KEY environment variable set.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

ALGO_DIR = Path(__file__).resolve().parent.parent
FETCH_CACHE_PATH = ALGO_DIR / ".calibrate-fetch-cache.json"
ARTICLES_CSV_PATH = ALGO_DIR / "Wikipedia Articles.csv"
DEFAULT_OUTPUT = ALGO_DIR / "labels-corpus.json"

DEEPSEEK_BASE_URL = "https://api.deepseek.com"

# Pricing per million tokens (see LLM_LABELLING.md for source/date).
MODEL_PRICING = {
    "deepseek-v4-flash": {"input_hit": 0.0028, "input_miss": 0.14, "output": 0.28},
    "deepseek-v4-pro": {"input_hit": 0.003625, "input_miss": 0.435, "output": 0.87},
}

# System prompt (same as llm_label_validate.py — keep in sync).
SYSTEM_PROMPT = """You are labelling Wikipedia paragraphs about Jesus and the New Testament.

For each paragraph, assign exactly one of these three labels:
- "data": The paragraph reports verifiable facts, events, geography, dates,
  manuscript evidence, or archaeological findings. It describes what is known
  or what sources say, without evaluating theological meaning.
- "close": The paragraph performs literary, textual, or source-critical
  analysis — comparing manuscripts, noting narrative structure, discussing
  authorship or redaction, analysing language or genre. It examines HOW the
  text works, not what it means theologically.
- "interpretation": The paragraph discusses theological meaning, religious
  significance, doctrinal implications, or what a passage "means" for faith.
  It engages with the content's truth, message, or spiritual import.

Respond with a JSON object only: {"labels": [...]}, one label per paragraph,
in the same order as the paragraphs were provided. Do not include any
reasoning, explanation, or text outside the JSON object."""

RUBRIC = """Label each of the following paragraphs as "data", "close", or "interpretation" using these criteria:

DATA — reports a single verifiable fact, event, geography, date, or finding
as settled, without comparing it against another source or account. E.g. "The
crucifixion occurred in Judaea, most likely in AD 30 or AD 33."

CLOSE — compares two or more manuscripts, gospels, or textual witnesses
against each other, or discusses authorship, redaction, structure, or genre.
The key signal is COMPARISON or textual mechanics, not just multiple facts:
"The Synoptics place the event near Bethsaida, while John locates it on the
eastern shore" is CLOSE (comparing what different gospel accounts say),
even though both halves individually read like data. "Matthew and Luke agree
that Jesus was born in Bethlehem... but differ on many details" is CLOSE for
the same reason. If a paragraph names two-or-more sources/gospels and states
where they agree or disagree, that is CLOSE even if no interpretive language
appears.

INTERPRETATION — discusses theological meaning, religious significance,
doctrinal implications, or what a passage "means" for faith. Engages with
content's truth, message, or spiritual import. This includes paragraphs that
report scholarly debate, disagreement, or uncertainty about what a passage
means or whether an event is historical (e.g. "scholars debate...",
"the historicity of X is questioned...", "most theologians view X as...") —
reporting that a meaning or historicity claim is contested is itself an
interpretive move, not a data statement, even though it describes what
sources say rather than asserting the claim directly.

Respond with a JSON object: {"labels": ["data", "close", ...]} — exactly one
label per paragraph, in order, with no additional text or explanation."""

# Max paragraphs per request (~500 tokens each, well under context limits).
MAX_PARAGRAPHS_PER_REQUEST = 100

# Concurrent in-flight requests. DeepSeek has no documented hard concurrency
# cap for standard accounts; kept modest to avoid rate-limit thrash.
DEFAULT_CONCURRENCY = 8

# Retries per request on transient errors.
MAX_RETRIES = 3


def load_fetch_cache() -> dict:
    """Load .calibrate-fetch-cache.json — article title -> list of paragraph strings."""
    if not FETCH_CACHE_PATH.exists():
        return {}
    with open(FETCH_CACHE_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def load_corpus_titles() -> list[dict]:
    """Load the full ~255-article corpus (title, url) from Wikipedia Articles.csv."""
    if not ARTICLES_CSV_PATH.exists():
        print(f"ERROR: {ARTICLES_CSV_PATH} not found.", file=sys.stderr)
        sys.exit(1)
    with open(ARTICLES_CSV_PATH, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def ensure_full_corpus_cached() -> dict:
    """Fetch and cache paragraphs for every article in Wikipedia Articles.csv.

    The fetch cache (.calibrate-fetch-cache.json) is populated by calibrate.py
    for only the 39 gold-set articles it calibrates against — it is NOT the
    full ~255-article corpus. This fetches whatever titles are missing (via
    the same Wikipedia parse API calibrate.py uses) and extends the same
    cache file, so calibrate.py's own gold-set entries are unaffected.
    """
    if str(ALGO_DIR) not in sys.path:
        sys.path.insert(0, str(ALGO_DIR))
    from calibrate import fetch_article_paragraphs  # local import: avoid calibrate's argparse setup on --stale/--run paths

    cache = load_fetch_cache()
    corpus = load_corpus_titles()
    missing = [row for row in corpus if row["title"] not in cache]

    if not missing:
        return cache

    print(f"Fetching {len(missing)} of {len(corpus)} corpus articles not yet cached...")
    for i, row in enumerate(missing, start=1):
        title, url = row["title"], row["url"]
        try:
            cache[title] = fetch_article_paragraphs(url)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"  ERROR fetching {title!r}: {exc}", file=sys.stderr)
            continue
        time.sleep(8.0)  # be polite to Wikipedia's API — 0.5s and 2s both tripped 429s in testing
        if i % 20 == 0 or i == len(missing):
            print(f"  ... {i}/{len(missing)} fetched")
            with open(FETCH_CACHE_PATH, "w", encoding="utf-8") as fh:
                json.dump(cache, fh, indent=2, ensure_ascii=False)  # incremental save

    with open(FETCH_CACHE_PATH, "w", encoding="utf-8") as fh:
        json.dump(cache, fh, indent=2, ensure_ascii=False)
    print(f"Fetch cache updated: {len(cache)} articles total → {FETCH_CACHE_PATH}")
    return cache


def content_hash(text: str) -> str:
    """SHA-256 hash of the full article text for staleness detection."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def prepare_requests(model_id: str, output_path: Path) -> dict:
    """Build a JSONL request file from the fetch cache.

    Each line is one request: one article's paragraphs (split into chunks
    if needed) labelled with the three-tier rubric. Fetches any corpus
    articles not yet cached before building requests.

    Returns summary stats for recording.
    """
    cache = ensure_full_corpus_cached()
    articles = []
    total_paragraphs = 0
    total_requests = 0

    with open(output_path, "w", encoding="utf-8") as fh:
        for title, paragraphs in sorted(cache.items()):
            if not paragraphs:
                continue

            full_text = "\n\n".join(paragraphs)
            chash = content_hash(full_text)

            # Split into chunks of MAX_PARAGRAPHS_PER_REQUEST.
            for chunk_idx in range(0, len(paragraphs), MAX_PARAGRAPHS_PER_REQUEST):
                chunk = paragraphs[chunk_idx : chunk_idx + MAX_PARAGRAPHS_PER_REQUEST]

                lines = [RUBRIC, ""]
                for j, text in enumerate(chunk, start=1):
                    lines.append(f"[{j}] {text}")
                user_message = "\n".join(lines)

                # max_tokens=16000: deepseek-v4-flash is a reasoning model whose hidden
                # reasoning_content consumes the same budget as the visible JSON answer.
                # 4096 was measured to truncate mid-reasoning on ~100-paragraph chunks,
                # producing empty/short label arrays with finish_reason="length".
                custom_id = f"{title}::chunk{chunk_idx // MAX_PARAGRAPHS_PER_REQUEST}"
                request = {
                    "custom_id": custom_id,
                    "model": model_id,
                    "max_tokens": 16000,
                    "user_message": user_message,
                    "n_paragraphs": len(chunk),
                }
                fh.write(json.dumps(request) + "\n")
                total_requests += 1

            articles.append({
                "title": title,
                "paragraph_count": len(paragraphs),
                "content_hash": chash,
            })
            total_paragraphs += len(paragraphs)

    stats = {
        "model_id": model_id,
        "articles": len(articles),
        "total_paragraphs": total_paragraphs,
        "total_requests": total_requests,
        "paragraphs_per_request": MAX_PARAGRAPHS_PER_REQUEST,
        "article_index": articles,
    }

    print(f"Prepared {total_requests} requests for {len(articles)} articles "
          f"({total_paragraphs} paragraphs) → {output_path}")
    return stats


def _run_one_request(client, request: dict) -> dict:
    """Execute a single labelling request with retries. Returns a result dict.

    Retries when the response's label count doesn't match the paragraph
    count sent (empty/malformed JSON, or the model dropping paragraphs),
    not just on hard exceptions — an early corpus run found 44 articles
    with 0 labels because only exception-based retry existed.
    """
    import openai

    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=request["model"],
                max_tokens=request["max_tokens"],
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": request["user_message"]},
                ],
            )
            text = (response.choices[0].message.content or "").strip()
            try:
                parsed = json.loads(text)
                labels = [str(x).strip().lower() for x in parsed.get("labels", [])]
            except (json.JSONDecodeError, AttributeError):
                labels = []
            if len(labels) != request["n_paragraphs"] and attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
                continue
            usage = response.usage
            cache_hit = getattr(usage, "prompt_cache_hit_tokens", 0) or 0
            cache_miss = getattr(usage, "prompt_cache_miss_tokens", None)
            if cache_miss is None:
                cache_miss = max((usage.prompt_tokens or 0) - cache_hit, 0)
            return {
                "custom_id": request["custom_id"],
                "status": "ok",
                "labels": labels,
                "usage": {
                    "prompt_cache_hit_tokens": cache_hit,
                    "prompt_cache_miss_tokens": cache_miss,
                    "output_tokens": usage.completion_tokens or 0,
                },
            }
        except openai.OpenAIError as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
    return {
        "custom_id": request["custom_id"],
        "status": "error",
        "error_message": str(last_exc),
    }


def run_requests(
    requests_path: Path,
    output_path: Path,
    model_id: str,
    concurrency: int,
    stats: Optional[dict] = None,
) -> None:
    """Execute all requests concurrently and save results to output_path."""
    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: openai package not installed.", file=sys.stderr)
        sys.exit(1)

    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("ERROR: DEEPSEEK_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)

    requests = []
    with open(requests_path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                requests.append(json.loads(line))

    print(f"Running {len(requests)} requests with concurrency={concurrency}...")

    results: dict[str, dict] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = {pool.submit(_run_one_request, client, req): req for req in requests}
        for future in as_completed(futures):
            result = future.result()
            results[result["custom_id"]] = result
            done += 1
            if done % 10 == 0 or done == len(requests):
                print(f"  ... {done}/{len(requests)} requests complete")

    # Assemble per-article labels from chunked results.
    articles: dict[str, dict] = {}
    total_cache_hit = 0
    total_cache_miss = 0
    total_output = 0

    for custom_id, entry in results.items():
        if "::chunk" in custom_id:
            title = custom_id.rsplit("::chunk", 1)[0]
        else:
            title = custom_id

        if title not in articles:
            articles[title] = {"labels": [], "chunks_ok": 0, "chunks_error": 0}

        if entry["status"] == "ok":
            articles[title]["labels"].extend(entry["labels"])
            articles[title]["chunks_ok"] += 1
            u = entry["usage"]
            total_cache_hit += u["prompt_cache_hit_tokens"]
            total_cache_miss += u["prompt_cache_miss_tokens"]
            total_output += u["output_tokens"]
        else:
            articles[title]["chunks_error"] += 1

    pricing = MODEL_PRICING.get(model_id, MODEL_PRICING["deepseek-v4-flash"])
    total_cost = (
        total_cache_hit / 1_000_000 * pricing["input_hit"]
        + total_cache_miss / 1_000_000 * pricing["input_miss"]
        + total_output / 1_000_000 * pricing["output"]
    )

    output = {
        "model_id": model_id,
        "prompt_version": "v1",
        "stats": {
            "articles_labelled": len(articles),
            "total_paragraphs": sum(len(a["labels"]) for a in articles.values()),
            "articles_with_errors": sum(1 for a in articles.values() if a["chunks_error"] > 0),
            "prompt_cache_hit_tokens": total_cache_hit,
            "prompt_cache_miss_tokens": total_cache_miss,
            "output_tokens": total_output,
            "estimated_cost_usd": round(total_cost, 2),
        },
        "articles": articles,
    }

    if stats and "article_index" in stats:
        hash_map = {a["title"]: a["content_hash"] for a in stats["article_index"]}
        for title, article in output["articles"].items():
            article["content_hash"] = hash_map.get(title, "unknown")

    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)

    print(f"\nResults saved to {output_path}")
    print(f"  Articles:            {output['stats']['articles_labelled']}")
    print(f"  Paragraphs:          {output['stats']['total_paragraphs']}")
    print(f"  Errors:              {output['stats']['articles_with_errors']}")
    print(f"  Cache-hit tokens:    {total_cache_hit:,}")
    print(f"  Cache-miss tokens:   {total_cache_miss:,}")
    print(f"  Output tokens:       {total_output:,}")
    print(f"  Est. cost:           ${total_cost:.2f}")


def check_staleness(labels_path: Path) -> None:
    """Report which articles have drifted since they were labelled."""
    cache = load_fetch_cache()

    with open(labels_path, encoding="utf-8") as fh:
        labels_data = json.load(fh)

    labelled_articles = labels_data.get("articles", {})

    stale = []
    missing_from_cache = []
    newly_added = []

    for title, article in sorted(labelled_articles.items()):
        stored_hash = article.get("content_hash")
        if title not in cache:
            missing_from_cache.append(title)
            continue
        paragraphs = cache.get(title, [])
        current_hash = content_hash("\n\n".join(paragraphs))
        if stored_hash and stored_hash != current_hash:
            stale.append({
                "title": title,
                "stored_hash": stored_hash,
                "current_hash": current_hash,
            })

    for title in cache:
        if title not in labelled_articles:
            newly_added.append(title)

    print(f"Staleness check — {labels_path}")
    print(f"  Labelled articles:     {len(labelled_articles)}")
    print(f"  Cached articles:       {len(cache)}")
    print(f"  Stale (drifted):       {len(stale)}")
    print(f"  Missing from cache:    {len(missing_from_cache)}")
    print(f"  New (unlabelled):      {len(newly_added)}")

    if stale:
        print(f"\n  Stale articles (content hash changed since labelling):")
        for s in stale[:20]:
            print(f"    {s['title']}")
        if len(stale) > 20:
            print(f"    ... and {len(stale) - 20} more.")

    if newly_added:
        print(f"\n  New articles not yet labelled:")
        for title in newly_added[:10]:
            print(f"    {title}")
        if len(newly_added) > 10:
            print(f"    ... and {len(newly_added) - 10} more.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Label Wikipedia articles with an LLM (DeepSeek, concurrent requests)."
    )
    parser.add_argument(
        "--prepare",
        action="store_true",
        help="Prepare the request JSONL file.",
    )
    parser.add_argument(
        "--run",
        metavar="REQUESTS_JSONL",
        help="Run a prepared JSONL file of requests concurrently.",
    )
    parser.add_argument(
        "--stale",
        metavar="LABELS_JSON",
        help="Check staleness of a labels file against the fetch cache.",
    )
    parser.add_argument(
        "--model",
        default="deepseek-v4-flash",
        help="Model ID for labelling (default: deepseek-v4-flash).",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help=f"Concurrent in-flight requests (default: {DEFAULT_CONCURRENCY}).",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output file path.",
    )
    args = parser.parse_args()

    if args.stale:
        check_staleness(Path(args.stale))
        return

    if args.prepare:
        output_path = Path(args.output) if args.output else ALGO_DIR / "labels-requests.jsonl"
        stats = prepare_requests(args.model, output_path)
        stats_path = output_path.with_suffix(".stats.json")
        with open(stats_path, "w", encoding="utf-8") as fh:
            json.dump(stats, fh, indent=2, ensure_ascii=False)
        print(f"Stats saved to {stats_path}")
        return

    if args.run:
        output_path = Path(args.output) if args.output else DEFAULT_OUTPUT
        requests_path = Path(args.run)
        stats = None
        stats_path = requests_path.with_suffix(".stats.json")
        if stats_path.exists():
            try:
                with open(stats_path, encoding="utf-8") as fh:
                    stats = json.load(fh)
            except (json.JSONDecodeError, OSError):
                pass
        run_requests(requests_path, output_path, args.model, args.concurrency, stats)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
