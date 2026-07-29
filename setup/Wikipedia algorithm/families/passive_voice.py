"""Passive-voice detector for the anti-supernatural family's Dimension 5.

Ports the two regex patterns from admin/assets/js/admin-spellcheck/spellcheck-engine.js
(lines 607–626) to Python:
  1. Auxiliary + past-participle-like pattern (e.g. "was discovered", "has been found")
  2. Auxiliary + word + "by" agent-deletion pattern (e.g. "was seen by scholars")

No new NLP dependency — same two patterns, same intent, no new dependency.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pattern 1: Auxiliary verb + past-participle-like word.
#
# Matches forms of "be" or "get" followed by a word ending in -ed, -en, -t,
# or an irregular past participle. This is the workhorse passive detector.
# ---------------------------------------------------------------------------

_AUXILIARY_PATTERN = re.compile(
    r"\b(am|is|are|was|were|be|been|being|get|gets|got|gotten|has|have|had)\s+"
    r"(\w+(?:ed|en|[aeiou]t|own|awn|ept|ent|ung|unk|ought|aught))\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Pattern 2: Auxiliary + word + "by" — agent-deletion passive.
#
# Captures passive constructions where the agent is explicitly named with "by".
# Examples: "was discovered by archaeologists", "have been challenged by scholars"
# ---------------------------------------------------------------------------

_AGENT_BY_PATTERN = re.compile(
    r"\b(am|is|are|was|were|be|been|being|get|gets|got|gotten|has|have|had)\s+"
    r"\w+\s+by\b",
    re.IGNORECASE,
)


def count_passive_patterns(text: str) -> int:
    """Count the number of passive-voice constructions in a text span.

    Uses both the auxiliary+participle pattern and the agent-by pattern,
    to cover both explicit and implicit agent deletion.

    Args:
        text: The text span to analyse.

    Returns:
        Number of passive constructions detected.
    """
    if not text or not text.strip():
        return 0

    # Pattern 1: auxiliary + participle-like word.
    aux_matches = len(_AUXILIARY_PATTERN.findall(text))

    # Pattern 2: auxiliary + word + "by".
    by_matches = len(_AGENT_BY_PATTERN.findall(text))

    total = aux_matches + by_matches
    return total


def passive_ratio(text: str) -> float:
    """Compute the passive-voice ratio for a text span.

    Returns the proportion of sentences containing at least one passive
    construction. Used as Dimension 5's core metric.

    Args:
        text: The text span to analyse.

    Returns:
        Ratio in [0.0, 1.0]. Returns 0.0 for empty text.
    """
    if not text or not text.strip():
        return 0.0

    # Split into sentences (rough — handles . ! ? followed by space/end).
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if not sentences:
        return 0.0

    passive_count = sum(1 for s in sentences if count_passive_patterns(s) > 0)
    return passive_count / len(sentences)


def passive_asymmetry(
    view_a_text: str,
    view_b_text: str,
) -> dict:
    """Compute passive-voice asymmetry between two view-spans.

    Measures whether one view's sentences are systematically put in the
    passive voice more often than the other view's — a known bias marker
    (narrative agency is stripped from the disfavoured view).

    Args:
        view_a_text: Text span representing View A (e.g. supernatural claims).
        view_b_text: Text span representing View B (e.g. naturalistic explanations).

    Returns:
        Dict with:
            ratio_a (float): Passive ratio for view A.
            ratio_b (float): Passive ratio for view B.
            asymmetry (float): |ratio_a - ratio_b| — raw asymmetry score.
            fires (bool): True if asymmetry exceeds 0.15 (calibratable threshold).
    """
    ratio_a = passive_ratio(view_a_text)
    ratio_b = passive_ratio(view_b_text)
    asymmetry = abs(ratio_a - ratio_b)

    return {
        "ratio_a": round(ratio_a, 4),
        "ratio_b": round(ratio_b, 4),
        "asymmetry": round(asymmetry, 4),
        "fires": asymmetry > 0.15,
    }
