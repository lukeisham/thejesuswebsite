"""Literary-analysis vector family (§3.1.9).

Detects narrative criticism, rhetorical devices (inclusio, chiasm, parallelism),
genre conventions, intertextual allusion, reader-response, and form-critical
segmentation. Queries full article text (not restricted to one bucket).

Tiered by category flags: +6 for parable/teaching/bible-book, +4 for others,
0 if store does not fire. Shape D — tiered presence.
"""

import logging
from typing import Optional

from .config import (
    LITERARY_TIER_PARABLE,
    LITERARY_TIER_OTHER,
    LITERARY_TIER_NONE,
    PARABLE_CATEGORIES,
    t_fire_default,
    TOP_K,
)
from .stores import load_family_store
from .similarity_mapper import score_span
from .combination_functions.shape_d import shape_d_tiered

logger = logging.getLogger(__name__)

FAMILY_NAME = "literary-analysis"


def score(
    article_text: str,
    category_flags: dict[str, bool],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
) -> dict:
    """Score an article for literary-analysis presence.

    Args:
        article_text: Full article body text.
        category_flags: Category flags dict (is_parable, is_teaching, is_bible_book).
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore.
        t_fire: Fire threshold.

    Returns:
        Dict with:
            contribution (int): +6, +4, or 0.
            store_fires (bool): Whether the store fired.
            tier (str): Which tier was selected.
    """
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is None or not store.is_built:
        logger.warning(
            "Literary-analysis store not available. Returning 0 (keyword fallback)."
        )
        return {"contribution": 0, "fallback": True}

    result = score_span(article_text, store, embedder, k=TOP_K, t_fire=t_fire)

    # Determine tier by category flags.
    is_parable_type = any(category_flags.get(cat) for cat in PARABLE_CATEGORIES)

    tier_weights = {
        "parable": LITERARY_TIER_PARABLE,   # +6
        "other": LITERARY_TIER_OTHER,        # +4
        "none": LITERARY_TIER_NONE,           # 0
    }

    selected_tier = "parable" if is_parable_type else "other"

    sd = shape_d_tiered(
        store_fires=result["fires"],
        tier_weights=tier_weights,
        selected_tier=selected_tier if result["fires"] else None,
    )

    return {
        "contribution": sd["contribution"],
        "store_fires": result["fires"],
        "store_score": result["score"],
        "tier": sd["tier"],
    }
