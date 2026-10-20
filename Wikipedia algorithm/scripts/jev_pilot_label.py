#!/usr/bin/env python3
"""Label paragraphs with one engine (Jev or DeepSeek).

Two sources. "gold" (default) is the hand-labelled gold-set-three-tier.csv; both
engines read it through paragraph_eval, and jev_pilot_report.py compares them
with the human tiers. "corpus" is every paragraph of the fetch cache, in cache
order; only Jev labels it, because labels-corpus.json already holds the DeepSeek
labels. train_agreement_head.py reads that Jev output (--jev-labels).

Usage:
    python3 scripts/jev_pilot_label.py --engine jev --output jev.json
    python3 scripts/jev_pilot_label.py --engine deepseek --output deepseek.json
    python3 scripts/jev_pilot_label.py --engine jev --source corpus --output jev-corpus.json

Keys come from the environment: JEV_API_KEY (Jev) and DEEPSEEK_API_KEY.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ALGO_DIR = Path(__file__).resolve().parent.parent
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from scripts.llm_label_corpus import load_fetch_cache
from scripts.llm_prompts import RUBRIC, SYSTEM_PROMPT
from scripts.paragraph_eval import load_three_tier_gold

JEV_URL = "https://api.typesafe.ai/v1/systemone"
JEV_MODEL = "jev-1.13.0"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"

# Jev rate limits are far above this; 5 matches the vendor's advice for bulk work.
JEV_CONCURRENCY = 5
MAX_RETRIES = 3
# Same budget as llm_label_corpus.py: the model's hidden reasoning shares it.
DEEPSEEK_MAX_TOKENS = 16000

LABELS = ("data", "interpretation")

# The two definitions repeat the production rubric (llm_prompts.RUBRIC) in the
# short form a Jev choice option takes. If the rubric changes, change these too,
# or the engines label different tasks.
JEV_QUESTION = (
    "Is this paragraph from a Wikipedia article about Jesus and the New Testament "
    "data (a reader can check it in a text or record) or interpretation (a claim "
    "about meaning or about the sources)?"
)
JEV_CRITERIA = {
    "data": (
        "A reader can check it by opening a text or a record: what a primary source "
        "says or evidence shows, a quotation (even bare, from scripture or an ancient source), a retelling of a gospel "
        "narrative, which gospels or sources contain an event, how two texts differ, "
        "a plain statement about a text (word count, structure, wording, style, "
        "literary technique, where a word comes from), what an author writing "
        "before AD 451 reports or quotes (even when explaining a passage), or what a modern author found in a record, count "
        "or excavation and who did the work."
    ),
    "interpretation": (
        "A claim about meaning or about the sources: theology or doctrine; what "
        "Christians believe; what scholars or commentators hold, date, assume, "
        "debate or agree on; a modern author's opinion or inference (argued, "
        "suggests, believes, may have); hedged guesses about a date, meaning or "
        "motive (most likely, perhaps, might) and approximate dates (c., circa, "
        "\"AD 30 or 33\"); identifications, theories, "
        "hypotheses, criteria; claims about who wrote a text, when, from which "
        "sources or to which genre it belongs; what later writers (after AD 451), "
        "legends, tradition, art or fiction say; a quotation of a later commentator "
        "(after AD 451) who explains a passage, or of a modern scholar; church practice, rites, devotions, sainthood; what "
        "people locally believe; claims of significance with no source quoted. A "
        "paragraph with any interpretation in it, even beside data or a find report, "
        "is interpretation. Only a paragraph with data alone is data."
    ),
}


def post_json(url: str, key: str, body: dict) -> dict:
    """POST a JSON body with a Bearer key. Retry on 429 and 5xx, then raise.

    The wait honours a numeric Retry-After header, else backs off 2, 4, 8 s.
    Any other HTTP error is raised at once with the response text, so a wrong
    request shape shows up in the first call.
    """
    data = json.dumps(body).encode("utf-8")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    for attempt in range(1, MAX_RETRIES + 1):
        request = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            if exc.code not in (429, 500, 502, 503, 504) or attempt == MAX_RETRIES:
                raise RuntimeError(f"HTTP {exc.code} from {url}: {detail}") from exc
            retry_after = exc.headers.get("Retry-After", "")
            time.sleep(int(retry_after) if retry_after.isdigit() else 2**attempt)
    raise RuntimeError(f"no response from {url}")


def parse_jev_answer(response: dict) -> dict:
    """Pull the label, confidence and probabilities out of a Jev response."""
    answer = response["answers"]["tier"]
    return {
        "label": answer["choice"],
        "confidence": answer.get("confidence"),
        "probabilities": answer.get("probabilities"),
    }


def label_with_jev(rows: list[dict], key: str) -> list[dict]:
    """One Jev call per paragraph. The article title rides along as context."""

    def one(row: dict) -> dict:
        body = {
            "model": JEV_MODEL,
            "state": {"article": row["article_title"], "paragraph": row["text"]},
            "questions": {
                "tier": {
                    "type": "choice",
                    "instructions": JEV_QUESTION,
                    "criteria": JEV_CRITERIA,
                }
            },
        }
        return parse_jev_answer(post_json(JEV_URL, key, body))

    with ThreadPoolExecutor(max_workers=JEV_CONCURRENCY) as pool:
        return list(pool.map(one, rows))


def parse_deepseek_labels(response: dict) -> list[str]:
    """Return the label list from a chat completion, or [] if it is not valid JSON."""
    text = (response["choices"][0]["message"]["content"] or "").strip()
    try:
        return [str(x).strip().lower() for x in json.loads(text)["labels"]]
    except (json.JSONDecodeError, KeyError, TypeError):
        return []


def label_article_with_deepseek(paragraphs: list[str], key: str) -> list[str]:
    """Label one article's gold paragraphs in one request, as production does."""
    numbered = "\n".join(f"[{i}] {text}" for i, text in enumerate(paragraphs, start=1))
    body = {
        "model": DEEPSEEK_MODEL,
        "max_tokens": DEEPSEEK_MAX_TOKENS,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"{RUBRIC}\n\n{numbered}"},
        ],
    }
    for attempt in range(1, MAX_RETRIES + 1):
        labels = parse_deepseek_labels(post_json(DEEPSEEK_URL, key, body))
        if len(labels) == len(paragraphs):
            return labels
        time.sleep(2**attempt)
    raise RuntimeError(f"DeepSeek returned the wrong label count for {len(paragraphs)} paragraphs")


def label_with_deepseek(rows: list[dict], key: str) -> list[dict]:
    """Group rows by article so each request sees its paragraphs in order."""
    by_article = defaultdict(list)
    for index, row in enumerate(rows):
        by_article[row["article_title"]].append(index)
    results = [{}] * len(rows)
    for indexes in by_article.values():
        labels = label_article_with_deepseek([rows[i]["text"] for i in indexes], key)
        for i, label in zip(indexes, labels):
            results[i] = {"label": label}
    return results


def load_corpus_rows() -> list[dict]:
    """Every fetch-cache paragraph, in cache order, shaped like the gold rows.

    paragraph_index is the position in the cache list. It is the same index
    that labels-corpus.json uses, so the two label sets join on (title, index).
    """
    return [
        {"article_title": title, "paragraph_index": index, "text": text}
        for title, paragraphs in load_fetch_cache().items()
        for index, text in enumerate(paragraphs)
    ]


def require_key(name: str) -> str:
    key = os.environ.get(name)
    if not key:
        sys.exit(f"{name} is not set")
    return key


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--engine", choices=("jev", "deepseek"), required=True)
    parser.add_argument("--source", choices=("gold", "corpus"), default="gold")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, help="label only the first N paragraphs (smoke run)")
    args = parser.parse_args()

    if args.source == "corpus" and args.engine != "jev":
        sys.exit("--source corpus is for --engine jev; labels-corpus.json holds the DeepSeek labels")
    rows = (load_corpus_rows() if args.source == "corpus" else load_three_tier_gold())[: args.limit]
    if args.engine == "jev":
        results = label_with_jev(rows, require_key("JEV_API_KEY"))
        model = JEV_MODEL
    else:
        results = label_with_deepseek(rows, require_key("DEEPSEEK_API_KEY"))
        model = DEEPSEEK_MODEL

    records = [
        {"article_title": r["article_title"], "paragraph_index": r["paragraph_index"], **result}
        for r, result in zip(rows, results)
    ]
    args.output.write_text(
        json.dumps({"engine": args.engine, "model": model, "records": records}, indent=2),
        encoding="utf-8",
    )
    print(f"{args.engine}: labelled {len(records)} paragraphs -> {args.output}")


if __name__ == "__main__":
    main()
