#!/usr/bin/env python3
"""Tick all task checkboxes in the held-out-validation plan file.

Per the plan's Completion Protocol, markdown edits must be scripted, not
manual. Ticks every '- [ ] ' line under the task groups (all of them, since
every task in this plan is complete by the time this runs) but leaves the
header 'Status:' line alone — that is updated separately once the file is
also moved to setup/PLANS/Completed/.
"""

from pathlib import Path

PLAN_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "setup" / "PLANS" / "New"
    / "wikipedia-section-classifier-held-out-validation.md"
)


STATUS_OLD = "**Status:** ✅ Plan generated — ready for implementation"
STATUS_NEW = "**Status:** ✅ Completed"


def main() -> None:
    lines = PLAN_PATH.read_text(encoding="utf-8").splitlines(keepends=True)

    updated = 0
    status_updated = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("- [ ] "):
            lines[i] = line.replace("- [ ] ", "- [x] ", 1)
            updated += 1
        elif stripped == STATUS_OLD:
            lines[i] = line.replace(STATUS_OLD, STATUS_NEW)
            status_updated = True

    PLAN_PATH.write_text("".join(lines), encoding="utf-8")
    print(f"Ticked {updated} checkboxes, status_updated={status_updated}, in {PLAN_PATH}")


if __name__ == "__main__":
    main()
