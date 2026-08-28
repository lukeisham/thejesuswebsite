---
name: work-survey-widget
description: >
  Regenerate the work-survey widget — a self-contained HTML page summarising
  this repo's commit/plan/issue history: a cadence-by-module grid, an
  architectural-decisions lineage diagram, a plain-English glossary of those
  decisions, load-bearing-file rankings, and friction-seam notes. Read this
  when Luke asks to "regenerate the work survey", "update the work widget",
  "refresh the decisions lineage", or references
  `setup/WORK_WIDGET/output/work-survey.html`. The cache of classified
  decisions is append-only: existing entries are never re-derived on a later
  run, only new commits/plans since `last_scanned` get classified and
  appended.
type: Skill
status: Active
domain: Engineering
intent: "Keep the work-survey widget's decisions cache and rendered HTML in sync with the repo's actual history, without re-doing already-classified work."
version: 1.0.0
dependencies: [scripts/mine.py, scripts/render.py, scripts/palette.py, scripts/decisions.py, template.html, data/decisions-cache.json, CONTRACT.md]
calibration:
  context: Engineering
  level: Standard
  scope: Local
---

## ⚡ TRIGGER
Fires when Luke asks to regenerate, refresh, or update the work-survey
widget, its cadence grid, its decisions lineage, or references
`setup/WORK_WIDGET/` by name. This is a **local-only** tool — see
"setup/WORK_WIDGET is untracked" below before assuming any output here ever
reaches GitHub or the VPS.

Full interface contract (palette, schema, hard rules) lives in
`setup/WORK_WIDGET/CONTRACT.md` — read it first if anything below seems to
disagree with the code, since the contract is authoritative and this file is
only the run procedure.

Note on location: this SKILL.md lives under `setup/SKILLS/` (one of the few
`setup/` paths that IS git-tracked, alongside `!GenerateAPlan` and
`!TheJesusWebsite-Wikipedia`), so these instructions travel with the repo.
Everything it operates on — scripts, mined data, the decisions cache, the
rendered output — lives under `setup/WORK_WIDGET/`, which stays untracked and
local-only per Luke's explicit choice. Losing this file costs nothing (it's
recoverable from GitHub); losing `setup/WORK_WIDGET/data/decisions-cache.json`
costs real re-classification work, so the warning below about never deleting
under `setup/` applies most to that file.

## 🛠️ LOGIC

STEP 1 — MINE.
  RUN `python3 setup/WORK_WIDGET/scripts/mine.py`
  Re-scans the full git history, `setup/PLANS/`, and `setup/ISSUES/` from
  scratch and writes `setup/WORK_WIDGET/data/extracted.json` matching
  CONTRACT.md's schema. This step is cheap to fully re-run every time — it
  is a pure read of already-existing repo history, not the part that needs
  incremental caching.

STEP 2 — CLASSIFY NEW DECISIONS ONLY (never re-classify existing entries).
  Open `setup/WORK_WIDGET/data/decisions-cache.json` and read its
  `last_scanned` field (`{"commit": "<sha>", "date": "<iso>"}`).
  RUN `git log --format='%H|%ad|%s' --date=short <last_scanned.commit>..HEAD`
  to find commits added since the last scan, and check `setup/PLANS/Completed/`
  for plans newer than that pass (plans have no reliable git date — see
  CONTRACT.md's "Known data problems" §1 — so use plan content/keywords, not
  mtime, to judge whether a plan was already considered).
  For each new commit/plan, look for decision language — "chose", "instead
  of", "rather than", "replaced", "superseded", "abandoned", "migrate",
  "consolidate", "drop", "extract", "adopt" — and for each genuine
  architectural decision found:
    - Confirm it against the real source (`git show <sha>`, or the plan
      file) before writing anything — never fabricate evidence.
    - Append one entry to the `decisions` array in
      `setup/WORK_WIDGET/data/decisions-cache.json`, matching the schema in
      CONTRACT.md exactly: `id`, `date`, `lane` (one of `visual | admin |
      backend | platform`), `title`, `status` (`current | superseded |
      rejected`), `supersedes` (an existing `id` or `null`), `evidence`
      (`sha` and/or `plan`), and the three plain-English glossary fields
      `what`, `why`, `term` — written for a reader who does not know this
      codebase, no unexplained acronyms.
    - If a new decision supersedes something already in the cache, set
      `supersedes` to that existing entry's `id` and flip that existing
      entry's `status` to `superseded` if it was still `current`. Never
      edit an existing entry's `what`/`why`/`term`/`evidence` — the cache
      is append-only; only `status` may change on an existing row, and only
      because something newer superseded it.
  **Never re-derive or rewrite entries already in the cache.** That
  incremental behaviour is the entire point of the cache — a full
  re-classification pass defeats it and risks silently changing evidence
  that was already verified.
  Update `last_scanned` to the current `HEAD` sha and today's date once
  done, even if no new decisions were found this run.

STEP 3 — RENDER.
  RUN `python3 setup/WORK_WIDGET/scripts/render.py`
  Reads `data/extracted.json` (Step 1) and calls `scripts/decisions.py`'s
  `load()` / `render_lineage()` / `render_glossary()` against the
  cache (Step 2), and writes the finished page to
  `setup/WORK_WIDGET/output/work-survey.html` — a single self-contained
  file (inline CSS/JS, no CDN, no external requests) that opens directly
  from `file://`.

STEP 4 — REPORT.
  Tell Luke:
    - Where the rendered file landed (`setup/WORK_WIDGET/output/work-survey.html`).
    - How many new decisions were classified and appended this run (or "none
      — cache already current as of `<last_scanned.date>`").
    - Any commit/plan that looked like it might be a decision but couldn't
      be evidenced confidently — report it rather than guessing.
  This skill does not open the result in a browser — that's the separate
  `!OpenWorkSurveyWidget` skill, kept apart so a plain "show me the widget"
  never triggers a re-mine.

## ⚠️ setup/WORK_WIDGET is untracked — never delete anything under setup/
`setup/WORK_WIDGET/` is deliberately excluded from `.gitignore`'s tracked
exceptions (see CONTRACT.md and `CLAUDE.local.md`) — it exists **only on
this machine**. Do not add it to git, do not modify `.gitignore` to include
it, and do not run destructive git commands against it or anything else
under `setup/`. `setup/` has already been accidentally deleted once and
rebuilt from session transcripts — treat every file under it as
irreplaceable. `data/extracted.json` and `output/work-survey.html` are the
two generated (not hand-authored) files in this tool; everything else,
especially `data/decisions-cache.json`, is real accumulated research and
must never be bulk-overwritten or regenerated from scratch.

## ✅ OUTPUT
State: `setup/WORK_WIDGET/output/work-survey.html` reflects the current
  repo history; `data/decisions-cache.json`'s `last_scanned` matches `HEAD`;
  every decision in the cache — old and newly appended — still has real
  `evidence` (a sha that exists in `git log`, and/or a plan filename that
  exists under `setup/PLANS/Completed/`).
Log (if noteworthy): append a line to `setup/ISSUES/issues.md`-style notes
  only if something was found that needs a human decision (e.g. a plausible
  decision with no confident evidence) — routine no-op runs need no log.

**Validation check (self-test)**
```
RUN python3 setup/WORK_WIDGET/scripts/decisions.py
VERIFY it loads the cache without error and prints a decision count ELSE
  stop and report the exact error to Luke — do not hand-patch the cache to
  make validation pass.
```
