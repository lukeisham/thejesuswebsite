"""Shared helper for idempotently updating a top-level ('## ') section of a
generated markdown report without disturbing sections owned by other
generators.

Several scripts write into the same target files (CLASSIFIER_DIAGNOSIS.md is
touched by scripts/diagnose_separation.py, scripts/diagnose_register_gate.py,
and calibrate.py's update_diagnosis_bakeoff()). Each generator must replace
only the section(s) it owns and leave everything else byte-for-byte
untouched, including on repeated reruns (no duplication, no data loss).

A "section" here is a top-level markdown header line (`^## ...$`) plus
everything up to (not including) the next top-level header or EOF. The
preamble (everything before the first `## ` header) is handled separately
via `upsert_preamble()`.
"""

import re

_TOP_HEADER_RE = re.compile(r"^## .*$", re.MULTILINE)


def _find_section_span(text: str, header: str) -> tuple[int, int] | None:
    """Return the (start, end) char offsets of the section whose header
    line exactly equals `header` (e.g. '## A.3 — Register-store gate
    audit'), spanning from the header line to the next top-level '## '
    header or EOF. Returns None if the header is not present.
    """
    pattern = re.compile(r"^" + re.escape(header) + r"[ \t]*$", re.MULTILINE)
    m = pattern.search(text)
    if not m:
        return None
    start = m.start()
    next_m = _TOP_HEADER_RE.search(text, m.end())
    end = next_m.start() if next_m else len(text)
    return start, end


def section_exists(text: str, header: str) -> bool:
    return _find_section_span(text, header) is not None


def upsert_section(text: str, header: str, body: str, insert_after: str | None = None) -> str:
    """Replace the section owned by `header` with `body` (which must start
    with the header line itself and end with a trailing newline).

    If the section is not present in `text`, it is inserted immediately
    after the section named by `insert_after` (if that section exists),
    otherwise appended at EOF.
    """
    span = _find_section_span(text, header)
    if span is not None:
        start, end = span
        return text[:start] + body + text[end:]

    if insert_after is not None:
        prev_span = _find_section_span(text, insert_after)
        if prev_span is not None:
            _, prev_end = prev_span
            return text[:prev_end] + body + text[prev_end:]

    # Fall back to appending at EOF.
    if text and not text.endswith("\n"):
        text += "\n"
    if text and not text.endswith("\n\n"):
        text += "\n"
    return text + body


def upsert_preamble(text: str, preamble: str) -> str:
    """Replace everything before the first top-level '## ' header with
    `preamble`. If there is no top-level header yet, the whole document
    is replaced by `preamble`.
    """
    m = _TOP_HEADER_RE.search(text)
    if m is None:
        return preamble
    return preamble + text[m.start():]
