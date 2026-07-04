# Plan: Frontend Timeline Era & Zoom Pages

**Module(s):** Frontend
**Date:** 2026-06-30
**Status:** ✅ Plan implemented

## Goal
Create 6 frontend timeline sub-era view pages (`beginning.html`, `middle.html`, `ending.html`) and their zoom-variant pages (`zoom-beginning.html`, `zoom-middle.html`, `zoom-ending.html`). These pages render the same interactive timeline as `timeline/index.html` but pre-filtered to a single era, with zoom variants providing deeper magnification. This completes the timeline section of the sitemap.

## Coding rules to keep in mind
- **HTML-1** — Semantic structure: `<main>`, `<nav>`, `<header>`, `<section>`; one `<h1>` per page.
- **HTML-2** — No `<img>` elements on these pages (timeline dots are CSS/SVG), but ensure `alt` attributes if any decorative SVGs are present.
- **HTML-3** — Proper heading hierarchy: exactly one `h1`, consistent with the pattern in existing `timeline/index.html`.
- **HTML-4** — CSS in `<head>`, JS at bottom with `defer`. Reuse the same CSS/JS bundle as the existing timeline page.
- **SR-1** — Each era page is a single file (one file per view). Zoom pages are also single files. No unrelated logic bundled.
- **JS-5** — All data fetching goes through `api.js` — these pages load `timeline-data.js` which already centralises API calls.

## Tasks

### Phase 1 — Era filter pages (3 files)

- [ ] **Create `frontend/evidence/timeline/beginning.html`** — Timeline page pre-filtered to the "beginning" era (PreIncarnation–LifeTemptation). Identical structure to `timeline/index.html` except `<body>` carries `data-initial-era="beginning"` and page-specific `<title>` / `<meta>` / `<h1>`. File: `frontend/evidence/timeline/beginning.html` — created

- [ ] **Create `frontend/evidence/timeline/middle.html`** — Timeline page pre-filtered to the "middle" era (GalileeCallingTwelve–JudeanFinalJourney). Same pattern: `data-initial-era="middle"` with page-specific metadata. File: `frontend/evidence/timeline/middle.html` — created

- [ ] **Create `frontend/evidence/timeline/ending.html`** — Timeline page pre-filtered to the "ending" era (PassionPalmSunday–ReturnOfJesus). Same pattern: `data-initial-era="ending"`. File: `frontend/evidence/timeline/ending.html` — created

### Phase 2 — Zoom-variant pages (3 files)

- [ ] **Create `frontend/evidence/timeline/beginning/zoom-beginning.html`** — Beginning era timeline at increased zoom level (2× the default `--px-per-period` scale). Carries `data-initial-era="beginning"` and `data-initial-zoom="2"` on `<body>`. File: `frontend/evidence/timeline/beginning/zoom-beginning.html` — created

- [ ] **Create `frontend/evidence/timeline/middle/zoom-middle.html`** — Middle era at 2× zoom. `data-initial-era="middle" data-initial-zoom="2"`. File: `frontend/evidence/timeline/middle/zoom-middle.html` — created

- [ ] **Create `frontend/evidence/timeline/ending/zoom-ending.html`** — Ending era at 2× zoom. `data-initial-era="ending" data-initial-zoom="2"`. File: `frontend/evidence/timeline/ending/zoom-ending.html` — created

### Phase 3 — JS awareness of initial-era / initial-zoom

- [ ] **Update `frontend/assets/js/timeline/timeline-render.js`** — On page load, read `document.body.dataset.initialEra` and `document.body.dataset.initialZoom`. If `initialEra` is set, pre-select that era filter chip and zoom to fit its era bands. If `initialZoom` is set, apply that scale factor (default `1`). Existing behaviour unchanged when data attributes are absent. File: `frontend/assets/js/timeline/timeline-render.js` — modified

- [ ] **Update `frontend/assets/js/timeline/timeline-data.js`** — If `initialEra` is set, filter the fetched events client-side to only that era before rendering (the API already returns all events). This avoids redundant API calls. File: `frontend/assets/js/timeline/timeline-data.js` — modified

## Files touched
- `frontend/evidence/timeline/beginning.html` — created
- `frontend/evidence/timeline/middle.html` — created
- `frontend/evidence/timeline/ending.html` — created
- `frontend/evidence/timeline/beginning/zoom-beginning.html` — created
- `frontend/evidence/timeline/middle/zoom-middle.html` — created
- `frontend/evidence/timeline/ending/zoom-ending.html` — created
- `frontend/assets/js/timeline/timeline-render.js` — modified
- `frontend/assets/js/timeline/timeline-data.js` — modified

## Notes
- **No new CSS or JS files needed.** The era/zoom pages reuse the existing timeline CSS (`timeline-view.css`, `timeline-filters.css`, `timeline-labels.css`) and JS (`timeline-render.js`, `timeline-data.js`, `timeline-interactions.js`). Only two small patches to the existing JS to read `data-initial-era` and `data-initial-zoom`.
- **Zoom levels:** The zoom variants use a CSS custom property `--px-per-period` set via inline `<style>` on each page (e.g. `160px` instead of the default `80px`). The existing timeline CSS already reads this property.
- **Duplicate structure is intentional (SR-1):** Each era page is a separate file because each represents a distinct navigable URL in the sitemap. They share 95% of their HTML structure — that's acceptable because the alternative (JS-based routing) would add complexity for no performance gain.
- **Navigation:** The era filter chips on the page header already allow switching between eras. Users arriving at `beginning.html` can still click the "middle" chip to see middle-era events — this is a pre-filter, not a lock.
- **No automated tests:** These are pure HTML pages with no new logic. The JS changes are trivial (reading a data attribute). Existing timeline tests cover the rendering logic.
