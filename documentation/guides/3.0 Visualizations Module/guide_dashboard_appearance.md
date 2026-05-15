---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 3.0 Visualizations Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, high_level_schema.md]
---

## 3.0 Visualizations Module
**Scope:** Arbor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Backend for Visual Interactive Displays (`dashboard_arbor.js`)
**Corresponds to Public Section:** 3.1 (Evidence Graph / Arbor Diagrams)
*(Note: Maps (3.3) and Timelines (3.2) are driven by `era`, `timeline`, and `map_label` set in §2.2 — they have no separate editor.)*
**Purpose:** Interactive drag-and-drop tool for building the recursive parent-child 'Arbor' evidence tree. Features a canvas-based node editor that mimics the frontend visualization.

**Plan:** `plan_dashboard_arbor.md`

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
parent_id         TEXT (Foreign Key)  — sets the recursive parent-child
                                        relationship between records

── READ ONLY (node display) ──────────────────────────────────────────────
id                TEXT               — node identifier
title             TEXT               — node label
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Refresh ]                      |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  (Root Node) --+-- (Child 1) --+-- (Sub 1)                                      |
|                |               |                                                |
|                |               +-- (Sub 2)                                      |
|                |                                                                |
|                +-- (Child 2) ----- (Sub 3)                                      |
|                                                                                 |
|  [Drag & Drop UI matching Frontend Arbor]                                       |
|                                                                                 |
|  Orphan Nodes (no parent_id):                                                   |
|  [Ascension ▼]  [Last Supper ▼]  [Transfiguration ▼]                            |
|                                                                                 |
|  Each node: [+Child] dropdown adds a child from orphan pool                      |
|  Each node: [Remove] promotes node to root (parent_id = null)                    |
|                                                                                 |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                 |
+---------------------------------------------------------------------------------+

── API ROUND-TRIP: dashboard_arbor.js → admin_api.py → SQLite ────────────────────────

  LOAD:  GET /api/admin/diagram/tree
         → SELECT id, title, parent_id FROM records ORDER BY title
         → Returns {"nodes": [{"id":"…","title":"…","parent_id":…}]}

  EDIT:  DnD updates window.__diagramNodes in memory
         Changes tracked in window.__changedNodes Map
         Every drag-and-drop re-parenting auto-saves as draft

  SAVE:  PUT /api/admin/diagram/tree
         Body: {"updates": [{"id":"…","parent_id":"…"},…]}
         → Validates IDs exist (422 if missing)
         → Detects direct circular refs (422 if found)
         → BEGIN TRANSACTION / UPDATE batch / COMMIT or ROLLBACK

  PUBLISH: Commit all draft parent_id changes to live
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_arbor.html` | Interactive diagram container |
| `css/3.0_visualizations/dashboard/dashboard_arbor.css` | Canvas & node aesthetics |
| `js/3.0_visualizations/dashboard/dashboard_arbor.js` | Module orchestration |
| `js/3.0_visualizations/dashboard/fetch_arbor_data.js` | API interface for tree fetching |
| `js/3.0_visualizations/dashboard/render_arbor_node.js` | Individual node creation |
| `js/3.0_visualizations/dashboard/draw_arbor_connections.js` | SVG/Canvas connection lines |
| `js/3.0_visualizations/dashboard/handle_node_drag.js` | Drag-and-drop interaction |
| `js/3.0_visualizations/dashboard/update_node_parent.js` | Parent-child re-assignment |

---

