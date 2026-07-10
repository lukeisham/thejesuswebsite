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

## Validation: Search Page Redesign
**Plan:** search-page-redesign.md
**Date:** 2026-07-07

### Manual checks
- [ ] Open `frontend/evidence/search.html` — the search input, "All/Evidence/Essays/Responses/Blog" chips, and page content sit inside a centred, padded container (not edge-to-edge).
- [ ] Type a query with results in multiple entity types — result cards render with a white background, shadow, rounded corners, and a hover lift, grouped under labelled headings (e.g. "Evidence (3)").
- [ ] Click the "Evidence" chip while a query is active — results actually narrow to evidence-only (confirms the `api.js` type-forwarding fix, not just a cosmetic change).
- [ ] Click each other chip ("Essays", "Responses", "Blog", "All") — results correctly re-filter each time.
- [ ] The active chip has a visible selected state (border/background change), matching the same look used on `evidence/index.html`'s filter chips.
- [ ] Clear the input — the "Enter a search term…" empty state appears, centred and readable.
- [ ] Search a nonsense string with no matches — the "No results found" state appears with its hint line styled (not plain unstyled text).
- [ ] Simulate/trigger a failed search (e.g. stop the API) — the error state renders styled, and a toast appears.
- [ ] Confirm no drafts appear in results (search only ever returns published records — verify by publishing/unpublishing a test item if content exists).
- [ ] Resize to mobile width (< 768px) — chips wrap cleanly, results stack single-column, touch targets remain usable.
- [ ] Open `evidence/maps/judea.html` and `evidence/timeline/index.html` — their empty states and active filter chips still render exactly as before (confirms the additive CSS changes didn't regress the kebab-case/`.active` convention pages use).

### Code-review checks
- [ ] **CSS-1** — `search.css` contains only search-page rules; chip active-state and empty/error-state rules live in `filters.css` / `empty-states.css`, not duplicated into `search.css`.
- [ ] **CSS-2** — no hardcoded colors, spacing, or radii in the new/changed CSS; all values reference `variables.css` tokens.
- [ ] **CSS-3** — the search page's mobile breakpoint rules live inside `search.css`, not a separate file.
- [ ] **CSS-4** — new class names describe what elements are (`.search-page`, `.search-result-card__snippet`), kebab-case, consistent with the surrounding markup.
- [ ] **CSS-5** — no IDs or `!important` introduced.
- [ ] **JS-2** — `api.js`'s `search()` validates/forwards `type` explicitly rather than silently dropping it.
- [ ] **JS-5** — the type-filter fix stays inside `api.js`; no raw `fetch()` added to `search.js`.
- [ ] **HTML-4** — the new `empty-states.css` `<link>` is in `<head>`, scripts remain deferred at the bottom.

## Validation: List-Page Container & Empty/Error-State Naming Consolidation
**Plan:** list-page-container-and-state-naming.md
**Date:** 2026-07-07

### Manual checks
- [ ] Open `frontend/evidence/index.html` — the filter chips and evidence card grid sit inside a centred column with visible side padding on desktop, not flush against the browser edges.
- [ ] Open `frontend/debate/academic-challenges.html` and `frontend/debate/popular-challenges.html` — page header, filter chips, and the ranked challenge list are all now aligned to the same left/right edges (previously the header/filters were full-bleed while the list was narrower and centred).
- [ ] Open `frontend/debate/wikipedia.html`, `frontend/resources/list-1.html` (and `list-2.html`/`list-3.html`), `frontend/news-and-blog/index.html`, `frontend/news-and-blog/blog/index.html`, `frontend/news-and-blog/news/index.html`, `frontend/contextual-essays/index.html`, `frontend/debate/historiography/index.html`, `frontend/debate/index.html` — same alignment fix confirmed on each.
- [ ] Resize each of the above to mobile width (< 768px) — container padding shrinks appropriately, nothing overflows horizontally.
- [ ] Open `frontend/evidence/arbor.html`, any `frontend/evidence/timeline/*.html` page, and any `frontend/evidence/maps/*.html` page — confirm these are unchanged and still render full-width/full-height (they were intentionally excluded from the container wrap).
- [ ] Trigger an empty state on a page that already used BEM naming (e.g. `frontend/evidence/index.html` with an impossible filter combination, or `frontend/resources/list-1.html` with no items) — message renders centred and styled.
- [ ] Trigger the empty state on a renamed former-kebab page (e.g. `frontend/evidence/timeline/index.html` — filter to an era with no events, or `frontend/evidence/maps/judea.html` with a bad map key) — message still renders styled identically after the class rename.
- [ ] Trigger the empty state on a page whose message is generated by `maps-render.js` (any `frontend/evidence/maps/*.html` page with no plotted points) — confirms the JS-side rename (not just the 19 static HTML files) still renders styled.
- [ ] Trigger an error state on any page using `.error-state` (e.g. stop the API and reload `frontend/evidence/index.html`) — the message now renders styled (previously had zero CSS).
- [ ] Open `frontend/404.html` — its `.empty-state__actions` buttons (retry/home links) still render correctly after the `empty-states.css` rewrite.
- [ ] Open `frontend/debate/wikipedia.html` — the intro paragraph reads as one complete sentence ("...with quality assessments and revision data.") with no visible stray characters or broken formatting.
- [ ] Open `frontend/debate/academic-challenges.html` — the intro paragraph reads as one complete sentence and the page header has no extra blank line/artifact below it.
- [ ] Open `frontend/news-and-blog/blog/index.html` and `frontend/news-and-blog/news/index.html` — the card grid section renders and populates with blog/news cards (confirms the `<section>` tag repair didn't break the `id="card-grid"` selector `blog-list.js`/`news-list.js` query against).
- [ ] Open `frontend/news-and-blog/index.html` — view source and confirm the toggle-chips comment reads `<!-- Toggle chips: All / Blog / News -->` with no stray tag, and the All/Blog/News toggle buttons still work.
- [ ] Open a popular challenge detail page (`frontend/debate/popular-challenges/[slug].html`) for a challenge with responses — the responses list renders (confirms the `id="challenge-responses-list"` selector `challenge-detail.js` queries against still matches after the attribute-splice fix).
- [ ] Confirm `setup/PLANS/Completed/markup-corruption-cleanup.md` no longer exists and `setup/PLANS/New/markup-corruption-cleanup.md` exists in its place, content unchanged.

### Code-review checks
- [ ] **CSS-1** — `.container` usage is the only layout change on the wrapped pages; no new page-specific container classes were invented. `empty-states.css` still contains only empty/error-state rules.
- [ ] **CSS-2** — no hardcoded max-width/padding values added; `.container` and `variables.css` tokens are reused as-is.
- [ ] **CSS-4** — `empty-states.css` uses BEM-only class names after the rewrite; no lingering `.empty-state-message`/`-icon`/`-actions` kebab selectors remain unless still referenced somewhere.
- [ ] **HTML-1** — wrapping `<main>`'s children in `<div class="container">` does not introduce a second landmark region or change heading hierarchy on any of the 14 pages.
- [ ] **HTML-3** — one `<h1>` (in the `.sr-only` header) per page, unchanged by this plan; the six stray-tag fixes restore each page's originally intended single heading/paragraph structure without adding or removing any heading.
- [ ] **SR-1** — each file's edit is scoped to that file only; no page's fix bled into another file.
- [ ] Confirm `grep -rn "empty-state-message" frontend/` returns zero matches after the rename tasks (scan all of `frontend/`, not just HTML — `frontend/assets/js/maps/maps-render.js` generates the same class name at runtime).
- [ ] Confirm none of the six stray-tag fixes altered any text content — only the misplaced tag/attribute syntax was corrected, exactly as diagnosed in the plan's before/after pairs.

## Validation: Search Exact-Match Quotes & Fuzzy Matching (Frontend)
**Plan:** search-exact-and-fuzzy-matching.md
**Date:** 2026-07-07

### Manual checks
- [ ] Open `frontend/evidence/search.html` — the hint line ("Tip: wrap words in "quotation marks" for an exact phrase…") renders directly below the search input, above the filter chips, in small muted text.
- [ ] Type a quoted phrase (e.g. `"pontius pilate"`) — results contain only exact-phrase hits; remove the quotes — broader results appear.
- [ ] Type a partial word (e.g. `resur`) — prefix matches render with highlighted `<mark>` snippets.
- [ ] Resize to mobile width (< 768px) — the hint wraps cleanly, no horizontal overflow, chips row spacing unchanged.
- [ ] With a screen reader or the browser accessibility inspector, confirm the search input's description includes the hint text (`aria-describedby="search-hint"`).

### Code-review checks
- [ ] HTML-5 — the hint is a real element referenced by `aria-describedby`, not placeholder-only text.
- [ ] CSS-1/CSS-2 — `.search-hint` lives in `frontend/assets/css/components/search.css` and uses only `--text-*`/`--space-*` tokens; no hardcoded values.
- [ ] JS — `frontend/assets/js/search.js` is unmodified by this plan.

## Validation: Image Upload Pipeline (Frontend — Evidence figure unification)
**Plan:** image-upload-pipeline.md
**Date:** 2026-07-08

### Manual checks
- [ ] Open an evidence detail page whose `description` contains a `[figure src="/uploads/..." caption="..."]` shortcode — it renders inline, at the point in the text where the shortcode appears, as a bordered figure with a sequential "Fig." number and the caption below it, same visual treatment as figures on a Blog/Essay/Historiography/Response page.
- [ ] An evidence item with no `[figure]` shortcode in its description shows no empty gallery section, no leftover heading, and no layout gap where "Pictures" used to render.
- [ ] An evidence item with multiple `[figure]` shortcodes numbers them sequentially ("Fig. 1", "Fig. 2", …) in text order.
- [ ] `frontend/evidence/single/[slug].html` (the template) no longer contains an `evidence-pictures-section` element; regenerated per-slug pages under `frontend/evidence/single/*.html` reflect the same.
- [ ] Print view of an evidence page with an inline figure matches the existing figure print rules (border removed, 9pt italic caption, inline at full width) — unchanged from before, since it reuses the same `figures.css`/print rules.

### Code-review checks
- [ ] JS-6 — `evidence-detail.js`'s new shortcode parsing escapes surrounding prose exactly like `parseBlogBody` does (figure blocks extracted from raw text before the remaining text is escaped), never passing unescaped user text to `innerHTML`.
- [ ] JS-3 — `evidence-detail.js`'s description parser is written as a small function mirroring `parseBlogBody`'s structure/naming rather than importing across page-script modules (each detail script stays self-contained, consistent with the existing four).
- [ ] `renderPictures`, `$pictures`, and `$picturesSection` are fully removed from `evidence-detail.js` — no dead references remain.
- [ ] `setup/Style_guide.md`'s Evidence Detail Page section no longer lists "Pictures" as a separate section, and its wording matches how Essays/Responses/Historiography/Blog describe inline figures.
- [ ] `numberFigures` is called on the description container after each render, so figures renumber correctly if the description is re-rendered (e.g. draft preview reload).

## Validation: Resources & Context Card Grids
**Plan:** resources-context-card-grids.md
**Date:** 2026-07-08

### Manual checks
- [ ] Open `/resources/` — the chip row is gone; a card grid renders with exactly 15 cards (Sermons & Sayings, Parables, Objects, People, Sites, OT Verses, Internal Witnesses, External Witnesses, Places, World Events, Miracles, Events, Apologetics, Manuscripts, Sources), each with a title and one-sentence description.
- [ ] Click each card — it navigates to `/resources/<key>.html`; the visible `<h2>` matches the category, the chip row on the category page shows that chip active, and with an empty database the "No resources in this category yet." empty state appears (no error state, no console errors).
- [ ] On a category page, chips link laterally to the other 14 static pages (hrefs end in `.html`, no `list.html?key=` anywhere).
- [ ] `frontend/resources/list.html`, `list-1.html`, `list-2.html`, `list-3.html` no longer exist; no remaining file references them (`grep -rn "list.html" frontend/` in the resources context is clean).
- [ ] Open `/contextual-essays/` — the card grid loads; with an empty local DB the "No essays published yet." empty state shows; after production data exists, the "Census of Quirinius" card appears and links to `/contextual-essays/census-of-quirinius`, which shows "This essay is forthcoming."
- [ ] In `admin/resources/`, the Sources category is reachable via `admin/resources/sources.html` and adding an item to it saves with `list_key = sources`.
- [ ] On production after deploy: `https://thejesuswebsite.org/sitemap.xml` uses apex-domain locs (no `www.`) and contains the 15 `/resources/<key>.html` entries; the historiography article "Historiography of the Historical Jesus" is listed and reachable under Debate.

### Code-review checks
- [ ] SR-3 — `/resources/` landing renders its card grid from static HTML with no fetch on load.
- [ ] CSS-1 — landing-grid styles live in `frontend/assets/css/pages/resources-index.css` (new file, under 150 lines); `resources.css` was not grown past 150 lines.
- [ ] CSS-2 — `resources-index.css` uses only `variables.css` tokens; no hardcoded colors/spacing.
- [ ] HTML-1/HTML-3 — each new category page has one `<main>`, an sr-only `<h1>`, and visible headings starting at `<h2>`.
- [ ] HTML-4 — new pages load CSS in `<head>` and module scripts at the bottom with `defer`.
- [ ] JS-6 — `resources.js` `renderCategoryNav()` still renders via the escaping `html` template after the href change.
- [ ] `api/tests/generate-sitemap.test.js` covers the 15 category pages in `STATIC_PAGES` and asserts apex-domain (`https://thejesuswebsite.org`) locs; `cd api && npm test` passes.

## Validation: Context Index Fix & Open Issues Cleanup
**Plan:** context-index-and-open-issues-fixes.md
**Date:** 2026-07-08

### Manual checks
- [ ] `frontend/debate/historiography/index.html` renders with sidebar/nav consistent with `frontend/contextual-essays/index.html`; breadcrumb points back to Debate & Discussion
- [ ] With the API running and a published historiography row, cards render with title/byline and link to `/debate/historiography/<slug>`
- [ ] `frontend/evidence/single/` no longer contains `test-item-*.html` files

### Code-review checks
- [ ] HTML-1 — one `<main>`; semantic sections
- [ ] HTML-3 — exactly one `<h1>`, no skipped levels
- [ ] HTML-4 — stylesheets in `<head>`; `historiography-list.js` loaded as module with `defer`
- [ ] CSS-2 — no hardcoded values; reuse existing list-page CSS (expected: no new CSS file)

## Validation: Site-wide Right Gutter
**Plan:** admin-layout-timeline-mla-fixes.md
**Date:** 2026-07-08

### Manual checks
- [ ] On evidence, resources, blog/news, and debate list pages, cards keep a visible right-side gap at mobile, tablet, and desktop widths — nothing touches the right viewport edge.
- [ ] With the nav sidebar open and closed, the right gutter is preserved (no layout shift swallows it).
- [ ] Public timeline page still renders era chips/labels correctly with the restored beginning/middle/end data.

### Code-review checks
- [ ] CSS-2 — gutter values are `--space-*` tokens, no hardcoded px
- [ ] CSS-3 — responsive gutter rules live inside `grid.css`/`navigation.css`, no new mobile-only file
- [ ] CSS-5 — single-class selectors, no `!important`

## Validation: SEO Coverage — Section Pages & Crawler Signals
**Plan:** seo-coverage-section-pages.md
**Date:** 2026-07-08

### Manual checks
- [ ] View source on `https://thejesuswebsite.org/` — confirm `<meta property="og:title">`, `og:description`, `og:image`, `og:type`, `og:url`, `og:site_name`, `twitter:card` all present
- [ ] View source on `https://thejesuswebsite.org/evidence/` — confirm OG tags and JSON-LD `CollectionPage` present
- [ ] View source on `https://thejesuswebsite.org/about.html` — confirm OG tags present
- [ ] View source on `https://thejesuswebsite.org/404.html` — confirm OG tags present (minimal set acceptable)
- [ ] View source on a generated detail page (e.g. `/evidence/single/test-item-0z24nu`) — confirm `<meta name="robots" content="index, follow">` present
- [ ] Open `https://thejesuswebsite.org/robots.txt` — confirm Sitemap uses apex domain, and MCP comment block is present
- [ ] Open `https://thejesuswebsite.org/.well-known/llms.txt` — confirm file loads (same content as root `/llms.txt`)
- [ ] Run Facebook Sharing Debugger or `curl -v` on homepage — confirm `og:image` returns a valid image URL

### Code-review checks
- [ ] HTML-1 — OG/twitter meta tags are inside `<head>`, JSON-LD scripts are `<script type="application/ld+json">` in `<head>`
- [ ] HTML-4 — No new blocking resources, no additional stylesheets or scripts loaded for SEO tags
- [ ] SR-3 — All additions are static `<meta>` and `<script>` tags with zero runtime cost
- [ ] robots.txt comment lines start with `#` — parsers that don't understand them will silently ignore
- [ ] `.well-known/llms.txt` content matches root `llms.txt` (manual copy verified)
- [ ] `page-generator.js` BASE_URL now uses apex domain, matching sitemap and nginx redirect

---

## Validation: Historiography Period-Grouped Essay Cards
**Plan:** historiography-refactor.md
**Date:** 2026-07-08

### Manual checks
- [ ] Open `/debate/historiography/` — page shows 8 period-section headings (Early Church through Contemporary) with exactly one card under each
- [ ] Period sections appear in chronological order (Early Church first, Contemporary last)
- [ ] Click a card — navigates to `/debate/historiography/{slug}` and the detail page renders with correct title, author, body text, and MLA references
- [ ] Empty state: if no essays are published, the page shows a "No historiography essays published yet." message
- [ ] Open `admin/historiography/index.html` — table shows all essays with their period visible in a new column
- [ ] Open `admin/historiography/new.html` — form includes a period `<select>` dropdown with all 8 periods and a sort-order input
- [ ] Open `admin/historiography/edit-[id].html` — period dropdown is pre-populated with the saved value
- [ ] Create a new essay via admin, assign it a period, save, publish — it appears under the correct period heading on the public page

### Code-review checks
- [ ] **HTML-1** — Period groups use `<section>` elements, headings use `<h3>`
- [ ] **HTML-3** — One `<h1>` per page; `h2` for page title; `h3` for period headings
- [ ] **HTML-4** — New CSS linked in `<head>`, scripts loaded with `defer`
- [ ] **CSS-1** — New `historiography-list.css` styles only the period section headers and spacing (under 50 lines)
- [ ] **CSS-2** — All values reference `--space-*`, `--font-*`, `--color-*` from `variables.css`
- [ ] **CSS-3** — Mobile `@media` queries live inside `historiography-list.css`
- [ ] **CSS-4** — Class names are semantic (`.historiography-period`, `.historiography-period__heading`)
- [ ] **JS-2** — Period value validated at DB level (CHECK constraint) and in admin form before submit
- [ ] **JS-5** — All fetch calls go through `api.js` wrappers (`getHistoriography`, `getHistoriographyBySlug`)
- [ ] **JS-6** — DOM queries cached; no `innerHTML` with raw API data
- [ ] **SR-1** — Migration, model changes, new CSS, and JS changes are each in their own file

## Validation: Position a Picture, ID or MLA in Place
**Plan:** position-picture-id-mla-in-place.md
**Date:** 2026-07-09

### Manual checks
- [ ] On an essay containing `[figure src="…" caption="…"]` mid-body, the figure renders at exactly that point in the text flow, with border, caption, and a sequential "Fig. N" label
- [ ] A figure with `align="right"` floats as a ~320px breakout on a ≥1024px viewport and renders full-width below 1024px
- [ ] `[mla:N]` in an essay/response/historiography body renders a superscript citation; clicking it scrolls to the matching bibliography entry (`id="mla-N"`)
- [ ] `[mla:N]` in a blog post renders an inline parenthetical `(Author)` — no superscript, no footnote list
- [ ] `[id:N]` renders an inline identifier badge showing the identifier's label (e.g. manuscript number)
- [ ] A marker referencing an id NOT linked to the item (e.g. `[mla:9999]`) renders nothing — no raw shortcode text, no console error
- [ ] Evidence detail: pictures grid above the description is unchanged; `[mla:N]` and `[id:N]` markers placed anywhere inside `evidence.description` render correctly (citation superscript / identifier badge) and resolve only against that evidence row's own linked sources/identifiers
- [ ] Print preview: citations print as plain superscripts, identifier badges as plain text, a figure with `align="right"` prints full-width with no float (not squeezed to a corner column)
- [ ] Click the footer's "Copy Contents" button on a page containing `[mla:N]` or `[id:N]` mid-sentence, paste the clipboard into a plain-text editor, and confirm the marker's rendered text is separated from adjacent words by a space (e.g. "inscription 12 which" not "inscription12which")
- [ ] Copy Contents on a page with a mid-paragraph `[figure align="right"]` — the figure's caption text appears once, at its correct position in reading order, in the copied text (float does not duplicate or reorder it)
- [ ] Admin edit pages for essays/responses/historiography/blog/evidence show the collapsible "Formatting reference" panel, and it includes the exact floated-figure example `[figure src="/assets/images/coin.webp" caption="A first-century coin." align="right"]` alongside plain `[figure]`, `[mla:N]`, and `[id:N]` examples
- [ ] On the same edit forms, each row in the linked MLA sources list shows its exact `[mla:N]` marker (matching that row's real id) and each row in the linked identifiers list shows its exact `[id:N]` marker — link/unlink a source or identifier before saving and confirm the shown marker list updates accordingly

### Code-review checks
- [ ] SR-1 — parser lives alone in `frontend/assets/js/utils/content-markers.js`; the four duplicated `parseJournalBody` copies are deleted
- [ ] JS-2 — unresolvable markers degrade to empty output; parser validates input types
- [ ] JS-6 — all prose and shortcode attribute values escaped before `innerHTML`; DOM refs cached
- [ ] CSS-1 / CSS-2 — `inline-citation.css` styles one concern, under 150 lines, tokens from `variables.css` only
- [ ] CSS-4 — semantic class names (`.inline-citation`, `.inline-identifier`, `.figure-align-right`)
- [ ] HTML-2 — generated `<img>` tags always carry an `alt` attribute
- [ ] JS-4 — marker grammar documented in JSDoc on `parseContentBody`
- [ ] `evidence-detail.js` uses one identifier-label formatting helper for both the info-row identifiers list and inline `[id:N]` markers — no second, divergent label format introduced
- [ ] `content-markers.js` wraps rendered `[mla:N]`/`[id:N]` output with `.sr-only` spacer text on both sides so Copy Contents output stays word-separated; `footer.js` itself is untouched (the fix lives in the parser, not in the content-agnostic Copy Contents handler)
- [ ] `print.css`'s new float override targets only `.figure-align-left`/`.figure-align-right`, and doesn't duplicate the existing `a[href]::after`/`* { background-color: transparent }` rules that already cover citation/badge print appearance

## Validation: Timeline Era & Period Refactor (Frontend)
**Plan:** timeline-era-period-refactor.md
**Date:** 2026-07-09

### Manual checks
- [ ] Open `https://thejesuswebsite.org/evidence/timeline/` — the era filter bar shows all eight new era chips (Pre-Incarnation, Old Testament, Early Life, Life, Galilee Ministry, Judean Ministry, Passion Week, Post-Passion) and "All Eras" is active by default.
- [ ] Click each era filter chip — only dots/labels within that era remain opaque; all others appear at `opacity: 0.3`.
- [ ] The timeline spine shows era markers and labels for all eight eras (not just the old three).
- [ ] Open each era-specific page (e.g. `/evidence/timeline/pre-incarnation.html`) — the page loads with the correct era pre-filtered and its filter chip active.
- [ ] Open `https://thejesuswebsite.org/evidence/` — the filter bar shows eight chips for the new eras (not the old `birth`, `ministry-Galilee`, `passion` etc.). Clicking any new-era chip filters the evidence list correctly.
- [ ] Open an evidence detail page — the Timeline Context section and info-row era badge display the new era value (e.g. "GalileeMinistry" or "PassionWeek") as-is.

### Code-review checks
- [ ] JS-1 — `ERA_LABELS`, `ERA_BOUNDARIES`, and `TIMELINE_PERIODS` in `timeline-data.js` are self-documenting; no era values are hardcoded outside this file's exports.
- [ ] CSS-4 — era filter chips use `data-era` values that match the era enum keys exactly (no display labels in data attributes).
- [ ] HTML-1 — new era-specific timeline pages use `<body data-initial-era="...">` correctly and have exactly one `<h1>` and one `<h2>`.
- [ ] HTML-3 — new era-specific pages have the same heading hierarchy as the main timeline page.
- [ ] JS-3 — `timeline-render.js` no longer hardcodes `['beginning', 'middle', 'end']`; era loop is driven by `Object.keys(ERA_BOUNDARIES)`.

## Validation: Sidebar Title Stone-Stamp Animation
**Plan:** sidebar-title-stamp-animation.md
**Date:** 2026-07-10

### Manual checks
- [ ] Open any non-home page (e.g. `https://thejesuswebsite.org/about.html`) with the sidebar open — hovering "The Jesus Website" presses the text in very slightly (scale 0.985) and fades in a thin gold rule beneath it over ~150ms; releasing hover reverses it smoothly.
- [ ] `Tab` to the sidebar home link with the keyboard — the same press + gold rule appears on `:focus-visible`.
- [ ] On `index.html` (home link is the active nav item) — the stamp hover effect and the `.nav-item--active` accent border/background coexist without visual glitches.
- [ ] Enable "Reduce Motion" in OS accessibility settings and reload — hovering the title swaps states instantly with no visible motion.
- [ ] On a touch device (or DevTools touch emulation) — tapping the title simply navigates home; no stuck hover state or animation flicker.
- [ ] Hover several other nav items — none of them show the gold rule or press effect (only the home link is affected).

### Code-review checks
- [ ] CSS-2 — new rules in `layout/navigation.css` use only `--accent-gold`, `--duration-fast`, `--ease-out`, and `--space-lg`; no hardcoded colors, durations, or offsets.
- [ ] CSS-4 / CSS-5 — the effect is scoped by the single semantic class `nav-item--home` (matching the `nav-item--admin` precedent); no `:first-child` chains, IDs, or `!important`.
- [ ] SR-3 — only `transform` and `opacity` are transitioned; no layout properties (width/height/margin/padding) animate.
- [ ] HTML-1 — the bulk HTML edit added only the `nav-item--home` class to the existing `<li>`; no structural changes, and `admin/` pages were not touched.
- [ ] CSS-1 — `layout/navigation.css` remains under 150 lines after the addition.
## Validation: Arbor Position Mirroring & WYSIWYG Diagram Editors (Frontend)
**Plan:** arbor-timeline-wysiwyg-editors.md
**Date:** 2026-07-10

### Manual checks
- [ ] `node --test frontend/assets/js/arbor/tests/*.test.js` passes (saved-position rendering, BFS fallback when any node lacks a position, edge endpoints track nodes).
- [ ] On the deployed site (post-VPS-deploy only — local DB is empty): `frontend/evidence/arbor.html` renders nodes at the exact positions saved in the admin editor.

### Code-review checks
- [ ] JS-2 — renderer falls back to BFS layout for the whole diagram if any node has null x/y; never mixes layout modes.
- [ ] CSS untouched — `arbor-render.js` emits the same class names as before; no changes to `frontend/assets/css/pages/arbor.css` required.
- [ ] SR-1 — position pass-through lives in `arbor-data.js`; layout decision lives in `arbor-render.js`.


## Validation: Maps Generation & Admin Metadata Editing
**Plan:** maps-generation-and-assets.md
**Date:** 2026-07-10

### Manual checks
- [ ] Each of the five map pages under `/evidence/maps/` displays its generated SVG (parchment land, blue-grey water, cartouche, compass, frame) with no broken-image icon.
- [ ] Geography sanity: Sea of Galilee harp shape, Dead Sea, and Mediterranean coastline visibly match a reference atlas; Roman Empire map shows recognisable Italy/Greece/Asia Minor coasts.
- [ ] SVGs stay crisp on the zoom-variant pages and each file is under ~200 KB.
- [ ] The map `<img>` elements have a descriptive `alt` (the map name) — inspect in devtools.
- [ ] In `/admin/diagrams/maps.html`, the Map details panel loads the selected map's name/description; saving an edited description succeeds and reappears on the public map page after reload.
- [ ] Replacing the base image via the panel uploads a raster file, updates `image_path`, and the canvas refreshes immediately.
- [ ] Dragging a pin and saving persists across reload; a pin linked to evidence navigates to that evidence detail page on the public map; an unlinked pin renders as a plain label.
- [ ] `cd api && npm test` passes, including the new maps metadata and generator tests.

### Code-review checks
- [ ] SR-2 — generator uses no new npm dependencies; Natural Earth data committed as static GeoJSON.
- [ ] SR-1 — one module per generator concern; metadata editing lives in its own `maps-metadata.js`.
- [ ] JS-2 — metadata save rejects empty map name; generator fails loudly on missing GeoJSON.
- [ ] JS-5 — all admin requests go through `Admin.api.*`; no raw `fetch` in `maps-metadata.js`.
- [ ] JS-6 — no `innerHTML` with DB values in new/changed render code.
- [ ] CSS-1/CSS-2 — panel styles in `admin-diagrams/maps.css` using admin tokens only; file split if over 150 lines.
- [ ] HTML-2/HTML-5 — alt text on map images; every metadata form control has a `<label>`.
- [ ] Security — `POST /uploads` still rejects SVG payloads (raster magic bytes only).


## Validation: Frontend UI Fixes — Evidence Rows, Collapsible Filters, Timeline Spine, Maps Heading, Print/Copy
**Plan:** frontend-ui-fixes-evidence-timeline-maps.md
**Date:** 2026-07-10

### Manual checks
- [ ] `/evidence/` — filter chips sit inside a collapsible box; the toggle button collapses and restores it, `aria-expanded` flips, and the state survives navigating away and back (sessionStorage).
- [ ] `/evidence/` — records render as rows: thumbnail (or placeholder when no picture) → title → primary verse; each row links to its `/evidence/single/<slug>` page; infinite scroll still loads more rows.
- [ ] `/evidence/timeline/` — a horizontal spine renders with era-coloured dots positioned by period; clustered dots offset; era chips filter the dots; hover/tap raises the detail card with thumbnail, title, verse, and link.
- [ ] Timeline era sub-pages (`early-life.html`, `life.html`, etc.) render the spine with the same stylesheet.
- [ ] `/evidence/maps/` — heading reads exactly "Maps"; description reads exactly "Explore the historical evidence for Jesus geographically."; index and per-map pages are styled (maps.css now exists).
- [ ] Print (footer button) on a map page, the timeline, and the arbor page — diagram prints black-on-white per Style guide §12; chips, toggles, and controls do not print; nothing clipped by scroll containers.
- [ ] Copy Contents on the same three pages — clipboard contains sensible readable text (title, description, pins/events/nodes), not raw SVG/diagram noise; success toast appears.

### Code-review checks
- [ ] CSS-1 — `timeline.css`, `maps.css`, filter-panel styles each single-purpose and under 150 lines.
- [ ] CSS-2 — no hardcoded colours/spacing; tokens from `variables.css` only.
- [ ] CSS-3 — mobile and `@media print` rules live inside each component/page file.
- [ ] JS-5 — thumbnail/verse data flows through `assets/js/api.js`; no raw `fetch` in `evidence-list.js`.
- [ ] JS-6 — all interpolated values (thumbnail paths, titles, verses) escaped via `utils/templates.js`; filter toggle listeners cleaned up properly.
- [ ] HTML-2 — evidence row `<img>` elements carry `alt` attributes.
- [ ] SR-1 — filter-panel toggle logic in its own module, not inlined into `evidence-list.js`.

## Validation: Open Issues Cleanup (Frontend & Tooling)
**Plan:** open-issues-cleanup.md
**Date:** 2026-07-10

### Manual checks
- [ ] Link an MLA source to a historiography article via admin, publish, open its public page: the References section shows a formatted MLA citation (italicised title, period-separated parts) — not `[object Object]`.
- [ ] Same check on a contextual essay detail page.
- [ ] An article with no linked sources hides the References section entirely.
- [ ] With the API running, `node dev-proxy.js frontend 4179` serves the public site at `localhost:4179` and pages that fetch `/api/...` (e.g. historiography index) load real data instead of the error state.
- [ ] `node dev-proxy.js` with no args still serves `admin/` on 4174 exactly as before.
- [ ] `frontend/sitemap.xml` contains `<url>` entries for all five map pages and five zoom variants; no pre-existing entries changed.

### Code-review checks
- [ ] JS-6 — every mla_sources field in `utils/mla.js` is escaped via the `templates.js` helper before HTML interpolation.
- [ ] JS-2 — `formatMlaCitation()` returns `""` on rows with insufficient data; renderers filter empties and hide the section.
- [ ] JS-4 — JSDoc on `formatMlaCitation` documents the journal → book → website type-detection order.
- [ ] SR-1 — the formatter lives in its own `frontend/assets/js/utils/mla.js` module.

## Validation: Maps Visual Parity Refactor (Frontend + Cache)
**Plan:** maps-visual-parity-refactor.md
**Date:** 2026-07-10

### Manual checks
- [ ] After deploy + Cloudflare purge, a fresh browser profile loading each of the five map pages shows the real-geography SVGs (Sea of Galilee and Dead Sea recognisable, continuous Jordan river) — not the old sketch coastlines.
- [ ] `curl -sI https://thejesuswebsite.org/assets/images/maps/galilee.svg` returns `Cache-Control: public, max-age=3600, must-revalidate` (not `immutable`).
- [ ] Map pins render era-tinted per the timeline colour tokens; pins without a `timeline_era` keep the default `--accent` fill; labels/tooltips unchanged.
- [ ] Zoom-variant pages (`/evidence/maps/<key>/zoom-<key>.html`) pick up the same versioned image URL and pin colours.

### Code-review checks
- [ ] CSS-1 — era pin rules live in new `pages/maps-pins.css`, not appended to the oversized `pages/maps.css`.
- [ ] CSS-2 — colours only via `--era-*` custom properties from `variables.css`.
- [ ] JS-5 — no new raw `fetch`; pin era data arrives via the existing `maps-data.js` → `api.js` path.
- [ ] SR-3 — long immutable caching retained for genuinely immutable assets; only regenerable map images moved to the short-cache block.
