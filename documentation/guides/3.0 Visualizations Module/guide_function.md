---
name: guide_function.md
purpose: Visual ASCII representations of Visualizations Module data flows — ardor diagram, timeline, geographic maps
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

---

## 3.0 Visualizations Module

### 3.1 Evidence (Ardor) — Data Flow

```text
                        ┌─────────────────────────────────────┐
                        │         SQLite Database              │
                        │         (records table)              │
                        │   ┌──────────────┬────────────────┐  │
                        │   │  WASM Path   │  API Path      │  │
                        │   │  (read-only) │  (read/write)  │  │
                        │   └──────────────┴────────────────┘  │
                        └──────────┬────────────────┬──────────┘
                                   │                │
                       PUBLIC SIDE  │                │  ADMIN SIDE
                                   v                v
        ┌──────────────────────────┐    ┌──────────────────────────┐
        │  WASM sql.js             │    │  admin_api.py            │
        │  (in-browser SQLite)     │    │  GET /api/admin/diagram/ │
        │  Queries:                │    │    tree                  │
        │  SELECT era, parent_id, │    │    → SELECT id, title,  │
        │  geo_label FROM records  │    │      parent_id FROM     │
        └────────────┬─────────────┘    │      records            │
                     │                  │  PUT /api/admin/diagram/│
                     │                  │    tree                 │
                     │                  │    → Validates IDs      │
                     │                  │    → Checks circular    │
                     │                  │      refs (2-node only) │
                     │                  │    → BEGIN TRANSACTION  │
                     │                  │    → UPDATE records     │
                     │                  │      SET parent_id = ?  │
                     │                  │    → COMMIT / ROLLBACK  │
                     v                  └───────────┬──────────────┘
        ┌──────────────────────────┐                │
        │  3.0 Visualizations     │                │
        │     Render Engine       │                │
        │  (public-facing)        │                │
        │  Interprets era, geo,   │                │
        │  parent_id for layout   │                │
        └────────────┬─────────────┘                │
                     │                              │
                     v                              v
        ┌──────────────────────────┐  ┌──────────────────────────┐
        │  SVG / Canvas Output     │  │  edit_diagram.js         │
        │  (public evidence.html)  │  │  (admin editor)          │
        │                          │  │  Renders recursive tree  │
        │  Node circles + edges    │  │  from GET data           │
        │  with hover effects      │  │                          │
        │                          │  │  Features:               │
        │                          │  │  • Drag-and-drop         │
        │                          │  │  • Search filter         │
        │                          │  │  • Add Child (orphans)   │
        │                          │  │  • Remove Node (nullify) │
        │                          │  │  • Save via PUT          │
        └──────────────────────────┘  └──────────────────────────┘
```

### 3.2 Arbor Dashboard Editor — End-to-End Flow

```text
  [ Admin clicks "Arbor" card or tab in Dashboard ]
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_app.js → loadModule('arbor')                                  |
  |   Calls window.renderArbor()                                            |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js (Orchestrator)                                       |
  |   1. _setLayoutColumns(false, '1fr') — full-width, no sidebar           |
  |   2. Fetches dashboard_arbor.html template, injects into #providence-col-main |
  |   3. Calls _loadAndRenderTree()                                         |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | fetch_arbor_data.js                                                     |
  |   GET /api/admin/diagram/tree → admin_api.py → SQLite                   |
  |   Returns flat array: [{id, title, parent_id}, …]                       |
  |   On failure → surfaceError("Unable to load the arbor diagram…")        |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js — _loadAndRenderTree()                               |
  |   1. Builds Map<id, {id, title, parent_id, children[]}>                 |
  |   2. Assembles children arrays & orphan list (parent_id = null)         |
  |   3. Stores in window.__diagramNodes, window.__arborOrphans             |
  |   4. Initialises window.__changedNodes = new Map()                      |
  +-------------------------------------------------------------------------+
              │
     ┌────────┴────────┐
     v                  v
  +------------------+  +---------------------------------------------------+
  | render_arbor_    |  | draw_arbor_connections.js                         |
  | node.js          |  |   Queries DOM for .arbor-node-row positions       |
  | Recursively      |  |   Draws cubic bezier SVG <path> lines             |
  | creates <li>     |  |   from parent right edge → child left edge        |
  | with grip, label,|  +---------------------------------------------------+
  | id, [+Child],    |
  | [Remove] buttons |
  +------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | setupNodeDrag() — handle_node_drag.js                                   |
  |   Attaches HTML5 DnD listeners to every .arbor-node-row                 |
  |   + Orphan pool drop zone (detach → parent_id = null)                   |
  |   Drag-over validates: no self-drop, no circular references             |
  |   On valid drop → window.updateNodeParent(childId, newParentId)         |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | update_node_parent.js                                                   |
  |   1. Records old_parent_id for rollback                                 |
  |   2. Optimistically updates window.__diagramNodes                        |
  |   3. Tracks change in window.__changedNodes                              |
  |   4. Rebuilds tree (_rebuildTreeFromMap)                                |
  |   5. Re-renders UI (_rerenderTree) — optimistic update                  |
  |   6. PUT /api/admin/diagram/tree → auto-saves as draft                  |
  |      On failure → rollback in-memory state + surfaceError               |
  |   7. Shows "Saved as draft" indicator                                   |
  +-------------------------------------------------------------------------+

  ── PUBLISH FLOW (explicit admin action) ──────────────────────────────────────

  [ Admin clicks "Publish" ]
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js — _handlePublish()                                   |
  |   Gathers all entries from window.__changedNodes                         |
  |   PUT /api/admin/diagram/tree with full batch                           |
  |   On success → clears window.__changedNodes                             |
  |   On failure → surfaceError("Failed to publish…")                       |
  +-------------------------------------------------------------------------+

  ── REFRESH FLOW ─────────────────────────────────────────────────────────────

  [ Admin clicks "Refresh" ]
              │
              v
  +-------------------------------------------------------------------------+
  | Re-fetches tree from backend (discarding any un-persisted in-memory      |
  | state). Full re-render from scratch.                                    |
  +-------------------------------------------------------------------------+
```

---

