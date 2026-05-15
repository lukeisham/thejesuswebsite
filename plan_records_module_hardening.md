---
name: plan_records_module_hardening
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-15
---

# Plan: plan_records_module_hardening

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan addresses all code quality, safety, and clarity issues identified during a comprehensive audit of the 2.0 Records Module. It fixes three high-priority XSS vulnerabilities in the public frontend and dashboard (innerHTML injection of unsanitized data), corrects a UUID/ULID identity mismatch in the backend, adds CSRF token support to all state-changing API calls, hardens the bulk CSV upload pipeline (file validation, server-side size cap, RFC 4180 parsing), eliminates global state pollution in dashboard modules, standardises error messaging and validation feedback, and updates all affected documentation guides to reflect the changes. The work spans the Records Module's dashboard JS (`js/2.0_records/dashboard/`), frontend JS (`js/2.0_records/frontend/`), backend Python (`admin/backend/`), and the module's documentation guides (`documentation/guides/2.0 Records Module/`).

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix XSS in single_view.js (public frontend)

- **File(s):** `js/2.0_records/frontend/single_view.js`
- **Action:** Replace all `innerHTML` assignments that inject unsanitized record data (description paragraphs, context links, secondary verses, metadata grid values) with safe DOM construction using `createElement`/`textContent`. For context link URLs, validate that each href starts with `/` or `https://` before creating the anchor element. For description paragraphs, create `<p>` elements via `createElement` and set `textContent` rather than interpolating into an HTML string.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · No frameworks

- [ ] Task complete

---

### T2 — Fix XSS in display_single_record_data.js (dashboard)

- **File(s):** `js/2.0_records/dashboard/display_single_record_data.js`
- **Action:** Replace the `innerHTML`-based picture preview injection with `createElement('img')` and attribute assignment via `setAttribute`. Validate that the data URL starts with `data:image/png;base64,` before rendering. Apply the same pattern to any other `innerHTML` usage in this file that interpolates record data.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · 3-line header comment

- [ ] Task complete

---

### T3 — Fix UUID/ULID mismatch in records.py

- **File(s):** `admin/backend/routes/records.py`
- **Action:** Replace `uuid.uuid4()` with a ULID generator for new record IDs. Install `python-ulid` (add to `requirements.txt`) and use `ulid.new().str` to generate 26-character Crockford Base32 identifiers consistent with the documented ULID format. Also add a constant whitelist of valid sort column names (do not derive from `PRAGMA table_info` at runtime) to harden the dynamic SQL ORDER BY clause.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · Document API quirks

- [ ] Task complete

---

### T4 — Add CSRF token support to all dashboard API calls

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`, `js/2.0_records/dashboard/parent_selector.js`, `js/2.0_records/dashboard/snippet_generator.js`, `js/2.0_records/dashboard/bulk_upload_review_handler.js`, `js/2.0_records/dashboard/data_populate_table.js`
- **Action:** Create a shared helper function `getCSRFToken()` that reads the CSRF token from a `<meta name="csrf-token">` tag in `dashboard.html`. Add the token as an `X-CSRF-Token` header to every `fetch()` call that uses POST, PUT, or DELETE methods across all five files. Ensure GET requests are not affected.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · 3-line header comment

- [ ] Task complete

---

### T5 — Add CSRF meta tag to dashboard shell and backend middleware

- **File(s):** `admin/frontend/dashboard.html`, `admin/backend/routes/records.py` (or `admin/backend/main.py` / `admin/backend/middleware.py`)
- **Action:** Add a `<meta name="csrf-token" content="{{ csrf_token }}">` tag to the dashboard HTML shell. On the backend, generate a per-session CSRF token and inject it into the template. Add middleware that validates the `X-CSRF-Token` header on all POST/PUT/DELETE requests, returning 403 if missing or mismatched.
- **Vibe Rule(s):** Semantic HTML5 · No inline scripts · Explicit readable Python logic

- [ ] Task complete

---

### T6 — Add server-side size cap to bulk upload commit endpoint

- **File(s):** `admin/backend/routes/records.py` (or `admin/backend/routes/bulk.py`)
- **Action:** Add a maximum record count (500) to the `POST /api/admin/bulk-upload/commit` endpoint. If the payload exceeds 500 records, return 400 with a descriptive error message. Also add a `Content-Length` check middleware or guard (max 10MB) to prevent oversized request bodies.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks

- [ ] Task complete

---

### T7 — Harden CSV file validation in bulk_csv_upload_handler.js

- **File(s):** `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
- **Action:** Replace the `.endsWith('.csv')` file extension check with a two-part validation: (1) verify `file.type === 'text/csv'` or `file.type === 'application/vnd.ms-excel'`, and (2) verify the filename matches `/\.csv$/i` with no additional extensions (reject filenames like `data.csv.exe`). Also add a client-side file size limit (5MB) with a user-facing error message.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · 3-line header comment

- [ ] Task complete

---

### T8 — Replace hand-rolled CSV parser with Papa Parse

- **File(s):** `js/2.0_records/dashboard/bulk_csv_upload_handler.js`, `admin/frontend/dashboard.html`
- **Action:** Replace the custom `_parseCsvLine()` / `_splitCsvLines()` state machine with Papa Parse (add via `<script>` tag from CDN or local copy). Use `Papa.parse(fileText, { header: true, skipEmptyLines: true })` to handle RFC 4180 edge cases (embedded newlines in quoted fields, unmatched quotes, BOM). Map `Papa.parse` results through the existing `CSV_FIELD_MAP` and validation pipeline. Remove the now-unused `_parseCsvLine` and `_splitCsvLines` functions.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per JS file · 3-line header comment

- [ ] Task complete

---

### T9 — Add ULID validation guard inside _fetchParentTitle

- **File(s):** `js/2.0_records/dashboard/parent_selector.js`
- **Action:** Add a `ULID_REGEX.test(rawValue)` check at the top of `_fetchParentTitle()` so it cannot be called with unvalidated input from any call site. Return early with an error message in the display element if the value fails validation.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T10 — Surface script load failures to the user

- **File(s):** `js/2.0_records/dashboard/dashboard_records_all.js`, `js/2.0_records/dashboard/dashboard_records_single.js`
- **Action:** In both orchestrators, change the script `onerror` handler from silently resolving to tracking failed scripts in an array. After all scripts have loaded, if any failed, display a user-visible warning in the status bar (All Records) or function bar (Single Record) listing the failed module names. Do not block rendering — treat as degraded mode.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · 3-line header comment

- [ ] Task complete

---

### T11 — Replace global state with module-scoped closures

- **File(s):** `js/2.0_records/dashboard/dashboard_records_single.js`, `js/2.0_records/dashboard/display_single_record_data.js`, `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Replace `window._selectedRecordId`, `window._loadedRecordData`, and `window._recordTitle` with module-scoped variables inside `dashboard_records_single.js`. Expose getter/setter functions on `window` (e.g., `window.getSelectedRecordId()`, `window.setSelectedRecordId(id)`) so sub-modules can access the state through a controlled API. Update all consumers (`display_single_record_data.js`, `record_status_handler.js`) to use the getter/setter functions instead of direct global access.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T12 — Standardise error messaging across dashboard modules

- **File(s):** `js/2.0_records/dashboard/search_records.js`, `js/2.0_records/dashboard/data_populate_table.js`, `js/2.0_records/dashboard/record_status_handler.js`, `js/2.0_records/dashboard/bulk_upload_review_handler.js`
- **Action:** Define three message severity levels (info, warn, error) and standardise the `updateRecordsAllStatusBar(message, cssClass)` calls to use consistent tone and formatting. Info messages use neutral language ("No records match..."), warnings use advisory language ("Some rows could not be validated"), errors use action-oriented language ("Failed to load records. Refresh the page."). Ensure all error paths surface a message rather than failing silently.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T13 — Add inline validation feedback to verse_builder.js

- **File(s):** `js/2.0_records/dashboard/verse_builder.js`
- **Action:** Replace the silent `return` on invalid verse input (chapter < 1, verse < 1, empty book) with inline validation feedback. Add a small error hint element below the input row (reuse the `.form-field__hint` pattern with `.state-error` class) that displays a specific message ("Chapter must be 1 or greater", "Select a book first"). Clear the hint on the next valid input.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · No inline styles

- [ ] Task complete

---

### T14 — Add validation hint CSS for verse builder

- **File(s):** `css/2.0_records/dashboard/dashboard_records_single.css`
- **Action:** Add a `.verse-builder__hint` rule that reuses the existing `.form-field__hint` pattern with `.state-error` colour token (`--color-status-error`). Ensure the hint is hidden by default and visible only when populated.
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T15 — Fix collectAllFormData status inconsistency

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Remove the status field from `collectAllFormData()` return value. Instead, have `handleSaveDraft()` and `handlePublish()` set `payload.status = 'draft'` or `payload.status = 'published'` explicitly after calling `collectAllFormData()`. This makes the status override explicit rather than silently overwriting whatever the form radio returns.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T16 — Fix hard-coded domain in json_ld_builder.js

- **File(s):** `js/2.0_records/frontend/json_ld_builder.js`
- **Action:** Replace the hard-coded domain string with `window.location.origin` when constructing the `@id` and `url` fields in the JSON-LD structured data object.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T17 — Add Intersection Observer fallback in endless_scroll.js

- **File(s):** `js/2.0_records/dashboard/endless_scroll.js`
- **Action:** Add a guard that checks whether the scroll sentinel element exists before creating the Intersection Observer. If the element is missing, log a warning to the console and skip observer setup (the table will function without endless scroll, requiring manual refresh).
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T18 — Add sanitizeQuery dependency guard in setup_db.js

- **File(s):** `js/2.0_records/frontend/setup_db.js`
- **Action:** In the `runQuery()` method of `TheJesusDB`, add a guard that checks whether `window.sanitizeQuery` is defined before calling it. If missing, throw an error with a descriptive message rather than failing with `TypeError: sanitizeQuery is not a function`.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

### T19 — Validate verse JSON structure in bulk CSV upload

- **File(s):** `js/2.0_records/dashboard/bulk_csv_upload_handler.js`
- **Action:** Extend the `primary_verse` validation beyond `JSON.parse` success. After parsing, verify the result is an array where each element has `book` (non-empty string), `chapter` (positive integer), and `verse` (positive integer) properties. Add the same validation for `secondary_verse` if present.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+

- [ ] Task complete

---

---

## Final Tasks

### T20 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file (or tightly-related group for a single widget/component)
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

### T21 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: All three XSS vulnerabilities (single_view.js, display_single_record_data.js, context link innerHTML) are fixed — no unsanitized data flows into innerHTML
- [ ] **Achievement**: UUID/ULID mismatch resolved — new records receive 26-char Crockford Base32 identifiers
- [ ] **Achievement**: CSRF token protection added to all state-changing dashboard API calls
- [ ] **Achievement**: Bulk CSV pipeline hardened — file validation, server-side size cap, RFC 4180 parser, verse JSON structure validation
- [ ] **Achievement**: Global state replaced with module-scoped closures and getter/setter API
- [ ] **Achievement**: Error messaging standardised across dashboard modules with three severity levels
- [ ] **Achievement**: Verse builder provides inline validation feedback instead of silent failure
- [ ] **Achievement**: All documentation guides updated to reflect code changes
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in Tasks were created or modified

---

## Documentation Update Tasks

> Each documentation update is executed via a temporary Python script that reads the file, performs a targeted `str.replace()`, writes it back, and is deleted after verification. This avoids `edit_file` failures on ASCII box-drawing characters and Unicode symbols.

### T22 — Update detailed_module_sitemap.md via temp Python script

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_sitemap.py`) that reads `documentation/detailed_module_sitemap.md`, adds Papa Parse script reference (if local copy used) to the 2.0 Records dashboard JS file tree under `js/2.0_records/dashboard/`, adds a `python-ulid` note to the backend dependencies section, bumps the `version` in frontmatter, and writes the file back. Delete the script after verifying the edit.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Version frontmatter

- [ ] Task complete

---

### T23 — Update site_map.md via temp Python script

- **File(s):** `documentation/site_map.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_site_map.py`) that reads `documentation/site_map.md`, adds the Papa Parse file path (if local copy used) to the master file tree, bumps the `version` in frontmatter, and writes the file back. Delete the script after verifying the edit.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T24 — Update guide_dashboard_appearance.md via temp Python script

- **File(s):** `documentation/guides/2.0 Records Module/guide_dashboard_appearance.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_dashboard_appearance.py`) that reads the file and makes two changes to the ASCII diagrams: (1) in the Single Record editor diagram, add a `.verse-builder__hint` validation hint element below the verse builder input row showing an error state example, (2) in the All Records diagram, add a `[! degraded: module X failed to load]` warning indicator to the status bar area. Bump the `version` in frontmatter. Delete the script after verifying.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T25 — Update guide_function.md via temp Python script

- **File(s):** `documentation/guides/2.0 Records Module/guide_function.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_function.py`) that reads the file and updates the functional summary paragraph to mention: CSRF token flow (meta tag to X-CSRF-Token header to backend validation middleware), Papa Parse replacing the hand-rolled CSV parser for RFC 4180 compliance, ULID generation via `python-ulid` replacing `uuid.uuid4()`, and safe DOM construction (`createElement`/`textContent`) replacing `innerHTML` for XSS prevention. Bump the `version` in frontmatter. Delete the script after verifying.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T26 — Update guide_security.md via temp Python script

- **File(s):** `documentation/guides/guide_security.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_security.py`) that reads the file and adds a new section documenting five security controls introduced by this plan: (1) CSRF token flow — `<meta name="csrf-token">` in `dashboard.html`, `getCSRFToken()` reads it, `X-CSRF-Token` header sent on POST/PUT/DELETE, backend middleware validates and returns 403 on mismatch; (2) XSS prevention policy — no `innerHTML` with unsanitized data, use `createElement`/`textContent`, validate URLs start with `/` or `https://`; (3) bulk upload size limits — 500 record cap server-side, 10MB payload guard, 5MB client-side file limit; (4) CSV file validation — MIME type check (`text/csv`), regex extension check rejecting double extensions, size limit; (5) ULID validation guards — `ULID_REGEX` check inside `_fetchParentTitle()` preventing unvalidated API calls. Bump the `version` in frontmatter. Delete the script after verifying.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T27 — Update guide_style.md via temp Python script

- **File(s):** `documentation/guides/guide_style.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_style.py`) that reads the file and adds a new subsection for the `.verse-builder__hint` BEM element under the verse-builder block, with a table listing the class name, its purpose (inline validation error hint), and its CSS variable references (`--color-status-error`, `--text-xs`, `--font-mono`). Bump the `version` in frontmatter. Delete the script after verifying.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T28 — Update records_nomenclature.md via temp Python script

- **File(s):** `documentation/guides/2.0 Records Module/records_nomenclature.md`
- **Action:** Write and run a temporary Python script (`_tmp_update_nomenclature.py`) that reads the file and makes two changes to the Module-Specific Terms table: (1) add five new terms — `CSRF Token` (Security, per-session token read from `<meta>` tag and sent as `X-CSRF-Token` header on state-changing API calls), `Papa Parse` (JS Library, RFC 4180-compliant CSV parser replacing the hand-rolled state machine in `bulk_csv_upload_handler.js`), `getCSRFToken()` (JS Function, reads CSRF token from dashboard `<meta>` tag for fetch headers), `getSelectedRecordId()` (JS Function, getter replacing direct `window._selectedRecordId` global access), `setSelectedRecordId()` (JS Function, setter replacing direct `window._selectedRecordId` global assignment); (2) update the `collectAllFormData()` definition to note it no longer returns `status` — status is set explicitly by `handleSaveDraft()` and `handlePublish()` after collection. Bump the `version` in frontmatter. Delete the script after verifying.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [ ] Task complete

---

### T29 — Final documentation verification

- **Action:** After all temp scripts have run and been deleted, perform a final sweep:
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` layout diagrams reflect the verse builder hint and degraded-mode warning; `guide_function.md` summary reflects CSRF, Papa Parse, ULID, and safe DOM changes
- [ ] **Style guide updated:** `guide_style.md` includes the `.verse-builder__hint` BEM element
- [ ] **Security guide updated:** `guide_security.md` documents all five security controls
- [ ] **Nomenclature updated:** `records_nomenclature.md` includes all new terms and updated definitions
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
- [ ] **No temp scripts remain:** all `_tmp_*.py` files have been deleted from the project root

---

### T30 — Commit and push to GitHub

- **Action:** Stage all changed files, commit with a descriptive message summarising the hardening work, and push to `main` on GitHub.
- **Vibe Rule(s):** Git Rules (commit directly to `main`, no branches)

- [ ] Task complete
