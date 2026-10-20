# Validation: CSS and Admin Script Cleanup

**Plan:** css-and-admin-script-cleanup.md
**Date:** 2026-07-19

## Manual checks

- [ ] **Essays list page (contextual-essays/index.html)** — Load in browser; confirm card grid renders with correct width/spacing (max-width matching `--measure-reading`); no visual change from before. Check mobile view too.
- [ ] **Essays list page filters and loading** — Scroll through essay cards, verify infinite scroll works as before; no console errors or layout shifts.
- [ ] **Historiography list page (debate/historiography/index.html)** — Load in browser; confirm card grid displays correctly; period-grouped sections render; no visual regression.
- [ ] **Resources category grid (resources/index.html)** — Load in browser; confirm all 15 category cards display in proper grid layout; no spacing changes; card hover states work.
- [ ] **Resources card links** — Click 2-3 resource category links (e.g., Parables, People); confirm navigation works and pages load correctly.
- [ ] **Wikipedia quality grid (debate/wikipedia/index.html)** — Load in browser; confirm stones render correctly; hover and focus outlines appear; stone shuffle animation on open plays; layout on mobile (40px stones) matches desktop appearance.
- [ ] **Wikipedia reduced-motion check** — Open DevTools, enable "Prefers Reduced Motion" in accessibility settings; reload; confirm all animations (stone shuffle, transitions) are disabled, stones appear instantly, no animation-related console errors.
- [ ] **Admin dashboard (admin/index.html)** — Load in admin; confirm dashboard renders with filters (search, type, status dropdowns); data table appears with Type/Title/Status/Updated columns.
- [ ] **Admin dashboard search** — Type "evidence" in search box; confirm table filters to show only Evidence records; clear search; table resets.
- [ ] **Admin dashboard type filter** — Select "Blog Post" from type dropdown; confirm table shows only blog posts; select "All Types"; table resets.
- [ ] **Admin dashboard status filter** — Select "Published"; confirm table shows only published (status=1) records; select "Draft"; table shows draft (status=0) records; select "All"; table resets.
- [ ] **Admin dashboard combined filters** — Search "essay", select type "Essay", select status "Published"; confirm only published essays matching search appear.
- [ ] **Admin dashboard error states** — Inspect Network tab; confirm `/content` API call succeeds; if you force a network error (DevTools throttling), confirm error toast appears.
- [ ] **No CSS file size violations** — Verify essays-list.css and resources-index.css are each under 150 lines; wikipedia-quality-grid.css is under 150 lines after split.

## Code-review checks

- [ ] **CSS-5** — All ID selectors replaced with classes; no ID selectors remain in essays-list.css, resources-index.css, or wikipedia-quality-grid.css.
- [ ] **CSS-5** — No nested selectors (`#id selector`, `.class selector`, etc.); all selectors are flat single classes.
- [ ] **CSS-1** — essays-list.css ≤ 150 lines; resources-index.css ≤ 150 lines; wikipedia-quality-grid.css ≤ 150 lines (after split); wikipedia-quality-grid-reduced-motion.css exists and contains reduced-motion rules.
- [ ] **CSS-2** — All margin/padding values use `var(--space-*)` variables; colours use `var(--*)`; no hardcoded values in the refactored rules.
- [ ] **SR-1** — admin/assets/js/dashboard.js is a single module exporting `TYPE_LABELS` and `contentItemUrl()`; no unrelated functions bundled in.
- [ ] **JS-1** — `dashboard.js` function names are self-documenting (`contentItemUrl`, `renderTable`, `applyFilters`, etc.); code is readable without comments.
- [ ] **HTML-1** — All semantic tags unchanged; `.journal-header` remains a semantic structure; no new `<div>` wrappers added except for styling hooks.
- [ ] **JS tests pass** — Run `cd admin && npm test` or `node --test tests/dashboard.test.js`; all tests pass (TYPE_LABELS values correct, contentItemUrl edge cases handled, filter logic correct).
- [ ] **No visual regressions** — Compare live screenshot of essays-list, resources grid, Wikipedia stones, and admin dashboard side-by-side with previous version; pixel-perfect match except for potential reduced-motion differences (expected).

## Cross-browser checks

- [ ] **Desktop (Chrome/Firefox/Safari)** — All manual checks above pass on at least two major browsers.
- [ ] **Mobile (iOS Safari, Android Chrome)** — Essays list, resources grid, Wikipedia stones, and admin dashboard render and interact correctly on mobile viewports.
