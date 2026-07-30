"""Gnostic-over-emphasis vector family (§3.1.10).

Distinguishes contextualised mention of Gnostic material (−2) from privileged/
evidentiary use (−4, if in data/narrative or treated as evidentiary basis).

Scans all three buckets (data, interpretation, other), restoring footnote parity.
Raised sensitivity on is_passion. Max −4.
"""

import logging
from typing import Optional

from .config import (
    GNOSTIC_CONTEXTUALISED,
    GNOSTIC_PRIVILEGED,
    GNOSTIC_MAX,
    t_fire_default,
    PASSION_MARGIN_DEFAULT,
    TOP_K,
)
from .stores import load_family_store
from .similarity_mapper import score_span

logger = logging.getLogger(__name__)

FAMILY_NAME = "gnostic-over-emphasis"


def score(
    article_text: str,
    paragraph_labels: list[str],
    category_flags: dict[str, bool],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
    passion_margin: int = PASSION_MARGIN_DEFAULT,
) -> dict:
    """Score an article for Gnostic-over-emphasis.

    Args:
        article_text: Full article body text.
        paragraph_labels: Per-paragraph labels from Plan 4.
        category_flags: Category flags dict (is_passion).
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore.
        t_fire: Fire threshold.
        passion_margin: Passion margin (§3.9).

    Returns:
        Dict with:
            contribution (int): −2, −4, or 0.
            store_fires (bool): Whether the store fired.
            in_privileged_position (bool): Whether Gnostic material appears
                                           in data/narrative sections.
    """
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "Gnostic-over-emphasis store not available. Returning 0 (keyword fallback)."
        )
        return {"contribution": 0, "fallback": True}

    result = score_span(article_text, store, embedder, k=TOP_K, t_fire=t_fire)

    if not result["fires"]:
        return _zero_result()

    # Determine if the Gnostic mention is in a privileged position.
    # "Data" paragraphs are narrative — privileged. "Interpretation" paragraphs
    # are where Gnostic material would be contextually discussed.
    in_privileged = False
    if paragraph_labels:
        data_count = paragraph_labels.count("data")
        in_privileged = data_count > 0  # Coarse: any data paragraphs = privileged.

    # Assign weight.
    if in_privileged:
        weight = GNOSTIC_PRIVILEGED  # −4
    else:
        weight = GNOSTIC_CONTEXTUALISED  # −2

    # Passion margin.
    is_passion = category_flags.get("is_passion", False)
    if is_passion and passion_margin != 0:
        weight += passion_margin
        weight = max(weight, GNOSTIC_MAX)

    return {
        "contribution": max(weight, GNOSTIC_MAX),
        "store_fires": True,
        "store_score": result["score"],
        "in_privileged_position": in_privileged,
        "passion_margin_applied": is_passion and passion_margin != 0,
    }


def _zero_result() -> dict:
    return {
        "contribution": 0,
        "store_fires": False,
        "store_score": 0.0,
        "in_privileged_position": False,
        "passion_margin_applied": False,
    }
