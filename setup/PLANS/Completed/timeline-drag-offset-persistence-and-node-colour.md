# Plan: Fix Timeline Drag-Offset Persistence, Live Drag Movement & Admin Node Colouring

**Module(s):** Admin / Frontend (CSS)
**Date:** 2026-07-17
**Status:** ✅ Completed

## Goal
Fix three admin-timeline bugs: (1) dragging a node visually does **not** track the pointer —
`updateDotPosition` drifts horizontally (re-reads the mutated `style.left` and re-subtracts
`pxPerPeriod/2` every frame) and jumps vertically (uses a different `top` coordinate system
than render); (2) dragging a node and clicking **Save Changes** silently fails to persist the
new position because `UpdateRecord.saveEvent()` drops `timeline_offset_x` /
`timeline_offset_y` from the PUT payload; and (3) the admin timeline dot colouring for the
`places` category violates the style guide — it renders a solid black dot instead of the
white-fill / black-ring "roundel" that `people` and `places` share.

## Coding rules to keep in mind
- **SR-1** — One file, one function. The offset fix is a single targeted change to
  `UpdateRecord.saveEvent`; don't fold unrelated edits into it.
- **JS-5** — Async/await by default. `saveEvent` is already async/try-catch; preserve that
  shape when adding the two fields.
- **CSS-2** — Custom properties only. The colour fix must use `var(--color-white)` /
  `var(--color-black)`, never literal hex.
- **CSS-5** — Low specificity / cascade order. Category overrides (`dot-cat--*`) must remain
  after the era rules so they win, matching the frontend stylesheet.

## Tasks

### Admin JS — live drag movement

- [x] **Make the dragged dot visually track the pointer** — rewrite `updateDotPosition` (and
  its label handling) in `admin/assets/js/admin-timeline/timeline-node-drag.js` so it computes
  an **absolute** position from a base captured once at `pointerdown`, not from the live
  (already-mutated) `style.left`. Capture the dot's slot-base position in `dragState` at
  pointerdown (e.g. `baseLeftPx = finalX − offsetXToPixel(startOffsetX, pxPerPeriod)`), then on
  each move set `left = baseLeftPx + offsetXToPixel(newOffsetX, pxPerPeriod)` and set `top`
  using the **same** formula `renderEvents` uses (`280 * (50 + (offsetY * 280) / 2) / 100`),
  so the dot follows the cursor without horizontal drift or a vertical jump on drag start.
  Move the label by the same absolute delta. File: `admin/assets/js/admin-timeline/timeline-node-drag.js`

### Admin JS — offset persistence

- [x] **Forward timeline offset fields in `saveEvent`** — extend the payload builder in
  `UpdateRecord.saveEvent` to copy `timeline_offset_x` and `timeline_offset_y` when present
  (mirroring the existing `undefined` guards for `title` / `timeline_era` / `timeline_period`,
  and allowing explicit `null` to clear). Update the JSDoc `@param` to list the two new fields.
  File: `admin/assets/js/update-record.js`

### Admin CSS — node colouring

- [x] **Fix `places` / `people` roundel colouring** — change the admin dot category overrides
  so `dot-cat--place` and `dot-cat--person` both use `background: var(--color-white)` with
  `border-color: var(--color-black)` (matching the style guide §8 and the frontend
  `timeline-dots.css`), instead of the current black-fill place / `bg-surface` person. Leave
  `dot-cat--object` (`var(--text-muted)`) unchanged.
  File: `admin/assets/css/admin-diagrams/timeline-dots.css`

### Tests

- [x] **Add a saveEvent offset-forwarding test** — add a test asserting that
  `UpdateRecord.saveEvent(id, { timeline_offset_x, timeline_offset_y })` includes both fields
  in the PUT payload (and that explicit `null` is forwarded, not dropped). Prefer extending the
  existing staged-changes coverage. File: `admin/tests/admin-timeline-staged.test.js`
- [x] **Add a drag-movement test** — assert that a right-click-drag sequence
  (`pointerdown` button 2 → `pointermove` → `pointerup`) on a dot in SPREAD density moves the
  dot's `style.left`/`style.top` monotonically toward the pointer (no leftward drift across
  successive moves, no vertical jump on the first move) and stages the resulting offset. Use the
  existing jsdom-style harness. File: `admin/tests/admin-timeline-node-bounds.test.js` (or a new
  `admin/tests/admin-timeline-node-drag.test.js` if cleaner).

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push. `git add -p`,
  `git commit -m "Fix timeline drag-offset persistence and admin node colour"`, `git push`.
- [x] **Smoke test** — after deploy, run `node --test admin/tests/admin-timeline-staged.test.js` and `node --test admin/tests/admin-timeline-node-bounds.test.js` from the project root to confirm the saveEvent offset forwarding and drag math work end-to-end. No browser-based live testing is required for this plan.

## Files touched
- `admin/assets/js/admin-timeline/timeline-node-drag.js` — modified
- `admin/assets/js/update-record.js` — modified
- `admin/assets/css/admin-diagrams/timeline-dots.css` — modified
- `admin/tests/admin-timeline-staged.test.js` — modified
- `admin/tests/admin-timeline-node-bounds.test.js` — modified (or a new drag test file)

## Error notification

**a) Does this plan impact existing error handling?**

No. The offset save path already routes through `AdminTimelineStaged.save()`, which catches
per-item failures and surfaces them via the existing error `showToast` in
`timeline-staged-changes.js`. The bug is that a *successful* PUT omitted two fields — no error
codes are affected and none are needed.

**b) Should this plan add, update, or remove any error notification behaviour?**

No. Existing failure toasts already cover the offsets collection; this fix makes the
already-reported "success" actually persist the data.

## Notes
- **Drag plumbing already exists — only the visual math is wrong.** `attachDragListeners()`
  is called at the end of `renderEvents()`, right-click (`button === 2`) + pointer-capture +
  release + `stageOffset()` all work. The defect is confined to `updateDotPosition`: it reads
  the live (mutated) `style.left` each frame and re-subtracts `pxPerPeriod/2`, causing
  cumulative leftward drift, and its `top` formula (`50 + offsetY*280/2`) does not match
  render's (`280*(50 + finalY/2)/100`, `finalY = offsetY*280`), causing a vertical jump. The
  fix is to anchor to a base position captured at pointerdown and reuse render's exact formulas.
- Drag only activates at SPREAD density (`pxPerPeriod >= 120`) and on right-click by design —
  left-click stays reserved for opening the edit panel. Keep that gating.
- **API side is already correct.** `api/models/evidence.model.js` lists `timeline_offset_x` /
  `timeline_offset_y` among its updatable fields and clamps them (`-0.5..0.5` / `-0.4..0.4`),
  and `api/tests/evidence.test.js` already covers that clamping. The defect is purely the
  frontend payload builder dropping the fields before the request — no DB or API change needed.
- **Colouring source of truth:** style guide `components.md` §8 line 80 — "People & places
  roundel: `gospel_category` of `people` or `places` overrides era colour with a white
  roundel — `var(--color-white)` fill, `var(--color-black)` ring." The frontend
  `frontend/assets/css/pages/timeline/timeline-dots.css` already implements this correctly;
  the admin stylesheet had drifted. This aligns admin with both.
- Colour is never the only signal (WCAG) — labels/tooltips carry meaning, so no additional
  a11y work is required beyond matching the token scheme.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.**
  Hand-edited markdown/HTML is a known source of corruption in this codebase — don't repeat
  that failure mode on this plan's own tracking. Write a short script that parses the file,
  changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]`. When all tasks are complete, update the **Status** line to `✅ Completed` and move this file to `setup/PLANS/Completed/`. Push everything — code changes, any `setup/Issues.md` update, and this plan file's own edits/move — in one commit/push.
