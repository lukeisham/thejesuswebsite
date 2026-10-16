"""Build the human audit sample for the LLM-labelled corpus (issue #231).

Run from the "Wikipedia algorithm" directory:

    python scripts/build_audit_sample.py
    python scripts/build_audit_sample.py --cache /tmp/articles.pkl

A person labels the paragraphs of the sample articles without seeing the
LLM labels. Then the person's labels are compared with the LLM labels. The
result shows how often the LLM agrees with a human. It also shows who is
wrong where the trained head and the LLM disagree.

The sample has three groups. An article can be in more than one group.

  random    A random audit. This group measures the LLM-human agreement.
            The order comes from a hash of the title, so a later run can
            extend the group with the next articles and keep the old ones.
  disagree  Test-split articles where the head tier differs from the LLM
            tier. The head never trained on these articles, so its tier is
            an honest prediction.
  rare      Articles where the LLM tier or the head tier is muddled or
            unclassifiable, then articles where the LLM tier is one_sided.
            A random sample has few of these, and the tier test needs more.

Articles whose LLM label count differs from the paragraph count are left
out. Their labels cannot be matched to paragraphs by position.

Output, in audit/:
  audit-sample.json   PRIVATE. Groups, LLM labels, head labels, tiers.
                      Never put this file in the labelling page.
  audit-articles.json PUBLIC. Titles and paragraph text only, in batch order.
"""

import argparse
import json
import logging
import pickle
import sys
from pathlib import Path

ALGO_DIR = Path(__file__).resolve().parents[1]
if str(ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(ALGO_DIR))

from calibrate import StoreManager, _title_split_fraction  # noqa: E402
from classifier.config import LABEL_OTHER, PARAGRAPH_HEAD_PATH  # noqa: E402
from classifier.labeler import split_paragraphs  # noqa: E402
from classifier.paragraph_head import load_paragraph_head  # noqa: E402
from classifier.scorer import score_article  # noqa: E402
from scripts.llm_label_corpus import load_fetch_cache  # noqa: E402
from scripts.train_paragraph_head import (  # noqa: E402
    SPLIT_SEED,
    TRAIN_FRACTION,
    build_articles,
    predict_article_labels,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("build-audit-sample")

AUDIT_DIR = ALGO_DIR / "audit"
SAMPLE_PATH = AUDIT_DIR / "audit-sample.json"
ARTICLES_PATH = AUDIT_DIR / "audit-articles.json"

AUDIT_SEED = 11
RANDOM_TARGET = 30
BATCH_SIZE = 8
# Articles taken from each queue for every batch. Each batch mixes all
# three groups, so the person can stop after any batch and still hold a
# balanced sample.
BATCH_MIX = (("random", 3), ("disagree", 2), ("rare", 3))
T_SEP = 0.5  # The value in classifier/config.py; the head run chose the same.
RARE_STATES = ("muddled", "unclassifiable")


def load_articles(cache: Path | None):
    """Embed the LLM-labelled articles, or read them from a pickle cache."""
    if cache and cache.exists():
        logger.info("Reading embedded articles from %s", cache)
        with open(cache, "rb") as fh:
            return pickle.load(fh)
    articles, not_aligned = build_articles(StoreManager())
    if cache:
        with open(cache, "wb") as fh:
            pickle.dump((articles, not_aligned), fh)
    return articles, not_aligned


def tier_of(labels: list[str]) -> str:
    return score_article(labels, T_SEP)["tier_state"]


def by_hash(titles: list[str]) -> list[str]:
    """Order titles by a stable hash, so a rerun keeps the same order."""
    return sorted(titles, key=lambda t: _title_split_fraction(t, AUDIT_SEED))


def build_batches(queues: dict[str, list[str]]) -> list[list[str]]:
    """Deal the three queues into batches of BATCH_SIZE articles."""
    queues = {name: list(items) for name, items in queues.items()}
    used: set[str] = set()

    def take_from(name: str, batch: list[str], limit: int) -> None:
        taken = 0
        while taken < limit and queues[name]:
            title = queues[name].pop(0)
            if title not in used:
                used.add(title)
                batch.append(title)
                taken += 1

    batches: list[list[str]] = []
    while any(queues.values()):
        batch: list[str] = []
        for name, share in BATCH_MIX:
            take_from(name, batch, share)
        # Top up a short batch from what is left, rare tiers first.
        for name in ("rare", "disagree", "random"):
            take_from(name, batch, BATCH_SIZE - len(batch))
        if batch:
            batches.append(batch)
    return batches


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--cache", type=Path, default=None,
                        help="Pickle file for the embedded articles (saves minutes).")
    args = parser.parse_args()

    if not PARAGRAPH_HEAD_PATH.exists():
        sys.exit(f"{PARAGRAPH_HEAD_PATH} not found. "
                 "Run scripts/train_paragraph_head.py first.")

    articles, not_aligned = load_articles(args.cache)
    head = load_paragraph_head()
    aligned = [a for a in articles if a.aligned]
    logger.info("%d articles, %d aligned (%d left out).",
                len(articles), len(aligned), not_aligned)

    info: dict[str, dict] = {}
    for a in aligned:
        head_labels = predict_article_labels(head, a)
        # The evaluation in CLASSIFIER_DIAGNOSIS.md D.6 uses `llm_tier`.
        # `llm_tier_body` ignores the LLM labels on positional paragraphs
        # (lede, references), the way the classifier does.
        body_labels = [LABEL_OTHER if pos else lab
                       for lab, pos in zip(a.llm_labels, a.positional)]
        info[a.title] = {
            "split": ("test" if _title_split_fraction(a.title, SPLIT_SEED) >= TRAIN_FRACTION
                      else "train"),
            "llm_tier": a.gold_state,
            "llm_tier_body": tier_of(body_labels),
            "head_tier": tier_of(head_labels),
            "llm_labels": a.llm_labels,
            "head_labels": head_labels,
            "positional": a.positional,
            "groups": [],
        }

    random_q = by_hash(list(info))[:RANDOM_TARGET]
    disagree_q = by_hash([
        t for t, v in info.items()
        if v["split"] == "test"
        and (v["llm_tier"] != v["head_tier"] or v["llm_tier_body"] != v["head_tier"])
    ])
    rare_states = [t for t, v in info.items()
                   if {v["llm_tier"], v["llm_tier_body"], v["head_tier"]} & set(RARE_STATES)]
    one_sided = [t for t, v in info.items()
                 if t not in rare_states
                 and "one_sided" in (v["llm_tier"], v["llm_tier_body"])]
    rare_q = by_hash(rare_states) + by_hash(one_sided)

    for name, queue in (("random", random_q), ("disagree", disagree_q), ("rare", rare_q)):
        for title in queue:
            info[title]["groups"].append(name)

    batches = build_batches(
        {"random": random_q, "disagree": disagree_q, "rare": rare_q})
    order = [t for batch in batches for t in batch]
    for number, batch in enumerate(batches, start=1):
        for title in batch:
            info[title]["batch"] = number

    fetch_cache = load_fetch_cache()
    public = []
    for title in order:
        split = split_paragraphs("\n\n".join(fetch_cache[title]))
        assert len(split) == len(info[title]["llm_labels"]), title
        public.append({
            "title": title,
            "url": "https://en.wikipedia.org/wiki/" + title.replace(" ", "_"),
            "batch": info[title]["batch"],
            "paragraphs": [
                {"i": k, "text": p["text"], "positional": info[title]["positional"][k]}
                for k, p in enumerate(split)
            ],
        })

    AUDIT_DIR.mkdir(exist_ok=True)
    with open(SAMPLE_PATH, "w", encoding="utf-8") as fh:
        json.dump({
            "audit_seed": AUDIT_SEED, "batch_size": BATCH_SIZE, "t_sep": T_SEP,
            "articles": {t: info[t] for t in order},
        }, fh, indent=1)
    with open(ARTICLES_PATH, "w", encoding="utf-8") as fh:
        json.dump({"articles": public}, fh, ensure_ascii=False)

    for number, batch in enumerate(batches, start=1):
        body = sum(1 for x in public if x["title"] in batch
                   for p in x["paragraphs"] if not p["positional"])
        logger.info("Batch %2d: %d articles, %4d body paragraphs, groups %s",
                    number, len(batch), body,
                    sorted({g for t in batch for g in info[t]["groups"]}))
    logger.info("Sample: %d articles in %d batches.", len(order), len(batches))
    logger.info("Wrote %s and %s", SAMPLE_PATH, ARTICLES_PATH)


if __name__ == "__main__":
    main()
