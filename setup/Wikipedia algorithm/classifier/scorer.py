"""Separation ratio calculation and tier assignment for row 3.

The separation ratio measures how cleanly an article separates data/narrative
paragraphs from interpretation/analysis paragraphs. A clean split (one
contiguous block of data followed by one contiguous block of interpretation,
or vice versa) scores near 1.0. An article that alternates throughout scores
near 0.0.

Row 3 contribution tiers (§9):
  +10  clear split (both classes present AND separation >= t_sep)
  -3   muddled split (both classes present BUT separation < t_sep)
  -5   one-sided (only one class present)
   0   unclassifiable (fewer than N_min labelled paragraphs)
"""

import logging
from typing import Optional

from .config import (
    t_sep,
    N_min,
    TIER_CLEAR,
    TIER_MUDDLED,
    TIER_ONE_SIDED,
    TIER_UNCLASSIFIABLE,
    LABEL_DATA,
    LABEL_INTERPRETATION,
    LABEL_OTHER,
    LABEL_NEITHER,
)

logger = logging.getLogger(__name__)


def compute_separation_ratio(labels: list[str]) -> float:
    """Compute the separation ratio over a sequence of paragraph labels.

    separation = 1 - (transitions / (len(labels) - 1))

    A "transition" is an adjacent pair whose labels differ. 'other' and
    'neither' paragraphs are treated as neutral — they do not count as
    belonging to either class and do not contribute to transitions.

    Args:
        labels: List of paragraph labels ('data', 'interpretation', 'other', 'neither').

    Returns:
        Separation ratio in [0.0, 1.0]. Returns 0.0 if there are fewer than
        2 class-bearing paragraphs (data or interpretation).
    """
    # Filter to only class-bearing labels (data, interpretation).
    # 'other' and 'neither' are excluded from the ratio calculation
    # because they represent non-substantive or positional paragraphs.
    class_labels = [lbl for lbl in labels if lbl in (LABEL_DATA, LABEL_INTERPRETATION)]

    n = len(class_labels)
    if n < 2:
        # Cannot compute transitions with fewer than 2 class-bearing paragraphs.
        return 0.0

    # Count transitions between adjacent differing class labels.
    transitions = 0
    for i in range(n - 1):
        if class_labels[i] != class_labels[i + 1]:
            transitions += 1

    separation = 1.0 - (transitions / (n - 1))
    return max(0.0, min(1.0, separation))


def assign_tier(
    labels: list[str],
    separation: float,
    t_sep_threshold: Optional[float] = None,
    n_min: Optional[int] = None,
) -> int:
    """Assign the row-3 tier contribution based on labels and separation.

    Args:
        labels: List of paragraph labels.
        separation: Pre-computed separation ratio.
        t_sep_threshold: Clean-split threshold. Defaults to config.t_sep.
        n_min: Minimum labelled paragraphs for classification. Defaults to config.N_min.

    Returns:
        Row-3 contribution integer: +10, -3, -5, or 0.
    """
    if t_sep_threshold is None:
        t_sep_threshold = t_sep
    if n_min is None:
        n_min = N_min

    # Validate inputs.
    if not labels:
        logger.warning("assign_tier called with empty labels; returning 0.")
        return TIER_UNCLASSIFIABLE

    # Count class-bearing paragraphs.
    data_count = labels.count(LABEL_DATA)
    interp_count = labels.count(LABEL_INTERPRETATION)
    class_count = data_count + interp_count

    # Too few class-bearing paragraphs — unclassifiable.
    if class_count < n_min:
        return TIER_UNCLASSIFIABLE

    has_data = data_count > 0
    has_interp = interp_count > 0

    # Only one class present.
    if has_data != has_interp:  # XOR — exactly one is true
        return TIER_ONE_SIDED

    # Both classes present.
    if has_data and has_interp:
        if separation >= t_sep_threshold:
            return TIER_CLEAR
        else:
            return TIER_MUDDLED

    # Neither class present (all 'other' or 'neither').
    return TIER_UNCLASSIFIABLE


def score_article(
    labels: list[str],
    t_sep_threshold: Optional[float] = None,
    n_min: Optional[int] = None,
) -> dict:
    """Full article scoring: compute separation ratio and assign tier.

    Args:
        labels: List of paragraph labels from classify_paragraphs().
        t_sep_threshold: Clean-split threshold.
        n_min: Minimum labelled paragraphs.

    Returns:
        Dict with keys:
            separation (float): Separation ratio.
            tier (int): Row-3 contribution.
            data_count (int): Number of 'data' paragraphs.
            interp_count (int): Number of 'interpretation' paragraphs.
            other_count (int): Number of 'other' paragraphs.
            neither_count (int): Number of 'neither' paragraphs.
            total_count (int): Total paragraph count.
    """
    separation = compute_separation_ratio(labels)
    tier = assign_tier(labels, separation, t_sep_threshold, n_min)

    return {
        "separation": round(separation, 4),
        "tier": tier,
        "data_count": labels.count(LABEL_DATA),
        "interp_count": labels.count(LABEL_INTERPRETATION),
        "other_count": labels.count(LABEL_OTHER),
        "neither_count": labels.count(LABEL_NEITHER),
        "total_count": len(labels),
    }
