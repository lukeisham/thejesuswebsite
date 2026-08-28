"""Balanced-debate vector family (§3.1.2).

Detects genuine scholarly debate across data and interpretation layers:
  - Longevity language ("long-running debate", "continues to be discussed")
  - Representative-individual attribution (named scholars on BOTH sides)
  - Disagreement across data AND interpretation layers
  - Properly-anchored consensus language (not bare "scholars agree")

Queries interpretation-section text (from Plan 4's bucket labels) against
its vector store. Shape A — distinct-pattern count with named-representative bonus.
"""

import logging
from typing import Optional

from .config import (
    BALANCED_DEBATE_CAP,
    BALANCED_DEBATE_REPRESENTATIVE_BONUS,
    t_fire_default,
    t_strong_default,
    TOP_K,
)
from .stores import load_family_store
from .similarity_mapper import score_spans, count_distinct_fires, count_strong_hits
from .combination_functions.shape_a import shape_a_score

logger = logging.getLogger(__name__)

FAMILY_NAME = "balanced-debate"


def score(
    article_text: str,
    interpretation_paragraphs: list[str],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
    t_strong: float = t_strong_default,
) -> dict:
    """Score an article for balanced scholarly debate.

    Args:
        article_text: Full article body text (unused — only interp sections scanned).
        interpretation_paragraphs: List of paragraphs labelled 'interpretation'
                                   by Plan 4's classifier.
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore. Loaded if not provided.
        t_fire: Fire threshold.
        t_strong: Strong-hit threshold.

    Returns:
        Dict with:
            contribution (int): Capped contribution (0 to +12).
            distinct_fires (int): Number of distinct debate patterns detected.
            strong_hits (int): Number of strong hits (score >= t_strong).
            bonus_applied (bool): Whether the ×2 representative bonus was applied.
            span_scores (list[dict]): Per-paragraph scoring details.
    """
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "Balanced-debate store not available. Returning 0 (keyword fallback)."
        )
        return _fallback()

    if not interpretation_paragraphs:
        return _zero_result()

    span_scores = score_spans(
        interpretation_paragraphs, store, embedder, k=TOP_K,
        t_fire=t_fire, t_strong=t_strong,
    )

    result = shape_a_score(
        scored_spans=span_scores,
        per_hit_weight=2,       # Each distinct debate pattern = +2
        strength_multiplier=2,   # ×2 when 2+ strong hits (named representatives)
        cap=BALANCED_DEBATE_CAP * 2,  # +6 doubled to +12 with bonus
        require_strong_for_bonus=BALANCED_DEBATE_REPRESENTATIVE_BONUS,
    )

    result["span_scores"] = span_scores
    return result


def _zero_result() -> dict:
    """Return a zero result when no interpretation paragraphs exist."""
    return {
        "contribution": 0,
        "distinct_fires": 0,
        "strong_hits": 0,
        "bonus_applied": False,
        "span_scores": [],
    }


def _fallback() -> dict:
    """Return a fallback result signalling keyword detector should be used."""
    return {
        "contribution": 0,  # Keyword detector provides the value.
        "distinct_fires": 0,
        "strong_hits": 0,
        "bonus_applied": False,
        "span_scores": [],
        "fallback": True,
    }
