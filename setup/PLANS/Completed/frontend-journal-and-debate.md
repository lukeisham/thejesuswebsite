# Plan: Frontend Journal and Debate Pages

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Build the contextual essays, historiography articles, individual response pages (all three in journal-article format sharing `journal.css`), plus the debate landing, challenge list pages, challenge detail pages, and Wikipedia ranked-list page.

## Coding rules to keep in mind

- **HTML-1** — Journal pages use `<article>` as the root element; challenge lists use `<main>` with `<ol>` for ranked items.
- **HTML-3** — One visually-hidden `<h1>` per page; visible content begins at `<h2>` (numbered via CSS counters on journal pages).
- **HTML-4** — `journal.css` loaded in `<head>` on all three journal-format page types; no inline styles.
- **JS-2** — Slug-based pages validate the slug before fetching; show "forthcoming" empty state when content is null.
- **JS-5** — All fetches through `api.js`; skeleton shown before data arrives; toast on API failure.
- **JS-6** — Challenge list infinite scroll uses event delegation; response toggling handled with delegation on the challenge detail page.
- **CSS-1** — Each page JS file is paired with the existing page CSS file; no new CSS files for journal content (already covered by `journal.css`, `debate.css`, `challenge-list.css`, `wikipedia-list.css`).
- **CSS-2** — CSS counters for heading numbering defined in `journal.css` using custom properties from `variables.css`.

## Tasks

### HTML — Contextual Essays

- [x] **Create essays list HTML** — List of published essays; card-per-essay layout; infinite scroll sentinel; imports `journal.css`. File: `frontend/contextual-essays/index.html`
- [x] **Create essay detail shell HTML** — JS-routed journal-article shell; `<article>` root; title-block region (h1, byline, date, abstract, keywords); reading column; footnote region; bibliography region; imports `journal.css`. File: `frontend/contextual-essays/[slug].html`

### HTML — Historiography

- [x] **Create historiography list HTML** — List of published historiography articles within the debate section; card-per-article layout; imports `journal.css` and `debate.css`. File: `frontend/debate/historiography/index.html`
- [x] **Create historiography detail shell HTML** — JS-routed journal-article shell identical to essay detail; `schema.org/ScholarlyArticle` JSON-LD injected by `seo.js`; imports `journal.css`. File: `frontend/debate/historiography/[slug].html`

### HTML — Debate section

- [x] **Create debate landing HTML** — Section navigation cards for: Popular Challenges, Academic Challenges, Historiography, Wikipedia; imports `debate.css`. File: `frontend/debate/index.html`
- [x] **Create popular challenges list HTML** — Ranked list with filter chips; infinite scroll sentinel; imports `challenge-list.css`. File: `frontend/debate/popular-challenges.html`
- [x] **Create popular challenge detail shell HTML** — JS-routed shell; `<main>` with challenge title (`h1`), category badge, body column (680 px), and responses list at bottom; imports `challenge-list.css`. File: `frontend/debate/popular-challenges/[slug].html`
- [x] **Create academic challenges list HTML** — Same layout as popular challenges; imports `challenge-list.css`. File: `frontend/debate/academic-challenges.html`
- [x] **Create academic challenge detail shell HTML** — Same layout as popular challenge detail. File: `frontend/debate/academic-challenges/[slug].html`
- [x] **Create Wikipedia ranked list HTML** — Ranked list of Wikipedia articles; no filter bar; infinite scroll sentinel; imports `wikipedia-list.css`. File: `frontend/debate/wikipedia.html`

### HTML — Responses

- [x] **Create response detail shell HTML** — JS-routed journal-article shell; includes "In response to:" challenge reference row and optional strength indicator below keywords; imports `journal.css`. File: `frontend/debate/responses/[slug].html`

### JS — Journal content rendering

- [x] **Create essay-detail JS module** — Fetch essay by slug from `api.js`; render title block (byline, date, DOI if present, abstract, keywords); render body content via `templates.js`; number figures; render footnotes and bibliography; call `setSEO()` with `schema.org/ScholarlyArticle` JSON-LD; show "This essay is forthcoming." if content null. File: `frontend/assets/js/essay-detail.js`
- [x] **Create historiography-detail JS module** — Identical flow to `essay-detail.js`; JSON-LD includes additional `about` property; empty state reads "This historiography article is forthcoming." File: `frontend/assets/js/historiography-detail.js`
- [x] **Create response-detail JS module** — Fetch response by slug; render same journal structure as essays; additionally render "In response to:" challenge card below keywords; render optional strength dot-indicator; empty state: "This response is forthcoming." File: `frontend/assets/js/response-detail.js`
- [x] **Create essays-list JS module** — Fetch paginated essays; render cards; infinite scroll; URL param sync via `router.js`. File: `frontend/assets/js/essays-list.js`
- [x] **Create historiography-list JS module** — Same pattern as `essays-list.js` but fetches from historiography endpoint. File: `frontend/assets/js/historiography-list.js`

### JS — Debate and challenges

- [x] **Create debate JS module** — Render challenge cards with rank number, summary, category badge, response count, and ranking indicators (`+`/`−`); handle filter chips; infinite scroll; support both popular and academic lists by reading a `data-type` attribute on the page `<main>` element. File: `frontend/assets/js/debate.js`
- [x] **Create challenge-detail JS module** — Fetch challenge by slug; render title, body, category badge; fetch and render linked responses as compact cards at page bottom under "Responses" h2; call `setSEO()`. File: `frontend/assets/js/challenge-detail.js`
- [x] **Create wikipedia JS module** — Fetch ranked Wikipedia articles; render each with rank, title (external link + Feather `external-link` icon), last-revised date, and `+`/`−` counts; infinite scroll. File: `frontend/assets/js/wikipedia.js`

## Files touched

- `frontend/contextual-essays/index.html` — created
- `frontend/contextual-essays/[slug].html` — created
- `frontend/debate/index.html` — created
- `frontend/debate/historiography/index.html` — created
- `frontend/debate/historiography/[slug].html` — created
- `frontend/debate/popular-challenges.html` — created
- `frontend/debate/popular-challenges/[slug].html` — created
- `frontend/debate/academic-challenges.html` — created
- `frontend/debate/academic-challenges/[slug].html` — created
- `frontend/debate/wikipedia.html` — created
- `frontend/debate/responses/[slug].html` — created
- `frontend/assets/js/essay-detail.js` — created
- `frontend/assets/js/historiography-detail.js` — created
- `frontend/assets/js/response-detail.js` — created
- `frontend/assets/js/essays-list.js` — created
- `frontend/assets/js/historiography-list.js` — created
- `frontend/assets/js/debate.js` — created
- `frontend/assets/js/challenge-detail.js` — created
- `frontend/assets/js/wikipedia.js` — created

## Notes

- **Dependency**: `frontend-js-foundation` plan must be complete; `utils/figures.js` from `frontend-home-and-evidence` plan must exist before `essay-detail.js` calls `numberFigures()`.
- `journal.css` already exists; no CSS is created by this plan.
- The Website_guide tree shows `historiography.html` as a flat file inside `debate/`; this plan upgrades it to `debate/historiography/index.html` (list) + `debate/historiography/[slug].html` (detail). The sitemap must reflect this structure.
- Response URL structure is `/debate/responses/[slug]` to keep it separate from challenge URLs. This requires the server to serve `debate/responses/[slug].html` for that path.
- `debate.js` serves both popular and academic challenge list pages via a `data-type` attribute to avoid duplicating logic (SR-1 principle applied across similar pages, not within a single file).
- CSS counter numbering for journal headings is defined in `journal.css` (already exists); no JS needed for section numbering.
- No automated tests: all files are in `frontend/`. Manual checklist covers this plan.
- Issue #2 in `Issues.md` (missing `two_column`, DOI, and author-bio columns in schema) affects `essay-detail.js` and `historiography-detail.js`. Those features should render conditionally only when the field exists; the plan marks them as optional renders in those modules.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
