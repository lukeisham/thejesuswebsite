#!/usr/bin/env python3
"""Persistent driver for regenerating bucket-labels.json from the full corpus.

Replaces the ad hoc Python snippet in README.md's "Export bucket labels"
section. Builds articles from the now-complete fetch cache, initialises
StoreManager, and calls export_batch() — this is the command used both for
Tier 1 smoke tests and by any future operator regenerating the bucket labels.

Usage:
    python3 scripts/export_bucket_labels.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_ALGO_DIR = Path(__file__).resolve().parent.parent

if str(_ALGO_DIR) not in sys.path:
    sys.path.insert(0, str(_ALGO_DIR))

from classifier.export import export_batch
from classifier.stores import StoreManager
from scripts.llm_label_corpus import load_fetch_cache

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s",
)

logger = logging.getLogger(__name__)


def main() -> None:
    """Build articles from the fetch cache, initialise stores, and export."""
    logger.info("Loading fetch cache...")
    fetch_cache = load_fetch_cache()

    if not fetch_cache:
        logger.error(
            "Fetch cache is empty; run 'python3 scripts/llm_label_corpus.py --prepare' first."
        )
        sys.exit(1)

    # Build articles dict: title → full text (paragraphs joined by double newline).
    articles = {
        title: "\n\n".join(paragraphs) for title, paragraphs in fetch_cache.items()
    }
    logger.info("Loaded %d articles from fetch cache.", len(articles))

    logger.info("Building vector stores...")
    mgr = StoreManager()
    mgr.build_all()
    logger.info("Stores built.")

    logger.info("Running export_batch()...")
    output_path = export_batch(articles, mgr)
    logger.info("Export complete: %s", output_path)


if __name__ == "__main__":
    main()
