---
name: guide_function.md
purpose: Visual ASCII representations of Essays & Responses Module data flows — essay WYSIWYG lifecycle, historiography singleton, challenge response pipeline, and frontend rendering
version: 2.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, essays_responses_nomenclature.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

## 5.0 Essays & Responses Module

### 5.1 Essay Life Cycle

```text
+------------------------------------------------------------------+
|  ADMIN ESSAY DASHBOARD                                            |
|                                                                    |
|  dashboard_app.js -> loadModule("essay")                           |
|  -> window.renderEssay()                                           |
|                                                                    |
|  1. Fetches /admin/frontend/dashboard_essay.html                   |
|  2. Injects sidebar via _setColumn("sidebar")                      |
|  3. Injects function bar + editor via _setColumn("main")           |
|  4. Calls displayEssayHistoriographyList("essay") for sidebar      |
|  5. Calls initMarkdownEditor("") for WYSIWYG split-pane            |
|  6. Calls initDocumentStatusHandler() for Save/Publish/Delete      |
|  7. Calls initEssaySearch() for sidebar filter                     |
|  8. Wires "+ New Context Essay" button                              |
|  9. Wires shared tools (picture_handler, mla_source_handler,       |
|     context_link_handler, external_refs_handler, metadata_widget)  |
+----------------------------------+-------------------------------+
                                   |
                    +--------------+---------------+
                    |                              |
                    v                              v
+-----------------------------------+  +-----------------------------------+
| "+ NEW CONTEXT ESSAY" BUTTON      |  | SIDEBAR LIST                      |
|                                   |  | (essay_historiography_list_       |
| _handleNewEssay():                |  |  display.js)                      |
| 1. Generate "Untitled N" title    |  |                                   |
| 2. POST /api/admin/records        |  | GET /api/admin/essays             |
|    { title, type: context_essay,  |  | Groups by status:                 |
|      body: "", status: draft }    |  |   *Published* — published         |
| 3. Update _essayModuleState       |  |   *Drafts*    — draft             |
| 4. Clear editor + reset tools     |  | Click item ->                     |
| 5. Refresh sidebar list           |  |   loadDocumentContent(slug)       |
+-----------------------------------+  |   GET /api/admin/records/{id}     |
                                       |   Populates: title, body,         |
                                       |   snippet, bibliography,          |
                                       |   context_links, picture,         |
                                       |   external refs, metadata         |
                                       +----------------+------------------+
                                                        |
                                                        v
+------------------------------------------------------------------+
|  WYSIWYG EDITOR (shared wysiwyg-* BEM namespace)                 |
|                                                                    |
|  Split-pane: markdown_editor.js                                    |
|  +---------------------------+-----------------------------------+ |
|  | Sidebar (360px)           | Main Editor Area                 | |
|  | Search: [filter]          | Title: [______________]          | |
|  | *Published*               | [B][I][U][Link][Image][Code]     | |
|  | - Essay 1                 | +-----------------------------+  | |
|  | *Drafts*                  | | Markdown  | Live Preview    |  | |
|  | - Draft A                 | | textarea  | (rendered HTML) |  | |
|  |                           | +-----------------------------+  | |
|  | Metadata Widget:          | MLA Sources (bibliography)       | |
|  | [slug][snippet]           | Context Links                    | |
|  | [keywords][timestamps]    | Picture Upload (full + thumb)    | |
|  | [Generate All]            | External Refs (IAA/Pledius/MS)   | |
|  +---------------------------+-----------------------------------+ |
+----------------------------------+-------------------------------+
                                   |
                       +-----------+-----------+
                       |           |           |
                       v           v           v
+------------------+ +------------------+ +------------------+
| SAVE DRAFT       | | PUBLISH          | | DELETE           |
|                  | |                  | |                  |
| PUT records/{id} | | PUT records/{id} | | DELETE records/  |
| status: 'draft'  | | status: published| | {id}             |
| Writes: title,   | | Validates: title | | Removes record   |
| body (markdown), | | and body non-    | | Clears editor    |
| snippet, slug,   | | empty            | | Refreshes list   |
| metadata_json,   | |                  | |                  |
| bibliography,    | |                  | |                  |
| context_links,   | |                  | |                  |
| iaa, pledius,    | |                  | |                  |
| manuscript       | |                  | |                  |
+------------------+ +------------------+ +------------------+
                       |           |           |
                       +-------+---+-----------+
                               |
                               v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='context_essay': context essays                              |
|  type='theological_essay': theological essays (+ ordo_salutis)     |
|  type='spiritual_article': spiritual articles                      |
|  type='historiographical_essay': historiography singleton           |
|                                                                    |
|  Fields: title, body (markdown), snippet, slug, metadata_json,     |
|  bibliography (JSON), context_links (JSON), iaa, pledius,          |
|  manuscript, picture_name, picture_bytes, picture_thumbnail        |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/essays/{slug}?type=context_essay&status=published     |
|  /api/public/essays/historiography?type=historiographical_essay     |
|                                                                    |
|  Note: The public list endpoint (/api/public/essays) excludes      |
|  historiographical_essay from its type filter. Historiography is    |
|  accessed only via the singleton slug endpoint above.              |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Essay page (context_essay.html):                                  |
|    view_context_essays.js — renders essay with TOC sidebar          |
|    sources_biblio_display.js — bibliography section                 |
|    mla_snippet_display.js — inline MLA citations                   |
|    pictures_display.js — picture rendering                          |
|                                                                    |
|  Historiography page (debate/historiography.html):                 |
|    view_historiography.js — renders singleton essay with TOC        |
|    Same shared display scripts as context essays                    |
+------------------------------------------------------------------+
```

### 5.2 Historiography Singleton Flow

```text
Module Mount (renderHistoriography)
  │
  ├─ dashboard_app.js -> loadModule("historiography")
  │   -> window.renderHistoriography()
  │
  ├─ Fetches /admin/frontend/dashboard_historiography.html
  │   -> Injects via _setColumn("sidebar") + _setColumn("main")
  │
  ├─ No sidebar document list (singleton — only one page)
  ├─ No "+ New" button
  ├─ Slug locked to "historiography" (not user-editable)
  │
  ├─ Initialises: markdown_editor, document_status_handler,
  │   picture_handler, mla_source_handler, context_link_handler,
  │   external_refs_handler, metadata_widget
  │
  └─ Auto-load: loadDocumentContent("historiography", "Historiography")
        │        (200ms delay for DOM settle)
        │
        ├─ GET /api/admin/records/historiography
        ├─ Populate editor (title, markdown, bibliography, etc.)
        ├─ Save → PUT /api/admin/records/{id} with status draft/published
        │
        └─ Output → historiography.html via view_historiography.js
                     GET /api/public/essays/historiography
                       ?type=historiographical_essay&status=published
```

### 5.3 Challenge Response Life Cycle

```text
+------------------------------------------------------------------+
|  CHALLENGE LIST (Academic or Popular)                              |
|  Module 4.0 — Ranked Lists                                        |
|                                                                    |
|  "Insert Response" button on a challenge card                      |
|  -> insertChallengeResponse() dialog                               |
|     - Collects response title                                      |
|     - POST /api/admin/responses                                    |
|       { parent_slug, title, type: challenge_response }             |
|     - Sets window._selectedRecordId = new record ID                |
|     - Navigates to loadModule("challenge-response")                |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  ADMIN CHALLENGE RESPONSE DASHBOARD                               |
|                                                                    |
|  dashboard_app.js -> loadModule("challenge-response")              |
|  -> window.renderChallengeResponse()                               |
|                                                                    |
|  1. Fetches /admin/frontend/dashboard_challenge_response.html      |
|  2. Injects sidebar via _setColumn("sidebar")                      |
|  3. Injects function bar + editor via _setColumn("main")           |
|  4. Calls displayChallengeResponseList() for sidebar               |
|  5. Calls initMarkdownEditor("") for WYSIWYG split-pane            |
|  6. Calls initChallengeResponseStatusHandler()                     |
|  7. Wires shared tools (mla_source_handler, context_link_handler,  |
|     external_refs_handler, metadata_widget)                        |
|  8. NO picture_handler (schema has no picture fields)              |
|  9. Auto-loads via _selectedRecordId if navigated from insert      |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SIDEBAR LIST (challenge_response_list_display.js)                |
|                                                                    |
|  GET /api/admin/responses                                          |
|  Groups by status:                                                 |
|    *Published*  — status='published'                               |
|    *Drafts*     — status='draft'                                   |
|  Click item -> loadChallengeResponseContent(id)                    |
|    GET /api/admin/records/{id}                                     |
|    Populates: title, body (markdown), snippet, bibliography,       |
|    context_links, external refs, metadata                          |
+----------------------------------+-------------------------------+
                                   |
                       +-----------+-----------+
                       |           |           |
                       v           v           v
+------------------+ +------------------+ +------------------+
| SAVE DRAFT       | | PUBLISH          | | DELETE           |
|                  | |                  | |                  |
| PUT records/{id} | | PUT records/{id} | | DELETE records/  |
| status: 'draft'  | | status: published| | {id}             |
| Writes: title,   | | Validates: title | | Removes record   |
| body (markdown), | | and body non-    | | Clears editor    |
| snippet, slug,   | | empty            | | Refreshes list   |
| metadata_json,   | |                  | |                  |
| bibliography,    | |                  | |                  |
| context_links,   | |                  | |                  |
| iaa, pledius,    | |                  | |                  |
| manuscript       | |                  | |                  |
+------------------+ +------------------+ +------------------+
                       |           |           |
                       +-------+---+-----------+
                               |
                               v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='challenge_response'                                         |
|  challenge_id = FK → records.id (parent challenge)                 |
|                                                                    |
|  Fields: title, body (markdown), snippet, slug, metadata_json,     |
|  bibliography (JSON), context_links (JSON), iaa, pledius,          |
|  manuscript — NO picture fields                                    |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/responses?type=challenge_response&status=published    |
|  /api/public/responses/{slug} (single response)                    |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Response list (list_view_responses.js):                           |
|    Paginated list of published challenge responses                  |
|                                                                    |
|  Single response (debate/response.html):                           |
|    response_display.js — renders with "Responding To" challenge     |
|    target, TOC sidebar, markdown body, bibliography, context links  |
|    Shared: mla_snippet_display.js, sources_biblio_display.js,      |
|    pictures_display.js, html_utils.js                               |
+------------------------------------------------------------------+
```

---

## Technical Description

### Essay Function

The Essay module uses a split-pane WYSIWYG editor loaded by `dashboard_app.js` via `loadModule("essay")`. The orchestrator `renderEssay()` in `dashboard_essay.js` fetches the HTML template, parses it with DOMParser, and injects the sidebar and main editor area into the Providence layout via `_setColumn()`. It then initialises the sidebar list (`essay_historiography_list_display.js` with mode `"essay"`), the search filter (`search_essays.js`), the markdown editor (`markdown_editor.js`, split into Markdown textarea and live preview pane), the document status handler, and all shared cross-cutting widgets (picture handler, MLA source handler, context link handler, external references handler, metadata widget). The sidebar fetches `GET /api/admin/essays`, groups entries by status into Published and Drafts sections, and clicking an item calls `loadDocumentContent(slug)` which fetches the full record and populates the editor with `title`, `body` (markdown), `snippet`, `slug`, `metadata_json`, `bibliography` (JSON), `context_links` (JSON), `iaa`, `pledius`, `manuscript`, and picture data. The `+ New Context Essay` button creates a draft via `POST /api/admin/records` with an auto-generated "Untitled N" title, clears the editor, and refreshes the sidebar. Save Draft PUTs with `status: 'draft'`, Publish validates non-empty title and body then sets `status: 'published'`, and Delete removes the record. All four essay types (`context_essay`, `theological_essay`, `spiritual_article`, `historiographical_essay`) share this unified WYSIWYG flow, differing only in the `type` discriminator — and for theological essays, the additional `ordo_salutis` enum field. On the public side, `view_context_essays.js` fetches from `/api/public/essays/{slug}` and renders into the `layout-two-col` template with TOC sidebar, premium typography, inline MLA citations via `mla_snippet_display.js`, a bibliography section via `sources_biblio_display.js`, and picture rendering via `pictures_display.js`.

### Historiography Function

The Historiography module is a singleton variant of the Essay editor. When loaded via `loadModule("historiography")`, the orchestrator `renderHistoriography()` fetches `dashboard_historiography.html` — which omits the sidebar search bar and document list — and injects it into the Providence layout. It initialises the same shared tools as the Essay editor (markdown editor, picture handler, MLA sources, context links, external references, metadata widget) but skips the sidebar list and search filter since there is only one record. After a 200ms DOM-settle delay, it auto-loads the singleton record via `loadDocumentContent("historiography", "Historiography")`, which fetches `GET /api/admin/records/historiography` and populates all editor fields. The slug is locked to `"historiography"` and is not user-editable. On the public side, `view_historiography.js` fetches from `/api/public/essays/historiography?type=historiographical_essay&status=published` and renders into the same `layout-two-col` template as context essays.

### Challenge Response Function

Challenge responses originate from the Ranked Lists module (4.0). When an admin clicks "Insert Response" on a challenge card, `insert_challenge_response.js` opens a dialog collecting a response title, then `POST /api/admin/responses` creates a new draft record with `challenge_id` set as a foreign key to the parent challenge. The script stores the new record ID in `window._selectedRecordId` and navigates to `loadModule("challenge-response")`. The orchestrator `renderChallengeResponse()` in `dashboard_challenge_response.js` (located in `js/4.0_ranked_lists/dashboard/`) fetches the editor template and initialises the sidebar list (`challenge_response_list_display.js` fetches `GET /api/admin/responses`, groups by Published/Drafts), the markdown editor, the status handler (`challenge_response_status_handler.js`), and shared tools — notably omitting the picture handler since the `challenge_response` schema has no picture fields. If `_selectedRecordId` is set, it auto-loads that response after a brief delay. The Save/Publish/Delete flow mirrors the Essay module, writing `title`, `body`, `snippet`, `slug`, `metadata_json`, `bibliography`, `context_links`, `iaa`, `pledius`, and `manuscript` via `PUT /api/admin/records/{id}`. On the public side, `list_view_responses.js` fetches all published responses from `/api/public/responses`, and `response_display.js` renders individual responses at `debate/response.html` with a "Responding To" challenge target box, TOC sidebar, markdown-to-HTML body, bibliography, and context links.
