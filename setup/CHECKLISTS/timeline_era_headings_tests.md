# Validation: Timeline Era Headings

**Plan:** `setup/PLANS/New/4-timeline-era-headings.md`  
**Date:** 2026-08-03

## Manual checks

### Initial Render & Positioning
- [ ] Era headings are visible on the timeline page (not hidden or missing)
- [ ] Headings appear at the **top-left** of each era's spatial region, not centred above the spine
- [ ] Heading text matches the era names from ERA_LABELS (e.g., "Pre-Incarnation", "Passion Week")
- [ ] Headings use uppercase text-transform and are styled in the era's colour token (e.g., `--era-passion-week`)
- [ ] Headings do not overlay or truncate; text is fully visible and legible at 1× zoom

### Zoom Scaling
- [ ] Zoom in with the `+` button 3 times (→ 1.25× 2× 3× approximately). Headings scale **larger** in font-size and bounding box. Font size grows proportionally; text remains legible.
- [ ] Zoom back to 1×, then zoom out with the `−` button 3 times (→ 0.8× 0.64× 0.3× approximately). Headings scale **smaller**. At 0.3×, heading font-size is clamped to the minimum readable size (not vanishingly small, not unreadable).
- [ ] At min zoom (0.3×), headings are still visible and readable (never collapse to 0 or become illegible).
- [ ] At max zoom (3×), headings remain proportionally positioned at top-left (not shrunk or repositioned).

### Collision Avoidance & Tier Escalation
- [ ] Identify an era with 2+ overlapping event nodes (cluster at same period). The era heading should **nudge away** from the cluster (x position shifts left or right, or y shifts if necessary) to avoid overlap with the event labels.
- [ ] Verify the heading has shifted minimally (nudge distance is small, not extreme). Check the `tier-N` class in DevTools; if `tier-1` or `tier-2`, a collision was detected and escalated.
- [ ] The heading remains within its era's horizontal region (does not jump into an adjacent era).
- [ ] Multiple headings in the same era do not overlap each other (if two eras share space due to extreme zoom, each heading is independently placed and collision-escalated).

### Zoom & Pan Interaction
- [ ] Pan (drag) the timeline canvas left/right. Headings move smoothly with the world; no re-layout or repositioning occurs. Positions are static in world coordinates.
- [ ] Pan, then zoom in or out. Headings remain at their correct positions; no jumps or glitches occur during the combined operation.
- [ ] Click the zoom reset button (if present). Timeline returns to 1× zoom; headings return to their nominal positions. No position drift.

### Mobile / Vertical Mode
- [ ] Resize viewport to mobile (< 768px wide, e.g., 375×812 device preset). Timeline switches to vertical mode.
- [ ] Zoom controls are hidden (not visible, or `display: none` in DevTools).
- [ ] Headings reposition to the **left** of the vertical spine (not above it). Headings read top-to-bottom along the left margin.
- [ ] Heading text is readable at mobile zoom levels (no text overlap or truncation).
- [ ] Resize back to desktop. Headings return to horizontal-mode positioning (top-left of era regions). No stuck or incorrect positioning.

### Era Filtering & Initial Era
- [ ] Filter to show a single era (e.g., "Passion Week"). That era's heading is visible and correctly positioned.
- [ ] Show all eras. All headings are present and positioned correctly.
- [ ] If the timeline page has an `initialEra` dataset attribute, verify the corresponding heading is highlighted or emphasized (if that styling is defined).

### Accessibility & Semantics
- [ ] Inspect heading elements in DevTools. Verify they are `<h2>` or `<h3>` elements (proper heading hierarchy, subordinate to page `<h1>`).
- [ ] Heading has descriptive text content (era name, e.g., "Passion Week"), not generic placeholder text.
- [ ] Heading is not `display: none` or `visibility: hidden` on any viewport size.
- [ ] Use VoiceOver or a screen reader to navigate the page. Era headings are announced (headings are recognized and read in order).

### Browser Console & Network
- [ ] Open DevTools Console. No JavaScript errors or warnings related to timeline, headings, or collision detection.
- [ ] Network tab: no failed requests for timeline assets (JS, CSS). All resources load successfully.
- [ ] If a `--zoom-scale` custom property is introduced by the timeline-line-stability plan, verify it is readable in the placement module without errors.

## Code-review checks

- [ ] **SR-1** — `timeline-era-heading-placement.js` is a single-purpose module. The main export `computeEraHeadingPositions()` owns no DOM references and is pure/testable in isolation.
- [ ] **SR-4** — The placement module calls `resolveLabelCollisions()` from `cluster-label-collision.js` for escalation. No collision code is duplicated.
- [ ] **JS-1** — Function and variable names are self-documenting (e.g., `computeEraHeadingPositions`, `primaryStep`, `tierIndex`). "Why" comments explain the collision algorithm rationale, not "what" is happening line-by-line.
- [ ] **JS-2** — The placement function validates inputs (checks for null/undefined era data, missing event bounding boxes). On invalid input, it logs a descriptive console.warn and returns a safe fallback (e.g., default heading position) rather than crashing.
- [ ] **JS-6** — DOM queries in `timeline-render.js` are cached (event bounding boxes collected once per render, not in a loop). Event listeners on zoom/pan are delegated or debounced (no duplicate listeners per heading).
- [ ] **CSS-1** — Heading styles live in a dedicated file (`timeline-era-headings.css`), separate from the main timeline container styles.
- [ ] **CSS-2** — All colours, font-sizes, and spacing reference CSS custom properties (e.g., `var(--text-lg)`, `var(--era-passion-week)`, `var(--space-sm)`). No hardcoded hex values or pixel sizes (except for computed/dynamic values set by JS).
- [ ] **CSS-4** — Class names are semantic (`.timeline-era-heading`, `.tier-0`, `.tier-1`) and describe content/state, not visual appearance (no `.big-red-label` or `.left-nudged`).
- [ ] **CSS-5** — Specificity is low. No IDs or deeply nested selectors. `.timeline-era-heading` is a single class, with modifiers (`.tier-N`, `.era--<kebab>`) also single-class.
- [ ] **HTML-3** — Headings are `<h2>` or `<h3>` (never a second `<h1>`). Hierarchy is correct (era headings subordinate to page title).
- [ ] **TEST-1** — Tests use `node:test` and `node:assert/strict` only. No Jest, Mocha, Vitest, or mocking libraries.
- [ ] **TEST-2** — Test file has at least: (1) module loads cleanly, (2) happy path (single era, no collisions, correct position), (3) collision case (event overlaps, heading nudges, tier increments). No exhaustive branch coverage chasing; smoke tests only.
- [ ] **TEST-3** — Test file is located at `frontend/assets/js/timeline/tests/timeline-era-heading-placement.test.js`, matching the module path.
- [ ] **Style Guide updates** — `components.md` § 8 Timeline section now documents era headings (positioning, scaling, collision avoidance). `content-patterns.md` § 9 Timeline View describes heading behaviour in both horizontal and vertical modes.
- [ ] **No inline styles** (except for JS-computed positioning via `left`, `top`, `font-size`). All appearance goes through CSS classes and custom properties.
- [ ] **No new dependencies** added to `package.json` (placement logic uses only stdlib and existing internal modules).

## Performance checks

- [ ] Heading positioning is computed once per render (not per-frame). Zoom/pan do not trigger re-computation of positions (positions are static in world coords; only CSS transform updates).
- [ ] Collision detection runs once during render, reusing the shared `resolveLabelCollisions()` function. No O(n²) loops or nested collision checks per heading.
- [ ] Timeline page load time does not degrade noticeably (< 5% slowdown on local dev server compared to before the change).
- [ ] Zoom and pan operations remain smooth and responsive (no frame drops or jank when dragging or clicking zoom buttons).

## Deployment checklist

- [ ] All files in "Files touched" are present and contain the planned content (not stubs or placeholders).
- [ ] Tests run and pass: `cd frontend && node --test assets/js/timeline/tests/timeline-era-heading-placement.test.js` or `npm test`.
- [ ] Browser smoke test (Tier 2) passes: era headings render at top-left, scale with zoom, avoid collisions, work on mobile.
- [ ] Live smoke test (Tier 3) passes: headings are visible and functional on the deployed site at https://thejesuswebsite.org/evidence/timeline/.
- [ ] Style guide markdown files (`components.md`, `content-patterns.md`) have been edited via script (not hand-edited) to avoid corruption.
- [ ] Setup/Issues.md has no new rows logged (no unresolved issues discovered during implementation).
- [ ] Plan file updated: Status changed to `✅ Completed`, moved to `setup/PLANS/Completed/`.
- [ ] All changes pushed to GitHub in a single commit/push with the Deploy & verify group.

---

## Validation: Timeline Era Heading Label Collision Avoidance

**Plan:** `setup/PLANS/New/timeline-era-heading-label-collisions.md`  
**Date:** 2026-08-28  
**Issue:** #221 — Era headings avoid event dots but collide with event label text

### Manual checks

#### Label Measurement & Collision Detection
- [ ] At 1× zoom on the live site (https://thejesuswebsite.org/evidence/timeline/), locate an era with event labels that are long (e.g., "For to us a child is born", "Jesus heals the paralytic"). The event label should visually near or overlap an era heading's initial position.
- [ ] **Before fix expectation**: Era heading overlaps the event label text (visual regression case #221).
- [ ] **After fix expectation**: Era heading has nudged away from the label. Inspect the heading in DevTools; it should have a `tier-N` class where N > 0, indicating escalation due to label collision.
- [ ] The heading remains within its era's region (no jumping into adjacent eras).
- [ ] The nudge is minimal (heading is offset left or right by a small amount, not extreme displacement).

#### Zoom Stability with Labels
- [ ] At 1× zoom, identify a heading that escalated (tier > 0) to avoid a label.
- [ ] Zoom in with the `+` button 3 times. The heading scales larger (font-size grows) and remains offset from the label it avoided. No re-computation of positions occurs (static world coords).
- [ ] Zoom back to 1×, then zoom out to 0.3×. The heading shrinks to minimum readable size and still maintains offset from labels.
- [ ] Zoom back to 1×. Heading returns to nominal position and scale.

#### Mobile Vertical Mode Label Avoidance
- [ ] Resize viewport to mobile (< 768px). Timeline switches to vertical mode with headings left of the spine.
- [ ] Verify headings still avoid event labels in vertical mode (nudging is perpendicular to the spine, i.e., horizontally offset).
- [ ] Zoom in/out on mobile. Headings remain positioned correctly relative to labels.

#### Pan Interaction with Labels
- [ ] Drag the timeline canvas to pan. Headings move with the world and remain offset from their avoided labels.
- [ ] No re-layout or re-positioning of headings occurs during pan (static world coords, only CSS transform changes).

#### Admin Timeline Label Avoidance
- [ ] On the admin timeline editor (https://thejesuswebsite.org/admin/diagrams/timeline.html, requires passkey), zoom to 1× and locate an event with a long label overlapping an era heading's initial position.
- [ ] The heading should have escalated (tier > 0) and nudged away from the label.
- [ ] Drag an event dot that is near or overlapping a heading. Drag must work without the heading blocking interaction (pointer-events: none enforced).
- [ ] Zoom in/out. Headings scale and remain offset from labels.

### Code-review checks (label measurement & collision extension)

- [ ] **JS-2** — Label measurement code validates DOM element existence before calling `getBoundingClientRect()`. Missing or invalid label bounds are handled defensively (guards in place).
- [ ] **JS-6** — Label measurements are collected once per render in `buildHorizontalLayout()` and `buildVerticalLayout()` (not in a loop per label). Queries are cached.
- [ ] **SR-1** — Label measurement logic is separate from rendering (collect measurements first, then pass to `computeEraHeadingPositions()`).
- [ ] **SR-4** — No new collision detection code is written. Labels are threaded into `eventBounds` array and passed to the existing `computeEraHeadingPositions()` function, which reuses `resolveLabelCollisions()` for escalation.
- [ ] `computeEraHeadingPositions()` signature documentation clarifies that `eventBounds` now includes both dots and labels (or a new `labelBounds` parameter is introduced and documented).
- [ ] Both frontend (`timeline-render.js`) and admin (`timeline-events.js`) implement label measurement consistently. No divergence between the two code paths.
- [ ] Tests cover label collision: (1) label measurement produces correct bounds, (2) overlapping label forces heading escalation, (3) mixed dots+labels passed to collision resolver.

### Performance checks

- [ ] Label measurement (via `getBoundingClientRect()`) is called once per label, immediately after label creation (not in a reflow-inducing loop).
- [ ] Collision resolution reuses the existing algorithm; no additional computational cost beyond accounting for label bounding boxes (wider than dots, so more collisions expected).
- [ ] Zoom/pan remain smooth and responsive (no frame drops due to label measurement or collision re-computation).
- [ ] Timeline page load time does not degrade noticeably compared to before this change.

### Deployment checklist (label collision extension)

- [ ] All files in "Files touched" (from the plan) are present with label-measurement code integrated.
- [ ] Tests run and pass: Label measurement tests and label-collision tests pass via `node --test`.
- [ ] Browser smoke test (Tier 2) passes: Era headings avoid event label text at normal zoom and across zoom range (0.3× to 3×).
- [ ] Live smoke test (Tier 3) passes on public timeline: https://thejesuswebsite.org/evidence/timeline/ — era headings do not overlap event labels.
- [ ] Admin smoke test (Tier 3) passes on admin timeline: https://thejesuswebsite.org/admin/diagrams/timeline.html (requires passkey) — era headings avoid labels; event drag interactions work without heading blocking.
- [ ] Issue #221 row in `setup/ISSUES/issues.md` (if present) updated: Status changed from `open` to `resolved`.
- [ ] Plan file updated: Status changed to `✅ Completed`, moved to `setup/PLANS/Completed/`.
- [ ] All changes pushed to GitHub in a single commit/push with the Deploy & verify group.
