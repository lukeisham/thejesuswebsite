"""Shared text utilities for the vector signal families.

Two small helpers that were previously reimplemented inline in several
family modules:

- ``split_paragraphs()`` — the base paragraph-split rule (split on one or
  more blank lines, strip, drop empties) used by anti-supernatural,
  OT-NT-discontinuity, secular-materialist, and export.
- ``find_names()`` — substring membership scan over a name tuple, returning
  the matched names (not just a count), used by jesus-seminar,
  mythicist-framing, and confessional-balance.
"""

import re


def split_paragraphs(text: str) -> list[str]:
    """Split text into non-empty paragraphs on one or more blank lines.

    Each call site that previously inlined this rule layered its own
    extra logic on top (heading exclusion, label zipping) — those layers
    stay local to their modules and call this for the base split only.
    """
    return [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]


def find_names(text_lower: str, names: tuple[str, ...]) -> list[str]:
    """Return the names from ``names`` that appear in ``text_lower``.

    Callers are expected to pass already-lowercased text (the name tuples
    in ``families/config.py`` are all lowercase). Matching is plain
    substring membership — no word boundaries — which is the exact
    behaviour the three former inline scans shared.
    """
    return [name for name in names if name in text_lower]
