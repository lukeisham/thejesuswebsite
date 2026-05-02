---
name: plan_dashboard_records_all
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_records_all

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "All Records" dashboard view, providing a high-density tabular interface for managing the core database records. It features endless scrolling, dynamic display toggles for sorting and filtering (Creation Date, Unique ID, Bible Verse, Title, etc.), and a bulk CSV upload handler for mass data ingestion. This module serves as the primary entry point for record selection and administrative oversight within the 'providence' themed Admin Portal.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Toggle: [Creation Date] [Unique ID] [Primary Verse] [Title] [List Ord.] [Bulk]  |
+---------------------------------------------------------------------------------+
| Title             | Primary Verse  | Snippet                      | Status      |
+-------------------+----------------+------------------------------+-------------+
| Jesus is born     | Luke 2:1-7     | In those days Caesar Aug...  | Published   |
| Sermon on Mount   | Matthew 5-7    | Seeing the crowds, he we...  | Published   |
| Draft Item 1      |                | Pending content...           | Draft       |
| Bulk Upload Item  |                | Uploaded from CSV...         | Draft       |
| ...               | ...            | ...                          | ...         |
+---------------------------------------------------------------------------------+
| (Endless Scroll)                                                                |
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
| **HTML** | `admin/frontend/dashboard_records_all.html` | Tabular records management container |
| **CSS** | `css/2.0_records/dashboard/dashboard_records_all.css` | High-density table & sorting aesthetics |
| **JS** | `js/2.0_records/dashboard/dashboard_records_all.js` | Module orchestration & view switching |
| **JS** | `js/2.0_records/dashboard/data_populate_table.js` | API integration & row hydration |
| **JS** | `js/2.0_records/dashboard/endless_scroll.js` | Performance-optimized overflow handling |
| **JS** | `js/2.0_records/dashboard/table_toggle_display.js` | Sort/Filter logic for the function bar |
| **JS** | `js/2.0_records/dashboard/bulk_csv_upload_handler.js` | CSV parsing & bulk API submission |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4/T5/T6/T7 call `get_all_records`, `bulk_upload_records` endpoints for record fetching and CSV ingestion |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the All Records module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T3 surfaces fetch and upload failures via shared error display |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads all record rows; T7 writes bulk-uploaded rows |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Records List HTML

- **File(s):** `admin/frontend/dashboard_records_all.html`
- **Action:** Create the table structure for the all records view, including the page function bar for toggles and the endless scroll container.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Records List CSS

- **File(s):** `css/2.0_records/dashboard/dashboard_records_all.css`
- **Action:** Implement high-density table styling with monospaced metadata typography, hover states on rows, and fixed-header toggle bar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Records List Orchestrator

- **File(s):** `js/2.0_records/dashboard/dashboard_records_all.js`
- **Action:** Initialize the records list module and coordinate data fetching, toggles, and scroll behavior.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Data Populate Logic

- **File(s):** `js/2.0_records/dashboard/data_populate_table.js`
- **Action:** Implement the logic to fetch record batches from the admin API and render them into table rows.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Endless Scroll logic

- **File(s):** `js/2.0_records/dashboard/endless_scroll.js`
- **Action:** Implement the Intersection Observer logic to trigger batch loads as the user scrolls to the bottom of the table.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Table Toggle Logic

- **File(s):** `js/2.0_records/dashboard/table_toggle_display.js`
- **Action:** Implement the logic for the top function bar to re-sort the table based on ID, Date, Verse, Title, List ordinary, or Bulk upload status.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Bulk CSV Upload Logic

- **File(s):** `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
- **Action:** Implement the logic for ingesting CSV data, performing client-side validation, and submitting to the bulk upload API. **All bulk-uploaded records are saved with status set to draft** — the admin must review and publish each record individually via the Single Record editor.
- **Dependencies:** `admin/backend/admin_api.py` (get_all_records, bulk_upload_records)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T8 — Error Message Generation

- **File(s):**
  - `js/2.0_records/dashboard/data_populate_table.js`
  - `js/2.0_records/dashboard/endless_scroll.js`
  - `js/2.0_records/dashboard/table_toggle_display.js`
  - `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Initial Records Fetch Failed** — `data_populate_table.js` fetch to `/api/admin/records` fails or returns non-OK on first load: `"Error: Unable to load records. Please refresh and try again."`
  2. **Batch Load Failed** — `endless_scroll.js` Intersection Observer triggers a paginated fetch that fails or returns non-OK: `"Error: Failed to load the next batch of records. Scroll up and try again."`
  3. **Sort/Filter Fetch Failed** — `table_toggle_display.js` fetch after a toggle (sort by date, verse, title, etc.) fails or returns non-OK: `"Error: Failed to re-sort records. Please try again."`
  4. **CSV Parse Failed** — `bulk_csv_upload_handler.js` cannot parse the selected file (wrong format, malformed rows): `"Error: CSV file could not be parsed. Check the file format and try again."`
  5. **CSV Validation Failed** — client-side validation finds missing required columns or invalid field values in the CSV: `"Error: CSV validation failed. {n} row(s) contain missing or invalid fields."`
  6. **Bulk Upload Failed** — `bulk_csv_upload_handler.js` POST to `bulk_upload_records` returns non-OK: `"Error: Bulk upload failed. {n} record(s) were not saved. Check the CSV and try again."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Vibe-Coding Audit

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

---

### T10 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new records list dashboard files under Module 2.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new records list files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the All Records table view. |
| `documentation/guides/guide_function.md` | Yes | Document endless scroll and bulk upload logic. |
| `documentation/guides/guide_security.md` | Yes | Note bulk upload validation and session requirements. |
| `documentation/guides/guide_style.md` | Yes | Document high-density table CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present

