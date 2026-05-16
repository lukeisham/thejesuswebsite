---
name: decouple_news_sidebar_from_articles
version: 1.0.0
module: 6.0 — News & Blog
status: draft
created: 2026-05-16
---

# Plan: decouple_news_sidebar_from_articles

## Purpose

> Decouple the News Sources dashboard sidebar from the articles table so the sidebar is always editable (source URL, search terms) without requiring a row selection. The Gather function reads source URL and search terms directly from the sidebar inputs and passes them to the backend crawl endpoint. The articles table becomes a pure results display — populated by the Gather function and independently scrollable. The metadata widget's slug and SEO "Generate all" functionality is disabled for this module. This fixes the core UX problem where the sidebar was locked until a row was selected, making it impossible to configure search terms before running a crawl.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Remove sidebar disabled state from `news_sources_sidebar_handler.js`

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Remove `_setSidebarDisabled(true)` call from `initNewsSidebar()` so the sidebar starts enabled. Remove `_setSidebarDisabled(false)` from `populateNewsSidebar()` — it should no longer control enable/disable. Remove the `_setSidebarDisabled()` function entirely. Remove the `_clearSidebar()` function as it's no longer needed (sidebar is never cleared by row deselection). Remove the `disabled` attribute wiring — the sidebar interactive elements should never be disabled.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [ ] Task complete

---

### T2 — Remove sidebar population from row selection in `news_sources_handler.js`

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_handler.js`
- **Action:** Remove the call to `window.populateNewsSidebar(record)` from `_selectNewsArticleRow()`. Row selection should be purely visual (highlight the row). Remove `populateNewsSidebar` exposure from `news_sources_sidebar_handler.js` — it's no longer called.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · Single Responsibility

- [ ] Task complete

---

### T3 — Update `launch_news_crawler.js` to read sidebar data and send to backend

- **File(s):** `js/6.0_news_blog/dashboard/launch_news_crawler.js`
- **Action:** Update `triggerCrawl()` to read `source_url` from `#news-source-url-input` and search terms from `#news-search-terms-input`. POST them as `source_url` and `search_terms` in the request body to `/api/admin/news/crawl`. Update the function's header comment to reflect this change.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [ ] Task complete

---

### T4 — Update backend crawl endpoint to accept sidebar data

- **File(s):** `admin/backend/routes/news.py`
- **Action:** Update `trigger_news_crawl()` to accept an optional JSON body with `source_url` (str) and `search_terms` (list[str]). Pass them as keyword arguments to `run_news_pipeline()`. Update the docstring to document the new parameters. Update `_run_news_pipeline()` to forward the parameters.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks

- [ ] Task complete

---

### T5 — Update `pipeline_news.py` to accept source URL and search terms as parameters

- **File(s):** `backend/pipelines/pipeline_news.py`
- **Action:** Update `run_pipeline()` function signature to accept optional `source_url` and `search_terms` parameters. If provided, use these values directly instead of reading from the database. If not provided, fall back to the current database-reading logic. Update the docstring and header comment.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · Document API quirks

- [ ] Task complete

---

### T6 — Disable slug and SEO in metadata widget for news module

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_news_sources.js`, `js/9.0_cross_cutting/dashboard/metadata_widget.js`
- **Action:** In `dashboard_news_sources.js`, update the `renderMetadataWidget()` call to pass a new option `{ disableSlugAndSeo: true }`. In `metadata_widget.js`, add support for this option: when true, disable the slug input field, hide or disable the "Generate all" button, and disable the snippet generate button. Update both header comments.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · Single Responsibility

- [ ] Task complete

---

### T7 — Update CSS for always-enabled sidebar

- **File(s):** `css/6.0_news_blog/dashboard/news_sources_dashboard.css`
- **Action:** Remove the `.news-sidebar__section.is-disabled` rule — it's no longer used. Remove any disabled-style overrides for the textarea and input that are no longer needed. Clean up the "Sidebar Disabled State" section comment.
- **Vibe Rule(s):** CSS variables · Section headings · No frameworks

- [ ] Task complete

---

## Final Tasks

### T8 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] No HTML changes in this plan

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file (or tightly-related group for a single widget/component)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] No SQL changes in this plan

---

### T9 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: Sidebar is always enabled — no disabled state on initial load or row deselection
- [ ] **Achievement**: Sidebar is independent — editing source URL and search terms no longer requires a selected row
- [ ] **Achievement**: Gather function reads source URL and search terms from sidebar inputs directly
- [ ] **Achievement**: Articles table is a pure results display, populated after Gather runs
- [ ] **Achievement**: Metadata widget slug and SEO generation are disabled for the news module
- [ ] **Necessity**: The core UX problem (sidebar locked until row selection) is resolved
- [ ] **Targeted Impact**: Only the News Sources dashboard module was changed — no other modules affected
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T10 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added or moved — only existing files modified |
| `documentation/simple_module_sitemap.md` | No | No module scope or high-level structure changes |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No database schema changes |
| `documentation/vibe_coding_rules.md` | No | No shared-tool ownership or rule changes |
| `documentation/style_mockup.html` | No | No visual layout changes |
| `documentation/git_vps.md` | No | No deployment or workflow changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | Sidebar layout is unchanged — only behavior changed |
| `documentation/guides/guide_function.md` | No | No new data flows or pipelines — only parameter passing changed |
| `documentation/guides/guide_security.md` | No | No auth, session, or input validation changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens |
| `documentation/guides/guide_maps.md` | No | No map-related changes |
| `documentation/guides/guide_timeline.md` | No | No timeline-related changes |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, or robots.txt changes |

- [ ] **All site-map documents updated:** No changes needed
- [ ] **All ASCII diagrams updated:** No changes needed
- [ ] **Style guide updated:** No changes needed
- [ ] **Shared-tool ownership documented:** No changes needed
- [ ] **Version numbers bumped:** No documents modified
- [ ] **No stale references:** No outdated references in any documentation

---

### T11 — Module Guide Update

> Update the per-module guide files in `documentation/guides/` to reflect all changes made by this plan.

- **File(s):** No module-specific guide files exist for 6.0 News & Blog in `documentation/guides/` — skip this task.

- [ ] Task complete (no module guides to update)

---

### T12 — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
