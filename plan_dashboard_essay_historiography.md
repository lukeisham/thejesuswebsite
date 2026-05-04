---
name: plan_dashboard_essay_historiography
version: 1.0.0
module: 5.0 — Essays & Responses
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_essay_historiography

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Essay & Historiography" dashboard module, a comprehensive WYSIWYG editor for authoring thematic context essays and the central historiography document. It features a sidebar search bar for filtering essays and historiography entries by title, a toggle-driven interface for switching between document types, a split-pane markdown editor with live preview, and integrated metadata management (MLA sources, context links, and pictures). This module is the primary tool for producing the scholarly narrative content that provides the historical and theological framework for the entire website, ensuring a consistent and high-quality reading experience for the end user.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Essay | Historiography ] Toggle     [ Save | Publish | Delete ]|
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]        |
| *Published*               |                                                     |
| - Item 1                  |                                                     |
| - Item 2                  | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Item A            | |  Markdown content goes here...                |   |
|                           | |                                               |   |
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
| **HTML** | `admin/frontend/dashboard_essay_historiography.html` | Split-pane editor container |
| **CSS** | `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css` | Dual-state layout & toolbar |
| **CSS** | `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css` | Markdown input & live preview styling |
| **JS** | `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js` | Dual-state toggle orchestrator |
| **JS** | `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` | Content fetching & population |
| **JS** | `js/5.0_essays_responses/dashboard/search_essays.js` | Sidebar search bar: real-time title filtering of essay/historiography lists |
| **JS** | `js/5.0_essays_responses/dashboard/markdown_editor.js` | 🔑 OWNED shared tool: Core WYSIWYG & live HTML preview logic (consumed by Blog Posts, Challenge Response) |
| **JS** | `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete state management |
| **JS** | `js/2.0_records/dashboard/picture_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Image upload & insert |
| **JS** | `js/2.0_records/dashboard/mla_source_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Citation generation |
| **JS** | `js/2.0_records/dashboard/context_link_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Database relation links |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Automated abstract generator |
| **JS** | `js/2.0_records/dashboard/metadata_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Metadata footer |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T5 calls `GET /api/admin/essays` / `GET /api/admin/historiography`; T7 calls `PUT /api/admin/records/{id}` (draft/publish/delete) + `DELETE /api/admin/records/{id}`; T8 calls `POST /api/admin/records/{id}/picture`; T11 calls `POST /api/admin/snippet/generate` |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T4 registers the Essay & Historiography module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T13 routes all save, upload, and generation failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2/T3 reference Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T5 reads essay/historiography rows; T7 writes status changes; T8 writes `picture_bytes` and `picture_thumbnail` |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T11 auto-generation button triggers this script via the API |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T12 auto-gen meta button triggers this script via the API |
| `js/2.0_records/dashboard/picture_handler.js` | `plan_dashboard_records_single` | T8 includes this via `<script>` tag; calls `window.renderEditPicture()` |
| `js/2.0_records/dashboard/mla_source_handler.js` | `plan_dashboard_records_single` | T9 includes this via `<script>` tag; calls `window.renderEditBibliography()` etc. |
| `js/2.0_records/dashboard/context_link_handler.js` | `plan_dashboard_records_single` | T10 includes this via `<script>` tag; calls `window.renderEditLinks()` |
| `js/2.0_records/dashboard/snippet_generator.js` | `plan_dashboard_records_single` | T11 includes this via `<script>` tag; calls `window.generateSnippet()` |
| `js/2.0_records/dashboard/metadata_handler.js` | `plan_dashboard_records_single` | T12 includes this via `<script>` tag; calls `window.renderMetadataFooter()` |

### 🔑 Shared-Tool Ownership (Published by this plan)

> `markdown_editor.js` is AUTHORED here and CONSUMED by `plan_dashboard_blog_posts` and `plan_dashboard_challenge_response` via `<script>` tag. Those plans MUST NOT create local copies.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Essay/Historiography HTML

- **File(s):** `admin/frontend/dashboard_essay_historiography.html`
- **Action:** Create the structural split-pane container for the essay and historiography editor, featuring the document toggle bar and the markdown editing canvas.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Essay/Historiography CSS

- **File(s):** `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css`
- **Action:** Implement the 'providence' theme layout for the dual-pane editor, with specific focus on the document sidebar and sticky function bar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement WYSIWYG Editor Styling

- **File(s):** `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css`
- **Action:** Implement the utilitarian styling for the markdown editing area, toolbar buttons, and live preview rendering for long-form content.
- **Vibe Rule(s):** CSS Variables · Rich Aesthetics · User Comments

- [ ] Task complete

---

### T4 — Implement Essay/Historiography Orchestrator

- **File(s):** `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js`
- **Action:** Initialize the module and coordinate the toggle behavior between Essay and Historiography views and editor synchronization.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Document Data Display

- **File(s):** `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js`
- **Action:** Implement the logic to fetch specific document content and metadata from the API and populate the editor fields based on the active selection.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5b — Implement Sidebar Search

- **File(s):** `js/5.0_essays_responses/dashboard/search_essays.js`
- **Action:** Implement a sidebar search bar that performs real-time client-side filtering of the essay/historiography document list. Detailed behaviour:
  1. The search input sits at the top of the Editor Sidebar, above the *Published* and *Drafts* groupings, with placeholder text `"Filter by title..."`.
  2. On each keystroke (debounced at 150ms), filter the sidebar list items by matching the search term against the document title (case-insensitive, fuzzy — characters must appear in order).
  3. Non-matching items are hidden via CSS (`display: none`). Group headers (*Published*, *Drafts*) are hidden when they contain zero visible children.
  4. When the search input is cleared, all items are restored and group headers reappear.
  5. When the Essay/Historiography toggle is switched, the search input is cleared.
  6. The search bar is a thin, unobtrusive input styled to match the sidebar aesthetic. It does not add a new file to the File Inventory beyond `search_essays.js` — all styling is handled within `dashboard_essay_historiography.css`.
- **Dependencies:** `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` (reads loaded sidebar items), `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js` (clears search on toggle switch)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Markdown Editor Logic

- **File(s):** `js/5.0_essays_responses/dashboard/markdown_editor.js`
- **Action:** Implement the core markdown editing logic, including toolbar actions and the live HTML preview generation for archival essays.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Document Status Handling

- **File(s):** `js/5.0_essays_responses/dashboard/document_status_handler.js`
- **Action:** Implement the logical flow for saving, publishing, and deleting essays and historiography records. Before executing any status action, check for unsaved changes in the markdown editor (dirty-state flag set by `markdown_editor.js`). If unsaved changes exist, prompt the admin to save first — do not allow save, publish, or delete to proceed with stale content in the editor.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Include Picture Upload Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/picture_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/picture_handler.js"></script>` to the HTML and call `window.renderEditPicture(containerId, recordId)`. The shared tool (owned by `plan_dashboard_records_single`) handles image file selection, preview rendering, and binary upload.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T9 — Include MLA Source Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/mla_source_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/mla_source_handler.js"></script>` to the HTML and call `window.renderEditBibliography()`, `window.loadEditBibliography()`, `window.collectEditBibliography()`. The shared tool (owned by `plan_dashboard_records_single`) handles MLA bibliography management.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T10 — Include Context Link Handler (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/context_link_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/context_link_handler.js"></script>` to the HTML and call `window.renderEditLinks(containerId, contextLinksData)`. The shared tool (owned by `plan_dashboard_records_single`) handles `{slug, type}` chip management.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T11 — Include Snippet Generator (Shared Tool)

- **File(s):** Include `js/2.0_records/dashboard/snippet_generator.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/snippet_generator.js"></script>` to the HTML and call `window.generateSnippet(recordId, content)`. The shared tool (owned by `plan_dashboard_records_single`) triggers `backend/scripts/snippet_generator.py` via the admin API.
- **Dependencies:** `admin/backend/admin_api.py` (essay/historiography routes planned), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

## Final Tasks

---

### T12 — Include Metadata Footer (Shared Tool)
- **File(s):** Include `js/2.0_records/dashboard/metadata_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script src="/js/2.0_records/dashboard/metadata_handler.js"></script>` to the HTML and call `window.renderMetadataFooter(containerId, recordId)`. The shared tool (owned by `plan_dashboard_records_single`) renders an editable Snippet/Slug/Meta footer with auto-gen buttons.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T13 — Error Message Generation

- **File(s):**
  - `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js`
  - `js/5.0_essays_responses/dashboard/search_essays.js`
  - `js/5.0_essays_responses/dashboard/document_status_handler.js`
  - `js/5.0_essays_responses/dashboard/markdown_editor.js`
  - `js/5.0_essays_responses/dashboard/picture_handler.js`
  - `js/5.0_essays_responses/dashboard/mla_source_handler.js`
  - `js/5.0_essays_responses/dashboard/context_link_handler.js`
  - `js/5.0_essays_responses/dashboard/snippet_generator.js`
  - `js/5.0_essays_responses/dashboard/metadata_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Sidebar Search Error** — `search_essays.js` encounters a DOM mismatch: `"Search filter error. Please refresh the document list."`
  2. **Document List Fetch Failed** — `essay_historiography_data_display.js` fetch of the sidebar list (essays or historiography depending on active toggle) fails or returns non-OK: `"Error: Unable to load document list. Please refresh and try again."`
  3. **Document Content Fetch Failed** — `essay_historiography_data_display.js` fetch of a selected document's content returns non-OK: `"Error: Unable to load '{title}'. Please try again."`
  4. **Document Save Failed** — any PUT to `/api/admin/records/{id}` returns non-OK: `"Error: Failed to save changes to '{title}'. Please try again."`
  5. **Draft Failed** — `document_status_handler.js` PATCH to set draft status returns non-OK: `"Error: Failed to set '{title}' to Draft."`
  6. **Publish Failed** — `document_status_handler.js` PATCH to publish returns non-OK: `"Error: Failed to publish '{title}'. Check required fields."`
  7. **Delete Failed** — `document_status_handler.js` DELETE returns non-OK: `"Error: Failed to delete '{title}'. Please try again."`
  8. **Markdown Preview Failed** — `markdown_editor.js` cannot parse the document content and render a live preview: `"Error: Markdown preview failed. Check document content for invalid syntax."`
  9. **Image Upload Failed** — `picture_handler.js` POST to upload returns non-OK or file exceeds size/format limits: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  10. **Image Preview Failed** — `picture_handler.js` cannot render a preview from the selected file: `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  11. **MLA Source Save Failed** — `mla_source_handler.js` PUT for bibliography returns non-OK: `"Error: Failed to save bibliography changes for '{title}'."`
  12. **Context Link Save Failed** — `context_link_handler.js` PUT for context links returns non-OK: `"Error: Failed to save context links for '{title}'."`
  13. **Snippet Generation Failed** — `snippet_generator.js` request to `snippet_generator.py` returns non-OK or times out: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`
  14. **Metadata Save Failed** — `metadata_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for '{title}'."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T14 — Vibe-Coding Audit

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
- [ ] `search_essays.js` opens with three comment lines: trigger, main function, output
- [ ] `search_essays.js` uses fuzzy matching and debounced input
- [ ] Markdown live preview output matches the public frontend rendering — same parser behaviour, same CSS typographic tokens

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

#### Shared-Tool Ownership
- [ ] `markdown_editor.js` (owned by this plan): exposes `window.*` API, no duplicate in consumer directories
- [ ] All consumed shared tools (`picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`) included via `<script>` tag from `js/2.0_records/dashboard/` — no local copies created
- [ ] Each consumed shared tool's `window.*` function is called by this module's orchestrator at the correct container/record

---

### T15 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met — toggle-driven editor with sidebar search filtering
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new Essay & Historiography dashboard files under Module 5.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new essay editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool consistency rule to ownership model (§7). |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Essay and Historiography editor views. |
| `documentation/guides/guide_function.md` | Yes | Document dual-document editing flow and metadata management. |
| `documentation/guides/guide_security.md` | Yes | Note validation for markdown content and publishing permissions. |
| `documentation/guides/guide_style.md` | Yes | Document the essay WYSIWYG editor and metadata control CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
