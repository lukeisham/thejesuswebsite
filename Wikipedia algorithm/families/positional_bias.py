"""Positional-bias computation shared by two vector families.

Both anti-supernatural and OT-NT-discontinuity split an article's
paragraphs into two halves, score each half through the shared exemplar
store, and take the absolute difference of the two similarity scores.
The computation is identical in both files; only the dimension *weight*
applied to the result differs (each caller's own ``DIMENSION_WEIGHTS``
table), so the weight stays in the caller and this helper returns the raw
bias magnitude.
"""

from .config import TOP_K, t_fire_default
from .similarity_mapper import score_span


def compute_positional_bias(
    paragraphs: list[str],
    store,
    embedder,
    t_fire: float = t_fire_default,
    k: int = TOP_K,
) -> float:
    """Score the first and second halves of an article and diff the scores.

    Each half is embedded separately (mean-pooled over its own token
    sequence), so a half's vector cannot be derived from the other half's
    or from a whole-article embedding — two fresh ``score_span()`` calls
    are inherent to per-span embedding, not a caching oversight.

    Returns 0.0 when no built store is available (same guard both callers
    previously inlined).
    """
    half = len(paragraphs) // 2
    first_half_text = " ".join(paragraphs[:half])
    second_half_text = " ".join(paragraphs[half:])
    if store and store.is_built:
        first_score = score_span(first_half_text, store, embedder, k=k, t_fire=t_fire)
        second_score = score_span(second_half_text, store, embedder, k=k, t_fire=t_fire)
        return abs(first_score["score"] - second_score["score"])
    return 0.0
