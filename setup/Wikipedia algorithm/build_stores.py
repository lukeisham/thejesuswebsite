#!/usr/bin/env python3
"""Build the three FAISS vector stores from seed exemplars.

Usage:
    python build_stores.py             # Build if not already built
    python build_stores.py --force     # Rebuild from scratch

This script embeds all exemplars using the vendored MiniLM ONNX model
and saves the FAISS indexes + sidecar metadata to vector-stores/.
"""

import argparse
import logging
import sys
from pathlib import Path

# Ensure the classifier package is importable.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from classifier.stores import StoreManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("build_stores")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build FAISS vector stores from exemplar files."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rebuild all stores from scratch, overwriting existing indexes.",
    )
    args = parser.parse_args()

    logger.info("Initialising StoreManager (loading ONNX model)...")
    mgr = StoreManager()

    if args.force:
        logger.info("Force-rebuilding all stores...")
        mgr.force_rebuild()
    else:
        logger.info("Building stores (skipping already-built)...")
        mgr.build_all()

    # Report.
    for name, store in mgr.stores.items():
        logger.info("  %s: %d vectors", name, store.size)

    logger.info("Done. Stores saved to vector-stores/")


if __name__ == "__main__":
    main()
