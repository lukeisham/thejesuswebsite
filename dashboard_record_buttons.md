---
name: dashboard_record_buttons
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-01
---

# Plan: dashboard_record_buttons

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Refactor the four action buttons in the Single Record editor's first Providence column (`#canvas-col-actions`) into independent, self-contained JavaScript modules. Each button — Save Changes, Discard, Delete, and View Live — gets its own JS file following the "1 function per file" vibe-coding rule, with a clean three-line header comment (trigger, function, output). The orchestrator `edit_record.js` delegates rendering to these new sub-modules, which inject their buttons neatly at the top of Column 1. This improves modularity, readability, and maintainability while preserving all existing functionality. A new CSS rule in `edit_records.css` provides a clean button-group container with consistent spacing.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Create `edit_record_save.js`

- **File(s):** `js/2.0_records/dashboard/edit_record_save.js`
- **Action:** Create a new self-contained JS module that renders the [Save Changes] button into `#canvas-col-actions` and wires the full save logic (collect from sub-modules via `window.collectEdit*` APIs, validate JSON fields, generate ULID on create, set timestamps, POST/PUT to `/api/admin/records`, and show status feedback in `#save-status`).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger / function / output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T2 — Create `edit_record_discard.js`

- **File(s):** `js/2.0_records/dashboard/edit_record_discard.js`
- **Action:** Create a new self-contained JS module that renders the [Discard] button into `#canvas-col-actions` and wires the hard-reset handler (re-calls `window.renderEditRecord` with the same containerId, recordId, and useProvidenceColumns arguments passed in from the orchestrator).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger / function / output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T3 — Create `edit_record_delete.js`

- **File(s):** `js/2.0_records/dashboard/edit_record_delete.js`
- **Action:** Create a new self-contained JS module that renders the [Delete] button into `#canvas-col-actions` only when a `recordId` is provided, and wires the DELETE API call (`fetch DELETE /api/admin/records/:id` with confirmation dialog and navigation back to the All Records list on success).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger / function / output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T4 — Create `edit_record_view_live.js`

- **File(s):** `js/2.0_records/dashboard/edit_record_view_live.js`
- **Action:** Create a new self-contained JS module that renders the [View Live] button into `#canvas-col-actions` only when a `recordId` is provided, and wires opening the public record page (`window.location.origin + "/" + slug`) in a new tab using `window.open`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger / function / output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T5 — Edit `edit_record.js` (Orchestrator — Actions Section)

- **File(s):** `js/2.0_records/dashboard/edit_record.js`
- **Action:** Replace the inline `actionsHtml` string and all four inline `addEventListener` blocks (Save, Discard, Delete, View Live) with delegation calls to the four new sub-modules. In the Providence branch, call `window.renderEditRecordSave()`, `window.renderEditRecordDiscard()`, `window.renderEditRecordDelete(recordId)`, and `window.renderEditRecordViewLive(recordId)`. Keep the inline status `<div id="save-status">` rendering in the orchestrator. In the legacy (non-Providence) branch, maintain backward compatibility by injecting the buttons into a deduplicated actions block.
- **Vibe Rule(s):** Vanilla ES6+ · Component injection · Descriptive `id` hooks for JS

- [ ] Task complete

---

### T6 — Edit `dashboard.html` (Script Tags)

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Add four new `<script>` tags for the new JS files in the Admin Edit Module Scripts block. Place them immediately after the existing `edit_record.js` script tag and before `edit_bulk_upload.js`, maintaining alphabetical/functional load order: `edit_record_save.js`, `edit_record_discard.js`, `edit_record_delete.js`, `edit_record_view_live.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline scripts

- [ ] Task complete

---

### T7 — Edit `edit_records.css` (Button Group Container)

- **File(s):** `css/2.0_records/dashboard/edit_records.css`
- **Action:** Add a new CSS rule for a `.record-actions-group` container class to wrap the action buttons. Use Flexbox (column direction), consistent vertical gap (`var(--space-2)`), and ensure each button inherits the existing `blog-editor-action-btn` class. Add a top-level section comment header for the new rule block under the existing "3. EDIT RECORD — CORE IDENTIFIERS & ACTION BAR" section.
- **Vibe Rule(s):** Flexbox for micro alignment · CSS variables for spacing · Section headings and subheadings as comments · No third-party frameworks

- [ ] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup (only `<script>` tags touched in `dashboard.html`)
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment (`.record-actions-group` uses column flexbox)
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [ ] One function per file (4 new files, each with exactly one exported function)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern (buttons injected into `#canvas-col-actions`)

### Python
- [ ] N/A — no Python files touched

### SQL / Database
- [ ] N/A — no SQL or database schema changes

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `js/2.0_records/dashboard/edit_record_save.js` | 2.0 — Records | No | Add entry under 2.0 Records JS files |
| `js/2.0_records/dashboard/edit_record_discard.js` | 2.0 — Records | No | Add entry under 2.0 Records JS files |
| `js/2.0_records/dashboard/edit_record_delete.js` | 2.0 — Records | No | Add entry under 2.0 Records JS files |
| `js/2.0_records/dashboard/edit_record_view_live.js` | 2.0 — Records | No | Add entry under 2.0 Records JS files |
| `js/2.0_records/dashboard/edit_record.js` | 2.0 — Records | Yes | Update entry to note delegation to sub-modules |
| `admin/frontend/dashboard.html` | 7.0 — System | Yes | None (script tags are a normal operational update) |
| `css/2.0_records/dashboard/edit_records.css` | 2.0 — Records | Yes | None (new rule is within existing file scope) |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 2.0: Records

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `js/2.0_records/dashboard/edit_core.js` | No | No impact identified — sub-module exposes `window.collectEditCore()` API, which the new `edit_record_save.js` consumes the same way the orchestrator did. |
| `js/2.0_records/dashboard/edit_taxonomy.js` | No | No impact identified — `window.collectEditTaxonomy()` API unchanged. |
| `js/2.0_records/dashboard/edit_bibliography.js` | No | No impact identified — `window.collectEditBibliography()` API unchanged. |
| `js/2.0_records/dashboard/edit_misc.js` | No | No impact identified — `window.collectEditMisc()` API unchanged. |
| `js/2.0_records/dashboard/edit_picture.js` | No | No impact identified — `window.renderEditPicture()` API unchanged, still called from orchestrator. |
| `js/2.0_records/dashboard/edit_links.js` | No | No impact identified — `window.renderEditLinks()` API unchanged, still called from orchestrator. |
| `js/2.0_records/dashboard/edit_lists.js` | No | No impact identified — separate dashboard module (Ordinary Lists), no shared state. |
| `js/2.0_records/dashboard/edit_bulk_upload.js` | No | No impact identified — separate dashboard module (Bulk CSV), no shared state. |
| `css/2.0_records/dashboard/edit_records.css` | No | New `.record-actions-group` rule is additive and does not change any existing selector. Existing classes (`.blog-editor-action-btn`, `.btn-discard-record`, `.btn-view-live-record`, `.btn-delete-record`) remain untouched. |
| `css/2.0_records/dashboard/` (other CSS files) | No | No impact identified — no other 2.0 Records CSS files are modified. |
| `frontend/pages/records.html` | No | No impact identified — public-facing display page, unaffected by admin JS refactor. |
| `frontend/pages/record.html` | No | No impact identified — public-facing display page. |
| `database/database.sql` | No | No impact identified — no schema changes. |
| `database/database.sqlite` | No | No impact identified — no schema changes. |
| `backend/scripts/helper_api.py` | No | No impact identified — API helper unchanged. |
| `frontend/pages/resources/` (all 13 pages) | No | No impact identified — public resource list pages unaffected. |

### Cross-Module Check

> Modules that are architecturally connected to Module 2.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation | No | No impact identified — Foundation handles public-facing shell CSS/JS; admin dashboard is a separate concern. |
| 3.0 — Visualizations | No | No impact identified — visualization editors (`edit_diagram.js`) are separate modules with no shared action-button logic. |
| 4.0 — Ranked Lists | No | No impact identified — ranked-list editors (`edit_wiki_weights.js`, etc.) have their own action-button patterns. |
| 5.0 — Essays & Responses | No | No impact identified — essay/response editors are separate modules. |
| 6.0 — News & Blog | Yes | **Low-impact, informational only.** The `blog-editor-action-btn` CSS class used by the buttons is defined in `css/6.0_news_blog/dashboard/edit_blog.css`. The four new JS modules will reference this same class — no CSS file in Module 6.0 is modified. Existing `.blog-editor-action-btn` class rules remain unchanged. The `edit_blogpost.js` module also uses this class but is not functionally affected. |
| 7.0 — System | Yes | **Low-impact, orchestration only.** `dashboard_app.js` (Module 7.0) calls `window.renderEditRecord()` which is the entry point for this plan's affected code. The orchestrator signature (`containerId, recordId, useProvidenceColumns`) does not change. `dashboard_app.js` already clears and repopulates `#canvas-col-actions` via `_clearColumnContent()` + `_setColumn()`, so the new sub-modules' injection pattern is compatible. `dashboard.html` receives 4 new `<script>` tags. |
| 8.0 — Setup & Testing | No | No impact identified — no build scripts, seeders, or test suites are affected. |
| CSS System (cross-cutting) | No | No impact identified — the new `.record-actions-group` class is added to `edit_records.css` and uses existing CSS variables. No global CSS file is modified. |
| SQL Database (cross-cutting) | No | No impact identified — no schema, query, or API contract changes. |
| Admin API (cross-cutting) | No | No impact identified — the same `/api/admin/records` endpoints are called with the same payload shape. |
| MCP Server (cross-cutting) | No | No impact identified — read-only external API unaffected. |

### Module Impact Summary
- [ ] Intra-module check completed — all other files in Module 2.0 reviewed (16 files checked)
- [ ] Cross-module check completed — all architecturally connected modules reviewed (9 modules + 4 cross-cutting systems)
- [ ] Impact result: **Minimal — two modules (6.0 News & Blog, 7.0 System) have low-impact informational/orchestration awareness. No breaking changes to any module.**

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add four new JS file entries (`edit_record_save.js`, `edit_record_discard.js`, `edit_record_delete.js`, `edit_record_view_live.js`) under Module 2.0 — Records JS files. Update `edit_record.js` entry to reflect orchestrator role. |
| `documentation/simple_module_sitemap.md` | No | No impact identified — module scope does not change at the high level. |
| `documentation/site_map.md` | Yes | Run `/sync_sitemap` after plan completion to capture the four new JS files. |
| `documentation/data_schema.md` | No | No impact identified — no database schema, table, column, or relationship changes. |
| `documentation/vibe_coding_rules.md` | No | No impact identified — no rule ambiguities encountered; existing rules were sufficient. |
| `documentation/style_mockup.html` | No | No impact identified — no new public-facing page layout or significant visual change. |
| `documentation/git_vps.md` | No | No impact identified — no deployment, branching, or VPS configuration changes. |
| `documentation/guides/guide_appearance.md` | No | No impact identified — no new public-facing page or UI component. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update the ASCII diagram in §2.2 to reflect the modularized button structure. The four buttons in Column 1 remain visually the same but should note the delegation pattern. No layout change. |
| `documentation/guides/guide_function.md` | Yes | Document the new delegation pattern: how the orchestrator (`edit_record.js`) delegates action-button rendering and wiring to four independent sub-modules, each following the 1-function-per-file pattern. Describe the `window.renderEditRecordSave/Discard/Delete/ViewLive` API surface. |
| `documentation/guides/guide_security.md` | No | No impact identified — no auth, session, rate-limiting, or input validation changes. The same API endpoints and auth mechanisms are used. |
| `documentation/guides/guide_style.md` | No | No impact identified — the new `.record-actions-group` CSS class follows existing conventions and uses existing CSS variables. |
| `documentation/guides/guide_maps.md` | No | No impact identified — no map display or data logic changes. |
| `documentation/guides/guide_timeline.md` | No | No impact identified — no timeline display or data logic changes. |
| `documentation/guides/guide_donations.md` | No | No impact identified — no external support integration or donation flow changes. |
| `documentation/guides/guide_welcoming_robots.md` | No | No impact identified — no SEO, robots.txt, sitemap.xml, or AI-accessibility changes (admin dashboard is not crawled). |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
