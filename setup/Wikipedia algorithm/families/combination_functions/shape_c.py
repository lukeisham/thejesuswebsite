"""Shape C — Structural boolean (§3.4.1).

Two or more stores must fire for the signal to resolve true; weight is flat.

Used by: the data/interpretation split (Plan 4) and confessional-balance.
"""

from typing import Optional


def shape_c_score(
    store_results: dict[str, bool],
    true_weight: int = 1,
    false_weight: int = 0,
    min_stores_required: int = 2,
) -> dict:
    """Compute a Shape C contribution from multiple store fires.

    Args:
        store_results: Dict mapping store name → whether it fired.
        true_weight: Contribution when the condition is met.
        false_weight: Contribution when the condition is not met.
        min_stores_required: Minimum number of stores that must fire.

    Returns:
        Dict with:
            contribution (int): The integer contribution.
            stores_fired (int): Number of stores that fired.
            condition_met (bool): Whether the structural condition was met.
    """
    stores_fired = sum(1 for v in store_results.values() if v)
    condition_met = stores_fired >= min_stores_required

    return {
        "contribution": true_weight if condition_met else false_weight,
        "stores_fired": stores_fired,
        "condition_met": condition_met,
    }
