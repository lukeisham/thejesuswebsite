"""Shape A — Distinct-pattern count (§3.4.1).

Counts distinct query spans clearing t_fire, deduplicated by matched exemplar.
Multiplies by per-hit weight and applies a cap.

Used by: balanced-debate, OT-NT-discontinuity.
"""

from ..similarity_mapper import (
    count_distinct_fires,
    count_strong_hits,
    apply_cap,
)


def shape_a_score(
    scored_spans: list[dict],
    per_hit_weight: int = 1,
    strength_multiplier: int = 1,
    cap: int = 0,
    require_strong_for_bonus: int = 0,
) -> dict:
    """Compute a Shape A contribution from scored spans.

    Args:
        scored_spans: List of score dicts from similarity_mapper.score_spans().
        per_hit_weight: Contribution per distinct fire (e.g. +2 for balanced-debate).
        strength_multiplier: Extra multiplier when strong hits meet the bonus threshold.
        cap: Maximum absolute contribution (positive or negative).
        require_strong_for_bonus: Minimum number of strong hits needed to
                                  apply the strength_multiplier (e.g. 2 for
                                  balanced-debate's representative bonus).

    Returns:
        Dict with:
            contribution (int): The capped integer contribution.
            distinct_fires (int): Number of distinct firing spans.
            strong_hits (int): Number of strong hits.
            bonus_applied (bool): Whether the strength multiplier was applied.
    """
    distinct = count_distinct_fires(scored_spans)
    strong = count_strong_hits(scored_spans)

    bonus_applied = False
    contribution = distinct * per_hit_weight

    if require_strong_for_bonus > 0 and strong >= require_strong_for_bonus:
        contribution *= strength_multiplier
        bonus_applied = True

    if cap != 0:
        contribution = apply_cap(contribution, cap)

    return {
        "contribution": contribution,
        "distinct_fires": distinct,
        "strong_hits": strong,
        "bonus_applied": bonus_applied,
    }
