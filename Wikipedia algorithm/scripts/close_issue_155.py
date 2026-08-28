#!/usr/bin/env python3
"""Update Issues_111_to_200.md row #155 Status from 'open' to 'resolved'.

Per the wikipedia-section-classifier-held-out-validation.md plan's
Completion Protocol, markdown edits must be scripted, not manual —
hand-edited markdown is a known source of corruption in this codebase.
"""

from pathlib import Path

ISSUES_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "setup" / "ISSUES" / "Issues_111_to_200.md"
)
TARGET_ROW = "155"


def main() -> None:
    with open(ISSUES_PATH, "r", encoding="utf-8") as fh:
        lines = fh.readlines()

    updated = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith("| "):
            continue
        parts = stripped.split("|")
        if len(parts) < 8:
            continue
        row_num = parts[1].strip()
        if row_num != TARGET_ROW:
            continue

        if "| open |" not in line:
            print(f"  Row #{row_num}: Status is not 'open'; skipping.")
            continue

        lines[i] = line.replace("| open |", "| resolved |")
        print(f"  Row #{row_num}: Status -> resolved")
        updated += 1

    if updated != 1:
        print(f"WARNING: updated {updated} row(s), expected 1.")

    with open(ISSUES_PATH, "w", encoding="utf-8") as fh:
        fh.writelines(lines)
    print(f"Written {ISSUES_PATH}")


if __name__ == "__main__":
    main()
