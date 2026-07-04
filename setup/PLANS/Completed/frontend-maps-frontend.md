# Plan: Maps Frontend — Public Map Views

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build the public map experience: a maps overview page listing the five geographic scales (Roman Empire → Jerusalem), and a single dynamic region page that renders a map image with evidence pins, zoom/pan, hover tooltips, and click-through to evidence detail.

## Coding rules to keep in mind
- **HTML-1** — Use `<main>`, `<section>`, `<nav>`; one `<main>` per page. `<div>` only as styling hooks for the map canvas.
- **HTML-2** — The map background `<img>` needs descriptive `alt` (e.g. "Map of first-century Galilee").
- **HTML-3** — Exactly one (sr-only) `<h1>` per page; visible headings start at `<h2>`.
- **HTML-4** — CSS in `<head>`; map scripts `defer`red at the bottom.
- **CSS-1 / CSS-2 / CSS-4** — Extend `maps.css` only with map-related styles, reference design tokens (no hardcoded colors/spacing), and use semantic class names. Watch the 150-line ceiling — split if exceeded.
- **JS-5** — All fetches go through `api.js`; show a loading state before fetch and an error toast on failure.
- **JS-6** — Delegate pin hover/click from the map container; build pin markup via `dom.js`/`templates.js`, never `innerHTML` with data; remove drag/zoom listeners on teardown.
- **SR-3** — Lazy-load map background images; compute pin positions once, mutate only the container `transform` on zoom/pan.

## Tasks

### Frontend JS (data → render → interactions)

- [x] **Create the maps data module** — fetch helpers over `api.js`: `getAllMaps()` and `getMapByKey(mapKey)` (returns the map plus its embedded `pins`). File: `frontend/assets/js/maps/maps-data.js`
- [x] **Create the maps render module** — render the overview grid (one card per map, linking to `[map_key].html`) and render a single map's background image with pins absolutely positioned from each pin's `x`/`y` percentage; include loading skeleton and empty state. File: `frontend/assets/js/maps/maps-render.js`
- [x] **Create the maps interactions module** — zoom/pan on the map container (transform-based, clamped), pin hover tooltip, and click-a-pin → open the linked evidence detail page in a new tab; uses event delegation. File: `frontend/assets/js/maps/maps-interactions.js`

### Frontend HTML

- [x] **Create the maps overview page** — semantic page with breadcrumb + invisible header that loads `maps-data` + `maps-render` to list the five maps. File: `frontend/evidence/maps/index.html`
- [x] **Create the dynamic map region page** — reads `map_key` from the URL (via `utils/router.js`), fetches that map, and renders image + pins + zoom/pan. File: `frontend/evidence/maps/[map_key].html`

### CSS

- [x] **Extend the maps page styles** — add the overview card grid, the zoom/pan control bar, and region-nav styling on top of the existing pin/tooltip rules, all via tokens. File: `frontend/assets/css/pages/maps.css`

## Files touched
- `frontend/assets/js/maps/maps-data.js` — created
- `frontend/assets/js/maps/maps-render.js` — created
- `frontend/assets/js/maps/maps-interactions.js` — created
- `frontend/evidence/maps/index.html` — created
- `frontend/evidence/maps/[map_key].html` — created
- `frontend/assets/css/pages/maps.css` — modified
- `frontend/assets/js/api.js` — modified (added `getMapByKey`)

## Notes
- **Route-structure divergence from `Website_guide.md`:** the Website guide lists eleven static map pages (`roman-empire.html`, `levant.html`, … each with a `zoom-*.html` variant). Following `Style_guide.md` §9 "Map View" and the existing dynamic `[slug].html` convention, this plan uses **one dynamic `[map_key].html` with JS zoom/pan** instead of static + zoom pages. This mirrors the timeline decision (Issues.md #3) and is logged as a new issue.
- **Depends on `maps-api.md`** — the overview and region pages need the seeded maps and (eventually) pin data from the API. `GET /maps` and `GET /maps/:map_key` already exist.
- The `map_location` enum value `'theme'` has no geographic map; the overview lists only the five real maps.
- Map background images (`/assets/images/maps/<map_key>.webp`) are content assets supplied separately — not created here.
- **No automated-test task:** per the GenerateAPlan rule, automated tests are mandatory only for `.js` under `api/`, `admin/`, or `mcp-server/`. The project has no test harness for frontend vanilla JS; correctness is covered by the manual validation checklist in `setup/TESTS/frontend_tests.md`.
- **SR-2:** prefer a vanilla transform-based pan/zoom; a small display library is permissible (Style guide allows libraries for the visual displays) but only if vanilla proves insufficient.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
