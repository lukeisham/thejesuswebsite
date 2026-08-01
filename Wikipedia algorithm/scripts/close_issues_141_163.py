#!/usr/bin/env python3
"""Update Issues.md rows #141 and #163 Status from 'open' to 'resolved'.

Per the plan's Completion Protocol, markdown edits must be scripted,
not manual — hand-edited markdown is a known source of corruption
in this codebase (setup/Issues.md documents several instances).
"""

from pathlib import Path

ISSUES_PATH = Path(__file__).resolve().parent.parent.parent / "setup" / "Issues.md"
TARGET_ROWS = {"141", "163"}


def main() -> None:
    text = ISSUES_PATH.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    updated = 0
    for i, line in enumerate(lines):
        # Each row starts with "| <number> |".
        # Parse out the row number and check if it's one we're targeting.
        stripped = line.strip()
        if not stripped.startswith("| "):
            continue
        parts = stripped.split("|")
        if len(parts) < 8:
            continue
        row_num = parts[1].strip()
        if row_num not in TARGET_ROWS:
            continue

        # The last content column (index -2 before the trailing |) is Status.
        # Replace 'open' with 'resolved' in that exact position.
        if "| open |" not in line:
            print(f"  Row #{row_num}: Status is not 'open'; skipping.")
            continue

        lines[i] = line.replace("| open |", "| resolved |")
        print(f"  Row #{row_num}: Status → resolved")
        updated += 1

    if updated != len(TARGET_ROWS):
        print(
            f"WARNING: updated {updated} row(s), expected {len(TARGET_ROWS)}. "
            f"Some target rows may not exist in {ISSUES_PATH}."
        )

    ISSUES_PATH.write_text("".join(lines), encoding="utf-8")
    print(f"Written {ISSUES_PATH}")


if __name__ == "__main__":
    main()
