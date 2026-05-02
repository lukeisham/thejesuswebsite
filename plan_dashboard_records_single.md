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

This plan implements the "Single Record" dashboard view, a dense and comprehensive editor for individual database records. It features a split-pane layout with a dedicated section navigator for fast jumping between fields (Core Identifiers, Pictures, Taxonomy, Verses, etc.), integrated image upload handling with previews, and status controls (Draft, Publish, Delete). This module is the primary administrative interface for curating, editing, and publishing the historical records that form the core of the website's archival collection.

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
| **JS** | `js/2.0_records/dashboard/record_status_handler.js` | Draft, Publish & Delete status management |
| **JS** | `js/2.0_records/dashboard/picture_handler.js` | Shared tool: Thumbnail & Image processing |
| **JS** | `js/2.0_records/dashboard/mla_source_handler.js` | Shared tool: Bibliography management |
| **JS** | `js/2.0_records/dashboard/context_link_handler.js` | Shared tool: Relational links |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | Shared tool: Summary generator |

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
- **Action:** Implement the logical flow for Draft, Publish, and Delete operations, interfacing with the backend record status API.
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
- [ ] picture_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response
- [ ] mla_source_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response
- [ ] context_link_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response, news_sources
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
