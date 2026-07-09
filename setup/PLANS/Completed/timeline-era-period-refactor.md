# Plan: Timeline Era & Period Refactor

**Module(s):** Database / API / Frontend / Admin / MCP Server
**Date:** 2026-07-09
**Status:** ✅ Completed

## Goal
Replace the three overly-broad timeline eras (`beginning`, `middle`, `end`) with eight granular, semantically meaningful eras (`PreIncarnation`, `OldTestament`, `EarlyLife`, `Life`, `GalileeMinistry`, `JudeanMinistry`, `PassionWeek`, `Post-Passion`) that map directly onto the existing 38 timeline periods. Every existing period nests under exactly one of the new eras.

## Coding rules to keep in mind
- **SR-1** — One file per function. Each file touched in this refactor gets its own focused change.
- **JS-1** — Self-documenting names. New era enum values are already descriptive; use them directly.
- **JS-2** — Robust & predictable. Fall back to `PreIncarnation` as the default era/period when unset or unknown.
- **CSS-4** — Semantic class names. Any new filter-chip `data-era` attributes must match the era enum values exactly.

## Tasks

### Database

- [x] **Add migration 008 to update `timeline_era` CHECK constraint** — Create `database/migrations/008_timeline_era_refactor.sql` that recreates the `evidence` table with the new era CHECK constraint (`PreIncarnation | OldTestament | EarlyLife | Life | GalileeMinistry | JudeanMinistry | PassionWeek | Post-Passion`) and maps existing rows from old era values to new ones using a data-preserving CASE statement. File: `database/migrations/008_timeline_era_refactor.sql`
- [x] **Update `schema.sql` CHECK constraint** — Change the `timeline_era` CHECK constraint in the canonical schema from `('beginning', 'middle', 'end')` to the new eight values. File: `database/schema.sql`

### API

- [x] **Update `api/models/timeline.model.js`** — Replace the `ERA_ORDER` array (`['beginning', 'middle', 'end']`) with the eight new era values in narrative order. Update the sorting logic comment to reflect the 1:1 era→period mapping. File: `api/models/timeline.model.js`
- [x] **Update `api/tests/content-create.test.js`** — Replace the era loop `['beginning', 'middle', 'end']` with all eight new era values. Replace the invalid-era assertion value from `'ministry-Galilee'` to a known-invalid era. Update the sample period tests if any period-to-era test assertions reference the old era names. File: `api/tests/content-create.test.js`

### Frontend — Timeline data & rendering

- [x] **Update `frontend/assets/js/timeline/timeline-data.js`** — Replace `ERA_LABELS` with display labels for the eight new eras. Replace `ERA_BOUNDARIES` with index ranges mapping each new era to its period span in `TIMELINE_PERIODS`. Update `getEraForPeriod()` and `filterEventsByEra()` to use the new boundary keys. File: `frontend/assets/js/timeline/timeline-data.js`
- [x] **Update `frontend/assets/js/timeline/timeline-render.js`** — Replace the hardcoded `['beginning', 'middle', 'end']` era loop in `renderTimeline()` with a loop over `Object.keys(ERA_BOUNDARIES)` (or a new exported `ERA_ORDER` from timeline-data.js) so era markers and labels are driven from data rather than hardcoded. File: `frontend/assets/js/timeline/timeline-render.js`

### Frontend — Timelines pages

- [x] **Update `frontend/evidence/timeline/index.html`** — Replace the three era filter chips (`beginning`, `middle`, `end`) with eight filter chips using the new era values and human-readable labels. File: `frontend/evidence/timeline/index.html`
- [x] **Update `frontend/evidence/timeline/beginning.html`** — Rename to `pre-incarnation.html` (or a suitable era slug). Update `<body data-initial-era>` from `beginning` to the correct new era value. Update `<title>`, `<h1>`, `<h2>`, and era filter chips to reflect the new era. File: `frontend/evidence/timeline/beginning.html` (rename + edit)
- [x] **Update `frontend/evidence/timeline/middle.html`** — Rename to an era page for one of the middle eras (e.g. `galilee-ministry.html`). Update `<body data-initial-era>`, `<title>`, headings, and filter chips. File: `frontend/evidence/timeline/middle.html` (rename + edit)
- [x] **Update `frontend/evidence/timeline/ending.html`** — Rename to `passion-week.html`. Update `<body data-initial-era>`, `<title>`, headings, and filter chips. File: `frontend/evidence/timeline/ending.html` (rename + edit)
- [x] **Create era-specific pages for the remaining five eras** — Copy the renamed template pages to create era-focused pages for `OldTestament`, `EarlyLife`, `Life`, `JudeanMinistry`, `Post-Passion`. Each sets `data-initial-era` to its era, has era-specific `<title>`/`<h2>`, and shows the full set of eight filter chips. Create matching zoom variant pages in subdirectories (`old-testament/`, `early-life/`, etc.) with `data-initial-zoom`. File: `frontend/evidence/timeline/*.html` (created)

### Frontend — Evidence list & detail

- [x] **Update `frontend/evidence/index.html`** — Replace the old-era filter chips (`data-value="birth"`, `data-value="ministry-Galilee"`, etc.) with chips using the new eight era values. The `data-filter` remains `"timeline_era"` throughout. File: `frontend/evidence/index.html`
- [x] **(No change needed)** `frontend/assets/js/evidence-list.js` — The filter parsing and badge rendering logic passes `timeline_era` through to the API unchanged. No structural change required; verify token. File: `frontend/assets/js/evidence-list.js`
- [x] **(No change needed)** `frontend/assets/js/evidence-detail.js` — Displays `item.timeline_era` as raw text in the badge row and Timeline Context section. No structural change; verify token. File: `frontend/assets/js/evidence-detail.js`

### Admin — Timeline taxonomy & editor

- [x] **Update `admin/assets/js/admin-timeline-taxonomy.js`** — Replace the `ERAS` array (three entries) with eight new era entries (`{ value, label }`). Replace `PERIODS_BY_ERA` to reflect the new era-to-period nesting. Update `getEraForPeriod()` to return the correct new era key for each period. File: `admin/assets/js/admin-timeline-taxonomy.js`
- [x] **Update `admin/assets/js/admin-timeline/timeline-axis.js`** — Replace `ERA_ORDER` with the eight new era values. Update `ERA_LABELS` with display labels for the new eras. Update the `eraStarts` map in `eraStartX()` to map each new era to its first-period boundary. File: `admin/assets/js/admin-timeline/timeline-axis.js`
- [x] **Update `admin/assets/js/admin-timeline/timeline-events.js`** — Update `eraForPeriod()` to use the new era boundaries (replace the three hardcoded ordinal ranges with eight ranges matching the new era-to-period mapping). Update the default era fallback from `"beginning"` to `"PreIncarnation"`. File: `admin/assets/js/admin-timeline/timeline-events.js`
- [x] **(No change needed)** `admin/assets/js/update-record.js` — Passes `timeline_era` through to the API as-is. No structural change; verify token. File: `admin/assets/js/update-record.js`

### Admin — Evidence edit/new forms

- [x] **Update `admin/evidence/new.html`** — Replace the `<select>` for `timeline_era` options to list the eight new eras instead of the old three. Update the `populatePeriods()` JS call (if era-dependent) to use the new admin taxonomy. File: `admin/evidence/new.html`
- [x] **Update `admin/evidence/edit-[id].html`** — Replace the era `<select>` options with the eight new eras. Update `populatePeriods()` to respect the new era→period groupings from `Admin.timelineTaxonomy`. File: `admin/evidence/edit-[id].html`
- [x] **(No change needed)** `admin/evidence/index.html` — Displays `timeline_era` in the table and uses it as a filter key. No structural change; verify token. File: `admin/evidence/index.html`
- [x] **(No change needed)** `admin/evidence/bulk.html` — Displays `timeline_era` as text. No structural change; verify token. File: `admin/evidence/bulk.html`
- [x] **(No change needed)** `admin/diagrams/timeline.html` — The admin timeline editor page is a thin shell; era rendering is driven by `admin-timeline-taxonomy.js` and `timeline-axis.js`. No structural change; verify token. File: `admin/diagrams/timeline.html`

### Admin — Tests

- [x] **Update `admin/tests/admin-timeline.test.js`** — Update `eraOrdinal` tests to test all eight new era values (replace the three hardcoded assertions). Update `eraStartX` tests to use new era keys and their correct first-period boundaries. File: `admin/tests/admin-timeline.test.js`

### MCP Server

- [x] **Update `mcp-server/tools/getTimelineEvents.js`** — If the tool validates or documents the `era` parameter against known values, update to accept the eight new era keys. File: `mcp-server/tools/getTimelineEvents.js`
- [x] **Update `mcp-server/tests/tools.test.js`** — Update the `getTimelineEvents` era-param test: change the test-era value from `"beginning"` to one of the new era keys (e.g. `"PreIncarnation"`). File: `mcp-server/tests/tools.test.js`

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "refactor: timeline eras from 3 broad to 8 granular"`, `git push`.
- [x] **Test live** — **only if the implementing agent is Claude.** Open the deployed site in a browser tab and confirm: (a) the timeline page renders all eight era bands and filter chips, (b) filtering by each era shows only the correct events, (c) the admin evidence form's era dropdown shows all eight eras and correctly cascades period options, (d) creating/editing evidence with a new era value persists correctly. URL: `https://thejesuswebsite.org/evidence/timeline/`. If the implementing agent is any other LLM (e.g. DeepSeek), skip this task and leave a note that live testing was deferred.

## Files touched
- `database/migrations/008_timeline_era_refactor.sql` — created
- `database/schema.sql` — modified
- `api/models/timeline.model.js` — modified
- `api/tests/content-create.test.js` — modified
- `frontend/assets/js/timeline/timeline-data.js` — modified
- `frontend/assets/js/timeline/timeline-render.js` — modified
- `frontend/evidence/timeline/index.html` — modified
- `frontend/evidence/timeline/pre-incarnation.html` — modified (renamed from beginning.html)
- `frontend/evidence/timeline/pre-incarnation/zoom-pre-incarnation.html` — modified (renamed)
- `frontend/evidence/timeline/galilee-ministry.html` — modified (renamed from middle.html)
- `frontend/evidence/timeline/galilee-ministry/zoom-galilee-ministry.html` — modified (renamed)
- `frontend/evidence/timeline/passion-week.html` — modified (renamed from ending.html)
- `frontend/evidence/timeline/passion-week/zoom-passion-week.html` — modified (renamed)
- `frontend/evidence/timeline/old-testament.html` — created
- `frontend/evidence/timeline/old-testament/zoom-old-testament.html` — created
- `frontend/evidence/timeline/early-life.html` — created
- `frontend/evidence/timeline/early-life/zoom-early-life.html` — created
- `frontend/evidence/timeline/life.html` — created
- `frontend/evidence/timeline/life/zoom-life.html` — created
- `frontend/evidence/timeline/judean-ministry.html` — created
- `frontend/evidence/timeline/judean-ministry/zoom-judean-ministry.html` — created
- `frontend/evidence/timeline/post-passion.html` — created
- `frontend/evidence/timeline/post-passion/zoom-post-passion.html` — created
- `frontend/evidence/index.html` — modified
- `admin/assets/js/admin-timeline-taxonomy.js` — modified
- `admin/assets/js/admin-timeline/timeline-axis.js` — modified
- `admin/assets/js/admin-timeline/timeline-events.js` — modified
- `admin/evidence/new.html` — modified
- `admin/evidence/edit-[id].html` — modified
- `admin/tests/admin-timeline.test.js` — modified
- `mcp-server/tools/getTimelineEvents.js` — modified
- `mcp-server/tests/tools.test.js` — modified

## Notes

### Era → Period mapping (source of truth)

```
PreIncarnation   → PreIncarnation
OldTestament     → OldTestament
EarlyLife        → EarlyLifeUnborn, EarlyLifeBirth, EarlyLifeInfancy, EarlyLifeChildhood
Life             → LifeTradie, LifeBaptism, LifeTemptation
GalileeMinistry  → GalileeCallingTwelve, GalileeSermonMount, GalileeMiraclesSea, GalileeTransfiguration
JudeanMinistry   → JudeanOutsideJudea, JudeanMissionSeventy, JudeanTeachingTemple, JudeanRaisingLazarus, JudeanFinalJourney
PassionWeek      → PassionPalmSunday through PassionSundayResurrection (all 16 Passion* periods)
Post-Passion     → PostResurrectionAppearances, Ascension, OurResponse, ReturnOfJesus
```

### Migration data-preservation strategy

Existing evidence rows carry old `timeline_era` values (`beginning`, `middle`, `end`). The migration MUST use a CASE statement to remap:

- `beginning` → `PreIncarnation` (covers old indices 0–5: PreIncarnation through EarlyLifeChildhood). If a row has a `timeline_period` that maps to `OldTestament` or `EarlyLife` or `Life`, the migration should derive the era from the period instead (prefer period over old-era to avoid loss).
- `middle` → best-effort: derive era from `timeline_period`; if period is NULL, fall back to `GalileeMinistry`. The periods in the old "middle" era span `LifeTradie` through `JudeanFinalJourney` — these now split across `Life` (Tradie/Baptism/Temptation) and `GalileeMinistry` (CallingTwelve through Transfiguration) and `JudeanMinistry` (OutsideJudea through FinalJourney).
- `end` → best-effort: derive era from `timeline_period`; if period is NULL, fall back to `PassionWeek`.

**Recommended approach**: always derive `timeline_era` from `timeline_period` in the migration when a period is set, since the period→era mapping is deterministic. Only fall back to the old-era CASE when period is NULL.

### Ordering dependencies

1. Database migration MUST run first — the CHECK constraint is the ultimate source of truth.
2. The schema.sql update is the canonical companion to the migration.
3. All JS files that reference era keys MUST be updated before deploying, or the timeline/evidence editors will break on the mismatched CHECK constraint.
4. Era-specific timeline pages should be created last (they're templated from index.html and just change a few attributes).

### Era-specific timeline pages

The current codebase has three era-focused pages (`beginning.html`, `middle.html`, `ending.html`) plus three zoom variants. This plan renames those to match new era slugs and creates five additional era pages (plus five zoom variants) for the remaining eras. Each page differs only in:
- `<body data-initial-era="...">`
- `<title>` and `<h2>` text
- Era filter chip active state

Because the JS is shared (loaded as ES modules), the page boilerplate is identical. The implementing agent should copy the renamed `pre-incarnation.html` as a template for the five new pages, swapping only the era-specific values.

### No new sitemap entries needed

The `frontend/sitemap.xml` currently lists only `/evidence/timeline/` (the main index) — not the era-specific subpages. This plan does not add new sitemap entries since the era-specific pages are navigated to via filter chips, not indexed separately.

### Evidence list filter chips

The `frontend/evidence/index.html` filter bar currently has hardcoded filter chips with old-era values like `birth`, `ministry-Galilee`, `ministry-Jerusalem`, `passion`, `resurrection`. These are NOT valid `timeline_era` values — they're leftover from an even older taxonomy (migration 004's free-form era). They need to be replaced with the eight new era values and matching human-readable labels.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: If this plan's Goal is to fix row(s) already logged in `setup/Issues.md` by an earlier plan, include a task that updates only the `Status` cell for those specific row(s) from `open` to `resolved` (via script) once the fix is verified working — leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
