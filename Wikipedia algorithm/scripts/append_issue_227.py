#!/usr/bin/env python3
"""Append issue #227 to setup/ISSUES/issues.md.

Discovered while generating wikipedia-python-audit-cleanup.md's Step 1
architecture-doc read. Per the issues log's own append convention:
script-only, no blank line between rows.
"""

from pathlib import Path

ISSUES_PATH = Path(__file__).resolve().parent.parent.parent / "setup" / "ISSUES" / "issues.md"

ROW = (
    "| 227 | setup/ARCHITECTURE/Website_guide.md | Discovered while generating "
    "wikipedia-python-audit-cleanup.md (Step 1 architecture read): the Project "
    "Map tree (~line 43) lists `vector-sidecar/` as a top-level repository "
    "directory (\"# Python FastAPI sidecar for FAISS vector queries\"), but no "
    "top-level `vector-sidecar/` exists on disk — it is actually "
    "`Wikipedia algorithm/vector-sidecar/`, correctly named as the PY-1 "
    "exception everywhere else (Vibe_coding_rules.md, "
    "wikipedia-ranking-pipeline.md's own `git ls-files`-verified `Spans:` "
    "line). Not fixed here: this plan's scope is Python code cleanup under "
    "`Wikipedia algorithm/`, not `setup/ARCHITECTURE/` doc maintenance, and "
    "`setup/ARCHITECTURE/` docs are gitignored/local-only so this staleness "
    "has no live-site or repo consequence beyond misleading a future reader "
    "of the project map. Suggested fix: correct the tree line to read "
    "`Wikipedia algorithm/vector-sidecar/` (or drop the misleadingly-flat "
    "path segment) in a future architecture-doc pass. | doc | "
    "wikipedia-python-audit-cleanup.md | 2026-08-28 | open |\n"
)


def main() -> None:
    with open(ISSUES_PATH, "r", encoding="utf-8") as fh:
        content = fh.read()

    if "| 227 |" in content:
        print("Row #227 already present; skipping.")
        return

    if not content.endswith("\n"):
        content += "\n"
    content += ROW

    with open(ISSUES_PATH, "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"Appended row #227 to {ISSUES_PATH}")


if __name__ == "__main__":
    main()
