---
name: guide_function.md
purpose: Visual ASCII representations of the shared dashboard tools and cross-cutting data flows — widgets, editor layout, and frontend utilities consumed by modules 2.0–7.0
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, vibe_coding_rules.md, guide_dashboard_appearance.md]
---

# Purpose of this document.

This document provides visual ASCII representations detailing how data physically flows through the shared cross-cutting tools of the 9.0 Cross-Cutting Standardization module. These tools are owned by the 9.0 module and consumed by dashboard editor modules across 2.0–7.0. Consumer plans MUST NOT create local copies — they include the owner's file via `<script>` or `<link>` tags and call the exposed `window.*` functions.

---

## 9.0 Shared Dashboard Tools — Ecosystem Overview

The 9.0 Cross-Cutting module owns the canonical copies of six shared dashboard tools and two shared CSS layouts. Each tool follows a consistent pattern: a `render*()` function wires the DOM, a `collect*()` function serialises the data, and an optional `set*()` / `populate*()` function hydrates from the record object.

**File Inventory:**
| Tool | JS File (js/9.0_cross_cutting/dashboard/) | CSS File (css/9.0_cross_cutting/dashboard/) |
|------|-------------------|---------------------|
| Metadata Widget (9.3) | `metadata_widget.js` | `metadata_widget.css` |
| MLA Widget (9.4) | `mla_source_handler.js` | `mla_widget.css` |
| Unique Identifiers (9.5) | `external_refs_handler.js` | `external_refs_widget.css` |
| Context Links (9.6) | `context_link_handler.js` | `context_links_widget.css` |
| Picture Widget (9.7) | `picture_handler.js` | `picture_widget.css` |
| ESV Widget (9.8) | `esv_api_config.js` | — |
| WYSIWYG Editor Layout | — | `wysiwyg_editor.css` |
| WYSIWYG Dashboard Layout | — | `wysiwyg_dashboard_layout.css` |
| Frontend Utilities | `js/9.0_cross_cutting/frontend/html_utils.js` | — |

**Consumer Modules:**
- Records Single (2.0) — consumes all six shared tools
- Challenge Response (4.0) — consumes picture, MLA, context_links, metadata widgets
- Context Essays (5.0) — consumes picture, MLA, context_links, metadata widgets + WYSIWYG layout
- Historiography (5.0) — consumes picture, MLA, context_links, metadata widgets + WYSIWYG layout
- Blog Posts (6.0) — consumes all six shared tools + WYSIWYG layout
- News Sources (6.0) — consumes snippet_generator, metadata tools
- Wikipedia (4.0) — consumes snippet_generator, metadata tools
- Frontend modules (4.0, 5.0, 6.0) — consume html_utils.js

**Load order convention:**
```text
dashboard.html <head>
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/wysiwyg_editor.css">
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css">
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/metadata_widget.css">
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/picture_widget.css">
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/mla_widget.css">
  ├── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/context_links_widget.css">
  └── <link rel="stylesheet" href="css/9.0_cross_cutting/dashboard/external_refs_widget.css">

dashboard.html <body> (end, before </body>)
  ├── <script src="js/9.0_cross_cutting/dashboard/metadata_widget.js">
  ├── <script src="js/9.0_cross_cutting/dashboard/picture_handler.js">
  ├── <script src="js/9.0_cross_cutting/dashboard/mla_source_handler.js">
  ├── <script src="js/9.0_cross_cutting/dashboard/context_link_handler.js">
  └── <script src="js/9.0_cross_cutting/dashboard/external_refs_handler.js">
```

---

## 9.7 Picture Widget — Image Upload Pipeline

**Purpose:** Shared image upload tool that handles client-side validation, preview rendering, and backend upload for record pictures. Consumer modules call `window.renderEditPicture(containerId, recordId)` to wire the file input and upload button, and `window.renderPictureName(containerId, pictureName)` to display the stored filename.

**Source:** `js/9.0_cross_cutting/dashboard/picture_handler.js`
**Style:** `css/9.0_cross_cutting/dashboard/picture_widget.css`

### Data Flow

```text
[ Admin views/edits a record with picture support ]
           |
           v
+---------------------------------------------------+
| Consumer orchestrator (e.g. dashboard_records_single.js)  |
| Calls window.renderEditPicture("picture-section", recordId) |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderEditPicture() wires the DOM:                |
|   - Locates #record-picture-upload (file input)   |
|   - Locates #picture-preview-full (full preview)  |
|   - Locates #picture-preview-thumb (thumbnail)    |
|   - Adds change listener on file input            |
|   - Enables/disables upload button based on state |
+---------------------------------------------------+
           |
           v
[ User selects a .png file ]
           |
           v
+---------------------------------------------------+
| Client-Side Validation (in change handler):       |
|   - Checks file.type === "image/png"              |
|   - Checks file.size <= 5 MB (MAX_PICTURE_SIZE)   |
|   On failure: window.surfaceError(msg)            |
|   On success: show preview thumbnails;            |
|     enable upload button                          |
+---------------------------------------------------+
           |
           v
[ User clicks upload button ]
           |
           v
+---------------------------------------------------+
| POST /api/admin/records/{recordId}/picture        |
| Body: FormData with file field                    |
| Headers: (no Content-Type — set by FormData)      |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| admin_api.py → image_processor.py                  |
|   - Validates content_type === "image/png"         |
|   - Sanitises filename (pathlib.Path)             |
|   - Resizes to max 800px width                    |
|   - Compresses to ≤250 KB:                        |
|      1st attempt: lossless PNG (optimize=True)    |
|      Fallback: PNG quantize loop (256→8 colors)   |
|   - Generates 200px thumbnail (PNG)               |
|   - Updates SQLite: picture_name, picture_bytes,  |
|     picture_thumbnail                             |
|   - Returns 200 JSON { picture_name, message }    |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderEditPicture() re-renders previews with      |
| the newly stored picture_name. Shows "Saved ✓"    |
| status for 1500ms.                                |
+---------------------------------------------------+
```

**API Contract:**
```
POST /api/admin/records/{recordId}/picture
  Request:  multipart/form-data (file field)
  Success:  200 { "message": "...", "picture_name": "..." }
  Error:    400 { "error": "Only PNG images are supported" }
            400 { "error": "No file uploaded" }
            404 { "error": "Record not found" }
            422 { "error": "Image processing failed" }

DELETE /api/admin/records/{recordId}/picture
  Success:  200 { "message": "Picture deleted" }
```

---

## 9.4 MLA Widget — Bibliography Editing Flow

**Purpose:** Shared MLA bibliography editor that renders three editable tables (Books, Articles, Websites) with inline add/remove buttons. Consumer modules call `window.renderEditBibliography(containerId)` to render the tables and `window.collectEditBibliography()` to retrieve the current state as a clean JSON array.

**Source:** `js/9.0_cross_cutting/dashboard/mla_source_handler.js`
**Style:** `css/9.0_cross_cutting/dashboard/mla_widget.css`

### Data Flow

```text
[ User opens a record/dashboard editor with MLA support ]
           |
           v
+---------------------------------------------------+
| Consumer orchestrator calls:                       |
| window.renderEditBibliography("mla-section")      |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderEditBibliography(containerId):               |
|   - Locates DOM container                          |
|   - Builds three tabular sections:                 |
|     Books:     Author | Title | Publisher | Year | Pages
|     Articles:  Author | Title | Journal | Volume | Year | Pages
|     Websites:  Author | Title | URL | Accessed Date
|   - Each row has a [×] Remove button              |
|   - Each section has a [+ Add] button             |
|   - Seeds rows from existing data if provided      |
+---------------------------------------------------+
           |
           v
[ User edits rows, adds new, removes existing ]
           |
           v
[ User saves the record ]
           |
           v
+---------------------------------------------------+
| Consumer orchestrator calls:                       |
| const mlaData = window.collectEditBibliography()   |
|   Returns: {                                       |
|     book: [{ author, title, publisher, year, pages }, ...],
|     article: [{ author, title, journal, volume, year, pages }, ...],
|     website: [{ author, title, url, accessed_date }, ...]
|   }                                                |
|   → Serialised to JSON and stored in the          |
|     `bibliography` column of the records table     |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| PUT /api/admin/records/{id}                        |
| Body: { bibliography: JSON.stringify(mlaData) }   |
| → admin_api.py validates + updates SQLite         |
| → Returns updated record fields                   |
+---------------------------------------------------+
```

**Field Definitions per Type:**
| Type | Fields | Widths |
|------|--------|--------|
| book | author, title, publisher, year, pages | 2fr, 2fr, 1fr, 0.7fr, 1fr |
| article | author, title, journal, volume, year, pages | 2fr, 2fr, 1fr, 0.7fr, 0.7fr, 1fr |
| website | author, title, url, accessed_date | 1.5fr, 2fr, 2.5fr, 1fr |

---

## 9.6 Context Links Widget — Link Management Flow

**Purpose:** Shared context link editor that lets users associate internal { slug, type } pairs with a record. Consumer modules call `window.renderEditLinks(containerId, contextLinksData)` to build the table editor and `window.collectEditLinks()` to retrieve the current link array.

**Source:** `js/9.0_cross_cutting/dashboard/context_link_handler.js`
**Style:** `css/9.0_cross_cutting/dashboard/context_links_widget.css`

### Data Flow

```text
[ User opens a record/dashboard editor ]
           |
           v
+---------------------------------------------------+
| Consumer orchestrator calls:                       |
| const existingLinks = record.context_links ?       |
|   JSON.parse(record.context_links) : [];          |
| window.renderEditLinks("links-container",         |
|   existingLinks)                                   |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderEditLinks() builds the editor:               |
|   - Renders existing { slug, type } rows as a     |
|     table with [×] Remove buttons                 |
|   - Renders a slug input + type dropdown +        |
|     [+ Add Link] button row                       |
|   - Wires Enter key on slug input to trigger add  |
|   - Internal state: _currentLinks[]               |
+---------------------------------------------------+
           |
           v
[ User adds a link: enters slug, selects type, clicks Add ]
           |
           v
+---------------------------------------------------+
| _handleAddLink():                                  |
|   - Reads slug input value                        |
|   - Reads type dropdown (rec|ess|blog)            |
|   - Validates non-empty slug                      |
|   - Pushes { slug, type } to _currentLinks[]      |
|   - Re-renders table + clears input               |
+---------------------------------------------------+
           |
           v
[ User saves the record ]
           |
           v
+---------------------------------------------------+
| Consumer calls:                                    |
| const links = window.collectEditLinks()            |
|   Returns: [{ slug: string, type: string }, ...]  |
|   → Serialised to JSON, stored in context_links   |
+---------------------------------------------------+
```

---

## 9.5 Unique Identifiers Widget — External References Flow

**Purpose:** Shared external references handler for the three standard unique identifier fields (IAA Reference, Pledius Reference, Manuscript Reference). Consumer modules call `window.renderExternalRefs(containerId)` to render the editor and `window.collectExternalRefs()` to retrieve the values as flat columns.

**Source:** `js/9.0_cross_cutting/dashboard/external_refs_handler.js`
**Style:** `css/9.0_cross_cutting/dashboard/external_refs_widget.css`

### Data Flow

```text
[ User opens a record/dashboard editor ]
           |
           v
+---------------------------------------------------+
| Consumer orchestrator calls:                       |
| window.renderExternalRefs("external-refs-section") |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderExternalRefs() builds the editor:            |
|   - Seeds three default rows if no entries exist: |
|     IAA Reference, Pledius Reference,              |
|     Manuscript Reference                           |
|   - Each row: editable Type | Value inputs + [×]   |
|   - [+ Add Row] button for custom identifiers     |
|   - Internal state: _entries[]                    |
+---------------------------------------------------+
           |
           v
[ User edits values ]
           |
           v
[ User saves the record ]
           |
           v
+---------------------------------------------------+
| Consumer calls:                                    |
| const refs = window.collectExternalRefs()         |
|   Returns: {                                       |
|     iaa: string,      // "IAA Reference" row      |
|     pledius: string,   // "Pledius Reference" row |
|     manuscript: string, // "Manuscript Reference"  |
|     entries: [{ type, value }, ...]  // extra rows |
|   }                                                |
|   → iaa, pledius, manuscript stored as flat       |
|     TEXT columns in the records table              |
|   → extra entries stored in metadata_json          |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| PUT /api/admin/records/{id}                        |
| Body: { iaa, pledius, manuscript }                |
+---------------------------------------------------+
```

**Canonical Mapping:**
| Row Type Label | Column Key | Note |
|----------------|-----------|------|
| IAA Reference | `iaa` | Internal Attestation Assessment |
| Pledius Reference | `pledius` | Pledius classification |
| Manuscript Reference | `manuscript` | Manuscript tradition reference |

---

## 9.3 Metadata Widget — Slug, Snippet & Keywords Generation Flow

**Purpose:** Shared DOM component providing a unified interface for auto-generating slug, snippet, and SEO keywords across all six consumer dashboard modules. Renders inside the sidebar (split-pane dashboards) or at the bottom of the work area (records single-editor). Calls backend generator endpoints that delegate to the DeepSeek LLM.

**Source:** `js/9.0_cross_cutting/dashboard/metadata_widget.js`
**Style:** `css/9.0_cross_cutting/dashboard/metadata_widget.css`

### Data Flow

```text
[ Dashboard orchestrator mounts ]
           |
           v
+---------------------------------------------------+
| Consumer calls:                                    |
| window.renderMetadataWidget("metadata-container",  |
|   {                                                |
|     onAutoSaveDraft: (recordData) => { ... },     |
|     getRecordTitle: () => title,                   |
|     getRecordId: () => id,                         |
|     descriptionContainerId: "desc-container"       |
|   })                                               |
+---------------------------------------------------+
           |
           v
+---------------------------------------------------+
| renderMetadataWidget() builds the widget:          |
|   - Slug: text input + [GENERATE] button          |
|   - Snippet: textarea + [GENERATE] button         |
|   - Keywords: tag chips + input + [Add] +         |
|     [GENERATE] button                              |
|   - Status: created_at / updated_at display       |
|   - [GENERATE ALL] button (fires all three)       |
|   - Internal state: activeKeywords[]               |
+---------------------------------------------------+
           |
     +-----+-----+-----+
     |     |     |     |
     v     v     v     v
   Slug   Snip   Kwds  All
   Gen    Gen    Gen   Gen
     |     |     |     |
     +--+--+     +--+--+
        |           |
        v           v
+-------------------+-----------------------------------+
| POST /api/admin/slug/generate                        |
| Body: { slug, content: record.title }                 |
| → slug_generator.py → agent_client.py → DeepSeek     |
| → Returns: { slug: "generated-slug" }                |
| → Populates slug input + syncs to #record-slug       |
+-------------------------------------------------------+
| POST /api/admin/snippet/generate                     |
| Body: { slug, content: description_paragraphs }      |
| → snippet_generator.py → agent_client.py → DeepSeek  |
| → Returns: { snippet: "..." }                        |
| → Populates snippet textarea                         |
+-------------------------------------------------------+
| POST /api/admin/metadata/generate                    |
| Body: { slug, content: description_paragraphs }      |
| → metadata_generator.py → agent_client.py → DeepSeek  |
| → Returns: { keywords: "tag1, tag2, ..." }           |
| → Populates keyword chips + stored as metadata_json  |
+-------------------------------------------------------+
           |
           v
+---------------------------------------------------+
| GENERATE ALL: fires all three POSTs via            |
| Promise.allSettled(), then calls                   |
| onAutoSaveDraft(recordData) which:                 |
|   - Syncs generated values to canonical form       |
|     fields (slug → #record-slug, snippet →         |
|     #snippet-editor, keywords → #metadata-json)    |
|   - Programmatically clicks #btn-save-draft        |
|   - Status handler gathers all form sections,      |
|     stringifies arrays to JSON, sends              |
|     PUT /api/admin/records/{id}                    |
+---------------------------------------------------+
```

**Placement Convention:**
```
Split-Pane Dashboards (Blog, Essay, Historiography, News, Challenge):
+---------------------+---------------------------+
|     SIDEBAR         |       WORK AREA           |
| +-----------------+ |                           |
| | METADATA WIDGET | |   (editor form)           |
| +-----------------+ |                           |
+---------------------+---------------------------+

Records Single-Editor:
+---------------------------------------------------+
|               WORK AREA (full width)               |
|  Section 7: METADATA & STATUS                      |
|  +-----------------------------------------------+ |
|  | METADATA WIDGET                                | |
|  +-----------------------------------------------+ |
+---------------------------------------------------+
```

---

## 9.1 / 9.2 — Unified WYSIWYG Dashboard Layout (CSS)

**Purpose:** Shared CSS namespace (`wysiwyg-*`) that standardises the split-pane layout for all markdown-editing dashboards (Essays, Historiography, Blog Posts, Challenge Response). The layout is defined in two CSS files that are loaded by `dashboard.html` and consumed by all WYSIWYG modules.

**Source Files:**
- `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` — Markdown input area, live preview pane, toolbar styling
- `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` — Split-pane grid, sidebar, function bar

### Layout Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  FUNCTION BAR (sticky)                                       │
│  [+ New]  |  [Save Draft] [Publish] [Delete]                │
└─────────────────────────────────────────────────────────────┘
┌──────────────────┬──┬───────────────────────────────────────┐
│  SIDEBAR         │  │  EDITOR AREA                          │
│  (260px)         │  │  (1fr)                                │
│                  │  │                                       │
│  ┌──────────────┐│  │  Title Input                          │
│  │ Search Bar   ││  │  ┌──────────────────────────────────┐ │
│  └──────────────┘│  │  │ Markdown Toolbar                 │ │
│                  │  │  └──────────────────────────────────┘ │
│  Published       │  │  ┌─────────────┐ ┌─────────────────┐  │
│  ┌──────────────┐│  │  │ Markdown    │ │ Live Preview    │  │
│  │ Item 1       ││  │  │ Input       │ │                 │  │
│  │ Item 2       ││  │  │             │ │                 │  │
│  └──────────────┘│  │  └─────────────┘ └─────────────────┘  │
│                  │  │                                       │
│  Drafts          │  │  MLA Bibliography (via §9.4)          │
│  ┌──────────────┐│  │  Context Links (via §9.6)             │
│  │ Item 1       ││  │  External Refs (via §9.5)             │
│  └──────────────┘│  │  Picture Upload (via §9.7)            │
│                  │  │                                       │
│  Metadata Widget │  │                                       │
│  (via §9.3)      │  │                                       │
└──────────────────┴──┴───────────────────────────────────────┘
```

### CSS Namespace

All unified dashboards use the `wysiwyg-*` BEM namespace. See `guide_style.md` for the full BEM class reference.

| CSS Class | Purpose | File |
|-----------|---------|------|
| `.wysiwyg-editor-layout` | Root grid container | `wysiwyg_dashboard_layout.css` |
| `.wysiwyg-sidebar` | Left sidebar (260px) | `wysiwyg_dashboard_layout.css` |
| `.wysiwyg-editor` | Right editor area (1fr) | `wysiwyg_dashboard_layout.css` |
| `.wysiwyg-toolbar` | Markdown formatting toolbar | `wysiwyg_editor.css` |
| `.wysiwyg-input` | Markdown textarea | `wysiwyg_editor.css` |
| `.wysiwyg-preview` | Live preview pane | `wysiwyg_editor.css` |
| `.wysiwyg-function-bar` | Top action bar | `wysiwyg_dashboard_layout.css` |

---

## 9.8 ESV Widget — Bible API Configuration (Placeholder)

**Purpose:** Placeholder configuration for the ESV Bible API integration. Currently provides the base URL and a proxy endpoint constant, plus a health-check update method. Ready for future scripture text lookup features (verse validation, reference display, inline Bible citations).

**Source:** `js/9.0_cross_cutting/dashboard/esv_api_config.js`

### Configuration

```text
window.esvConfig = {
  baseUrl: "https://api.esv.org/v3/passage/",
  proxyEndpoint: "/api/admin/esv/passage",
  isConfigured: false,
  updateFromHealth: function(healthData) { ... }
};
```

**Future Data Flow (when implemented):**
```text
[ User requests scripture passage lookup ]
           |
           v
[ Frontend → POST /api/admin/esv/passage ]
           |
           v
[ Backend proxy → ESV API (api.esv.org) ]
[ API key read from .env ESV_KEY ]
           |
           v
[ Response: passage text → frontend display ]
```

**Current Status:** Configured flag is set via `updateFromHealth()` when the system health endpoint reports `esv_api.status === "configured"`. No passage lookup is wired yet.

---

## Frontend Shared Utility — html_utils.js

**Purpose:** Shared HTML escaping and date formatting utilities consumed by frontend display modules across modules 4.0 (Ranked Lists), 5.0 (Essays & Responses), and 6.0 (News & Blog). Loaded via `<script>` tag before the consumer display script.

**Source:** `js/9.0_cross_cutting/frontend/html_utils.js`

### Data Flow

```text
[ User navigates to a frontend display page ]
           |
           v
[ Page loads html_utils.js via <script> tag ]
[ Registers global functions: ]
   - window.escapeHtml(str)     — sanitises user/DB content for DOM injection
   - window.formatDateLong(str) — formats ISO 8601 → "Month Day, Year"
           |
           v
[ Consumer display script (e.g. list_view_wikipedia.js) ]
   calls escapeHtml(record.title) before innerHTML assignment
   calls formatDateLong(record.created_at) for date display
```

**Functions:**
| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `escapeHtml(str)` | Raw string | Escaped string | Replaces &, <, >, " with HTML entities |
| `formatDateLong(isoString)` | ISO 8601 string | "January 15, 2026" | Locale-formatted long date |

**Ownership:** `plan_resolve_outstanding_issues` (stored in `js/9.0_cross_cutting/frontend/`)
**Consumers:** `plan_fix_frontend_schema_compliance` (Group C: T8–T14 frontend files)
