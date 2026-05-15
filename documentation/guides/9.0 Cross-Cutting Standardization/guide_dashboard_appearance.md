---
name: guide_dashboard_appearance.md
purpose: ASCII visual representations of each shared cross-cutting widget and layout as they appear in the dashboard UI
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, cross_cutting_nomenclature.md, guide_function.md]
---

# 9.0 Cross-Cutting Standardization — Dashboard Appearance

## 9.7 Picture Widget

```text
┌─ Picture Upload ──────────────────────────────────────────────┐
│                                                               │
│  ┌───────────────────┐    ┌──────────┐                       │
│  │                   │    │          │                        │
│  │  Full Preview     │    │  Thumb   │                        │
│  │  (400 × 300)      │    │ (200×150)│                        │
│  │                   │    │          │                        │
│  │  .picture-preview │    │ .picture │                        │
│  │  --full           │    │ -preview │                        │
│  │                   │    │ --thumb  │                        │
│  └───────────────────┘    └──────────┘                       │
│                                                               │
│  ┌─────────────────────────────────────────┐                 │
│  │ Choose File   [ no file chosen ]        │                 │
│  │ #record-picture-upload (input[file])    │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
│  [ Upload Picture ]   [ Delete Picture ]                     │
│                                                               │
│  Picture name: ______________________________                │
│  #record-picture-name (read-only display)                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 9.4 MLA Bibliography Editor

```text
┌─ Bibliography ─ .bibliography-editor ─────────────────────────┐
│                                                               │
│  ── Books ── .bibliography-editor__section ──────────────     │
│  ┌────────┬────────┬───────────┬──────┬───────┬───┐          │
│  │ Author │ Title  │ Publisher │ Year │ Pages │ × │          │
│  ├────────┼────────┼───────────┼──────┼───────┼───┤          │
│  │ [____] │ [____] │ [_______] │ [__] │ [___] │ × │          │
│  │ [____] │ [____] │ [_______] │ [__] │ [___] │ × │          │
│  └────────┴────────┴───────────┴──────┴───────┴───┘          │
│  [+ Add Book]                                                │
│                                                               │
│  ── Articles ────────────────────────────────────────         │
│  ┌────────┬────────┬─────────┬────────┬──────┬───────┬───┐   │
│  │ Author │ Title  │ Journal │ Volume │ Year │ Pages │ × │   │
│  ├────────┼────────┼─────────┼────────┼──────┼───────┼───┤   │
│  │ [____] │ [____] │ [_____] │ [____] │ [__] │ [___] │ × │   │
│  └────────┴────────┴─────────┴────────┴──────┴───────┴───┘   │
│  [+ Add Article]                                             │
│                                                               │
│  ── Websites ────────────────────────────────────────         │
│  ┌────────┬────────┬─────────────────┬──────────────┬───┐    │
│  │ Author │ Title  │ URL             │ Accessed Date│ × │    │
│  ├────────┼────────┼─────────────────┼──────────────┼───┤    │
│  │ [____] │ [____] │ [_____________] │ [__________] │ × │    │
│  └────────┴────────┴─────────────────┴──────────────┴───┘    │
│  [+ Add Website]                                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 9.6 Context Links Editor

```text
┌─ Context Links ─ .context-links-editor ───────────────────────┐
│                                                               │
│  ┌──────────────────────────┬────────────────┬───┐           │
│  │ Slug                     │ Type           │   │           │
│  ├──────────────────────────┼────────────────┼───┤           │
│  │ [resurrection-of-jesus ] │ [▼ record    ] │ × │           │
│  │ [empty-tomb-evidence   ] │ [▼ essay     ] │ × │           │
│  │ [easter-traditions     ] │ [▼ blog      ] │ × │           │
│  └──────────────────────────┴────────────────┴───┘           │
│                                                               │
│  ┌──────────────────────────┬────────────────┐               │
│  │ [slug___________________]│ [▼ record    ] │  [+ Add Link] │
│  └──────────────────────────┴────────────────┘               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 9.5 External References (Unique Identifiers) Editor

```text
┌─ Unique Identifiers ─ .external-refs-editor ──────────────────┐
│                                                               │
│  ┌──────────────────────┬─────────────────────────────┬───┐  │
│  │ Type                 │ Value                       │   │  │
│  ├──────────────────────┼─────────────────────────────┼───┤  │
│  │ IAA Reference        │ [_________________________] │ × │  │
│  │ Pledius Reference    │ [_________________________] │ × │  │
│  │ Manuscript Reference │ [_________________________] │ × │  │
│  ├──────────────────────┼─────────────────────────────┼───┤  │
│  │ [custom type_______] │ [_________________________] │ × │  │
│  └──────────────────────┴─────────────────────────────┴───┘  │
│                                                               │
│  [+ Add Row]                                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 9.3 Metadata Widget

```text
┌─ Metadata & SEO ─ .metadata-widget ───────────────────────────┐
│                                                               │
│  Slug                                                        │
│  ┌──────────────────────────────────────┐  ┌──────────────┐  │
│  │ [resurrection-of-jesus_____________] │  │  GENERATE    │  │
│  └──────────────────────────────────────┘  └──────────────┘  │
│                                                               │
│  Snippet                                                     │
│  ┌──────────────────────────────────────┐  ┌──────────────┐  │
│  │ [Auto-generated or manual summary  ]│  │  GENERATE    │  │
│  │ [_________________________________ ]│  │              │  │
│  └──────────────────────────────────────┘  └──────────────┘  │
│                                                               │
│  Keywords                                  ┌──────────────┐  │
│  ┌──────────────────────────────────────┐  │  GENERATE    │  │
│  │ [keyword________] [Add]              │  │              │  │
│  └──────────────────────────────────────┘  └──────────────┘  │
│  ┌────────┐ ┌──────┐ ┌───────────┐                          │
│  │ jesus ×│ │ tomb×│ │ evidence ×│  .metadata-widget__tag    │
│  └────────┘ └──────┘ └───────────┘                          │
│                                                               │
│  Created: 2026-01-15    Updated: 2026-05-10                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                    GENERATE ALL                          ││
│  │          .metadata-widget__generate-all                  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Metadata Widget Placement

**Split-pane dashboards** (Essays, Blog Posts, Challenge Response, News Sources):

```text
┌──────────────────┬──┬───────────────────────────────────────┐
│  SIDEBAR (260px) │  │  EDITOR AREA (1fr)                    │
│                  │  │                                       │
│  Published list  │  │  (title, body, widgets …)             │
│  Drafts list     │  │                                       │
│                  │  │                                       │
│  ┌──────────────┐│  │                                       │
│  │ METADATA     ││  │                                       │
│  │ WIDGET       ││  │                                       │
│  │ (see above)  ││  │                                       │
│  └──────────────┘│  │                                       │
└──────────────────┴──┴───────────────────────────────────────┘
```

**Records single-editor** (full-width, Section 7):

```text
┌───────────────────────────────────────────────────────────────┐
│  Section 1–6: Core IDs, Images, Description, …              │
│                                                               │
│  Section 7: Metadata & Status                                │
│  ┌───────────────────────────────────────────────────────────┐│
│  │ METADATA WIDGET (see above)                               ││
│  └───────────────────────────────────────────────────────────┘│
│  Status: (•) Draft  ( ) Published                            │
└───────────────────────────────────────────────────────────────┘
```

## 9.1 / 9.2 WYSIWYG Dashboard Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  .wysiwyg-function-bar (sticky)                              │
│  [+ New]  |  [Save Draft] [Publish] [Delete]                │
└─────────────────────────────────────────────────────────────┘
┌──────────────────┬──┬───────────────────────────────────────┐
│  .wysiwyg-       │  │  .wysiwyg-editor-area                │
│  sidebar (260px) │  │                                       │
│                  │  │  .wysiwyg-editor-field--title          │
│  ┌──────────────┐│  │  ┌──────────────────────────────────┐ │
│  │ Search       ││  │  │ .markdown-toolbar                │ │
│  └──────────────┘│  │  │ [B] [I] [H1] [H2] [Link] [IMG]  │ │
│                  │  │  └──────────────────────────────────┘ │
│  Published       │  │  ┌───────────────┐ ┌────────────────┐ │
│  ┌──────────────┐│  │  │ .markdown-    │ │ .markdown-     │ │
│  │ Item 1 ──────││  │  │  editor-      │ │  editor-       │ │
│  │ Item 2       ││  │  │  textarea     │ │  preview       │ │
│  │ Item 3       ││  │  │               │ │                │ │
│  └──────────────┘│  │  │  (raw MD)     │ │  (rendered)    │ │
│                  │  │  └───────────────┘ └────────────────┘ │
│  Drafts          │  │                                       │
│  ┌──────────────┐│  │  ┌──────────────────────────────────┐ │
│  │ Item 1       ││  │  │ MLA Bibliography (§9.4)          │ │
│  └──────────────┘│  │  │ Context Links (§9.6)             │ │
│                  │  │  │ External Refs (§9.5)             │ │
│  ┌──────────────┐│  │  │ Picture Upload (§9.7)            │ │
│  │ METADATA     ││  │  └──────────────────────────────────┘ │
│  │ WIDGET (§9.3)││  │                                       │
│  └──────────────┘│  │                                       │
└──────────────────┴──┴───────────────────────────────────────┘
```

### WYSIWYG Module Variants

| Module | Sidebar | Slug | Picture | Auto-Load |
|--------|---------|------|---------|-----------|
| Essays | Published/Drafts, search | Editable | Yes | No |
| Blog Posts | Published/Drafts, search | Editable | Yes | No |
| Challenge Response | Academic/Popular grouped, search | Editable | No | No |
| Historiography | None (singleton) | Locked `"historiography"` | Yes | Yes |

## 9.9 Error Footer

```text
┌─────────────────────────────────────────────────────────────┐
│  #admin-error-footer                                         │
│  [ Status message or error appears here ]                   │
│  .state-success | .state-error | .is-warn                   │
└─────────────────────────────────────────────────────────────┘
```
