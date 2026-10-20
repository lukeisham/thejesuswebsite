# Validation Checklist — arbor-canvas-flex-fix

**Plan:** `setup/PLANS/New/arbor-canvas-flex-fix.md`

## Code-level checks

- [ ] `admin/assets/css/admin-diagrams/arbor-canvas.css` — `.admin-arbor-layout > main` rule added with `flex: 1; min-width: 0; min-height: 0;`.
- [ ] `admin/assets/css/admin-diagrams/arbor-canvas.css` — `.admin-arbor-canvas` now includes `min-width: 0; min-height: 0;` alongside existing `flex: 1`.
- [ ] No other CSS files modified.

## Visual checks (admin Arbor Editor)

- [ ] **Canvas fills the panel** — the dotted grid background spans full width and height of the right panel (minus the 260px holding pen sidebar on the left).
- [ ] **Root node ("The Logos") is fully visible** — not clipped at the right edge.
- [ ] **All descendant nodes are reachable** — pan/zoom works, nodes render at their correct positions.
- [ ] **Holding pen sidebar is unaffected** — still 260px wide, scrolls independently, drag-and-drop still works.
- [ ] **Responsive:** narrow the browser window — sidebar maintains `min-width: 220px`, canvas shrinks without overflow.
- [ ] **No horizontal scrollbar** appears on the admin page at any viewport width.

## CSS specificity check

- [ ] `.admin-arbor-layout > main` does not conflict with any other `main` styling in the admin CSS.
- [ ] The new rules use low-specificity selectors (no IDs, no `!important`).

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (admin-only change).
