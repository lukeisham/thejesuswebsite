# Plan: Frontend Integrity & API Hardening

**Module(s):** Frontend / API / Database
**Date:** 2026-07-02
**Status:** Done

## Goal
Fix four issues found in a purpose/efficiency/safety/refactorability review of the codebase: (1) the five journal-format pages (essays, responses, historiography) link a `pages/journal.css` file that does not exist, so the site's core scholarly content renders unstyled; (2) `POST /analytics` is unauthenticated, unrate-limited, and trusts a client-supplied `ip_hash`, making it a cheap flood/spoofing target; (3) full-text search returns entire row bodies (`SELECT source.*`) for every hit, and the frontend's rendering code doesn't even match the columns returned — three of four result types silently show "Untitled" and response results link to a 404; (4) `pickWritable`, `generateUniqueSlug`, and the UPDATE-assignment builder are duplicated near-verbatim across 18 model files, making every future column addition a multi-file mechanical chore.

Investigating (1) also surfaced pervasive markup corruption (broken headings/paragraphs) across 22 files — that is tracked separately in Issues.md and explicitly **out of scope for this plan** per owner decision.

## Coding rules to keep in mind
- **HTML-4** — CSS `<link>` tags stay in `<head>`; the journal-page fix restores this, it doesn't change the loading pattern.
- **CSS-1** — `journal-body.css` is at 143/150 lines; removing its duplicated two-column block keeps it under budget rather than requiring a further split.
- **JS-2** — the analytics endpoint must reject bad input predictably (4xx), not silently accept or crash; model writes stay whitelisted through the new shared `pickWritable`.
- **JS-3** — the shared model helpers keep each function small and single-purpose; no class-based abstraction, no framework.
- **SR-1** — each model-migration task is scoped to a fixed batch of files performing the identical mechanical change; unrelated fixes stay in separate task groups even though they land in one plan.
- **SR-2** — no new dependency anywhere in this plan (rate limiting reuses the existing in-house limiter; hashing uses Node's built-in `crypto`).
- **SR-3** — slimming the search `SELECT` and correctly rate-limiting analytics are both direct performance/cost wins.

## Tasks

### Frontend — Journal Page CSS

- [ ] **Fix the essay/response/historiography detail-page stylesheet links** — replace the single (nonexistent) `<link rel="stylesheet" href="/assets/css/pages/journal.css">` with links to the four working partials, in this order: `journal-header.css`, `journal-body.css`, `journal-two-column.css`, `journal-footer.css`. On the response detail page only, also add `journal-responses.css` (the challenge-reference/strength-indicator styles are response-only, per `journal-responses.css`'s own header comment). Files: `frontend/contextual-essays/[slug].html`, `frontend/debate/responses/[slug].html`, `frontend/debate/historiography/[slug].html`
- [ ] **Fix the essay/historiography listing-page stylesheet links and style their header** — these two pages use `<header class="journal-header">` for a simple title + description block, not the full journal-article detail layout, so they need only `journal-header.css`, not the other three partials. Add a `.journal-header` rule to `journal-header.css` (margin-bottom on the block, `margin-bottom` on its `h2`, `color: var(--text-secondary)` on its `p`) matching the existing `.challenge-header` pattern in `challenge-list.css` — currently `.journal-header` has no matching CSS rule at all. Files: `frontend/contextual-essays/index.html`, `frontend/debate/historiography/index.html`, `frontend/assets/css/pages/journal-header.css`
- [ ] **Remove the duplicated two-column CSS block** — `journal-body.css` (lines ~112-127) contains the exact same `.journal-article.two-column .journal-body` rule set already defined in `journal-two-column.css`. Delete it from `journal-body.css`, keeping `journal-two-column.css` as the sole source (matches its dedicated sitemap entry) and trim `journal-body.css`'s header comment, which currently claims to own "two-column layout." File: `frontend/assets/css/pages/journal-body.css`
- [ ] **Delete the unused `main.css`** — verified zero `<link>`/`@import` references anywhere in `frontend/` or `admin/`; every page already loads its stylesheets individually. Its own header comment claims it's "the single file referenced in `<link>` tags," which is false and actively misleading (it's very likely why the journal pages ended up linking a single aggregate `journal.css` that was never built). File: `frontend/assets/css/main.css` — deleted

### API — Analytics Hardening

- [ ] **Rate-limit `POST /analytics`** — add a limiter instance (e.g. `rateLimit({ maxAttempts: 30, windowMs: 60_000 })`, generous enough for a real visitor navigating quickly, tight enough to bound a scripted flood) to the route, matching how every other public write-adjacent endpoint in this codebase is already protected. File: `api/routes/analytics.js`
- [ ] **Compute `ip_hash` server-side instead of trusting the client** — replace `req.body.ip_hash` with `crypto.createHash('sha256').update(req.ip).digest('hex')` computed in the route handler; stop accepting it from the request body entirely. File: `api/routes/analytics.js`
- [ ] **Cap `page`, `referrer`, and `session_id` length** — reject (400) requests where `page`/`referrer` exceed 500 characters or `session_id` exceeds 100 characters, before calling the model, consistent with this codebase's existing "validate then delegate" route style. File: `api/routes/analytics.js`

### API — Search Slimming & Correctness

- [ ] **Alias each entity's title column and slim the SELECT** — `search.model.js`'s `SEARCHABLE` config currently only names `fts`/`table`; add a `titleColumn` per entity (`evidence.title`, `response_title`, `essay_title`, `blog_title`) and change `searchOne`'s query from `SELECT source.*` to `SELECT source.id, source.slug, source.${config.titleColumn} AS title`, plus the existing `result_type`/`snippet`. This both cuts the payload (full essay/response/blog bodies are currently returned on every search keystroke) and fixes a real bug: `search.js`'s `renderResultCard` reads `item.title`, which only ever existed for the `evidence` type — responses, essays, and blog posts have always rendered as "Untitled" in search results. File: `api/models/search.model.js`
- [ ] **Fix the broken response search-result URL** — `search.js`'s `getResultUrl` builds `/debate/${slug}` for the `responses` type; every other reference to a response detail page in this codebase (`challenge-detail.js`, `response-detail.js`'s own URL-pattern comment) uses `/debate/responses/${slug}`. Fix the one case. File: `frontend/assets/js/search.js`

### API — Model Write-Path Deduplication

- [ ] **Create the shared model helpers module** — `api/models/model-helpers.js` exporting three pure functions extracted from the duplicated logic: `pickWritable(data, writableColumns)`, `generateUniqueSlug(db, table, baseSlug, excludeId = null)`, and `runUpdate(db, table, row, id)` (builds and executes the `UPDATE ... SET a = @a, b = @b WHERE id = @id` statement for whichever columns are present in `row`; returns `false` with no query run if `row` is empty). Behavior must be byte-identical to what every model currently does inline — this is a pure extraction, not a redesign. File: `api/models/model-helpers.js`
- [ ] **Migrate batch 1 to the shared helpers** — `about.model.js` (pickWritable + runUpdate), `academic-challenges.model.js` (all three), `analytics.model.js` (pickWritable only), `arbor.model.js` (pickWritable + runUpdate). Files: `api/models/about.model.js`, `api/models/academic-challenges.model.js`, `api/models/analytics.model.js`, `api/models/arbor.model.js`
- [ ] **Migrate batch 2 to the shared helpers** — `blog-post.model.js` (all three), `collection.model.js` (all three), `credential.model.js` (pickWritable only — its `updateSignCount` is a fixed-shape statement, not migrated to `runUpdate`), `essay.model.js` (all three). Files: `api/models/blog-post.model.js`, `api/models/collection.model.js`, `api/models/credential.model.js`, `api/models/essay.model.js`
- [ ] **Migrate batch 3 to the shared helpers** — `evidence.model.js` (all three), `historiography.model.js` (all three), `identifiers.model.js` (pickWritable + runUpdate), `map.model.js` (pickWritable + runUpdate, applied separately to both its `maps` and `map_pins` update functions). Files: `api/models/evidence.model.js`, `api/models/historiography.model.js`, `api/models/identifiers.model.js`, `api/models/map.model.js`
- [ ] **Migrate batch 4 to the shared helpers** — `mla-source.model.js` (pickWritable + runUpdate), `news-article.model.js` (all three), `popular-challenges.model.js` (all three), `resource.model.js` (pickWritable + runUpdate). Files: `api/models/mla-source.model.js`, `api/models/news-article.model.js`, `api/models/popular-challenges.model.js`, `api/models/resource.model.js`
- [ ] **Migrate batch 5 to the shared helpers** — `response.model.js` (all three), `wikipedia.model.js` (all three). Files: `api/models/response.model.js`, `api/models/wikipedia.model.js`
- [ ] **Delete the two verified-unused shared modules** — `api/middleware/validation.js` (`requireFields`/`requireIntParam`, imported by zero routes) and `shared/constants.js` (imported by nothing; also ESM syntax the CommonJS `api/` layer could never `require()` as-is). Adopting either properly — wiring `validation.js` into ~20 existing routes' hand-rolled checks, or converting `shared/constants.js` to CommonJS and giving it real call sites — is a separate, larger refactor; deleting verified-dead code now is the bounded, low-risk move (see Notes). Files: `api/middleware/validation.js` — deleted, `shared/constants.js` — deleted
- [ ] **Remove the now-stale `shared/` entry from Website_guide.md** — its Module Guide tree lists `shared/ # Constants shared between api/, admin/, mcp-server/`; delete that line since the directory is now empty. File: `setup/Website_guide.md`

### Tests

- [ ] **Test the shared model helpers directly** — `pickWritable` (whitelist filtering, ignores unknown keys), `generateUniqueSlug` (increments on collision, `excludeId` lets a row keep its own slug), `runUpdate` (builds correct SQL, returns `false` and runs nothing on an empty `row`), using an in-memory `:memory:` database via `createTestDb()`. File: `api/tests/model-helpers.test.js`
- [ ] **Re-run the full existing suite against the migrated models** — no new assertions needed; `journal-content.test.js`, `evidence.test.js`, `maps.test.js`, `sources-about.test.js`, `credential.model.test.js`, and `relations.test.js` already cover create/update/slug-collision behavior for every migrated model and must still pass unchanged, proving the extraction preserved behavior exactly. File: none (verification only, run `node --test tests/*.test.js`)
- [ ] **Add analytics route tests for the new hardening** — assert the 31st `POST /analytics` request within a window returns 429; assert a request with an oversized `page`/`referrer`/`session_id` returns 400; assert the stored `ip_hash` is a sha256 hex digest of `req.ip`, never the client-supplied value. File: `api/tests/analytics.model.test.js` (route-level cases; extend the existing file rather than create a new one, matching how it already mixes model and route assertions)
- [ ] **Add search model tests** — assert `searchOne` for each of the four entity types returns a `title` field with the correct value (not `undefined`) and does not return the entity's full content/body column; assert unpublished rows are excluded. File: `api/tests/search.model.test.js`

## Files touched
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/contextual-essays/index.html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/debate/historiography/[slug].html` — modified
- `frontend/debate/historiography/index.html` — modified
- `frontend/assets/css/pages/journal-header.css` — modified
- `frontend/assets/css/pages/journal-body.css` — modified
- `frontend/assets/css/main.css` — deleted
- `frontend/assets/js/search.js` — modified
- `api/routes/analytics.js` — modified
- `api/models/search.model.js` — modified
- `api/models/model-helpers.js` — created
- `api/models/about.model.js` — modified
- `api/models/academic-challenges.model.js` — modified
- `api/models/analytics.model.js` — modified
- `api/models/arbor.model.js` — modified
- `api/models/blog-post.model.js` — modified
- `api/models/collection.model.js` — modified
- `api/models/credential.model.js` — modified
- `api/models/essay.model.js` — modified
- `api/models/evidence.model.js` — modified
- `api/models/historiography.model.js` — modified
- `api/models/identifiers.model.js` — modified
- `api/models/map.model.js` — modified
- `api/models/mla-source.model.js` — modified
- `api/models/news-article.model.js` — modified
- `api/models/popular-challenges.model.js` — modified
- `api/models/resource.model.js` — modified
- `api/models/response.model.js` — modified
- `api/models/wikipedia.model.js` — modified
- `api/middleware/validation.js` — deleted
- `shared/constants.js` — deleted
- `setup/Website_guide.md` — modified
- `api/tests/model-helpers.test.js` — created
- `api/tests/analytics.model.test.js` — modified
- `api/tests/search.model.test.js` — created

## Notes
- **The markup corruption found in the 5 journal HTML files' `<head>` and body content (broken `<title>`/`<meta>` tags, a heading split mid-word, a paragraph closed mid-sentence, a stray tag inside an HTML comment) is intentionally NOT fixed here.** A broader scan found the same corruption fingerprint in 22 files across `frontend/` and `admin/` — a distinct, larger body of work the owner asked to track as a separate plan, generated after this one. This plan's CSS-link task touches the same 5 files but only the `<link>` lines, not the surrounding corrupted markup.
- **`validation.js` and `shared/constants.js` are deleted, not adopted**, because adopting either properly is out of proportion to one bullet in a four-part plan: wiring `requireFields`/`requireIntParam` into routes means auditing and editing roughly 20 existing route files' hand-rolled checks; making `shared/constants.js` usable from the CommonJS `api/` layer means either converting it to CommonJS or converting `api/` to ESM. Both are legitimate future plans on their own. Deleting verified-zero-usage code now is safe and reversible (git history) and removes the risk of a future author trusting stale, unreachable "shared" infrastructure.
- The `model-helpers.js` extraction is a pure refactor — every migrated model's public behavior (return shapes, slug collision handling, whitelist enforcement) must be unchanged. The existing test suite is the guardrail; no new test assertions are needed for the migration itself beyond the new `model-helpers.test.js` unit tests.
- `credential.model.js`'s `updateSignCount` and `map.model.js`'s two separate update functions (`maps`, `map_pins`) are each migrated individually to `runUpdate` per table — `runUpdate` takes the table name as a parameter precisely so one model file can call it multiple times for different tables.
- No sitemap changes needed for the CSS/analytics/search tasks (no new files there). The model-helpers work adds `api/models/model-helpers.js` and two test files — add these to `sitemap.md` as part of Step 3 of this plan's generation (already done below).
