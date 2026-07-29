#!/usr/bin/env python3
"""Calibrate the Passion margin against the Passion subset of the gold set.

Fits a single global passion_margin value applied to rows 15, 16, 21, 22, 23
per §3.9, under the 0.8 precision floor on the Passion subset. If the floor
cannot be held, the margin is zero.

Usage:
    python scripts/calibrate_passion_margin.py
"""

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from families.config import THRESHOLDS_YAML_PATH

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("calibrate_passion_margin")


def main() -> None:
    """Placeholder: full calibration requires article text from Plan 2 harvest."""
    logger.info(
        "Passion-margin calibration requires the Plan 2 harvested article texts. "
        "Defaulting passion_margin to 0."
    )

    # Write or update the thresholds YAML with passion_margin = 0.
    try:
        import yaml
    except ImportError:
        logger.warning("PyYAML not installed. Skipping thresholds update.")
        return

    if THRESHOLDS_YAML_PATH.exists():
        with open(THRESHOLDS_YAML_PATH, "r", encoding="utf-8") as fh:
            thresholds = yaml.safe_load(fh) or {}
    else:
        thresholds = {}

    thresholds["passion_margin"] = 0

    with open(THRESHOLDS_YAML_PATH, "w", encoding="utf-8") as fh:
        yaml.safe_dump(thresholds, fh, default_flow_style=False)

    logger.info("Passion margin set to 0 in %s", THRESHOLDS_YAML_PATH)


if __name__ == "__main__":
    main()
