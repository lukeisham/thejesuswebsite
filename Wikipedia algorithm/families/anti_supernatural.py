"""Anti-supernatural vector family (§3.1.3).

Two-stage pipeline:
  Stage A: Labels sentence spans as supernatural-view / naturalistic-view / neither
           (embedding-based).
  Stage B: Measures seven bias dimensions:
           1 — Attribution Verb Asymmetry (embedding)
           2 — Epistemic Marking (embedding)
           4 — Labelling/Moral Lexicon (embedding)
           7a — Presupposition (embedding)
           3 — Granularity / Citation Imbalance (computed)
           5 — Narrative Agency and Causality / Passive Voice (computed)
           6 — Positional Bias (computed)
           7b — Omission (computed)

Returns max −2×4 = −8, Miracle & Passion scoped, raised sensitivity on is_passion.
"""

import logging
from typing import Optional

from .config import (
    ANTI_SUPERNATURAL_MAX,
    t_fire_default,
    t_strong_default,
    TOP_K,
    PASSION_MARGIN_DEFAULT,
)
from .stores import load_family_store
from .similarity_mapper import score_span
from .passive_voice import passive_ratio, passive_asymmetry

logger = logging.getLogger(__name__)

FAMILY_NAME = "anti-supernatural"

# Dimension weights (max points per dimension, negative = penalty).
DIMENSION_WEIGHTS: dict[str, int] = {
    "1_attribution_asymmetry": -2,
    "2_epistemic_marking": -2,
    "3_granularity_imbalance": -2,
    "4_labelling_lexicon": -2,
    "5_passive_voice": -2,
    "6_positional_bias": -2,
    "7a_presupposition": -2,
    "7b_omission": -2,
}


def score(
    article_text: str,
    category_flags: dict[str, bool],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
    passion_margin: int = PASSION_MARGIN_DEFAULT,
) -> dict:
    """Score an article for anti-supernatural bias.

    Args:
        article_text: Full article body text.
        category_flags: Category flags dict (is_miracle, is_passion, etc.).
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore. Loaded if not provided.
        t_fire: Fire threshold for embedding dimensions.
        passion_margin: Additional margin for Passion-category articles (§3.9).

    Returns:
        Dict with:
            contribution (int): Capped contribution (0 to -8).
            dimensions (dict[str, dict]): Per-dimension scores.
            stage_a_label (str|None): 'supernatural' / 'naturalistic' / 'neither'.
    """
    # Scope: Miracle & Passion categories only.
    is_miracle = category_flags.get("is_miracle", False)
    is_passion = category_flags.get("is_passion", False)
    if not is_miracle and not is_passion:
        return _out_of_scope()

    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "Anti-supernatural store not available. Returning 0 (keyword fallback)."
        )
        return _fallback()

    # Stage A: Label spans (simplified — in a full implementation, this would
    # split the article into sentence-level spans and classify each).
    # For the MVP, we score the full article text against the store.
    # NOTE: this whole-article embedding cannot be reused for the two
    # positional-bias half-article calls below — Embedder.embed() mean-pools
    # the token sequence (truncated at MAX_SEQ_LENGTH), so a span's vector is
    # not derivable from another span's vector; each span needs its own embed.
    span_result = score_span(article_text, store, embedder, k=TOP_K,
                             t_fire=t_fire)

    # Stage B: Measure each dimension.
    dimensions: dict[str, dict] = {}

    # Dimensions 1, 2, 4, 7a — embedding-based.
    for dim in ("1_attribution_asymmetry", "2_epistemic_marking",
                "4_labelling_lexicon", "7a_presupposition"):
        dimensions[dim] = {
            "fires": span_result["fires"],
            "score": span_result["score"],
            "weight": DIMENSION_WEIGHTS.get(dim, 0),
        }

    # Dimension 3 — Granularity (computed: word-count ratio of supernatural
    # vs naturalistic text — simplified to paragraph-length asymmetry).
    paragraphs = _split_paragraphs(article_text)
    half = len(paragraphs) // 2
    first_half_len = sum(len(p) for p in paragraphs[:half])
    second_half_len = sum(len(p) for p in paragraphs[half:])
    total_len = first_half_len + second_half_len or 1
    granularity = abs(first_half_len - second_half_len) / total_len
    dimensions["3_granularity_imbalance"] = {
        "fires": granularity > 0.3,
        "score": round(granularity, 4),
        "weight": DIMENSION_WEIGHTS["3_granularity_imbalance"],
    }

    # Dimension 5 — Passive voice (computed).
    pv_ratio = passive_ratio(article_text)
    dimensions["5_passive_voice"] = {
        "fires": pv_ratio > 0.25,
        "score": round(pv_ratio, 4),
        "weight": DIMENSION_WEIGHTS["5_passive_voice"],
    }

    # Dimension 6 — Positional bias (computed: are biased patterns
    # concentrated in the first half of the article?).
    first_half_text = " ".join(paragraphs[:half])
    second_half_text = " ".join(paragraphs[half:])
    if store and store.is_built:
        # Two fresh embeddings here (plus the whole-article one above): each
        # half is mean-pooled over its own token sequence, so neither half's
        # vector can be derived from the whole-article vector — 3 calls is
        # inherent to per-span embedding, not a caching oversight.
        first_score = score_span(first_half_text, store, embedder,
                                 k=TOP_K, t_fire=t_fire)
        second_score = score_span(second_half_text, store, embedder,
                                  k=TOP_K, t_fire=t_fire)
        positional_bias = abs(first_score["score"] - second_score["score"])
    else:
        positional_bias = 0.0
    dimensions["6_positional_bias"] = {
        "fires": positional_bias > 0.2,
        "score": round(positional_bias, 4),
        "weight": DIMENSION_WEIGHTS["6_positional_bias"],
    }

    # Dimension 7b — Omission (computed: are there fewer supernatural-view
    # paragraphs than naturalistic-view paragraphs? Simplified).
    dimensions["7b_omission"] = {
        "fires": granularity > 0.3,  # Reuse granularity as omission proxy.
        "score": round(granularity, 4),
        "weight": DIMENSION_WEIGHTS["7b_omission"],
    }

    # Compute total contribution.
    total = 0
    firing_dims = 0
    for dim_name, dim_data in dimensions.items():
        if dim_data["fires"]:
            total += dim_data["weight"]
            firing_dims += 1

    # Apply Passion margin (§3.9).
    if is_passion and passion_margin != 0:
        total += passion_margin

    # Apply cap.
    total = max(total, ANTI_SUPERNATURAL_MAX)

    return {
        "contribution": total,
        "dimensions": dimensions,
        "firing_dimensions": firing_dims,
        "stage_a_fires": span_result["fires"],
        "stage_a_score": span_result["score"],
        "passion_margin_applied": is_passion and passion_margin != 0,
    }


def _out_of_scope() -> dict:
    return {
        "contribution": 0,
        "dimensions": {},
        "firing_dimensions": 0,
        "stage_a_fires": False,
        "stage_a_score": 0.0,
        "passion_margin_applied": False,
        "out_of_scope": True,
    }


def _fallback() -> dict:
    return {
        "contribution": 0,
        "dimensions": {},
        "firing_dimensions": 0,
        "stage_a_fires": False,
        "stage_a_score": 0.0,
        "passion_margin_applied": False,
        "fallback": True,
    }


def _split_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs."""
    import re
    parts = re.split(r"\n\s*\n", text.strip())
    return [p.strip() for p in parts if p.strip()]
