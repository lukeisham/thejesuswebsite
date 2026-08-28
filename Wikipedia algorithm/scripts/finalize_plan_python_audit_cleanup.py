#!/usr/bin/env python3
"""Flip wikipedia-python-audit-cleanup.md's Status from Drafting to
'ready for implementation', per generate-plan's Step 7. Scripted, not
hand-edited, matching the project's markdown-edit convention.
"""

from pathlib import Path

PLAN_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "setup" / "PLANS" / "New" / "wikipedia-python-audit-cleanup.md"
)

OLD = "**Status:** Drafting"
NEW = "**Status:** ✅ Plan generated — ready for implementation"


def main() -> None:
    content = PLAN_PATH.read_text(encoding="utf-8")
    if OLD not in content:
        print(f"'{OLD}' not found — already finalized or file changed.")
        return
    content = content.replace(OLD, NEW, 1)
    PLAN_PATH.write_text(content, encoding="utf-8")
    print(f"Updated Status in {PLAN_PATH}")


if __name__ == "__main__":
    main()
