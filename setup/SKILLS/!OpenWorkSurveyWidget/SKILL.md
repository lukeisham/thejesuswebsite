---
name: open-work-survey-widget
description: >
  Open the already-generated work-survey widget in a new Chrome tab. Read
  this when Luke asks to "open the work survey", "show me the work widget",
  "open the work survey in Chrome", or similar — a viewing request, not a
  regeneration request. This skill does not mine data, classify decisions,
  or re-render anything; it only opens the existing file. If Luke wants
  fresh data, that is the separate `!WorkSurveyWidget` skill.
type: Skill
status: Active
domain: Engineering
intent: "Get the existing work-survey HTML on screen in Chrome with zero side effects — no mining, no rendering, no writes."
version: 1.0.0
dependencies: [setup/WORK_WIDGET/output/work-survey.html]
calibration:
  context: Engineering
  level: Standard
  scope: Local
---

## ⚡ TRIGGER
Fires when Luke asks to open, view, or show the work-survey widget in
Chrome, without asking for it to be refreshed, regenerated, or updated. If
the request includes any of "regenerate", "refresh", "update", "re-run", or
implies the data should be current, that's `!WorkSurveyWidget` instead — do
not silently regenerate here, and do not silently just-open there.

## 🛠️ LOGIC

STEP 1 — CHECK THE FILE EXISTS.
  The target is `setup/WORK_WIDGET/output/work-survey.html`.
  IF it does not exist:
    Tell Luke it hasn't been generated yet and ask whether to run
    `!WorkSurveyWidget` first. Do not generate it yourself from this skill —
    this skill's whole point is being the simple, side-effect-free one.
    STOP.

STEP 2 — OPEN IT IN A NEW CHROME TAB.
  RUN:
  ```
  open -a "Google Chrome" "setup/WORK_WIDGET/output/work-survey.html"
  ```
  (macOS `open`, resolved from the repo root. This opens a new tab in the
  user's existing Chrome if it's running, or launches Chrome if not — it
  does not replace the current tab.)

STEP 3 — REPORT.
  Tell Luke it's open. If the file's mtime looks old (e.g. Luke mentions
  recent commits that seem missing from the page), mention that this skill
  never refreshes data and point at `!WorkSurveyWidget` for that.

## ✅ OUTPUT
State: no files written, no data mined, no rendering performed — the only
  effect is a new Chrome tab pointed at the existing HTML file.
