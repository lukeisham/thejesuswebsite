---
name: dashboard_record_column_two
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-01
---

# Plan: dashboard_record_column_two

## Purpose

Replace the static text-only index in the Single Record editor's Column 2 (`#canvas-col-list`) with an interactive scroll-spy section navigator. Each of the 8 section rows becomes a clickable button that smooth-scrolls Column 3 to the matching form section. An `IntersectionObserver` highlights the currently-visible section as the user scrolls, and the column uses sticky positioning to remain visible throughout. This implements the diagram's intent of Column 2 as a navigational index for Column 3.

---

## Tasks

### T1 — Create `edit_record_column_two.js`

- **File(s):** `js/2.0_records/dashboard/edit_record_column_two.js`
- **Action:** Create a new JS file that renders 8 clickable section-navigator buttons into `#canvas-col-list`, wires an `IntersectionObserver` to add/remove `.is-active` on the matching button as Column 3 sections scroll into view, and exposes `window.renderEditRecordColumnTwo()`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger, main function, output) · Vanilla ES6+ only · Component injection into a well-defined anchor

- [x] Task complete

### T2 — Edit `edit_record.js` — replace inline `listHtml` with column_two delegation

- **File(s):** `js/2.0_records/dashboard/edit_record.js`
- **Action:** Replace the static `listHtml` variable with a call to `window.renderEditRecordColumnTwo()` and wrap all bare `<div>` Column 3 slots (sections 1, 3, 6, 8 — currently `<div id="...-container">` without a section wrapper) in `<section>` tags with stable `id` attributes that match the Column 2 observation targets.
- **Vibe Rule(s):** 3-line header comment (update changelog) · Vanilla ES6+ · Component injection delegation

- [x] Task complete

### T3 — Edit `edit_records.css` — add column_two navigator styles

- **File(s):** `css/2.0_records/dashboard/edit_records.css`
- **Action:** Add CSS rules for `.record-column-two` (sticky positioning, padding, background), `.record-column-two-btn` (mono font, hover state, sharp corners), and `.record-column-two-btn.is-active` (accent highlight).
- **Vibe Rule(s):** CSS variables for colours, fonts, spacing · Section heading/subheading comments · No third-party frameworks

- [x] Task complete

### T4 — Edit `dashboard.html` — add script tag

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Add `<script src="../../js/2.0_records/dashboard/edit_record_column_two.js"></script>` immediately before the existing `edit_record.js` script tag.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline scripts · Descriptive load-order placement

- [x] Task complete

### T5 — Edit `guide_dashboard_appearance.md` — note interactive Column 2 behaviour

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Update the §2.2 Column 2 description to document click-to-scroll, `IntersectionObserver` scroll-spy, and sticky positioning. The ASCII diagram does not change.
- **Vibe Rule(s):** (documentation only)

- [x] Task complete

---

## Vibe-Coding Audit

### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks

### JavaScript
- [x] One function per file
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

### Python
- [x] N/A — no Python files touched

### SQL / Database
- [x] N/A — no SQL or database schema changes

### Purpose Check
- [x] Plan purpose stated in §Purpose has been fully achieved
- [x] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `js/2.0_records/dashboard/edit_record_column_two.js` | 2.0 — Records | No | Add entry |
| `js/2.0_records/dashboard/edit_record.js` | 2.0 — Records | Yes | None |
| `css/2.0_records/dashboard/edit_records.css` | 2.0 — Records | Yes | None |
| `admin/frontend/dashboard.html` | 7.0 — System | Yes | None |
| `documentation/guides/guide_dashboard_appearance.md` | 8.0 — Setup & Testing | Yes | None |

### Sitemap Integrity Checks
- [x] All new files listed under correct module in `detailed_module_sitemap.md`
- [x] No existing sitemap entries broken or made stale
- [ ] Run `/sync_sitemap` after adding new file
- [x] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

### Intra-Module Check — Module 2.0: Records

| File | Potentially Affected? | Reason |
|------|-----------------------|--------|
| `js/2.0_records/dashboard/edit_bibliography.js` | No | Observer watches the `<section>` wrapper id, not the child module's internal DOM. |
| `js/2.0_records/dashboard/edit_bulk_upload.js` | No | Separate dashboard tab. |
| `js/2.0_records/dashboard/edit_core.js` | No | Observer watches new outer `<section>` wrapper; child module's DOM unchanged. |
| `js/2.0_records/dashboard/edit_links.js` | No | Already inside `<section>` with stable id. |
| `js/2.0_records/dashboard/edit_lists.js` | No | Separate dashboard tab. |
| `js/2.0_records/dashboard/edit_misc.js` | No | Observer watches new outer `<section>` wrapper; child module's DOM unchanged. |
| `js/2.0_records/dashboard/edit_picture.js` | No | Already inside `<section id="picture-section">`. |
| `js/2.0_records/dashboard/edit_record_delete.js` | No | Actions column contract unchanged. |
| `js/2.0_records/dashboard/edit_record_discard.js` | No | Actions column contract unchanged. |
| `js/2.0_records/dashboard/edit_record_save.js` | No | Actions column + form DOM collection contract unchanged. |
| `js/2.0_records/dashboard/edit_record_view_live.js` | No | Actions column contract unchanged. |
| `js/2.0_records/dashboard/edit_taxonomy.js` | No | Observer watches new outer `<section>` wrapper; child module's DOM unchanged. |
| `js/2.0_records/frontend/*` (10 files) | No | Public-facing; no interaction with admin editor. |

### Cross-Module Check

| Module | Potentially Affected? | Reason |
|--------|-----------------------|--------|
| 1.0 — Foundation | No | No changes to foundation files. |
| 3.0 — Visualizations | No | Separate dashboard tab. |
| 4.0 — Ranked Lists | No | Separate dashboard tab. |
| 5.0 — Essays & Responses | No | Separate dashboard tab. |
| 6.0 — News & Blog | No | Separate dashboard tab. |
| 7.0 — System | Yes | One new `<script>` tag in `dashboard.html` (load order only). |
| 8.0 — Setup & Testing | No | No build scripts, tests, or tooling affected. |
| CSS System | No | Additive rules only; no existing selectors modified. |
| SQL Database | No | No schema changes. |
| Admin API | No | No endpoint, route, or auth changes. |
| MCP Server | No | Read-only API unaffected. |

### Module Impact Summary
- [x] Intra-module check completed — all 22 non-touched files reviewed
- [x] Cross-module check completed — all 11 connected modules/systems reviewed
- [x] Impact result: **Minimal — one cross-module change (dashboard.html script tag in Module 7.0); no intra-module functional impact.**

---

## Documentation Update

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add `edit_record_column_two.js` under Module 2.0; increment version. |
| `documentation/simple_module_sitemap.md` | No | No high-level structure change. |
| `documentation/site_map.md` | Yes | Run `/sync_sitemap`. |
| `documentation/data_schema.md` | No | No schema changes. |
| `documentation/vibe_coding_rules.md` | No | No rule ambiguity found. |
| `documentation/style_mockup.html` | No | Admin-only component. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | No public-facing change. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Document interactive Column 2 behaviours in §2.2. |
| `documentation/guides/guide_function.md` | Yes | Document scroll-spy logic flow. |
| `documentation/guides/guide_security.md` | No | No auth changes. |
| `documentation/guides/guide_style.md` | No | Styles follow existing conventions. |
| `documentation/guides/guide_maps.md` | No | No map changes. |
| `documentation/guides/guide_timeline.md` | No | No timeline changes. |
| `documentation/guides/guide_donations.md` | No | No donation changes. |
| `documentation/guides/guide_welcoming_robots.md` | No | Admin not crawled. |

### Documentation Checklist
- [x] All affected documents identified
- [x] Each "Yes" row updated with accurate information
- [x] No stale references remain
- [x] Version numbers incremented where applicable
