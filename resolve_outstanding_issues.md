---
name: resolve_outstanding_issues
version: 1.0.0
module: 7.0 — System (cross-cutting cleanup)
status: draft
created: 2026-07-01
---

# Plan: resolve_outstanding_issues

## Purpose

> Resolve the 4 open plan_issues.md entries (#10, #12, #17, #23) and 2 diagnostic warnings from the project's Python backend pipelines. This cross-cutting cleanup consolidates duplicated `escapeHtml`/`formatDate` utility functions from 7 Group C frontend display files into a shared utility file (`js/9.0_cross_cutting/frontend/html_utils.js`), removes stale `users` column references from `guide_dashboard_appearance.md` and `guide_function.md`, namespaces `scheduleAutoSave` global function exports across 5 dashboard modules (record_status_handler, wikipedia_sidebar_handler, document_status_handler, blog_post_status_handler, news_sources_sidebar_handler) to prevent function clobber, removes a dead admin API route (`GET /api/admin/responses/{response_id}`) that is never consumed by the dashboard, and fixes 88-column line-length warnings in two challenge pipeline files (`pipeline_academic_challenges.py` and `pipeline_popular_challenges.py`). All changes are within the existing codebase — no new pages, database migrations, or visual changes.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.
> 4. **Cross-reference `documentation/detailed_module_sitemap.md`** every 3 tasks to verify file paths and module scope.

### T1 — Create shared frontend HTML utility file

- **File(s):** `js/9.0_cross_cutting/frontend/html_utils.js`
- **Action:** Create a new shared utility file at `js/9.0_cross_cutting/frontend/html_utils.js` containing two globally-exposed helper functions: `window.escapeHtml(str)` (basic HTML escaping for safe DOM injection) and `window.formatDateLong(isoString)` (formats ISO date to "Month Day, Year" via `toLocaleDateString`). Include the standard 3-line header comment (trigger/function/output). Follow the shared-tool ownership pattern from `vibe_coding_rules.md` §7 — this file is OWNED by this plan and lives in `9.0_cross_cutting/frontend/`. Consumers add a `<script>` tag before their display script and call `escapeHtml()` / `formatDateLong()` globally.
- **Vibe Rule(s):** 1 function per file group · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Shared-tool ownership (§7)

- [ ] Task complete

---

### T2 — Refactor `list_view_academic_challenges.js` to use shared utilities

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_academic_challenges.js`
- **Action:** Remove the local `function escapeHtml(str)` definition (last ~8 lines before the DOMContentLoaded listener). The function body is identical to the shared version in `html_utils.js`. The file will still work because `escapeHtml` resolves via scope chain to `window.escapeHtml` from the shared script (loaded before this one in the HTML page).
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T3 — Refactor `list_view_academic_challenges_with_response.js` to use shared utilities

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_academic_challenges_with_response.js`
- **Action:** Remove the local `function escapeHtml(str)` definition (last ~8 lines before the DOMContentLoaded listener). Function body is identical to the shared version.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T4 — Refactor `list_view_popular_challenges.js` to use shared utilities

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_popular_challenges.js`
- **Action:** Remove the local `function escapeHtml(str)` definition (last ~8 lines before the DOMContentLoaded listener). Function body is identical to the shared version.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T5 — Refactor `list_view_popular_challenges_with_response.js` to use shared utilities

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js`
- **Action:** Remove the local `function escapeHtml(str)` definition (last ~8 lines before the DOMContentLoaded listener). Function body is identical to the shared version.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T6 — Refactor `list_view_wikipedia.js` to use shared utilities

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_wikipedia.js`
- **Action:** Remove the local `function escapeHtml(str)` definition (last ~8 lines before the DOMContentLoaded listener). Function body is identical to the shared version.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T7 — Refactor `list_view_responses.js` to use shared utilities

- **File(s):** `js/5.0_essays_responses/frontend/list_view_responses.js`
- **Action:** Remove the local `function escapeHtml(str)` and `function formatDate(isoString)` definitions (at end of file, before the DOMContentLoaded listener). Replace all 2 calls to `formatDate(...)` with `formatDateLong(...)` to match the shared function name. Calls to `escapeHtml(...)` remain unchanged (shared version has same name).
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T8 — Refactor `response_display.js` to use shared utilities

- **File(s):** `js/5.0_essays_responses/frontend/response_display.js`
- **Action:** Remove the local `function escapeHtml(str)` and `function formatDate(isoString)` definitions (at end of file, before the DOMContentLoaded listener). Replace the single call to `formatDate(date)` with `formatDateLong(date)`. The `parseInlineMarkdown()` function calls `escapeHtml()` internally — it will resolve to `window.escapeHtml` via scope chain.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T9 — Add `<script>` tags for shared utils to Group C HTML pages

- **File(s):**
  - `frontend/pages/debate/academic_challenge.html`
  - `frontend/pages/debate/popular_challenge.html`
  - `frontend/pages/debate/response.html`
  - `frontend/pages/debate/wikipedia.html`
  - `frontend/pages/debate/historiography.html` (add even though `view_historiography.js` uses `escapeHtmlHist` not shared — add for consistency and future use)
- **Action:** In each HTML page, add a `<script src="...js/9.0_cross_cutting/frontend/html_utils.js">` tag immediately before the display logic `<script>` tag that loads the refactored file. The path should be relative to the page location (e.g., `../../../js/9.0_cross_cutting/frontend/html_utils.js` for pages in `frontend/pages/debate/`, `../../js/9.0_cross_cutting/frontend/html_utils.js` for `frontend/pages/`). Ensure backward compatibility by placing shared utils before any script that depends on `escapeHtml`.
- **Vibe Rule(s):** Clean skeletons · No inline scripts · Semantic HTML5 tags

- [ ] Task complete

---

### T10 — Remove stale `users` column references from `guide_dashboard_appearance.md`

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Edit 4 locations where the `users` column is listed as a current database field:
  1. Line ~197 — Field table row: `users | TEXT (JSON Blob) | System-managed (not manually edited)` — remove this row.
  2. Line ~366 — Field listing in ASCII diagram: `users → system-managed` — remove this line.
  3. Line ~1311 — DB Fields block: `users TEXT (JSON Blob) — access control; set programmatically` — remove this line.
  4. Line ~1641 — Core identity columns table: remove `users` from the "Content metadata columns" bullet list.
  After removing references, verify the table/ASCII diagram formatting remains clean (no orphaned delimiters).
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory check

- [ ] Task complete

---

### T11 — Remove stale `users` column references from `guide_function.md`

- **File(s):** `documentation/guides/guide_function.md`
- **Action:** Edit 3 locations where the `users` column is referenced:
  1. Line ~178 — ASCII diagram showing `WHERE users = 'Public'` SQL query — replace `users = 'Public'` with `status = 'published'` (the actual public filter used by the frontend API).
  2. Line ~1557 — ASCII pipeline description for MCP Server: `Excluded: users column never selected` — update to `Excluded: system-managed columns never selected` (since the MCP never selects `users` which no longer exists, the intent is the same but wording should reflect current schema).
  3. Line ~1569 — MCP pipeline diagram: `Excluded: users column never selected` — same update as above.
  Use Python string-replacement via `terminal` for any sections containing ASCII box-drawing characters to avoid `edit_file` matcher issues.
- **Vibe Rule(s):** Source-of-Truth Discipline · Documentation accuracy

- [ ] Task complete

---

### T12 — Namespace `scheduleAutoSave` in `record_status_handler.js`

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Rename the local `function scheduleAutoSave()` to `function scheduleRecordStatusAutoSave()`. Update the internal reference in `_wireAutoSave()` (both `scheduleAutoSave` calls). Update the global exposure line to `window.scheduleRecordStatusAutoSave = scheduleRecordStatusAutoSave;`. Update the function's header comment "FUNCTION: scheduleAutoSave" to "FUNCTION: scheduleRecordStatusAutoSave".
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T13 — Namespace `scheduleAutoSave` in `wikipedia_sidebar_handler.js`

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** Rename the local `function scheduleAutoSave()` to `function scheduleWikipediaAutoSave()`. Update the function's header comment. Update the global exposure line to `window.scheduleWikipediaAutoSave = scheduleWikipediaAutoSave;`.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T14 — Namespace `scheduleAutoSave` in `document_status_handler.js`

- **File(s):** `js/5.0_essays_responses/dashboard/document_status_handler.js`
- **Action:** Rename the local `function scheduleAutoSave()` to `function scheduleEssayDocumentAutoSave()`. Update the function's header comment. Update the global exposure line to `window.scheduleEssayDocumentAutoSave = scheduleEssayDocumentAutoSave;`.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T15 — Namespace `scheduleAutoSave` in `blog_post_status_handler.js`

- **File(s):** `js/6.0_news_blog/dashboard/blog_post_status_handler.js`
- **Action:** Rename the local `function scheduleAutoSave()` to `function scheduleBlogPostAutoSave()`. Update the function's header comment. Update the global exposure line to `window.scheduleBlogPostAutoSave = scheduleBlogPostAutoSave;`.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T16 — Namespace `scheduleAutoSave` in `news_sources_sidebar_handler.js`

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Rename the local `function scheduleAutoSave()` to `function scheduleNewsSourcesAutoSave()`. Update the function's header comment. Update the global exposure line to `window.scheduleNewsSourcesAutoSave = scheduleNewsSourcesAutoSave;`.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T17 — Remove dead admin API route `GET /api/admin/responses/{response_id}`

- **File(s):** `admin/backend/routes/responses.py`
- **Action:** Remove the `get_single_response` function (lines ~136–168) and its route decorator `@router.get("/api/admin/responses/{response_id}")`. This route queries by `id` but the dashboard loads responses by `slug` using the generic `/api/admin/records/{id}` endpoint, making this dead code. The `@router` import and other routes in the file remain untouched.
- **Vibe Rule(s):** Explicit readable code · No dead code

- [ ] Task complete

---

### T18 — Fix line length warning in `pipeline_academic_challenges.py`

- **File(s):** `backend/pipelines/pipeline_academic_challenges.py`
- **Action:** Shorten line 68 (currently ~120 characters) by breaking the SQL string across multiple lines. The line contains: `"SELECT id, slug, academic_challenge_weight FROM records WHERE slug IS NOT NULL AND type = 'challenge_academic'"`. Split it into a multi-line string using implicit string concatenation with parentheses or a backslash, keeping the total under 88 characters per PEP 8.
- **Vibe Rule(s):** Readability first · Explicit readable logic

- [ ] Task complete

---

### T19 — Fix line length warning in `pipeline_popular_challenges.py`

- **File(s):** `backend/pipelines/pipeline_popular_challenges.py`
- **Action:** Shorten line 69 (currently ~118 characters) by breaking the SQL string across multiple lines. The line contains: `"SELECT id, slug, popular_challenge_weight FROM records WHERE slug IS NOT NULL AND type = 'challenge_popular'"`. Same pattern as T18.
- **Vibe Rule(s):** Readability first · Explicit readable logic

- [ ] Task complete

---

## Final Tasks

### T20 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

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
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T21 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement 1:** Duplicated `escapeHtml`/`formatDate` consolidated into shared `html_utils.js` — 7 Group C files refactored, local definitions removed
- [ ] **Achievement 2:** Stale `users` column references removed from `guide_dashboard_appearance.md` (4 locations) and `guide_function.md` (3 locations)
- [ ] **Achievement 3:** `scheduleAutoSave` namespaced in all 5 remaining dashboard modules (record_status, wikipedia_sidebar, document_status, blog_post_status, news_sources_sidebar)
- [ ] **Achievement 4:** Dead admin API route `GET /api/admin/responses/{response_id}` removed from `responses.py`
- [ ] **Achievement 5:** Line-length warnings resolved in `pipeline_academic_challenges.py` and `pipeline_popular_challenges.py`
- [ ] **Necessity:** All 4 open plan_issues.md entries resolved and 2 diagnostic warnings cleared
- [ ] **Targeted Impact:** Only the files listed in §Tasks were created or modified
- [ ] **Scope Control:** No scope creep — no new pages, database migrations, or visual changes

---

### T22 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new file entry under §9.0 Cross-Cutting (create section if missing): `js/9.0_cross_cutting/frontend/html_utils.js` — "Shared HTML utility: `escapeHtml`, `formatDateLong`". Bump version to 2.10.4. |
| `documentation/simple_module_sitemap.md` | No | Module scope unchanged — no high-level structure change |
| `documentation/site_map.md` | Yes | Add `js/9.0_cross_cutting/frontend/html_utils.js` to the master file tree. Bump version. |
| `documentation/data_schema.md` | No | No database schema changes |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 shared-tool ownership table: Add new row for this plan owning `html_utils.js` in `js/9.0_cross_cutting/frontend/`. Consumed by: 4.0 Ranked Lists frontend, 5.0 Essays & Responses frontend, 6.0 News & Blog frontend. Bump version. |
| `documentation/style_mockup.html` | No | No visual or layout changes |
| `documentation/git_vps.md` | No | No deployment/workflow changes |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Remove stale `users` column references from field table (§7.1 system_data), ASCII field listing, DB Fields block, and core identity columns table (done in T10). Bump version. |
| `documentation/guides/guide_function.md` | Yes | Update stale `users` column references in frontend search ASCII diagram (§1.0) and MCP Server pipeline diagram (§5.0) (done in T11). Bump version. |
| `documentation/guides/guide_security.md` | No | No auth/session/input validation changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens |
| `documentation/guides/guide_maps.md` | No | No map-related changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation flow changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO/robots changes |

- [ ] **Site maps updated:** `detailed_module_sitemap.md` file trees reflect `js/9.0_cross_cutting/frontend/html_utils.js`; `site_map.md` master tree updated and version bumped
- [ ] **ASCII diagrams updated:** `guide_function.md` diagrams updated for `users` → `status` / wording changes
- [ ] **Style guide updated:** No changes needed
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated with `html_utils.js` entry
- [ ] **Version numbers bumped:** Every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** `guide_dashboard_appearance.md` no longer references `users` column; `guide_function.md` updated to reflect current schema
