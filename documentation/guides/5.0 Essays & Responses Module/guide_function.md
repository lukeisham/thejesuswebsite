---
name: guide_function.md
purpose: Visual ASCII representations of Essays & Responses Module data flows — unified WYSIWYG dashboard, challenge response pipeline, historiography singleton
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, essays_responses_nomenclature.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

---

## 5.0 Essays & Responses Module Module

### 5.1 Unified WYSIWYG Dashboard Flow

> **Plan:** `plan_standardize_dashboard_wysiwyg.md` — unified all markdown-authoring dashboards under a shared split-pane layout (see `guide_dashboard_appearance.md` §9.0).

```text
 +---------------------------+       +---------------------------+
 |  5.1 Essays & Blog Posts  |       | 5.2 Challenge Response    |
 |                           |       |                           |
 |  Unified WYSIWYG Editor   |       |  Unified WYSIWYG Editor   |
 |  (wysiwyg-* namespace)   |       |  (wysiwyg-* namespace)   |
 |                           |       |                           |
 |  Sidebar: Published/      |       |  Sidebar: Academic/       |
 |  Drafts grouped lists     |       |  Popular grouped lists    |
 |  with search filter       |       |  with search filter       |
 +-----------+---------------+       +-------------+-------------+
             |                                     |
             v                                     v
 +-----------+-----------+         +---------------+-------------+
 |  Write Markdown via   |         |  Write Markdown via         |
 |  Split-Pane Editor    |         |  Split-Pane Editor          |
 |  (.wysiwyg-editor-    |         |  (.wysiwyg-editor-          |
 |   layout grid)        |         |   layout grid)              |
 +-----------+-----------+         +---------------+-------------+
             |                                     |
             +------------------+------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |               Admin Backend API -> Insert DB                |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |                 WASM Query (User Browser)                   |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |              Parse Markdown payload into HTML               |
 +-------------------------------------------------------------+
                                |
                       +--------+--------+
                       |                 |
                       v                 v
 +---------------------+--+  +----------+--------------+
 | Essay Typography Layout|  | Response Typography     |
 | (essay_layout.css)     |  | Layout (response_layout |
 +------------------------+  | .css)                   |
                             +-------------------------+
```

### 5.2 Challenge Response Pipeline

```text
Challenge List (Academic/Popular)
  │
  ├─ "Insert Response" button
  │     │
  │     └─ Dialog collects title → POST /api/admin/responses {parent_slug, title}
  │           │
  │           └─ Navigate to Challenge Response WYSIWYG (window._selectedRecordId)
  │
  └─ WYSIWYG Editor loads
        │
        ├─ GET /api/admin/records/{id} → populate editor
        ├─ PUT /api/admin/records/{id} → Save Draft / Publish
        ├─ DELETE /api/admin/records/{id} → Delete
        │
        └─ Output → challenge list pages (academic_challenge.html, popular_challenge.html)
```

### 5.3 Historiography Singleton Flow

```text
Module Mount (renderHistoriography)
  │
  └─ Auto-load: GET /api/admin/records/historiography
        │
        ├─ Populate editor (title, markdown, bibliography, etc.)
        ├─ Slug locked to "historiography" (not user-editable)
        ├─ Save → PUT /api/admin/records/historiography
        │
        └─ Output → historiography.html (single page)
```

> **Note:** `type='theological_essay'` and `type='spiritual_article'` share the same unified WYSIWYG dashboard flow as context essays (§5.1). They differ only in the `type` discriminator value and, for theological essays, the additional `ordo_salutis` field. All four essay types use the `dashboard_essay.js` orchestrator with a mode toggle.

---

