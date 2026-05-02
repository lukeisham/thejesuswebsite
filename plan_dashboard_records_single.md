---
name: plan_dashboard_records_single
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_records_single

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Single Record" dashboard view, a dense and comprehensive editor for individual database records. It features a split-pane layout with a dedicated section navigator for fast jumping between fields (Core Identifiers, Pictures, Taxonomy, Verses, etc.), integrated image upload handling with previews, and status controls (Save, Publish, Delete). This module is the primary administrative interface for curating, editing, and publishing the historical records that form the core of the website's archival collection.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
|  Title:           [___________________________________________]                 |
|  Primary Verse:   [___________________________________________]                 |
|  Creation Date:   [___________________________________________]                 |
|  Unique ID:       [___________________________________________]                 |
|                                                                                 |
|  +-------------------------------------+                                        |
|  |                                     |  [ Add Picture ]                       |
|  |          Image Display              |                                        |
|  |                                     |                                        |
|  +-------------------------------------+                                        |
|                                                                                 |
|  Snippet:         [___________________________________________]  [Generate]     |
|  Date Added:      [___________________________________________]                 |
|  Status:          [ Draft | Published | Archived ]                              |
|                                                                                 |
|  MLA Sources:     [___________________________________________]  [Add Source]   |
|  Context Links:   [___________________________________________]  [Add Link]     |
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
| **HTML** | `admin/frontend/dashboard_records_single.html` | High-density record editor form |
| **CSS** | `css/2.0_records/dashboard/dashboard_records_single.css` | Multi-column form layout & grouping |
| **JS** | `js/2.0_records/dashboard/dashboard_records_single.js` | Module orchestration & initialization |
| **JS** | `js/2.0_records/dashboard/display_single_record_data.js` | Record fetching & form hydration |
| **JS** | `js/2.0_records/dashboard/record_status_handler.js` | Save, Publish & Delete status management |
| **JS** | `js/2.0_records/dashboard/picture_handler.js` | Shared tool: Thumbnail & Image processing |
| **JS** | `js/2.0_records/dashboard/mla_source_handler.js` | Shared tool: Bibliography management |
| **JS** | `js/2.0_records/dashboard/context_link_handler.js` | Shared tool: Relational links |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | Shared tool: Summary generator |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4 calls `get_single_record`; T5 calls `update_record` (draft/publish/delete); T6 calls `upload_record_picture`; T9 calls snippet trigger endpoint |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the Single Record module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T10 routes all save, upload, and generation failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads a single record row; T5 writes status changes; T6 writes `picture_bytes` and `picture_thumbnail` |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T9 auto-generation button triggers this script via the API |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Single Record HTML

- **File(s):** `admin/frontend/dashboard_records_single.html`
- **Action:** Create the dense multi-section form structure for single record editing, including the sidebar navigator and status function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Single Record CSS

- **File(s):** `css/2.0_records/dashboard/dashboard_records_single.css`
- **Action:** Implement the 'providence' theme split-pane layout with a sticky section navigator and high-density form field styling.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Single Record Orchestrator

- **File(s):** `js/2.0_records/dashboard/dashboard_records_single.js`
- **Action:** Initialize the single record module and manage the overall form lifecycle, including dirty-checking and save coordination.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Data Display Logic

- **File(s):** `js/2.0_records/dashboard/display_single_record_data.js`
- **Action:** Implement the logic to fetch record details from the API and populate the various form sections and fields.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Record Status Handling

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Implement the logical flow for Save, Publish, and Delete operations with automatic draft behaviour. Any modification to the record (field edits, image upload, MLA/context/snippet changes) auto-saves with status set to draft. Only the explicit "Publish" button sets status to published. "Delete" removes the record from the database entirely. Interfacing with the backend record status API.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Picture Upload Handling

- **File(s):** `js/2.0_records/dashboard/picture_handler.js`
- **Action:** Implement the client-side logic for image file selection, preview rendering, and base64/blob submission for record imagery.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement MLA Source Handling

- **File(s):** `js/2.0_records/dashboard/mla_source_handler.js`
- **Action:** Implement the dynamic UI logic for adding, removing, and displaying MLA formatted sources within the form.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Implement Context Link Handling

- **File(s):** `js/2.0_records/dashboard/context_link_handler.js`
- **Action:** Implement the dynamic UI logic for associating and displaying context links for the record.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement Snippet Generation Logic

- **File(s):** `js/2.0_records/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger to request automated snippet generation from the backend pipeline.
- **Dependencies:** `admin/backend/admin_api.py` (get_single_record, create_record, update_record, delete_record, upload_record_picture), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T10 — Error Message Generation

- **File(s):**
  - `js/2.0_records/dashboard/display_single_record_data.js`
  - `js/2.0_records/dashboard/record_status_handler.js`
  - `js/2.0_records/dashboard/picture_handler.js`
  - `js/2.0_records/dashboard/mla_source_handler.js`
  - `js/2.0_records/dashboard/context_link_handler.js`
  - `js/2.0_records/dashboard/snippet_generator.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Record Fetch Failed** — `display_single_record_data.js` fetch to `/api/admin/records/{id}` fails or returns non-OK: `"Error: Unable to load record data. Please refresh and try again."`
  2. **Record Save Failed** — any PUT to `/api/admin/records/{id}` returns non-OK: `"Error: Failed to save changes to '{title}'. Please try again."`
  3. **Draft Failed** — `record_status_handler.js` PATCH to set draft status returns non-OK: `"Error: Failed to set record '{title}' to Draft."`
  4. **Publish Failed** — `record_status_handler.js` PATCH to publish returns non-OK: `"Error: Failed to publish record '{title}'. Check required fields."`
  5. **Delete Failed** — `record_status_handler.js` DELETE returns non-OK: `"Error: Failed to delete record '{title}'. Please try again."`
  6. **Image Upload Failed** — `picture_handler.js` POST to `upload_record_picture` returns non-OK or the file exceeds size/format limits: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  7. **Image Preview Failed** — `picture_handler.js` cannot render a preview from the selected file (unreadable/corrupt): `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  8. **MLA Source Save Failed** — `mla_source_handler.js` PUT for bibliography returns non-OK: `"Error: Failed to save bibliography changes for '{title}'."`
  9. **Context Link Save Failed** — `context_link_handler.js` PUT for context links returns non-OK: `"Error: Failed to save context links for '{title}'."`
  10. **Snippet Generation Failed** — `snippet_generator.js` request to `snippet_generator.py` returns non-OK or times out: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T11 — Vibe-Coding Audit

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
- [ ] picture_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response
- [ ] mla_source_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response
- [ ] context_link_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response, news_sources
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T12 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new single record editor files under Module 2.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new record editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Single Record editor layout. |
| `documentation/guides/guide_function.md` | Yes | Document record editing flow and snippet generation logic. |
| `documentation/guides/guide_security.md` | Yes | Note validation requirements for record fields and image uploads. |
| `documentation/guides/guide_style.md` | Yes | Document the split-pane form and section navigation CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
