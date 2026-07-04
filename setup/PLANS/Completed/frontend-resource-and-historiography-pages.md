# Plan: Frontend Resource List & Historiography Pages

**Module(s):** Frontend
**Date:** 2026-06-30
**Status:** ✅ Completed

## Goal
Create the 3 remaining resource category list pages (`list-1.html`, `list-2.html`, `list-3.html`) and a historiography listing page (`historiography.html`). The resource pages render curated ranked lists for specific resource categories. The historiography page lists available historiography articles. Completes the frontend resources and debate sections of the sitemap.

## Coding rules to keep in mind
- **HTML-1** — Semantic structure. Resource pages: `<main>`, `<nav>`, `<section>`, ordered `<ol>`. Historiography: `<main>`, `<article>`.
- **HTML-2** — No images expected on these pages; any decorative SVGs get `aria-hidden="true"`.
- **HTML-3** — One `<h1>` per page. Resource pages: category title. Historiography: "Historiography".
- **HTML-4** — CSS in `<head>`, JS at bottom with `defer`. Reuse existing CSS/JS.
- **SR-1** — Each page is a single file. One file per resource category; one file for historiography listing.
- **JS-5** — All data fetching through `api.js`. Resource pages load `resources.js`; historiography loads the debate/historiography JS bundle.
- **CSS-1** — Resource pages reuse `resources.css` (already exists). Historiography reuses the existing historiography page CSS. No new CSS files needed.
- **JS-3** — All new JS uses `const`/`let`, never `var`.

## Tasks

### Phase 1 — Resource category list pages (3 files)

Each resource list page follows the same pattern as the existing `frontend/resources/list.html` but filters to a specific resource category. The pages carry a `data-category` attribute on `<body>` that `resources.js` reads to fetch and render the correct category.

- [x] **Create `frontend/resources/list-1.html`** — Resource list page for category 1 (`data-category="sermons-and-sayings"`). Page-specific `<title>`, `<meta>`, and `<h1>`. Follows the exact HTML structure of `resources/list.html`. File: `frontend/resources/list-1.html` — created

- [x] **Create `frontend/resources/list-2.html`** — Resource list for category 2 (`data-category="parables"`). Same structure, different category. File: `frontend/resources/list-2.html` — created

- [x] **Create `frontend/resources/list-3.html`** — Resource list for category 3 (`data-category="objects"`). Same structure, different category. File: `frontend/resources/list-3.html` — created

- [x] **Update `frontend/assets/js/resources.js`** — On page load, read `document.body.dataset.category` as a fallback when no `?key=` URL param is present. Category nav chips remain unchanged (they link to `list.html?key=…`). File: `frontend/assets/js/resources.js` — modified

### Phase 2 — Historiography listing page (1 file)

- [x] **Create `frontend/debate/historiography.html`** — A listing page for historiography articles. Uses the card-grid pattern from `debate/historiography/index.html`, loading the existing `historiography-list.js` module. Page-specific `<title>`, `<meta>`, and `<h1>`. Includes a brief explanatory paragraph below the `<h2>` header. File: `frontend/debate/historiography.html` — created

- [x] **`frontend/assets/js/historiography-list.js` already exists** — The existing module at `frontend/assets/js/historiography-list.js` handles fetching, card rendering, sessionStorage caching, and infinite scroll. No changes needed — the new page references it directly. File: `frontend/assets/js/historiography-list.js` — unmodified (already exists)

## Files touched
- `frontend/resources/list-1.html` — created
- `frontend/resources/list-2.html` — created
- `frontend/resources/list-3.html` — created
- `frontend/assets/js/resources.js` — modified
- `frontend/debate/historiography.html` — created
- `frontend/assets/js/historiography-list.js` — created (or existing file modified if logic already exists elsewhere)

## Notes
- **No new CSS files.** Resource pages reuse `resources.css`. Historiography reuses the debate/historiography CSS already on disk. The Style Guide §9 confirms Resources Lists and Historiography pages follow established patterns with no unique styles.
- **Resource categories:** The three `list-N.html` pages map to specific resource categories (e.g. `list-1` = "Sermons & Sayings", `list-2` = "Parables & Objects", `list-3` = "People & Sites"). The exact category-to-number mapping should be documented in the `resources.js` module. The numeric naming (`list-1`, `list-2`, `list-3`) matches the sitemap. The `<h1>` and `<title>` should use the human-readable category name.
- **Historiography pattern:** The Style Guide §9 specifies that historiography pages use `journal.css` for detail pages, but the **listing** page (`historiography.html`) is a ranked list — same card pattern as challenges. The existing `historiography/` directory on disk has an `index.html` and `[slug].html`; the new `historiography.html` at the `debate/` level is the listing page that sits alongside `popular-challenges.html` and `academic-challenges.html`.
- **No automated tests:** Pure HTML pages with trivial JS additions (data-attribute reads). Existing frontend tests don't cover listing pages.
