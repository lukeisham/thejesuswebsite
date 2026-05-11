---
name: standardize_dashboard_wysiwyg
version: 1.0.0
module: 9.0 — Cross-Cutting Standardization
status: complete
created: 2026-05-11
---

# Plan: Standardize Dashboard WYSIWYG Modules

## Purpose

> **Standardise the appearance, input fields, and functionality of all dashboard content-input / WYSIWYG editor modules so they share a single unified look-and-feel, identical field sets, and consistent behaviour. The only difference between modules is their output destination (e.g. blogs publish to the blog feed, challenge responses insert into the challenge list, context essays publish to the context essay page). This plan also includes a function review verifying that every module is correctly connected to the database and that data flows end-to-end from editor input to public-facing output.**

The plan merges two nearly-identical CSS codebases (the `essay-*` and `blog-*` class namespaces) into a single shared `wysiwyg-*` namespace, creates a dedicated Challenge Response WYSIWYG dashboard (which currently has no HTML shell — only an inline `<dialog>`), adds missing feature-parity elements (sidebar search on Blog Posts, "+ New" buttons on Context Essays/Historiography), and performs a cross-module database-connection audit.

---

## Module Review Table

> All dashboard content-input / WYSIWYG modules under review, their current state, and what changes are required.

| # | Module | HTML File | CSS Files (Layout + WYSIWYG) | JS Orchestrator | Has Search? | Has "+ New"? | Output Destination | Schema Variation | Changes Required |
|---|--------|-----------|------------------------------|-----------------|-------------|-------------|-------------------|-----------------|
| 1 | **Context Essays Editor** (5.0) | `admin/frontend/dashboard_essay.html` | `dashboard_essay_historiography.css` + `essay_WYSIWYG_editor.css` | `dashboard_essay.js` | ✅ | ❌ | Context essay page (`context_essay.html`) | `type = "context_essay"` — has picture fields; body = `body` (markdown) | Refactor HTML to unified `wysiwyg-*` classes; add "+ New Context Essay" button |
| 2 | **Historiography Editor** (5.0) | `admin/frontend/dashboard_historiography.html` | Same as Context Essays | `dashboard_historiography.js` | ✅ | ❌ | Historiography page (`historiography.html`) | `type = "historiographical_essay"` — **SINGLETON**: only one page; slug locked to `"historiography"`; has picture fields | Refactor HTML to unified `wysiwyg-*` classes; confirm singleton behaviour (no sidebar list, slug locked) |
| 3 | **Blog Posts Editor** (6.0) | `admin/frontend/dashboard_blog_posts.html` | `blog_posts_dashboard.css` + `blog_WYSIWYG_editor.css` | `dashboard_blog_posts.js` | ❌ | ✅ | Blog feed (`blog.html`, `news_and_blog.html`) | `type = "blog_post"` — has picture fields; body = `blogposts` (markdown, NOT `body`) | Refactor HTML to unified `wysiwyg-*` classes; add sidebar search bar |
| 4 | **Challenge Response Editor** (4.0) | **NONE** — only an inline `<dialog>` in challenge sidebar | N/A | `insert_challenge_response.js` (dialog-only) | ❌ | ❌ | Challenge list pages (`academic_challenge.html`, `popular_challenge.html`) | `type = "challenge_response"` — **NO picture fields**; has `challenge_id` FK; body = `body` (markdown) | **Create dedicated HTML dashboard** + orchestrator JS + data display + status handler; omit picture upload section |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Unified WYSIWYG Editor CSS

- **File(s):** `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` **(new file)**
- **Action:** Merge `essay_WYSIWYG_editor.css` and `blog_WYSIWYG_editor.css` into a single shared stylesheet using the `wysiwyg-*` BEM namespace, keeping all typography tokens from `typography.css` and preserving the existing toolbar, split-pane, and live-preview styles.
- **Vibe Rule(s):** CSS Grid for macro layout (split panes) · Flexbox for micro alignment (toolbar) · All colours, fonts, and spacing reference CSS variables · Section headings as comments · No frameworks

- [x] Task complete

---

### T2 — Create Unified WYSIWYG Dashboard Layout CSS

- **File(s):** `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` **(new file)**
- **Action:** Merge `dashboard_essay_historiography.css` and `blog_posts_dashboard.css` into a single shared stylesheet using the `wysiwyg-*` BEM namespace. Unify the function bar (sticky, status-group, "+ New" button, divider), split-pane grid (sidebar 260px | divider 1px | editor 1fr), sidebar styles (search bar, published/drafts groups, list items with active state), and editor area (form fields, sections, picture preview row). Include scoped styles for the shared-tool containers (bibliography, context links) keyed by generic `wysiwyg-*` IDs.
- **Vibe Rule(s):** CSS Grid for macro layout · Flexbox for micro alignment · All colours, fonts, and spacing reference CSS variables · Section headings as comments · No frameworks

- [x] Task complete

---

### T3 — Refactor Context Essays HTML to Unified CSS Namespace + Add "+ New Context Essay" Button

- **File(s):** `admin/frontend/dashboard_essay.html` **(edit)**
- **Action:** Replace all `essay-*` BEM classes with their `wysiwyg-*` equivalents (e.g. `essay-editor-layout` → `wysiwyg-editor-layout`, `essay-sidebar` → `wysiwyg-sidebar`, `essay-editor-area` → `wysiwyg-editor-area`). Update all `id` hooks that shared tools target to use the unified naming convention (`essay-bibliography-container` → `wysiwyg-bibliography-container`, `essay-context-links-container` → `wysiwyg-context-links-container`, `essay-picture-container` → `wysiwyg-picture-container`). Add a "+ New Context Essay" button in the function bar alongside the existing status buttons. Update the placeholder text to reference "context essay" where appropriate.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [x] Task complete

---

### T4 — Refactor Historiography HTML to Unified CSS Namespace + Add "+ New Historiography" Button

- **File(s):** `admin/frontend/dashboard_historiography.html` **(edit)**
- **Action:** Apply the identical refactoring as T3: replace all `essay-*` BEM classes with `wysiwyg-*` equivalents. Update shared-tool container IDs to the unified naming convention. Add a "+ New Historiography" button in the function bar. Update placeholder text to reference "historiography."
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [x] Task complete

---

### T5 — Refactor Blog Posts HTML to Unified CSS Namespace + Add Sidebar Search

- **File(s):** `admin/frontend/dashboard_blog_posts.html` **(edit)**
- **Action:** Replace all `blog-*` BEM classes with their `wysiwyg-*` equivalents (e.g. `blog-editor-layout` → `wysiwyg-editor-layout`, `blog-sidebar` → `wysiwyg-sidebar`, `blog-editor-area` → `wysiwyg-editor-area`). Update shared-tool container IDs to the unified naming convention. Add a sidebar search bar (matching the Context Essays/Historiography pattern) above the Published group. Preserve the existing "+ New Blog Post" button.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [x] Task complete

---

### T6 — Create Dedicated Challenge Response Dashboard HTML

- **File(s):** `admin/frontend/dashboard_challenge_response.html` **(new file)**
- **Action:** Create a full WYSIWYG split-pane editor HTML shell for Challenge Responses, matching the unified structure established in T3–T5. Include: function bar with Save Draft / Publish / Delete buttons (no "+ New" — responses are created from the challenge list via the existing dialog), sidebar with Published/Drafts response lists + metadata widget container, editor area with title input, markdown toolbar, split markdown/preview panes, bibliography container, context links container, and picture container. Use the unified `wysiwyg-*` BEM namespace throughout.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [x] Task complete

---

### T7 — Create Challenge Response Orchestrator JS

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_response.js` **(new file)**
- **Action:** Create the module orchestrator following the same pattern as `dashboard_essay.js` and `dashboard_blog_posts.js`. The `renderChallengeResponse()` function must: (1) set the Providence layout via `_setLayoutColumns("360px", "1fr")`, (2) fetch and inject `dashboard_challenge_response.html` into the canvas, (3) initialise sub-modules in dependency order: `window.displayChallengeResponseList()` (T8a), `window.initMarkdownEditor("")` (shared tool), `window.initChallengeResponseStatusHandler()` (T10), (4) initialise shared tools (MLA via `window.renderEditBibliography()`, context links via `window.renderEditLinks()`, metadata widget via `window.renderMetadataWidget()`) — note: NO picture handler (Challenge Response has no picture fields) targeting the unified `wysiwyg-*` container IDs. Expose `window.renderChallengeResponse`.
- **Vibe Rule(s):** One function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T8a — Create Challenge Response List Display JS

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_list_display.js` **(new file)**
- **Action:** Create a single-function module that fetches the response list from `GET /api/admin/responses`, separates into Published and Drafts, and populates the sidebar lists using the unified `wysiwyg-*` DOM IDs (`wysiwyg-published-list`, `wysiwyg-drafts-list`). Expose `window.displayChallengeResponseList()`. Internal helper `_populateSidebarList()` is acceptable as it is tightly coupled to the display logic.
- **Vibe Rule(s):** One function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+

- [x] Task complete

---

### T8b — Create Challenge Response Content Loader JS

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_load_content.js` **(new file)**
- **Action:** Create a single-function module that fetches a single response from `GET /api/admin/records/{id}`, populates the editor fields (title input, markdown editor via `window.setMarkdownContent()`, slug, snippet, metadata fields, bibliography via `window.loadEditBibliography()`, context links via `window.renderEditLinks()`), and highlights the active sidebar item — all targeting the unified `wysiwyg-*` DOM IDs. Expose `window.loadChallengeResponseContent()`. Internal helper `_highlightActiveItem()` is acceptable as it is tightly coupled to the load logic.
- **Vibe Rule(s):** One function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+

- [x] Task complete

---

### T9 — Split Oversized Data Display JS Files into Single-Function Modules

- **File(s):** `js/5.0_essays_responses/dashboard/essay_historiography_list_display.js`, `js/5.0_essays_responses/dashboard/essay_historiography_load_content.js` → split into two; `js/6.0_news_blog/dashboard/display_blog_posts_data.js` → split into two **(edit — split existing files, no new files)**
- **Action:** Both existing data display files violate the "one function per file" rule by bundling two distinct concerns: sidebar list population and single-document content loading. Split each into two single-function modules:

  **Essay/Historiography (5.0):**
  - `essay_historiography_data_display.js` currently contains `displayEssayHistoriographyList()` + `loadDocumentContent()` + two internal helpers.
  - Split into:
    - `essay_historiography_list_display.js` — `displayEssayHistoriographyList()` + internal `_populateSidebarList()`. Expose `window.displayEssayHistoriographyList`.
    - `essay_historiography_load_content.js` — `loadDocumentContent()` + internal `_highlightActiveItem()`. Expose `window.loadDocumentContent`.
  - Delete the original combined file after verifying no other scripts reference it directly (orchestrators call the `window.*` functions).

  **Blog Posts (6.0):**
  - `display_blog_posts_data.js` currently contains `displayBlogPostsList()` + `loadBlogPostContent()` + two internal helpers.
  - Split into:
    - `blog_posts_list_display.js` — `displayBlogPostsList()` + internal `_populateSidebarList()`. Expose `window.displayBlogPostsList`.
    - `blog_posts_load_content.js` — `loadBlogPostContent()` + internal `_highlightActiveItem()`. Expose `window.loadBlogPostContent`.
  - Delete the original combined file.

  **Orchestrator updates:** After splitting, update `dashboard_essay.js`, `dashboard_historiography.js`, and `dashboard_blog_posts.js` to ensure the `<script>` tags in the dashboard shell include both new files (or verify they are already loaded via the module loader).

  **Why split:** The vibe coding rule (Section 3) requires "One function per file" — `displayList()` and `loadContent()` serve different UI concerns (sidebar vs. editor) and are called at different times by different triggers. The status handler files (`document_status_handler.js`, `blog_post_status_handler.js`) do NOT need splitting — all functions serve the single status-management widget (qualifies for the "tightly-related group" exception).
- **Vibe Rule(s):** One function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+

- [x] Task complete

---

### T10 — Create Challenge Response Status Handler JS

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js` **(new file)**
- **Action:** Create the status handler following the pattern of `document_status_handler.js`. Wire Save Draft / Publish / Delete buttons. The `_collectEditorData()` function must gather title, markdown content, slug, snippet, metadata_json, bibliography, and context links from the unified `wysiwyg-*` DOM elements. Save/Publish operations must PUT to `/api/admin/records/{id}`. Delete must DELETE to `/api/admin/records/{id}`. Include `scheduleAutoSave()` (1500ms debounced) and a silent `_saveChallengeResponse()` for the metadata widget's auto-save callback.
- **Vibe Rule(s):** One function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+

- [x] Task complete

---

### T11 — Register Challenge Response Module in dashboard_app.js

- **File(s):** `js/7.0_system/dashboard/dashboard_app.js` **(edit)**
- **Action:** Add `"challenge-response": "renderChallengeResponse"` to the `MODULE_RENDERERS` map and `"challenge-response": "Challenge Resp."` to the `MODULE_LABELS` map (both already present — verify they are wired correctly). Ensure the dashboard card grid includes a Challenge Response card that triggers `window.loadModule("challenge-response")`. Verify the module tab bar correctly displays the label.
- **Vibe Rule(s):** One function per file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T12 — Schema, Style & Database Connection Verification

- **File(s):** All dashboard HTML, CSS, and JS files in modules 4.0, 5.0, 6.0; reference docs `documentation/high_level_schema.md` and `documentation/guides/guide_style.md` **(review — no edits unless bugs found)**
- **Action:** Three-part audit cross-referencing every WYSIWYG editor against the canonical schema and style guide:

  **Part A — Schema Field Verification (`high_level_schema.md` §4a):**
  For each module, confirm every field defined in the schema is present in the editor HTML and collected by the status handler's `_collectEditorData()`:
  1. **Context Essays (`type = "context_essay"`):** Required fields: title, slug, snippet, metadata_json, description, bibliography, body (markdown), picture_name/picture_bytes/picture_thumbnail (via `picture_handler.js`), context_links, iaa, pledius, manuscript, url. Verify all are wired.
  2. **Historiography (`type = "historiographical_essay"`):** Same field set as Context Essays. Additionally verify slug is locked to `"historiography"` (see T12).
  3. **Blog Posts (`type = "blog_post"`):** Same field set as Context Essays. Key difference: the markdown body field is `blogposts` (NOT `body`). Verify `_collectEditorData()` sends `blogposts` not `body`.
  4. **Challenge Response (`type = "challenge_response"`):** NO picture fields — verify the Challenge Response HTML omits the picture upload section. Has `challenge_id` FK — verify `insert_challenge_response.js` sends `parent_slug` on creation, and the new status handler preserves `challenge_id` on save. Body field = `body` (markdown).

  **Part B — Button & Field Styling Verification (`guide_style.md` §18.4):**
  Confirm every WYSIWYG editor's buttons and form fields match the shared conventions:
  - **Buttons:** Inter (heading), `--text-xs`, `--radius-sm`/`--radius-md`, `--border-width-thin`. Save Draft = `--color-white` fill + Clay border + Lead Grey text. Publish = `--color-dash-accent` (Oxblood) fill + parchment text. Delete = transparent fill + Lead Grey text + Oxblood hover.
  - **Inputs/Textareas:** Roboto Mono or Body, `--text-sm`, `--radius-sm`, `--border-width-thin`. Focus state = `border-color: --color-dash-accent`.
  - **Section headings:** Inter semibold, `--text-md`, `--tracking-tight`, 1px `--color-border` bottom rule.
  - Verify the unified `wysiwyg_editor.css` and `wysiwyg_dashboard_layout.css` (T1–T2) use these tokens consistently.

  **Part C — Database Connection Verification:**
  Audit every module's read/write paths to confirm data flows correctly from editor input to the `records` table and back to the public-facing output:
  1. **Context Essays (5.0):** List fetch → `GET /api/admin/essays` | Single load → `GET /api/admin/records/{id}` | Save → `PUT /api/admin/records/{id}` | Delete → `DELETE /api/admin/records/{id}` | Output → `context_essay.html` via `view_context_essays.js` → `GET /api/essays/{id}`
  2. **Historiography (5.0):** List fetch → `GET /api/admin/historiography` | Single load → `GET /api/admin/records/{id}` | Save → `PUT /api/admin/records/{id}` | Delete → `DELETE /api/admin/records/{id}` | Output → `historiography.html` via `view_historiography.js` → `GET /api/historiography`
  3. **Blog Posts (6.0):** List fetch → `GET /api/admin/blogposts` | Single load → `GET /api/admin/records/{id}` | Save → `PUT /api/admin/records/{id}` (with `blogposts` field) | Delete → `DELETE /api/admin/records/{id}` | Output → `blog.html` via `list_blogpost.js` → `GET /api/blogposts`
  4. **Challenge Response (4.0):** Creation → `POST /api/admin/responses` (with `parent_slug` and `title`) | After T7–T9: List fetch → `GET /api/admin/responses` | Single load → `GET /api/admin/records/{id}` | Save → `PUT /api/admin/records/{id}` | Delete → `DELETE /api/admin/records/{id}` | Output → `academic_challenge.html` / `popular_challenge.html` via `response_display.js`

  Document any broken or missing connections, missing fields, or style deviations as bugs to fix in-task.
- **Vibe Rule(s):** Readability first · Explicit queries · Source-of-Truth Discipline · Cross-reference `high_level_schema.md` and `guide_style.md`

- [x] Task complete


---

### T13 — Confirm Historiography Singleton Variation

- **File(s):** `admin/frontend/dashboard_historiography.html`, `js/5.0_essays_responses/dashboard/dashboard_historiography.js`, `js/5.0_essays_responses/dashboard/essay_historiography_list_display.js`, `js/5.0_essays_responses/dashboard/essay_historiography_load_content.js` **(review and edit if needed)**
- **Action:** The Historiography Editor is a singleton — it edits exactly one page, not a collection. Confirm and enforce this variation from the standard WYSIWYG pattern:
  1. **Slug locked to `"historiography"`:** The slug field must be pre-filled and read-only (or auto-set on save), ensuring the historiography page always lives at `/historiography`. No slug input field should be user-editable.
  2. **No sidebar document list:** Unlike the other WYSIWYG editors, there is no Published/Drafts sidebar — there is only one page. Remove or hide the sidebar list, or replace it with a single "Historiography" item that auto-loads.
  3. **No "+ New" button:** There is no concept of creating a new historiography page. The "+ New Historiography" button mentioned in T4 must be omitted — the function bar contains only Save Draft / Publish / Delete.
  4. **Auto-load on mount:** When the module loads, automatically fetch and populate the single historiography record without requiring a sidebar click.
  5. **All other fields unchanged:** The historiography editor still has the full WYSIWYG field set (title, markdown body, bibliography, context links, picture, metadata widget) matching the `historiographical_essay` type in `high_level_schema.md` §4a.
- **Vibe Rule(s):** Semantic HTML5 tags · One function per file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T14 — Update JS Orchestrators for Unified DOM IDs

- **File(s):** `js/5.0_essays_responses/dashboard/dashboard_essay.js`, `js/5.0_essays_responses/dashboard/dashboard_historiography.js`, `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` **(edit)**
- **Action:** Update the three existing orchestrators to target the new unified `wysiwyg-*` DOM IDs for shared-tool containers (changed from T3–T5). Specifically, update `renderEditPicture()` target IDs (`essay-picture-container` / `blog-picture-container` → `wysiwyg-picture-container`), `renderEditBibliography()` target IDs (`essay-bibliography-container` / `blog-bibliography-container` → `wysiwyg-bibliography-container`), `renderEditLinks()` target IDs (`essay-context-links-container` / `blog-context-links-container` → `wysiwyg-context-links-container`), and any other hardcoded `essay-*` or `blog-*` string references. The `metadata-widget-container` ID is already unified and requires no change.
- **Vibe Rule(s):** One function per file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T15 — Update Sub-Module JS Files for Unified DOM IDs

- **File(s):** `js/5.0_essays_responses/dashboard/essay_historiography_list_display.js`, `js/5.0_essays_responses/dashboard/essay_historiography_load_content.js`, `js/5.0_essays_responses/dashboard/document_status_handler.js`, `js/6.0_news_blog/dashboard/blog_posts_list_display.js`, `js/6.0_news_blog/dashboard/blog_posts_load_content.js`, `js/6.0_news_blog/dashboard/blog_post_status_handler.js`, `js/5.0_essays_responses/dashboard/search_essays.js` **(edit)**
- **Action:** Update all sub-module JS files that reference `essay-*` or `blog-*` DOM IDs to use the new unified `wysiwyg-*` IDs. This includes: sidebar list IDs (`essay-published-list` → `wysiwyg-published-list`, `blog-drafts-list` → `wysiwyg-drafts-list`, etc.), title input IDs (`essay-title-input` / `blog-title-input` → `wysiwyg-title-input`), search input IDs, function bar IDs, sidebar class names for active-item highlighting, bibliography/context-links container IDs, and picture container IDs. The `markdown-textarea`, `markdown-preview`, `markdown-toolbar`, `record-slug`, `record-metadata-json`, `record-created-at`, `record-updated-at`, and `metadata-widget-container` IDs are already unified and require no change.
- **Vibe Rule(s):** One function per file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T16 — Remove Stale & Redundant Files + Update Dashboard Shell References

- **File(s):** 6 files to delete; `admin/frontend/dashboard.html` to edit **(delete + edit)**
- **Action:** Three-part cleanup to remove all superseded files and update the dashboard shell to reference the new unified assets:

  **Part A — Delete legacy CSS files (4 files):**
  - `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css`
  - `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css`
  - `css/6.0_news_blog/dashboard/blog_WYSIWYG_editor.css`
  - `css/6.0_news_blog/dashboard/blog_posts_dashboard.css`
  All superseded by `wysiwyg_editor.css` and `wysiwyg_dashboard_layout.css` (T1–T2).

  **Part B — Delete deprecated HTML & JS files (2 files):**
  - `admin/frontend/dashboard_essay_historiography.html` — deprecated legacy combined editor with toggle; superseded by split `dashboard_essay.html` + `dashboard_historiography.html`
  - `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js` — deprecated legacy combined orchestrator; superseded by split `dashboard_essay.js` + `dashboard_historiography.js`
  Both are marked deprecated in `detailed_module_sitemap.md` and are no longer referenced by any module route.

  **Part C — Update `admin/frontend/dashboard.html` `<link>` and `<script>` tags:**
  The dashboard shell currently references the 4 legacy CSS files and the superseded `essay_historiography_data_display.js`. Update as follows:
  - **Remove** the 4 old `<link>` tags for `dashboard_essay_historiography.css`, `essay_WYSIWYG_editor.css`, `blog_posts_dashboard.css`, `blog_WYSIWYG_editor.css`
  - **Add** 2 new `<link>` tags for `../../css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` and `../../css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css`
  - **Replace** `<script src="../../js/5.0_essays_responses/dashboard/essay_historiography_data_display.js">` with the two split files: `essay_historiography_list_display.js` and `essay_historiography_load_content.js`
  - **Add** `<script>` tags for the new Challenge Response module files (T7, T8a, T8b, T10) and the split blog data display files (T9)
  - **Remove** any `<script>` tag for the deprecated `dashboard_essay_historiography.js`
  - Verify all `<script>` tags include the `markdown_editor.js` shared tool (already present, confirm unchanged)
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · No stale references

- [x] Task complete

---

## Final Tasks

### T17 — Vibe-Coding Audit

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
- [x] Not applicable — no Python files in this plan

#### SQL / Database
- [x] Not applicable — no schema changes in this plan

---

### T18 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement — Standardized Appearance:** All WYSIWYG editors (Context Essays, Historiography, Blog Posts, Challenge Response) now use a single unified `wysiwyg-*` CSS namespace with identical layout and styling
- [x] **Achievement — Standardized Fields:** All WYSIWYG editors present the same field set: title, markdown toolbar, split markdown/preview panes, bibliography, context links, picture upload, and metadata widget
- [x] **Achievement — Standardized Functionality:** All WYSIWYG editors share the same function bar (Save Draft / Publish / Delete), the same sidebar pattern (Published/Drafts lists), and the same shared-tool integration pattern
- [x] **Achievement — Feature Parity:** Context Essays now has a "+ New" button; Blog Posts now has sidebar search; Challenge Response now has a dedicated WYSIWYG dashboard (no picture section, per schema)
- [x] **Achievement — Schema Field Verification:** All four editors have been audited against `high_level_schema.md` §4a; every required field per type is present in the editor HTML and collected by `_collectEditorData()`
- [x] **Achievement — Style Guide Compliance:** Button and form field styling across all WYSIWYG editors matches `guide_style.md` §18.4 conventions (button tokens, input tokens, focus states, section heading pattern)
- [x] **Achievement — Historiography Singleton:** Historiography Editor correctly handles its singleton variation — slug locked to `"historiography"`, no sidebar document list, no "+ New" button, auto-loads on mount
- [x] **Achievement — Challenge Response No-Picture:** Challenge Response dashboard correctly omits the picture upload section (matching `challenge_response` type which has no `picture_name`/`picture_bytes`/`picture_thumbnail` fields)
- [x] **Achievement — Output Destinations Preserved:** Each module's data still flows to its correct public-facing destination (context essays → context essay page, historiography → historiography page, blog posts → blog feed, challenge responses → challenge lists)
- [x] **Symmetry:** All four WYSIWYG modules use identical HTML structure, identical CSS class names, and identical shared-tool invocation patterns — the only differences are the orchestrator's API endpoints and output destinations
- [x] **Symmetry — Identical Code Verification:** The HTML shells for Context Essays, Historiography, Blog Posts, and Challenge Response are structurally identical (verified by diff); the orchestrator JS files follow the identical initialization sequence; the data display and status handler files follow identical patterns
- [x] **Necessity:** The underlying duplication that made maintenance difficult (two near-identical CSS namespaces, missing feature parity, no Challenge Response dashboard) has been resolved
- [x] **Targeted Impact:** Only the files listed in §Tasks were created or modified; no public-facing pages were altered; no database schema was changed
- [x] **Scope Control:** No scope creep — only files listed in §Tasks were created or modified

---

### T19 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`): Add or update ASCII box-drawing diagrams to reflect the new unified WYSIWYG layout, the new Challenge Response dashboard, and the unified `wysiwyg-*` CSS namespace.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for the new Challenge Response dashboard data flow.
  - **Style guide** (`guide_style.md`): Add the new `wysiwyg-*` BEM namespace as a canonical example with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table — `plan_standardize_dashboard_wysiwyg` now owns the unified `wysiwyg_editor.css` and `wysiwyg_dashboard_layout.css`; consumer plans must include these via `<link>` tags.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | **Yes** | Add new §9.0 Cross-Cutting Standardization section with file-tree entries for `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css`, `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css`, `admin/frontend/dashboard_challenge_response.html`, `js/4.0_ranked_lists/dashboard/dashboard_challenge_response.js`, `js/4.0_ranked_lists/dashboard/challenge_response_list_display.js`, `js/4.0_ranked_lists/dashboard/challenge_response_load_content.js`, and `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`. Remove deleted CSS file entries from §5.0 and §6.0. Add split data-display file entries to §5.0 (`essay_historiography_list_display.js`, `essay_historiography_load_content.js`) and §6.0 (`blog_posts_list_display.js`, `blog_posts_load_content.js`). Remove superseded combined files (`essay_historiography_data_display.js`, `display_blog_posts_data.js`). Remove deprecated file entries (`dashboard_essay_historiography.html`, `dashboard_essay_historiography.js`) from §5.0. Update file-tree diagrams. |
| `documentation/simple_module_sitemap.md` | **Yes** | Add new §9.0 Cross-Cutting Standardization entry listing the unified WYSIWYG CSS and Challenge Response dashboard files. |
| `documentation/site_map.md` | **Yes** | Add all 11 new file paths to the master file tree; remove 8 deleted file paths (4 legacy CSS + 2 superseded combined JS + 2 deprecated HTML/JS); bump version. |
| `documentation/data_schema.md` | **No** | No database schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | **Yes** | Update §7 Shared-Tool Ownership table: add entries for `wysiwyg_editor.css` and `wysiwyg_dashboard_layout.css` (owned by `plan_standardize_dashboard_wysiwyg`, consumed by all WYSIWYG dashboard modules); add entry for `dashboard_challenge_response.js` and its sub-modules (owned by `plan_standardize_dashboard_wysiwyg`). Note that `markdown_editor.js` ownership (5.0) is unchanged. |
| `documentation/style_mockup.html` | **No** | No new page layout introduced — only internal dashboard refactoring. |
| `documentation/git_vps.md` | **No** | No deployment or VPS changes. |
| `documentation/guides/guide_appearance.md` | **No** | No public-facing page changes — only dashboard-internal refactoring. |
| `documentation/guides/guide_dashboard_appearance.md` | **Yes** | Add new §9.0 section documenting the unified WYSIWYG dashboard layout with an ASCII diagram of the standardised split-pane structure (sidebar + editor area). Add §4.3 subsection for the new Challenge Response dashboard layout. Update §5.1a to document the Context Essays split-pane layout. Update §5.1b to document the Historiography singleton layout (no sidebar list, slug locked, auto-load). Update §6.2 to reference the unified `wysiwyg-*` CSS namespace. Update the Shared Tool Ownership Reference table. |
| `documentation/guides/guide_function.md` | **Yes** | Add logic-flow diagrams: (1) Challenge Response pipeline: Challenge List → "Insert Response" dialog → POST `/api/admin/responses` → Navigate to Challenge Response WYSIWYG → Load/Save via `/api/admin/records/{id}` → Output to challenge list display. (2) Historiography singleton flow: Module load → auto-fetch single record by slug `"historiography"` → populate editor → Save/Publish to same record. Update Context Essays/Blog flow diagrams to reference unified `wysiwyg-*` IDs. |
| `documentation/guides/guide_security.md` | **No** | No auth, session, or input validation changes. |
| `documentation/guides/guide_style.md` | **Yes** | Add new §9.0 `wysiwyg-*` BEM namespace section with a canonical table of all `wysiwyg-*` classes (layout, sidebar, editor, toolbar, panes, fields, sections, preview) and their CSS variable references. |
| `documentation/guides/guide_maps.md` | **No** | No map-related changes. |
| `documentation/guides/guide_timeline.md` | **No** | No timeline changes. |
| `documentation/guides/guide_donations.md` | **No** | No donation changes. |
| `documentation/guides/guide_welcoming_robots.md` | **No** | No SEO or robots.txt changes. |

- [x] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated with new §9.0; `site_map.md` master tree updated and version bumped
- [x] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` has new §9.0 unified WYSIWYG layout diagram and new §4.3 Challenge Response dashboard diagram; `guide_function.md` has new Challenge Response data-flow diagram
- [x] **Style guide updated:** `guide_style.md` includes new `wysiwyg-*` BEM namespace table with CSS variable references
- [x] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated with new unified CSS ownership and new Challenge Response JS files
- [x] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [x] **No stale references:** no document contains outdated references to `essay-*` or `blog-*` CSS namespaces or deleted CSS files
