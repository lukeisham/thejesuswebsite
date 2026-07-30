"""Jesus-Seminar vector family (§3.1.6).

Detects Jesus-Seminar-affiliated framing (critical-but-historicist scholarship
presented as settled rather than contested). Uses a fixed name list (Funk,
Crossan, Borg) for count. Same modifiers as mythicist but lighter cap:
−3 per author capped at −6. Placement multiplier and imbalance surcharge apply.

Max −6×2−2 = −14.
"""

import logging
from typing import Optional

from .config import (
    JESUS_SEMINAR_NAMES,
    JESUS_SEMINAR_CAP_PER_AUTHOR,
    JESUS_SEMINAR_TOTAL_CAP,
    JESUS_SEMINAR_MAX,
    IMBALANCE_SURCHARGE,
    PLACEMENT_DATA_MULTIPLIER,
    PLACEMENT_INTERP_MULTIPLIER,
    t_fire_default,
)
from .stores import load_family_store
from .similarity_mapper import score_span
from .combination_functions.shape_b import shape_b_score

logger = logging.getLogger(__name__)

FAMILY_NAME = "jesus-seminar"


def score(
    article_text: str,
    paragraph_labels: list[str],
    balanced_debate_score: int,
    embedder,
    store=None,
    t_fire: float = t_fire_default,
) -> dict:
    """Score an article for Jesus-Seminar framing.

    Args:
        article_text: Full article body text.
        paragraph_labels: Per-paragraph labels from Plan 4.
        balanced_debate_score: The balanced-debate family's contribution.
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore. Loaded if not provided.
        t_fire: Fire threshold.

    Returns:
        Dict with contribution and breakdown.
    """
    text_lower = article_text.lower()
    name_count = sum(1 for name in JESUS_SEMINAR_NAMES if name in text_lower)

    if name_count == 0:
        return _zero_result()

    # Determine placement multiplier.
    multiplier = _compute_placement_multiplier(paragraph_labels)

    # Query vector store.
    framing_fires = False
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is not None and store.is_built:
        result = score_span(article_text, store, embedder, t_fire=t_fire)
        framing_fires = result["fires"]

    # Shape B with Jesus-Seminar-specific caps.
    sb = shape_b_score(
        name_count=name_count,
        per_name_weight=JESUS_SEMINAR_CAP_PER_AUTHOR,
        name_cap=JESUS_SEMINAR_TOTAL_CAP,
        total_cap=JESUS_SEMINAR_MAX,
        placement_multiplier=multiplier,
        balanced_debate_score=balanced_debate_score,
        imbalance_surcharge=IMBALANCE_SURCHARGE,
    )

    contribution = max(sb["contribution"], JESUS_SEMINAR_MAX)

    return {
        "contribution": contribution,
        "name_count": name_count,
        "names_found": [n for n in JESUS_SEMINAR_NAMES if n in text_lower],
        "placement_multiplier": multiplier,
        "framing_store_fires": framing_fires,
        "imbalance_applied": sb["imbalance_applied"],
    }


def _compute_placement_multiplier(paragraph_labels: list[str]) -> float:
    """Simplified placement multiplier from paragraph labels."""
    if not paragraph_labels:
        return PLACEMENT_INTERP_MULTIPLIER
    non_interp = len(paragraph_labels) - paragraph_labels.count("interpretation")
    return PLACEMENT_DATA_MULTIPLIER if non_interp > 0 else PLACEMENT_INTERP_MULTIPLIER


def _zero_result() -> dict:
    return {
        "contribution": 0,
        "name_count": 0,
        "names_found": [],
        "placement_multiplier": 1.0,
        "framing_store_fires": False,
        "imbalance_applied": False,
    }
