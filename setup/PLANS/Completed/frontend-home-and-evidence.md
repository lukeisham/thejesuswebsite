# Plan: Frontend Home and Evidence Pages

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Build the Home page, Evidence list, Evidence detail single-page, and Evidence Search page — the four highest-traffic public pages, covering the full evidence discovery journey from landing to reading detail.

## Coding rules to keep in mind

- **HTML-1** — Semantic landmarks on every page: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`; one `<main>` per page.
- **HTML-2** — Every `<img>` has a descriptive or empty `alt`; evidence pictures always carry caption-derived alt text.
- **HTML-3** — One visually-hidden `<h1>` per page (in `.sr-only` header); visible headings start at `<h2>`.
- **HTML-4** — CSS in `<head>`; all scripts at bottom with `defer`; no inline critical CSS unless required for hero image.
- **JS-2** — Evidence detail and search validate slug/query before fetching; show error states on invalid or missing data.
- **JS-5** — All data via `api.js` helpers; show skeleton screens before data arrives; show toast on fetch failure.
- **JS-6** — Evidence list and infinite scroll use event delegation; `innerHTML` only via `templates.js` helpers.
- **CSS-2** — Page-specific styles reference only tokens from `variables.css`; no hard-coded colour or size values.
- **CSS-3** — Mobile-first `@media (min-width)` breakpoints inside the relevant page CSS files.

## Tasks

### HTML — Home

- [x] **Create Home page HTML** — Single-column centred layout; visually-hidden `<header>` with skip-link and `<h1>`; hero image section; site title + tagline in large serif; content sections with `--space-3xl` vertical gap; no footer, no breadcrumbs; nav sidebar default closed. File: `frontend/index.html`

### HTML — Evidence list

- [x] **Create Evidence list HTML** — Shell page with filter bar placeholder, card grid region, infinite-scroll sentinel, and loading/empty-state containers; imports `evidence.css` and `main.js`; links `feather-sprite.svg`. File: `frontend/evidence/index.html`

### HTML — Evidence search

- [x] **Create Evidence search page HTML** — Full-width search input auto-focused on load; filter chips for entity type below input; results region; loading, empty, and error state containers; imports `search.css`. File: `frontend/evidence/search.html`

### HTML — Evidence detail (single)

- [x] **Create Evidence detail single-page shell HTML** — JS-routed page; `<main>` contains: hero region (title + primary verse), description section, timeline-context section, pictures section, sources section, page-info-row (related evidence, identifiers, map location, timeline period, categories), and footer. All content populated by JS. File: `frontend/evidence/single/[slug].html`

### JS — Evidence list

- [x] **Create evidence-list JS module** — Fetch paginated evidence from `GET /evidence` using `api.js`; render cards via `templates.js`; initialise filter chips (category, era, location) and sync to URL params via `router.js`; implement infinite scroll (load next page at 300 px threshold); cache loaded items and scroll position in `sessionStorage` for back-nav. File: `frontend/assets/js/evidence-list.js`

### JS — Evidence detail

- [x] **Create evidence-detail JS module** — Read slug from URL via `router.js`; fetch full evidence record via `api.js`; render title, primary verse, description, timeline context, pictures (with `figures.js` numbering), sources (MLA), page-info-row panels, and breadcrumbs; call `setSEO()` with title + description + JSON-LD `schema.org/CreativeWork`; show skeleton while loading and error state on failure. File: `frontend/assets/js/evidence-detail.js`

### JS — Figure numbering

- [x] **Create figures JS module** — Export `numberFigures(container)` that queries all `<figure>` elements inside `container` and injects sequential `Fig. N` labels into `<figcaption>`; must be called on initial load and after each infinite-scroll batch insert. File: `frontend/assets/js/utils/figures.js`

### JS — Search

- [x] **Create search JS module** — Debounced input handler (300 ms via `debounce.js`) calling `GET /search`; render result cards grouped by entity type; highlight matches with `<mark>`; filter chips narrow by type; show empty state and error state. File: `frontend/assets/js/search.js`

## Files touched

- `frontend/index.html` — created
- `frontend/evidence/index.html` — created
- `frontend/evidence/search.html` — created
- `frontend/evidence/single/[slug].html` — created
- `frontend/assets/js/evidence-list.js` — created
- `frontend/assets/js/evidence-detail.js` — created
- `frontend/assets/js/utils/figures.js` — created
- `frontend/assets/js/search.js` — created

## Notes

- **Dependency**: all files in the `frontend-js-foundation` plan must exist before implementing this plan (`api.js`, `utils/`, `main.js`, `feather-sprite.svg`).
- The evidence detail page is a JS-routed shell: a single `[slug].html` serves all evidence items. The server must be configured to route `/evidence/single/*` to this file.
- `numberFigures()` must be exported from `utils/figures.js` and imported by `evidence-detail.js` and called again from the infinite-scroll callback in `evidence-list.js`.
- The page-info-row on the detail page is suppressed in print via `print.css` (`display: none`). No JS needed.
- No automated tests: all files are in `frontend/`. Manual checklist covers this plan.
- `evidence-list.js` and `evidence-detail.js` are separate files (SR-1) — the list page and detail page have distinct fetch lifecycles and state.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
