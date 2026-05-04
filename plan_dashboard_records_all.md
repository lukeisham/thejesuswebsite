---
name: plan_dashboard_records_all
version: 1.1.0
module: 2.0 — Records
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_records_all

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "All Records" dashboard view, providing a high-density tabular interface for managing the core database records. It features a keyboard-driven search bar with real-time client-side filtering across title, primary verse, and snippet fields, endless scrolling, dynamic display toggles for sorting and filtering (Creation Date, Unique ID, Bible Verse, Title, List Ordinary), and a bulk CSV upload workflow with a review-and-commit step. The bulk workflow is a two-phase process: Phase 1 — CSV parsing and validation loads records into an ephemeral preview store (nothing is written to the database yet); Phase 2 — the admin reviews the parsed records in an isolated "Bulk" view, can deselect individual rows, and must explicitly click "Save as Draft" to commit them as permanent `draft` records merged into the main pool. If the admin navigates away or switches toggles without saving, the ephemeral records are discarded and vanish. This module serves as the primary entry point for record selection and administrative oversight within the 'providence' themed Admin Portal.

```text
+===================================================================================================+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >                      |
+===================================================================================================+
| Toggle: [Creation Date] [Unique ID] [Primary Verse] [Title] [List Ord.] [Bulk]                   |
| Search: [__________________________________________________] (Cmd+K)  [✕ clear]                  |
+===================================================================================================+
|                                                                                                    |
|  ── DEFAULT VIEW (any toggle except "Bulk") ───────────────────────────────────────────────────   |
|                                                                                                    |
|  Title             | Primary Verse  | Snippet                      | Status                        |
|  ------------------+----------------+------------------------------+-------------------------------|
|  Jesus is born     | Luke 2:1-7     | In those days Caesar Aug...  | Published                     |
|  Sermon on Mount   | Matthew 5-7    | Seeing the crowds, he we...  | Published                     |
|  Draft Item 1      |                | Pending content...           | Draft                         |
|  ...               | ...            | ...                          | ...                           |
|                                                                                                    |
|  (Endless Scroll — clicking a row opens the Single Record editor)                                  |
|                                                                                                    |
+===================================================================================================+
|                                                                                                    |
|  ── BULK REVIEW VIEW (active when "Bulk" toggle selected) ────────────────────────────────────    |
|                                                                                                    |
|  ╔═══════════════════════════════════════════════════════════════════════════════════════════════╗ |
|  ║  Bulk Upload Review — 12 records parsed, 10 valid, 2 with errors       [Save as Draft] [Discard All] ║ |
|  ╠═══════════════════════════════════════════════════════════════════════════════════════════════╣ |
|  ║                                                                                               ║ |
|  ║  ☑ Row 1  | Jesus is born     | Luke 2:1-7     | Valid                                        ║ |
|  ║  ☑ Row 2  | Sermon on Mount   | Matthew 5-7    | Valid                                        ║ |
|  ║  ☐ Row 3  |                   |                | ✗ Missing title                              ║ |
|  ║  ☑ Row 4  | Baptism of Jesus  | Mark 1:9-11    | Valid                                        ║ |
|  ║  ☑ Row 5  | ...               | ...            | Valid                                        ║ |
|  ║  ...      |                   |                |                                              ║ |
|  ║                                                                                               ║ |
|  ╚═══════════════════════════════════════════════════════════════════════════════════════════════╝ |
|                                                                                                    |
|  ── After "Save as Draft" clicked:                                                                 |
|      • All checked valid rows are committed as permanent `draft` records                           |
|      • Records are merged into the main pool and appear under whatever toggle was previously active |
|      • The "Bulk" toggle resets and the ephemeral store is cleared                                 |
|                                                                                                    |
|  ── After "Discard All" clicked (or navigating away without saving):                               |
|      • All ephemeral records are discarded                                                         |
|      • The "Bulk" toggle resets and the default table view is restored                             |
|                                                                                                    |
+===================================================================================================+
| [ Error Message Display: System running normally / Error logs appear here ]                       |
+===================================================================================================+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, work through the tasks sequentially, and ensure each task is fully completed, and marked as complete, before moving to the next.  

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_records_all.html` | Tabular records management container with toggleable bulk review section |
| **CSS** | `css/2.0_records/dashboard/dashboard_records_all.css` | High-density table, sorting aesthetics, bulk review panel styling |
| **JS** | `js/2.0_records/dashboard/dashboard_records_all.js` | Module orchestration & view switching |
| **JS** | `js/2.0_records/dashboard/data_populate_table.js` | API integration & row hydration |
| **JS** | `js/2.0_records/dashboard/endless_scroll.js` | Performance-optimized overflow handling |
| **JS** | `js/2.0_records/dashboard/table_toggle_display.js` | Sort/Filter logic for the function bar; Bulk toggle isolates view |
| **JS** | `js/2.0_records/dashboard/bulk_csv_upload_handler.js` | Phase 1: CSV file selection, parsing, and client-side validation |
| **JS** | `js/2.0_records/dashboard/bulk_upload_review_handler.js` | Phase 2: Ephemeral review table, row selection, Save as Draft / Discard commit |
| **JS** | `js/2.0_records/dashboard/search_records.js` | Real-time client-side search across title, primary_verse, snippet |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4/T5/T6 call `GET /api/admin/records` (paginated); T8 calls `POST /api/admin/bulk-upload/commit` to persist reviewed records |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the All Records module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T3 surfaces fetch, upload, and commit failures via shared error display |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads all record rows; T8 writes committed bulk records as `draft` |

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
- **Action:** Create the table structure for the all records view, including the page function bar for toggles, the endless scroll container, and a dedicated `#bulk-review-panel` container that is hidden by default and shown only when the "Bulk" toggle is active. The bulk review panel must contain anchor elements for the review table, checkbox-based row selection, and the Save as Draft / Discard action bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [x] Task complete

---

### T2 — Implement Records List CSS

- **File(s):** `css/2.0_records/dashboard/dashboard_records_all.css`
- **Action:** Implement high-density table styling with monospaced metadata typography, hover states on rows, fixed-header toggle bar, and the bulk review panel styling (visual separation from the main table, checkbox column, invalid-row highlighting in red/muted, and a sticky action bar for Save as Draft / Discard).
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [x] Task complete

---

### T3 — Implement Records List Orchestrator

- **File(s):** `js/2.0_records/dashboard/dashboard_records_all.js`
- **Action:** Initialize the records list module and coordinate data fetching, toggle switching, and scroll behavior. Key responsibilities:
  - On "Bulk" toggle select: hide the main records table, show `#bulk-review-panel`, and call `renderBulkReview()` from `bulk_upload_review_handler.js`
  - On any other toggle select (or after bulk commit/discard): hide `#bulk-review-panel`, show the main records table, and re-fetch records from the API with the active sort order
  - Track the previously-active toggle so that after bulk commit, the view returns to that sort mode
  - On module unload (navigating away without saving): call `window.discardBulkReview()` to clear ephemeral data
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T4 — Implement Data Populate Logic

- **File(s):** `js/2.0_records/dashboard/data_populate_table.js`
- **Action:** Implement the logic to fetch record batches from `GET /api/admin/records` (with sort/filter params from the active toggle) and render them into table rows. Each row is clickable and navigates to the Single Record editor for that record. Bulk-uploaded records that have been committed as `draft` appear in this table alongside all other records.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T5 — Implement Endless Scroll Logic

- **File(s):** `js/2.0_records/dashboard/endless_scroll.js`
- **Action:** Implement the Intersection Observer logic to trigger batch loads as the user scrolls to the bottom of the table. Not active when the Bulk review panel is visible.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T6 — Implement Table Toggle Logic

- **File(s):** `js/2.0_records/dashboard/table_toggle_display.js`
- **Action:** Implement the logic for the top function bar toggles. Each toggle re-fetches records from the API with the corresponding sort order:
  - **Creation Date** — ordered by `created_at` descending
  - **Unique ID** — ordered by `id`
  - **Primary Verse** — ordered by Bible book order (Genesis → Revelation), then chapter, then verse
  - **Title** — ordered alphabetically (toggleable ascending/descending on second click)
  - **List Ordinary** — ordered by `gospel_category` then `title`
  - **Bulk** — does NOT fetch from API. Instead, isolates the view to show only the ephemeral bulk review panel (T8). If no ephemeral records exist (no CSV has been parsed), displays a message: "No bulk upload in progress. Upload a CSV file to begin."
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T7b — Implement Records Search

- **File(s):** `js/2.0_records/dashboard/search_records.js`
- **Action:** Implement a keyboard-driven search bar that performs real-time client-side filtering of the currently-loaded records. Detailed behaviour:
  1. The search bar lives in the function bar area below the toggles, with placeholder text `"Search records by title, verse, or keyword... (Cmd+K)"`.
  2. Keyboard shortcut `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) focuses the search input from anywhere on the page.
  3. On each keystroke (debounced at 150ms), filter the currently-rendered rows in the DOM by matching the search term against `title`, `primary_verse`, and `snippet` fields (case-insensitive).
  4. Matching is fuzzy — the search term characters must appear in order but not necessarily consecutively (e.g. "jesus born" matches "Jesus is born").
  5. Rows that don't match are hidden via CSS (`display: none`). The status bar updates with a count: `"Showing {n} of {total} records"`.
  6. When the search input is cleared (either via the ✕ button or by deleting all text), all rows are restored and the status bar reverts to the default message.
  7. Search operates independently of the active toggle — it filters whatever the current sort order has loaded (including endless-scroll batches). When the toggle changes, the search input is cleared.
  8. Search is disabled when the "Bulk" toggle is active; the search bar shows a muted placeholder: `"Search unavailable in Bulk Review mode"`.
  9. When a search is active and endless scroll triggers a new batch load, newly-loaded rows are also filtered against the active search term before being shown.
  - **Dependencies:** `js/2.0_records/dashboard/data_populate_table.js` (reads loaded rows), `js/2.0_records/dashboard/endless_scroll.js` (coordinates with batch loading), `js/2.0_records/dashboard/table_toggle_display.js` (clears search on toggle change), `js/admin_core/error_handler.js` (surfaces status count)
  - **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

  - [x] Task complete

  ---

  ### T7 — Implement Bulk CSV Upload (Phase 1: Parse & Validate)

- **File(s):** `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
- **Action:** Implement Phase 1 of the bulk upload workflow — CSV file selection, parsing, and client-side validation. This phase does NOT write anything to the database. Detailed behavior:
  1. Admin clicks an "Upload CSV" button (visible in the function bar area or within the Bulk review panel when empty).
  2. File picker accepts `.csv` files only.
  3. On file selection, parse the CSV using vanilla JS (split by newlines, split by commas, with quote handling).
  4. Extract column headers from row 1 and map them to schema fields (`title`, `primary_verse`, `description`, `snippet`, `era`, `timeline`, `gospel_category`, `map_label`, `geo_id`, `bibliography`, `context_links`, `iaa`, `pledius`, `manuscript`, `url`).
  5. Validate each row client-side:
     - `title` is required (non-empty)
     - `primary_verse` if present must match the `Book Chapter:Verse` pattern
     - Enum fields (`era`, `timeline`, `gospel_category`, `map_label`) if present must match valid values from `data_schema.md`
     - `geo_id` if present must be a valid integer
  6. On successful parse: call `window.loadBulkReviewRows(rows)` on `bulk_upload_review_handler.js` to populate the ephemeral store, then auto-select the "Bulk" toggle to show the review panel.
  7. On parse failure: surface error via `window.surfaceError()`.
  - **Dependencies:** `js/2.0_records/dashboard/bulk_upload_review_handler.js` (calls `loadBulkReviewRows()`)
  - **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

  - [x] Task complete

  ---

  ### T8 — Implement Bulk Upload Review (Phase 2: Review & Commit)

- **File(s):** `js/2.0_records/dashboard/bulk_upload_review_handler.js`
- **Action:** Implement Phase 2 of the bulk upload workflow — the ephemeral review table, row selection, and commit/discard actions. This is the core new script. Detailed behavior:

  **Ephemeral Store:**
  - Maintain an in-memory array `_ephemeralRows[]` of parsed CSV rows. Each entry: `{ rowIndex, fields: {...}, valid: bool, checked: bool, errors: [] }`.
  - This data is NOT persisted to the database until the admin explicitly clicks "Save as Draft".

  **Public API (window.*):**
  - `window.loadBulkReviewRows(rows)` — Called by `bulk_csv_upload_handler.js` after successful parse. Loads rows into the ephemeral store and triggers render.
  - `window.renderBulkReview()` — Renders the bulk review table into `#bulk-review-panel`. Each row shows: a checkbox (pre-checked for valid rows, unchecked for invalid rows), row number, parsed field preview (title, primary_verse), and validation status (✓ Valid or ✗ with error list). Invalid rows are visually distinct (red-tinted background).
  - `window.commitBulkReview()` — Triggered by the "Save as Draft" button. Collects all checked valid rows, sends them to `POST /api/admin/bulk-upload/commit` as a JSON payload. On success: clears the ephemeral store, hides the bulk review panel, switches back to the previously-active toggle, and re-fetches the main records table (now including the newly committed draft records). On failure: surfaces error via `window.surfaceError()`; ephemeral data is preserved so the admin can retry.
  - `window.discardBulkReview()` — Triggered by the "Discard All" button or by navigating away from the Bulk view without saving. Clears the ephemeral store, hides the bulk review panel, and restores the default table view. No API call is made — the records simply vanish.

  **Action Bar:**
  - "Save as Draft" button — calls `commitBulkReview()`. Disabled if no valid rows are checked. Shows count: "Save {n} records as Draft".
  - "Discard All" button — calls `discardBulkReview()` with a confirmation prompt: "Discard all {n} uploaded records? This cannot be undone."

  **Edge Cases:**
  - If all rows are invalid, "Save as Draft" is disabled and a message appears: "All rows contain validation errors. Fix the CSV and re-upload."
  - If the admin switches away from the "Bulk" toggle without saving, `discardBulkReview()` is called automatically (records vanish).
  - If the admin uploads a second CSV while a previous review is still pending, the old ephemeral store is replaced (with a warning confirmation).
  - Committed records are given `status: "draft"` and are immediately fetchable in the main records table under any toggle.

- **Dependencies:** `admin/backend/admin_api.py` (`POST /api/admin/bulk-upload/commit`), `js/2.0_records/dashboard/table_toggle_display.js` (returns to previous toggle after commit), `js/admin_core/error_handler.js` (surfaces commit failures)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+ · window.* API contract

- [x] Task complete

---

## Final Tasks

### T9 — Error Message Generation

- **File(s):**
  - `js/2.0_records/dashboard/data_populate_table.js`
  - `js/2.0_records/dashboard/endless_scroll.js`
  - `js/2.0_records/dashboard/table_toggle_display.js`
  - `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
  - `js/2.0_records/dashboard/bulk_upload_review_handler.js`
  - `js/2.0_records/dashboard/search_records.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Search Filter Error** — `search_records.js` encounters a DOM mismatch or empty result set: `"No records match \"{term}\". Try a different search."`
  2. **Initial Records Fetch Failed** — `data_populate_table.js`: `"Error: Unable to load records. Please refresh and try again."`
  3. **Batch Load Failed** — `endless_scroll.js`: `"Error: Failed to load the next batch of records. Scroll up and try again."`
  4. **Sort/Filter Fetch Failed** — `table_toggle_display.js`: `"Error: Failed to re-sort records. Please try again."`
  5. **CSV Parse Failed** — `bulk_csv_upload_handler.js`: `"Error: CSV file could not be parsed. Check the file format and try again."`
  6. **CSV Validation Failed** — `bulk_csv_upload_handler.js`: `"Error: CSV validation failed. {n} row(s) contain missing or invalid fields."`
  7. **Bulk Commit Failed** — `bulk_upload_review_handler.js` POST to `/api/admin/bulk-upload/commit` returns non-OK: `"Error: Failed to save {n} records as draft. Please try again."`
  8. **Bulk Commit Partial** — `bulk_upload_review_handler.js` POST succeeds but some rows were rejected server-side: `"Error: {n} of {total} records saved. {rejected} were rejected by the server."`
  9. **Discard Confirmed** — `bulk_upload_review_handler.js` after Discard All is confirmed: informational message `"Bulk upload discarded. {n} records were not saved."` (routed as a non-error status message).

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [x] Task complete

---

### T10 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS
- [x] `#bulk-review-panel` present and hidden by default

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [x] Invalid bulk rows visually distinct (red-tinted background)
- [x] Bulk review action bar uses sticky positioning

#### JavaScript
- [x] One function per file
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern
- [x] `search_records.js` opens with three comment lines: trigger, main function, output
- [x] `search_records.js` uses fuzzy matching and debounced input
- [x] `bulk_upload_review_handler.js` exposes `window.*` API contract (`loadBulkReviewRows`, `renderBulkReview`, `commitBulkReview`, `discardBulkReview`)
- [x] No database writes occur during Phase 1 (CSV parse); writes only in Phase 2 (commit)

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline
- [x] `POST /api/admin/bulk-upload/commit` endpoint exists on `admin_api.py`

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic
- [x] Committed bulk records are inserted with `status = 'draft'`

---

### T11 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: The core objective has been fully met — search bar with real-time filtering, multi-sort table with 6 toggles, endless scroll, and a two-phase bulk CSV upload workflow (Phase 1: parse & validate into ephemeral store; Phase 2: review with row selection, Save as Draft commit, or Discard)
- [x] **Necessity**: The underlying need for record oversight with safe bulk ingestion (no accidental database writes without review) has been resolved
- [x] **Targeted Impact**: The All Records dashboard view has been implemented with both the default sorted table and the isolated bulk review panel; committed bulk records merge into the main pool as `draft` and appear under all toggles
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified; bulk review is contained within the All Records module and does not leak into Single Record or other plans

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new records list dashboard files under Module 2.0, including `bulk_upload_review_handler.js`. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new records list files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the All Records table view and bulk review panel. |
| `documentation/guides/guide_function.md` | Yes | Document the two-phase bulk upload workflow, ephemeral store pattern, and review-and-commit logic. |
| `documentation/guides/guide_security.md` | Yes | Note bulk upload validation, client-side sanitization, and the review gate preventing uncommitted writes. |
| `documentation/guides/guide_style.md` | Yes | Document high-density table CSS patterns and bulk review panel styling. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [x] Each "Yes" row has been updated with accurate, current information
- [x] No document contains stale references to files or logic changed by this plan
- [x] Version numbers incremented where frontmatter versioning is present
