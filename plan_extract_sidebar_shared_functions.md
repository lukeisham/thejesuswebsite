---
name: plan_extract_sidebar_shared_functions
version: 1.0.0
module: 4.0 & 6.0 — Ranked Lists & News/Blog
status: draft
created: 2026-05-05
---

# Plan: Extract Shared Sidebar Functions into `js/admin_core/`

## Purpose

> This plan extracts 5 duplicated functions shared between `wikipedia_sidebar_handler.js` (662 lines, 11 functions) and `news_sources_sidebar_handler.js` (650 lines, 11 functions) into dedicated reusable modules in `js/admin_core/`. Each extracted function becomes its own file with a `window.*` global entry point, parameterised by a `config` object so both sidebars can call the same code. The two sidebar files are then rewritten to import these shared functions, shrinking each from ~650 lines to ~250 lines and aligning with the project's "one function per file" JS rule.

---

## Tasks

> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create `js/admin_core/autogen_snippet.js`

- **File(s):** `js/admin_core/autogen_snippet.js`
- **Action:** Create a single-function module exposing `window.triggerAutoGenSnippet(state, config)`. Calls `POST /api/admin/snippet/generate`, populates the snippet textarea, and surfaces errors. `config` provides `{ prefix, snippetInputId, spinnerBtnId }`. Both Wikipedia and News News sidebars currently duplicate this logic identically apart from element IDs and state field names — those differences are supplied via `config`. The function is stateless (it reads from `state`, writes to DOM, calls fetch).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/main/output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T2 — Create `js/admin_core/autogen_slug.js`

- **File(s):** `js/admin_core/autogen_slug.js`
- **Action:** Create `window.triggerAutoGenSlug(state, config)`. Generates a URL-friendly slug from `state.title` (lowercase, strip non-alphanumeric, collapse hyphens). Populates the slug input element from `config.slugInputId` and surfaces a success message. The two existing implementations differ only in element ID and a minor regex variation — the shared function uses the more robust News regex (which strips special characters before collapsing whitespace).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T3 — Create `js/admin_core/autogen_meta.js`

- **File(s):** `js/admin_core/autogen_meta.js`
- **Action:** Create `window.triggerAutoGenMeta(state, config)`. Calls `POST /api/admin/metadata/generate`, populates the meta textarea with the JSON result, disables/re-enables the spinner button during the request, and surfaces success/error messages. Same pattern as `autogen_snippet.js`. `config` provides `{ prefix, metaInputId, spinnerBtnId }`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T4 — Create `js/admin_core/sidebar_save_metadata.js`

- **File(s):** `js/admin_core/sidebar_save_metadata.js`
- **Action:** Create `window.saveSidebarMetadata(state, config)`. Reads snippet, slug, and meta values from DOM inputs specified by `config`, compares against current state values to avoid no-op saves, builds a minimal diff payload, sends `PUT /api/admin/records/{id}`, and updates state on success. `config` provides `{ prefix, snippetInputId, slugInputId, metaInputId, stateFieldMap }`. The Wikipedia version sets status to draft on every save; the News version skips saves when nothing changed. The shared function uses the safer News approach (skip no-op saves) but always sets status to draft when saving.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T5 — Create `js/admin_core/sidebar_term_chips.js`

- **File(s):** `js/admin_core/sidebar_term_chips.js`
- **Action:** Create two tightly-coupled functions in one file: `window.addSidebarTerm(state, config)` and `window.removeSidebarTerm(state, config, index)`. Both save the term list as a JSON array via `PUT /api/admin/records/{id}`, clear/update the input, call `config.renderFn()` to re-render the chip list, and surface success/error messages. `config` provides `{ prefix, termColumn, inputId, renderFn }`. The `termColumn` maps to the database column name (`wikipedia_search_term` vs `news_search_term`). These two functions are kept together because they operate on the same data structure and share the same config validation.
- **Vibe Rule(s):** 2 functions in one file (tightly coupled pair) · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T6 — Rewrite `wikipedia_sidebar_handler.js` to use shared functions

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** Replace the inline `_handleAutoGenSnippet`, `_handleAutoGenSlug`, `_handleAutoGenMeta`, `_handleSaveMetadata`, `_handleAddTerm`, and `_handleRemoveTerm` implementations with calls to the `window.*` shared functions imported in T1–T5. Each call passes a `config` object with the `"wikipedia-"` prefix and Wikipedia-specific element IDs. Keep `initWikipediaSidebar`, `populateWikipediaSidebar`, `_clearSidebar`, `_renderSearchTerms`, `_handleSaveWeight`, and `_handleRecalculateRecord` as-is (they are unique to Wikipedia). Expected result: file shrinks from ~662 lines to ~250 lines.
- **Vibe Rule(s):** Vanilla ES6+ · component injection · descriptive `id` hooks

- [ ] Task complete

---

### T7 — Rewrite `news_sources_sidebar_handler.js` to use shared functions

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Same as T6 but for the News Sources sidebar. Replace `_handleAutoGenSnippet`, `_handleAutoGenSlug`, `_handleAutoGenMeta`, `_handleSaveMetadata`, `_handleAddTerm`, `_handleRemoveTerm` with shared function calls using `config` with the `"news-"` prefix. Keep `initNewsSourcesSidebar`, `populateNewsSourcesSidebar`, `_clearSidebar`, `_renderSearchKeywords`, and `_handleSaveUrl`. Expected result: file shrinks from ~650 lines to ~250 lines.
- **Vibe Rule(s):** Vanilla ES6+ · component injection · descriptive `id` hooks

- [ ] Task complete

---

### T8 — Update `admin/frontend/dashboard.html` — load shared scripts before modules

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Insert `<script>` tags for the 5 new shared files in `js/admin_core/` immediately after the existing `<script src="../../js/admin_core/error_handler.js">` line (line ~187) and before any module-specific scripts. This ensures the `window.*` functions are available when the Wikipedia and News sidebar handlers call them. The insertion order: `autogen_snippet.js`, `autogen_slug.js`, `autogen_meta.js`, `sidebar_save_metadata.js`, `sidebar_term_chips.js`.
- **Vibe Rule(s):** No inline scripts · clean structural page

- [ ] Task complete

---

### T9 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### JavaScript
- [ ] Each new file has one public function (except `sidebar_term_chips.js` which has a documented pair)
- [ ] Every file opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no frameworks or libraries
- [ ] Shared functions are truly stateless — all state passed via parameters
- [ ] All existing event listener wiring preserved in both sidebar handlers
- [ ] No behaviour change in either sidebar — identical UX before and after

#### HTML
- [ ] No inline scripts or styles
- [ ] `<script>` tags use `src` attribute only

- [ ] Task complete

---

### T10 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: The 5 duplicated functions are extracted into `js/admin_core/` and both sidebar handlers call them via `window.*`
- [ ] **Necessity**: No code is duplicated between the two sidebar files — each function has exactly one implementation
- [ ] **Targeted Impact**: Only `js/admin_core/` (new), the two sidebar `.js` files, and `dashboard.html` were touched
- [ ] **Scope Control**: No API changes, no CSS changes, no new features — purely extracting existing logic
- [ ] **Smoke Test**: Both Wikipedia and News dashboard modules load without errors and sidebar interactions work as before

- [ ] Task complete

---

## Documentation Update

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add 5 new files under `js/admin_core/`; update line counts for both sidebar handler files |
| `documentation/simple_module_sitemap.md` | No | `js/admin_core/` already listed as a category — no structural change |
| `documentation/site_map.md` | No | No new user-facing pages |
| `documentation/data_schema.md` | No | No schema changes |
| `documentation/vibe_coding_rules.md` | No | Rules unchanged |
| `documentation/style_mockup.html` | No | No visual changes |
| `documentation/git_vps.md` | No | No deployment changes |
| `documentation/guides/guide_appearance.md` | No | No UI changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard layout changes |
| `documentation/guides/guide_function.md` | No | Logic flows unchanged — same functions, just moved |
| `documentation/guides/guide_security.md` | No | No auth changes |
| `documentation/guides/guide_style.md` | No | No CSS changes |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO changes |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
