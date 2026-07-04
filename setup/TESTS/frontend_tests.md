# Frontend Tests — Manual Validation Checklist

## Validation: Frontend Timeline Era & Zoom Pages
**Plan:** frontend-timeline-zoom-pages.md
**Date:** 2026-06-30

### Manual checks
- [ ] Open `frontend/evidence/timeline/beginning.html` — timeline renders, "beginning" era chip is selected by default, only beginning-era event dots visible (PreIncarnation–LifeTemptation)
- [ ] Open `frontend/evidence/timeline/middle.html` — "middle" era chip selected, only middle-era events visible (GalileeCallingTwelve–JudeanFinalJourney)
- [ ] Open `frontend/evidence/timeline/ending.html` — "ending" era chip selected, only ending-era events visible (PassionPalmSunday–ReturnOfJesus)
- [ ] Open `frontend/evidence/timeline/beginning/zoom-beginning.html` — beginning era at 2× zoom, event dots are spaced wider along the axis
- [ ] Open `frontend/evidence/timeline/middle/zoom-middle.html` — middle era at 2× zoom
- [ ] Open `frontend/evidence/timeline/ending/zoom-ending.html` — ending era at 2× zoom
- [ ] On any era page, click a different era chip — the timeline switches eras (pre-filter is not a lock)
- [ ] Empty state: if no events exist for an era, the timeline renders without errors (no JS crashes)

### Code-review checks
- [ ] **HTML-1** — Every page has `<main>`, `<nav>` in the sidebar, a single `<h1>`, and semantic structure consistent with `timeline/index.html`
- [ ] **HTML-3** — Exactly one `<h1>` per page, no skipped heading levels
- [ ] **HTML-4** — CSS `<link>` in `<head>`, JS `<script defer>` at bottom
- [ ] **JS-5** — No raw `fetch()` in the JS changes; all data fetched through `api.js`
- [ ] **JS-3** — No `var` in any JS additions to `timeline-render.js` or `timeline-data.js`
- [ ] **SR-1** — Each era page contains only its own HTML; no combined multi-era file

---

## Validation: Frontend Map Region & Zoom Pages
**Plan:** frontend-map-region-pages.md
**Date:** 2026-06-30

### Manual checks
- [ ] Open `frontend/evidence/maps/roman-empire.html` — "Roman Empire" map loads with pins visible, map selector shows "Roman Empire" pre-selected
- [ ] Open `frontend/evidence/maps/levant.html` — Levant map loads pre-selected
- [ ] Open `frontend/evidence/maps/galilee.html` — Galilee map loads pre-selected
- [ ] Open `frontend/evidence/maps/judea.html` — Judea map loads pre-selected
- [ ] Open `frontend/evidence/maps/jerusalem.html` — Jerusalem map loads pre-selected
- [ ] Open each zoom variant (e.g. `roman-empire/zoom-roman-empire.html`) — map loads at 2× zoom centred on the region
- [ ] Click a pin on any region page — pin popup/tooltip appears, "View Evidence" link works
- [ ] Switch to a different region using the map selector — other regions load correctly from any starting page
- [ ] Empty state: if a region has no pins, the map renders without errors

### Code-review checks
- [ ] **HTML-1** — Semantic structure, single `<main>`, appropriate `<nav>` sidebar
- [ ] **HTML-3** — One `<h1>` per page, no skipped levels
- [ ] **HTML-4** — CSS in `<head>`, JS `defer` at bottom
- [ ] **JS-5** — No raw `fetch()`; `maps-data.js` already uses `api.js`
- [ ] **JS-3** — No `var` in JS modifications
- [ ] **SR-1** — Each region page is a single file; no combined multi-region file

---

## Validation: Frontend Resource List & Historiography Pages
**Plan:** frontend-resource-and-historiography-pages.md
**Date:** 2026-06-30

### Manual checks
- [ ] Open `frontend/resources/list-1.html` — resource list renders with category 1 items (ordered list with ordinal numbers, titles, descriptions)
- [ ] Open `frontend/resources/list-2.html` — category 2 items render
- [ ] Open `frontend/resources/list-3.html` — category 3 items render
- [ ] Category navigation chips show the active category highlighted on each `list-N.html` page
- [ ] Click a different category chip — navigates to the correct `list-N.html`
- [ ] Open `frontend/debate/historiography.html` — ranked card list of historiography articles renders with rank numbers, titles, excerpts, and "Read" links
- [ ] Empty state: if no items exist, a helpful empty-state message appears instead of a blank page

### Code-review checks
- [ ] **HTML-1** — Semantic `<ol>` for resource lists, `<article>`/`<section>` for historiography cards
- [ ] **HTML-3** — One `<h1>` per page
- [ ] **HTML-4** — CSS in `<head>`, JS `defer`
- [ ] **JS-5** — All API calls through `api.js`
- [ ] **JS-3** — No `var` in `resources.js` or `historiography-list.js`
- [ ] **JS-6** — No `innerHTML` with API data; build DOM elements with `document.createElement`
- [ ] **SR-1** — Resource pages are one file each; historiography listing is a single file

---

## Validation: Admin Resource Topic Pages
**Plan:** admin-resource-topic-pages.md
**Date:** 2026-06-30

### Manual checks
- [ ] Open `admin/resources/sermons-and-sayings.html` — draggable ranked list renders, items can be reordered by drag, inline editing works on title/URL
- [ ] Spot-check 3 additional pages (e.g. `parables.html`, `manuscripts.html`, `world-events.html`) — each shows the correct category's items
- [ ] On `admin/resources/index.html`, the category selector dropdown navigates to all 14 topic pages
- [ ] "Add Item" button appends a blank row that can be filled in and saved
- [ ] Delete button on a row removes the item (with confirmation)
- [ ] Drag-to-reorder persists after page reload (positions are saved to the API)
- [ ] Empty state: a category with no items shows a helpful empty message
- [ ] Auth guard: accessing any page without a session redirects to `auth/login.html`

### Code-review checks
- [ ] **HTML-1** — Admin shell structure: `<html class="admin-app">`, admin sidebar, main content area
- [ ] **HTML-3** — One `<h1>` per page (category name)
- [ ] **HTML-4** — `admin.css` in `<head>`, JS scripts with `defer` at bottom
- [ ] **JS-5** — All API calls through `Admin.api` (already centralised in `admin.js`)
- [ ] **JS-3** — No `var` in any inline JS
- [ ] **JS-6** — No `innerHTML` with API data
- [ ] **SR-1** — Each resource topic page is a single file
- [ ] **CSS-1** — No new CSS files; inline `<style>` reused from `index.html`

---

## Validation: Journal Article Metadata Columns
**Plan:** journal-article-metadata-columns.md
**Date:** 2026-07-02

### Manual checks
- [ ] After migration + a `two_column = 1` essay exists, open its `contextual-essays/[slug].html` page at ≥1280px width — the body renders in two CSS columns with a visible rule between them; the title block and abstract stay single-column
- [ ] Resize the same page below 1280px — reverts to single column
- [ ] A block quote or figure inside a two-column essay spans the full width (`column-span: all`), not squeezed into one column
- [ ] An essay/response/historiography item with `doi` set shows "DOI: &lt;value&gt;" above the abstract; one with `doi` empty shows nothing (the element stays `hidden`)
- [ ] An item with `author_bio` set shows the bio (italic, truncated to 2 lines) below the byline; one without shows nothing
- [ ] Repeat the DOI/author-bio checks on a response page (`debate/responses/[slug].html`) and a historiography page (`debate/historiography/[slug].html`) — same rendering, since all three share the same detail-page pattern
- [ ] View source on a two-column essay page confirms `class="journal-article two-column"` is present on `#essay-content`

### Code-review checks
- [ ] **CSS-1** — `journal-body.css` stays at or below its pre-plan line count; the two-column rule lives entirely in the new `journal-two-column.css`, itself under 150 lines
- [ ] **CSS-2** — the new file uses `var(--space-2xl)` / `var(--border)`, no hardcoded values
- [ ] The `@media (min-width: 1280px)` breakpoint matches Style_guide.md §4's `xl` breakpoint, not a hardcoded different value
- [ ] `journal-two-column.css` is reachable from every journal detail page via a direct `<link>` tag (see `frontend-integrity-and-api-hardening.md`, which fixed the broken `pages/journal.css` link these pages used and removed the unused `main.css` this checklist item originally referenced)
- [ ] No changes to `essay-detail.js` / `response-detail.js` / `historiography-detail.js` — confirm this plan did NOT touch them, since their `two_column`/`doi`/`author_bio` handling already existed before this plan

---

## Validation: Frontend Integrity & API Hardening (Frontend)
**Plan:** frontend-integrity-and-api-hardening.md
**Date:** 2026-07-02

### Manual checks
- [ ] Open `frontend/contextual-essays/[slug].html` for a real essay — the journal title block, abstract, reading column, and footnotes/bibliography all render styled (serif headings, centred title block, hanging-indent bibliography), not browser-default text
- [ ] Repeat for `frontend/debate/responses/[slug].html` — additionally confirm the "In response to:" challenge-reference row and strength-indicator dots are styled
- [ ] Repeat for `frontend/debate/historiography/[slug].html`
- [ ] Open `frontend/contextual-essays/index.html` and `frontend/debate/historiography/index.html` — the page header (title + description) has proper spacing, not cramped default browser text
- [ ] `curl -I http://localhost:8000/assets/css/main.css` (or equivalent static server) — 404, confirming the deleted file isn't silently expected anywhere
- [ ] Run the site's full page set through a broken-link/asset check (or spot-check 5+ pages in DevTools Network tab) — no other page 404s on a stylesheet after `main.css`'s removal
- [ ] View source on any two-column essay — the `.two-column` rule appears exactly once across all loaded stylesheets (search DevTools' combined CSS for `.journal-article.two-column`)
- [ ] Search for a term that matches an essay, a response, and a blog post — all three show their real titles in results, not "Untitled"
- [ ] Click a response search result — lands on the actual response detail page, not a 404

### Code-review checks
- [ ] HTML-4 — CSS `<link>` tags remain in `<head>` on every edited HTML file
- [ ] CSS-1 — `journal-body.css` is shorter after removing the duplicated two-column block, not longer
- [ ] No file in the repo still references `main.css` (grep confirms zero hits post-deletion)

---

## Validation: Markup Corruption Cleanup (Frontend)
**Plan:** markup-corruption-cleanup.md
**Date:** 2026-07-02

### Manual checks
- [ ] View source on all 23 fixed frontend pages — each `<title>` and `<meta name="description">` reads as a single clean sentence, no visible `</title>` fragments in the tag soup
- [ ] Browser tab title on each fixed page matches its intended text exactly (spot-check against the "correct" text in the plan)
- [ ] `frontend/contextual-essays/index.html`, `frontend/debate/historiography/index.html`, `frontend/debate/index.html`, `frontend/debate/academic-challenges.html`, `frontend/debate/wikipedia.html`, `frontend/resources/index.html`, `frontend/news-and-blog/index.html`, `frontend/news-and-blog/blog/index.html`, `frontend/news-and-blog/news/index.html` — the visible page heading (`<h2>` on essays/historiography, `<h1>` on the others) reads correctly and matches the intended title with no stray words or split mid-sentence
- [ ] The description paragraph below each of those headings reads as one complete, grammatically correct sentence (no text stranded outside its `<p>`)
- [ ] View source on the pages with a fixed HTML comment (`frontend/debate/academic-challenges.html`, `frontend/debate/historiography.html`, `frontend/debate/index.html`, `frontend/debate/wikipedia.html`) — the "Off-canvas navigation sidebar" comment reads cleanly, no stray closing tag inside it
- [ ] `frontend/debate/responses/[slug].html` — the strength-indicator dots (`#response-strength-dots`) still render correctly for a response with a `strength` value set
- [ ] `frontend/evidence/maps/jerusalem.html`, `judea.html`, `roman-empire.html`, `galilee.html` — each page's meta description reads correctly and the page still loads its map view (confirms the `<meta>`/attribute fixes didn't break the tag)
- [ ] Run this project's SEO/meta checker if one exists, or manually inspect `document.title` and `document.querySelector('meta[name="description"]').content` in the console on 5+ fixed pages — both return the clean, intended text

### Code-review checks
- [ ] Every fixed line has exactly one occurrence of the tag that was duplicated/spliced (grep the specific fixed file for the tag name to confirm no residual duplicate)
- [ ] No fix accidentally removed or altered adjacent, unrelated markup — diff each file against its pre-fix version and confirm the change is minimal (ideally single-line)
- [ ] `frontend/news-and-blog/blog/[slug].html` and `frontend/news-and-blog/news/[slug].html` still have their second, visible `<h1>` — confirm it was NOT removed as a side effect (the plan explicitly scopes it out)
- [ ] HTML-3 — no page ends up with more than the one `<h1>` it's supposed to have as a result of these fixes (except the two files noted above, which are pre-existing and out of scope)
- [ ] Re-run the plan's detection sweep (see its Verification task) — zero hits across all `frontend/*.html` files

## Validation: Frontend Render Bug Fixes
**Plan:** frontend-render-bug-fixes.md
**Date:** 2026-07-03

### Manual checks
- [ ] Open `/evidence/` — cards render as real cards (title, description, badges), NOT literal `<h3 class="card-title">...` text. This is the headline symptom of the double-escape bug.
- [ ] Open `/news-and-blog/blog/` and `/contextual-essays/` list pages — cards render correctly (same check).
- [ ] Open `/evidence/search.html`, type a query — result cards render, and the highlighted match term appears as a real `<mark>` (yellow highlight), not literal `<mark>` text.
- [ ] Open `/debate/` — the ranked challenge list renders summaries and category badges as markup, not escaped text.
- [ ] Open a blog post whose body contains `[figure src="..." caption="..."]` and `[pullquote]...[/pullquote]` — the figure renders as an `<img>` with caption and the pull-quote as an `<aside>`, not raw shortcode text. Repeat for an essay, a historiography article, and a response.
- [ ] Open a blog post titled with an ampersand (e.g. "Faith & History") — the browser tab title and the `og:title` show `Faith & History`, not `Faith &amp; History`. Repeat spot-check on an essay, evidence, news, challenge, historiography, and response detail page.
- [ ] Confirm a card/title containing a real `<` or `"` from the DB is still escaped (no HTML injection) — the SafeString fix must not disable escaping of untrusted values.
- [ ] `GET /search?q=jesus&type=constructor` returns `200` with `[]` (or a normal result set), NOT a 500.
- [ ] `POST /analytics` with `{"page": 123}` returns `400`, not `500`.

### Code-review checks
- [ ] JS-6 — `templates.js` still escapes every non-`SafeString` interpolation; `raw()` is only applied to code-produced HTML or the server-generated FTS snippet, never to a raw user value.
- [ ] JS-2 — `search.model.js` `searchOne` and `api/routes/search.js` both guard the `type` with `Object.hasOwn`; neither can build SQL against an `undefined` table.
- [ ] JS-2 — `api/routes/analytics.js` rejects a non-string `page` before any length check or DB call.
- [ ] The `escapeHTML(...)` call inside `evidence-detail.js`'s linked-items `innerHTML` block is left intact (that one is a legitimate sink); only the `applySEO` title pre-escape is removed.
- [ ] The four `parse*Body` fixes match shortcodes against raw text before escaping; surrounding prose is still escaped (no XSS regression from user body content).

## Validation: Agent-Friendly Frontend (Frontend portion)
**Plan:** agent-friendly-frontend.md
**Date:** 2026-07-03

### Manual checks
- [ ] `curl https://<host>/llms.txt` returns a readable guide listing the public JSON endpoints with example requests; every endpoint listed actually responds.
- [ ] `curl -s https://<host>/news-and-blog/blog/<slug>` (no JS) shows a sensible static `<title>`/`og:title`/`og:description`/`og:image` in `<head>` before any script runs.
- [ ] View source (JS disabled) on each detail template — the `<noscript>` block is present, semantic, and points to the item's JSON endpoint and `/llms.txt`.
- [ ] With JS enabled, `setSEO` still upgrades the meta per-item (the static defaults are a fallback, not a ceiling).
- [ ] Paste a detail URL into a link-preview tool (or Slack/Discord) — a title and image now unfurl instead of a blank skeleton.

### Code-review checks
- [ ] HTML-3 — the `<noscript>` fallback introduces no second `<h1>` on any detail template.
- [ ] HTML-2 — any `<img>` in the default OG/noscript markup has a real `alt`.
- [ ] HTML-1 — `<noscript>` content uses semantic elements, not bare `<div>`s.
- [ ] The static default `og:*` tags do not duplicate or conflict with the tags `setSEO` sets at runtime (same property names, so runtime overwrites cleanly).

## Validation: Public API Rate Limiting (Frontend portion)
**Plan:** public-api-rate-limiting.md
**Date:** 2026-07-03

### Manual checks
- [ ] `curl https://<host>/robots.txt` shows the advisory `Crawl-delay` line and the existing `Sitemap:` line still points at the generated `sitemap.xml`.

### Code-review checks
- [ ] `robots.txt` `Crawl-delay` is documented (in-file comment or plan) as advisory only, not a security control.

## Validation: Pre-Launch Code Bug Fixes (evidence-detail escaping)
**Plan:** prelaunch-bug-fixes.md
**Date:** 2026-07-03

### Manual checks
- [ ] Open an evidence detail page whose related-evidence link title contains an ampersand (e.g. "Pilate & Rome") — the rendered link text shows a literal `&`, not `&amp;`.
- [ ] Related-evidence links still resolve to `/evidence/single/<slug>` correctly.
- [ ] A title containing `<` or `"` still renders safely (escaped exactly once, no raw HTML injection) — the `html` template still escapes; only the redundant inner `escapeHTML` is removed.

### Code-review checks
- [ ] JS-6 — interpolated values inside the `html` tagged template are escaped exactly once; no `escapeHTML()` wraps values already passed through `html`.
- [ ] The change is limited to the related-evidence list block; other renders are untouched.
