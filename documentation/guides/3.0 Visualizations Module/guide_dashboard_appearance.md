---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal screens for the 3.0 Visualizations Module — Arbor editor
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, guide_frontend_appearance.md, guide_function.md, visualizations_nomenclature.md]
---

## 3.0 Visualizations Module — Admin Dashboard

### 3.1 Arbor Diagram Editor

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >    |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Refresh ]                        |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  (Root Node) --+-- (Child 1) --+-- (Sub 1)                                     |
|                |               |                                                |
|                |               +-- (Sub 2)                                      |
|                |                                                                |
|                +-- (Child 2) ----- (Sub 3)                                      |
|                                                                                 |
|  [Full-width canvas: drag-and-drop recursive tree editor]                       |
|  Each .arbor-node-row: [grip] [label] [+Child] [Remove]                         |
|                                                                                 |
|  Orphan Nodes (parent_id = null):                                               |
|  [Ascension ▼]  [Last Supper ▼]  [Transfiguration ▼]                           |
|                                                                                 |
|  Drop zone: drag node here to detach (set parent_id = null)                     |
|                                                                                 |
+---------------------------------------------------------------------------------+
| [ Status Bar: "Saved as draft" / Error messages ]                               |
+---------------------------------------------------------------------------------+

NOTE: Timelines (3.2) and Maps (3.3) have no separate admin editor.
Timeline and map positions are driven by the 'era', 'timeline', and
'map_label' fields set in the §2.2 Records editing interface.
```

#### 3.1.1 Arbor Editor — DOM Structure

```text
<div id="providence-col-main" style="grid-template-columns: 1fr">
└── [dashboard_arbor.html template injected here]
    ├── <div class="arbor-function-bar">
    │   ├── <button id="arbor-save">Save Draft</button>
    │   ├── <button id="arbor-publish">Publish</button>
    │   └── <button id="arbor-refresh">Refresh</button>
    │
    ├── <div class="arbor-canvas" id="arbor-canvas">
    │   └── <ul class="arbor-tree-root">
    │       └── <li class="arbor-node-row" data-id="{id}" draggable="true">
    │           ├── <span class="arbor-grip">⋮⋮</span>
    │           ├── <span class="arbor-label">{title}</span>
    │           ├── <button class="arbor-add-child">+Child</button>
    │           ├── <button class="arbor-remove">Remove</button>
    │           └── <ul>  ← Recursive children
    │
    ├── <svg class="arbor-connections-svg">
    │   └── <path>  ← Cubic bezier lines between parent/child rows
    │
    └── <div class="arbor-orphan-pool" id="arbor-orphan-pool">
        └── <div class="arbor-orphan-item" data-id="{id}" draggable="true">
            └── {title} ▼
```

#### 3.1.2 Arbor Editor — API Round-Trip

```text
LOAD:   GET /api/admin/diagram/tree
        → SELECT id, title, parent_id FROM records ORDER BY title
        → Returns {"nodes": [{id, title, parent_id}, ...]}

EDIT:   DnD updates window.__diagramNodes in memory
        Changes tracked in window.__changedNodes Map
        Every drag re-parenting auto-saves as draft via PUT

SAVE:   PUT /api/admin/diagram/tree
        Body: {"updates": [{id, parent_id}, ...]}
        → Validates IDs exist (422 if missing)
        → Detects direct circular refs (422 if found)
        → BEGIN TRANSACTION / UPDATE batch / COMMIT or ROLLBACK

PUBLISH: Commits all draft parent_id changes to live
REFRESH: Re-fetches tree from backend, discards un-persisted state
```


