"""Shape D — Tiered presence (§3.4.1).

Store fires or not; tier chosen by category flags or store strength + placement.
Handles the 7-dimension system's two-stage splits.

Used by: literary-analysis, gnostic-over-emphasis, anti-supernatural, secular-materialist.
"""

from typing import Optional


def shape_d_tiered(
    store_fires: bool,
    tier_weights: dict[str, int],
    selected_tier: Optional[str] = None,
    category_flags: Optional[dict[str, bool]] = None,
    tier_by_category: Optional[dict[str, dict[str, int]]] = None,
) -> dict:
    """Compute a Shape D contribution by tiered presence.

    If the store fires, the contribution is selected from tier_weights based on
    either the explicit `selected_tier` or the highest-priority matching category.

    Args:
        store_fires: Whether the vector store fired for this article.
        tier_weights: Dict mapping tier key → integer contribution.
        selected_tier: Explicit tier to use (overrides category-based selection).
        category_flags: Dict of category flag → bool (e.g. {'is_parable': True}).
        tier_by_category: Dict mapping category flag → tier_weights for that category.

    Returns:
        Dict with:
            contribution (int): The tiered contribution.
            store_fires (bool): Whether the store fired.
            tier (str|None): The tier that was selected.
    """
    if not store_fires:
        return {
            "contribution": 0,
            "store_fires": False,
            "tier": None,
        }

    tier: Optional[str] = selected_tier
    weight: int = 0

    if tier is not None and tier in tier_weights:
        weight = tier_weights[tier]
    elif tier_by_category and category_flags:
        # Select the highest-priority matching category.
        for cat_flag, cat_weights in tier_by_category.items():
            if category_flags.get(cat_flag):
                # Take the first matching category's weight.
                for t, w in cat_weights.items():
                    weight = w
                    tier = t
                    break
                break

    if weight == 0 and tier is None:
        # Fallback: use default tier if available.
        weight = tier_weights.get("default", 0)
        tier = "default"

    return {
        "contribution": weight,
        "store_fires": True,
        "tier": tier,
    }


def shape_d_boolean(
    stores_fired: dict[str, bool],
    require_all: bool = True,
    true_weight: int = 1,
    false_weight: int = 0,
) -> dict:
    """Simple boolean Shape D — all (or any) stores must fire.

    Args:
        stores_fired: Dict mapping store name → whether it fired.
        require_all: If True, all stores must fire (AND). If False, any (OR).
        true_weight: Contribution when condition is met.
        false_weight: Contribution when condition is not met.

    Returns:
        Dict with:
            contribution (int): The integer contribution.
            condition_met (bool): Whether the boolean condition was met.
    """
    if require_all:
        condition_met = all(stores_fired.values())
    else:
        condition_met = any(stores_fired.values())

    return {
        "contribution": true_weight if condition_met else false_weight,
        "condition_met": condition_met,
    }
