---
name: guide_function.md
purpose: Record lifecycle diagram and functional summary for the 2.0 Records Module
version: 2.1.0
dependencies: [detailed_module_sitemap.md, guide_dashboard_appearance, guide_frontend_appearance.md, records_nomenclature.md]
---

# 2.0 Records Module — Function

```text
                    RECORD LIFECYCLE: CREATION TO DISPLAY

  [Admin Portal]                                        [Public Frontend]
       |                                                       ^
       v                                                       |
  Single Record Editor                                    records.html
  (dashboard_records_single.js)                          record.html
       |                                                       ^
       |  collectAllFormData()                                 |
       |  7 sections: Core IDs, Images,                        |
       |  Description, Taxonomy, Verses,                       |
       |  External Refs, Metadata                              |
       v                                                       |
  +-----------------+       +------------------+        +------------------+
  | Manual Entry    |       | Bulk CSV Upload  |        | WASM sql.js      |
  | PUT /api/admin/ |       | Phase 1: parse   |        | (setup_db.js)    |
  | records/{id}    |       | Phase 2: review  |        | In-browser       |
  | status = draft  |       | POST /commit     |        | read-only DB     |
  | or published    |       | status = draft   |        |                  |
  +-----------------+       +------------------+        +------------------+
       |                           |                           ^
       v                           v                           |
  +--------------------------------------------------+        |
  |              SQLite Database                      |--------+
  |              (database.sqlite)                    |  fetched as
  |                                                   |  ArrayBuffer
  |  records table (type='record')                    |
  |  status: draft (admin-only) | published (public)  |
  +--------------------------------------------------+
```

The Records Module manages the full lifecycle of historical evidence entries in a polymorphic single-table SQLite database, where each entry carries the discriminator `type='record'`. All state-changing API calls include a CSRF token via the double-submit cookie pattern: on login the backend issues a non-HttpOnly `csrf_token` cookie, the client reads it via `getCSRFToken()` and sends it as an `X-CSRF-Token` header on every POST/PUT/DELETE, and the `CSRFMiddleware` validates the match before routing. New record IDs are generated server-side as 26-character Crockford Base32 ULIDs via `python-ulid`, replacing the previous UUID4 format. On the admin side, `dashboard_records_all.js` renders a high-density sortable table with status filtering (`all`/`published`/`draft`), keyboard-driven fuzzy search across title, verse, and snippet fields, and Intersection Observer-based endless scroll loading 50-row batches from `GET /api/admin/records`; failed script loads are tracked and surfaced as degraded-mode warnings in the status bar. The integrated bulk CSV upload workflow uses Papa Parse (vendored as `papaparse.min.js`) for RFC 4180-compliant parsing with proper handling of embedded newlines and quoted fields, validates MIME type (`text/csv`), rejects double-extension filenames, enforces a 5 MB client-side and server-side file size limit, caps batch size at 500 records, and validates verse JSON structure (array of `{book, chapter, verse}` objects) before staging rows in an ephemeral review panel where the admin explicitly commits valid rows as `draft` records through `POST /api/admin/bulk-upload/commit`. Individual record editing is handled by `dashboard_records_single.js`, which orchestrates 13 sub-editor modules across seven form sections — Core Identifiers (ULID, title, slug), Images (PNG upload with 800px resize and 200px thumbnail via `image_processor.py`), Description (dynamic paragraph array editor), Taxonomy (era, timeline, gospel_category, map_label, geo_id, parent_id selectors with ULID format validation), Verses (primary and secondary Bible verse builders with chip UI and inline validation hints), External References (MLA bibliography, context links, IAA/Pledius/manuscript identifiers), and Metadata & Status (DeepSeek-powered slug/snippet/keyword generation via the shared metadata widget). Module-scoped state (`_selectedRecordId`, `_recordTitle`, `_loadedRecordData`) is accessed through a getter/setter API exposed on `window` rather than direct global assignment. The `record_status_handler.js` module collects all form data through sub-collector functions (status is set explicitly by `handleSaveDraft()` or `handlePublish()`, not by `collectAllFormData()`) and submits to `PUT /api/admin/records/{id}`; Delete performs a hard removal with no soft-delete. On the public frontend, all DOM rendering uses safe construction via `createElement`/`textContent` — no `innerHTML` with unsanitized data; context link URLs are validated to start with `/` or `https://`. `setup_db.js` fetches the full `database.sqlite` file as an ArrayBuffer and initialises a WASM sql.js engine, exposing the `window.TheJesusDB` interface and dispatching the `thejesusdb:ready` custom event. The list view (`list_view.js`) parses URL parameters for search, era, category, and map filters, executes read-only SQL queries filtered to `status='published'`, and renders results as `.resource-row` or `.list-row-item` elements with pagination. The detail view (`single_view.js`) resolves a record slug from the URL, queries `TheJesusDB.getRecord(slug)`, renders title, verses, description paragraphs, picture, bibliography, context links, and a metadata grid into the DOM via safe DOM construction, then dispatches a `recordMainRendered` event to trigger bibliography display, picture rendering, and JSON-LD structured data injection (using `window.location.origin` for domain-agnostic URLs) for SEO.
