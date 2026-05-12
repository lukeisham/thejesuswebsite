---
name: redesign_cross_cutting_widgets_as_tables
version: 1.0.0
module: 9.0 — Cross-Cutting Standardization
status: complete
created: 2026-05-12
---

# Plan: Redesign Cross-Cutting Widgets as Tables

## Purpose

> Redesign the three shared dashboard widgets — MLA Bibliography (9.4), Unique Identifiers (9.5), and Context Links (9.6) — so they render as **five editable tables** on the admin dashboard (Books, Articles, Websites, Context Links, Unique Identifiers) while preserving their existing **three-list format** on the public frontend (combined MLA bibliography, context links list, unique identifiers list). This replaces the current card-based MLA editor, chip-based context links editor, and plain-text-input unique identifiers editor with a consistent tabular interface across all consuming dashboard modules (2.0 Records Single, 5.0 Essays & Historiography, 6.0 Blog Posts, 4.0 Challenge Response).

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Redesign MLA source handler as three per-type tables

- **File(s):** `js/9.0_cross_cutting/dashboard/mla_source_handler.js`
- **Action:** Replace the current card-based, type-toggled bibliography editor with three separate editable tables — Books, Articles, and Websites — each with its own column headers, data rows, inline "Add" button, and per-row "Remove" button. Preserve the existing public API (`window.renderEditBibliography`, `window.loadEditBibliography`, `window.collectEditBibliography`) so consumer modules break zero.
- **Vibe Rule(s):** 1 function/file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection for repeating UI elements

- [ ] Task complete

---

### T2 — Update MLA widget CSS for table layout

- **File(s):** `css/9.0_cross_cutting/dashboard/mla_widget.css`
- **Action:** Replace the `.bibliography-editor__entry` card-based layout with a BEM table layout using `.bibliography-editor__table`, `__thead`, `__tbody`, `__th`, `__td`, `__add-row`, and `__remove-btn` classes. Provide three identically styled table blocks with section subheadings (Books / Articles / Websites). All colours, fonts, and spacing must reference CSS variables from `typography.css`.
- **Vibe Rule(s):** Grid for macro layout · Flexbox for micro alignment · CSS variables · Section comments · No frameworks

- [ ] Task complete

---

### T3 — Redesign context link handler as a table

- **File(s):** `js/9.0_cross_cutting/dashboard/context_link_handler.js`
- **Action:** Replace the current chip-based UI (`.context-links-editor__chips`) with a single editable table containing columns for Slug, Type, and a per-row Remove button. Include an inline "add row" form at the bottom of the table with a Slug text input, Type select dropdown, and "Add" button. Preserve the existing public API (`window.renderEditLinks`, `window.collectEditLinks`).
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T4 — Update context links CSS for table layout

- **File(s):** `css/9.0_cross_cutting/dashboard/context_links_widget.css`
- **Action:** Replace the `.context-links-editor__inputs` + `__chips` chip layout with a BEM table layout using `.context-links-editor__table`, `__thead`, `__tbody`, `__th`, `__td`, `__add-row`, and `__remove-btn` classes. Style the inline add-form row with matching column widths. All colours, fonts, and spacing reference CSS variables from `typography.css`.
- **Vibe Rule(s):** Grid for macro layout · Flexbox for micro alignment · CSS variables · Section comments · No frameworks

- [ ] Task complete

---

### T5 — Redesign external refs handler as a table

- **File(s):** `js/9.0_cross_cutting/dashboard/external_refs_handler.js`
- **Action:** Replace the three plain text inputs (IAA, Pledius, Manuscript) with a single editable two-column table (Identifier Type | Value) with three pre-populated rows. Each Value cell is an inline-editable text input. Preserve the existing public API (`window.renderExternalRefs`, `window.setExternalRefValues`, `window.collectExternalRefs`).
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T6 — Create external refs widget CSS

- **File(s):** `css/9.0_cross_cutting/dashboard/external_refs_widget.css`
- **Action:** Create a new shared stylesheet for the unique identifiers table using a BEM namespace of `.external-refs-editor__table`, `__thead`, `__tbody`, `__th`, `__td`, and `__value-input`. All colours, fonts, and spacing reference CSS variables from `typography.css`. Follow the same pattern established by `mla_widget.css` and `context_links_widget.css`.
- **Vibe Rule(s):** Grid for macro layout · Flexbox for micro alignment · CSS variables · Section comments · No frameworks

- [ ] Task complete

---

### T7 — Register external_refs_widget.css in dashboard shell

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Add a `<link rel="stylesheet">` tag for `css/9.0_cross_cutting/dashboard/external_refs_widget.css` alongside the existing shared-widget CSS includes (after `context_links_widget.css`). Follow the same tag pattern with the version parameter.
- **Vibe Rule(s):** Semantic HTML5 · No inline styles

- [ ] Task complete

---

### T8 — Update unique identifiers frontend display to render as a list

- **File(s):** `js/2.0_records/frontend/single_view.js`, `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js`, `js/6.0_news_blog/frontend/display_blogpost.js`
- **Action:** Change the current inline metadata text rendering of unique identifiers (e.g. `"IAA: " + value`) into a formal `<ul>` list section with label–value pairs, matching the pattern used for context links and bibliography lists. This gives the frontend its third distinct list.
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

## Final Tasks

### T9 — Vibe-Coding Audit

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

### T10 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: Three shared dashboard widgets redesigned as five editable tables (Books, Articles, Websites, Context Links, Unique Identifiers)
- [ ] **Achievement**: Frontend displays three distinct lists (combined MLA bibliography, context links list, unique identifiers list)
- [ ] **Achievement**: All existing public APIs preserved — consumer dashboard modules (2.0 Records, 5.0 Essays, 6.0 Blog Posts, 4.0 Challenge Response) function without changes to their orchestration code
- [ ] **Symmetry**: All three table-based widgets follow identical styling patterns (same BEM structure, same CSS variable references, same add/remove interaction model)
- [ ] **Necessity**: The card-based MLA editor, chip-based context links editor, and plain-input unique identifiers editor have been fully replaced
- [ ] **Targeted Impact**: Only the six widget files (3 JS + 3 CSS) plus `dashboard.html` and the four frontend display files were modified
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T11 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add `css/9.0_cross_cutting/dashboard/external_refs_widget.css` to the 9.0 file tree. Update descriptions for the three modified JS files (`mla_source_handler.js`, `context_link_handler.js`, `external_refs_handler.js`) to reflect new table-based UI. Update Shared-Tool Ownership Registry if needed. |
| `documentation/simple_module_sitemap.md` | No | No module-scope change — all three widgets remain under 9.0. |
| `documentation/site_map.md` | Yes | Add `css/9.0_cross_cutting/dashboard/external_refs_widget.css` to the master file tree. Bump version. |
| `documentation/data_schema.md` | No | No schema changes — `bibliography`, `context_links`, `iaa`, `pledius`, and `manuscript` columns unchanged. |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 shared-tool ownership table: add `external_refs_widget.css` to the `plan_relocate_shared_widgets_to_cross_cutting` owner entry, and add it to all consumer module rows. |
| `documentation/style_mockup.html` | No | No new page layout — widgets are embedded in existing dashboard modules. |
| `documentation/git_vps.md` | No | No deployment or VPS changes. |
| `documentation/guides/guide_appearance.md` | Yes | Add a new subsection under "2.2 Single Record Deep-Dive" showing an ASCII layout diagram of the three new table widgets in the External References section. Update existing [BIBLIOGRAPHY] and [CONTEXT LINKS] placeholder blocks to reflect table structure. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update the ASCII layout diagram in §2.2 (Single Record Layout) to replace the current MLA card and context-links chip representations with five table blocks. Update the Shared Tool Ownership Reference table to add `external_refs_widget.css`. |
| `documentation/guides/guide_function.md` | No | No new pipelines or logic flows — existing public APIs and data flow unchanged. |
| `documentation/guides/guide_security.md` | No | No auth, session, rate-limiting, or input validation changes. |
| `documentation/guides/guide_style.md` | Yes | Add new BEM namespace tables for `.bibliography-editor__table`, `.context-links-editor__table`, and `.external-refs-editor__table` with their CSS variable references. |
| `documentation/guides/guide_maps.md` | No | No map display or data logic changes. |
| `documentation/guides/guide_timeline.md` | No | No timeline display or data logic changes. |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes. |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, or robots.txt changes. |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect the new `external_refs_widget.css`; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` §2.2 layout diagram replaced with five-table representation; `guide_appearance.md` updated with table-widget layout
- [ ] **Style guide updated:** `guide_style.md` includes new BEM namespace tables for all three table-based widgets
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated with `external_refs_widget.css`
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to card-based MLA, chip-based context links, or plain-input unique identifiers
