# Validation Checklist — timeline-label-cluster-fix

**Plan:** `setup/PLANS/New/timeline-label-cluster-fix.md`

## Code-level checks

### Phase 1 — Separate label/dot styles

- [ ] `timeline-render.js` — `labelStyleHorizontal(finalX, yOffset)` exists and returns a style string with `top` offset from dot.
- [ ] `timeline-render.js` — `labelStyleHorizontal` uses `LABEL_CLEARANCE_PCT = 8` for clearance.
- [ ] `timeline-render.js` — `labelStyleVertical(finalY, xOffset)` exists and returns a style string with `left` offset from spine.
- [ ] `timeline-render.js` — `labelStyleVertical` uses `LABEL_CLEARANCE_PX = 48` for clearance.
- [ ] `timeline-render.js` — `buildHorizontalLayout` line 455 no longer passes dot's `style` to `createLabel`.
- [ ] `timeline-render.js` — `buildVerticalLayout` line 547 no longer passes dot's `style` to `createLabel`.

### Phase 2 — Relative escalation

- [ ] `timeline-render.js` — label descriptors include `originalTop` (horizontal) or `originalLeft` (vertical).
- [ ] `timeline-render.js` — `applyTier` uses `calc(${originalTop} + ${tier * TIER_STEP_PCT}%)` instead of `50 + STAGGER_OFFSETS[tier]`.
- [ ] `timeline-render.js` — `applyTier` no longer swaps `above`/`below` class — the side is preserved.
- [ ] `timeline-render.js` — `TIER_STEP_PCT = 10` and `TIER_STEP_PX = 40` are defined as constants.

### Phase 3 — Review sweep

- [ ] All 8 era pages render with labels properly offset from dots.
- [ ] Clustered events (same period/date) fan out readably.
- [ ] No label-label collisions at default zoom.
- [ ] No label-dot overlaps at default zoom.
- [ ] Zoom levels 0.5x, 1x, 2x all readable.
- [ ] Mobile vertical mode (< 768px) — labels on correct side of spine with clearance.
- [ ] Era filter does not reposition labels.
- [ ] Backend overrides (`timeline_offset_x`/`y`) still respected.

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (no new/removed public URLs, existing timeline URLs unchanged).
