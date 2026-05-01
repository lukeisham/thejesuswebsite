---
name: audit_dashboard_columns
version: 1.0.0
module: 7.0 — System Module
status: draft
created: 2026-04-30
---

# Plan: audit_dashboard_columns

## Purpose

> Audit and fix the three-column Providence grid structure in `dashboard.html`. Currently many editor modules bypass the grid entirely — they receive `canvas-col-editor` as a container ID and dump all three logical columns of content into that single `<div>`. This means columns 1 and 2 (`canvas-col-actions`, `canvas-col-list`) sit empty after `_clearColumns()`, the visual dividers collapse, and the CSS is fighting a structural problem it wasn't designed to solve. This plan refactors the system so that the three-column shell (header, module tab bar, three Providence grid columns) is rendered as static, immutable HTML that never gets cleared or replaced — and JS modules only populate the three individual column wells. The guide ASCII diagram is updated to reflect the correct DOM nomenclature and render chain. Nomenclature is standardised across HTML/CSS/JS so all three layers use the same names for the same things. The thin 1px divider grid tracks now render as visible lines regardless of whether columns are empty or full — and variable column width support is added for modules that need extra space in column 2 or 3.

---

## ASCII Nomenclature Diagram

```
+===================================================================================+
|  <header class="admin-header">                                                     |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ [✦✦]  <h1>The JesusWebsite Dashboard</h1>    [Return to Frontend] [Logout]  │  |
|  │ .admin-header__favicon  .admin-header h1     .admin-return-btn .admin-logout │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|  CSS: admin_shell.css §1 (.admin-header, .admin-header__left, .admin-header__right)|
+===================================================================================+
|  <nav id="module-tab-bar">                                                         |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ [★ All Records] [Single Record] [Ordinary Lists] [Bulk CSV] [Arbor] … [System]│  |
|  │ Rendered by dashboard_init.js → renderTabBar("module-tab-bar", …)           │  |
|  │ CSS: admin_components.css §1 (.admin-tab-bar, .admin-tab-btn, .is-active)    │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+===================================================================================+
|  <main class="admin-canvas providence-editor-grid" id="admin-canvas">              |
|                                                                                    |
|  COL 1 — 160px           │  COL 2 — 1fr            │  COL 3 — 2fr                 |
|                           │                         │                               |
|  <div .providence-        │ <div .providence-       │ <div .providence-            |
|       editor-col-actions  │      editor-col-list    │      editor-col-editor       |
|       id="canvas-col-     │      id="canvas-col-    │      id="canvas-col-         |
|       actions">           │      list">             │      editor">                |
|  ┌─────────────────────┐  │ ┌───────────────────┐   │ ┌────────────────────────┐  |
|  │ Action Buttons      │  │ │ Sub-fields,       │   │ │ Main Editor Form &     │  |
|  │ & Primary Controls  │  │ │ Metadata,         │   │ │ Live Previews          │  |
|  │                     │  │ │ Secondary Controls│   │ │                        │  |
|  │ Populated by        │  │ │                   │   │ │ Populated by           │  |
|  │ _setColumn(         │  │ │ Populated by      │   │ │ _setColumn(            │  |
|  │   "actions", html)  │  │ │ _setColumn(       │   │ │   "editor", html)      │  |
|  │                     │  │ │   "list", html)   │   │ │   — OR —               │  |
|  │ NOT innerHTML       │  │ │                   │   │ │ innerHTML = html       │  |
|  │ replaced wholesale  │  │ │ NOT innerHTML     │   │ │ (for full-width views) │  |
|  └─────────────────────┘  │ └───────────────────┘   │ └────────────────────────┘  |
|                           │                         │                               |
|  CSS: admin_components.css §2 (.providence-editor-grid, .providence-editor-col-*)  |
|  Thin dividers between columns use 1px grid tracks (.providence-editor-col-divider)|
+===================================================================================+
```

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Do not start a new task until the previous task is completed.
> Check each box as you complete the task.

### T1 — Standardise nomenclature across dashboard.html / admin_components.css / dashboard_app.js

- **File(s):** `admin/frontend/dashboard.html`, `css/1.0_foundation/dashboard/admin_components.css`, `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** Audit and rename all hooks so HTML `id`s, CSS class selectors, and JS `getElementById` / `_getColumns` references use the same exact names. Specifically fix: the CSS uses `.providence-editor-col-actions` / `.providence-editor-col-list` / `.providence-editor-col-editor` while the JS references `canvas-col-actions` / `canvas-col-list` / `canvas-col-editor` via `_getColumns()`. The `id` values are fine (JS hooks) but the CSS class selectors should be checked for consistency. Also ensure the divider class `.providence-editor-col-divider` is documented in the CSS comment header. No actual rename is needed if the current names already match — this task is the audit step confirming consistency.
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id` hooks for JS · Modular `class` names for CSS

- [x] Task complete

---

### T2 — Refactor dashboard.html: lock the three-column shell as immutable static markup

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Ensure the three Providence column `<div>`s and their divider siblings inside `<main id="admin-canvas">` are treated as permanent, non-replaceable structural elements. Add a clear code comment above the three columns: "<!-- IMMUTABLE PROVIDENCE GRID — never cleared or replaced. Columns are populated by dashboard_app.js → _setColumn() only. -->". This is already the current structure but the comment makes the contract explicit for all future editors. No markup changes needed beyond the comment.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline `<script>` blocks · Descriptive `id` hooks for JS

- [x] Task complete

---

### T3 — Diagnose the CSS override stacking the favicon above the heading

- **File(s):** `css/1.0_foundation/dashboard/admin_shell.css`, `css/1.0_foundation/dashboard/admin_typography_base.css`, `css/1.0_foundation/dashboard/admin_grid_base.css`, `css/7.0_system/dashboard/auth_login.css`
- **Action:** The `<img class="admin-header__favicon">` and `<h1>The JesusWebsite Dashboard</h1>` are children of `<div class="admin-header__left">` which is a flex row container with `flex-wrap: nowrap`. Despite this, they render stacked vertically instead of side-by-side. Open the browser DevTools and inspect the computed styles on the `admin-header__left` div, the favicon `<img>`, and the `<h1>` to find which rule is forcing the `<h1>` to break onto a new line. Common suspects: (a) a `display: block` with `width: 100%` on `h1` inherited from a global tag selector, (b) a `flex-basis: 100%` or `flex: 1 0 100%` applied by a generic rule, (c) `max-width` constraints on `.admin-header__left` causing it to wrap, (d) a CSS reset normalising `h1` to `display: block` in a way that conflicts with the flex container, (e) a `clear: both` or `float` rule from a legacy stylesheet. Document the exact selector and rule causing the problem.
- **Vibe Rule(s):** CSS variables · Vanilla CSS only

- [x] Task complete

---

### T4 — Fix the CSS override so the favicon and heading sit side-by-side

- **File(s):** `css/1.0_foundation/dashboard/admin_shell.css` (primary), plus whichever stylesheet T3 identifies as the override source
- **Action:** Apply the minimum fix needed to ensure `[✦✦] The JesusWebsite Dashboard` render on the same horizontal line inside `.admin-header__left`. If the cause is a broad `h1 { display: block; width: 100% }` rule, override it with `.admin-header h1 { display: inline; width: auto; flex: 0 1 auto; }`. If the cause is `flex-wrap: wrap` being inherited somewhere, reinforce `flex-wrap: nowrap` and `white-space: nowrap` on the heading. If the cause is a `max-width` on the parent `.admin-header` squeezing the left group, adjust it. The fix should be minimal — one or two property overrides, not a rewrite. After applying, verify in DevTools that both elements sit on the same baseline, centred vertically, with the `var(--space-3)` gap between them.
- **Vibe Rule(s):** Vanilla CSS only · CSS variables · Minimal override — no !important unless absolutely necessary

- [x] Task complete

---

### T5 — Refactor dashboard_app.js: forbid clearing the shell columns

- **File(s):** `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** Refactor `_clearColumns()` so it never sets `innerHTML = ""` on the three Providence column containers. Instead, introduce `_clearColumnContent(colName)` which selectively removes only the injected content children (e.g. `.admin-card`, `.blog-editor-*`, `.table-wrapper`, `.search-container`, `.admin-records-table`) but preserves the column `<div>` itself. Update the file's header comment to explicitly state: "The three Providence column divs are immutable shell elements — never destroyed or replaced. Only their inner content is cleared and repopulated." Also audit every `innerHTML` assignment in the inline builders (`_loadRecordsAll`, `_loadRecordsEdit`, `_loadRanksChallenges`, `_loadListsOrdinary`, `_loadRanksResponses`, `_loadTextEssays`, `_loadTextNews`) and in the route table (`loadModule`) to ensure no module calls `container.innerHTML = "..."` directly on a column ID — it must go through `_setColumn()`.
- **Vibe Rule(s):** One function per pattern · Vanilla ES6+ · Component injection pattern · Three-line comment header

- [x] Task complete

---

### T6 — Refactor editor modules that bypass the Providence grid

- **File(s):** `js/4.0_ranked_lists/dashboard/edit_wiki_weights.js`, `js/5.0_essays_responses/dashboard/edit_response.js`, `js/6.0_news_blog/dashboard/edit_blogpost.js`, `js/3.0_visualizations/dashboard/edit_diagram.js`, `js/5.0_essays_responses/dashboard/edit_mla_sources.js`
- **Action:** Each of these modules currently receives a single `containerId` (always `"canvas-col-editor"`) and renders a complete three-column layout inside it via `container.innerHTML = "..."`. Refactor each to instead use `_setColumn("actions", …)`, `_setColumn("list", …)`, and `_setColumn("editor", …)` — or accept three individual column IDs instead of one container ID. Update the function signatures and the route table in `dashboard_app.js` accordingly. The key principle: each module must populate the three existing Providence column wells, not create its own ad-hoc columns inside the editor well.
- **Vibe Rule(s):** One function per file · Vanilla ES6+ · Component injection pattern · Three-line comment header

- [x] Task complete

---

### T7 — Diagnose any CSS override silently breaking the column divider system

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`, `css/1.0_foundation/dashboard/admin_shell.css`, `css/1.0_foundation/dashboard/admin_typography_base.css`, `css/1.0_foundation/dashboard/admin_grid_base.css`
- **Action:** Open the browser DevTools on dashboard.html and inspect the `.providence-editor-grid` element and its `.providence-editor-col-divider` children in the computed styles panel. Confirm whether the 1px grid tracks are actually rendering as visible lines. If they are not, trace every rule targeting `.providence-editor-col-divider`, `.providence-editor-grid`, or any child column class to find which rule is zeroing out or overriding the divider. Common suspects: (a) a `display: none` or `visibility: hidden` rule leaking from a utility class, (b) `grid-template-columns` being overridden by a higher-specificity selector elsewhere, (c) the divider `<div>` being removed from the DOM by a JS module that replaces `admin-canvas` innerHTML wholesale, (d) `background-color: transparent` or `background: none` on the divider from a reset or generic selector. Document the exact rule and its source file.
- **Vibe Rule(s):** CSS variables · Vanilla CSS only

- [x] Task complete

---

### T8 — Fix the column divider override so thin lines always render between columns

- **File(s):** Whichever file T7 identifies as the override source, plus `css/1.0_foundation/dashboard/admin_components.css` if the divider rules need reinforcing
- **Action:** Apply the minimum fix so the two 1px divider tracks render as visible `var(--color-border)` lines between the three Providence columns at all times, regardless of which module is loaded or whether a column is empty. If the root cause is a specificity war, increase selector weight (e.g. `#admin-canvas .providence-editor-col-divider`). If the divider divs are being removed from the DOM by a JS module, that module must be refactored to leave them untouched (flag the module and fix it). If a reset or generic rule is zeroing the background, add an explicit `background-color: var(--color-border) !important` as a last resort. After applying, verify: (a) both dividers are visible in the default records-all view, (b) they remain visible when switching to any other module tab, (c) they span the full height of the grid row.
- **Vibe Rule(s):** Vanilla CSS only · CSS variables · Minimal override · Document the fix in a comment above the rule

- [x] Task complete

---

### T9 — Add variable column width support for modules that need wider second or third columns

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`, `css/1.0_foundation/dashboard/admin_typography_base.css`, `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** The default grid template is `160px 1px 24px 1fr 1px 24px 2fr` (col-1 fixed, col-2 and col-3 flexible at 1:2 ratio). Some modules benefit from a wider editor column. Introduce a CSS custom property system that lets modules override the grid track sizes without breaking the divider tracks: (1) Add `--editor-col-two-fr` and `--editor-col-three-fr` variables in `admin_typography_base.css` defaulting to `1fr` and `2fr`. (2) Rewrite `.providence-editor-grid` grid-template-columns to use these variables. (3) Add `_setGridColumns(twoFr, threeFr)` in `dashboard_app.js` that sets the properties on `#admin-canvas` via `el.style.setProperty()`. Call it from `_clearColumns()` with `1fr, 2fr` as the reset default so every module switch restores the standard layout. (4) Modules that need a custom ratio call `_setGridColumns()` before populating columns. The divider tracks (1px) and gap tracks (24px) never change — only the fr widths vary. Thin column boundary lines remain intact regardless of column width.
- **Vibe Rule(s):** CSS variables · Grid/Flexbox hierarchy · Vanilla ES6+ · One function per pattern

- [x] Task complete

---

### T10 — Finalise admin_components.css: clean up dead CSS from previous divider attempts

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** After T7 and T8 confirm the divider system is working, remove any leftover `border-left`, `align-self: stretch`, or `min-height: 100%` rules from `.providence-editor-col-actions`, `.providence-editor-col-list`, and `.providence-editor-col-editor` that were part of the failed border-based approach. Add a section comment block (`==== 2a. PROVIDENCE COLUMN DIVIDERS ====`) above the divider rules documenting that dividers are 1px grid tracks with `background-color: var(--color-border)` — not borders — so they render regardless of column content height.
- **Vibe Rule(s):** Grid/Flexbox hierarchy · CSS variables · Section headings and subheadings as comments · Vanilla CSS only

- [x] Task complete

---

### T11 — Update guide_dashboard_appearance.md ASCII diagrams to match post-refactor reality

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Update the ASCII diagram in paragraph 0.1 and all per-module diagrams (2.1, 7.1) to reflect: (a) the correct DOM class names and IDs as shown in the nomenclature diagram above, (b) the divider tracks between columns, (c) the immutable-shell contract, (d) the render chain annotation, (e) the variable-width column system with CSS custom properties. Increment the document version number to 2.2.0.
- **Vibe Rule(s):** ASCII consistency with actual DOM · Source-of-truth accuracy

- [x] Task complete

---

## T12 Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `admin_typography_base.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [x] One function per file
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

### Python
- [x] N/A — no Python files touched in this plan

### SQL / Database
- [x] N/A — no database files touched in this plan

---

## T13 Purpose Check

> Verify the plan delivers on every promise made in the Purpose paragraph.

- [x] **Structural audit completed** — all JS modules and CSS rules that interact with the three Providence columns have been traced and documented
- [x] **Favicon-heading stacking bug diagnosed and fixed** — the favicon and h1 render side-by-side on the same baseline inside .admin-header__left
- [x] **Three-column shell is immutable** — the three Providence divs in dashboard.html are never cleared or replaced; only inner content is populated via _setColumn()
- [x] **Editor modules use the grid correctly** — all five bypassing modules have been refactored to populate the three existing column wells instead of dumping everything into canvas-col-editor
- [x] **Visible column dividers** — thin 1px lines render between all three Providence columns regardless of which module is loaded or whether a column is empty, and variable width column support is confirmed. 
- [x] **Nomenclature standardised** — HTML ids, CSS class selectors, and JS getElementById / _getColumns references all use the same names for the same things
- [x] **Guide documentation updated** — guide_dashboard_appearance.md ASCII diagrams reflect the refactored reality, correct DOM names, divider tracks, and render chain
- [x] No scope creep — only files listed in the Tasks section were created or modified

---
