# Plan: Frontend Map Region & Zoom Pages

**Module(s):** Frontend
**Date:** 2026-06-30
**Status:** ✅ Plan implemented

## Goal
Create 10 frontend map pages — one per geographic region (`roman-empire.html`, `levant.html`, `galilee.html`, `judea.html`, `jerusalem.html`) and one zoom-variant per region. These pages render the interactive map with a specific region pre-selected, completing the maps section of the sitemap.

## Coding rules to keep in mind
- **HTML-1** — Semantic structure: `<main>`, `<nav>`, `<header>`, `<section>`.
- **HTML-3** — One `<h1>` per page, consistent with the existing `maps/index.html` and `maps/[map_key].html`.
- **HTML-4** — CSS in `<head>`, JS at bottom with `defer`. Reuse the maps CSS/JS bundle.
- **SR-1** — Each page is a single file. One file per region view.
- **JS-5** — All data fetching through `api.js` — already handled by `maps-data.js`.
- **CSS-2** — Use CSS custom properties for any zoom-specific overrides; never hardcode values.

## Tasks

### Phase 1 — Region map pages (5 files)

Each region page follows the exact structure of the existing `frontend/evidence/maps/[map_key].html` template, but with page-specific `<title>`, `<meta>`, `<h1>`, and a hardcoded `data-map-key` attribute on `<body>`.

- [ ] **Create `frontend/evidence/maps/roman-empire.html`** — Map page pre-selected to `roman-empire`. Title: "Roman Empire — The Jesus Website", meta description for the region. `<body data-map-key="roman-empire">`. File: `frontend/evidence/maps/roman-empire.html` — created

- [ ] **Create `frontend/evidence/maps/levant.html`** — Map page pre-selected to `levant`. `<body data-map-key="levant">`. File: `frontend/evidence/maps/levant.html` — created

- [ ] **Create `frontend/evidence/maps/galilee.html`** — Map page pre-selected to `galilee`. `<body data-map-key="galilee">`. File: `frontend/evidence/maps/galilee.html` — created

- [ ] **Create `frontend/evidence/maps/judea.html`** — Map page pre-selected to `judea`. `<body data-map-key="judea">`. File: `frontend/evidence/maps/judea.html` — created

- [ ] **Create `frontend/evidence/maps/jerusalem.html`** — Map page pre-selected to `jerusalem`. `<body data-map-key="jerusalem">`. File: `frontend/evidence/maps/jerusalem.html` — created

### Phase 2 — Zoom-variant pages (5 files)

Each zoom page is identical to its parent region page but adds `data-map-zoom="2"` on `<body>`. The maps JS reads this attribute to apply an initial 2× zoom centred on the region.

- [ ] **Create `frontend/evidence/maps/roman-empire/zoom-roman-empire.html`** — Roman Empire at 2× zoom. Creates the `roman-empire/` directory. `<body data-map-key="roman-empire" data-map-zoom="2">`. File: `frontend/evidence/maps/roman-empire/zoom-roman-empire.html` — created

- [ ] **Create `frontend/evidence/maps/levant/zoom-levant.html`** — Levant at 2× zoom. Creates the `levant/` directory. File: `frontend/evidence/maps/levant/zoom-levant.html` — created

- [ ] **Create `frontend/evidence/maps/galilee/zoom-galilee.html`** — Galilee at 2× zoom. Creates the `galilee/` directory. File: `frontend/evidence/maps/galilee/zoom-galilee.html` — created

- [ ] **Create `frontend/evidence/maps/judea/zoom-judea.html`** — Judea at 2× zoom. Creates the `judea/` directory. File: `frontend/evidence/maps/judea/zoom-judea.html` — created

- [ ] **Create `frontend/evidence/maps/jerusalem/zoom-jerusalem.html`** — Jerusalem at 2× zoom. Creates the `jerusalem/` directory. File: `frontend/evidence/maps/jerusalem/zoom-jerusalem.html` — created

### Phase 3 — JS awareness of data-map-key and data-map-zoom

- [ ] **Update `frontend/assets/js/maps/maps-render.js`** — On page load, read `document.body.dataset.mapKey` and `document.body.dataset.mapZoom`. If `mapKey` is set, pre-select that region in the map selector and load it immediately (instead of waiting for user interaction). If `mapZoom` is set, apply that zoom factor after the region loads. Existing `[map_key].html` dynamic template behaviour is unaffected. File: `frontend/assets/js/maps/maps-render.js` — modified

- [ ] **Update `frontend/assets/js/maps/maps-data.js`** — If `mapKey` is set via the data attribute, use it as the default map to fetch on initial load. File: `frontend/assets/js/maps/maps-data.js` — modified

## Files touched
- `frontend/evidence/maps/roman-empire.html` — created
- `frontend/evidence/maps/levant.html` — created
- `frontend/evidence/maps/galilee.html` — created
- `frontend/evidence/maps/judea.html` — created
- `frontend/evidence/maps/jerusalem.html` — created
- `frontend/evidence/maps/roman-empire/zoom-roman-empire.html` — created
- `frontend/evidence/maps/levant/zoom-levant.html` — created
- `frontend/evidence/maps/galilee/zoom-galilee.html` — created
- `frontend/evidence/maps/judea/zoom-judea.html` — created
- `frontend/evidence/maps/jerusalem/zoom-jerusalem.html` — created
- `frontend/assets/js/maps/maps-render.js` — modified
- `frontend/assets/js/maps/maps-data.js` — modified

## Notes
- **No new CSS or JS files needed.** The region/zoom pages reuse the existing maps CSS (`maps-list.css`, `maps-region.css`, `maps-view.css`) and JS (`maps-render.js`, `maps-data.js`, `maps-interactions.js`). Only two small patches to the existing JS.
- **Duplicate structure is intentional (SR-1):** Each region page is a separate file because each represents a distinct navigable URL. They share ~95% of their HTML structure. Copying is simpler and faster than JS-based routing.
- **The `[map_key].html` template remains:** The dynamic template handles generic map URLs. The new region pages are SEO-friendly canonical URLs. Both routes work — the region pages just pre-select a map.
- **No automated tests:** These are pure HTML pages with minimal new JS (two data-attribute reads). Existing maps tests cover coordinate mapping and pin logic.
