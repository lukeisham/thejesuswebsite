---
name: guide_function.md
purpose: Simplified ASCII pipeline diagrams and technical summary for all 9.0 Cross-Cutting Standardization sub-modules
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, cross_cutting_nomenclature.md, guide_dashboard_appearance.md]
---

# 9.0 Cross-Cutting Standardization — Function

```text
              SHARED WIDGET LIFECYCLE: RENDER → EDIT → COLLECT

  [Consumer Module]                              [9.0 Shared Widget]
       |                                                |
       |  window.render*(containerId)                   |
       +----------------------------------------------->|
       |                                     builds DOM |
       |                                    wires events|
       |                                                |
       |  window.load*/set*/populate*(data)             |
       +----------------------------------------------->|
       |                            hydrates from record|
       |                                                |
       |  [ ··· user edits fields ··· ]                 |
       |                                                |
       |  const payload = window.collect*()             |
       +----------------------------------------------->|
       |                            returns clean JSON  |
       |<-----------------------------------------------+
       |                                                |
       |  PUT /api/admin/records/{id}                   |
       +-----> [SQLite]                                 |
```

```text
                 PICTURE UPLOAD PIPELINE (§9.7)

  [File Input]                [Client]                [Server]
       |                         |                       |
       | user selects .png       |                       |
       +------------------------>|                       |
       |              validates: |                       |
       |         MIME = image/png|                       |
       |         size ≤ 5 MB     |                       |
       |         shows previews  |                       |
       |                         |                       |
       | user clicks Upload      |                       |
       +------------------------>|                       |
       |           POST /api/admin/records/{id}/picture  |
       |                         +---------------------->|
       |                         |     image_processor.py|
       |                         |     resize → 800px    |
       |                         |     compress ≤ 250 KB |
       |                         |     thumbnail → 200px |
       |                         |     → SQLite UPDATE   |
       |                         |<----------------------+
       |                         |  { picture_name }     |
       |              re-renders |                       |
       |              previews   |                       |
```

```text
              MLA BIBLIOGRAPHY PIPELINE (§9.4)

  [Consumer]                  [mla_source_handler.js]       [API]
       |                              |                       |
       | renderEditBibliography()     |                       |
       +----------------------------->|                       |
       |            builds 3 tables:  |                       |
       |            Books, Articles,  |                       |
       |            Websites          |                       |
       |                              |                       |
       | loadEditBibliography(data)   |                       |
       +----------------------------->|                       |
       |            hydrates rows     |                       |
       |                              |                       |
       | collectEditBibliography()    |                       |
       +----------------------------->|                       |
       |<-----------------------------+                       |
       | { book:[], article:[],       |                       |
       |   website:[] }               |                       |
       |                              |                       |
       | PUT body.bibliography = JSON |                       |
       +----------------------------------------------------->|
```

```text
           METADATA GENERATION PIPELINE (§9.3)

  [Metadata Widget]           [Backend Generators]     [DeepSeek]
       |                              |                     |
       | [GENERATE] slug              |                     |
       | POST /api/admin/slug/generate|                     |
       +----------------------------->|                     |
       |                              | agent_client.py     |
       |                              +------------------->|
       |                              |<-------------------+
       |<-----------------------------+                     |
       | → populates slug input       |                     |
       |                              |                     |
       | [GENERATE] snippet           |                     |
       | POST /api/admin/snippet/generate                   |
       +----------------------------->|-------------------->|
       |<-----------------------------+<-------------------+
       | → populates snippet textarea |                     |
       |                              |                     |
       | [GENERATE] keywords          |                     |
       | POST /api/admin/metadata/generate                  |
       +----------------------------->|-------------------->|
       |<-----------------------------+<-------------------+
       | → populates keyword chips    |                     |
       |                              |                     |
       | [GENERATE ALL]               |                     |
       | fires all 3 via              |                     |
       | Promise.allSettled()          |                     |
       | → triggers onAutoSaveDraft() |                     |
```

```text
         CONTEXT LINKS & EXTERNAL REFS PIPELINES (§9.5–§9.6)

  Context Links (context_link_handler.js):
  ┌──────────────┐    ┌──────────────────┐    ┌────────────┐
  │ renderEdit   │───>│ _currentLinks[]  │───>│ collectEdit│
  │ Links()      │    │ {slug, type}     │    │ Links()    │
  │ hydrate from │    │ add/remove rows  │    │ returns    │
  │ record       │    │                  │    │ clean copy │
  └──────────────┘    └──────────────────┘    └────────────┘

  External Refs (external_refs_handler.js):
  ┌──────────────┐    ┌──────────────────┐    ┌────────────┐
  │ renderExt    │───>│ _entries[]       │───>│ collectExt │
  │ ernalRefs()  │    │ 3 default rows:  │    │ ernalRefs()│
  │ seeds IAA,   │    │ IAA, Pledius,    │    │ returns    │
  │ Pledius, MS  │    │ Manuscript       │    │ {iaa,      │
  └──────────────┘    │ + custom rows    │    │  pledius,  │
                      └──────────────────┘    │  manuscript│
                                              │  entries[]}│
                                              └────────────┘
```

```text
           ERROR HANDLER PIPELINE (§9.9)

  [Any Module]                [error_handler.js]        [DOM]
       |                            |                     |
       | window.surfaceError(msg)   |                     |
       +--------------------------->|                     |
       |              DOMReady?     |                     |
       |              ├─ No: queue  |                     |
       |              │  _errorQueue|                     |
       |              │  .push(msg) |                     |
       |              └─ Yes: flush |                     |
       |                 all queued |                     |
       |                 + current  |                     |
       |                            +-------------------->|
       |                            | #admin-error-footer |
       |                            | textContent = msg   |
```

```text
         FRONTEND HTML UTILS PIPELINE (§9.10)

  [Page Load]              [html_utils.js]         [Consumer Script]
       |                         |                        |
       | <script> tag loads      |                        |
       +------------------------>|                        |
       |  registers on window:   |                        |
       |  escapeHtml(str)        |                        |
       |  formatDateLong(iso)    |                        |
       |                         |                        |
       |                         |     escapeHtml(title)  |
       |                         |<-----------------------+
       |                         +----------------------->|
       |                         | safe HTML entity string|
```

The 9.0 Cross-Cutting Standardization module owns the canonical copies of six shared dashboard widgets, two shared CSS layouts, a universal error handler, and a frontend utility library — all consumed by modules 2.0 through 7.0 via `<script>` and `<link>` tags with `window.*` function APIs. Every widget follows a consistent three-phase lifecycle: `render*()` builds the DOM and wires event listeners into a target container, an optional `load*()`/`set*()`/`populate*()` hydrates the widget from existing record data, and `collect*()` returns a clean JSON payload with empty entries filtered out for inclusion in the PUT request. Internal state (such as `_currentLinks[]`, `_entries[]`, and `activeKeywords[]`) is held in module-scoped variables and accessed only through the collect/set API, never via direct global access. The Picture Widget (`picture_handler.js`) validates MIME type (`image/png`) and enforces a 5 MB client-side size limit before uploading via `POST /api/admin/records/{id}/picture`; the server-side `image_processor.py` resizes to 800px full width, compresses to 250 KB or below via progressive PNG quantisation (256 → 8 colours), and generates a 200px thumbnail. The MLA Bibliography Widget (`mla_source_handler.js`) renders three citation-type tables (Books, Articles, Websites) with per-row inline editing and add/remove controls, storing the result as a JSON blob in the `bibliography` column. The Context Links Widget (`context_link_handler.js`) manages `{slug, type}` cross-reference pairs with valid types `record`, `essay`, `blog`, and `response`. The External Refs Widget (`external_refs_handler.js`) seeds three default identifier rows (IAA, Pledius, Manuscript) and supports custom rows, returning both legacy flat keys and a modern entries array for backward compatibility. The Metadata Widget (`metadata_widget.js`) provides slug, snippet, and keyword generation via three DeepSeek API endpoints (`/api/admin/slug/generate`, `/api/admin/snippet/generate`, `/api/admin/metadata/generate`) routed through `agent_client.py`, with a Generate All button that fires all three via `Promise.allSettled()` and triggers `onAutoSaveDraft()` on completion. The ESV API Config (`esv_api_config.js`) is a placeholder exposing `window.esvConfig` with base URL and proxy endpoint constants, activated when the system health check reports ESV API status as configured. The Error Handler (`error_handler.js`) provides `window.surfaceError()` as the universal status/error messaging function, buffering calls in `_errorQueue` before DOMContentLoaded and flushing to `#admin-error-footer` once the DOM is ready. The two WYSIWYG CSS files (`wysiwyg_editor.css` and `wysiwyg_dashboard_layout.css`) define the unified `wysiwyg-*` BEM namespace used by the Essay, Historiography, Blog Post, and Challenge Response dashboards — a split-pane layout with sticky function bar, sidebar document list, and dual-pane markdown editor with live preview. The frontend utility `html_utils.js` exposes `window.escapeHtml()` for safe DOM content injection and `window.formatDateLong()` for ISO 8601 date formatting, consumed by all public-facing display scripts.
