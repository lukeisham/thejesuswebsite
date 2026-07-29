"""OT-NT-discontinuity vector family (§3.1.4).

Same 7-dimension bias system as anti-supernatural, applied to four critique
schools (proof-texting, divergent messianic expectations, Law abrogation,
intertestamental theological evolution) plus contradiction/discrepancy framing.

Unrestricted category scope; interpretation-bucket text *included* (inverted
section-awareness). Returns max −3×2 = −6.
"""

import logging
from typing import Optional

from .config import (
    OT_NT_DISCONTINUITY_MAX,
    t_fire_default,
    t_strong_default,
    TOP_K,
)
from .stores import load_family_store
from .similarity_mapper import score_span, count_distinct_fires
from .passive_voice import passive_ratio

logger = logging.getLogger(__name__)

FAMILY_NAME = "ot-nt-discontinuity"

# Dimension weights (lighter caps than anti-supernatural — max −3 per dimension).
DIMENSION_WEIGHTS: dict[str, int] = {
    "1_attribution_asymmetry": -1,
    "2_epistemic_marking": -1,
    "3_granularity_imbalance": -1,
    "4_labelling_lexicon": -1,
    "5_passive_voice": -1,
    "6_positional_bias": -1,
    "7a_presupposition": -1,
    "7b_omission": -1,
}


def score(
    article_text: str,
    embedder,
    store=None,
    t_fire: float = t_fire_default,
) -> dict:
    """Score an article for OT-NT-discontinuity framing.

    Args:
        article_text: Full article body text.
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore. Loaded if not provided.
        t_fire: Fire threshold.

    Returns:
        Dict with:
            contribution (int): Capped contribution (0 to -6).
            dimensions (dict[str, dict]): Per-dimension scores.
    """
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "OT-NT-discontinuity store not available. Returning 0 (keyword fallback)."
        )
        return _fallback()

    # Split article into paragraphs and score each.
    import re
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", article_text.strip())
                  if p.strip()]
    if not paragraphs:
        return _zero_result()

    # Score each paragraph.
    from .similarity_mapper import score_spans
    span_scores = score_spans(paragraphs, store, embedder, k=TOP_K, t_fire=t_fire)

    distinct = count_distinct_fires(span_scores)

    # Compute dimensions (simplified — mirrors anti-supernatural pattern).
    dimensions: dict[str, dict] = {}
    half = len(paragraphs) // 2
    total_len = sum(len(p) for p in paragraphs) or 1
    first_half_len = sum(len(p) for p in paragraphs[:half])
    second_half_len = sum(len(p) for p in paragraphs[half:])

    granularity = abs(first_half_len - second_half_len) / total_len
    pv_ratio = passive_ratio(article_text)

    # Compute positional bias between halves.
    first_half_text = " ".join(paragraphs[:half])
    second_half_text = " ".join(paragraphs[half:])
    if store and store.is_built:
        fs = score_span(first_half_text, store, embedder, k=TOP_K, t_fire=t_fire)
        ss = score_span(second_half_text, store, embedder, k=TOP_K, t_fire=t_fire)
        positional_bias = abs(fs["score"] - ss["score"])
    else:
        positional_bias = 0.0

    dimension_data = {
        "1_attribution_asymmetry": granularity > 0.25,
        "2_epistemic_marking": pv_ratio > 0.25,
        "3_granularity_imbalance": granularity > 0.3,
        "4_labelling_lexicon": distinct >= 2,
        "5_passive_voice": pv_ratio > 0.25,
        "6_positional_bias": positional_bias > 0.2,
        "7a_presupposition": distinct >= 3,
        "7b_omission": granularity > 0.3,
    }

    total = 0
    for dim_name, fires in dimension_data.items():
        weight = DIMENSION_WEIGHTS.get(dim_name, 0)
        dimensions[dim_name] = {"fires": fires, "weight": weight}
        if fires:
            total += weight

    # Cap at −6 (3 dimensions × 2 points per §3.1.4, or 6 dimensions × 1 point).
    total = max(total, OT_NT_DISCONTINUITY_MAX)

    return {
        "contribution": total,
        "dimensions": dimensions,
        "distinct_fires": distinct,
        "span_scores": span_scores,
    }


def _zero_result() -> dict:
    return {
        "contribution": 0,
        "dimensions": {},
        "distinct_fires": 0,
        "span_scores": [],
    }


def _fallback() -> dict:
    return {
        "contribution": 0,
        "dimensions": {},
        "distinct_fires": 0,
        "span_scores": [],
        "fallback": True,
    }
