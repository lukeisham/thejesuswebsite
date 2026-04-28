---
name: fix_edit_diagram_module_3_1
version: 1.0.0
module: 3.0 — Visualizations Module
status: draft
created: 2026-04-28
---

# Plan: fix_edit_diagram_module_3_1

## Purpose

> **Make the Ardor (Evidence) Diagram admin editor (`edit_diagram.js`) fully functional.** The module currently renders a static hardcoded HTML mock — the "Save Graph" button, search input, "+Add Child" buttons, and drag cursor are all cosmetic. The `config-diagrams` sidebar link in the admin portal falls through to a generic split-pane placeholder because no router case exists. This plan: (1) wires the router case in `dashboard_app.js` to call `window.renderEditDiagram`, (2) adds `GET /api/admin/diagram/tree` and `PUT /api/admin/diagram/tree` endpoints in `admin_api.py` to fetch and persist parent-child relationships, (3) rewrites `edit_diagram.js` to load real tree data, render nodes dynamically, support HTML5 drag-and-drop re-parenting, and wire the Save Graph button to the PUT endpoint, and (4) adds admin-specific diagram editor styles to `ardor_diagram.css`. The public `ardor_display.js` and `evidence.html` are untouched.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Wire `config-diagrams` router case in `dashboard_app.js`

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a `moduleName === 'config-diagrams'` case to the `loadModule` router that calls `window.renderEditDiagram('admin-canvas')`. This case must be checked before the generic split-pane placeholder fallback. The existing sidebar link (`<a href="#" data-module="config-diagrams">Edit Diagrams</a>`) is already present and needs no change.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function/file · 3-line comment header

- [ ] Task complete

---

### T2 — Add `GET /api/admin/diagram/tree` endpoint in `admin_api.py`

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add `@app.get("/api/admin/diagram/tree")` protected by `verify_token` dependency. Query `SELECT id, title, parent_id FROM records ORDER BY title` and return the result as `{"nodes": [...]}`. This provides the flat node list that the frontend will assemble into a recursive tree structure.
- **Vibe Rule(s):** Explicit readable logic · snake_case · document API quirks (note: `parent_id` may be null for root nodes)

- [ ] Task complete

---

### T3 — Add `PUT /api/admin/diagram/tree` endpoint in `admin_api.py`

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add `@app.put("/api/admin/diagram/tree")` protected by `verify_token` that accepts `{"updates": [{"id": "...", "parent_id": "..."}, ...]}`. Validate that each `id` exists in the `records` table. Batch-update the `parent_id` column inside a transaction (commit once, rollback on error). Add circular-reference detection: if record A's new parent_id is B, and B's new parent_id is A, reject the update with a 422 error.
- **Vibe Rule(s):** Explicit readable logic · snake_case · stateless/repeatable · document API quirks (circular reference rejection)

- [ ] Task complete

---

### T4 — Rewrite `edit_diagram.js` to load and render tree data from API

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Replace the entire static HTML mock with an async `renderEditDiagram` function. On load: (1) `fetch('/api/admin/diagram/tree')` to get the flat node list, (2) build a recursive tree structure by grouping nodes by `parent_id`, (3) render root nodes (those with `parent_id === null`) as top-level ROOT NODE blocks, (4) render children as indented sub-trees with visual connector lines, (5) attach `draggable="true"` and a unique `data-node-id` attribute to each rendered node element. Store the full node list in a module-scoped `window.__diagramNodes` map for drag-and-drop and search.
- **Vibe Rule(s):** 1 function/file · ES6+ · 3-line comment header (trigger: dashboard_app.js routing; function: window.renderEditDiagram; output: Dynamic node tree injected into container) · Vanilla JS

- [ ] Task complete

---

### T5 — Implement drag-and-drop node re-parenting in `edit_diagram.js`

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Add HTML5 Drag and Drop event handlers inside `renderEditDiagram`:
  - `dragstart` — set `dataTransfer.setData('text/plain', nodeId)` and add a `.dragging` CSS class to the source element.
  - `dragover` — call `e.preventDefault()` and add a `.drop-target` CSS class to the element being hovered.
  - `dragleave` — remove `.drop-target`.
  - `drop` — read the dragged `nodeId` from `dataTransfer`, read the target `nodeId` from `data-node-id` of the drop zone, update the in-memory `parent_id` of the dragged node in `window.__diagramNodes`, add an entry to a `changedNodes` Set (`{id: nodeId, parent_id: targetNodeId}`), and re-render the tree to reflect the new parent-child layout.
  - `dragend` — remove `.dragging` from all nodes.
  Track changed nodes in a Set so that unchanged nodes are not sent to the API on save.
- **Vibe Rule(s):** 1 function/file · ES6+ · Vanilla JS · event delegation scoped to diagram container only (must not interfere with `edit_picture.js` upload form)

- [ ] Task complete

---

### T6 — Implement search, add-child, and remove-node UI in `edit_diagram.js`

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Wire three UI features:
  - **Search:** Bind an `input` event to the search field. Filter visible nodes by checking if their `title` contains the search string (case-insensitive). Nodes that don't match get `display: none`.
  - **Add Child:** Each rendered node gets a "+ Add Child" button. Clicking it opens an inline dropdown of available orphan nodes (nodes with no parent_id, excluding the current node and its descendants) to attach as children. Selecting one sets its `parent_id` to the current node and adds it to the `changedNodes` set, then re-renders.
  - **Remove Node:** Each node gets a "Remove Node" button that sets its `parent_id` to `null` (promotes to root — does NOT delete the record), adds it to `changedNodes`, and re-renders.
- **Vibe Rule(s):** 1 function/file · ES6+ · Vanilla JS · no inline event attributes (use `addEventListener`)

- [ ] Task complete

---

### T7 — Wire "Save Graph" button to PUT API in `edit_diagram.js`

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Attach a `click` handler to the "Save Graph" button that: (1) reads the `changedNodes` Set, (2) if empty, shows a "No changes to save" message and returns early, (3) calls `fetch('/api/admin/diagram/tree', { method: 'PUT', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({updates: Array.from(changedNodes)}) })`, (4) on success (200), clear `changedNodes`, show a green "Graph saved successfully" toast, and update the `window.__diagramNodes` map, (5) on error, show a red "Save failed" toast with the server's error message.
- **Vibe Rule(s):** 1 function/file · ES6+ · Vanilla JS · JWT cookie auth via `credentials: 'include'` (uses existing HttpOnly cookie)

- [ ] Task complete

---

### T8 — Add admin diagram editor styles to `ardor_diagram.css`

- **File(s):** `css/elements/ardor_diagram.css`
- **Action:** Add the following class blocks below the existing public-facing styles:
  - `.admin-diagram-tree` — container for the draggable node tree inside the admin card.
  - `.diagram-node` — base node row with `display: flex`, `align-items: center`, `gap: var(--space-2)`, `padding: var(--space-2)`, `border: 1px solid var(--color-border)`, `cursor: grab`, `user-select: none`.
  - `.diagram-node.dragging` — `opacity: 0.5`, `border-style: dashed`.
  - `.diagram-node.drop-target` — `border-color: var(--color-accent-primary)`, `background: var(--color-bg-secondary)`.
  - `.diagram-node-children` — `margin-left: var(--space-8)`, `border-left: 2px solid var(--color-border)` for connector indentation.
  - `.diagram-save-indicator` — small status bar for save success/error feedback.
  - `.diagram-search-input` — styling for the node search field (already has structural styles from mock, move to proper class).
  Ensure all colours/spacing reference CSS variables from `typography_colors.css`.
- **Vibe Rule(s):** CSS Grid/Flexbox · CSS variables · section comment headings · no third-party frameworks

- [ ] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] No HTML files are created or modified by this plan

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
- [ ] Event delegation scoped to avoid interfering with `edit_picture.js`

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks (circular reference detection, null parent_id handling) documented inline

### SQL / Database
- [ ] No SQL schema changes — reads/writes existing `parent_id` column only
- [ ] Queries are explicit — `SELECT id, title, parent_id FROM records ORDER BY title`

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `admin/frontend/dashboard_app.js` | 6.1 — Admin Portal | Yes | Update entry (new `config-diagrams` router case added) |
| `admin/backend/admin_api.py` | 6.1 — Admin Portal | Yes | Update entry (two new endpoints added under existing module) |
| `admin/frontend/edit_modules/edit_diagram.js` | 3.0 — Visualizations | Yes | Update entry (file rewritten — note functional state change from "static mock" to "fully wired") |
| `css/elements/ardor_diagram.css` | 3.0 — Visualizations | Yes | Update entry (new admin editor class blocks added) |

### Sitemap Integrity Checks
- [x] No new files were added — sitemap structure is unchanged
- [ ] No existing sitemap entries were broken or made stale by this plan
- [x] `detailed_module_sitemap.md` version number does NOT need incrementing (no structural change — all files existed, only implementations changed)

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 3.0: Visualizations Module

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `frontend/pages/maps.html` + sub-pages | No | No impact identified |
| `frontend/pages/timeline.html` | No | No impact identified |
| `frontend/pages/evidence.html` | No | Public evidence page uses `ardor_display.js` which reads from WASM sql.js — the admin editor writes to the API and does not change the WASM data path |
| `frontend/display_big/ardor_display.js` | No | Public display renders via WASM sql.js query; admin editor writes `parent_id` to the database via API. The data source is the same column but the read path is different — no conflict. However, once an admin changes a `parent_id` via the editor, `ardor_display.js` will reflect it on next page load (this is intended behaviour, not a negative impact). |
| `frontend/display_other/timeline_display.js` | No | No impact identified |
| `frontend/display_other/maps_display.js` | No | No impact identified |
| `css/elements/timeline_diagram.css` | No | No impact identified |
| `css/elements/map_diagram.css` | No | No impact identified |

### Cross-Module Check

> Modules that are architecturally connected to Module 3.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 6.1 — Admin Portal (Sub-Module) | **Yes** | T1 adds a new router case in `dashboard_app.js`. T2-T3 add two new endpoints in `admin_api.py`. Both files are in this module. |
| 1.0 — Foundation Module | No | No shared CSS variables, JS globals, or injected components affected |
| 2.0 — Records Module | No | The `parent_id` column is read from the `records` table via the existing API — no schema changes, no new columns |
| 4.0 — Ranked Lists Module | No | No impact identified |
| 5.0 — Essays Module | No | No impact identified |
| 6.2 — System Core & DevOps | No | No impact identified |
| SQLite Database | No | No schema changes — reads/writes the existing `parent_id` column only |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 3.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **See flagged rows above** — Module 6.1 Admin Portal is affected (new router case in `dashboard_app.js` and new endpoints in `admin_api.py`)

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No structural changes — no files added, moved, or renamed. The existing `edit_diagram.js` entry notes it as "Visual tool to adjust recursive 'Ador' parent_id relations" which remains accurate. |
| `documentation/simple_module_sitemap.md` | No | High-level module scope unchanged |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No new DB tables or columns introduced — `parent_id` already documented |
| `documentation/vibe_coding_rules.md` | No | No rules need clarification |
| `documentation/style_mockup.html` | No | No new page layouts |
| `documentation/git_vps.md` | No | No deployment or workflow changes |
| `documentation/guides/guide_appearance.md` | No | Public-facing UI unchanged (only admin editor affected) |
| `documentation/guides/guide_dashboard_appearance.md` | **Yes** | §3.1 ASCII diagram needs updating to show the real API-backed editor flow: data loads from `GET /api/admin/diagram/tree`, drag-and-drop re-parenting, and `PUT /api/admin/diagram/tree` for persistence. Replace the current static mock diagram with one showing the API round-trip. |
| `documentation/guides/guide_function.md` | **Yes** | §3.1 Evidence (Ardor) data flow needs updating. The current diagram shows only the public WASM → SVG pipeline. Add the admin API round-trip path: `edit_diagram.js` → `GET/PUT /api/admin/diagram/tree` → `admin_api.py` → `records.parent_id` column. |
| `documentation/guides/guide_security.md` | No | Uses existing JWT auth via `verify_token` dependency — no new auth patterns |
| `documentation/guides/guide_style.md` | No | No new CSS patterns beyond admin diagram editor additions scoped to `.admin-*` classes |
| `documentation/guides/guide_maps.md` | No | Maps not touched |
| `documentation/guides/guide_timeline.md` | No | Timeline not touched |
| `documentation/guides/guide_donations.md` | No | Not touched |
| `documentation/guides/guide_welcoming_robots.md` | No | Not touched |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present