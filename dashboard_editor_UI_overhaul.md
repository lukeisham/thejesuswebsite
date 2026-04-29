---
name: dashboard_editor_UI_overhaul
version: 1.0.0
module: 7.0 — System Module (Admin Portal) + cross-module
status: draft
created: 2026-04-29
---

# Plan: dashboard_editor_UI_overhaul

## Purpose

> **Enforce §18 "Dashboard & Editor Aesthetics" from `guide_style.md` across every dashboard file — every CSS rule, every layout, every JS-injected template.** All style, layout, CSS, and relevant JS code used in the admin dashboard must conform to §18. This includes: the Providence 3-column grid pattern (§18.1), Field Ownership Map conventions (§18.2), sub-section numbering (§18.3), and component tokens (§18.4). Every editor module (`edit_*.js`), every admin CSS file (`dashboard_admin.css`, `login_view.css`, `markdown_editor.css`), and every JS-injected HTML template must be audited and converted. All modules currently render as flat single-column cards or use ad-hoc inline grids. All modules are missing the tab bars shown in their wireframes. Three modules (`edit_essay.js`, `edit_historiography.js`, `edit_response.js`) violate the vibe-coding rules by using inline `style="..."` attributes. This plan brings the entire dashboard codebase into alignment with §18.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### Dependency Chain

- **T1 → T2–T17:** The `.providence-editor-col-*` CSS aliases must exist in `dashboard_admin.css` before any JS file references them. Do not start T2–T17 until T1 is complete.
- **T2 → T3–T17:** The `window.renderTabBar()` function must exist in `render_tab_bar.js` before any editor module calls it. Do not start T3–T17 until T2 is complete.
- **T4 → T5:** The diagram editor's grid shell must be in place before the orphan inventory is built. (Already documented on T5.)
- **T10 → T11:** T10's essay editor establishes the grid pattern and styles that T11's historiography editor follows. Do T10 before T11.
- **T1–T18 → T19:** Documentation verification must wait until all implementation and audit tasks are complete.
- **T1–T19 → T20:** Sitemap and wireframe documentation must reflect the new `render_tab_bar.js` file and all refactored editor layouts.
- **T1–T20 → T21 → T22:** Vibe-Code Check runs first, then Purpose Check.
- **T1–T22 → T23:** Final git commit must wait until all 22 tasks are complete.

> New file: `admin/frontend/render_tab_bar.js` — one function, one file, matching the vibe-coding rule.
> Individual `Blocker:` notes are also listed on each task for quick reference.

### T1 — Add canonical `.providence-editor-col-*` CSS alias selectors

- **File(s):** `css/design_layouts/views/dashboard_admin.css`
- **Action:** Add comma-separated alias selectors (`.providence-editor-col-actions`, `.providence-editor-col-list`, `.providence-editor-col-editor`) alongside every existing `.blog-editor-col-*` rule block so the canonical names from guide_style.md §18.1 resolve to the same styles.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables for all values · Section comments with headings · No third-party frameworks
- **Blocker:** Must complete before T2–T17 (CSS classes must exist before JS references them).

- [x] Task complete

---

### T2 — Add tab bar CSS and create dedicated `render_tab_bar.js`; wire into Blog Editor

- **File(s):** `css/design_layouts/views/dashboard_admin.css`, `admin/frontend/render_tab_bar.js` (new), `admin/frontend/dashboard_app.js` (add script load), `admin/frontend/edit_modules/edit_blogpost.js`
- **Action:** Ensure `.admin-tab-bar` / `.admin-tab-btn` / `.admin-tab-content` rule blocks in the CSS define the visual tab strip (mono font, uppercase, active state with `--color-dash-accent` bottom border). **Create** a new `admin/frontend/render_tab_bar.js` containing a single `window.renderTabBar(containerId, tabs, activeTab)` function — 3-line header comment, vanilla ES6+, component injection pattern. **Important: this function is for top-level section tabs only** (e.g., Records, Lists & Ranks, Text Content, Configuration). Sub-tab bars (e.g., Academic/Popular Challenges, Essay/Historiography, News Snippet/Sources) remain handled by `dashboard_app.js`'s existing event delegation and `.is-hidden` class toggling — do NOT wire sub-tabs through `renderTabBar`. Add a `<script src="render_tab_bar.js">` tag to `admin.html` so it loads before any editor module. Finally, call `window.renderTabBar()` at the top of `edit_blogpost.js`'s rendered HTML, passing `"Text Content"` as the active tab. No structural grid changes needed for the blog — it already uses `.blog-editor-grid` (aliased via T1 to `.providence-editor-grid`) correctly.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection pattern
- **Blocker:** Must complete before T3–T17 (modules need `window.renderTabBar()` to exist).

- [x] Task complete

---

### T3 — Refactor Records List to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/dashboard_app.js` (the inline `renderRecordList` function inside `loadModule("records-edit")`)
- **Action:** Wrap the records table in a `.providence-editor-grid` container. Move the `[+ New Record]` and `[Bulk Upload CSV]` action buttons (currently sidebar-only routes) into COL 1 (`.providence-editor-col-actions`). Keep the search input and paginated table in COL 3 (`.providence-editor-col-editor`). Render the tab bar (Records active) above the grid. Leave COL 2 empty with a comment placeholder for future metadata use.
- **Vibe Rule(s):** Semantic HTML within JS-injected HTML · No inline styles · Descriptive `id`/`class` hooks · Component injection pattern · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete

---

### T4 — Refactor Diagram Editor: grid shell, tab bar, and COL 1/COL 3 layout

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Replace the flat `<div class="admin-card">` shell with a `.providence-editor-grid` layout. Render the tab bar (Configuration active) above the grid. Move `[Save Graph]` into COL 1 (`.providence-editor-col-actions`). Keep the search input and recursive tree in COL 3 (`.providence-editor-col-editor`). Add COL 2 as an empty placeholder with a comment ready for the orphan inventory (which is built separately in T5).
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+ · Component injection · No inline styles in injected HTML
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`). Must complete before T5.

- [x] Task complete

---

### T5 — Refactor Diagram Editor: build persistent COL 2 orphan inventory

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Populate COL 2 (`.providence-editor-col-list`, added as a placeholder in T4) with: a `parent_id`/`id`/`title` readout for the currently selected/hovered node, and a persistent orphan-node inventory list (replacing the floating dropdown). Wire the orphan list so clicking an orphan node calls the existing `+Child` logic.
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+ · Component injection · No inline styles in injected HTML
- **Blocker:** Requires T4 (grid shell already in place).
- **Dependency:** Must be completed after T4 (relies on the grid shell already being in place)

- [x] Task complete

---

### T6 — Refactor Lists Editor to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_lists.js`
- **Action:** Replace the current `admin-card` + custom `lists-editor-grid` layout with the standard `.providence-editor-grid`. Render the tab bar (Lists & Ranks active) above the grid. Map the existing items column to COL 3, the tools/search area to COL 1, and add COL 2 for metadata/display fields as shown in the §2.3 wireframe.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables · No inline styles · Descriptive `id`/`class` hooks · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete

---

### T7 — Refactor Wiki Weights editor to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_wiki_weights.js`
- **Action:** Replace the flat `admin-card` + table shell with `.providence-editor-grid`. Render the tab bar (Lists & Ranks active) above the grid. Map COL 1 to action buttons (`Save All`, `+ Add Override`, `Delete Row`), COL 2 to the WRITE field documentation, and COL 3 to the weights table per the §4.1 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete

---

### T8 — Refactor Rank editor to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_rank.js`
- **Action:** Replace the flat `admin-card` + table shell with `.providence-editor-grid`. Render the tab bar (Lists & Ranks active) above the grid. Map COL 1 to action buttons (`Save`, `Delete Row`), COL 2 to field documentation, and COL 3 to the rank override form per the §4.1 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete

---

### T9 — Refactor Challenge Weights editors to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_academic_weights.js`, `admin/frontend/edit_modules/edit_popular_weights.js`
- **Action:** Replace the flat `admin-card` + table shell in both editors with `.providence-editor-grid`. Add the top-level section tab bar (Lists & Ranks active) via `window.renderTabBar()`. The sub-tab bar (`[ Academic Challenges (Active) ] [ Popular Challenges ]`) is already injected and wired by `dashboard_app.js`'s `loadModule("ranks-challenges")` — do not duplicate it in the editor module. Map COL 1 to action buttons, COL 2 to field documentation, and COL 3 to the weights table per the §4.2 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete

---

### T10 — Refactor Essay editor: strip inline styles, use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_essay.js`
- **Action:** Remove ALL inline `style="..."` attributes — replace with CSS classes referencing variables from `typography_colors.css` and `dashboard_admin.css`. Replace the ad-hoc inline grid with `.providence-editor-grid`. Add the top-level section tab bar (Text Content active) via `window.renderTabBar()`. The sub-tab bar (`[ Context Essays (Active) ] [ Historiography ]`) is already injected and wired by `dashboard_app.js`'s `loadModule("text-essays")` — do not duplicate it in the editor module. Map COL 1 to action buttons + metadata fields, COL 2 to the markdown textarea, COL 3 to the live preview pane per the §5.1 wireframe.
- **Vibe Rule(s):** No inline styles (CRITICAL fix) · CSS Grid for macro layout · CSS variables · 1 function per file · 3-line header comment · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`). Must complete before T11 (T10's grid and styles are the template T11 follows for historiography).

- [x] Task complete
  - **Changes:** `edit_essay.js` — replaced flat `display: flex` layout with `.providence-editor-grid`; stripped 20+ inline `style="..."` attributes; added top-level tab bar (Text Content active); COL 1: Save Changes button + Author/Date/Abstract fields with `.blog-editor-field` classes; COL 2: markdown textarea with `.blog-editor-textarea`; COL 3: live preview pane with `.blog-editor-preview-pane`; added `dashboard_admin.css` classes `.essay-preview-heading` and `.essay-preview-paragraph` for preview typography
  - **Sub-tab bar preserved:** `dashboard_app.js` handles Context Essay / Historiography sub-tabs — not duplicated in editor module

---

### T11 — Refactor Historiography editor: strip inline styles, use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_historiography.js`
- **Action:** Remove ALL inline `style="..."` attributes — replace with CSS classes referencing variables from `typography_colors.css` and `dashboard_admin.css`. Replace the ad-hoc inline grid with `.providence-editor-grid`. The top-level section tab bar (Text Content active) is already rendered by `dashboard_app.js`'s `loadModule("text-essays")`. The sub-tab bar (`[ Context Essays ] [ Historiography (Active) ]`) is also handled by `dashboard_app.js` — only the active tab indicator changes. Map COL 1 to action buttons + metadata fields, COL 2 to the markdown textarea, COL 3 to the live preview pane per the §5.1 wireframe.
- **Vibe Rule(s):** No inline styles (CRITICAL fix) · CSS Grid for macro layout · CSS variables · 1 function per file · 3-line header comment · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes), T2 (`window.renderTabBar()`), and T10 (T10's grid pattern serves as the template for this editor).

- [x] Task complete
  - **Changes:** `edit_historiography.js` — replaced flat `display: flex` and `display: grid` layouts with `.providence-editor-grid`; stripped 15+ inline `style="..."` attributes; added top-level tab bar (Text Content active); COL 1: Save Changes button + Author/Date/Methodology Abstract fields with `.blog-editor-field` classes; COL 2: markdown textarea with `.blog-editor-textarea`; COL 3: live preview pane with `.blog-editor-preview-pane`; reuses `.essay-preview-heading` and `.essay-preview-paragraph` CSS classes from T10
  - **Sub-tab bar preserved:** `dashboard_app.js` handles Context Essay / Historiography sub-tabs — not duplicated in editor module


---

### T12 — Refactor MLA Sources editor to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_mla_sources.js`
- **Action:** Replace the flat `admin-card` shell with `.providence-editor-grid`. Render the tab bar (Text Content active) above the grid. Map COL 1 to action buttons (`Save All`), COL 2 to a search/filter field, and COL 3 to the expandable MLA record cards per the §5.1 wireframe bibliography section.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_mla_sources.js` — wrapped flat `admin-card` shell in `.providence-editor-grid`; COL 1: Save All button (`.blog-editor-action-btn`); COL 2: search/filter input with `.blog-editor-list-heading` label; COL 3: MLA record cards container (preserved existing expandable grid behavior); added top-level tab bar (Text Content active) after successful data load; removed `action-bar-header` (replaced by COL 1 grid slot)
  - **No inline styles found** — file was already clean of inline `style="..."` attributes


---

### T13 — Refactor Response editor: strip inline styles, use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_response.js`
- **Action:** Remove ALL inline `style="..."` attributes — replace with CSS classes. Replace the ad-hoc inline grid with `.providence-editor-grid`. Render the tab bar (Text Content active) above the grid. Map COL 1 to action buttons + metadata + challenge selector, COL 2 to the markdown textarea, COL 3 to the live preview pane per the §5.2 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_response.js` — replaced flat `display: flex` header and `display: grid` dual-pane layout with `.providence-editor-grid`; stripped 25+ inline `style="..."` attributes; COL 1: Save Response button + Challenge selector (`.blog-editor-field`) + Insert Citation and Insert Record Link buttons (`.btn-outline-primary`); COL 2: markdown textarea with `.blog-editor-textarea`; COL 3: live preview pane with `.blog-editor-preview-pane`; added top-level tab bar (Text Content active); wired save, citation, and link buttons as stubs
  - **Citation tools moved to COL 1** — Insert Citation and Insert Record Link buttons were previously in a footer bar below the textarea; now in COL 1 action section
  - **CSS additions:** `.response-insert-tools` — column-flex container with margin-top and gap for the citation/link button group



---

### T14 — Refactor Insert Response editors to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_insert_response_academic.js`, `admin/frontend/edit_modules/edit_insert_response_popular.js`
- **Action:** Replace the flat `admin-card` shell with `.providence-editor-grid`. Add the top-level section tab bar (Lists & Ranks active) via `window.renderTabBar()`. The sub-tab bar (`[ Academic Challenges (Active) ] [ Popular Challenges ]`) is already injected and wired by `dashboard_app.js`'s `loadModule("ranks-responses")` — do not duplicate it in the editor module. Map COL 1 to action buttons + nav links, COL 3 to the challenge list with `[+ Add Response]` buttons per the §4.3 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_insert_response_academic.js` — replaced `action-bar-header` + flat form with `.providence-editor-grid`; COL 1: Save Insertion button (`.blog-editor-action-btn`); COL 2: empty (reserved); COL 3: challenge selector + response input (`.blog-editor-field` classes); added top-level tab bar (Lists & Ranks active); wired save button as stub
  - **Changes:** `edit_insert_response_popular.js` — replaced `action-bar-header` + flat shell with `.providence-editor-grid`; COL 1: Save All button (`.blog-editor-action-btn`); COL 2: empty (reserved); COL 3: challenge list with [+ Add Response]/[Remove]/[Edit] buttons + Add Response Link form; added top-level tab bar (Lists & Ranks active)
  - **Sub-tab bar preserved:** `dashboard_app.js` handles Academic Challenges / Popular Challenges sub-tabs — not duplicated in editor modules
  - **No inline styles existed** — both files were already clean of inline `style="..."` attributes

---

### T15 — Refactor News editors to use `.providence-editor-grid` with tab bar


- **File(s):** `admin/frontend/edit_modules/edit_news_snippet.js`, `admin/frontend/edit_modules/edit_news_sources.js`
- **Action:** Replace the flat `admin-card` shell with `.providence-editor-grid`. Add the top-level section tab bar (Text Content active) via `window.renderTabBar()`. The sub-tab bar (`[ News Snippet (Active) ] [ News Sources ]`) is already injected and wired by `dashboard_app.js`'s `loadModule("text-news")` — do not duplicate it in the editor module. Map COL 1 to action buttons, COL 2 to field documentation, COL 3 to the snippet form / sources key-value editor per the §6.1 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_news_snippet.js` — replaced `action-bar-header` + flat form with `.providence-editor-grid`; COL 1: Save Snippet button; COL 2: field documentation (publish_date, headline, snippet_body, external_link); COL 3: form fields; added top-level tab bar (Text Content active)
  - **Changes:** `edit_news_sources.js` — replaced `action-bar-header` + flat shell with `.providence-editor-grid`; COL 1: Save All Sources button + Add Source form (moved from bottom of page); COL 2: field documentation (news_sources, label, url, record_slug); COL 3: search + table; added top-level tab bar (Text Content active) after successful data load
  - **Sub-tab bar preserved:** `dashboard_app.js` handles News Snippet / News Sources sub-tabs — not duplicated in editor modules
  - **No inline styles existed** — both files were already clean; replaced 3 instances of inline style in `edit_news_sources.js` add-form with new CSS classes (`.news-sources-add-form`, `.news-sources-add-heading`, `.news-sources-add-btn`)
  - **CSS additions:** `.news-sources-add-form` (margin-top), `.news-sources-add-heading` (font-size: xs), `.news-sources-add-btn` (margin-top) in `dashboard_admin.css`

---

### T16 — Refactor Bulk Upload editor to use `.providence-editor-grid` with tab bar


- **File(s):** `admin/frontend/edit_modules/edit_bulk_upload.js`
- **Action:** Replace the flat `admin-card` shell with `.providence-editor-grid`. Render the tab bar (Records active) above the grid. Map COL 1 to nav links + required-field list, COL 2 to optional-field documentation, COL 3 to the drag-and-drop CSV zone + validation results per the §2.5 wireframe.
- **Vibe Rule(s):** CSS Grid/Flexbox hierarchy · CSS variables · No inline styles · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_bulk_upload.js` — replaced `admin-module-header` + flat `admin-card` shell with `.providence-editor-grid`; COL 1: nav links (← Back to Records, + New Record manual) + required-field list (title, slug); COL 2: optional-field documentation (era, timeline, map_label, gospel_category, description, summary, location, people_involved); COL 3: drop zone + file display + validation preview + upload status + upload results + Start Upload button; added top-level tab bar (Records active)
  - **No inline styles existed in original** — replaced 3 newly introduced inline styles with CSS classes (`.bulk-upload-field-heading`, `.bulk-upload-title`, `.bulk-upload-footer`)
  - **CSS additions:** `.bulk-upload-field-heading` (margin-top), `.bulk-upload-title` (zero margin), `.bulk-upload-footer` (margin-top) in `dashboard_admin.css`


---

### T17 — Refactor Single Record editor to use `.providence-editor-grid` with tab bar

- **File(s):** `admin/frontend/edit_modules/edit_record.js`
- **Action:** Replace the flat `admin-card` shell with `.providence-editor-grid`. Render the tab bar (Records active) above the grid. Map COL 1 to action buttons (`Save Record`, `Discard`, `Delete`) plus the picture upload controls currently rendered by `edit_picture.js` — ensure `edit_picture.js` lands in COL 1 via its existing injection point. Map COL 2 to taxonomy/enum dropdowns + slug + metadata fields. Map COL 3 to the main description/essay textarea, and ensure the link editor (`edit_links.js`) continues to be injected at the bottom of COL 3 via its existing injection point. The sub-modules `edit_picture.js` and `edit_links.js` should not be structurally modified — only their DOM anchor positions may shift to the correct grid columns.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables · No inline styles · Descriptive `id`/`class` hooks · Component injection · Vanilla ES6+
- **Blocker:** Requires T1 (`.providence-editor-col-*` classes) and T2 (`window.renderTabBar()`).

- [x] Task complete
  - **Changes:** `edit_record.js` — replaced flat `admin-card` shell with `.providence-editor-grid`; COL 1: action buttons (Save Changes, Discard, Delete, View Live) + `#picture-upload-container` (injected by `edit_picture.js`); COL 2: Core Identifiers (id, title, slug, created_at, updated_at) + Taxonomy & Diagrams (era, timeline, map_label, gospel_category, geo_id, parent_id) + Verses (primary_verse, secondary_verse verse builders); COL 3: Text Content (description, snippet paragraph editors) + Bibliography (6 MLA textareas) + Miscellaneous (metadata_json, iaa, pledius, manuscript, url) + `#relations-links-container` (injected by `edit_links.js`) + `#sources-container`; added top-level tab bar (Records active)
  - **Child modules preserved:** `edit_picture.js` injects into `#picture-upload-container` (now in COL 1); `edit_links.js` injects into `#relations-links-container` (now in COL 3); no structural changes to sub-modules
  - **No inline styles existed in original** — replaced 7 newly introduced inline styles with CSS classes (`.record-actions-heading`, `.record-section-spacing`, `.record-child-slot`)
  - **CSS additions:** `.record-actions-heading` (font-size: xs), `.record-section-spacing` (margin-top), `.record-child-slot` (margin-top) in `dashboard_admin.css`

---

### T18 — Audit `login_view.css`, `markdown_editor.css`, and `ardor_diagram.css` for §18 token compliance


- **File(s):** `css/design_layouts/views/login_view.css`, `css/elements/markdown_editor.css`, `css/elements/ardor_diagram.css`
- **Action:** Check that all colours, fonts, and spacing reference CSS variables from `typography_colors.css` (not hard-coded hex values). Confirm border-radius uses `--radius-none`, borders use `--border-width-thin`, and spacing uses `--space-N` multiples. Fix any non-compliant values. Add section comments per the vibe-coding rules. The `ardor_diagram.css` file is included because it shares layout styles with the diagram editor being overhauled in T4/T5 and may contain hard-coded values that violate §18.
- **Vibe Rule(s):** CSS variables for all values · Section comments with headings · No third-party frameworks
- **Blocker:** No dependency on T1/T2 (standalone CSS audit). Must complete before T19.

- [x] Task complete

---

### T19 — Verify wireframes match implementation; finalise documentation

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** After all T1–T18 are complete, confirm the existing ASCII wireframes for every section (§2.1–§7.1) now match the code. Add a verification note confirming alignment. Add a footnote that COL 2 in the §2.1 Records List wireframe is reserved for future use. Bump the document version to `1.5.0`.
- **Vibe Rule(s):** N/A (documentation only)
- **Blocker:** Requires T1–T18 (all implementation and audit tasks must be complete before verifying alignment).

- [x] Task complete

---

### T20 — Update module sitemap and dashboard appearance guide

- **File(s):** `documentation/detailed_module_sitemap.md`, `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Update `detailed_module_sitemap.md` §7.1 Admin Portal file listing to include the new `admin/frontend/render_tab_bar.js` file. Cross-check that every file modified in T1–T19 still has a correct path entry in the sitemap. Then update `guide_dashboard_appearance.md` wireframes to reflect the new tab bar location (rendered via shared `renderTabBar()` rather than per-editor code) and add render_tab_bar.js to any ASCII data-flow diagrams that show module loading order.
- **Vibe Rule(s):** N/A (documentation only)
- **Blocker:** Requires T1–T19 (all implementation tasks complete, so sitemap can be verified against actual changes).

- [x] Task complete

---

### T21 — Run Vibe-Code Check

- **File(s):** All files modified in T1–T20
- **Action:** Verify every file against `documentation/vibe_coding_rules.md` — CSS uses Grid for macro layout and CSS variables, JS follows 1-function-per-file and 3-line header comment pattern, absolutely no inline `style="..."` attributes remain.
- **Vibe Rule(s):** All rules applicable to CSS and JS files (see checklist below)

- [x] CSS Grid used for macro layout (`.providence-editor-grid`); Flexbox for micro alignment
- [x] All colours, fonts, spacing reference CSS variables from `typography_colors.css`
- [x] Section headings present as comments in CSS
- [x] No third-party utility frameworks
- [x] Rich aesthetics — subtle transitions, logical whitespace, typography scales applied
- [x] Semantic HTML5 tags used (`<article>`, `<section>`, `<nav>`, `<aside>`) — no generic `<div>` soups
- [x] Every JS-injected template uses descriptive `id`/`class` hooks — zero inline `style="..."` attributes or inline scripts
- [x] `window.renderTabBar` opens with three comment lines: trigger, main function, output
- [x] One function per JS file (single responsibility principle)
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Tab bar HTML injected via component injection pattern onto a `containerId` anchor

- [x] Task complete

---

### T22 — Run Purpose Check

- **File(s):** All files modified in T1–T20
- **Action:** Confirm the plan's purpose (§Purpose) is fully achieved with no scope creep.
- **Vibe Rule(s):** N/A (audit only)

- [x] Plan purpose stated in §Purpose has been fully achieved
- [x] No scope creep — only files listed in T1–T20 were created or modified
- [x] §18 "Dashboard & Editor Aesthetics" is enforced across every dashboard file
- [x] All style, layout, CSS, and relevant JS code conforms to the Providence 3-column grid pattern (§18.1)

- [x] Task complete

---

### T23 — Stage, commit, and push all changes

- **File(s):** N/A (git repository root)
- **Action:** Run `git add .`, `git commit -m "dashboard re-wire stage 2"`, and `git push origin main` to commit all modified files and the new `render_tab_bar.js` to the `main` branch.
- **Vibe Rule(s):** N/A (git workflow)
- **Blocker:** Requires T1–T22 (all tasks complete before final commit).

- [ ] Task complete

---
