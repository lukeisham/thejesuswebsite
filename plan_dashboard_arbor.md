---
name: plan_dashboard_arbor
version: 1.0.0
module: 3.0 — Visualizations
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_arbor

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Arbor Diagram" dashboard module, an interactive administrative tool for managing the recursive hierarchical structure of the project's evidence tree. It features a drag-and-drop node editor that mimics the frontend visualization while allowing administrators to re-parent records, refresh the diagram state, and publish structural changes to the live site. This module is essential for maintaining the relational integrity and logical flow of the historical evidence graph, providing a visual interface for complex database relationship management.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Refresh ]   [ Publish ]                                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  (Root Node) --+-- (Child 1) --+-- (Sub 1)                                      |
|                |               |                                                |
|                |               +-- (Sub 2)                                      |
|                |                                                                |
|                +-- (Child 2) ----- (Sub 3)                                      |
|                                                                                 |
|  [Drag & Drop UI matching Frontend Arbor]                                       |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_arbor.html` | Interactive diagram container |
| **CSS** | `css/3.0_visualizations/dashboard/dashboard_arbor.css` | Canvas & Node aesthetics |
| **JS** | `js/3.0_visualizations/dashboard/dashboard_arbor.js` | Module orchestration & initialization |
| **JS** | `js/3.0_visualizations/dashboard/fetch_arbor_data.js` | API interface for tree fetching |
| **JS** | `js/3.0_visualizations/dashboard/render_arbor_node.js` | Individual node creation & styling |
| **JS** | `js/3.0_visualizations/dashboard/draw_arbor_connections.js` | SVG/Canvas logic for relationship lines |
| **JS** | `js/3.0_visualizations/dashboard/handle_node_drag.js` | Drag-and-drop interaction logic |
| **JS** | `js/3.0_visualizations/dashboard/update_node_parent.js` | Parent-child re-assignment logic |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4 calls `get_diagram_tree`; T8 calls `update_diagram_tree` to commit parent-child changes |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the Arbor module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T10 routes all fetch, render, drag, and publish failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads `parent_id` for all records to build the tree; T8 writes updated `parent_id` after drag-and-drop |
| `js/3.0_visualizations/frontpage/render_arbor.js` | (public frontend) | T8/Publish writes `parent_id` changes that feed the public-facing Arbor visualization |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Arbor Dashboard HTML

- **File(s):** `admin/frontend/dashboard_arbor.html`
- **Action:** Create the structural container for the arbor diagram editor, including the interactive canvas anchor and the Refresh/Publish function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Arbor Dashboard CSS

- **File(s):** `css/3.0_visualizations/dashboard/dashboard_arbor.css`
- **Action:** Implement styling for the diagram canvas, draggable node components, and connecting line vectors using the 'providence' design system.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Arbor Orchestrator

- **File(s):** `js/3.0_visualizations/dashboard/dashboard_arbor.js`
- **Action:** Initialize the arbor module and coordinate the loading, rendering, and interaction cycles.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Arbor Data Fetching

- **File(s):** `js/3.0_visualizations/dashboard/fetch_arbor_data.js`
- **Action:** Implement the logic to fetch the full hierarchical record tree from the backend API.
- **Dependencies:** `admin/backend/admin_api.py` (get_diagram_tree)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Node Rendering Component

- **File(s):** `js/3.0_visualizations/dashboard/render_arbor_node.js`
- **Action:** Implement the logic to create and style a single interactive node based on record data.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Connection Vector Logic

- **File(s):** `js/3.0_visualizations/dashboard/draw_arbor_connections.js`
- **Action:** Implement the logic to draw connecting lines (vectors) between parent and child nodes.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Drag-and-Drop Interaction

- **File(s):** `js/3.0_visualizations/dashboard/handle_node_drag.js`
- **Action:** Implement the event listeners and movement logic for dragging nodes across the canvas.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Implement Relational Update Logic

- **File(s):** `js/3.0_visualizations/dashboard/update_node_parent.js`
- **Action:** Implement the logic to calculate a new parent-child relationship after a drag event and commit the change to the database **with status set to draft**. Every drag-and-drop re-parenting auto-saves as draft — only the explicit "Publish" button in the function bar commits structural changes to the live frontend.
- **Dependencies:** `admin/backend/admin_api.py` (update_diagram_tree)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Relational Integrity & Visual Audit

- **Action:** Verify that no circular parent-child loops are possible and that the dashboard arbor diagram visual style matches the frontend aesthetic defined in `guide_appearance.md`.
- **Vibe Rule(s):** Source-of-truth discipline · Visual Excellence

- [ ] Task complete

---

## Final Tasks

### T10 — Error Message Generation

- **File(s):**
  - `js/3.0_visualizations/dashboard/fetch_arbor_data.js`
  - `js/3.0_visualizations/dashboard/handle_node_drag.js`
  - `js/3.0_visualizations/dashboard/update_node_parent.js`
  - `js/3.0_visualizations/dashboard/render_arbor_node.js`
  - `js/3.0_visualizations/dashboard/draw_arbor_connections.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Tree Fetch Failed** — `fetch_arbor_data.js` fetch to `/api/admin/diagram_tree` fails or returns non-OK: `"Error: Unable to load the arbor diagram. Please refresh and try again."`
  2. **Empty Tree** — API returns successfully but the tree payload is empty or malformed: `"Error: No diagram data was returned. Check that records have parent relationships set."`
  3. **Node Render Failed** — `render_arbor_node.js` receives a record with missing required fields and cannot build the node: `"Error: Failed to render node for record '{title}'. Data may be incomplete."`
  4. **Connection Draw Failed** — `draw_arbor_connections.js` cannot resolve a parent or child reference when drawing a relationship line: `"Error: Failed to draw connection for '{title}'. Parent record may be missing."`
  5. **Drag Conflict** — `handle_node_drag.js` detects a drop that would create a circular parent-child loop: `"Error: Cannot re-parent '{title}' — this would create a circular loop in the tree."`
  6. **Relational Update Failed** — `update_node_parent.js` PUT to `/api/admin/records/{id}` returns non-OK after a drag-and-drop: `"Error: Failed to save new parent for '{title}'. The diagram has been reset to its previous state."`
  7. **Publish Failed** — the Publish action returns non-OK when committing tree changes to the live site: `"Error: Failed to publish arbor diagram changes. Please try again."`
  8. **Refresh Failed** — the Refresh action cannot re-fetch the current tree state: `"Error: Failed to refresh the arbor diagram. Please reload the page."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar. For item 6, the UI must additionally undo the visual drag position and restore the node to its pre-drag location.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T11 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file
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

### T12 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new Arbor diagram dashboard files under Module 3.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new Arbor editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the Arbor Diagram editor. |
| `documentation/guides/guide_function.md` | Yes | Document hierarchical node editing and tree publishing logic. |
| `documentation/guides/guide_security.md` | Yes | Note relational integrity checks for node re-parenting. |
| `documentation/guides/guide_style.md` | Yes | Document diagram canvas and interactive node CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
