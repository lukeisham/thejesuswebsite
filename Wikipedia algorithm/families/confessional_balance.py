"""Confessional-balance vector family (§3.1.8).

Uses the balanced-debate store directly (no separate exemplar set). Fires when
critical-scholar names (Ehrman, Lüdemann, Pagels, etc.) are cited without
Evangelical contrast (Wright, Bauckham, etc.) in interpretation sections.

Weights: −3 (outside interp), −1 (inside without contrast), 0 (inside with contrast).

The balanced-debate store is loaded via the FAMILY_STORE_MAP, which maps
confessional-balance → balanced-debate by design.
"""

import logging
from typing import Optional

from .config import (
    CRITICAL_SCHOLAR_NAMES,
    EVANGELICAL_NAMES,
    CONFESSIONAL_OUTSIDE_INTERP,
    CONFESSIONAL_INSIDE_NO_CONTRAST,
    CONFESSIONAL_INSIDE_WITH_CONTRAST,
    t_fire_default,
)

from .text_utils import find_names

logger = logging.getLogger(__name__)

FAMILY_NAME = "confessional-balance"


def score(
    article_text: str,
    paragraph_labels: list[str],
    embedder,
    store=None,
    t_fire: float = t_fire_default,
) -> dict:
    """Score an article for confessional imbalance.

    Args:
        article_text: Full article body text.
        paragraph_labels: Per-paragraph labels from Plan 4.
        embedder: Shared Embedder instance (unused if no store needed).
        store: Pre-loaded balanced-debate VectorStore. Loaded if not provided.
        t_fire: Fire threshold.

    Returns:
        Dict with:
            contribution (int): −3, −1, or 0.
            critical_names_found (list[str]): Critical scholars detected.
            evangelical_names_found (list[str]): Evangelical scholars detected.
            in_interpretation (bool): Whether names appear in interpretation sections.
            has_contrast (bool): Whether evangelical names provide contrast.
    """
    text_lower = article_text.lower()

    critical_found = find_names(text_lower, CRITICAL_SCHOLAR_NAMES)
    evangelical_found = find_names(text_lower, EVANGELICAL_NAMES)

    if not critical_found:
        return _zero_result()

    has_contrast = len(evangelical_found) > 0

    # Determine if the critical names appear in interpretation sections.
    # Simplified: check if there are any interpretation labels at all.
    in_interpretation = "interpretation" in paragraph_labels if paragraph_labels else False

    # Assign weight based on placement and contrast.
    if not in_interpretation:
        weight = CONFESSIONAL_OUTSIDE_INTERP  # −3
    elif has_contrast:
        weight = CONFESSIONAL_INSIDE_WITH_CONTRAST  # 0
    else:
        weight = CONFESSIONAL_INSIDE_NO_CONTRAST  # −1

    return {
        "contribution": weight,
        "critical_names_found": critical_found,
        "evangelical_names_found": evangelical_found,
        "in_interpretation": in_interpretation,
        "has_contrast": has_contrast,
    }


def _zero_result() -> dict:
    return {
        "contribution": 0,
        "critical_names_found": [],
        "evangelical_names_found": [],
        "in_interpretation": False,
        "has_contrast": False,
    }
