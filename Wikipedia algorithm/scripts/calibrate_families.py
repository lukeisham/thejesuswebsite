#!/usr/bin/env python3
"""Calibrate family thresholds against the Plan 3 gold set.

Sweeps candidate thresholds (t_fire, t_strong) for each family, computes
F1 and precision against hand labels, and selects thresholds maximizing
F1 subject to the 0.8 precision floor.

Usage:
    python scripts/calibrate_families.py
"""

import csv
import json
import logging
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from families.config import (
    GOLD_SET_PATH,
    THRESHOLDS_YAML_PATH,
    PRECISION_FLOOR,
    FAMILY_STORE_NAMES,
)
from families.stores import Embedder, build_family_store

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("calibrate_families")


def load_gold_set() -> list[dict]:
    """Load the gold-set-vector-families.csv file."""
    if not GOLD_SET_PATH.exists():
        logger.error("Gold set not found: %s", GOLD_SET_PATH)
        return []

    rows: list[dict] = []
    with open(GOLD_SET_PATH, "r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append(row)
    logger.info("Loaded %d gold-set rows from %s", len(rows), GOLD_SET_PATH)
    return rows


def calibrate_family(
    family_name: str,
    gold_set: list[dict],
    embedder: Embedder,
) -> dict:
    """Calibrate one family's thresholds.

    For now, returns default thresholds since the gold set format
    (signal_fires + tier_if_applicable) requires a different calibration
    approach than the similarity-score sweep this function is designed for.

    This is a placeholder — full calibration requires the gold-set articles'
    full text, not just the CSV metadata.
    """
    logger.info("Calibrating '%s'...", family_name)

    # Build the family's store.
    store = build_family_store(family_name, embedder)
    if store is None:
        logger.warning("  No store built for '%s' — precision = 0.", family_name)
        return {
            "t_fire": 0.55,
            "t_strong": 0.70,
            "precision": 0.0,
            "f1": 0.0,
        }

    # Placeholder: return defaults. Full calibration requires article text.
    return {
        "t_fire": 0.55,
        "t_strong": 0.70,
        "precision": 0.0,
        "f1": 0.0,
    }


def main() -> None:
    gold_set = load_gold_set()
    if not gold_set:
        logger.warning("No gold-set data available. Writing placeholder thresholds.")
        # Write placeholder thresholds for all families.
        thresholds: dict[str, dict] = {}
        for name in FAMILY_STORE_NAMES:
            thresholds[name] = {
                "t_fire": 0.55,
                "t_strong": 0.70,
                "t_asym": 0.60,
                "f1": 0.0,
                "precision": 0.0,
                "source_gold_set_date": "2026-07-28",
            }
        thresholds["passion_margin"] = 0

        import yaml
        THRESHOLDS_YAML_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(THRESHOLDS_YAML_PATH, "w", encoding="utf-8") as fh:
            yaml.safe_dump(thresholds, fh, default_flow_style=False)
        logger.info("Placeholder thresholds written to %s", THRESHOLDS_YAML_PATH)
        return

    logger.info("Calibrating %d families...", len(FAMILY_STORE_NAMES))
    embedder = Embedder()

    thresholds: dict[str, dict] = {}
    for name in FAMILY_STORE_NAMES:
        result = calibrate_family(name, gold_set, embedder)
        thresholds[name] = {
            "t_fire": result["t_fire"],
            "t_strong": result["t_strong"],
            "t_asym": 0.60,
            "f1": result["f1"],
            "precision": result["precision"],
            "source_gold_set_date": "2026-07-28",
        }

    thresholds["passion_margin"] = 0

    import yaml
    THRESHOLDS_YAML_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(THRESHOLDS_YAML_PATH, "w", encoding="utf-8") as fh:
        yaml.safe_dump(thresholds, fh, default_flow_style=False)

    logger.info("Thresholds written to %s", THRESHOLDS_YAML_PATH)


if __name__ == "__main__":
    main()
