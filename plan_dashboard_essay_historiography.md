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

This plan implements the "Essay & Historiography" dashboard module, a comprehensive WYSIWYG editor for authoring thematic context essays and the central historiography document. It features a toggle-driven interface for switching between document types, a split-pane markdown editor with live preview, and integrated metadata management (MLA sources, context links, and pictures). This module is the primary tool for producing the scholarly narrative content that provides the historical and theological framework for the entire website, ensuring a consistent and high-quality reading experience for the end user.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Essay | Historiography ] Toggle     [ Save | Publish | Delete ]|
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| *Published*               | Title: [___________________________________]        |
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
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_essay_historiography.html` | Split-pane editor container |
| **CSS** | `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css` | Dual-state layout & toolbar |
| **CSS** | `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css` | Markdown input & live preview styling |
| **JS** | `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js` | Dual-state toggle orchestrator |
| **JS** | `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` | Content fetching & population |
| **JS** | `js/5.0_essays_responses/dashboard/markdown_editor.js` | Core WYSIWYG & live HTML preview logic |
| **JS** | `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete state management |
| **JS** | `js/5.0_essays_responses/dashboard/picture_handler.js` | Shared tool: Image upload & insert |
| **JS** | `js/5.0_essays_responses/dashboard/mla_source_handler.js` | Shared tool: Citation generation |
| **JS** | `js/5.0_essays_responses/dashboard/context_link_handler.js` | Shared tool: Database relation links |
| **JS** | `js/5.0_essays_responses/dashboard/snippet_generator.js` | Shared tool: Automated abstract generator |
| **JS** | `js/5.0_essays_responses/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T5 calls `get_essay`/`get_historiography`; T7 calls `update_record` (draft/publish/delete); T8 calls `upload_record_picture`; T11 calls snippet trigger endpoint |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T4 registers the Essay & Historiography module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T13 routes all save, upload, and generation failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2/T3 reference Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T5 reads essay/historiography rows; T7 writes status changes; T8 writes `picture_bytes` and `picture_thumbnail` |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T11 auto-generation button triggers this script via the API |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T12 auto-gen meta button triggers this script via the API |

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

### T8 — Implement Picture Upload Handling

- **File(s):** `js/5.0_essays_responses/dashboard/picture_handler.js`
- **Action:** Implement the client-side logic for image file selection, preview rendering, and submission for essay imagery.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement MLA Source Handling

- **File(s):** `js/5.0_essays_responses/dashboard/mla_source_handler.js`
- **Action:** Implement the dynamic UI logic for adding, removing, and displaying MLA formatted sources within the essay editor.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T10 — Implement Context Link Handling

- **File(s):** `js/5.0_essays_responses/dashboard/context_link_handler.js`
- **Action:** Implement the dynamic UI logic for associating and displaying context links for the essay.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T11 — Implement Snippet Generation Logic

- **File(s):** `js/5.0_essays_responses/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger for generating automated snippets for essays.
- **Dependencies:** `admin/backend/admin_api.py` (essay/historiography routes planned), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T12 — Implement Metadata Footer
- **File(s):** `js/5.0_essays_responses/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T13 — Error Message Generation

- **File(s):**
  - `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js`
  - `js/5.0_essays_responses/dashboard/document_status_handler.js`
  - `js/5.0_essays_responses/dashboard/markdown_editor.js`
  - `js/5.0_essays_responses/dashboard/picture_handler.js`
  - `js/5.0_essays_responses/dashboard/mla_source_handler.js`
  - `js/5.0_essays_responses/dashboard/context_link_handler.js`
  - `js/5.0_essays_responses/dashboard/snippet_generator.js`
  - `js/5.0_essays_responses/dashboard/metadata_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Document List Fetch Failed** — `essay_historiography_data_display.js` fetch of the sidebar list (essays or historiography depending on active toggle) fails or returns non-OK: `"Error: Unable to load document list. Please refresh and try again."`
  2. **Document Content Fetch Failed** — `essay_historiography_data_display.js` fetch of a selected document's content returns non-OK: `"Error: Unable to load '{title}'. Please try again."`
  3. **Document Save Failed** — any PUT to `/api/admin/records/{id}` returns non-OK: `"Error: Failed to save changes to '{title}'. Please try again."`
  4. **Draft Failed** — `document_status_handler.js` PATCH to set draft status returns non-OK: `"Error: Failed to set '{title}' to Draft."`
  5. **Publish Failed** — `document_status_handler.js` PATCH to publish returns non-OK: `"Error: Failed to publish '{title}'. Check required fields."`
  6. **Delete Failed** — `document_status_handler.js` DELETE returns non-OK: `"Error: Failed to delete '{title}'. Please try again."`
  7. **Markdown Preview Failed** — `markdown_editor.js` cannot parse the document content and render a live preview: `"Error: Markdown preview failed. Check document content for invalid syntax."`
  8. **Image Upload Failed** — `picture_handler.js` POST to upload returns non-OK or file exceeds size/format limits: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  9. **Image Preview Failed** — `picture_handler.js` cannot render a preview from the selected file: `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  10. **MLA Source Save Failed** — `mla_source_handler.js` PUT for bibliography returns non-OK: `"Error: Failed to save bibliography changes for '{title}'."`
  11. **Context Link Save Failed** — `context_link_handler.js` PUT for context links returns non-OK: `"Error: Failed to save context links for '{title}'."`
  12. **Snippet Generation Failed** — `snippet_generator.js` request to `snippet_generator.py` returns non-OK or times out: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`
  13. **Metadata Save Failed** — `metadata_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for '{title}'."`

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
- [ ] Markdown live preview output matches the public frontend rendering — same parser behaviour, same CSS typographic tokens

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

#### Shared-Tool Consistency
- [ ] picture_handler.js: Verify identical behaviour with counterparts in records_single, blog_posts, challenge_response
- [ ] mla_source_handler.js: Verify identical behaviour with counterparts in records_single, blog_posts, challenge_response
- [ ] context_link_handler.js: Verify identical behaviour with counterparts in records_single, blog_posts
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in records_single, blog_posts, challenge_response, news_sources
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in blog_posts, challenge_response, challenge, wikipedia, news_sources
- [ ] markdown_editor.js: Verify identical behaviour with counterpart in blog_posts
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T15 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
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
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
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
