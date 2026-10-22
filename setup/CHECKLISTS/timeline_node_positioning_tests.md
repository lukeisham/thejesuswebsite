## Validation: Fix Timeline Node Positioning
**Plan:** fix-timeline-node-positioning.md
**Date:** 2026-08-04

### Manual checks
- [ ] Public timeline page loads without console errors and dots render at their period positions
- [ ] Admin timeline editor loads without console errors and dots render at period positions matching the frontend
- [ ] Zooming in on the public timeline increases dot cluster spacing (dots spread out visually)
- [ ] Zooming in on the admin timeline increases dot cluster spacing
- [ ] Labels in the admin timeline appear at the same distance from their dots as in the frontend
- [ ] Dragging a dot vertically in the admin positions it relative to the actual canvas height (not a fixed 280px)
- [ ] `curl /api/timeline/NonexistentEra` returns HTTP 400 with a coded error, not raw JSON
- [ ] `curl /api/timeline` returns HTTP 200 with published events
- [ ] Admin "Save Changes" persists `timeline_offset_y` correctly and re-renders the dot at the saved position

### Code-review checks
- [ ] JS-2 — no hardcoded magic numbers (280, 100) remain in timeline positioning code; canvas height is measured at render time
- [ ] SR-4 — cluster logic canonical modules are unchanged; admin-only fixes go through the existing bridge layer
- [ ] API-3 — all timeline route errors use `sendError`/`sendValidationError` with codes from `error-codes.js`
- [ ] TEST-2 — smoke tests cover the changed route behaviour (era validation, error codes)
- [ ] JS-5 — admin `loadEvents()` already uses async/await with try/catch; unchanged
