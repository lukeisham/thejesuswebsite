# Plan: CSS Vibe Coding Rule Compliance

**Module(s):** Frontend / Admin
**Date:** 2026-06-30
**Status:** ✅ Completed

## Goal
Bring all 61 CSS files into full compliance with the Vibe Coding Rules (CSS-1 through CSS-6). Split files exceeding 150 lines, eliminate hardcoded color values in favor of custom properties, and consolidate duplicated admin token definitions.

## Coding rules to keep in mind
- **CSS-1** — Every file must be under 150 lines; one component/job per file. This is the primary driver of this plan — 13 files currently exceed the limit.
- **CSS-2** — Custom properties only. Hardcoded hex values like `#fafbfc`, `#fff`, `#8b3d3d`, and `#fdeded` must move into variables.
- **CSS-3** — Mobile breakpoints stay in-component (already compliant, preserve this).
- **CSS-4** — Kebab-case semantic class names. Admin uses BEM `__`/`--` convention — keep BEM where established, but don't introduce it in new split files unless following the existing parent namespace.
- **CSS-5** — Single classes, no `!important` (except the existing `prefers-reduced-motion` override, which is acceptable). Keep specificity low in new split files.
- **CSS-6** — Large clear section headings and sub-headings. Mirror the existing banner-comment style in all new files.

## Tasks

### Phase 1 — Admin token consolidation

- [ ] **Add missing admin tokens to `admin-base/variables.css`** — add `--admin-canvas-bg`, `--admin-error-color`, `--admin-error-bg`, `--admin-error-border`, `--admin-success-color`, `--admin-success-bg`, `--admin-success-border`, `--admin-accent-text` (maps `#ffffff`), `--admin-selected-color`, and `--admin-draft-bg` / `--admin-draft-color` to the admin variables file so all admin CSS can reference tokens instead of hardcoded hex. File: `admin/assets/css/admin-base/variables.css` — modified

- [ ] **Remove duplicate `:root` blocks from auth CSS** — delete the local `:root` block from both `login.css` and `register.css`; they should import variables from `admin-base/variables.css` via `admin.css` or `@import`. Replace hardcoded status colors (`#f2f5f7`, `#edf7ed`, `#2d5a2d`, `#c3e6c3`, `#fdeded`, `#8b3d3d`, `#f0c0c0`) with the new admin tokens. File: `admin/auth/login.css` — modified. File: `admin/auth/register.css` — modified

### Phase 2 — Split the admin diagram files

#### Arbor diagram (`admin/assets/css/admin-diagrams/arbor.css`, 424 lines)

- [ ] **Create `arbor-toolbar.css`** — extract top bar (`.admin-arbor-topbar`) and toolbar (`.admin-arbor-toolbar` and children) sections. Replace hardcoded `#fff` with `--admin-accent-text`. File: `admin/assets/css/admin-diagrams/arbor-toolbar.css` — created

- [ ] **Create `arbor-canvas.css`** — extract canvas (`.admin-arbor-canvas`), nodes (`.admin-arbor-node` family), edges (`.admin-arbor-edge` family), zoom bar (`.admin-arbor-zoom-bar`), edge error (`.admin-arbor-edge-error`), backdrop (`.admin-arbor-panel-backdrop`), visually-hidden utility, and responsive block. Replace hardcoded `#fafbfc` with `--admin-canvas-bg`, `#e94560` / `#c0392b` with `--admin-selected-color`, and `#8b3d3d` / `#fdeded` with `--admin-error-*` tokens. File: `admin/assets/css/admin-diagrams/arbor-canvas.css` — created

- [ ] **Create `arbor-panel.css`** — extract the slide-in edit panel (`.admin-arbor-panel` and all children: header, title, close, form, field, input, info, error, actions, btn variants, danger). Replace hardcoded `#fff`, `#8b3d3d`, `#fdeded`, `#f0c0c0` with admin tokens. File: `admin/assets/css/admin-diagrams/arbor-panel.css` — created

- [ ] **Create `arbor-search.css`** — extract the search dialog (`.admin-arbor-search` and children: header, input, close, results, items, loading/empty/error states). File: `admin/assets/css/admin-diagrams/arbor-search.css` — created

- [ ] **Delete `arbor.css`** — all content has been migrated to the four new files. File: `admin/assets/css/admin-diagrams/arbor.css` — deleted

#### Timeline diagram (`admin/assets/css/admin-diagrams/timeline.css`, 431 lines)

- [ ] **Create `timeline-toolbar.css`** — extract top bar (`.admin-timeline-topbar`) and toolbar (`.admin-timeline-toolbar` and children). Replace hardcoded `#fff` with `--admin-accent-text`. File: `admin/assets/css/admin-diagrams/timeline-toolbar.css` — created

- [ ] **Create `timeline-canvas.css`** — extract canvas (`.admin-timeline-canvas`), axis (`.admin-timeline-axis-line`), era bands (`.admin-timeline-era-band`), era label (`.admin-timeline-era-label`), tick marks (`.admin-timeline-tick`), event markers (`.admin-timeline-event`), zoom bar (`.admin-timeline-zoom-bar`), backdrop (`.admin-timeline-panel-backdrop`), visually-hidden utility, and responsive block. Replace hardcoded `#fafbfc`→`--admin-canvas-bg`, `#e74c3c`→`--admin-selected-color`, `rgba(233,69,96,0.04)`→`--admin-era-band-bg`. File: `admin/assets/css/admin-diagrams/timeline-canvas.css` — created

- [ ] **Create `timeline-panel.css`** — extract the slide-in edit panel (`.admin-timeline-panel` and all children: header, title, close, form, field, input, select, info, error, actions, btn variants, danger). Replace hardcoded `#fff`, `#8b3d3d`, `#fdeded`, `#f0c0c0` with admin tokens. File: `admin/assets/css/admin-diagrams/timeline-panel.css` — created

- [ ] **Create `timeline-search.css`** — extract the search dialog (`.admin-timeline-search` and children). File: `admin/assets/css/admin-diagrams/timeline-search.css` — created

- [ ] **Delete `timeline.css`** — all content migrated. File: `admin/assets/css/admin-diagrams/timeline.css` — deleted

#### Maps diagram (`admin/assets/css/admin-diagrams/maps.css`, 326 lines)

- [ ] **Create `maps-toolbar.css`** — extract top bar (`.admin-topbar`) and toolbar (`.admin-maps-toolbar` and children). Replace hardcoded `#fff` with `--admin-accent-text`. File: `admin/assets/css/admin-diagrams/maps-toolbar.css` — created

- [ ] **Create `maps-canvas.css`** — extract canvas (`.admin-map-canvas`), image loading, pins layer (`.admin-map-pins-layer`), pins (`.admin-map-pin` family), pin labels (`.admin-map-pin-label`), pin panel backdrop (`.admin-pin-panel-backdrop`), and responsive block. Replace hardcoded `#e74c3c`→`--admin-selected-color`. File: `admin/assets/css/admin-diagrams/maps-canvas.css` — created

- [ ] **Create `maps-panel.css`** — extract the slide-in pin edit panel (`.admin-pin-panel` and all children: header, title, close, form, field, input, hint, error, actions, btn variants, danger). Replace hardcoded `#fff`, `#8b3d3d`, `#fdeded`, `#f0c0c0` with admin tokens. File: `admin/assets/css/admin-diagrams/maps-panel.css` — created

- [ ] **Delete `maps.css`** — all content migrated. File: `admin/assets/css/admin-diagrams/maps.css` — deleted

### Phase 3 — Split frontend page CSS files

- [ ] **Split `navigation.css` (251 lines) into two files** — extract the hamburger + overlay + responsive section into `hamburger.css`, keeping the sidebar core in `navigation.css`. Both stay under 150 lines. File: `frontend/assets/css/layout/navigation.css` — modified. File: `frontend/assets/css/layout/hamburger.css` — created

- [ ] **Split `journal.css` (333 lines) into smaller files** — extract: (a) the title block + abstract + keywords into `journal-header.css`, (b) the reading column + numbered headings + block quotes into `journal-body.css`, (c) footnotes + bibliography + references into `journal-footer.css`. Keep the two-column layout, challenge reference, strength indicator in `journal-body.css`. Existing `journal.css` deleted after migration. Files: `frontend/assets/css/pages/journal-header.css`, `frontend/assets/css/pages/journal-body.css`, `frontend/assets/css/pages/journal-footer.css` — created. File: `frontend/assets/css/pages/journal.css` — deleted

- [ ] **Split `maps.css` (233 lines) into smaller files** — extract the overview header + overview grid + overview card (maps list page) into `maps-list.css`, keeping the map canvas/viewport + pins + tooltip + zoom controls + filters + responsive in `maps-view.css`. File: `frontend/assets/css/pages/maps.css` — deleted. Files: `frontend/assets/css/pages/maps-list.css`, `frontend/assets/css/pages/maps-view.css` — created

- [ ] **Split `timeline.css` (195 lines) into smaller files** — extract the page header + era filters into `timeline-filters.css`, keeping the timeline container + spine + dots + labels + markers + detail panel + responsive in `timeline-view.css`. File: `frontend/assets/css/pages/timeline.css` — deleted. Files: `frontend/assets/css/pages/timeline-filters.css`, `frontend/assets/css/pages/timeline-view.css` — created

- [ ] **Trim `blog.css` (164 lines)** — extract the further-reading section into `blog-footer.css` to drop below 150 lines in the main file. File: `frontend/assets/css/pages/blog.css` — modified. File: `frontend/assets/css/pages/blog-footer.css` — created

- [ ] **Trim `challenge-list.css` (161 lines)** — extract the challenge detail + responses + response card sections into `challenge-detail.css` to drop below 150 lines. File: `frontend/assets/css/pages/challenge-list.css` — modified. File: `frontend/assets/css/pages/challenge-detail.css` — created

- [ ] **Trim `arbor.css` (156 lines)** — extract the zoom controls section into `arbor-controls.css` to drop below 150 lines. File: `frontend/assets/css/pages/arbor.css` — modified. File: `frontend/assets/css/pages/arbor-controls.css` — created

Phase 4 — Fix remaining hardcoded values

- [ ] **Replace hardcoded `#FFFFFF` with a variable** — add `--color-white: #FFFFFF` and `--color-black: #000000` to `frontend/assets/css/base/variables.css`. Update `invisible-header.css` (skip link), `buttons.css` (`.btn-primary` color), and `print.css` (body/heading/link colors) to reference these new tokens. Print-specific values like `#888888` remain acceptable. File: `frontend/assets/css/base/variables.css` — modified. Files: `frontend/assets/css/base/invisible-header.css`, `frontend/assets/css/components/buttons.css`, `frontend/assets/css/base/print.css` — modified

- [ ] **Fix hardcoded danger/warning values in admin components** — update `admin-components/buttons.css` to replace `#c82333` with `--admin-danger` for the danger button hover state. Update `admin-components/tables.css` to replace `rgba(255, 193, 7, 0.15)` / `#997404` with `--admin-warning`-derived tokens for the draft badge. Files: `admin/assets/css/admin-components/buttons.css`, `admin/assets/css/admin-components/tables.css` — modified

### Phase 5 — Update imports and entry points

- [ ] **Update `admin.css` to import new split files** — add imports for the 12 new admin-diagram CSS files and remove the 3 old single-file imports. File: `admin/assets/css/admin.css` — modified

- [ ] **Update `main.css` to import new split files** — add imports for new frontend page CSS files, remove old single-file imports. File: `frontend/assets/css/main.css` — modified

- [ ] **Add `@import` for admin variables into auth CSS** — update `login.css` and `register.css` to import `admin-base/variables.css` instead of defining their own duplicate `:root` block. File: `admin/auth/login.css` — modified. File: `admin/auth/register.css` — modified

### Phase 6 — Validation

- [ ] **Verify all CSS files are under 150 lines** — run `find . -name '*.css' -exec wc -l {} + | awk '$1 > 150'` and confirm zero results (excluding `variables.css` at 147 lines). File: terminal command — no file

- [ ] **Verify no remaining hardcoded hex values in non-variable files** — run a grep for `#[0-9a-fA-F]{3,6}` across all CSS files, excluding `variables.css` and `print.css`. Document remaining intentional hex values (print-only, SVG fill in variables). File: terminal command — no file

## Files touched
- `admin/assets/css/admin-base/variables.css` — modified
- `admin/assets/css/admin.css` — modified
- `admin/auth/login.css` — modified
- `admin/auth/register.css` — modified
- `admin/assets/css/admin-components/buttons.css` — modified
- `admin/assets/css/admin-components/tables.css` — modified
- `admin/assets/css/admin-diagrams/arbor.css` — deleted
- `admin/assets/css/admin-diagrams/arbor-toolbar.css` — created
- `admin/assets/css/admin-diagrams/arbor-canvas.css` — created
- `admin/assets/css/admin-diagrams/arbor-panel.css` — created
- `admin/assets/css/admin-diagrams/arbor-search.css` — created
- `admin/assets/css/admin-diagrams/timeline.css` — deleted
- `admin/assets/css/admin-diagrams/timeline-toolbar.css` — created
- `admin/assets/css/admin-diagrams/timeline-canvas.css` — created
- `admin/assets/css/admin-diagrams/timeline-panel.css` — created
- `admin/assets/css/admin-diagrams/timeline-search.css` — created
- `admin/assets/css/admin-diagrams/maps.css` — deleted
- `admin/assets/css/admin-diagrams/maps-toolbar.css` — created
- `admin/assets/css/admin-diagrams/maps-canvas.css` — created
- `admin/assets/css/admin-diagrams/maps-panel.css` — created
- `frontend/assets/css/main.css` — modified
- `frontend/assets/css/base/variables.css` — modified
- `frontend/assets/css/base/invisible-header.css` — modified
- `frontend/assets/css/components/buttons.css` — modified
- `frontend/assets/css/base/print.css` — modified
- `frontend/assets/css/layout/navigation.css` — modified
- `frontend/assets/css/layout/hamburger.css` — created
- `frontend/assets/css/pages/journal.css` — deleted
- `frontend/assets/css/pages/journal-header.css` — created
- `frontend/assets/css/pages/journal-body.css` — created
- `frontend/assets/css/pages/journal-footer.css` — created
- `frontend/assets/css/pages/maps.css` — deleted
- `frontend/assets/css/pages/maps-list.css` — created
- `frontend/assets/css/pages/maps-view.css` — created
- `frontend/assets/css/pages/timeline.css` — deleted
- `frontend/assets/css/pages/timeline-filters.css` — created
- `frontend/assets/css/pages/timeline-view.css` — created
- `frontend/assets/css/pages/blog.css` — modified
- `frontend/assets/css/pages/blog-footer.css` — created
- `frontend/assets/css/pages/challenge-list.css` — modified
- `frontend/assets/css/pages/challenge-detail.css` — created
- `frontend/assets/css/pages/arbor.css` — modified
- `frontend/assets/css/pages/arbor-controls.css` — created

## Notes
- **No automated tests are required** — this is a CSS-only plan. No `.js` files in `api/`, `admin/`, or `mcp-server/` are touched. All changes are to `.css` files only.
- **No database schema changes**, so `schema.sql` is not relevant to this plan.
- **Breakpoint consistency (CSS-3)** — all mobile `@media` queries stay in the same file as their component. When splitting, each new file keeps its own responsive block if it had one. The `hamburger.css` file (extracted from `navigation.css`) carries its own responsive rules because it's the mobile navigation toggle.
- **BEM naming (CSS-4)** — admin diagram files use `__` (BEM element) and `--` (BEM modifier) conventions. New split files preserve these existing class names to avoid breaking HTML references. The BEM stems (`.admin-arbor-*`, `.admin-timeline-*`, `.admin-pin-*`, `.admin-map-*`) are already semantic — they describe *what* an element is within its component.
- **Auth files** — `login.css` (155 lines) and `register.css` (159 lines) will drop well below 150 once their duplicate `:root` blocks (~15 lines each) are removed and replaced with an `@import`.
- **`print.css` (134 lines)** — stays under 150. The hardcoded hex values (`#000000`, `#FFFFFF`) are by design per the Style Guide §12 ("black text, no parchment tones"). A `--color-black` token is being added to `variables.css` for consistency, but the print-specific `#888888` values are intentionally distinct from the screen palette.
- **Import ordering** — `admin.css` and `main.css` must import the new split files in the same relative position as the old single file so cascade order is preserved. The toolbar files must be imported before canvas/panel files if they set base styles that are overridden later.
- **`!important` usage** — the only existing `!important` is in `base/animations.css` for `prefers-reduced-motion`, which is explicitly the correct WCAG pattern and remains untouched.
