"""Family registry — exports all nine families and their fallback signals.

Used by the export runner to iterate over every family at scoring time.
Each family is addressable by name and returns a score dict.
"""

import logging
from typing import Callable, Optional

from . import (
    balanced_debate,
    anti_supernatural,
    ot_nt_discontinuity,
    mythicist_framing,
    jesus_seminar,
    secular_materialist,
    confessional_balance,
    literary_analysis,
    gnostic_over_emphasis,
)

logger = logging.getLogger(__name__)

# Map family name → module.
FAMILIES: dict[str, object] = {
    "balanced-debate": balanced_debate,
    "anti-supernatural": anti_supernatural,
    "ot-nt-discontinuity": ot_nt_discontinuity,
    "mythicist-framing": mythicist_framing,
    "jesus-seminar": jesus_seminar,
    "secular-materialist": secular_materialist,
    "confessional-balance": confessional_balance,
    "literary-analysis": literary_analysis,
    "gnostic-over-emphasis": gnostic_over_emphasis,
}

# Fallback signal keys — the old keyword-detector signal names to use
# when a family's precision floor is not met.
FALLBACK_SIGNAL_KEYS: dict[str, str] = {
    "balanced-debate": "balanced_debate",
    "anti-supernatural": "supernatural_criticism",
    "ot-nt-discontinuity": "ot_nt_continuity_patterns",
    "mythicist-framing": "mythicist_placement_tracking",
    "jesus-seminar": "jesus_seminar_placement_tracking",
    "secular-materialist": "supernatural_criticism",
    "confessional-balance": "confessional_balance",
    "literary-analysis": "literary_analysis",
    "gnostic-over-emphasis": "gnostic_over_emphasis",
}

# Family display names for logging/reporting.
FAMILY_DISPLAY_NAMES: dict[str, str] = {
    "balanced-debate": "Balanced Debate",
    "anti-supernatural": "Anti-Supernatural Bias",
    "ot-nt-discontinuity": "OT-NT Discontinuity",
    "mythicist-framing": "Mythicist Framing",
    "jesus-seminar": "Jesus Seminar",
    "secular-materialist": "Secular-Materialist",
    "confessional-balance": "Confessional Balance",
    "literary-analysis": "Literary Analysis",
    "gnostic-over-emphasis": "Gnostic Over-Emphasis",
}


def get_family_module(family_name: str):
    """Return a family's module by name.

    Raises KeyError for unknown family names.
    """
    if family_name not in FAMILIES:
        raise KeyError(
            f"Unknown family '{family_name}'. Known: {list(FAMILIES)}"
        )
    return FAMILIES[family_name]


def is_family_active(
    family_name: str,
    thresholds: dict[str, dict],
) -> bool:
    """Check whether a family meets its precision floor and should be active.

    Args:
        family_name: The family name.
        thresholds: Loaded vector-family-thresholds.yaml content.

    Returns:
        True if the family's precision >= PRECISION_FLOOR (0.8), False otherwise.
    """
    from .config import PRECISION_FLOOR
    family_thresholds = thresholds.get(family_name, {})
    precision = family_thresholds.get("precision", 0.0)
    return precision >= PRECISION_FLOOR
