---
name: plan_dashboard_wikipedia
version: 1.1.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_wikipedia

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Wikipedia" dashboard module, a specialized interface for managing and prioritizing archival Wikipedia article data. It features a dual-pane layout: a contextual record-detail sidebar (showing the selected record's title, slug, Wikipedia weight multiplier, editable search terms, snippet/slug/meta editing with auto-gen buttons, and a per-record recalculate trigger) alongside a main scrollable list of ranked articles. A universal status bar runs across the bottom. Administrators can modify search terms and click "Recalculate" to re-fetch Wikipedia data per record (saved as draft), adjust per-record weight multipliers and click "Refresh" to re-sort the full ranked list (saved as draft), then click "Publish" to commit the final order and set all records to published.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:                       [ Refresh ]   [ Publish ]   [ Recalculate ]               |
+---------------------------------------------------------------------------------+
| Record Detail Sidebar            | Wikipedia Items (Main Area)                  |
| (contextual — selected record)   |                                               |
|----------------------------------+-----------------------------------------------|
| RECORD: Tacitus — Annals         | 1. Tacitus — Annals    (Score: 42)  [select] |
| Slug: tacitus-annals             |    wikipedia.org/wiki/Annals_(Tacitus)         |
|                                  |                                               |
| Wikipedia Weight:                | 2. Josephus — Antiquities (Score: 38) [select] |
| [ x 1.20 ]  [Save Weight]       |    wikipedia.org/wiki/...                      |
|                                  |                                               |
| Wikipedia Search Terms:          | 3. Pliny the Younger   (Score: 35)  [select]  |
| +--------------------------------+    wikipedia.org/wiki/...                      |
| | Tacitus Annals            [x]  |                                               |
| | Tacitus historiography    [x]  | ... (Endless Scroll paginated)                 |
| | Roman historiography Jesus[x]  |                                               |
| +--------------------------------+                                               |
| [ Add Term ___________ ] [Add]   |                                               |
|                                  |                                               |
| --------------------------------- |                                               |
| Snippet:                          |                                               |
| [ Tacitus provides one of the...]|                                               |
| Slug: [ tacitus-annals      ]    |                                               |
| Meta: [ {"era":"early_empire"} ] |                                               |
| [Auto-gen Snippet] [Auto-gen Slug] [Auto-gen Meta]                               |
|                                  |                                               |
| [ Recalculate This Record ]      |                                               |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_wikipedia.html` | Wikipedia list management container |
| **CSS** | `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css` | Sidebar controls & list aesthetics |
| **JS** | `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js` | Module orchestration & initialization |
| **JS** | `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js` | Data fetching & row hydration |
| **JS** | `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js` | Sidebar: weight, search terms, metadata, recalculate |
| **JS** | `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js` | Real-time ranking & weight logic |
| **Python** | `backend/pipelines/pipeline_wikipedia.py` | Wikipedia API ingestion & base-score pipeline |

---

## Dependencies

> Tasks must not start until every file in their "Depends On" column exists.

### Internal Dependencies

| Task | Depends On (must exist first) | Notes |
|------|-------------------------------|-------|
| T1 | — (self-contained HTML) | |
| T2 | `css/typography_colors.css` | References Providence CSS custom properties for colours, fonts, spacing |
| T3 | `js/7.0_system/dashboard/dashboard_app.js` | Registers module with the dashboard router; calls `_setGridColumns()` for wider sidebar |
| T4 | `admin/backend/admin_api.py` | Calls `get_list` to fetch ranked records |
| T5 | `admin/backend/admin_api.py`, `backend/pipelines/snippet_generator.py`, `backend/pipelines/metadata_generator.py` | PUTs weight/search-terms/metadata via API; auto-gen buttons call snippet/metadata scripts |
| T6 | `admin/backend/admin_api.py`, `backend/pipelines/pipeline_wikipedia.py` | Calls `get_list` to read base ranks, `update_list` to commit final scores |
| T7 | `database/database.sqlite` (records table) | Reads `wikipedia_search_terms`; writes `wikipedia_title`, `wikipedia_link`, `wikipedia_rank` |
| T8 | T4, T5, T6, T7, `js/admin_core/error_handler.js` | Error messages route through shared error handler to Status Bar |
| T9 (Vibe Audit) | All files in File Inventory | |
| T10 (Purpose Check) | All tasks complete | |

### Cross-Plan Dependencies

| This plan requires | Supplied by | Notes |
|--------------------|-------------|-------|
| `admin/backend/admin_api.py` (get_list, update_list routes) | `plan_backend_infrastructure` | T3/T4/T5/T6 depend on record CRUD endpoints |
| `backend/pipelines/snippet_generator.py` | `plan_backend_infrastructure` | T5 auto-gen snippet button triggers this script |
| `backend/pipelines/metadata_generator.py` | `plan_backend_infrastructure` | T5 auto-gen meta button triggers this script |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 module registration and `_setGridColumns()` sidebar width hook |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T8 error routing to universal Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 Providence CSS custom properties |
| `database/database.sqlite` (records table) | `plan_backend_infrastructure` | T3/T4 query, T5/T7 read/write record fields |
| `js/4.0_ranked_lists/frontpage/render_wikipedia_list.js` | (public frontend) | T6 final rank values are consumed by the WASM-ordered public list |

### Implementation Order

1. `plan_backend_infrastructure` — must complete first (provides API routes, snippet/metadata scripts, database schema)
2. `plan_dashboard_login_shell` — must complete second (provides dashboard router, grid hooks, error handler, CSS variables)
3. `plan_dashboard_wikipedia` — this plan (depends on #1 and #2)

---

## Tasks

> Each task is a focused, bite-sized unit of work.

> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Wikipedia Dashboard HTML

- **File(s):** `admin/frontend/dashboard_wikipedia.html`
- **Action:** Create the structural container for the Wikipedia editor, including the weighting sidebar anchor, the ranked list container, and the Refresh/Recalculate function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Wikipedia Dashboard CSS

- **File(s):** `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css`
- **Action:** Implement the 'providence' theme dual-pane layout with a fixed record-detail sidebar and high-density list styling for ranked articles. The sidebar must accommodate vertically stacked sections separated by a thin horizontal rule: record info, weight editor, search terms, metadata (snippet/slug/meta), and actions. Use CSS Grid for macro layout and Flexbox for interior section stacking.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Wikipedia Orchestrator

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`
- **Action:** Initialize the Wikipedia module and coordinate the list rendering, sidebar updates, and score recalculation processes. On load, call `_setGridColumns()` to request a wider sidebar ratio (e.g. "2fr" "3fr") since this module has a content-heavy record-detail sidebar.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Wikipedia List Display

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js`
- **Action:** Implement the logic to fetch ranked article data and render it with endless scroll support and total score displays. Each row must include a [select] button that passes the record ID to the sidebar handler.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Record Detail Sidebar (Weight + Search Terms + Metadata)

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** Implement the contextual record-detail sidebar. When a record is selected from the main list, populate and render all sections within the sidebar pane:
  1. **Record info** — display the record title and slug (read-only).
  2. **Weight** — show the current `wikipedia_weight` multiplier in an editable input with a "Save Weight" button that PUTs to `/api/admin/records/{id}` **and sets the record to draft**.
  3. **Search terms** — render `wikipedia_search_terms` as deletable term chips, each with an [x] button. Provide an "Add Term" text input + button that appends to the comma-separated field and saves via PUT **with status set to draft**.
  4. **Metadata** — positioned below a thin horizontal rule within the sidebar:
     - **Snippet** — editable textarea, with an "Auto-gen Snippet" button that calls `snippet_generator.py`.
     - **Slug** — editable input, with an "Auto-gen Slug" button.
     - **Meta** — editable input (JSON blob), with an "Auto-gen Meta" button that calls `metadata_generator.py`.
     - All metadata edits save via PUT to `/api/admin/records/{id}`.
  5. **Actions** — a "Recalculate This Record" button that triggers `pipeline_wikipedia.py` for only the selected record. The pipeline result is saved as draft.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Ranking Calculator

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js`
- **Action:** Implement the logic to compute total ranking scores from the current weights, with full draft/publish cycle integration. The calculator must:
  1. On "Refresh": read all records' current `wikipedia_rank`, apply the admin's weight multipliers from `wikipedia_sidebar_handler.js`, re-sort the list, and **set all affected records to draft**. This ensures re-sorted rankings are not live until explicitly published.
  2. On "Publish": commit the current ranked order to the live frontend data and **set all listed records to published**. This is the only path by which Wikipedia rankings reach the public site.
- **Dependencies:** `admin/backend/admin_api.py` (get_list, update_list), `backend/pipelines/pipeline_wikipedia.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

### T7 — Refactor Wikipedia Pipeline Script

- **File(s):** `backend/pipelines/pipeline_wikipedia.py`
- **Action:** Refactor `pipeline_wikipedia.py` so it is triggered when an admin clicks "Recalculate" and processes one record at a time based on its stored `wikipedia_search_terms`:
  1. Read `wikipedia_search_terms` from the records table (a comma-separated string of terms configured per record via the admin editor).
  2. For each search term, call the Wikipedia REST API (`/w/api.php?action=query&list=search&srsearch=...`) to find matching articles.
  3. Filter results to exclude non-article pages (anything not in `NS_MAIN` namespace 0), disambiguation pages, and list pages.
  4. Select the best match and write `wikipedia_title`, `wikipedia_link`, and `wikipedia_rank` (base importance score derived from pageview data or search rank position) to the record's row in SQLite **with status set to draft** (ingested external data must be reviewed before going live).
  5. The rank is a **base score only** — the admin's `wikipedia_weight` multiplier is applied separately by the frontend ranking calculator on "Refresh".
  6. The script must be stateless and safe to run repeatedly (idempotent — re-running overwrites previous results cleanly).
- **Vibe Rule(s):** Logic is explicit and self-documenting · Scripts are stateless and safe to run repeatedly · API quirks or data anomalies documented inline

- [ ] Task complete

---

### T8 — Error Message Generation

- **File(s):**
  - `backend/pipelines/pipeline_wikipedia.py`
  - `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
  - `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js`
  - `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js`
- **Action:** Add structured error message generation at every key failure point across the Python pipeline and JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar. Failure points to cover:

  **Python (`pipeline_wikipedia.py`):**
  1. **API Unreachable** — `requests.get` raises `ConnectionError` or `Timeout`: `"Error: Unable to connect to the Wikipedia API. Check network or API availability."`
  2. **API Search Failed** — API returns a non-200 status or a response containing `error` key: `"Error: Wikipedia API search failed for term '{term}'. Status: {status}."`
  3. **Empty Result List** — search returns zero results or all results are filtered out (disambiguation/lists/non-article): `"Error: No valid Wikipedia articles found for search term '{term}'."`
  4. **Script Timeout** — overall execution exceeds the configured timeout threshold: `"Error: Wikipedia pipeline timed out after {n}s for record '{slug}'."`
  5. **Database Write Failed** — SQLite write raises an exception after a successful fetch: `"Error: Failed to save Wikipedia data for record '{slug}'. Database write error."`

  **JavaScript (frontend modules):**
  6. **List Fetch Failed** — `wikipedia_list_display.js` fetch to `/api/admin/records` fails or returns non-OK: `"Error: Unable to retrieve Wikipedia ranked list. Please refresh."`
  7. **Weight Save Failed** — `wikipedia_sidebar_handler.js` PUT for weight returns non-OK: `"Error: Failed to save Wikipedia weight for '{title}'."`
  8. **Search Term Save Failed** — `wikipedia_sidebar_handler.js` PUT for search terms returns non-OK: `"Error: Failed to save search terms for '{title}'."`
  9. **Recalculate Trigger Failed** — `wikipedia_sidebar_handler.js` POST to trigger pipeline returns non-OK or times out: `"Error: Recalculate failed for '{title}'. Pipeline did not respond."`
  10. **Rank Refresh Failed** — `wikipedia_ranking_calculator.js` cannot commit updated ranks: `"Error: Failed to refresh Wikipedia rankings. Please try again."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar. Python errors must be returned as structured JSON `{"error": "..."}` in the API response body so the JS layer can relay them.

- **Vibe Rule(s):** Logic is explicit and self-documenting · API quirks or data anomalies documented inline · User Comments

- [ ] Task complete

---

### T9 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T10 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in this plan's tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new Wikipedia dashboard files under Module 4.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new Wikipedia editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the Wikipedia list editor with metadata now in sidebar. |
| `documentation/guides/guide_function.md` | Yes | Document weighting rank logic, metadata editing in sidebar, and ranking recalculation flow. |
| `documentation/guides/guide_security.md` | Yes | Note validation for weighting values, search terms, metadata fields, and rank updates. |
| `documentation/guides/guide_style.md` | Yes | Document dual-pane layout, sidebar section stacking with horizontal rules, and CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
