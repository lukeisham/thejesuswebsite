#!/usr/bin/env python3
"""Append issue #226 to setup/ISSUES/issues.md.

Per the issues log's own append convention: script-only, no blank line
between rows, escape literal '|' in cells (none needed here).
"""

from pathlib import Path

ISSUES_PATH = Path(__file__).resolve().parent.parent.parent / "setup" / "ISSUES" / "issues.md"

ROW = (
    "| 226 | Wikipedia algorithm/labels-corpus.json | Discovered while "
    "implementing wikipedia-section-classifier-held-out-validation.md: 4 of "
    "the 270 LLM-labelled articles (Biblical Magi, Mary Magdalene, Names and "
    "titles of Jesus in the New Testament, Pontius Pilate) carry an empty "
    "`labels` array despite `chunks_ok: 1, chunks_error: 0` — the labelling "
    "run recorded a successful chunk with zero paragraph labels produced, "
    "rather than a request failure. `calibrate_held_out.py`'s "
    "`build_held_out_records()` handles this gracefully (`score_article([])` "
    "returns `tier_state=\"unclassifiable\"` via `assign_tier`'s empty-labels "
    "branch, logged as a warning, not a crash) but the resulting gold label "
    "is an artifact of the labelling gap, not a genuine unclassifiable "
    "verdict on the article's content — one of these (Pontius Pilate) landed "
    "in the held-out test split and was scored gold_tier=unclassifiable vs. "
    "the classifier's own clear_split prediction, one of the 33 test-split "
    "misses. Not fixed here: out of scope for a held-out-validation plan; a "
    "future re-run of `scripts/llm_label_corpus.py` for these 4 titles (or "
    "an explicit exclusion in `load_llm_corpus()` for zero-length label "
    "arrays) would close this. | PY-6 | "
    "wikipedia-section-classifier-held-out-validation.md | 2026-08-28 | open |\n"
)


def main() -> None:
    with open(ISSUES_PATH, "r", encoding="utf-8") as fh:
        content = fh.read()

    if "| 226 |" in content:
        print("Row #226 already present; skipping.")
        return

    if not content.endswith("\n"):
        content += "\n"
    content += ROW

    with open(ISSUES_PATH, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"Appended row #226 to {ISSUES_PATH}")


if __name__ == "__main__":
    main()
