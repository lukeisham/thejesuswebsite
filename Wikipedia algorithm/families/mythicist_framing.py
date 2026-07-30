"""Mythicist-framing vector family (§3.1.5).

Detects Christ-myth-theory framing (denial of Jesus' historical existence).
Uses a fixed name list (Carrier, Price, Doherty) for count, plus vector store
for framing detection. Placement multiplier from Plan 4's section labels.

Max −7×2−2 = −16. Raised sensitivity on is_passion.
"""

import logging
from typing import Optional

from .config import (
    MYTHICIST_NAMES,
    MYTHICIST_CAP_PER_AUTHOR,
    MYTHICIST_MAX,
    IMBALANCE_SURCHARGE,
    PLACEMENT_DATA_MULTIPLIER,
    PLACEMENT_INTERP_MULTIPLIER,
    PASSION_MARGIN_DEFAULT,
    t_fire_default,
)
from .stores import load_family_store
from .similarity_mapper import score_span
from .combination_functions.shape_b import shape_b_score

logger = logging.getLogger(__name__)

FAMILY_NAME = "mythicist-framing"


def score(
    article_text: str,
    paragraph_labels: list[str],
    category_flags: dict[str, bool],
    balanced_debate_score: int,
    embedder,
    store=None,
    t_fire: float = t_fire_default,
    passion_margin: int = PASSION_MARGIN_DEFAULT,
) -> dict:
    """Score an article for mythicist-framing bias.

    Args:
        article_text: Full article body text.
        paragraph_labels: Per-paragraph labels from Plan 4 ('data', 'interpretation', etc.).
        category_flags: Category flags dict (is_passion, etc.).
        balanced_debate_score: The balanced-debate family's contribution.
        embedder: Shared Embedder instance.
        store: Pre-loaded VectorStore. Loaded if not provided.
        t_fire: Fire threshold.
        passion_margin: Additional margin for Passion-category articles (§3.9).

    Returns:
        Dict with contribution and breakdown.
    """
    # Count named mythicist authors in the text.
    text_lower = article_text.lower()
    name_count = sum(1 for name in MYTHICIST_NAMES if name in text_lower)

    if name_count == 0:
        return _zero_result()

    # Determine placement multiplier from paragraph labels.
    # ×2 if any name appears outside interpretation (data/lede/refs);
    # ×0.5 if all appearances are in interpretation only.
    multiplier = _compute_placement_multiplier(article_text, paragraph_labels)

    # Query vector store for framing detection.
    framing_fires = False
    if store is None:
        store = load_family_store(FAMILY_NAME, embedder)

    if store is not None and store.is_built:
        result = score_span(article_text, store, embedder, t_fire=t_fire)
        framing_fires = result["fires"]

    # Shape B: name count + placement multiplier + imbalance surcharge.
    sb = shape_b_score(
        name_count=name_count,
        per_name_weight=MYTHICIST_CAP_PER_AUTHOR,
        name_cap=MYTHICIST_CAP_PER_AUTHOR * name_count,
        total_cap=MYTHICIST_MAX,
        placement_multiplier=multiplier,
        balanced_debate_score=balanced_debate_score,
        imbalance_surcharge=IMBALANCE_SURCHARGE,
    )

    contribution = sb["contribution"]

    # Apply Passion margin (§3.9).
    is_passion = category_flags.get("is_passion", False)
    if is_passion and passion_margin != 0:
        contribution += passion_margin

    # Apply cap.
    contribution = max(contribution, MYTHICIST_MAX)

    return {
        "contribution": contribution,
        "name_count": name_count,
        "names_found": [n for n in MYTHICIST_NAMES if n in text_lower],
        "placement_multiplier": multiplier,
        "framing_store_fires": framing_fires,
        "imbalance_applied": sb["imbalance_applied"],
        "passion_margin_applied": is_passion and passion_margin != 0,
    }


def _compute_placement_multiplier(
    article_text: str,
    paragraph_labels: list[str],
) -> float:
    """Compute the placement multiplier for mythicist names.

    ×2 if names appear outside interpretation (data/lede/refs).
    ×0.5 if all appearances are in interpretation paragraphs only.

    This is a simplified heuristic — a full implementation would check
    which specific paragraphs contain the names.
    """
    if not paragraph_labels:
        return PLACEMENT_INTERP_MULTIPLIER

    # Count how many labels are 'interpretation' vs other.
    interp_count = paragraph_labels.count("interpretation")
    non_interp_count = len(paragraph_labels) - interp_count

    # If any non-interpretation paragraphs exist, apply the data multiplier.
    # This is a coarse proxy — the ideal would check per-name paragraph location.
    if non_interp_count > 0:
        return PLACEMENT_DATA_MULTIPLIER
    return PLACEMENT_INTERP_MULTIPLIER


def _zero_result() -> dict:
    return {
        "contribution": 0,
        "name_count": 0,
        "names_found": [],
        "placement_multiplier": 1.0,
        "framing_store_fires": False,
        "imbalance_applied": False,
        "passion_margin_applied": False,
    }
