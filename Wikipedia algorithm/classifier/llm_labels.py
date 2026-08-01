"""Convert the LLM-labelled corpus into bucket-labels.json entries.

This module reuses load_fetch_cache() and content_hash() from
scripts/llm_label_corpus.py (the single source of truth for hashing and
fetch-cache I/O) rather than re-implementing them.

Design:
- load_llm_corpus() loads labels-corpus.json and returns {title: labels}
  only for articles whose content_hash matches the current fetch cache.
- build_llm_bucket_entry() converts a single article's LLM labels into a
  record matching validate_bucket_labels()'s expected schema, using
  score_article() (the one place tier assignment lives) and slicing
  paragraph_texts from the fetch cache so downstream placement-aware
  scoring works correctly without re-fetching.

Fallback contract (JS-2): if labels-corpus.json is missing, if an article's
content_hash has drifted, or if the paragraph count doesn't match the
fetch cache, the caller must fall back to the embedding classifier.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Optional

# Import content_hash and load_fetch_cache from the single source of truth
# rather than re-implementing hashing or cache I/O.
_ALGO_DIR = Path(__file__).resolve().parent.parent
if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from scripts.llm_label_corpus import content_hash, load_fetch_cache

from .scorer import score_article

logger = logging.getLogger(__name__)

# Default path to the LLM-labelled corpus, relative to the algorithm root.
DEFAULT_CORPUS_PATH: Path = _ALGO_DIR / "labels-corpus.json"


def load_llm_corpus(path: Optional[Path] = None) -> dict[str, list[str]]:
    """Load labels-corpus.json and return {title: labels} for current articles.

    Only includes articles whose stored content_hash matches a freshly
    computed hash from .calibrate-fetch-cache.json — a stale/removed
    article is silently excluded rather than causing downstream errors.

    Args:
        path: Path to labels-corpus.json. Defaults to DEFAULT_CORPUS_PATH.

    Returns:
        Dict mapping Wikipedia article title → list of LLM labels
        (each label is one of "data", "close", "interpretation").

        Articles whose content_hash no longer matches the fetch cache,
        or whose title is absent from the fetch cache, are excluded.
    """
    if path is None:
        path = DEFAULT_CORPUS_PATH

    if not path.exists():
        logger.warning(
            "LLM corpus not found at %s; all articles will use embedding-classifier fallback.",
            path,
        )
        return {}

    fetch_cache = load_fetch_cache()

    with open(path, encoding="utf-8") as fh:
        corpus = json.load(fh)

    articles = corpus.get("articles", {})
    result: dict[str, list[str]] = {}

    for title, article in articles.items():
        stored_hash = article.get("content_hash")
        if title not in fetch_cache:
            logger.warning(
                "LLM-labelled article '%s' not in fetch cache; excluded from LLM source.",
                title,
            )
            continue
        paragraphs = fetch_cache[title]
        current_hash = content_hash("\n\n".join(paragraphs))
        if stored_hash and stored_hash != current_hash:
            logger.warning(
                "LLM-labelled article '%s': content hash mismatch (stored %s, current %s); "
                "article has drifted since labelling — falling back to embedding classifier.",
                title,
                stored_hash,
                current_hash,
            )
            continue
        result[title] = article["labels"]

    logger.info(
        "Loaded %d LLM-labelled articles from %s (%d stale/excluded).",
        len(result),
        path,
        len(articles) - len(result),
    )
    return result


def build_llm_bucket_entry(
    title: str,
    labels: list[str],
    fetch_cache: dict[str, list[str]],
) -> Optional[dict]:
    """Build a bucket-labels.json record from LLM labels.

    Reuses score_article() (the single source of truth for tier assignment)
    and slices paragraph_texts from the fetch cache so downstream
    placement-aware scoring works correctly.

    Returns None if the LLM's paragraph count doesn't match the fetch
    cache — a length mismatch means the LLM's segmentation and the current
    live segmentation have drifted, so the caller should fall back to the
    embedding classifier rather than risk misaligned placement scoring.

    Args:
        title: Wikipedia article title.
        labels: List of LLM labels (data/close/interpretation).
        fetch_cache: Dict from load_fetch_cache() mapping title → paragraphs.

    Returns:
        Dict matching validate_bucket_labels()'s expected schema, or None
        if the paragraph count mismatches the fetch cache.
    """
    paragraphs = fetch_cache.get(title)
    if paragraphs is None:
        logger.warning(
            "Article '%s': not in fetch cache; cannot build LLM bucket entry.",
            title,
        )
        return None

    if len(labels) != len(paragraphs):
        logger.warning(
            "Article '%s': LLM paragraph count (%d) doesn't match fetch cache (%d); "
            "segmentation has drifted — falling back to embedding classifier.",
            title,
            len(labels),
            len(paragraphs),
        )
        return None

    scored = score_article(labels)
    return {
        "paragraphs": labels,
        "paragraph_texts": paragraphs,
        "separation": scored["separation"],
        "tier": scored["tier"],
        "tier_state": scored["tier_state"],
    }
