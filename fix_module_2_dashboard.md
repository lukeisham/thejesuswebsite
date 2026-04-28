---
name: fix_module_2_dashboard
version: 1.0.0
module: 2.0 — Records Module
status: draft
created: 2026-04-28
---

# Plan: fix_module_2_dashboard

## Purpose

> Module 2.0 admin dashboard is non-functional as a whole. `dashboard_app.js` routes `records-new`, `records-edit`, and `lists-resources` clicks into a generic split-pane placeholder instead of real modules. `edit_record.js` is a skeleton with incomplete enum options (3/8 era, 2/38 timeline, 2/6 map_label, 3/5 gospel_category), no `primary_verse`/`secondary_verse` builders, no `Bibliography` or `Miscellaneous` sections, no data loading on open, and no Save/Delete/Discard/View Live API wiring. `edit_links.js` contains only hardcoded stub data with no real `context_links` load or save. `edit_lists.js` is a fully static stub with no API connection, no drag-to-reorder logic, and no router entry point. `edit_bulk_upload.js` is functionally complete for upload but missing the required client-side CSV row validation preview before upload. The backend has no `resource_lists` table or list management endpoints. This plan fully implements all four subsections (§2.1–§2.5) of the Module 2.0 dashboard as specified in `documentation/guides/guide_dashboard_appearance.md`.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Wire records-new and records-edit router cases in dashboard_app.js

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** In `loadModule`, add case `records-new` (call `window.renderEditRecord('admin-canvas', null)`) and case `records-edit` (fetch `GET /api/admin/records`, render a paginated searchable list of rows showing `title` + `primary_verse` with `[Edit]` and `[Delete]` row actions, on Edit-click call `window.renderEditRecord('admin-canvas', recordId)`).
- **Vibe Rule(s):** Vanilla ES6+ only · No inline styles · Keep all existing router cases intact

- [x] Task complete

---

### T2 — Wire lists-resources router case in dashboard_app.js

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** In `loadModule`, add case `lists-resources` that calls `window.renderEditLists('admin-canvas', listName)` — render a list-name selector (dropdown of the 12 resource list names from `frontend/pages/resources/`) above the canvas before delegating to `renderEditLists`.
- **Vibe Rule(s):** Vanilla ES6+ only · No inline styles · Keep all existing router cases intact

- [x] Task complete

---

### T3 — Rebuild Core Identifiers section in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace the current two-column title/slug grid with a Core Identifiers section matching the §2.2 ASCII layout: `id` displayed as a read-only field (auto-generated ULID label for new records), `title` and `slug` text inputs, and `created_at` / `updated_at` shown as auto-managed read-only fields; also add the `[Delete]` button to the action bar alongside the existing Save/Discard/View Live buttons.
- **Vibe Rule(s):** Semantic HTML5 `<section>` grouping · Descriptive `id` attributes (`record-id`, `record-title`, `record-slug`) · No inline styles

- [x] Task complete

---

### T4 — Complete all enum dropdowns and add geo_id / parent_id inputs in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace stub `<select>` elements with complete option sets: `era` (all 8 values: PreIncarnation, Patriarchal, Mosaic, Monarchy, Exile, SecondTemple, Life, PostPassion), `timeline` (all 38 values from `data_schema.md`), `map_label` (all 6 values: Overview, Empire, Levant, Judea, Galilee, Jerusalem), `gospel_category` (all 5 values: event, location, person, theme, object); add a `geo_id` number input and a `parent_id` text input to the Taxonomy section.
- **Vibe Rule(s):** Semantic `<select>` and `<input>` elements · Descriptive `id` hooks matching DB column names · No inline styles

- [x] Task complete

---

### T5 — Add primary_verse and secondary_verse JSON-array builders in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a Verses section containing two identical builder sub-panels (Primary Verse / Secondary Verse) — each with a book `<select>` (all 66 canonical books), chapter number input, verse number input, an `[+ Add Verse]` button that appends a `{book, chapter, verse}` entry as a removable chip, and a hidden field that holds the serialised JSON array consumed by the Save handler.
- **Vibe Rule(s):** Vanilla ES6+ · Semantic `<section>` grouping · All logic inside `window.renderEditRecord` · No inline scripts

- [x] Task complete

---

### T6 — Replace Text Content textareas with paragraph JSON-array editors in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace the two bare `<textarea>` placeholders with properly labelled paragraph-array editors for `description` and `snippet` — each renders one `<textarea>` per paragraph entry from the stored JSON array, an `[+ Add Paragraph]` button that appends a new textarea, and a `[×]` remove button per paragraph; on save, serialize each editor's textareas back to a JSON array.
- **Vibe Rule(s):** Vanilla ES6+ · Descriptive `id` hooks · Explicit readable logic

- [ ] Task complete

---

### T7 — Add Bibliography card with all six MLA sub-fields in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a Bibliography section containing six labelled `<textarea>` fields matching the sub-keys of the `bibliography` JSON blob: `mla_book`, `mla_book_inline`, `mla_article`, `mla_article_inline`, `mla_website`, `mla_website_inline`; on load parse the `bibliography` blob and pre-fill each; on save re-serialize to the blob.
- **Vibe Rule(s):** Vanilla ES6+ · CSS Grid 2-column layout via class — no inline grid styles · CSS variables for spacing

- [ ] Task complete

---

### T8 — Add Miscellaneous section with all five remaining fields in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a Miscellaneous section with five labelled inputs: `metadata_json` (textarea, JSON blob), `iaa` (text input), `pledius` (text input), `manuscript` (text input), and `url` (textarea, JSON blob); assign `id` attributes that match DB column names exactly and pre-fill from loaded record data.
- **Vibe Rule(s):** Vanilla ES6+ · snake_case `id` attributes matching DB column names · Explicit readable logic

- [ ] Task complete

---

### T9 — Wire data loading on form open in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** After injecting all form HTML, if `recordId` is provided fetch `GET /api/admin/records/{recordId}` and populate every field (all text inputs, selects, paragraph arrays, verse chips, bibliography blob, miscellaneous fields, and the `context_links` hidden field); if `recordId` is null leave all inputs empty for record creation.
- **Vibe Rule(s):** Vanilla ES6+ · Explicit readable logic · All fetch logic inside `window.renderEditRecord`

- [ ] Task complete

---

### T10 — Wire Save, Discard, Delete, and View Live action buttons in edit_record.js

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Attach click handlers to all four action-bar buttons: **Save Changes** — collect all field values (including the `context_links` hidden field from T11), serialize JSON fields, validate JSON blobs with `JSON.parse` and show an inline error on failure, auto-generate `id` (ULID) and `created_at`/`updated_at` for new records, then fire `POST /api/admin/records` (create) or `PUT /api/admin/records/{recordId}` (update) with the JWT cookie and display an inline success or error message; **Discard** — re-call `window.renderEditRecord(containerId, recordId)` to hard-reset; **Delete** — confirm then fire `DELETE /api/admin/records/{recordId}` and return to the §2.1 record list; **View Live** — derive the public URL from `slug` and open in a new tab.
- **Vibe Rule(s):** Vanilla ES6+ · Explicit readable logic · Stateless and safe to call repeatedly · No framework fetch wrappers

- [ ] Task complete

---

### T11 — Wire context_links loading, chip rendering, and save serialization in edit_links.js

- **File(s):** `admin/frontend/edit_modules/edit_links.js`
- **Action:** Update `window.renderEditLinks(containerId, contextLinksData)` to accept a `contextLinksData` JSON blob from the parent record; render each `{slug, type}` entry as a removable chip; provide an `[+ Add Link]` button that appends a new blank `{slug, type}` entry; serialise the current chip list into a hidden `<input id="context-links-hidden">` field that is collected by the T10 Save handler.
- **Vibe Rule(s):** Vanilla ES6+ · One exported function (`window.renderEditLinks`) · File opens with three-line header comment · Component injection pattern for chips

- [ ] Task complete

---

### T12 — Add resource_lists table to database.sql

- **File(s):** `database/database.sql`
- **Action:** Add a `CREATE TABLE IF NOT EXISTS resource_lists` definition with columns `id INTEGER PRIMARY KEY AUTOINCREMENT`, `list_name TEXT NOT NULL`, `record_slug TEXT NOT NULL`, `position INTEGER NOT NULL DEFAULT 0`; add a `UNIQUE(list_name, record_slug)` constraint and an index on `(list_name, position)`.
- **Vibe Rule(s):** `snake_case` field names · Explicit schema definition · No deeply nested logic

- [ ] Task complete

---

### T13 — Add GET and PUT list endpoints to admin_api.py

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add two authenticated endpoints: `GET /api/admin/lists/{list_name}` — query `resource_lists` for all rows matching `list_name`, join to `records` to return `title` and `slug` per row ordered by `position`, return as JSON array; `PUT /api/admin/lists/{list_name}` — accept a JSON array of `{record_slug, position}` objects and upsert the full list order using `INSERT OR REPLACE`, deleting removed slugs first.
- **Vibe Rule(s):** Explicit readable Python · Stateless and safe to call repeatedly · Document any SQLite quirks inline

- [ ] Task complete

---

### T14 — Wire API data loading, Remove, Save List, and Bulk Add handlers in edit_lists.js

- **File(s):** `admin/frontend/edit_modules/edit_lists.js`
- **Action:** Replace all hardcoded stub data with live API integration: on render fetch `GET /api/admin/lists/{listName}` and inject real rows; wire each `[Remove]` button to splice its entry from the in-memory list array and re-render; wire `[Save List]` to fire `PUT /api/admin/lists/{listName}` with the current ordered array and show an inline success or error message; wire the Bulk Add `[Add]` button to parse the textarea as CSV or newline-separated slugs, validate each slug against the fetched record pool, append valid entries to the list array, and re-render.
- **Vibe Rule(s):** Vanilla ES6+ · All logic inside `window.renderEditLists` · Explicit readable logic · No inline styles

- [ ] Task complete

---

### T15 — Implement HTML5 drag-to-reorder in edit_lists.js

- **File(s):** `admin/frontend/edit_modules/edit_lists.js`
- **Action:** Add HTML5 drag-and-drop reorder to the list items: set `draggable="true"` on each `<li>`, attach `dragstart`, `dragover`, and `drop` event listeners that update the in-memory list array order on drop; reorder is only persisted when `[Save List]` is clicked (T14).
- **Vibe Rule(s):** Vanilla ES6+ · No external drag-and-drop libraries · Explicit readable logic

- [ ] Task complete

---

### T16 — Add client-side CSV row validation preview before upload in edit_bulk_upload.js

- **File(s):** `admin/frontend/edit_modules/edit_bulk_upload.js`
- **Action:** After a CSV file is selected, parse the file content using `FileReader` and manual row splitting, validate each row for required columns (`title`, `slug`) and enum values (`era`, `timeline`, `map_label`, `gospel_category`), and display a validation results block showing per-row error messages (e.g. `Row 2: missing slug — skipped`) and a summary count (`N of M rows valid — ready to insert`) before the `[Start Upload]` button is enabled; invalid rows are excluded from the upload payload.
- **Vibe Rule(s):** Vanilla ES6+ · FileReader API only — no external CSV libraries · Explicit readable logic · Stateless and safe to run repeatedly

- [ ] Task complete

---

<!-- No additional tasks required — all §2.1–§2.5 subsections are covered above -->

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `admin/frontend/dashboard_app.js` | 6.1 Admin Portal | Yes | None — file already listed, no path changes |
| `admin/frontend/edit_modules/edit_record.js` | 2.0 Records Module | Yes | None — file already listed, no path changes |
| `admin/frontend/edit_modules/edit_links.js` | 2.0 Records Module | Yes | None — file already listed, no path changes |
| `admin/frontend/edit_modules/edit_lists.js` | 2.0 Records Module | Yes | None — file already listed, no path changes |
| `admin/frontend/edit_modules/edit_bulk_upload.js` | 2.0 Records Module | Yes | None — file already listed, no path changes |
| `database/database.sql` | 2.0 Records Module | Yes | None — file already listed; schema change documented in data_schema.md |
| `admin/backend/admin_api.py` | 6.1 Admin Portal | Yes | None — file already listed, no path changes |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 2.0: Records Module

> Every other file in Module 2.0 not being touched by this plan, assessed for impact from the CRUD wiring and `resource_lists` table addition.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `admin/frontend/edit_modules/edit_picture.js` | Yes | Rendered as a sub-module inside `edit_record.js`; the T10 Save handler must not intercept `edit_picture.js`'s own upload form submission — verify event delegation is scoped to `#edit-record-card` only |
| `database/database.sqlite` | Yes | The compiled SQLite file must be regenerated after the `resource_lists` table is added to `database.sql`; run `db_seeder.py` or the equivalent compile step before testing |
| `frontend/display_big/list_view.js` | Yes | Public resource list pages (`frontend/pages/resources/*.html`) currently query `records` directly by category filter; once `resource_lists` defines explicit membership, `list_view.js` may need updating to query from `resource_lists` rather than filtering `records` — flag for follow-up but out of scope here |
| `frontend/pages/resources/*.html` (12 files) | Yes | Same dependency as `list_view.js` above — if the public list rendering is updated to use `resource_lists`, each resource HTML page anchor will remain intact but the backing query changes; out of scope here, flag for follow-up |
| `frontend/core/setup_db.js` | No | Fetches and inits the SQLite WASM; unaffected by the new table addition since the WASM only loads the compiled `.sqlite` |
| `frontend/core/sanitize_query.js` | No | Search sanitisation utility; not invoked by admin save flows |
| `frontend/core/json_ld_builder.js` | No | Generates Schema.org metadata for public views; unaffected |
| `backend/scripts/helper_api.py` | No | Shared external API utility; not called by the record CRUD or list endpoints |
| `frontend/pages/records.html` / `record.html` | No | Public HTML pages; admin routing and schema changes do not affect public view structure |
| `frontend/core/sql-wasm.wasm` / `sql-wasm.js` | No | Downloaded libraries; no impact identified |
| `frontend/display_big/single_view.js` | No | Read-only public record renderer; unaffected by admin form changes |
| `frontend/display_other/pictures_display.js` | No | No impact identified |
| `frontend/display_other/thumbnails_display.js` | No | No impact identified |
| `frontend/display_other/display_snippet.js` | No | No impact identified |
| `css/elements/pictures.css` / `thumbnails.css` | No | No impact identified |
| `css/design_layouts/views/list_layout.css` / `single_layout.css` | No | No impact identified |

### Cross-Module Check

> Modules architecturally connected to Module 2.0 per the System Architecture diagram in `detailed_module_sitemap.md`.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 6.1 — Admin Portal | Yes | `dashboard_app.js` and `admin_api.py` are both directly edited; general routing pattern and `loadModule` function must remain intact for all other dashboard modules (ranks, text content, configuration) |
| 6.2 — System Core & DevOps | Yes | Adding `resource_lists` to `database.sql` means `deployment/deploy.sh` may need a database recompile step; `tools/db_seeder.py` should be updated to seed the new table — flag for follow-up |
| 3.0 — Visualizations Module | No | Timeline and map data are driven by `era`, `timeline`, and `map_label` columns on `records`; no writes or schema changes in this plan affect their display logic |
| 7.0 — Setup & Testing Module | Yes | `database/database.sql` schema change means `documentation/data_schema.md` and `tools/db_seeder.py` should be updated to reflect the new `resource_lists` table; addressed in Documentation Update below |
| 1.0 — Foundation Module | No | No changes to shared CSS, sidebar, header, or footer |
| 4.0 — Ranked Lists Module | No | Rankings pipelines and weighting logic are independent of record CRUD and list membership |
| 5.0 — Essays Module | No | Essay and response editors are independent dashboard modules; no shared state with `edit_record.js` |

### Module Impact Summary
- [ ] Intra-module check completed — all other files in Module 2.0 reviewed
- [ ] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **`edit_picture.js`, `database.sqlite`, `list_view.js`/resource pages (intra) and Modules 6.1, 6.2, 7.0 (cross) require attention — see flagged rows above**

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added; all edited files were already listed |
| `documentation/simple_module_sitemap.md` | No | No change to module scope or high-level structure |
| `documentation/site_map.md` | No | No new files added; no need to re-run /sync_sitemap |
| `documentation/data_schema.md` | Yes | Document the new `resource_lists` table: columns (`id`, `list_name`, `record_slug`, `position`), constraints (`UNIQUE(list_name, record_slug)`), and its role as the membership/ordering structure for the 12 named resource lists |
| `documentation/vibe_coding_rules.md` | No | No ambiguous rules encountered requiring clarification |
| `documentation/style_mockup.html` | No | No new page layouts or significant visual changes introduced |
| `documentation/git_vps.md` | No | No deployment workflow or VPS config changes required at this stage (database recompile flag noted in Module Impact Audit for follow-up) |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update §2.2 to confirm the complete field list is now rendered by `edit_record.js`; update §2.3/2.4 to reflect that `edit_lists.js` is now backed by `resource_lists` API endpoints; update §2.5 to reflect the pre-upload CSV validation preview |
| `documentation/guides/guide_function.md` | Yes | Document two new logic flows: (1) complete record CRUD flow via `dashboard_app.js` → `renderEditRecord` → `GET /api/admin/records/{id}` → field population → Save → `POST`/`PUT` to `admin_api.py`; (2) resource list management flow via `renderEditLists` → `GET /api/admin/lists/{name}` → reorder/edit → `PUT /api/admin/lists/{name}` |
| `documentation/guides/guide_security.md` | No | No changes to auth, session handling, rate limiting, or input validation — JWT cookie pattern unchanged |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens introduced |
| `documentation/guides/guide_maps.md` | No | No map display or data logic changed |
| `documentation/guides/guide_timeline.md` | No | No timeline display or data logic changed |
| `documentation/guides/guide_donations.md` | No | No external support integrations changed |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, robots.txt, or AI-accessibility changes |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
