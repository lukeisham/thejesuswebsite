# Validation: Timeline Admin Drag-Pan Stability

**Plan:** `setup/PLANS/New/timeline-p5-admin-drag-pan-stability.md`
**Date:** 2026-08-06

---

## Manual checks

### Drag-pan feel (admin timeline editor, `/admin/diagrams/timeline.html`)
- [ ] **Active drag:** Click-drag the canvas background. The canvas tracks the pointer immediately, with no lag or rubber-banding — matching the frontend public timeline's drag-pan feel.
- [ ] **Release from drag:** Panning stops immediately on mouseup; no residual motion or snap-back.
- [ ] **Zoom button click:** The existing 150ms smooth scale transition is still visible and unaffected by this plan — only drag-pan changes.
- [ ] **Drag immediately after a zoom-button click:** No stale transition lingers into the drag; the class-driven `transition: none` takes effect on the very next pan.

### Sub-pixel rounding
- [ ] **Fractional drag deltas:** Drag by an amount likely to produce a non-half-integer pixel delta (e.g. a short, precise drag). Inspect `document.querySelector('.admin-timeline-world').style.transform` in DevTools — the `translate()` values are multiples of `0.5px`, not raw fractional pixels.
- [ ] **No visible shimmer while dragging:** At scale ≈1.0 and scale 3.0, drag slowly across the canvas and watch the spine/era-divider lines — no flicker or double-rendering during continuous movement.

### Custom property and class inspection (DevTools)
- [ ] **`.admin-timeline-world--panning` present during drag:** Inspect the element's `className` mid-drag (or toggle it manually via `javascript_tool` if timing a live drag is impractical) — the class is present while `mousedown` is held and gone after `mouseup`.
- [ ] **`transitionDuration` reflects the class:** `getComputedStyle(worldEl).transitionDuration` is `0s` with the class present, and back to the `--duration-fast` value (150ms) once removed.

### Regression: drag-to-edit hit-testing
- [ ] **Scale 0.3:** Left-click drag an event dot; it repositions correctly, no offset from the visual dot position.
- [ ] **Scale 1.0:** Same check.
- [ ] **Scale 3.0:** Same check.
- [ ] **No accidental drag on a single click:** Clicking (not dragging) an event dot opens the edit panel, doesn't reposition it — the `CANDIDATE_DRAG_PX = 4` threshold in `timeline-node-drag.js` still disambiguates correctly.

---

## Code-review checks

- [ ] **SR-4** — `admin/assets/js/admin-arbor/arbor-canvas.js` was checked for the same gap per `admin-canvas-zoom.js`'s own doc-comment obligation; the finding (fixed here, N/A, or logged as a separate Issues.md row) is documented in a comment.
- [ ] **JS-1 / JS-4** — `admin-canvas-zoom.js` has a comment explaining *why* panX/panY are rounded and why `panningClass` is opt-in, not what the code does.
- [ ] **JS-2** — `CanvasZoom.create()` behaves identically to before this plan when `opts.panningClass` is omitted — no thrown error, no unexpected class mutation.
- [ ] **CSS-1** — the new rule lives in `admin/assets/css/admin-diagrams/timeline-canvas.css` beside `.admin-timeline-world`, not a new file (this file isn't near the 150-line cap).
- [ ] **CSS-5** — `.admin-timeline-world--panning` is a single low-specificity class, no `!important`.
- [ ] **TEST-1 / TEST-8 / TEST-9** — new tests in `admin/tests/admin-canvas-zoom.test.js` exercise the real `admin-canvas-zoom.js` source via the existing `vm` sandbox pattern, not a mirrored/reimplemented copy of the rounding or class-toggle logic.
- [ ] **TEST-6** — new tests assert on the actual rounded transform string and actual classList state, not just "didn't throw."

---

## Integration checks

- [ ] **No regression in zoom bounds:** `SCALE_MIN`/`SCALE_MAX` clamping still works — rounding was applied to pan only, never to scale.
- [ ] **No regression in `timeline-node-drag.js`:** per-dot drag (event repositioning) is confirmed independent of `AdminCanvasZoom`'s pan state — it reads `dot.style.left`/`top` directly, not the world transform.
- [ ] **No regression in the counter-scaling from `timeline-p2-line-stability.md`:** era-divider width still floors to `1px` at scale 3.0 and inflates proportionally at low scale; the admin spine still stays a fixed `2px` (untouched by this plan).

---

## Close-out checks

- [ ] **Issues.md #194** — `Status` cell flipped from `open` to `resolved`, every other cell in that row untouched, no other rows modified.
- [ ] **`timeline-p2-line-stability.md`** — its three remaining checkboxes are ticked, its Status header reads `✅ Completed`, and the file has moved from `setup/PLANS/New/` to `setup/PLANS/Completed/`.

---

## Documentation

- [ ] **Style guide updated:** the Timeline §8 line-stability bullet in `setup/STYLE_GUIDE/components.md` now also mentions admin drag-pan rounding + transition-suppression parity.
- [ ] **Inline comments:** `admin-canvas-zoom.js` documents why rounding and the panning class exist; `admin/assets/js/admin-timeline/timeline-zoom.js`'s module doc comment is updated to mention the `panningClass` it now passes.
