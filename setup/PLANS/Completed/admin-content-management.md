# Plan: Admin Content Management — CRUD Pages

**Module(s):** Admin
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build every admin content-management page on top of the admin shell: drafts, evidence management, collections, resource lists, the Wikipedia ranking, and the journal-style sections (essays, debate responses, blog) plus news. These are table-list + two-column-form pages (and drag-to-reorder ranked lists) wired to the already-built API routes. Adds the shared drag-to-rank script used across the ranked lists.

## Coding rules to keep in mind
- **HTML-1** — Admin shell semantics: `<nav>` sidebar, `<main>` content, `<header>` top bar; tables in `<table>`; forms in `<form>`.
- **HTML-3** — Exactly one `<h1>` per page (the top-bar title).
- **HTML-4** — CSS in `<head>`; scripts `defer`red.
- **HTML-5** — Every edit-form control has a `<label>`; validation errors via `aria-describedby`.
- **JS-2** — Validate inputs before POST/PUT; confirm destructive bulk actions; handle 401 (redirect) and 4xx/5xx (error state) explicitly.
- **JS-5** — All list loads and saves use `async/await` + `try/catch` with loading/error states; raw `fetch` stays in the shared admin helpers, not scattered in pages.
- **JS-6** — Event delegation for row actions and drag handles; remove drag listeners when a row is deleted; never `innerHTML` with content data.
- **CSS-1 / CSS-2** — Reuse the admin component sheets from `admin-foundation`; add page-specific CSS only if a page genuinely needs it, under 150 lines, using `--admin-*` tokens.
- **SR-1** — `admin-ranking.js` does one job (drag-to-rank reorder); page wiring reuses the shared `admin.js` CRUD helpers rather than duplicating fetch logic.

## Tasks

### Shared ranking script

- [x] **Create the drag-to-rank module** — generic drag-to-reorder for list rows: pointer/keyboard reordering, computes the new `sort_order` / rank sequence, and persists via a passed-in save callback (PUT to the relevant route). Pure ordering helper exported for tests. File: `admin/assets/js/admin-ranking.js`

### Drafts

- [x] **Create the drafts list page** — full-width table (Type badge, Title, Created, Updated, Status, Edit link) with a "New Draft" button (§13 Drafts). File: `admin/drafts/index.html`
- [x] **Create the new-draft page** — two-column form (title, content textarea, headings, author/date/publisher left; keywords, publish toggle, related links right) with "Save Draft" / "Publish" actions. File: `admin/drafts/new.html`
- [x] **Create the edit-draft page** — same two-column form pre-filled from `GET /drafts/:id`, saving via PUT and publishing via the publish route. File: `admin/drafts/edit-[id].html`

### Evidence management

- [x] **Create the evidence list page** — filterable table (Title, Category badge, Timeline Period, Map Location, Status, Edit) with category/era/status filter dropdowns (§13 Evidence Management). File: `admin/evidence/index.html`
- [x] **Create the evidence edit page** — two-column form with gospel category, cascading timeline era+period, map x/y, related evidence links, and MLA sources, saving the composite record via the evidence route. File: `admin/evidence/edit-[id].html`
- [x] **Create the evidence bulk page** — checkbox list with bulk publish/unpublish/delete; destructive actions require the admin confirmation modal. File: `admin/evidence/bulk.html`

### Collections

- [x] **Create the collections page** — list/manage education collections (title, description, member evidence) via the collections route. File: `admin/collections/index.html`

### Resources

- [x] **Create the resources manager** — a single page with a `list_key` category selector that loads the chosen list and shows a drag-to-reorder list of rows (inline-editable title + URL + description, drag handle, delete; "Add Item" appends a blank row), persisting via the resources route. File: `admin/resources/index.html`

### Wikipedia

- [x] **Create the Wikipedia ranking page** — drag-to-reorder ranked list (rank position, article title, URL, last-revised date, ± counts) using `admin-ranking.js`, persisting via the wikipedia route (§13 Wikipedia). File: `admin/wikipedia/index.html`

### Essays

- [x] **Create the essays list page** — table (Title, Date, Status, Edit) with a "New" button. File: `admin/essays/index.html`
- [x] **Create the new-essay page** — two-column form (content textarea left; keywords, publish toggle, linked evidence/sources right). File: `admin/essays/new.html`
- [x] **Create the edit-essay page** — same form pre-filled from the essays route, saving via PUT. File: `admin/essays/edit-[id].html`

### Debate (challenges + responses)

- [x] **Create the debate list page** — table of responses/challenges (Title, Date, Status, Edit) with a "New" button. File: `admin/debate/index.html`
- [x] **Create the new-response page** — two-column form with the linked challenge, content, keywords, publish toggle, and linked evidence/sources. File: `admin/debate/new.html`
- [x] **Create the edit-response page** — same form pre-filled from the responses route, saving via PUT. File: `admin/debate/edit-[id].html`

### Blog

- [x] **Create the blog list page** — table (Title, Date, Status, Edit) with a "New" button. File: `admin/blog/index.html`
- [x] **Create the new-blog-post page** — two-column form (content textarea left; keywords, publish toggle, landing-page-display flag, linked evidence right). File: `admin/blog/new.html`
- [x] **Create the edit-blog-post page** — same form pre-filled from the blog-posts route, saving via PUT. File: `admin/blog/edit-[id].html`

### News

- [x] **Create the news manager** — table of link entries (Title, URL, Publisher, Date, Status); "Add Article" opens a modal form (few fields) posting to the news-articles route (§13 News). File: `admin/news/index.html`

### Automated tests

- [x] **Write ranking tests** — `node:test` + `node:assert` unit tests for the pure ordering/`sort_order`-sequence helper in `admin-ranking.js` (reorder up/down, boundary moves, stable sequence). File: `admin/tests/admin-ranking.test.js`

## Files touched
- `admin/assets/js/admin-ranking.js` — created
- `admin/drafts/index.html` — created
- `admin/drafts/new.html` — created
- `admin/drafts/edit-[id].html` — created
- `admin/evidence/index.html` — created
- `admin/evidence/edit-[id].html` — created
- `admin/evidence/bulk.html` — created
- `admin/collections/index.html` — created
- `admin/resources/index.html` — created
- `admin/wikipedia/index.html` — created
- `admin/essays/index.html` — created
- `admin/essays/new.html` — created
- `admin/essays/edit-[id].html` — created
- `admin/debate/index.html` — created
- `admin/debate/new.html` — created
- `admin/debate/edit-[id].html` — created
- `admin/blog/index.html` — created
- `admin/blog/new.html` — created
- `admin/blog/edit-[id].html` — created
- `admin/news/index.html` — created
- `admin/tests/admin-ranking.test.js` — created

## Notes
- **Depends on `admin-foundation`** — every page here uses the admin shell, `admin.css`, `auth.js` session guard, and the shared CRUD helpers in `admin.js`. Build that plan first.
- **Resources consolidation divergence**: Website_guide.md lists 15 separate `admin/resources/*.html` pages (one per `list_key`). The frontend already consolidated its public resource pages into a single dynamic `resources/list.html`; this plan applies the same pattern on the admin side — one `admin/resources/index.html` with a category selector — to avoid 15 near-identical files (DRY / SR-1). Logged to Issues.md for guide reconciliation (same pattern as the timeline/maps consolidations, Issues #3/#4).
- All routes consumed here already exist on disk (`drafts`, `evidence`, `collections`, `resources`, `wikipedia`, `essays`, `responses`, `blog-posts`, `news-articles`, `publish`) from the completed backend data-layer plan.
- **Testability**: page DOM wiring is validated manually via `setup/TESTS/admin_tests.md`; only the pure reorder helper is unit-tested, following the established admin testing precedent.
- The `edit-[id].html` filenames keep the project's literal-bracket convention (the id is resolved client-side via the router), matching the existing `admin/drafts/edit-[id].html` naming in the guide.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
