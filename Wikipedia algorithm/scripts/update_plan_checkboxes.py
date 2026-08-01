#!/usr/bin/env python3
"""Update plan checkboxes from '- [ ]' to '- [x]' for completed tasks.

Per the plan's Completion Protocol, markdown edits must be scripted.
Only checks tasks in the "conversion and wiring", "tests", "documentation",
and "close out" groups — the corpus-coverage, regenerate/rescore, and
deploy/verify groups are NOT checked (they need user intervention or
depend on earlier incomplete tasks).
"""

from pathlib import Path

PLAN_PATH = Path(__file__).resolve().parent.parent.parent / "setup" / "PLANS" / "New" / "wikipedia-signal-3-llm-label-activation.md"

# Task headings whose checkboxes should be ticked.
COMPLETED_SECTIONS = [
    "### Classifier — conversion and wiring",
    "### Classifier — tests",
    "### Documentation",
    "### Close out",
]


def main() -> None:
    lines = PLAN_PATH.read_text(encoding="utf-8").splitlines(keepends=True)

    in_completed_section = False
    updated = 0

    for i, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("### ") and stripped != "### Classifier — corpus coverage":
            in_completed_section = stripped in COMPLETED_SECTIONS

        if in_completed_section and stripped.startswith("- [ ] "):
            lines[i] = line.replace("- [ ] ", "- [x] ", 1)
            updated += 1

        # Reset when we hit a non-subsection, non-task line
        # (a new ## or ### that isn't in our completed list).
        if stripped.startswith("### ") and stripped not in COMPLETED_SECTIONS:
            in_completed_section = False

    PLAN_PATH.write_text("".join(lines), encoding="utf-8")
    print(f"Updated {updated} checkboxes in {PLAN_PATH}")


if __name__ == "__main__":
    main()
