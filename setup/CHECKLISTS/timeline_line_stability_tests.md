# Validation: Timeline Line Stability

**Plan:** `setup/PLANS/Completed/timeline-p2-line-stability.md`  
**Date:** 2026-08-03

---

## Manual checks

### Line rendering at various zoom levels
- [ ] **Zoom 0.3x (minimum):** Spine and era markers remain visible and crisp. No hairline disappearance. Thickness is visually constant compared to 1x zoom.
- [ ] **Zoom 0.75x:** Sub-pixel rounding in effect. No shimmer or flickering visible when panning.
- [ ] **Zoom 1x (default):** Spine is 2px, era markers are 1px. Colors are correct (`--border`, `--border-strong`).
- [ ] **Zoom 1.5x:** Lines do not thicken beyond intended thickness. Counter-scaling maintains constant apparent width.
- [ ] **Zoom 2x:** Lines remain stable. No visual jitter when dragging at this zoom level.
- [ ] **Zoom 3x (maximum):** Spine and markers remain crisp and at constant thickness. Label positions are readable relative to spine.

### Pan smoothness and transition behavior
- [ ] **Drag to pan (active pointer):** Timeline pans smoothly with NO lag or rubber-banding. Transition is suppressed (`.timeline-world--panning` class active).
- [ ] **Release from drag:** Pan stops immediately; no motion after release.
- [ ] **Zoom button click:** Smooth scale transition over 150ms is visible. Transition is NOT suppressed (class removed after zoom completes).
- [ ] **Multiple zooms:** Repeated zoom-in/out cycles maintain line stability and do not accumulate visual artifacts.

### Mobile vertical mode (< 768px viewport width)
- [ ] **Portrait phone (375px width):** Timeline switches to vertical mode. Spine runs top-to-bottom, centered horizontally. Zoom/pan controls are hidden.
- [ ] **Line rendering:** Spine is 2px high, era markers are 1px tall. No transform applied; lines render in natural flow (no counter-scaling used).
- [ ] **Scrolling:** Timeline scrolls vertically as a normal page element. No jitter or performance degradation.

### Era markers and labels
- [ ] **Era marker visibility:** Vertical divider lines at era boundaries are visible and properly spaced. Opacity 0.6 is maintained.
- [ ] **Era labels:** Text labels above era markers are positioned correctly and remain readable at all zoom levels.
- [ ] **Label clearance:** No overlap between era labels and event labels at any zoom level.

### Custom property injection (DevTools inspection)
- [ ] **Custom property set:** Inspect `.timeline-world` element in DevTools. The `--timeline-zoom-scale` property is present and equals the current scale (e.g., 1.25 after one zoom-in from 1x).
- [ ] **Property updates on zoom:** Zoom in/out and re-inspect; the property value changes to match the new scale.
- [ ] **Property updates on pan:** Pan by dragging; the property value remains constant (pan doesn't change scale).
- [ ] **Mobile mode fallback:** On a mobile viewport, if the property is not set by JS, computed styles still show `height: 2px` (fallback to `calc(2px / 1)`) — no breakage.

---

## Code-review checks

- [ ] **CSS-1** — Line styles isolated to specific files: spine/markers in `timeline.css`, mobile overrides in `timeline-responsive.css`. No unrelated styles mixed in.
- [ ] **CSS-2** — Line thickness values use `max(1px, calc(...))` with `var(--timeline-zoom-scale)` custom property, no hardcoded pixel values for the counter-scaling formula.
- [ ] **CSS-3** — Mobile responsive rules in `timeline-responsive.css` correctly override desktop zoom behavior with `transform: none` and hide zoom controls.
- [ ] **JS-1** — Comments in `timeline-zoom.js` explain the counter-scaling strategy, rounding grid choice, and why drag-transition suppression is needed.
- [ ] **JS-2** — `applyTransform()` validates that panX, panY, scale are finite before applying; logs a warning if not.
- [ ] **TEST-1** — Tests use `node:test` + `node:assert/strict`, no external test frameworks.
- [ ] **TEST-2** — Smoke tests in `timeline-zoom.test.js` cover: (1) custom property calculation, (2) rounding to grid, (3) class application on drag start/end. Edge cases (scale at bounds, NaN values) are tested.
- [ ] **TEST-3** — Test files named `timeline-zoom.test.js` and `timeline-drag-transition.test.js`, located in `frontend/assets/js/timeline/tests/`.
- [ ] **TEST-4** — Tests are in-memory and deterministic; no DOM library or async waiting. Fake DOM used minimally (following `admin/tests/admin-editor-utils.test.js` pattern).
- [ ] **TEST-6** — Tests assert on actual values (computed scale, rounded pixel values, class presence) not just "didn't crash."

---

## Integration checks

- [ ] **No regressions in zoom bounds:** Zoom in/out buttons respect `SCALE_MIN` (0.3) and `SCALE_MAX` (3.0). Scale never exceeds these bounds.
- [ ] **No regressions in pan:** Pan state (panX, panY) is correctly applied before scale in `applyTransform()`. Pan offset is not lost when zooming.
- [ ] **No regressions in era filtering:** Filtering by era does not reset zoom/pan state. Re-applying the same filter keeps the user's current zoom/pan.
- [ ] **No regressions in label collisions:** Label collision logic and escalation (if present) work correctly under the new rounding. Labels do not overlap dots or each other.
- [ ] **Admin timeline parity:** If the admin timeline uses the same geometry module, verify that counter-scaling and rounding do not affect admin rendering (admin does not use zoom/pan, so these features are N/A; document in a comment if so).

---

## Edge cases

- [ ] **Fractional zoom where shimmer historically occurred:** Manually zoom to scales like 0.47, 0.52, 0.317 where shimmer was previously reported. Verify lines remain crisp (rounding to 0.5px grid should eliminate shimmer).
- [ ] **Very large pan offsets:** Pan far to the left/right (e.g., panX = -5000px) at scale 1x. Lines remain visible and crisp (transform is correctly applied).
- [ ] **Extreme zoom + extreme pan:** Zoom to 3x while panned far. Verify no visual artifacts and that lines stay at constant thickness.
- [ ] **Rapid zoom/pan sequences:** Quickly zoom in/out multiple times, then drag. No accumulated jitter or visual degradation.
- [ ] **Scale at exact bounds:** Set scale to exactly 0.3 or 3.0 and pan. Verify lines render correctly at boundaries (no off-by-one errors in counter-scaling).

---

## Browser compatibility

- [ ] **Chrome/Chromium:** Lines render crisp at all zoom levels. Custom property injection works. DevTools shows updated values.
- [ ] **Firefox:** Same as Chrome (CSS custom properties are standard). Verify in Firefox if available locally.
- [ ] **Safari:** Verify counter-scaling formula `max(1px, calc(...))` is supported (it is in modern Safari 13+). Test on macOS if available.

---

## Performance

- [ ] **No layout thrashing:** Inspect DevTools Performance tab during zoom/pan. No unnecessary repaints or recalculations. Setting `--timeline-zoom-scale` should not trigger layout recalculations (it's a CSS custom property, not a layout-affecting style).
- [ ] **Smooth 60 fps:** During drag-pan (with transition suppressed), frame rate stays >= 55 fps (measured in DevTools).
- [ ] **Smooth transition:** During zoom button click (with transition enabled), animation is smooth and jank-free.

---

## Accessibility

- [ ] **Keyboard navigation:** Zoom buttons are keyboard-accessible (Tab, Enter). Existing timeline keyboard interactions still work.
- [ ] **Screen reader:** Timeline spine and markers are visually distinct; no ARIA changes needed (they're CSS styling). Verify no regressions in announcements.
- [ ] **High contrast mode:** Verify line colors (`--border`, `--border-strong`) meet WCAG contrast ratios when lines are at constant thickness.
- [ ] **Reduced motion:** Users with `prefers-reduced-motion: reduce` should see zoom/pan apply instantly without transition. Verify current media query behavior is preserved.

---

## Documentation

- [ ] **Style guide updated:** §8 Timeline section in `setup/STYLE_GUIDE/components.md` documents that spine/markers maintain constant thickness via counter-scaling.
- [ ] **Inline comments:** `timeline-zoom.js` has doc comments explaining the stabilization approach and rounding strategy.
- [ ] **CSS comments:** `timeline.css` spine/marker rules have comments explaining `max(1px, calc(...))` formula and why it's used.
- [ ] **Mobile note:** `timeline-responsive.css` has a comment documenting that mobile vertical mode disables zoom/pan entirely, so counter-scaling is N/A.

