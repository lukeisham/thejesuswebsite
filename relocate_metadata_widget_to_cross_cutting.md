---
name: relocate_shared_widgets_to_cross_cutting
version: 1.5.0
module: 9.0 — Cross-Cutting
status: complete
created: 2026-05-12
---

# Plan: relocate_shared_widgets_to_cross_cutting

## Purpose

> Relocate six shared dashboard tools — the Metadata Widget (CSS + JS), MLA Widget (`mla_source_handler.js`), Unique Identifiers Widget (`external_refs_handler.js`), Context Links Widget (`context_link_handler.js`), and Picture Widget (`picture_handler.js`) — from their current location in the 2.0 Records module (`css/2.0_records/dashboard/` and `js/2.0_records/dashboard/`) to the 9.0 Cross-Cutting module (`css/9.0_cross_cutting/dashboard/` and `js/9.0_cross_cutting/dashboard/`), where the WYSIWYG shared tools already reside. This relocation follows the architecture laid out in `simple_module_sitemap.md` (§9.0):

```text
9.0 Cross-Cutting Standardization
├── 9.1 Unified WYSIWYG Editor CSS
├── 9.2 Unified WYSIWYG Dashboard Layout CSS
├── 9.3 Metadata Widget
├── 9.4 MLA Widget
├── 9.5 Unique Identifiers Widget
├── 9.6 Context Links Widget
└── 9.7 Picture Widget
```

> Three key documentation files receive targeted updates as part of this relocation:
>
> **`guide_function.md`** — A relocation note is added below the 2.0 Records Module ASCII overview diagram, listing all six shared-tool file names and stating they now live in `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`, loaded via `dashboard.html` and consumed by all dashboard editor modules.
>
> **`detailed_module_sitemap.md`** — All six files are removed from the 2.0 Records Dashboard CSS and JS file trees (including their `🔑 Shared Tool` annotations). A new 9.0 Cross-Cutting section is added with Dashboard CSS and Dashboard JS file trees listing the relocated files. The Shared-Tool Ownership Registry at the bottom of the sitemap is updated with new paths and the previously-missing `external_refs_handler.js` entry.
>
> **`guide_dashboard_appearance.md`** — The Shared Tool Ownership Reference table is updated: six relocated tools get new `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/` paths, ownership transfers to `plan_relocate_shared_widgets_to_cross_cutting`, the legacy `metadata_handler.js` row is removed, and the two WYSIWYG CSS paths are corrected from their stale `css/5.0_essays_responses/` references to `css/9.0_cross_cutting/dashboard/`. The Metadata Widget Placement Convention section gets a note referencing the new file path. The 9.0 Unified WYSIWYG Dashboard Layout section's ASCII diagram is annotated to indicate the sidebar widgets now live in 9.0.
>
> All other file references across the dashboard shell (`dashboard.html`), the records single orchestrator (`dashboard_records_single.js`), and the remaining documentation files are updated accordingly, including the shared-tool ownership registry in `vibe_coding_rules.md`.
---

## Styling Strategy

Each relocated widget gets its own dedicated CSS file in `css/9.0_cross_cutting/dashboard/`, extracted from the sections currently embedded in `css/2.0_records/dashboard/dashboard_records_single.css`. The WYSIWYG CSS (`wysiwyg_dashboard_layout.css` §5 and §6) is already in 9.0 and stays put. The Unique Identifiers Widget uses the shared `.form-field__input` class and does not need dedicated CSS.

| Widget | New CSS File | Extracted From | WYSIWYG Overlay |
|--------|-------------|----------------|-----------------|
| **Metadata** | `metadata_widget.css` (`.metadata-widget` BEM) | Already dedicated — relocated by T1 | — |
| **Picture** | `picture_widget.css` (`.picture-preview` BEM) | `dashboard_records_single.css` §5 + responsive §12 | — |
| **MLA** | `mla_widget.css` (`.bibliography-editor` BEM) | `dashboard_records_single.css` §9 | `wysiwyg_dashboard_layout.css` §5 (already in 9.0) |
| **Context Links** | `context_links_widget.css` (`.context-links-editor` BEM) | `dashboard_records_single.css` §10 | `wysiwyg_dashboard_layout.css` §6 (already in 9.0) |
| **Unique Identifiers** | *(none — uses `.form-field__input`)* | — | — |

After extraction, `dashboard_records_single.css` retains a comment pointing to the new 9.0 files for each removed section. The `guide_style.md` updates in T16 cover the documentation side: §19.2 rows are annotated with the new CSS file paths, and the §22 `.metadata-widget` BEM table’s introductory sentence reflects the new path.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **⚠️ REMINDER: After completing each task, mark its checkbox `[x]` to track progress.**
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Move `metadata_widget.css` to `css/9.0_cross_cutting/dashboard/`

- **File(s):** `css/2.0_records/dashboard/metadata_widget.css` → `css/9.0_cross_cutting/dashboard/metadata_widget.css`
- **Action:** Copy the file to the new location and update its header comment to reflect the new `File:` path (`css/9.0_cross_cutting/dashboard/metadata_widget.css`) and update the Owner line to reference the 9.0 Cross-Cutting module.
- **Vibe Rule(s):** CSS Variables Everything · User Comments · No frameworks

- [x] Task complete

---

### T2 — Move `metadata_widget.js` to `js/9.0_cross_cutting/dashboard/`

- **File(s):** `js/2.0_records/dashboard/metadata_widget.js` → `js/9.0_cross_cutting/dashboard/metadata_widget.js`
- **Action:** Create the `js/9.0_cross_cutting/dashboard/` directory if it does not exist, then copy the file to the new location. The three-line trigger/function/output header comment and the authoritative-copy note are already path-agnostic and do not need updating.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T3 — Move `mla_source_handler.js` to `js/9.0_cross_cutting/dashboard/` (MLA Widget — §9.4)

- **File(s):** `js/2.0_records/dashboard/mla_source_handler.js` → `js/9.0_cross_cutting/dashboard/mla_source_handler.js`
- **Action:** Copy the file to the new location. The three-line trigger/function/output header comment and the authoritative-copy note are already path-agnostic and do not need updating.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T4 — Move `external_refs_handler.js` to `js/9.0_cross_cutting/dashboard/` (Unique Identifiers Widget — §9.5)

- **File(s):** `js/2.0_records/dashboard/external_refs_handler.js` → `js/9.0_cross_cutting/dashboard/external_refs_handler.js`
- **Action:** Copy the file to the new location and update its header comment block to reflect the new `File:` path (`js/9.0_cross_cutting/dashboard/external_refs_handler.js`) and update the Owner line to reference the 9.0 Cross-Cutting module.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T5 — Move `context_link_handler.js` to `js/9.0_cross_cutting/dashboard/` (Context Links Widget — §9.6)

- **File(s):** `js/2.0_records/dashboard/context_link_handler.js` → `js/9.0_cross_cutting/dashboard/context_link_handler.js`
- **Action:** Copy the file to the new location. The three-line trigger/function/output header comment and the authoritative-copy note are already path-agnostic and do not need updating.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T6 — Move `picture_handler.js` to `js/9.0_cross_cutting/dashboard/` (Picture Widget — §9.7)

- **File(s):** `js/2.0_records/dashboard/picture_handler.js` → `js/9.0_cross_cutting/dashboard/picture_handler.js`
- **Action:** Copy the file to the new location and update its header comment block to reflect the new `File:` path (`js/9.0_cross_cutting/dashboard/picture_handler.js`) and update the Owner line to reference the 9.0 Cross-Cutting module.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T7 — Create `picture_widget.css` in `css/9.0_cross_cutting/dashboard/`

- **File(s):** NEW: `css/9.0_cross_cutting/dashboard/picture_widget.css`
- **Action:** Extract §5 (Picture Preview) and the responsive picture rules from §12 of `dashboard_records_single.css` into a new file. Use the standard header comment format with `File:`, `Version: 1.0.0`, `Owner: plan_relocate_shared_widgets_to_cross_cutting`, and `Purpose:` describing the `.picture-preview` BEM namespace. All colours, fonts, and spacing reference CSS variables from `typography.css`.
- **Vibe Rule(s):** CSS Variables Everything · User Comments · No frameworks

- [x] Task complete

---

### T8 — Create `mla_widget.css` in `css/9.0_cross_cutting/dashboard/`

- **File(s):** NEW: `css/9.0_cross_cutting/dashboard/mla_widget.css`
- **Action:** Extract §9 (MLA Bibliography Editor) from `dashboard_records_single.css` into a new file. Use the standard header comment format with `File:`, `Version: 1.0.0`, `Owner: plan_relocate_shared_widgets_to_cross_cutting`, and `Purpose:` describing the `.bibliography-editor` BEM namespace. Note in the header that WYSIWYG overlay styles live in `wysiwyg_dashboard_layout.css` §5 (already in 9.0).
- **Vibe Rule(s):** CSS Variables Everything · User Comments · No frameworks

- [x] Task complete

---

### T9 — Create `context_links_widget.css` in `css/9.0_cross_cutting/dashboard/`

- **File(s):** NEW: `css/9.0_cross_cutting/dashboard/context_links_widget.css`
- **Action:** Extract §10 (Context Links Editor) from `dashboard_records_single.css` into a new file. Use the standard header comment format with `File:`, `Version: 1.0.0`, `Owner: plan_relocate_shared_widgets_to_cross_cutting`, and `Purpose:` describing the `.context-links-editor` BEM namespace. Note in the header that WYSIWYG overlay styles live in `wysiwyg_dashboard_layout.css` §6 (already in 9.0).
- **Vibe Rule(s):** CSS Variables Everything · User Comments · No frameworks

- [x] Task complete

---

### T10 — Remove extracted sections from `dashboard_records_single.css`

- **File(s):** `css/2.0_records/dashboard/dashboard_records_single.css`
- **Action:** Remove §5 (Picture Preview), §9 (MLA Bibliography Editor), and §10 (Context Links Editor) in their entirety, including the section header comments. Remove the `.picture-preview-row` and `.picture-preview--thumb` rules from §12 (Responsive). In place of each removed section, add a single-line comment: `/* Moved to css/9.0_cross_cutting/dashboard/{name}_widget.css */`. Renumber the remaining sections consecutively. The Unique Identifiers Widget styles (`.form-field__input`) stay — they are shared form classes, not widget-specific.
- **Vibe Rule(s):** CSS Variables Everything · User Comments

- [x] Task complete

---

### T11 — Update `dashboard.html` script and link paths

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Update all shared-tool paths in the `<link>` and `<script>` tags within the "Shared Tools" section. Add three new `<link>` tags for the extracted widget CSS files:
  - `<link>` → `picture_widget.css`: `../../css/9.0_cross_cutting/dashboard/picture_widget.css`
  - `<link>` → `mla_widget.css`: `../../css/9.0_cross_cutting/dashboard/mla_widget.css`
  - `<link>` → `context_links_widget.css`: `../../css/9.0_cross_cutting/dashboard/context_links_widget.css`
  - `<link>` → `metadata_widget.css`: `../../css/9.0_cross_cutting/dashboard/metadata_widget.css?v=1.2.0`
  - `<script>` in the `<link>` and `<script>` tags within the "Shared Tools" section:
  - `<link>` → `metadata_widget.css`: `../../css/9.0_cross_cutting/dashboard/metadata_widget.css?v=1.2.0`
  - `<script>` → `picture_handler.js`: `../../js/9.0_cross_cutting/dashboard/picture_handler.js`
  - `<script>` → `mla_source_handler.js`: `../../js/9.0_cross_cutting/dashboard/mla_source_handler.js`
  - `<script>` → `context_link_handler.js`: `../../js/9.0_cross_cutting/dashboard/context_link_handler.js`
  - `<script>` → `external_refs_handler.js`: `../../js/9.0_cross_cutting/dashboard/external_refs_handler.js`
  - `<script>` → `metadata_widget.js`: `../../js/9.0_cross_cutting/dashboard/metadata_widget.js?v=1.2.0`
  - Update the HTML comment to reflect the 9.0 cross-cutting location. Bump cache-buster to `?v=1.2.0`.
- **Vibe Rule(s):** Semantic tags · No inline styles · No inline scripts · Descriptive id/class hooks

- [x] Task complete

---

### T12 — Update `dashboard_records_single.js` script dependency paths

- **File(s):** `js/2.0_records/dashboard/dashboard_records_single.js`
- **Action:** Update the `RECORDS_SINGLE_SCRIPTS` array entries to point to the new 9.0 paths:
  - `external_refs_handler.js`: `../../js/9.0_cross_cutting/dashboard/external_refs_handler.js`
  - `mla_source_handler.js`: `../../js/9.0_cross_cutting/dashboard/mla_source_handler.js`
  - `context_link_handler.js`: `../../js/9.0_cross_cutting/dashboard/context_link_handler.js`
  - `picture_handler.js`: `../../js/9.0_cross_cutting/dashboard/picture_handler.js`
  - `metadata_widget.js`: `../../js/9.0_cross_cutting/dashboard/metadata_widget.js`
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T13 — Update `detailed_module_sitemap.md` file trees and ownership

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** Remove all six files from the 2.0 Records Dashboard CSS and JS file trees (including their shared-tool annotations). Add them to the 9.0 Cross-Cutting section with Dashboard CSS and Dashboard JS file trees. Update the Shared-Tool Ownership Registry at the bottom of the sitemap to reflect the new paths.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [x] Task complete

---

### T14 — Update `site_map.md` master file tree

- **File(s):** `documentation/site_map.md`
- **Action:** Remove all six file entries from the `css/2.0_records/dashboard/` and `js/2.0_records/dashboard/` trees. Add them to `css/9.0_cross_cutting/dashboard/` and `js/9.0_cross_cutting/dashboard/` trees (creating the `js/9.0_cross_cutting/dashboard/` tree if needed). Bump the `version` in the YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [x] Task complete

---

### T15 — Update `vibe_coding_rules.md` §7 shared-tool ownership table

- **File(s):** `documentation/vibe_coding_rules.md`
- **Action:** Update the §7 Cross-Plan Shared-Tool Ownership table: move `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `metadata_widget.js`, and `metadata_widget.css` paths to `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`. Add `external_refs_handler.js` to the ownership table (currently missing — consumed as a shared tool but not listed in §7). Transfer ownership of all six relocated tools to `plan_relocate_shared_widgets_to_cross_cutting` (or `plan_standardize_dashboard_wysiwyg`). Retain only `snippet_generator.js` under `plan_dashboard_records_single` in 2.0. Bump the `version` in the YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [x] Task complete

---

### T16 — Update `guide_style.md` path references

- **File(s):** `documentation/guides/guide_style.md`
- **Action:** In §19.2 (Records Single Dashboard table), update four rows to note the JS now lives in 9.0: "Slug/Snippet/Metadata" (→ `js/9.0_cross_cutting/dashboard/metadata_widget.js`), "Picture Preview" (→ `js/9.0_cross_cutting/dashboard/picture_handler.js`), "Bibliography Editor" (→ `js/9.0_cross_cutting/dashboard/mla_source_handler.js`), and "Context Links" (→ `js/9.0_cross_cutting/dashboard/context_link_handler.js`). The CSS source for each row is noted in the Styling Strategy table above (each widget now has its own CSS file in `css/9.0_cross_cutting/dashboard/`). In §22 (Shared-Component Styling — `.metadata-widget` BEM Namespace), update the introductory sentence to note the file now resides in `css/9.0_cross_cutting/dashboard/`. Bump the `version` in the YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [x] Task complete

---

### T17 — Update `guide_function.md` with relocation note

- **File(s):** `documentation/guides/guide_function.md`
- **Action:** In the 2.0 Records Module overview diagram (lines ~91–125), add a note below the ASCII diagram indicating that the six shared dashboard tools (`metadata_widget.css`, `metadata_widget.js`, `mla_source_handler.js`, `external_refs_handler.js`, `context_link_handler.js`, `picture_handler.js`) have been relocated to the 9.0 Cross-Cutting module. The note should explain that these tools are loaded via `dashboard.html` and consumed by all dashboard editor modules. Bump the `version` in the YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [x] Task complete

---

### T18 — Update `guide_dashboard_appearance.md` shared-tool references and diagrams

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** (1) Update the Shared Tool Ownership Reference table (~L1473–1507): change six relocated tools' File Path column from `js/2.0_records/dashboard/` and `css/2.0_records/dashboard/` to `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`; change Owner Plan from `plan_dashboard_records_single` to `plan_relocate_shared_widgets_to_cross_cutting`; remove the legacy `metadata_handler.js` row (resolved per plan_issues.md #3); correct the two WYSIWYG CSS paths from stale `css/5.0_essays_responses/dashboard/` to `css/9.0_cross_cutting/dashboard/`; update the Consumer Plan table to note the relocated tools are now in 9.0. (2) In the Metadata Widget Placement Convention section (~L1507–1562), add a note above the ASCII diagrams: `> Source: css/9.0_cross_cutting/dashboard/metadata_widget.css and js/9.0_cross_cutting/dashboard/metadata_widget.js`. (3) In the 9.0 Unified WYSIWYG Dashboard Layout section's ASCII diagram (~L1668–1698), annotate the sidebar widgets (Metadata Widget, MLA Bibliography, Context Links, External References, Picture Upload) with `(9.0)` markers. Bump the `version` in the YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [x] Task complete

---

## Final Tasks

### T19 — Dashboard Widget Connectivity Audit

> Verify that every relocated widget is correctly wired into the dashboard modules that consume it. This audit ensures no broken references or missing containers.

#### dashboard.html (shell — loads all six widgets + three new CSS files)
- [x] `<link>` tag for `picture_widget.css` resolves (200 OK) from new 9.0 path
- [x] `<link>` tag for `mla_widget.css` resolves from new 9.0 path
- [x] `<link>` tag for `context_links_widget.css` resolves from new 9.0 path
- [x] `<link>` tag for `metadata_widget.css` resolves from new 9.0 path
- [x] `<script>` tag for `picture_handler.js` resolves from new 9.0 path
- [x] `<script>` tag for `mla_source_handler.js` resolves from new 9.0 path
- [x] `<script>` tag for `context_link_handler.js` resolves from new 9.0 path
- [x] `<script>` tag for `external_refs_handler.js` resolves from new 9.0 path
- [x] `<script>` tag for `metadata_widget.js` resolves from new 9.0 path

#### dashboard_records_single.js (2.0 — dynamic script loader)
- [x] `RECORDS_SINGLE_SCRIPTS` array updated: `external_refs_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `picture_handler.js`, `metadata_widget.js` all point to `../../js/9.0_cross_cutting/dashboard/`
- [x] Record editor loads without 404 errors for any relocated widget

#### WYSIWYG Modules (4.0, 5.0, 6.0 — use mla_source_handler + context_link_handler)
- [x] `dashboard_essay.html`: `#wysiwyg-bibliography-container` receives MLA widget; `#wysiwyg-context-links-container` receives context links widget
- [x] `dashboard_historiography.html`: same containers functional
- [x] `dashboard_blog_posts.html`: same containers functional
- [x] `dashboard_challenge_response.html`: same containers functional

#### Records Single (2.0 — uses all six widgets)
- [x] `dashboard_records_single.html`: `#bibliography-editor-container`, `#context-links-container`, and `#metadata-widget-container` all populated and styled correctly
- [x] Picture upload UI (`renderEditPicture`) renders and uploads without errors; picture preview styling intact from new `picture_widget.css`

#### Unique Identifiers Widget (used by all WYSIWYG modules + records single)
- [x] `external_refs_handler.js` renders iaa/pledius/manuscript fields in all five consumer dashboards
- [x] Values persist correctly on save/load across all modules

---

### T20 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file (or tightly-related group for a single widget/component)
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T21 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: All nine shared-tool files relocated or created in 9.0 Cross-Cutting: `metadata_widget.css`, `metadata_widget.js`, `mla_source_handler.js`, `external_refs_handler.js`, `context_link_handler.js`, `picture_handler.js`, `picture_widget.css`, `mla_widget.css`, `context_links_widget.css`
- [x] **Achievement**: All file references in `dashboard.html` point to the new 9.0 paths with updated cache-buster
- [x] **Achievement**: All file references in `dashboard_records_single.js` point to the new 9.0 paths
- [x] **Achievement**: The shared-tool ownership registry reflects the new file locations and includes `external_refs_handler.js`
- [x] **Achievement**: All ten affected documentation files have been updated with correct paths
- [x] **Achievement**: The `simple_module_sitemap.md` vision of 9.0 cross-cutting widgets (9.3–9.7) is now implemented on disk
- [x] **Achievement**: `guide_function.md` 2.0 section includes a relocation note pointing to 9.0
- [x] **Necessity**: The shared dashboard widgets now correctly reside in a single cross-cutting directory alongside the WYSIWYG tools
- [x] **Connectivity**: All six widgets load successfully from their new 9.0 paths in every consumer dashboard module — no 404s, no broken containers
- [x] **Targeted Impact**: Only the six shared-tool files and their references were touched — no behaviour or appearance was changed
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T22 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`, `guide_appearance.md`): Add or update ASCII box-drawing diagrams to reflect new component placement, sidebar layout changes, or work-area structure.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for any new data flow, JS lifecycle, or Python script introduced by this plan.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example in its own subsection, with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Remove all six relocated files from 2.0 Dashboard CSS and JS trees. Add all nine files to the 9.0 Cross-Cutting section: `metadata_widget.css`, `picture_widget.css`, `mla_widget.css`, `context_links_widget.css` in Dashboard CSS tree; `metadata_widget.js`, `mla_source_handler.js`, `external_refs_handler.js`, `context_link_handler.js`, `picture_handler.js` in Dashboard JS tree. Update the Shared-Tool Ownership Registry. Bump version. |
| `documentation/simple_module_sitemap.md` | No | The 9.0 subsection tree is already correct (9.3 Metadata, 9.4 MLA, 9.5 Unique Identifiers, 9.6 Context Links, 9.7 Picture) — confirmed from the file at L65-72. No update needed. |
| `documentation/site_map.md` | Yes | Move `metadata_widget.css` entry from `css/2.0_records/dashboard/` to `css/9.0_cross_cutting/dashboard/`. Add `picture_widget.css`, `mla_widget.css`, `context_links_widget.css` to `css/9.0_cross_cutting/dashboard/` tree. Move `metadata_widget.js`, `mla_source_handler.js`, `external_refs_handler.js`, `context_link_handler.js`, `picture_handler.js` from `js/2.0_records/dashboard/` tree to a new `js/9.0_cross_cutting/dashboard/` tree. Bump version. |
| `documentation/data_schema.md` | No | No database changes — this is a file relocation only. |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 Cross-Plan Shared-Tool Ownership table: add `picture_widget.css`, `mla_widget.css`, `context_links_widget.css` alongside the six relocated JS/CSS files at `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`. Add `external_refs_handler.js` (currently missing from §7). Transfer ownership of all nine tools to `plan_relocate_shared_widgets_to_cross_cutting`. Retain `snippet_generator.js` under `plan_dashboard_records_single` in 2.0. Bump version. |
| `documentation/style_mockup.html` | No | No page layout or visual change. |
| `documentation/git_vps.md` | No | No deployment, branching, or VPS config changes. |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or UI component changes — all six widgets are dashboard-only. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | (1) Shared Tool Ownership Reference table: update six relocated tools' paths to `js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`, transfer ownership to `plan_relocate_shared_widgets_to_cross_cutting`, remove legacy `metadata_handler.js` row, correct two WYSIWYG CSS paths from stale `css/5.0_essays_responses/` to `css/9.0_cross_cutting/dashboard/`. (2) Metadata Widget Placement Convention: add source path note. (3) 9.0 WYSIWYG Layout ASCII diagram: annotate sidebar widgets with `(9.0)` markers. Bump version. |
| `documentation/guides/guide_function.md` | Yes | Add a note below the 2.0 Records Module ASCII overview diagram stating that the six shared dashboard tools have been relocated to 9.0 Cross-Cutting. The note should list the six file names and explain they are loaded via `dashboard.html` and consumed by all dashboard editor modules. Bump version. |
| `documentation/guides/guide_security.md` | No | No auth, session, rate-limiting, or input validation changes. |
| `documentation/guides/guide_style.md` | Yes | In §19.2, update four rows to reference the new 9.0 JS and CSS paths: Slug/Snippet/Metadata, Picture Preview, Bibliography Editor, and Context Links. In §22, update the introductory sentence to note the file now resides in `css/9.0_cross_cutting/dashboard/`. Add new §22a, §22b, §22c subsections with BEM namespace tables for `.picture-preview`, `.bibliography-editor`, and `.context-links-editor` (each referencing their new widget CSS file). Bump version. |
| `documentation/guides/guide_maps.md` | No | No map display or data logic changes. |
| `documentation/guides/guide_timeline.md` | No | No timeline display or data logic changes. |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes. |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, robots.txt, or AI-accessibility changes. |
| `documentation/high_level_schema.md` | No | No schema changes — file relocation only. |

- [x] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` confirmed correct (no changes needed); `site_map.md` master tree updated and version bumped
- [x] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` Shared Tool Ownership table updated, Metadata Widget Placement Convention annotated, 9.0 WYSIWYG diagram widgets marked `(9.0)`; `guide_function.md` 2.0 section includes relocation note
- [x] **Style guide updated:** `guide_style.md` path references updated for all four widgets; new BEM namespace tables added for `.picture-preview`, `.bibliography-editor`, `.context-links-editor`
- [x] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated with all nine relocated/created tools at new paths and the previously-missing `external_refs_handler.js` entry
- [x] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [x] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
- [x] **Dashboard connectivity verified:** T14 audit checklist fully completed — all six widgets load and function correctly in every consumer module
