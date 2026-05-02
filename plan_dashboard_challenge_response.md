---
name: plan_dashboard_challenge_response
version: 1.0.0
module: 5.0 — Essays & Responses
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_challenge_response

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Challenge Response" dashboard module, a dedicated CRUD interface for authoring scholarly responses to historical challenges. It features a markdown-based WYSIWYG editor with live preview, a specialized sidebar for navigating between academic and popular responses, and integrated status management (Draft, Publish, Delete). This module enables the creation of high-quality, long-form content that directly addresses the ranked challenges surfaced in the debate sections, ensuring a robust and well-documented defense of the archival material.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
| Response Sidebar          | Response WYSIWYG Editor                             |
|---------------------------+-----------------------------------------------------|
| *Academic*                | Title: [___________________________________]        |
| - Response 1 (Draft)      |                                                     |
| - Response 2 (Pub)        | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Popular*                 | |                                               |   |
| - Response A (Pub)        | |  Markdown response content goes here...       |   |
|                           | |                                               |   |
|                           | +-----------------------------------------------+   |
|                           |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
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
| **HTML** | `admin/frontend/dashboard_challenge_response.html` | Split-pane response editor container |
| **CSS** | `css/5.0_essays_responses/dashboard/dashboard_challenge_response.css` | Response editor layout & typography |
| **CSS** | `css/5.0_essays_responses/dashboard/response_markdown.css` | Markdown editor & live preview styling |
| **JS** | `js/5.0_essays_responses/dashboard/dashboard_challenge_response.js` | Module orchestration & initialization |
| **JS** | `js/5.0_essays_responses/dashboard/display_challenge_response_data.js` | Response fetching & field population |
| **JS** | `js/5.0_essays_responses/dashboard/markdown_editor.js` | Markdown editing & live preview logic |
| **JS** | `js/5.0_essays_responses/dashboard/response_status_handler.js` | Save/Publish/Delete status logic |
| **JS** | `js/5.0_essays_responses/dashboard/challenge_link_handler.js` | Parent challenge association logic |
| **JS** | `js/5.0_essays_responses/dashboard/picture_handler.js` | Shared tool: Image integration |
| **JS** | `js/5.0_essays_responses/dashboard/mla_source_handler.js` | Shared tool: Citation management |
| **JS** | `js/5.0_essays_responses/dashboard/snippet_generator.js` | Shared tool: Abstract generator |
| **JS** | `js/5.0_essays_responses/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T5 calls challenge response CRUD routes; T7 calls status update routes; T8 calls snippet trigger endpoint |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T4 registers the Challenge Response module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T9b routes all save, fetch, upload, and generation failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2/T3 reference Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T5 reads response rows; T7 writes status changes |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T8 auto-generation button triggers this script via the API |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T9 auto-gen meta button triggers this script via the API |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Challenge Response HTML

- **File(s):** `admin/frontend/dashboard_challenge_response.html`
- **Action:** Create the structural split-pane container for the challenge response editor, featuring the response navigator sidebar and the markdown editing canvas.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Challenge Response CSS

- **File(s):** `css/5.0_essays_responses/dashboard/dashboard_challenge_response.css`
- **Action:** Implement the 'providence' theme layout for the dual-pane editor, with specific focus on the response sidebar and sticky function bar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Response Markdown Styling

- **File(s):** `css/5.0_essays_responses/dashboard/response_markdown.css`
- **Action:** Implement the utilitarian styling for the markdown editor fields, toolbar buttons, and live preview rendering.
- **Vibe Rule(s):** CSS Variables · Rich Aesthetics · User Comments

- [ ] Task complete

---

### T4 — Implement Response Orchestrator

- **File(s):** `js/5.0_essays_responses/dashboard/dashboard_challenge_response.js`
- **Action:** Initialize the challenge response module and coordinate the sidebar loading, editor population, and preview synchronization.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Response Data Display

- **File(s):** `js/5.0_essays_responses/dashboard/display_challenge_response_data.js`
- **Action:** Implement the logic to fetch specific response content and metadata from the API and populate the editor fields.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Markdown Editor Logic

- **File(s):** `js/5.0_essays_responses/dashboard/markdown_editor.js`
- **Action:** Implement the core markdown editing logic, including toolbar actions and the live HTML preview generation.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Response Status Handling

- **File(s):** `js/5.0_essays_responses/dashboard/response_status_handler.js`
- **Action:** Implement the logical flow for saving, publishing, and deleting responses with automatic draft behaviour. Any modification to the response (content edits, image upload, MLA/snippet/metadata changes, challenge link changes) auto-saves with status set to draft. Only the explicit "Publish" button sets status to published. "Delete" removes the response from the database entirely. Interfacing with the backend response API.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Implement Snippet Generation Logic

- **File(s):** `js/5.0_essays_responses/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger to request automated snippet generation for the current response.
- **Dependencies:** `admin/backend/admin_api.py` (challenge response routes planned), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement Metadata Footer
- **File(s):** `js/5.0_essays_responses/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T9b — Error Message Generation

- **File(s):**
  - `js/5.0_essays_responses/dashboard/display_challenge_response_data.js`
  - `js/5.0_essays_responses/dashboard/response_status_handler.js`
  - `js/5.0_essays_responses/dashboard/markdown_editor.js`
  - `js/5.0_essays_responses/dashboard/picture_handler.js`
  - `js/5.0_essays_responses/dashboard/mla_source_handler.js`
  - `js/5.0_essays_responses/dashboard/snippet_generator.js`
  - `js/5.0_essays_responses/dashboard/metadata_handler.js`
  - `js/5.0_essays_responses/dashboard/challenge_link_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Response List Fetch Failed** — `display_challenge_response_data.js` fetch of the sidebar response list fails or returns non-OK: `"Error: Unable to load response list. Please refresh and try again."`
  2. **Response Content Fetch Failed** — `display_challenge_response_data.js` fetch of a selected response's content returns non-OK: `"Error: Unable to load response '{title}'. Please try again."`
  3. **Response Save Failed** — any PUT to `/api/admin/records/{id}` returns non-OK: `"Error: Failed to save changes to '{title}'. Please try again."`
  4. **Draft Failed** — `response_status_handler.js` PATCH to set draft status returns non-OK: `"Error: Failed to set '{title}' to Draft."`
  5. **Publish Failed** — `response_status_handler.js` PATCH to publish returns non-OK: `"Error: Failed to publish '{title}'. Check required fields."`
  6. **Delete Failed** — `response_status_handler.js` DELETE returns non-OK: `"Error: Failed to delete '{title}'. Please try again."`
  7. **Markdown Preview Failed** — `markdown_editor.js` cannot parse the response content and render a live preview: `"Error: Markdown preview failed. Check response content for invalid syntax."`
  8. **Image Upload Failed** — `picture_handler.js` POST to upload returns non-OK or file exceeds size/format limits: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  9. **Image Preview Failed** — `picture_handler.js` cannot render a preview from the selected file: `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  10. **MLA Source Save Failed** — `mla_source_handler.js` PUT for bibliography returns non-OK: `"Error: Failed to save bibliography changes for '{title}'."`
  11. **Challenge Link Failed** — `challenge_link_handler.js` PUT for parent challenge association returns non-OK: `"Error: Failed to link '{title}' to its parent challenge."`
  12. **Snippet Generation Failed** — `snippet_generator.js` request to `snippet_generator.py` returns non-OK or times out: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`
  13. **Metadata Save Failed** — `metadata_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for '{title}'."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T10 — Vibe-Coding Audit

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

#### Shared-Tool Consistency
- [ ] picture_handler.js: Verify identical behaviour with counterparts in records_single, essay_historiography, blog_posts
- [ ] mla_source_handler.js: Verify identical behaviour with counterparts in records_single, essay_historiography, blog_posts
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in records_single, essay_historiography, blog_posts, news_sources
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge, wikipedia, news_sources
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T11 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new Challenge Response dashboard files under Module 5.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new response editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Challenge Response editor and sidebar. |
| `documentation/guides/guide_function.md` | Yes | Document markdown editing flow and response-to-challenge linking. |
| `documentation/guides/guide_security.md` | Yes | Note validation for markdown content and response publishing permissions. |
| `documentation/guides/guide_style.md` | Yes | Document the markdown editor and utilitarian toolbar CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
