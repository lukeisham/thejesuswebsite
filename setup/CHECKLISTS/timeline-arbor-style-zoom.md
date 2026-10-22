# Validation Checklist — timeline-arbor-style-zoom

**Plan:** `setup/PLANS/New/timeline-arbor-style-zoom.md`
**Date:** 2026-08-02

### Manual checks

- [ ] **Public timeline zoom-in**: on `/evidence/timeline/`, clicking the `+` button visibly enlarges dots, labels, and spacing together (not just spacing) — matching how Arbor's zoom feels on `/evidence/arbor.html`.
- [ ] **Public timeline zoom-out**: mirrors zoom-in; scale clamps at the configured minimum (buttons stop having an effect, no error in console).
- [ ] **Public timeline pan**: mouse click-drag on the timeline canvas moves the whole diagram (dots, labels, spine, era markers together) in screen space, exactly like dragging the Arbor canvas.
- [ ] **Era labels never desync from dots after repeated zoom clicks**: zoom in/out several times in a row, confirm a dot and its era's marker stay in the same relative position — this is the exact bug (Investigation Problem 2A) this plan fixes.
- [ ] **Mobile (<768px)**: transform is disabled; the existing vertical/rotated-spine layout still works via native scroll, no zoom controls shown.
- [ ] **Retired zoom pages return a redirect in production**: `https://thejesuswebsite.org/evidence/timeline/early-life/zoom-early-life.html` (and the other 7) return `301` to the corresponding `/evidence/timeline/<era>.html`.
- [ ] **Admin timeline zoom/pan** (`/admin/diagrams/timeline.html`, needs passkey): buttons and drag behave identically to the public side; no Reset button present (2-button parity with Arbor); dragging a node to reposition it still works and persists (`timeline_offset_x`/`timeline_offset_y`) — this admin-only capability must be unaffected by the zoom rewrite.

### Code-review checks

- [ ] **SR-4** — `admin/assets/js/admin-canvas-zoom.js` exists as a genuinely reusable module (no admin-timeline-specific assumptions baked in), and `admin/assets/js/admin-arbor/arbor-canvas.js` was **not** modified by this plan.
- [ ] **SR-3** — zoom/pan updates apply via `transform` only; no `element.style.width`/layout-triggering property is set on every zoom/pan tick.
- [ ] **CSS-2** — new `.timeline-world`/`.admin-timeline-world`/`.timeline-controls` rules use tokens (`--duration-fast`, `--ease-out`) not hardcoded values.
- [ ] **JS-2** — new defensive guards (missing world/viewport/control-bar elements) `console.warn` with call-site context rather than failing silently.
- [ ] **Website_guide.md "Don't merge the two design systems"** — the frontend zoom module stays an ES module (`export`/`import`); the admin module stays a `window.*` global. No single file is shared verbatim between the two.
- [ ] Frontend and admin bounds/step values match the plan's Notes (`[0.3, 3]` scale, ×1.25/÷1.25 step) on both sides.
