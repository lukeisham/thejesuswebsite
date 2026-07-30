"""Shape B — List counts with modifiers (§3.4.1).

Takes a fixed-name-list count, applies the placement multiplier from Plan 4's
classifier labels (×2 outside interpretation, ×0.5 interpretation-only), then
the imbalance surcharge (−2 if balanced-debate = 0). Truncates fractional results
toward zero (§12.1).

Used by: mythicist-framing, jesus-seminar.
"""

import math
from typing import Optional


def shape_b_score(
    name_count: int,
    per_name_weight: int,
    name_cap: int,
    total_cap: int,
    placement_multiplier: float,
    balanced_debate_score: int,
    imbalance_surcharge: int = -2,
) -> dict:
    """Compute a Shape B contribution from name-list counts plus modifiers.

    Order of operations (§12.1):
      1. Count names × per-name weight, capped per name.
      2. Apply placement multiplier (×2 or ×0.5).
      3. Truncate toward zero.
      4. Apply total cap.
      5. Apply imbalance surcharge if balanced-debate = 0.

    Args:
        name_count: Number of distinct named authors detected.
        per_name_weight: Points per named author.
        name_cap: Maximum per-author contribution before summation.
        total_cap: Maximum total contribution (absolute value).
        placement_multiplier: ×2 outside interpretation, ×0.5 interpretation-only.
        balanced_debate_score: The balanced-debate family's contribution (0 = no debate).
        imbalance_surcharge: Additional penalty when balanced-debate = 0.

    Returns:
        Dict with:
            contribution (int): Final capped + surcharged contribution.
            name_count (int): Number of distinct names detected.
            raw_sum (int): Raw per-name sum after name_cap.
            after_placement (float): After placement multiplier, before truncation.
            after_truncation (int): After truncation toward zero.
            imbalance_applied (bool): Whether surcharge was applied.
    """
    raw_sum = name_count * per_name_weight
    if name_cap > 0:
        raw_sum = min(raw_sum, name_cap)

    after_placement = raw_sum * placement_multiplier

    # Truncate toward zero (§12.1): remove the fractional part toward zero.
    if after_placement > 0:
        after_truncation = math.floor(after_placement)
    elif after_placement < 0:
        after_truncation = math.ceil(after_placement)
    else:
        after_truncation = 0

    # Apply total cap.
    if total_cap != 0:
        if total_cap > 0:
            after_truncation = min(after_truncation, total_cap)
        else:
            after_truncation = max(after_truncation, total_cap)

    contribution = after_truncation
    imbalance_applied = False

    # Imbalance surcharge: if balanced-debate = 0, apply extra penalty.
    if balanced_debate_score == 0:
        contribution += imbalance_surcharge
        imbalance_applied = True

    return {
        "contribution": contribution,
        "name_count": name_count,
        "raw_sum": raw_sum,
        "after_placement": round(after_placement, 4),
        "after_truncation": after_truncation,
        "imbalance_applied": imbalance_applied,
    }
