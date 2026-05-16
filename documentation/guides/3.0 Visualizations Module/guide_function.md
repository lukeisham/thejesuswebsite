---
name: guide_function.md
purpose: Life-cycle diagrams and functional descriptions for the three Visualizations sub-modules — Arbor, Timeline, Maps
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, visualizations_nomenclature.md]
---

## 3.0 Visualizations Module

### 3.1 Arbor (Evidence Diagram) — Life Cycle

```text
+------------------------------------------------------------------+
|  ADMIN: dashboard_arbor.js — renderArbor()                        |
|                                                                    |
|  1. _setLayoutColumns(false, '1fr') — full-width canvas            |
|  2. Injects dashboard_arbor.html into #providence-col-main        |
|  3. Calls _loadAndRenderTree()                                     |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  fetch_arbor_data.js                                              |
|                                                                    |
|  GET /api/admin/diagram/tree → admin_api.py → SQLite              |
|  Returns flat array: [{id, title, parent_id}, ...]                |
|  On failure → surfaceError("Unable to load the arbor diagram...")  |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  _loadAndRenderTree() — In-Memory Assembly                        |
|                                                                    |
|  1. Builds Map<id, {id, title, parent_id, children[]}>            |
|  2. Assembles children arrays & orphan list (parent_id = null)    |
|  3. Stores in window.__diagramNodes, window.__arborOrphans         |
|  4. Initialises window.__changedNodes = new Map()                  |
+----------------------------------+-------------------------------+
                                   |
                    +--------------+---------------+
                    v                              v
+---------------------------+  +--------------------------------------+
| render_arbor_node.js      |  | draw_arbor_connections.js            |
| Recursively creates <li>  |  | Queries DOM .arbor-node-row positions|
| with grip, label, id,     |  | Draws cubic bezier SVG <path> lines  |
| [+Child], [Remove] btns   |  | parent right edge → child left edge  |
+---------------------------+  +--------------------------------------+
                    |
                    v
+------------------------------------------------------------------+
|  handle_node_drag.js — setupNodeDrag()                            |
|                                                                    |
|  Attaches HTML5 DnD listeners to every .arbor-node-row            |
|  Orphan pool drop zone (detach → parent_id = null)                |
|  Validates: no self-drop, no circular references                   |
|  On valid drop → window.updateNodeParent(childId, newParentId)    |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  update_node_parent.js                                            |
|                                                                    |
|  1. Records old_parent_id for rollback                            |
|  2. Optimistically updates window.__diagramNodes                   |
|  3. Tracks change in window.__changedNodes                         |
|  4. Rebuilds tree (_rebuildTreeFromMap) + re-renders UI            |
|  5. PUT /api/admin/diagram/tree → auto-saves as draft             |
|     On failure → rollback in-memory state + surfaceError           |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  PUBLISH (explicit admin action)                                  |
|                                                                    |
|  Gathers all window.__changedNodes entries                         |
|  PUT /api/admin/diagram/tree with full batch                      |
|  Validates IDs exist (422), checks circular refs (422)            |
|  BEGIN TRANSACTION → UPDATE batch → COMMIT or ROLLBACK            |
|  On success → clears window.__changedNodes                         |
+------------------------------------------------------------------+
```

### 3.2 Timeline — Life Cycle

```text
+------------------------------------------------------------------+
|  DOMContentLoaded → initTimelineSystem()                          |
|  File: js/3.0_visualizations/frontend/timeline_display.js         |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  WASM SQLite Query (in-browser, read-only)                        |
|                                                                    |
|  SELECT id, title, timeline, era, gospel_category,                |
|         description, primary_verse, slug, map_label               |
|  FROM records                                                      |
|  WHERE timeline IS NOT NULL                                        |
|    AND type = 'record'                                             |
|    AND status = 'published'                                        |
|  LIMIT 200                                                         |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Zone Classification (from map_label field)                        |
|                                                                    |
|  map_label = 'supernatural' → zone "supernatural" (Y=50-150)     |
|  map_label = 'spiritual'    → zone "spiritual"    (Y=360-500)    |
|  all others                 → zone "default"      (Y=300 axis)   |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  renderTimelineNodes(records, scale)                               |
|                                                                    |
|  Default nodes: grouped by timeline stage                          |
|    X = TIMELINE_STAGES.indexOf(stage) * 80 + 100                  |
|    Y = 300 + offset (stacked column centered on axis)             |
|    nodeSpacing = 14 + (scale - 1) * 7                             |
|  Supernatural nodes: era-spread cloud at top                       |
|    X = stage position, Y = deterministicScatter(50-150)           |
|  Spiritual nodes: scattered below axis                             |
|    X = deterministicScatter(100-2000)                              |
|    Y = deterministicScatter(360-500)                               |
|  Axis labels rendered below each stage's stacked column            |
|  SVG viewBox width adjusted to fit max node X + 300                |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Interactive Controls                                              |
|                                                                    |
|  Zoom In/Out: re-renders with new scale (0.5x – 3x)              |
|    Recalculates nodeSpacing and re-renders all nodes               |
|  Era Navigation: scrollToEra(index) smooth-scrolls wrapper         |
|    Prev/Next buttons cycle through TIMELINE_STAGES (37 stages)    |
|  Node Click: adds .selected class, calls showMetadata(record)     |
|    → Populates #timeline-metadata-panel (title, era, verse, etc.) |
+------------------------------------------------------------------+
```

### 3.3 Maps — Life Cycle

```text
+------------------------------------------------------------------+
|  DOMContentLoaded → initMapSystem()                               |
|  File: js/3.0_visualizations/frontend/maps_display.js             |
|  NOTE: Basic placeholder implementation for future expansion       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  WASM SQLite Query (in-browser, read-only)                        |
|                                                                    |
|  SELECT id, title, slug, era, gospel_category,                    |
|         description, primary_verse                                 |
|  FROM records                                                      |
|  LIMIT 100                                                         |
|                                                                    |
|  map_label: placeholder assignment (id % 2 → judea/galilee)       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  renderNodesForView(viewName, records)                             |
|                                                                    |
|  Filters records by map_label matching selected radio view         |
|  ("empire" shows all records regardless of label)                  |
|  Positions: deterministic pseudo-random from record.id             |
|    X = 150 + (id * 83 % 700)                                      |
|    Y = 150 + (id * 111 % 500)                                     |
|  Creates <circle> in #node-layer with class .map-node-item        |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Interactive Controls                                              |
|                                                                    |
|  View Radio Buttons: Empire, Levant, Judea, Galilee, Jerusalem    |
|    Switching view re-renders all nodes for that filter              |
|  Zoom In/Out: CSS transform scale (logarithmic, 1x – 5x)         |
|  Era Slider: range input -100 to 100 (BC/AD)                      |
|    filterNodesByEra() shows/hides nodes within ±40yr window        |
|  Node Click: shows metadata panel (title, era, category, verse)   |
|    Deep-links to /record/{slug}                                    |
+------------------------------------------------------------------+
```

### 3.1 Arbor — Functional Description

The Arbor sub-module renders a recursive parent-child evidence tree as an interactive SVG. On the public side, `ardor_display.js` fetches the published tree from `/api/public/diagram/tree`, constructs root nodes (records with null or orphaned `parent_id`), and performs a depth-first layout pass that centers parents above their children using cubic bezier edge connectors. Each node displays a truncated title and optional verse reference within a rect boundary. On the admin side, the dashboard editor (`dashboard_arbor.js`) orchestrates six decomposed files — fetching, rendering, connection drawing, drag-and-drop handling, and parent reassignment — providing optimistic in-memory updates with PUT-based auto-save and explicit publish/refresh flows.

### 3.2 Timeline — Functional Description

The Timeline sub-module renders a horizontally-scrolling SVG chronological display driven by the `timeline`, `era`, and `map_label` fields stored in the records table. It queries only published records via WASM SQLite, classifies each into one of three zones based on `map_label` — supernatural nodes form a loose cloud at the top (Y=50–150), spiritual nodes scatter below the axis (Y=360–500) using deterministic hashing, and all other nodes stack in vertical columns centered on the main axis (Y=300) grouped by their 37-stage timeline position. Zoom controls re-render the layout with recalculated node spacing rather than CSS scaling, era navigation smooth-scrolls to named stages, and clicking a node reveals a metadata panel with title, era/timeline breadcrumb, category, verse reference, and a deep-link to the full record page.

### 3.3 Maps — Functional Description

The Maps sub-module is a basic placeholder implementation scaffolding future geospatial expansion. It loads up to 100 records from WASM SQLite without geographic filtering (the `map_label` field is currently assigned by a modulo placeholder rather than real coordinates), and distributes them as SVG circles with deterministic pseudo-random positions derived from record IDs. Five radio-button views (Empire, Levant, Judea, Galilee, Jerusalem) filter the display, a temporal range slider shows/hides nodes within a ±40-year window, and logarithmic zoom scales the canvas from 1x to 5x. The static SVG base layer renders placeholder geographic outlines and region labels. Node clicks populate a metadata panel identical in structure to the Timeline panel, linking through to record pages.
