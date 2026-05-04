---
name: plan_dashboard_blog_posts
version: 1.0.0
module: 6.0 — News & Blog
status: complete
created: 2026-05-02
completed: 2026-05-02
---

# Plan: plan_dashboard_blog_posts

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Blog Posts" dashboard module, a dedicated WYSIWYG editor for authoring and managing the site's historical and theological blog updates. It features a dual-pane layout with a scrollable sidebar of published and draft posts and a markdown-based editor with live preview and integrated metadata management (MLA sources, context links, and pictures). This module ensures that blog content is produced with consistent archival quality and follows the 'providence' design system, providing a robust platform for long-form updates.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
| Blog Posts Sidebar        | Blog Post WYSIWYG Editor                            |
|---------------------------+-----------------------------------------------------|
| *Published*               | Title: [___________________________________]        |
| - Blog Post 1             |                                                     |
| - Blog Post 2             | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Post A            | |  Markdown blog post content goes here...      |   |
| - Draft Post B            | |                                               |   |
|                           | +-----------------------------------------------+   |
| (Endless Scroll)          |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
|                           | MLA Sources: [_________] Context Links: [_____]     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
``` 

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, work through the tasks sequentially, and ensure each task is fully completed, and marked as complete, before moving to the next.  

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_blog_posts.html` | Split-pane blog editor container |
| **CSS** | `css/6.0_news_blog/dashboard/blog_posts_dashboard.css` | Navigator sidebar & editor layout |
| **CSS** | `css/6.0_news_blog/dashboard/blog_WYSIWYG_editor.css` | Markdown editor canvas, toolbar, and live preview pane styling |
| **JS** | `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` | Module orchestration & initialization |
| **JS** | `js/6.0_news_blog/dashboard/display_blog_posts_data.js` | Blog post fetching & field population |
| **JS** | `js/5.0_essays_responses/dashboard/markdown_editor.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_essay_historiography): Markdown parsing & live preview |
| **JS** | `js/6.0_news_blog/dashboard/blog_post_status_handler.js` | Save/Publish/Delete state logic |
| **JS** | `js/2.0_records/dashboard/picture_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Image upload & integration |
| **JS** | `js/2.0_records/dashboard/mla_source_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Citation management |
| **JS** | `js/2.0_records/dashboard/context_link_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Database relationship links |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Automated snippet trigger |
| **JS** | `js/2.0_records/dashboard/metadata_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Metadata footer |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T5 calls `GET /api/admin/blogposts`; T7 calls `PUT /api/admin/records/{id}` (draft/publish/delete) + `DELETE /api/admin/records/{id}`; T8 calls `POST /api/admin/records/{id}/picture`; T11 calls `POST /api/admin/snippet/generate` |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T4 registers the Blog Posts module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T13 routes all save, upload, and generation failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads blog post rows; T6 writes status changes; T7 writes `picture_bytes` and `picture_thumbnail` |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T10 auto-generation button triggers this script via the API |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T11 auto-gen meta button triggers this script via the API |
| `js/2.0_records/dashboard/picture_handler.js` | `plan_dashboard_records_single` | T8 includes this via `<script>` tag; calls `window.renderEditPicture()` |
| `js/2.0_records/dashboard/mla_source_handler.js` | `plan_dashboard_records_single` | T9 includes this via `<script>` tag; calls `window.renderEditBibliography()` etc. |
| `js/2.0_records/dashboard/context_link_handler.js` | `plan_dashboard_records_single` | T10 includes this via `<script>` tag; calls `window.renderEditLinks()` |
| `js/2.0_records/dashboard/snippet_generator.js` | `plan_dashboard_records_single` | T11 includes this via `<script>` tag; calls `window.generateSnippet()` |
| `js/2.0_records/dashboard/metadata_handler.js` | `plan_dashboard_records_single` | T12 includes this via `<script>` tag; calls `window.renderMetadataFooter()` |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | `plan_dashboard_essay_historiography` | T6 includes this via `<script>` tag; calls the shared markdown editor |

> ⚠️ This plan does NOT own any shared tools. All shared JS is consumed via `<script>` tag from the owner plan's directory.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Blog Posts HTML

- **File(s):** `admin/frontend/dashboard_blog_posts.html`
- **Action:** Create the structural split-pane container for the blog editor, featuring the post navigator sidebar and the markdown editing canvas.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [x] Task complete

---

### T2 — Implement Blog Posts CSS

- **File(s):** `css/6.0_news_blog/dashboard/blog_posts_dashboard.css`
- **Action:** Implement the 'providence' theme layout for the dual-pane editor, with specific focus on the post sidebar and sticky function bar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [x] Task complete

---

### T3 — Implement Blog WYSIWYG Editor CSS

- **File(s):** `css/6.0_news_blog/dashboard/blog_WYSIWYG_editor.css`
- **Action:** Implement the utilitarian styling for the markdown editing area, toolbar buttons, and the live preview pane for blog content. The preview pane must apply the same typographic tokens (`--font-body`, `--color-text`, `--color-background`, etc.) used by the public-facing blog template, so the preview is a faithful representation of the published output.
- **Vibe Rule(s):** CSS Variables · Rich Aesthetics · User Comments

- [x] Task complete

---

### T4 — Implement Blog Posts Orchestrator

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`
- **Action:** Initialize the blog posts module and coordinate the sidebar loading, editor population, and preview synchronization.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T5 — Implement Blog Data Display

- **File(s):** `js/6.0_news_blog/dashboard/display_blog_posts_data.js`
- **Action:** Implement the logic to fetch specific blog post content and metadata from the API and populate the editor fields.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T6 — Include Markdown Editor (Shared Tool)

- **File(s):** Include `js/5.0_essays_responses/dashboard/markdown_editor.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/5.0_essays_responses/dashboard/markdown_editor.js"></script>` to the HTML and call the shared markdown editor's `window.*` API. The shared tool (owned by `plan_dashboard_essay_historiography`) provides toolbar actions and live HTML preview generation.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

### T7 — Implement Blog Post Status Handling

- **File(s):** `js/6.0_news_blog/dashboard/blog_post_status_handler.js`
- **Action:** Implement the logical flow for saving, publishing, and deleting blog posts, interfacing with the backend blog API. Before executing any status action, check for unsaved changes in the markdown editor (dirty-state flag set by `markdown_editor.js`). If unsaved changes exist, prompt the admin to save first — do not allow save, publish, or delete to proceed with stale content in the editor.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T8 — Include Picture Upload Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/picture_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/picture_handler.js"></script>` to the HTML and call `window.renderEditPicture(containerId, recordId)`. Shared tool owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

### T9 — Include MLA Source Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/mla_source_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/mla_source_handler.js"></script>` to the HTML and call `window.renderEditBibliography()`, `window.loadEditBibliography()`, `window.collectEditBibliography()`. Shared tool owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

### T10 — Include Context Link Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/context_link_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/context_link_handler.js"></script>` to the HTML and call `window.renderEditLinks(containerId, contextLinksData)`. Shared tool owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T11 — Include Snippet Generator (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/snippet_generator.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/snippet_generator.js"></script>` to the HTML and call `window.generateSnippet(recordId, content)`. Shared tool owned by `plan_dashboard_records_single`.
- **Dependencies:** `admin/backend/admin_api.py` (blog routes planned), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

## Final Tasks

---

### T12 — Include Metadata Footer (Shared Tool)
- **File(s):** Include `js/2.0_records/dashboard/metadata_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/metadata_handler.js"></script>` to the HTML and call `window.renderMetadataFooter(containerId, recordId)`. Shared tool owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [x] Task complete

---

### T13 — Error Message Generation

- **File(s):**
  - `js/6.0_news_blog/dashboard/display_blog_posts_data.js`
  - `js/6.0_news_blog/dashboard/blog_post_status_handler.js`
  - `js/6.0_news_blog/dashboard/markdown_editor.js`
  - `js/6.0_news_blog/dashboard/picture_handler.js`
  - `js/6.0_news_blog/dashboard/mla_source_handler.js`
  - `js/6.0_news_blog/dashboard/context_link_handler.js`
  - `js/6.0_news_blog/dashboard/snippet_generator.js`
  - `js/6.0_news_blog/dashboard/metadata_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Post List Fetch Failed** — `display_blog_posts_data.js` fetch of the sidebar post list fails or returns non-OK: `"Error: Unable to load blog posts list. Please refresh and try again."`
  2. **Post Content Fetch Failed** — `display_blog_posts_data.js` fetch of a selected post's content returns non-OK: `"Error: Unable to load post '{title}'. Please try again."`
  3. **Post Save Failed** — any PUT to `/api/admin/records/{id}` returns non-OK: `"Error: Failed to save changes to '{title}'. Please try again."`
  4. **Draft Failed** — `blog_post_status_handler.js` PATCH to set draft status returns non-OK: `"Error: Failed to set '{title}' to Draft."`
  5. **Publish Failed** — `blog_post_status_handler.js` PATCH to publish returns non-OK: `"Error: Failed to publish '{title}'. Check required fields."`
  6. **Delete Failed** — `blog_post_status_handler.js` DELETE returns non-OK: `"Error: Failed to delete '{title}'. Please try again."`
  7. **Markdown Preview Failed** — `markdown_editor.js` cannot parse the post content and render a live preview: `"Error: Markdown preview failed. Check post content for invalid syntax."`
  8. **Image Upload Failed** — `picture_handler.js` POST to upload returns non-OK or file exceeds size/format limits: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  9. **Image Preview Failed** — `picture_handler.js` cannot render a preview from the selected file: `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  10. **MLA Source Save Failed** — `mla_source_handler.js` PUT for bibliography returns non-OK: `"Error: Failed to save bibliography changes for '{title}'."`
  11. **Context Link Save Failed** — `context_link_handler.js` PUT for context links returns non-OK: `"Error: Failed to save context links for '{title}'."`
  12. **Snippet Generation Failed** — `snippet_generator.js` request to `snippet_generator.py` returns non-OK or times out: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`
  13. **Metadata Save Failed** — `metadata_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for '{title}'."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [x] Task complete

---

### T14 — Vibe-Coding Audit

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
- [x] Markdown live preview output matches the public frontend rendering — same parser behaviour, same CSS typographic tokens

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

#### Shared-Tool Ownership
- [x] All shared tools (`markdown_editor.js`, `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`) included via `<script>` tag from owner directories — no local copies created
- [x] This plan does NOT own any shared tools and creates zero files outside `js/6.0_news_blog/dashboard/` except for its own module-specific files

---

### T15 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new Blog Post dashboard files under Module 6.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new blog post editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool consistency rule to ownership model (§7). |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Blog Post editor and sidebar. |
| `documentation/guides/guide_function.md` | Yes | Document markdown editing flow and blog post status management. |
| `documentation/guides/guide_security.md` | Yes | Note validation for blog content and publishing permissions. |
| `documentation/guides/guide_style.md` | Yes | Document the blog editor and utilitarian toolbar CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [x] Each "Yes" row has been updated with accurate, current information
- [x] No document contains stale references to files or logic changed by this plan
- [x] Version numbers incremented where frontmatter versioning is present
