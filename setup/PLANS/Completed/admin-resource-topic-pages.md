# Plan: Admin Resource Topic Pages

**Module(s):** Admin
**Date:** 2026-06-30
**Status:** ✅ Plan implemented

## Goal
Create the 14 missing admin resource topic sub-pages (`sermons-and-sayings.html`, `parables.html`, `objects.html`, etc.). Each page is a per-category drag-to-reorder list management interface, reusing the existing `admin-ranking.js` drag-to-rank system and following the pattern already established in `admin/resources/index.html`. Completes the admin resources section of the sitemap.

## Coding rules to keep in mind
- **HTML-1** — Admin-specific semantics: the admin shell uses its own layout (`admin-app` class on `<html>`).
- **HTML-3** — One `<h1>` per page: the resource category name.
- **HTML-4** — CSS in `<head>` (`admin.css`), JS at bottom with `defer`. All admin pages load the same CSS/JS bundle.
- **SR-1** — One file per resource category. No unrelated logic bundled.
- **JS-5** — All admin data fetching through `Admin.api` (already centralised in `admin.js`). These pages call `Admin.api.get('/resources?category=X')`.
- **JS-3** — Use `const`/`let`, never `var`.
- **JS-6** — Never use `innerHTML` with API data. Build DOM elements with `document.createElement`. The existing `admin-ranking.js` already does this.
- **CSS-1** — No new CSS files. The inline `<style>` block already present in `admin/resources/index.html` handles the draggable row styles. Each new page includes the same block.

## Tasks

### Phase 1 — Create resource topic pages (14 files)

Each page follows the identical structure of the existing `admin/resources/index.html` but with a page-specific `<h1>` title and a `data-resource-category` attribute on `<body>` that tells the JS which category to load. The `<script>` at the bottom loads the same `auth.js`, `admin.js`, and `admin-ranking.js` and calls the shared render function with the category slug.

- [ ] **Create `admin/resources/sermons-and-sayings.html`** — Draggable ranked list for sermons and sayings. `<body data-resource-category="sermons-and-sayings">`. Page `<title>`: "Sermons & Sayings — Admin". File: `admin/resources/sermons-and-sayings.html` — created

- [ ] **Create `admin/resources/parables.html`** — Draggable ranked list for parables. `<body data-resource-category="parables">`. File: `admin/resources/parables.html` — created

- [ ] **Create `admin/resources/objects.html`** — Draggable ranked list for objects. `<body data-resource-category="objects">`. File: `admin/resources/objects.html` — created

- [ ] **Create `admin/resources/people.html`** — Draggable ranked list for people. `<body data-resource-category="people">`. File: `admin/resources/people.html` — created

- [ ] **Create `admin/resources/sites.html`** — Draggable ranked list for sites. `<body data-resource-category="sites">`. File: `admin/resources/sites.html` — created

- [ ] **Create `admin/resources/ot-verses.html`** — Draggable ranked list for OT verses. `<body data-resource-category="ot-verses">`. File: `admin/resources/ot-verses.html` — created

- [ ] **Create `admin/resources/internal-witnesses.html`** — Draggable ranked list for internal witnesses. `<body data-resource-category="internal-witnesses">`. File: `admin/resources/internal-witnesses.html` — created

- [ ] **Create `admin/resources/external-witnesses.html`** — Draggable ranked list for external witnesses. `<body data-resource-category="external-witnesses">`. File: `admin/resources/external-witnesses.html` — created

- [ ] **Create `admin/resources/places.html`** — Draggable ranked list for places. `<body data-resource-category="places">`. File: `admin/resources/places.html` — created

- [ ] **Create `admin/resources/world-events.html`** — Draggable ranked list for world events. `<body data-resource-category="world-events">`. File: `admin/resources/world-events.html` — created

- [ ] **Create `admin/resources/miracles.html`** — Draggable ranked list for miracles. `<body data-resource-category="miracles">`. File: `admin/resources/miracles.html` — created

- [ ] **Create `admin/resources/events.html`** — Draggable ranked list for events. `<body data-resource-category="events">`. File: `admin/resources/events.html` — created

- [ ] **Create `admin/resources/apologetics.html`** — Draggable ranked list for apologetics. `<body data-resource-category="apologetics">`. File: `admin/resources/apologetics.html` — created

- [ ] **Create `admin/resources/manuscripts.html`** — Draggable ranked list for manuscripts. `<body data-resource-category="manuscripts">`. File: `admin/resources/manuscripts.html` — created

### Phase 2 — Update admin/resources/index.html selector links

- [ ] **Update `admin/resources/index.html`** — The category selector dropdown at the top of the page currently navigates between categories. Ensure every `<option>` links to the correct new page (e.g. `sermons-and-sayings.html`, `parables.html`, etc.) via `onchange="window.location.href=this.value"` or equivalent. File: `admin/resources/index.html` — modified

## Files touched
- `admin/resources/sermons-and-sayings.html` — created
- `admin/resources/parables.html` — created
- `admin/resources/objects.html` — created
- `admin/resources/people.html` — created
- `admin/resources/sites.html` — created
- `admin/resources/ot-verses.html` — created
- `admin/resources/internal-witnesses.html` — created
- `admin/resources/external-witnesses.html` — created
- `admin/resources/places.html` — created
- `admin/resources/world-events.html` — created
- `admin/resources/miracles.html` — created
- `admin/resources/events.html` — created
- `admin/resources/apologetics.html` — created
- `admin/resources/manuscripts.html` — created
- `admin/resources/index.html` — modified

## Notes
- **No new CSS or JS files.** All 14 pages reuse the existing `admin.css` bundle, `admin.js`, `auth.js`, and `admin-ranking.js`. The inline `<style>` block from `index.html` handles the draggable row appearance. The `admin-ranking.js` module already supports drag-to-reorder and inline editing — it just needs a category slug to know which API endpoint to hit.
- **Duplicate structure is intentional (SR-1):** Each resource category gets its own page because each is a distinct navigable URL in the admin sidebar. They share 98% of their HTML — only the `<h1>`, `<title>`, and `data-resource-category` differ. Copying is simpler than a JS router.
- **`sources.html` was noted in the audit but is NOT in the sitemap under `admin/resources/`.** The sitemap lists `sources.html` under `frontend/resources/` — not admin. Double-check the sitemap before creating this one. If it's a sitemap error, skip this file.
- **Category mapping:** The `data-resource-category` value should match the category slug used by the API (`GET /resources?category=sermons-and-sayings`). Verify the API route `resources.js` supports filtering by category query parameter. If it doesn't yet, add a note to the implementer to add that filter parameter (or handle it client-side by fetching all and filtering).
- **No automated tests:** Pure HTML pages with no new logic. The existing `admin-ranking.js` is already tested via the ranking test suite.
