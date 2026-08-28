"""Separation ratio calculation and tier assignment for row 3.

The separation ratio measures how cleanly an article separates data/interpretation
paragraphs from interpretation/analysis paragraphs.

Two separation functionals are provided:

1. compute_separation_ratio() — adjacency-based. Counts adjacent transitions
   between differing class labels. A clean split (one contiguous block of data
   followed by one contiguous block of interpretation, or vice versa) scores
   near 1.0. An article that alternates throughout scores near 0.0.

2. compute_separation_blocks() — block-structure-based. Counts the number of
   contiguous runs (blocks) of each class label. This better captures what
   human labellers mean by a "clear split": clustered blocks, regardless of
   how many transitions occur between them. The adjacency metric over-penalises
   sequences that alternate locally but cluster into blocks globally.

Row 3 contribution tiers (§9, settled 2026-07-30):
  +10  clear split (both classes present AND separation >= t_sep)
  -5   muddled split (both classes present BUT separation < t_sep) — worst outcome
   0   one-sided (only one class present) — no split to judge
   0   unclassifiable (fewer than N_min labelled paragraphs)
"""

import logging
from typing import Optional

from .config import (
    t_sep,
    N_min,
    SEPARATION_MODE,
    TIER_CLEAR,
    TIER_MUDDLED,
    TIER_ONE_SIDED,
    TIER_UNCLASSIFIABLE,
    LABEL_DATA,
    LABEL_CLOSE_ANALYSIS,
    LABEL_INTERPRETATION,
    LABEL_OTHER,
    LABEL_NEITHER,
)

logger = logging.getLogger(__name__)


def compute_separation_ratio(labels: list[str]) -> float:
    """Compute the separation ratio over a sequence of paragraph labels.

    separation = 1 - (transitions / (len(labels) - 1))

    Three-tier semantics (Signal 3 activation): data (Tier 1) and close (Tier 2)
    are collapsed into one "descriptive" class; interpretation (Tier 3) is the
    other class. This measures how cleanly descriptive paragraphs are separated
    from interpretive paragraphs.

    A "transition" is an adjacent pair whose labels differ. 'other' and
    'neither' paragraphs are treated as neutral — they do not count as
    belonging to either class and do not contribute to transitions.

    This is the original adjacency-based measure. It is sensitive to local
    alternation: a sequence D,I,D,I (4 blocks) scores identically to one that
    is genuinely interleaved throughout, even though the former has only
    2 transitions and the latter could have many more. For articles where
    human labellers see clustered blocks separated by a few scattered
    paragraphs, compute_separation_blocks() may be a better match.

    Args:
        labels: List of paragraph labels (data, close, interpretation,
                other, neither).

    Returns:
        Separation ratio in [0.0, 1.0]. Returns 0.0 if there are fewer than
        2 class-bearing paragraphs (data, close, or interpretation).
    """
    # Collapse to two classes: "descriptive" (data + close) vs "interpretive" (interpretation).
    # 'other' and 'neither' are excluded from the ratio calculation.
    DESCRIPTIVE = {LABEL_DATA, LABEL_CLOSE_ANALYSIS}
    INTERPRETIVE = {LABEL_INTERPRETATION}

    class_labels: list[str] = []
    for lbl in labels:
        if lbl in DESCRIPTIVE:
            class_labels.append("desc")
        elif lbl in INTERPRETIVE:
            class_labels.append("interp")
        # 'other' and 'neither' are skipped.

    n = len(class_labels)
    if n < 2:
        return 0.0

    transitions = 0
    for i in range(n - 1):
        if class_labels[i] != class_labels[i + 1]:
            transitions += 1

    separation = 1.0 - (transitions / (n - 1))
    return max(0.0, min(1.0, separation))


def compute_separation_blocks(labels: list[str]) -> float:
    """Compute the block-structure separation ratio.

    separation = 1 - (block_count - 1) / (n - 1)

    Three-tier semantics (Signal 3 activation): data (Tier 1) and close (Tier 2)
    are collapsed into one "descriptive" class; interpretation (Tier 3) is the
    other class. 'other' and 'neither' paragraphs are excluded before counting
    blocks.

    A "block" is a contiguous run of the same collapsed class label
    (descriptive or interpretive).

    This measure better captures what human labellers mean by a "clear split"
    because they think in blocks, not in adjacent pairs. An article with 3
    blocks (e.g. descriptive block → interpretive block → descriptive block)
    has block_count=3, and with sufficient class-bearing paragraphs this scores
    well. The same article under the adjacency metric would be penalised for
    the transitions between those blocks.

    Args:
        labels: List of paragraph labels (data, close, interpretation,
                other, neither).

    Returns:
        Block-structure separation ratio in [0.0, 1.0]. Returns 0.0 if there
        are fewer than 2 class-bearing paragraphs.
    """
    DESCRIPTIVE = {LABEL_DATA, LABEL_CLOSE_ANALYSIS}
    INTERPRETIVE = {LABEL_INTERPRETATION}

    class_labels: list[str] = []
    for lbl in labels:
        if lbl in DESCRIPTIVE:
            class_labels.append("desc")
        elif lbl in INTERPRETIVE:
            class_labels.append("interp")

    n = len(class_labels)
    if n < 2:
        return 0.0

    # Count contiguous blocks (runs of the same collapsed class label).
    block_count = 1
    for i in range(1, n):
        if class_labels[i] != class_labels[i - 1]:
            block_count += 1

    separation = 1.0 - (block_count - 1) / (n - 1)
    return max(0.0, min(1.0, separation))


def _tier_state_name(tier: int, data_count: int = 0, close_count: int = 0,
                    interp_count: int = 0,
                    n_min: Optional[int] = None) -> str:
    """Map a tier contribution integer to its state name.

    Any tier other than TIER_CLEAR is disambiguated from paragraph counts,
    not from the integer value itself — this holds regardless of what
    TIER_MUDDLED/TIER_ONE_SIDED/TIER_UNCLASSIFIABLE are currently set to
    (they collide at 0 for one_sided/unclassifiable even under the settled
    +10/−5/0/0 weighting):
      - clear_split: tier == TIER_CLEAR (+10).
      - muddled: both descriptive and interpretive present (class_count
        >= n_min, multiple tiers present).
      - one_sided: only one tier present (class_count >= n_min).
      - unclassifiable: class_count < n_min or no class paragraphs.

    Args:
        tier: Tier contribution integer (+10, −5, or 0).
        data_count: Number of 'data' paragraphs.
        close_count: Number of 'close' paragraphs.
        interp_count: Number of 'interpretation' paragraphs.
        n_min: Minimum class-bearing paragraphs (from config.N_min if None).

    Returns:
        State name: 'clear_split', 'muddled', 'one_sided', or 'unclassifiable'.
    """
    if tier == TIER_CLEAR:
        return "clear_split"
    # Not clear_split: disambiguate muddled / one_sided / unclassifiable from
    # paragraph counts rather than the tier integer (TIER_MUDDLED may not be 0).
    if n_min is None:
        n_min = N_min
    class_count = data_count + close_count + interp_count
    if class_count < n_min:
        return "unclassifiable"
    # Check how many of the three tiers are present.
    present = sum(1 for c in (data_count, close_count, interp_count) if c > 0)
    if present <= 1:
        return "one_sided"
    # Multiple tiers present → both descriptive and interpretive must be
    # present (assign_tier returns TIER_MUDDLED when both are present
    # but separation < t_sep).
    desc_count = data_count + close_count
    if desc_count > 0 and interp_count > 0:
        return "muddled"
    return "unclassifiable"


def assign_tier(
    labels: list[str],
    separation: float,
    t_sep_threshold: Optional[float] = None,
    n_min: Optional[int] = None,
) -> int:
    """Assign the row-3 tier contribution based on labels and separation.

    Three-tier semantics (Signal 3 activation):
    - data (Tier 1) and close (Tier 2) are collapsed as "descriptive".
    - interpretation (Tier 3) is "interpretive".
    - A clear split requires both a descriptive and an interpretive class
      to be present AND separation >= t_sep.
    - One-sided = only descriptive or only interpretive is present.

    Args:
        labels: List of paragraph labels (data, close, interpretation,
                other, neither).
        separation: Pre-computed separation ratio (descriptive vs interpretive).
        t_sep_threshold: Clean-split threshold. Defaults to config.t_sep.
        n_min: Minimum labelled paragraphs for classification. Defaults to
               config.N_min.

    Returns:
        Row-3 contribution integer: +10, -5, or 0.
    """
    if t_sep_threshold is None:
        t_sep_threshold = t_sep
    if n_min is None:
        n_min = N_min

    if not labels:
        logger.warning("assign_tier called with empty labels; returning 0.")
        return TIER_UNCLASSIFIABLE

    # Count per-tier paragraphs.
    data_count = labels.count(LABEL_DATA)
    close_count = labels.count(LABEL_CLOSE_ANALYSIS)
    interp_count = labels.count(LABEL_INTERPRETATION)

    # Descriptive = Tier 1 + Tier 2.
    desc_count = data_count + close_count
    class_count = desc_count + interp_count

    if class_count < n_min:
        return TIER_UNCLASSIFIABLE

    has_desc = desc_count > 0
    has_interp = interp_count > 0

    # Only one class (descriptive or interpretive) present.
    if has_desc != has_interp:  # XOR — exactly one is true
        return TIER_ONE_SIDED

    # Both descriptive and interpretive present.
    if has_desc and has_interp:
        if separation >= t_sep_threshold:
            return TIER_CLEAR
        else:
            return TIER_MUDDLED

    return TIER_UNCLASSIFIABLE


def score_article(
    labels: list[str],
    t_sep_threshold: Optional[float] = None,
    n_min: Optional[int] = None,
    separation_mode: Optional[str] = None,
) -> dict:
    """Full article scoring: compute separation ratio and assign tier.

    Args:
        labels: List of paragraph labels from classify_paragraphs().
        t_sep_threshold: Clean-split threshold.
        n_min: Minimum labelled paragraphs.
        separation_mode: Which separation functional to use — "adjacency"
            (compute_separation_ratio) or "block" (compute_separation_blocks).
            Defaults to config.SEPARATION_MODE so the bake-off's winning mode
            takes effect once calibrate.py persists it to config.py.

    Returns:
        Dict with keys:
            separation (float): Separation ratio.
            tier (int): Row-3 contribution.
            tier_state (str): State name ('clear_split', 'muddled',
                'one_sided', 'unclassifiable'). Preserved alongside the
                integer contribution so the two 0-states (one_sided and
                unclassifiable) remain distinguishable in diagnostics
                and downstream artifacts.
            data_count (int): Number of 'data' (Tier 1) paragraphs.
            close_count (int): Number of 'close' (Tier 2) paragraphs.
            interp_count (int): Number of 'interpretation' (Tier 3) paragraphs.
            other_count (int): Number of 'other' paragraphs.
            neither_count (int): Number of 'neither' paragraphs.
            total_count (int): Total paragraph count.
    """
    if separation_mode is None:
        separation_mode = SEPARATION_MODE
    if separation_mode == "block":
        separation = compute_separation_blocks(labels)
    else:
        separation = compute_separation_ratio(labels)
    tier = assign_tier(labels, separation, t_sep_threshold, n_min)

    data_count = labels.count(LABEL_DATA)
    close_count = labels.count(LABEL_CLOSE_ANALYSIS)
    interp_count = labels.count(LABEL_INTERPRETATION)

    return {
        "separation": round(separation, 4),
        "tier": tier,
        "tier_state": _tier_state_name(
            tier, data_count, close_count, interp_count, n_min
        ),
        "data_count": data_count,
        "close_count": close_count,
        "interp_count": interp_count,
        "other_count": labels.count(LABEL_OTHER),
        "neither_count": labels.count(LABEL_NEITHER),
        "total_count": len(labels),
    }
