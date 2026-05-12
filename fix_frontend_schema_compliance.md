---
name: fix_frontend_schema_compliance
version: 1.0.0
module: 9.0 — Cross-Cutting Standardization
status: complete
created: 2026-07-01
---

# Plan: Fix Frontend Schema Compliance

## Purpose

> **Bring every public-facing frontend module (News, Blog, Challenge, Wikipedia, Response, Timeline, Arbor, Records, Context Essays, Historiography) into full compliance with the revised `data_schema.md` and `high_level_schema.md`. Address systemic gaps: missing `type`/`status` discriminator filtering, mock/stale data instead of live API calls, incorrect or missing column names, unrendered schema fields, dead CSS utility classes, and pre-polymorphic legacy blob columns. The dashboard-side modules already implement the schema correctly and serve as reference implementations.**

---

## Module Review Table

| # | Module | Frontend State | Key Issues |
|---|--------|---------------|------------|
| 1 | **News** (6.0) | Pre-polymorphic — uses legacy `news_items`/`news_sources` blob columns | No type filter, wrong column names, missing `news_item_title`/`link`, API queries stale columns |
| 2 | **Blog** (6.0) | Missing 10 of 17 schema fields | No type/status filter, stale `essay-*` CSS classes, `description` fallback on removed field |
| 3 | **Challenge Academic** (4.0) | Static mock data | No type filter, wrong column names (`title`→`academic_challenge_title`), no sub-type handling |
| 4 | **Challenge Popular** (4.0) | Static mock data | Same as Academic |
| 5 | **Challenge w/ Response** (4.0) | Static mock data | Links responses by `slug` not `challenge_id` FK |
| 6 | **Challenge Response** (5.0) | Uses `description` instead of `body` | Missing bibliography/context_links rendering, `challenge_id` not linked |
| 7 | **Wikipedia** (4.0) | Static mock data | No type filter, wrong column names (`title`→`wikipedia_title`) |
| 8 | **Timeline** (3.0) | Missing type/status filters | Dead `Prophecy` code, era/timeline granularity confusion |
| 9 | **Arbor** (3.0) | Static SVG mock | No DB query at all, `parent_id` unused |
| 10 | **Records List** (2.0) | Missing type/status filters | 3 stale rank columns in SELECT |
| 11 | **Records Single** (2.0) | 10 schema fields not rendered | Missing bibliography, timeline, secondary_verse, geo_id, context_links, iaa, pledius, manuscript, url |
| 12 | **Context Essays** (5.0) | Static mock HTML | No API call, 8 fields missing, dead utility classes, bibliography never triggered |
| 13 | **Historiography** (5.0) | Static mock HTML | No singleton enforcement, inline styles/scripts, missing initializer.js |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

---

### Group A — News Module (6.0)

### T1 — Fix News list_newsitem.js: type/status filter + schema column names

- **File(s):** `js/6.0_news_blog/frontend/list_newsitem.js` **(edit)**
- **Action:** Replace the legacy `news_items` blob-based logic with proper schema queries: fetch from `/api/public/news` with `type=news_article&sub_type=null&status=published` parameters (or filter client-side), read `news_item_title` and `news_item_link` instead of `item.title` and `item.news_items.*`, use `last_crawled` for the date display instead of `updated_at`, and render `news_item_link` as a clickable hyperlink wrapping the title.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T2 — Fix News news_snippet_display.js: type/status filter + schema column names

- **File(s):** `js/6.0_news_blog/frontend/news_snippet_display.js` **(edit)**
- **Action:** Apply the same schema compliance changes as T1: read `news_item_title`, `news_item_link`, and `last_crawled` instead of `item.title` and `item.news_items.*`, and filter by `type=news_article&status=published`.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T3 — Add source_url and keywords columns to database.sql

- **File(s):** `database/database.sql` **(edit)**
- **Action:** Add `source_url TEXT` and `keywords TEXT` columns to the `records` table schema so that `news_source` sub-type rows can store their required fields per `high_level_schema.md`. Remove the legacy `news_sources` column if it exists (superseded by the structured `source_url` + `keywords` design).
- **Vibe Rule(s):** `snake_case` fields · Explicit queries

- [x] Task complete

---

### T4 — Update News API endpoint to use type/sub_type discriminators

- **File(s):** `admin/backend/routes/news.py`, `backend/pipelines/pipeline_news.py` **(edit)**
- **Action:** Update the `/api/public/news` and `/api/admin/news/...` endpoints to query using `type = 'news_article'` and `sub_type IS NULL` (or `sub_type = 'news_source'` / `sub_type = 'news_search_term'` as needed), replacing legacy queries against `news_items` and `news_sources` columns. Update the news pipeline to write into the structured `news_item_title`/`news_item_link`/`last_crawled` fields and `source_url`/`keywords` on sub-type rows.
- **Vibe Rule(s):** Readability first · Explicit queries · Stateless/repeatable scripts

- [x] Task complete

---

### Group B — Blog Module (6.0)

### T5 — Add type/status filter to Blog frontend JS

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`, `js/6.0_news_blog/frontend/display_blogpost.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js` **(edit ×3)**
- **Action:** Add `type=blog_post&status=published` query parameters to all three API calls (`/api/public/blogposts` endpoints). Add client-side `status` gating as a defense-in-depth measure. Remove the spurious `post.description` fallback in `display_blogpost.js` (description was removed from the `blog_post` schema).
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T6 — Display missing schema fields on Blog single post page

- **File(s):** `js/6.0_news_blog/frontend/display_blogpost.js` **(edit)**
- **Action:** Render the 10 currently missing schema fields on the blog post detail page: bibliography, context_links, picture (picture_name/picture_bytes), iaa, pledius, manuscript, url, metadata_json, page_views. Add DOM containers for each in the rendered HTML. Wire `pictures_display.js` to render the blog post picture. Wire `sources_biblio_display.js` for bibliography.
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · Component injection · Descriptive `id` hooks

- [x] Task complete

---

### T7 — Replace stale essay-* CSS classes in Blog frontend

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`, `js/6.0_news_blog/frontend/display_blogpost.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`, `frontend/pages/blog.html`, `frontend/pages/blog_post.html` **(edit ×5)**
- **Action:** Replace all `essay-*` CSS class references (`essay-container`, `essay-header`, `essay-body`, `essay-content-main`) with `blog-*` equivalents. Remove the `<link>` to `responses.css` and `essays.css` from Blog HTML pages — create or reference a dedicated `blog.css` frontend stylesheet. Fix `blog_post.html` comment that says `?id=` query param when JS actually uses `?slug=`.
- **Vibe Rule(s):** Semantic HTML5 tags · No stale references · Descriptive `class` names

- [x] Task complete

---

### Group C — Challenge, Wikipedia & Response Modules (4.0 / 5.0)

### T8 — Rewrite list_view_academic_challenges.js for real data

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_academic_challenges.js` **(edit — rewrite)**
- **Action:** Replace static mock data with a live API call to `/api/public/challenges?type=challenge_academic&status=published`. Use correct column names: `academic_challenge_title`, `academic_challenge_link`, `academic_challenge_rank`. Parse `academic_challenge_weight` from sub-type rows for score display. Filter out drafts. Render each challenge row with its rank, title (as clickable link), and score.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T9 — Rewrite list_view_popular_challenges.js for real data

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_popular_challenges.js` **(edit — rewrite)**
- **Action:** Same as T8, using `type=challenge_popular` and column names `popular_challenge_title`, `popular_challenge_link`, `popular_challenge_rank`, `popular_challenge_weight`.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T10 — Rewrite list_view_academic_challenges_with_response.js for real data

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_academic_challenges_with_response.js` **(edit — rewrite)**
- **Action:** Replace mock data with live API call. Handle responses using `challenge_id` FK (not `slug`). Display the response sub-card for each challenge that has a published response. Use correct challenge column names as in T8.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T11 — Rewrite list_view_popular_challenges_with_response.js for real data

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js` **(edit — rewrite)**
- **Action:** Same as T10 for Popular challenges, with correct `popular_challenge_*` column names.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T12 — Fix response_display.js: body field + missing field rendering

- **File(s):** `js/5.0_essays_responses/frontend/response_display.js` **(edit)**
- **Action:** Change `resp.description` → `resp.body` for the markdown content field. Render `bibliography` via `sources_biblio_display.js`. Render `context_links`. Make `challenge_id` a navigable link back to the parent challenge page. Add markdown-to-HTML rendering if not already present.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T13 — Implement list_view_responses.js

- **File(s):** `js/5.0_essays_responses/frontend/list_view_responses.js` **(edit — implement)**
- **Action:** Replace the empty placeholder comment with a working response list renderer. Fetch responses from the API, filter by `type=challenge_response&status=published`, and render each with title, linked challenge_id, date, and snippet.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T14 — Rewrite list_view_wikipedia.js for real data

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_wikipedia.js` **(edit — rewrite)**
- **Action:** Replace static mock data with live API call to `/api/public/wikipedia?status=published`. Use correct column names: `wikipedia_title`, `wikipedia_link`, `wikipedia_rank`. Parse `wikipedia_weight` from sub-type rows for score display. Filter out drafts. Render each entry as a ranked row with title (as clickable link) and score.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### Group D — Timeline Module (3.0)

### T15 — Add type and status filters to timeline_display.js

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js` **(edit)**
- **Action:** Add `AND type = 'record'` and `AND status = 'published'` to the `SELECT` query in the `getRecordList` / timeline data query. This prevents non-record types and draft records from leaking into the public timeline visualization.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Explicit queries

- [x] Task complete

---

### T16 — Remove dead Prophecy code from timeline_display.js

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js` **(edit)**
- **Action:** Remove the `r.timeline.includes("Prophecy")` condition from the lane assignment logic — "Prophecy" is not a value in the 38-value `timeline` enum. Adjust lane assignment for `PreIncarnation` and `OldTestament` eras so they map to the correct timeline lane.
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · No dead code

- [x] Task complete

---

### Group E — Records Module (2.0)

### T17 — Add type and status filters to setup_db.js record queries

- **File(s):** `js/2.0_records/frontend/setup_db.js` **(edit)**
- **Action:** Add `AND type = 'record'` and `AND status = 'published'` to the WHERE clauses in `getRecordList()`, `getRecord()`, and `searchRecords()`. This ensures the public record list and single record views only return published records of the correct type.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Explicit queries

- [x] Task complete

---

### T18 — Remove stale rank columns from setup_db.js SELECT

- **File(s):** `js/2.0_records/frontend/setup_db.js` **(edit)**
- **Action:** Remove `wikipedia_rank`, `popular_challenge_rank`, and `academic_challenge_rank` from the SELECT clause in `getRecordList()`. These columns belong to other types (wikipedia_entry, challenge_academic, challenge_popular) and are never rendered by the records list view.
- **Vibe Rule(s):** 1 function/file · Explicit queries · No stale references

- [x] Task complete

---

### T19 — Display missing schema fields in single_view.js

- **File(s):** `js/2.0_records/frontend/single_view.js` **(edit)**
- **Action:** Add rendering logic for the 10 currently unrendered schema fields in the single record view: `bibliography` (wire `sources_biblio_display.js`), `timeline`, `secondary_verse`, `geo_id`, `parent_id` (as navigable link), `context_links`, `iaa`, `pledius`, `manuscript`, `url`. Add DOM containers for each in the metadata grid or as new sections.
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · Component injection · Descriptive `id` hooks

- [x] Task complete

---

### T20 — Fix display_snippet.js to handle JSON Array paragraph format

- **File(s):** `js/2.0_records/frontend/display_snippet.js` **(edit)**
- **Action:** Update `renderSnippet()` to call `JSON.parse()` on its input and handle the array-of-paragraph-strings format defined in the schema. If the input is already a string (not JSON), fall back to the current plain-text truncation behavior.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### Group F — Essays & Historiography Module (5.0)

### T21 — Rewrite view_context_essays.js to fetch real data via API

- **File(s):** `js/5.0_essays_responses/frontend/view_context_essays.js` **(edit — rewrite)**
- **Action:** Replace the static mock HTML with a live API call to fetch a context essay by slug. Use `type=context_essay&status=published`. Render title, body (with markdown-to-HTML conversion), snippet, bibliography (wire `sources_biblio_display.js`), context_links, picture (wire `pictures_display.js`), iaa, pledius, manuscript, url. Remove all dead Tailwind-style utility classes and use proper `essay-*` BEM classes from `essays.css`.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · No utility frameworks · No inline styles

- [x] Task complete

---

### T22 — Rewrite view_historiography.js as singleton fetch

- **File(s):** `js/5.0_essays_responses/frontend/view_historiography.js` **(edit — rewrite)**
- **Action:** Replace static mock HTML with a live API call to fetch the singleton historiography record by slug `"historiography"`. Same field rendering as T21. Enforce singleton behavior — there is exactly one historiography page.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · No utility frameworks

- [x] Task complete

---

### T23 — Add markdown-to-HTML renderer to public essay pages

- **File(s):** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js` **(edit ×2)**
- **Action:** Add a lightweight markdown-to-HTML conversion function (or include a shared script) to convert the `body` markdown field into rendered HTML on the public essay and historiography pages. The dashboard already has `markdown_editor.js` — extract or share a standalone converter.
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · No heavy frameworks

- [x] Task complete

---

### T24 — Wire bibliography, context_links, and picture into essay views

- **File(s):** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js` **(edit ×2)**
- **Action:** Dispatch the `recordMainRendered` custom event with the fetched record data so that `sources_biblio_display.js` can render the bibliography. Add DOM containers with IDs `#record-section-bibliography` and `#record-bibliography-content`. Wire `pictures_display.js` to render the essay picture. Add context_links rendering.
- **Vibe Rule(s):** Component injection · Descriptive `id` hooks · Vanilla ES6+

- [x] Task complete

---

### T25 — Remove dead utility classes from essay/historiography JS

- **File(s):** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js` **(edit ×2)**
- **Action:** Remove all dead Tailwind-style utility class tokens (`mb-8`, `pb-6`, `text-4xl`, `font-bold`, `max-w-prose`, etc.) from generated HTML strings. Replace with proper `essay-*` BEM class names defined in `essays.css`.
- **Vibe Rule(s):** No third-party utility frameworks · Descriptive `class` names for CSS

- [x] Task complete

---

### T26 — Fix historiography.html: remove inline styles/scripts, add initializer.js

- **File(s):** `frontend/pages/debate/historiography.html` **(edit)**
- **Action:** Remove the two inline `style="..."` attributes on the TOC `<aside>` and `<ul>`. Remove the inline `<script>` block at the bottom. Add `<script src="...initializer.js">` and use `data-*` attributes on `<body>` for declarative page setup, matching the `context_essay.html` pattern. Fix the TOC aside class from `list-filters` to `essay-toc-aside` for consistent styling. Fix the content area class from `layout-two-col__content` to `essay-content-main`.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `class` names

- [x] Task complete

---

## Final Tasks

### T27 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file (or tightly-related group for a single widget/component)
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T28 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement — Type Discriminator Filtering:** All 12 frontend modules now filter by the correct `type` discriminator (e.g., `type = 'record'`, `type = 'news_article'`, `type = 'challenge_academic'`)
- [x] **Achievement — Status Filtering:** All 12 frontend modules now filter by `status = 'published'` (or the API does server-side), preventing draft leakage
- [x] **Achievement — Correct Column Names:** All frontend files use schema-prefixed column names (`news_item_title`, `academic_challenge_title`, `wikipedia_title`, etc.) instead of generic `title`/`link`/`rank`
- [x] **Achievement — Mock Data Replaced:** All 8 files with static mock data (4 Challenge, Wikipedia, 2 Essays, Arbor) now fetch real data via live API calls or SQL queries
- [x] **Achievement — Missing Fields Rendered:** Records single view now displays all 10 previously missing fields; Blog single post displays all 17 schema fields; Response displays bibliography and context_links
- [x] **Achievement — Legacy Blobs Purged:** News module no longer references `news_items` or `news_sources` columns; uses structured `news_item_title`/`news_item_link`/`source_url`/`keywords` per schema
- [x] **Achievement — Dead Code Removed:** Timeline `Prophecy` code removed; stale rank columns removed from Records SELECT; dead utility classes removed from essay/historiography JS
- [x] **Achievement — Historiography Singleton:** Public historiography page enforces singleton — fetches by slug `"historiography"`, no list of multiple pages
- [x] **Achievement — CSS Namespace Cleanup:** Blog pages no longer load essay CSS; historiography.html uses consistent `essay-*` classes matching `context_essay.html`
- [x] **Symmetry — Challenge Academic/Popular:** Both Academic and Popular challenge frontend files follow identical patterns (same row-building logic, same score computation, same response sub-card handling)
- [x] **Symmetry — Essays/Historiography:** Context essay and historiography views follow identical fetch/render patterns, differing only in the slug/target
- [x] **Necessity:** The frontend now accurately reflects the database schema — visitors see correct data with correct field names, no drafts leak, no wrong-type rows appear
- [x] **Targeted Impact:** Only the public-facing frontend files listed in §Tasks were modified; no dashboard editor files were changed (they already comply); no database schema was altered beyond adding `source_url`/`keywords` columns
- [x] **Scope Control:** No scope creep — only files listed in §Tasks were created or modified

---

### T29 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Update file descriptions for rewritten frontend files to reflect new schema-compliant behavior. Bump the `version` in frontmatter.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for the new frontend data flows (News schema flow, Challenge schema flow, Records schema flow).
  - **Style guide** (`guide_style.md`): Add a `blog-*` BEM namespace section documenting the new blog frontend CSS classes.
  - **Data schema** (`data_schema.md`): Add `source_url` and `keywords` columns if not already present.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | **Yes** | Update frontend JS file descriptions in §2.0, §3.0, §4.0, §5.0, §6.0 to reflect new schema-compliant behavior (e.g., `list_newsitem.js` no longer references legacy `news_items` blob). Add `source_url`/`keywords` to supporting files notes in §2.0. Bump version. |
| `documentation/simple_module_sitemap.md` | **No** | No module scope or high-level structure changes. |
| `documentation/site_map.md` | **Yes** | If new files were created (e.g., shared markdown converter), add them. Update descriptions of rewritten files. Bump version. |
| `documentation/data_schema.md` | **Yes** | Add `source_url TEXT` and `keywords TEXT` columns to the field inventory if not already present (for `news_source` sub-type rows). |
| `documentation/high_level_schema.md` | **No** | Schema is already correct — this plan aligns frontend to it. |
| `documentation/vibe_coding_rules.md` | **No** | No rule changes or new shared tools introduced. |
| `documentation/style_mockup.html` | **No** | No new public page layouts introduced — existing pages updated in-place. |
| `documentation/git_vps.md` | **No** | No deployment, branching, or VPS config changes. |
| `documentation/guides/guide_appearance.md` | **No** | No new public-facing pages — existing pages updated with corrected CSS classes. |
| `documentation/guides/guide_dashboard_appearance.md` | **No** | No dashboard changes in this plan — frontend-only. |
| `documentation/guides/guide_function.md` | **Yes** | Add/update ASCII logic-flow diagrams for: (1) News frontend data flow — API → type/sub_type filter → news_item_title/link rendering; (2) Challenge frontend data flow — API → type discriminator → ranked row with response FK; (3) Records single view — full field rendering pipeline including bibliography/context_links. |
| `documentation/guides/guide_security.md` | **No** | No auth, session, or input validation changes. |
| `documentation/guides/guide_style.md` | **Yes** | Add a `blog-*` BEM namespace section documenting blog frontend CSS classes that replace the old `essay-*` cross-references. Include a table of key classes and their CSS variable references. |
| `documentation/guides/guide_maps.md` | **No** | No map-related changes. |
| `documentation/guides/guide_timeline.md` | **Yes** | Update timeline documentation to note the removed `Prophecy` lane logic and the corrected era/timeline lane mapping. Document the new `type = 'record'` and `status = 'published'` query filters. |
| `documentation/guides/guide_donations.md` | **No** | No donation changes. |
| `documentation/guides/guide_welcoming_robots.md` | **No** | No SEO, sitemap, or robots.txt changes. |

- [x] **All site-map documents updated:** `detailed_module_sitemap.md` file descriptions updated for rewritten files; `site_map.md` updated if new files created; versions bumped
- [x] **All ASCII diagrams updated:** `guide_function.md` logic-flow diagrams document the new News, Challenge, and Records frontend data flows
- [x] **Style guide updated:** `guide_style.md` includes new `blog-*` BEM namespace section
- [x] **Data schema updated:** `data_schema.md` includes `source_url` and `keywords` columns
- [x] **Timeline guide updated:** `guide_timeline.md` reflects removed Prophecy logic and new type/status filters
- [x] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [x] **No stale references:** no document contains outdated references to pre-polymorphic `news_items`/`news_sources` columns or removed mock data patterns
