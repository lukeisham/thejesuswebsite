---
name: fix_record_crud
version: 1.2.0
module: 2.0 Records Module — §2.1 & §2.2
status: draft
created: 2026-04-28
---

# Plan: fix_record_crud

## Purpose

> The dashboard's Create/Edit single-record workflow is currently a non-functional skeleton. `edit_record.js` renders a UI fragment with incomplete enum options (3 of 8 era values, 2 of 38 timeline values), no API data loading, and no save/create wiring. The `dashboard_app.js` router sends `records-new` and `records-edit` clicks into a generic placeholder instead of the actual edit module. The backend API (`admin_api.py`) is solid — GET, POST, PUT, and DELETE all work correctly. This plan fixes the frontend: wiring the router, loading records on open, exposing every in-scope field from `data_schema.md` in the form, and connecting the Save and Discard buttons to the API. Fields managed elsewhere in the dashboard are intentionally excluded: `ordo_salutis`, `context_essays`, `theological_essays`, `spiritual_articles`, all Rankings & Challenges sub-fields, and `responses`, `blogposts`, `news_sources`, `news_items`, `users`, `page_views`. `context_links` is in scope for §2.2 via the `edit_links.js` sub-module and is addressed in T8 below.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Wire records-new and records-edit routing in dashboard_app.js

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** In the `loadModule` function, add cases for `records-new` (call `window.renderEditRecord('admin-canvas', null)`) and `records-edit` (fetch `GET /api/admin/records`, render a clickable record list, and on row-click call `window.renderEditRecord('admin-canvas', recordId)`).
- **Vibe Rule(s):** Vanilla ES6+ only · Use existing CSS classes — no new inline styles · 3-line header comment preserved

- [ ] Task complete

---

### T2 — Load existing record data into the form on open (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** After injecting the form HTML, if `recordId` is provided fetch `GET /api/admin/records/{recordId}` and populate every form input, select, and textarea with the returned data; if no `recordId`, leave inputs blank for creation.
- **Vibe Rule(s):** Vanilla ES6+ · Explicit readable logic · Keep all logic inside `window.renderEditRecord`

- [ ] Task complete

---

### T3 — Complete all flat-select enum fields with full option lists (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace stub `<select>` elements for `era` (all 8 values), `timeline` (all 38 values), `map_label` (all 6 values), and `gospel_category` (all 5 values) with the complete option sets from `data_schema.md`; add `geo_id` (number input) and `parent_id` (text input) to the Taxonomy section; `ordo_salutis` is excluded — it is managed elsewhere in the dashboard.
- **Vibe Rule(s):** Vanilla ES6+ · Semantic HTML5 `<select>` and `<input>` elements · Descriptive `id` hooks · CSS variables for spacing/color

- [ ] Task complete

---

### T4 — Add primary_verse and secondary_verse JSON-array builders (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a "Verses" section with two identical builder sub-panels (Primary Verse / Secondary Verse) — each containing a book `<select>` (all 66 books from `data_schema.md`), chapter and verse number inputs, an "+ Add Verse" button that appends the entry to a visible JSON preview, and a remove button per entry; the final JSON array is stored in a hidden field serialised on save.
- **Vibe Rule(s):** Vanilla ES6+ · Semantic `<section>` grouping · All logic stays inside `window.renderEditRecord` · No inline scripts

- [ ] Task complete

---

### T5 — Add description and snippet JSON-paragraph editors (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace the two bare `<textarea>` placeholders in the "Text Content" section with labelled editors for `description` and `snippet` — each shows one `<textarea>` per paragraph entry, an "+ Add Paragraph" button to append a new textarea, and a remove button per paragraph; on load split the stored JSON array into individual textareas; on save serialize back to a JSON array.
- **Vibe Rule(s):** Vanilla ES6+ · Descriptive `id` hooks for JS targeting · Explicit readable logic

- [ ] Task complete

---

### T6 — Add Bibliography section with all six MLA sub-fields (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a "Bibliography" card containing six labelled `<textarea>` fields matching the sub-keys of the `bibliography` JSON blob: `mla_book`, `mla_book_inline`, `mla_article`, `mla_article_inline`, `mla_website`, `mla_website_inline`; on load parse the `bibliography` JSON blob and pre-fill each; on save re-serialize to the blob.
- **Vibe Rule(s):** Vanilla ES6+ · CSS Grid for 2-column layout · CSS variables for spacing/color

- [ ] Task complete

---

### T7 — Add Miscellaneous fields section (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Add a "Miscellaneous" card containing five labelled inputs for the remaining in-scope schema fields: `metadata_json` (textarea, JSON blob), `iaa` (text input), `pledius` (text input), `manuscript` (text input), and `url` (textarea, JSON blob); assign `id` attributes matching DB column names exactly and pre-fill from loaded record data; fields managed elsewhere in the dashboard (`responses`, `blogposts`, `news_sources`, `news_items`, `users`, `page_views`, `ordo_salutis`, all Rankings & Challenges fields, and all Context/Essay link fields) are intentionally omitted.
- **Vibe Rule(s):** Vanilla ES6+ · Descriptive `id` hooks per field · snake_case field names match DB columns exactly · Explicit readable logic

- [ ] Task complete

---

### T8 — Wire Save Changes and Discard buttons to the API (edit_record.js)

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Attach a click handler to "Save Changes" that collects all field values, serialises JSON fields, validates JSON-blob fields with `JSON.parse` showing an inline error if malformed, auto-generates `id` (UUID) and `created_at`/`updated_at` timestamps for new records, then fires `POST /api/admin/records` (create) or `PUT /api/admin/records/{recordId}` (update) with the JWT cookie and displays an inline success or error message; attach "Discard" to re-call `window.renderEditRecord(containerId, recordId)` to hard-reset the form.
- **Vibe Rule(s):** Vanilla ES6+ · Explicit readable logic · Stateless and safe to call repeatedly · No framework fetch wrappers

- [ ] Task complete

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
| `admin/frontend/dashboard_app.js` | 6.1 — Admin Portal | Yes | None — file already listed, no path changes |
| `admin/frontend/edit_modules/edit_record.js` | 6.1 — Admin Portal | Yes | None — file already listed, no path changes |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added; existing entries remain accurate |
| `documentation/simple_module_sitemap.md` | No | No change to module scope or high-level structure |
| `documentation/site_map.md` | No | No new files added; no need to re-run /sync_sitemap |
| `documentation/data_schema.md` | No | No new tables, columns, or relationships introduced |
| `documentation/vibe_coding_rules.md` | No | No ambiguous rules encountered requiring clarification |
| `documentation/style_mockup.html` | No | No new page layouts or significant visual changes introduced |
| `documentation/git_vps.md` | No | No deployment workflow or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update §2.2 to reflect the complete field list now rendered by `edit_record.js`: full enum selects, Verses builder, Bibliography card, Miscellaneous card, and wired Save/Discard action bar |
| `documentation/guides/guide_function.md` | Yes | Document the end-to-end CRUD logic flow: router cases in `dashboard_app.js` → `renderEditRecord` → API fetch on load → field population → Save button serialization and JSON validation → POST/PUT to `admin_api.py` |
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
