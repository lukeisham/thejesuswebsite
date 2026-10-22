# Validation Checklist — timeline-label-parity-and-chrome-cleanup

**Plan:** `setup/PLANS/New/timeline-label-parity-and-chrome-cleanup.md`
**Date:** 2026-08-02

### Manual checks

- [ ] **Dense period on the public timeline**: a period with 4+ events shows labels fanned out with no visual overlap (collision escalation working), matching pre-refactor behaviour exactly (byte-identical positions).
- [ ] **Same dense period in the admin editor** (`/admin/diagrams/timeline.html`, needs passkey): labels now fan out the same way the public page does, instead of overlapping — this is the single largest visual gap this plan closes.
- [ ] **Admin label DOM**: inspect via devtools — each label is a sibling of its dot inside the canvas, not a nested child of the dot `<button>`.
- [ ] **Drag a node in admin**: its label moves with it, staying correctly attached above/below at the new position.
- [ ] **Admin canvas framing**: top/bottom whitespace around the spine visually matches the public page's proportions (not identical height — admin keeps its taller flex-fill working area).
- [ ] **Hover glow**: hovering a clustered dot on the public page shows the same soft shadow as before, now driven by a CSS class + custom property instead of an inline JS style assignment.

### Code-review checks

- [ ] **SR-4** — `frontend/assets/js/cluster-logic/cluster-label-collision.js` is a pure function module (no DOM access) consumed by both `timeline-render.js` directly and `admin/assets/js/cluster-logic-bridge/cluster-label-collision-bridge.js` for admin — not a hand-copied second implementation.
- [ ] **JS-6** — new sibling label elements are covered by existing delegated event listeners, not new per-element listeners.
- [ ] **CSS-2 / CSS-5** — `--timeline-hover-shadow` token added to `variables.css`; `.timeline-dot--cluster-glow` is a single class with no `!important`; no inline `style.boxShadow` assignment remains in `timeline-interactions.js`.
- [ ] **Website_guide.md refactoring rule** — the frontend's label positions before and after the `cluster-label-collision.js` extraction are pixel-identical for a fixed dense-period test case (byte-identical output requirement).
- [ ] Admin's CSS token names stay in the `--admin-*`/`--canvas-*` namespace; no frontend variable names were copied into admin CSS files or vice versa.

### Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (no pages added or removed by this plan).
