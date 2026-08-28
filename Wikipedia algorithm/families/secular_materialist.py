"""Secular-materialist vector family (§3.1.7).

Detects miracle-specific naturalistic/psychosomatic/hallucination/legendary-
development framing. Same 7-dimension bias system as anti-supernatural, applied
to miracle-specific terms.

Scope: Miracle & Passion categories only; section-aware (criticism/historical/
scholarly/skeptical headings excluded). Raised sensitivity on is_passion.
Max −2×4 = −8. Placement multiplier does NOT apply.
"""

import logging
from typing import Optional

from .config import (
    SECULAR_MAX,
    t_fire_default,
    PASSION_MARGIN_DEFAULT,
    TOP_K,
)
from .stores import load_family_store
from .similarity_mapper import score_span
from .passive_voice import passive_ratio
from .text_utils import split_paragraphs

logger = logging.getLogger(__name__)

FAMILY_NAME = "secular-materialist"


def score(
    article_text: str,
    category_flags: dict[str, bool],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
    passion_margin: int = PASSION_MARGIN_DEFAULT,
) -> dict:
    """Score an article for secular-materialist bias.

    Args:
        article_text: Full article body text.
        category_flags: Category flags dict (is_miracle, is_passion).
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore.
        t_fire: Fire threshold.
        passion_margin: Passion margin (§3.9).

    Returns:
        Dict with contribution and breakdown.
    """
    is_miracle = category_flags.get("is_miracle", False)
    is_passion = category_flags.get("is_passion", False)
    if not is_miracle and not is_passion:
        return {"contribution": 0, "out_of_scope": True}

    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "Secular-materialist store not available. Returning 0 (keyword fallback)."
        )
        return {"contribution": 0, "fallback": True}

    # Split into paragraphs and exclude known scholarly/skeptical headings.
    paragraphs = _filter_paragraphs(article_text)

    from .similarity_mapper import score_spans, count_distinct_fires
    span_scores = score_spans(paragraphs, store, embedder, k=TOP_K, t_fire=t_fire)
    distinct = count_distinct_fires(span_scores)

    # Compute contribution: each distinct fire = −2, max 4 fires = −8.
    contribution = max(distinct * -2, SECULAR_MAX)

    if is_passion and passion_margin != 0:
        contribution += passion_margin
        contribution = max(contribution, SECULAR_MAX)

    return {
        "contribution": contribution,
        "distinct_fires": distinct,
        "span_scores": span_scores,
        "passion_margin_applied": is_passion and passion_margin != 0,
    }


def _filter_paragraphs(text: str) -> list[str]:
    """Split text and exclude paragraphs starting with scholarly/skeptical headings."""
    SKIP_HEADINGS = {
        "criticism", "historical", "scholarly", "skeptical",
        "naturalistic", "scientific", "academic",
    }
    filtered: list[str] = []
    for stripped in split_paragraphs(text):
        first_line = stripped.split("\n")[0].strip().rstrip(".:").lower()
        if first_line in SKIP_HEADINGS:
            continue
        filtered.append(stripped)
    return filtered
