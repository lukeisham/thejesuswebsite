---
name: guide_function.md
purpose: Visual ASCII representations of Records Module pipelines — search, create/edit, picture upload, bulk upload, public rendering
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

---

## 2.0 Records Module

```text
  [ Python ETL Pipelines ]                                   [ Admin Portal ]
  (Fetch raw external data)                                 (Manual insertions)
             |                                                      |
             +-----------------------+      +-----------------------+
                                     |      |
                                     v      v
                           +--------------------------+
                           |     SQLite Database      |
                           |    (database.sqlite)     |
                           +--------------------------+
                                        |
                                        v
                           +--------------------------+
                           |  WASM `sql.js` Engine    |
                           | (In-Memory Browser DB)   |
                           +--------------------------+
                                        |
             +--------------------------+--------------------------+
             |                          |                          |
             v                          v                          v
       (2.3 Sanitize)             (2.1 Full Lists)          (2.2 Single Record)
    [sanitize_query.js]          Loops rows into          Deep data merge view
             |                  list-item cards          [json_ld_builder.js]
             v                          |                          |
      (Search Logic)                    v                          v
                                [ Render to DOM ]           [ SEO Metadata ]
```

> **📦 Shared Dashboard Tools Relocated to 9.0 Cross-Cutting:**
> The six shared dashboard tools (`metadata_widget.css`, `metadata_widget.js`, `mla_source_handler.js`, `external_refs_handler.js`, `context_link_handler.js`, `picture_handler.js`) have been relocated to the 9.0 Cross-Cutting module (`js/9.0_cross_cutting/dashboard/` and `css/9.0_cross_cutting/dashboard/`). These tools are loaded via `dashboard.html` and consumed by all dashboard editor modules (Records Single 2.0, Challenge Response 4.0, Essays 5.0, Blog Posts 6.0).

### 2.1 Search Pipeline — End-to-End Logic Flow

```text
        USER ACTION
  +---------------------+
  | Types query "Peter" |
  | presses [Enter]     |
  +---------------------+
              |
              v
  +-------------------------------------------------------------------------+
  | search_header.js                                                        |
  |   > encodeURIComponent("Peter")                                         |
  |   > window.location.href = "/frontend/pages/records.html?search=Peter"  |
  +-------------------------------------------------------------------------+
              |
      (browser navigates — full page load)
              |
              v
  +-------------------------------------------------------------------------+
  | records.html                                                            |
  |   Loads scripts in exact order:                                         |
  |     1. sql-wasm.js      (Initializes WASM engine)                       |
  |     2. setup_db.js      (Fetches DB arraybuffer, fires 'ready' event)   |
  |     3. list_view.js     (Listens for 'thejesusdb:ready' event)          |
  |     4. initializer.js   (Injects sidebar, search bar UI)                |
  +-------------------------------------------------------------------------+
              |
      ('thejesusdb:ready' fires once DB is loaded)
              |
              v
  +-------------------------------------------------------------------------+
  | list_view.js                                                            |
  |   > renderListView() is triggered                                       |
  |   > URLSearchParams.get('search') = "Peter"                             |
  |   > Sets page title string: "Search Results: 'Peter'"                   |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  | sanitize_query.js                                                       |
  |   > sanitizeSearchTerm("Peter")                                         |
  |   > Output: "Peter" (strips bad chars, restricts to 200 chars limit)    |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  | setup_db.js                                                             |
  |   > db.searchRecords("Peter", 50)                                       |
  |                                                                         |
  |   Executes Read-Only SQL inside browser:                                |
  |     SELECT id, title, slug, snippet ...                                 |
  |     FROM records                                                        |
  |     WHERE status = 'published'                                               |
  |       AND (title LIKE '%Peter%' OR snippet LIKE '%Peter%')              |
  |     ORDER BY page_views DESC                                            |
  |     LIMIT 50;                                                           |
  +-------------------------------------------------------------------------+
              |
       (returns Array of matching row Objects)
              |
              v
  +-------------------------------------------------------------------------+
  | list_view.js                                                            |
  |   > Builds HTML <li> elements for each returned row                     |
  |   > Injects into #record-list DOM container                             |
  |   > Hides standard pagination controls (search bypasses pagination)     |
  +-------------------------------------------------------------------------+
```

### 2.2 Single Record Create / Edit Pipeline

```text
 +---------------------------------------------------+
 |         Admin Portal: dashboard_app.js            |
 |   Routing -> window.renderEditRecord(id?)         |
 +---------------------------------------------------+
                          |
            +-------------+--------------+
            |                            |
     [recordId = null]            [recordId present]
      (Create mode)                (Edit mode)
            |                            |
            v                            v
 +---------------------+   +----------------------------------+
 | Render blank form   |   | GET /api/admin/records/{id}      |
 | (title, slug,       |   | -> Populate form fields with     |
 |  taxonomy dropdowns,|   |    existing row data             |
 |  text areas)        |   +----------------------------------+
 +---------------------+                |
            |                           v
            +-------------+-------------+
                          |
                          v
 +---------------------------------------------------+
 |    edit_record.js injects child modules           |
 |                                                   |
 |  -> edit_links.js    (Relations / Links section)  |
 |  -> edit_picture.js  (Picture upload, edit only)  |
 +---------------------------------------------------+
                          |
              (Admin fills fields, clicks Save)
                          |
             +------------+------------+
             |                         |
      [Create mode]             [Edit mode]
             |                         |
             v                         v
 +---------------------+   +---------------------------+
 | POST /api/admin/    |   | PUT /api/admin/           |
 |   records           |   |   records/{id}            |
 | Body: JSON field    |   | Body: JSON field map       |
 | map of row data     |   | of changed fields only     |
 +---------------------+   +---------------------------+
             |                         |
             +------------+------------+
                          |
                          v
 +---------------------------------------------------+
 |   admin_api.py                                    |
 |                                                   |
 |  -> Reads valid column names via PRAGMA           |
 |  -> Filters payload to only valid columns         |
 |  -> Executes parameterized INSERT or UPDATE       |
 |  -> On CREATE: returns { "id": <rowid> }          |
 |  -> On UPDATE: returns { "message": "..." }       |
 +---------------------------------------------------+
```

### 2.3 Picture Upload Pipeline

```text
 +---------------------------------------------------+
 |         Admin Editor: edit_picture.js             |
 |   On mount: GET /api/admin/records/{id}           |
 |   -> Renders existing picture_name or empty state |
 +---------------------------------------------------+
                          |
           (User selects .png file, clicks Upload)
                          |
                          v
 +---------------------------------------------------+
 |         edit_picture.js (Client Validation)       |
 |   -> Checks file.type === "image/png"             |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |      POST /api/admin/records/{id}/picture         |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |   admin_api.py                                    |
 |   -> Validates file.content_type === "image/png"  |
 |   -> Sanitises filename (pathlib.Path(...).name)  |
 |   -> Passes raw bytes to image_processor.py       |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |             image_processor.py                    |
 |                                                   |
 |  -> Resize image to max 800px width               |
 |  -> Compress to <= 250KB:                         |
 |       1st: lossless PNG (optimize=True)           |
 |       Fallback: PNG quantize loop (256->8 colors) |
 |  -> Generate additional 200px thumbnail (PNG)     |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |         SQLite Database (UPDATE record)           |
 |                                                   |
 |  -> picture_name      (e.g., "peter_walk.png")    |
 |  -> picture_bytes     (Binary payload)            |
 |  -> picture_thumbnail (Binary payload)            |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |    Returns 200 OK JSON:                           |
 |    { "message": "...", "picture_name": "..." }    |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |   edit_picture.js re-renders UI with picture_name |
 |   (1500ms delay after showing "Saved ✓" status)  |
 +---------------------------------------------------+
```

### 2.5 Bulk Upload Pipeline (Two-Phase: Parse → Review → Commit)

The bulk upload workflow is a **two-phase process** designed to prevent accidental database writes. Phase 1 parses and validates the CSV client-side into an ephemeral preview store — nothing is written to the database. Phase 2 presents a review table where the admin can deselect individual rows and must explicitly click "Save as Draft" to commit them as permanent `draft` records.

```text
  ═══════════════════════════════════════════════════════════════
  PHASE 1 — CLIENT-SIDE PARSE & VALIDATE (no DB writes)
  ═══════════════════════════════════════════════════════════════

 +---------------------------------------------------+
 |  Admin clicks "Upload CSV" button                 |
 |  (bulk_csv_upload_handler.js)                     |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |  FileReader reads .csv as text                    |
 |  Parse: split by newlines, comma-split with       |
 |  quote handling (vanilla JS, no library)          |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |  Map CSV column headers → schema fields           |
 |  (title, primary_verse, description, snippet,     |
 |   era, timeline, gospel_category, map_label,      |
 |   geo_id, bibliography, context_links, etc.)      |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |  Client-side Validation:                          |
 |  • title is required (non-empty)                  |
 |  • primary_verse matches "Book Ch:V" pattern      |
 |  • era, timeline, gospel_category, map_label      |
 |    checked against valid enum values              |
 |  • geo_id must be valid integer if present        |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |  Parsed rows loaded into EPHEMERAL STORE           |
 |  (_ephemeralRows[] in bulk_upload_review_handler) |
 |  Each entry: { rowIndex, fields, valid, checked,  |
 |                errors[] }                         |
 |                                                   |
 |  ⚠ NOTHING written to database yet                |
 +---------------------------------------------------+
                          |
        Auto-selects "Bulk" toggle, shows review panel
                          |
                          v
  ═══════════════════════════════════════════════════════════════
  PHASE 2 — REVIEW & COMMIT (admin-gated DB write)
  ═══════════════════════════════════════════════════════════════

 +---------------------------------------------------+
 |  Bulk Review Panel (bulk_upload_review_handler)   |
 |  • Checkbox column — valid rows pre-checked       |
 |  • Invalid rows red-tinted, unchecked, disabled   |
 |  • "Save as Draft" shows count of checked rows    |
 |  • "Discard All" clears ephemeral store           |
 +---------------------------------------------------+
                          |
            Admin reviews, deselects as needed
                          |
                          v
 +---------------------------------------------------+
 |  Admin clicks "Save as Draft"                     |
 |  → Confirmation dialog                            |
 |  → POST /api/admin/bulk-upload/commit            |
 |    { records: [ {title, primary_verse, ...} ] }  |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |                 admin_api.py                      |
 |  bulk_upload_commit() endpoint                    |
 |                                                   |
 |  -> Validates required fields (title)             |
 |  -> Validates ENUMS server-side                   |
 |  -> Forces status = 'draft' on ALL records        |
 |  -> Generates UUID ids if missing                 |
 |  -> Sets created_at / updated_at timestamps       |
 |  -> Executes individual INSERT per record         |
 |  -> COMMIT transaction                            |
 +---------------------------------------------------+
               |                       |
      [ERRORS / PARTIAL]         [ALL SUCCESS]
               |                       |
               v                       v
 +------------------------+  +--------------------------------------------+
 | Return 200:            |  | Return 200:                                |
 | { success: false,      |  | { success: true,                           |
 |   errors: [...],       |  |   created: n,                              |
 |   created: partial_n } |  |   message: "Successfully created n ..." }  |
 | Ephemeral data PRESERVED|  | Ephemeral store CLEARED                   |
 | (admin can retry)      |  | Records now appear in main table           |
                             |   "message": "Successfully created X ...", |
                             |   "created": X,                           |
                             |   "errors": [] }                          |
                             +--------------------------------------------+
                                               |
                                               v
                             +--------------------------------------------+
                             |         Editor renders results             |
                             +--------------------------------------------+
```
### 2.6 Single Record Full Field Rendering Pipeline (Public)

> **Plan:** `fix_frontend_schema_compliance.md`
>
> The public single-view renderer (`single_view.js`) now displays all schema
> fields including previously missing columns: era, timeline, map_label,
> gospel_category, geo_id, iaa, pledius, manuscript, page_views, and url.
> The query filters by `type = 'record'` and `status = 'published'`.

```text
  [ User navigates to /record/{slug} ]
              |
              v
  +-------------------------------------------------------------------------+
  | single_view.js — renderSingleRecord()                                    |
  |   1. Resolve slug from URL (?slug= or /record/{slug})                    |
  |   2. Query window.TheJesusDB.getRecord(slug)                             |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  | setup_db.js — TheJesusDB.getRecord(slug)                                |
  |   SELECT * FROM records                                                  |
  |   WHERE slug = ? AND type = 'record' AND status = 'published'            |
  |   LIMIT 1                                                                |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  3 BASIC FIELDS                                                          |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | #record-title          ← record.title                            |    |
  |  | #record-primary-verse  ← JSON.parse(record.primary_verse)[0]     |    |
  |  | #record-secondary-verse← JSON.parse(record.secondary_verse)      |    |
  |  | #record-description    ← JSON.parse(record.description) paragraphs|    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  4 METADATA GRID (#record-metadata-grid)                                 |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | era, gospel_category, map_label, timeline, geo_id,                |    |
  |  | iaa, pledius, manuscript, page_views                             |    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  5 RELATED RECORDS                                                       |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | parent_id   → navigable link to parent record (/record/{slug})   |    |
  |  | context_links → linked list rendered into #record-context-list    |    |
  |  | url         → linked reference section (#record-section-url)      |    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  6 SEO METADATA (header.js)                                              |
  |  injectPageMetadata({ title, description, canonical, ogType })           |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  7 DISPATCH: 'recordMainRendered' custom event                           |
  |     → bibliography display (sources_biblio_display.js)                   |
  |     → picture display (pictures_display.js)                              |
  |     → JSON-LD builder (json_ld_builder.js)                               |
  +-------------------------------------------------------------------------+
```

---

