---
name: plan_dashboard_news_sources
version: 1.1.0
module: 6.0 — News & Blog
status: complete
created: 2026-05-02
---

# Plan: plan_dashboard_news_sources

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "News Sources" dashboard module, which manages the archival data sources and search criteria used by the automated news ingestion system. It features a dual-pane layout with a main table of news sources and a contextual record-detail sidebar for managing search keywords, source URLs, snippet/slug/meta editing with auto-gen buttons, and the news-crawler launch trigger, with all modifications and crawled items saved as draft until explicitly published. This module enables administrators to control the automated discovery process, launch the news-crawler on demand, and curate the feed of relevant external updates, ensuring the news section remains accurate and current.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Refresh ]   [ Publish ]   [ Crawl ]    |
+---------------------------------------------------------------------------------+
| Record Detail Sidebar         | News Sources List (Main Area)                   |
| (contextual — selected source)|                                                 |
|-------------------------------+-------------------------------------------------|
| SOURCE: Example News          | Source Name          | URL            | Status  |
| URL: example.com/news         | ---------------------+----------------+-------- |
|                               | Example News         | example.com/.. | Active  |
| Search Keywords:              | Christian Post       | cpost.com/rss  | Active  |
| +----------------------------+| Daily Bugle          | bugle.com      | Inactive|
| | keyword 1             [x]  || ...                                            |
| | keyword 2             [x]  || (Endless Scroll)                               |
| +----------------------------+|                                                 |
| [ Add Keyword _________ ] [Add]                                                |
|                               |                                                 |
| ----------------------------- |                                                 |
| Snippet:                       |                                                 |
| [ Latest headlines from...   ]|                                                 |
| Slug: [ example-news       ]  |                                                 |
| Meta: [ {"region":"us"}     ] |                                                 |
| [Auto-gen Snippet] [Auto-gen Slug] [Auto-gen Meta]                             |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]               |
+---------------------------------------------------------------------------------+
``` 

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, work through the tasks sequentially, and ensure each task is fully completed, and marked as complete, before moving to the next.  

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_news_sources.html` | News source management container |
| **CSS** | `css/6.0_news_blog/dashboard/news_sources_dashboard.css` | Pipeline control aesthetics |
| **JS** | `js/6.0_news_blog/dashboard/dashboard_news_sources.js` | Module orchestration & initialization |
| **JS** | `js/6.0_news_blog/dashboard/news_sources_handler.js` | Data fetching & row hydration |
| **JS** | `js/6.0_news_blog/dashboard/launch_news_crawler.js` | News crawler pipeline trigger |
| **JS** | `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js` | Sidebar: keywords, source URLs, crawler trigger |
| **JS** | `js/2.0_records/dashboard/metadata_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Metadata footer |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Automated snippet trigger |
| **Python** | `backend/pipelines/pipeline_news.py` | News crawler pipeline script |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create News Sources HTML

- **File(s):** `admin/frontend/dashboard_news_sources.html`
- **Action:** Create the structural layout for the news sources editor, including the keyword sidebar anchor, the source table container, and the Crawler/Update function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [x] Task complete

---

### T2 — Implement News Sources CSS

- **File(s):** `css/6.0_news_blog/dashboard/news_sources_dashboard.css`
- **Action:** Implement the 'providence' theme styling for the news source table and the search keyword management sidebar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [x] Task complete

---

### T3 — Implement News Sources Orchestrator

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_news_sources.js`
- **Action:** Initialize the news sources module and coordinate the source list management, keyword updates, and pipeline triggers.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T4 — Implement News Sources Handling

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_handler.js`
- **Action:** Implement the logic to fetch, render, and update the list of external news source references and their statuses. On "Refresh", re-fetch the sources list and **set affected records to draft**. On "Publish", commit the current source configuration to live and set all listed records to published.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T5 — Implement Search Keywords Logic

- **File(s):** `js/6.0_news_blog/dashboard/search_keywords_handler.js`
- **Action:** Implement the UI logic for adding, editing, and publishing the search keywords used by the news discovery crawler. All keyword state for the active record is read from and written to the `news_search_term` field (TEXT / JSON Blob). **Any keyword modification auto-saves the record as draft.** Changes must be saved back to the database via the admin API before the crawler is triggered.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T6 — Implement News Crawler Launch Logic

- **File(s):** `js/6.0_news_blog/dashboard/launch_news_crawler.js`
- **Action:** Implement the logic to trigger the backend news-crawler pipeline and display the process status in the universal footer.
- **Dependencies:** `admin/backend/admin_api.py` (`GET /api/admin/news/items`, `POST /api/admin/news/crawl`), `backend/pipelines/pipeline_news.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T7 — Include Metadata Footer (Shared Tool)
- **File(s):** Include `js/2.0_records/dashboard/metadata_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script>` tag and call `window.renderMetadataFooter(containerId, recordId)`. Also include `js/2.0_records/dashboard/snippet_generator.js` and call `window.generateSnippet()`. Shared tools owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

### T8 — Implement News Crawler Pipeline

- **File(s):** `backend/pipelines/pipeline_news.py`
- **Action:** Implement the Python news crawler pipeline. The script must:
  1. Read search keywords from the `system_config` table (`news_keywords` key — JSON blob of keyword strings)
  2. Read news source URLs from the `news_sources` table
  3. Crawl each source URL (RSS feeds / News APIs etc) using `backend/scripts/helper_api.py`
  4. Extract news items matching the search keywords
  5. Save results into the `news_items` field of the anchor record (`slug = 'global-news-feed'`) as a JSON blob with shape: `[{"title": str, "timestamp": ISO-8601 str, "url": str}]`
- **Dependencies:** `admin/backend/admin_api.py` (system_config GET), `backend/scripts/helper_api.py`
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence · API quirks documented inline

- [x] Task complete

---

## Final Tasks

### T9 — Error Message Generation

- **File(s):**
  - `backend/pipelines/pipeline_news.py`
  - `js/6.0_news_blog/dashboard/news_sources_handler.js`
  - `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
  - `js/6.0_news_blog/dashboard/launch_news_crawler.js`
- **Action:** Add structured error message generation at every key failure point across the Python pipeline and JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar. Failure points to cover:

  **Python (`pipeline_news.py`):**
  1. **Source Unreachable** — `requests.get` raises `ConnectionError` or `Timeout` for a source URL: `"Error: Unable to connect to news source '{url}'. Check network or source availability."`
  2. **Feed Parse Failed** — source returns a non-200 status or an unparseable feed format: `"Error: Failed to retrieve news feed from '{url}'. Status: {status}."`
  3. **No Matching Items** — crawler finds zero news items matching any search keyword across all sources: `"Error: No news items found matching the current search keywords."`
  4. **Script Timeout** — overall execution exceeds the configured timeout threshold: `"Error: News crawler timed out after {n}s. Partial results may have been saved."`
  5. **Database Write Failed** — SQLite write raises an exception after a successful crawl: `"Error: Failed to save news items to the database. Write error on 'global-news-feed'."`

  **JavaScript (frontend modules):**
  6. **Sources List Fetch Failed** — `news_sources_handler.js` fetch to `/api/admin/records` fails or returns non-OK: `"Error: Unable to retrieve news sources list. Please refresh."`
  7. **Source Add/Delete Failed** — `news_sources_handler.js` PUT/DELETE for a source returns non-OK: `"Error: Failed to update news source '{name}'. Please try again."`
  8. **Keyword Save Failed** — `news_sources_sidebar_handler.js` PUT for keywords returns non-OK: `"Error: Failed to save search keywords. Please try again."`
  9. **Crawler Launch Failed** — `launch_news_crawler.js` POST to trigger pipeline returns non-OK or times out: `"Error: News crawler did not respond. Pipeline may not have started."`
  10. **Snippet Generation Failed** — `news_sources_sidebar_handler.js` auto-gen snippet request to `snippet_generator.py` returns non-OK: `"Error: Snippet generation failed. Please try again or enter manually."`
  11. **Metadata Save Failed** — `news_sources_sidebar_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for the selected record."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar. Python errors must be returned as structured JSON `{"error": "..."}` in the API response body so the JS layer can relay them.

- **Vibe Rule(s):** Logic is explicit and self-documenting · API quirks or data anomalies documented inline · User Comments

- [x] Task complete

---

### T10 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file
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

#### Shared-Tool Ownership
- [x] `snippet_generator.js` and `metadata_handler.js` included via `<script>` tag from `js/2.0_records/dashboard/` — no local copies created
- [x] This plan does NOT own any shared JS tools

---

### T11 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: The core objective outlined in the summary has been fully met
- [x] **Necessity**: The underlying reason/need for this plan has been resolved
- [x] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new News Sources dashboard files under Module 6.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new news source management files. |
| `documentation/data_schema.md` | Yes | `news_search_term` (TEXT / JSON Blob) added; confirm field is documented. |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool consistency rule to ownership model (§7). |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the News Sources editor with metadata now in sidebar. |
| `documentation/guides/guide_function.md` | Yes | Document news discovery flow, metadata editing in sidebar, and crawler orchestration logic. |
| `documentation/guides/guide_security.md` | Yes | Note validation for source URLs, keywords, metadata fields, and crawler trigger restrictions. |
| `documentation/guides/guide_style.md` | Yes | Document the news source table, sidebar section stacking with horizontal rules, and CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [x] Each "Yes" row has been updated with accurate, current information
- [x] No document contains stale references to files or logic changed by this plan
- [x] Version numbers incremented where frontmatter versioning is present

---

## Dependency Table

> Tasks must not start until every file in their "Depends On" column exists.

### Internal Dependencies

| Task | Depends On (must exist first) |
|------|-------------------------------|
| T1 | — (self-contained HTML) |
| T2 | — (self-contained CSS) |
| T3 | — (self-contained JS orchestrator) |
| T4 | admin/backend/admin_api.py (`GET /api/admin/news/items`, `PUT /api/admin/records/{id}`) |
| T5 | admin/backend/admin_api.py (`GET /api/admin/system/config`, `PUT /api/admin/records/{id}`) |
| T6 | admin/backend/admin_api.py (`POST /api/admin/news/crawl`), backend/pipelines/pipeline_news.py |
| T7 | backend/scripts/snippet_generator.py, backend/scripts/metadata_generator.py, admin/backend/admin_api.py (`POST /api/admin/snippet/generate`, `POST /api/admin/metadata/generate`) |
| T8 | admin/backend/admin_api.py (`GET /api/admin/system/config`), backend/scripts/helper_api.py |
| T9 | T4 (news_sources_handler.js), T5 (news_sources_sidebar_handler.js), T6 (launch_news_crawler.js), T7 (metadata_handler.js), T8 (pipeline_news.py) |
| T10 (Vibe Audit) | All files in File Inventory |
| T11 (Purpose Check) | All tasks complete |

### Cross-Plan Dependencies

| This plan requires | Supplied by | Notes |
|--------------------|-------------|-------|
| `admin/backend/admin_api.py` (`GET /api/admin/news/items`, `POST /api/admin/news/crawl`, `GET /api/admin/system/config`, `PUT /api/admin/records/{id}`) | `plan_backend_infrastructure` | T4/T5/T6/T8 depend on news, system_config, and record endpoints |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T7 auto-gen snippet button triggers this script |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T7 auto-gen meta button triggers this script |
| `backend/scripts/helper_api.py` | Existing shared utility | T8 crawler uses for HTTP requests to news sources |
| `js/2.0_records/dashboard/snippet_generator.js` | `plan_dashboard_records_single` | T7 includes this via `<script>` tag; calls `window.generateSnippet()` |
| `js/2.0_records/dashboard/metadata_handler.js` | `plan_dashboard_records_single` | T7 includes this via `<script>` tag; calls `window.renderMetadataFooter()` |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 module registration with dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T9 error routing to universal Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 Providence CSS custom properties |

### Implementation Order

1. `plan_backend_infrastructure` — must complete first (provides API routes, snippet/metadata/helper scripts)
2. `plan_dashboard_login_shell` — must complete second (provides dashboard router, error handler, CSS variables)
3. `plan_dashboard_records_single` — must complete third (provides shared JS tools: snippet_generator.js, metadata_handler.js)
4. `plan_dashboard_news_sources` — this plan (depends on #1, #2, and #3)
