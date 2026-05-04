---
name: guide_function.md
purpose: Visual ASCII representations of module functions 
version: 2.0.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md, data_schema.md, detailed_module_sitemap.md]
---

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

## 1.0 Foundation Module

```text
  [ User Browser Request ]
             |
             v
+-------------------------------------------------------------+
|                   Foundation Bootstrapper                   |
+-------------------------------------------------------------+
|                                                             |
|  1. Load grid.css                                           |
|       |                                                     |
|  2. Load layout logic                                       |
|       |                                                     |
|  3. Inject header.js         -------> [ Invisible SEO & og:tags Metadata ]
|       |                                                     |
|  4. Inject sidebar.js        -------> [ Constructs Left Nav Tree + Admin Entry ]
|       |                                                     |
|  5. Inject search_header.js  -------> [ Injects Visible Search Bar ]
|       |                                                     |
|  6. Inject footer.js         -------> [ Appends Footer & Print Logic ]
|                                                             |
+-------------------------------------------------------------+
             |
             v
  [ Main Content Container Loaded ]
             |
             +----------> [ Optional: Redirect to Admin Portal (Module 7.1) ]
```

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
  |     WHERE users = 'Public'                                              |
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

---

## 3.0 Visualizations Module

### 3.1 Evidence (Ardor) — Data Flow

```text
                        ┌─────────────────────────────────────┐
                        │         SQLite Database              │
                        │         (records table)              │
                        │   ┌──────────────┬────────────────┐  │
                        │   │  WASM Path   │  API Path      │  │
                        │   │  (read-only) │  (read/write)  │  │
                        │   └──────────────┴────────────────┘  │
                        └──────────┬────────────────┬──────────┘
                                   │                │
                       PUBLIC SIDE  │                │  ADMIN SIDE
                                   v                v
        ┌──────────────────────────┐    ┌──────────────────────────┐
        │  WASM sql.js             │    │  admin_api.py            │
        │  (in-browser SQLite)     │    │  GET /api/admin/diagram/ │
        │  Queries:                │    │    tree                  │
        │  SELECT era, parent_id, │    │    → SELECT id, title,  │
        │  geo_label FROM records  │    │      parent_id FROM     │
        └────────────┬─────────────┘    │      records            │
                     │                  │  PUT /api/admin/diagram/│
                     │                  │    tree                 │
                     │                  │    → Validates IDs      │
                     │                  │    → Checks circular    │
                     │                  │      refs (2-node only) │
                     │                  │    → BEGIN TRANSACTION  │
                     │                  │    → UPDATE records     │
                     │                  │      SET parent_id = ?  │
                     │                  │    → COMMIT / ROLLBACK  │
                     v                  └───────────┬──────────────┘
        ┌──────────────────────────┐                │
        │  3.0 Visualizations     │                │
        │     Render Engine       │                │
        │  (public-facing)        │                │
        │  Interprets era, geo,   │                │
        │  parent_id for layout   │                │
        └────────────┬─────────────┘                │
                     │                              │
                     v                              v
        ┌──────────────────────────┐  ┌──────────────────────────┐
        │  SVG / Canvas Output     │  │  edit_diagram.js         │
        │  (public evidence.html)  │  │  (admin editor)          │
        │                          │  │  Renders recursive tree  │
        │  Node circles + edges    │  │  from GET data           │
        │  with hover effects      │  │                          │
        │                          │  │  Features:               │
        │                          │  │  • Drag-and-drop         │
        │                          │  │  • Search filter         │
        │                          │  │  • Add Child (orphans)   │
        │                          │  │  • Remove Node (nullify) │
        │                          │  │  • Save via PUT          │
        └──────────────────────────┘  └──────────────────────────┘
```

### 3.2 Arbor Dashboard Editor — End-to-End Flow

```text
  [ Admin clicks "Arbor" card or tab in Dashboard ]
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_app.js → loadModule('arbor')                                  |
  |   Calls window.renderArbor()                                            |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js (Orchestrator)                                       |
  |   1. _setLayoutColumns(false, '1fr') — full-width, no sidebar           |
  |   2. Fetches dashboard_arbor.html template, injects into #providence-col-main |
  |   3. Calls _loadAndRenderTree()                                         |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | fetch_arbor_data.js                                                     |
  |   GET /api/admin/diagram/tree → admin_api.py → SQLite                   |
  |   Returns flat array: [{id, title, parent_id}, …]                       |
  |   On failure → surfaceError("Unable to load the arbor diagram…")        |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js — _loadAndRenderTree()                               |
  |   1. Builds Map<id, {id, title, parent_id, children[]}>                 |
  |   2. Assembles children arrays & orphan list (parent_id = null)         |
  |   3. Stores in window.__diagramNodes, window.__arborOrphans             |
  |   4. Initialises window.__changedNodes = new Map()                      |
  +-------------------------------------------------------------------------+
              │
     ┌────────┴────────┐
     v                  v
  +------------------+  +---------------------------------------------------+
  | render_arbor_    |  | draw_arbor_connections.js                         |
  | node.js          |  |   Queries DOM for .arbor-node-row positions       |
  | Recursively      |  |   Draws cubic bezier SVG <path> lines             |
  | creates <li>     |  |   from parent right edge → child left edge        |
  | with grip, label,|  +---------------------------------------------------+
  | id, [+Child],    |
  | [Remove] buttons |
  +------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | setupNodeDrag() — handle_node_drag.js                                   |
  |   Attaches HTML5 DnD listeners to every .arbor-node-row                 |
  |   + Orphan pool drop zone (detach → parent_id = null)                   |
  |   Drag-over validates: no self-drop, no circular references             |
  |   On valid drop → window.updateNodeParent(childId, newParentId)         |
  +-------------------------------------------------------------------------+
              │
              v
  +-------------------------------------------------------------------------+
  | update_node_parent.js                                                   |
  |   1. Records old_parent_id for rollback                                 |
  |   2. Optimistically updates window.__diagramNodes                        |
  |   3. Tracks change in window.__changedNodes                              |
  |   4. Rebuilds tree (_rebuildTreeFromMap)                                |
  |   5. Re-renders UI (_rerenderTree) — optimistic update                  |
  |   6. PUT /api/admin/diagram/tree → auto-saves as draft                  |
  |      On failure → rollback in-memory state + surfaceError               |
  |   7. Shows "Saved as draft" indicator                                   |
  +-------------------------------------------------------------------------+

  ── PUBLISH FLOW (explicit admin action) ──────────────────────────────────────

  [ Admin clicks "Publish" ]
              │
              v
  +-------------------------------------------------------------------------+
  | dashboard_arbor.js — _handlePublish()                                   |
  |   Gathers all entries from window.__changedNodes                         |
  |   PUT /api/admin/diagram/tree with full batch                           |
  |   On success → clears window.__changedNodes                             |
  |   On failure → surfaceError("Failed to publish…")                       |
  +-------------------------------------------------------------------------+

  ── REFRESH FLOW ─────────────────────────────────────────────────────────────

  [ Admin clicks "Refresh" ]
              │
              v
  +-------------------------------------------------------------------------+
  | Re-fetches tree from backend (discarding any un-persisted in-memory      |
  | state). Full re-render from scratch.                                    |
  +-------------------------------------------------------------------------+
```

---

## 4.0 Ranked Lists Module

### 4.1 Wikipedia Weights — Data Flow

The Wikipedia dashboard module provides a dual-pane interface for managing
Wikipedia article rankings. The left sidebar shows contextual record details
(title, slug, weight multiplier, search terms, snippet, slug, meta) for the
selected record. The right pane displays the ranked list.

**Draft/Publish Cycle:** All edits (weight, search terms, metadata) save the
record as draft. "Refresh" re-sorts by weight and sets records to draft.
"Recalculate" re-fetches Wikipedia data via the pipeline and sets the record
to draft. Only "Publish" sets all listed records to published and commits
the final ranked order to the live frontend.

 +----------------------------------------------------------+
 | 1. ADMIN ACTION: Select a record from the ranked list    |
 |    -> sidebar populates with record title, slug, weight |
 |    -> search terms render as deletable chips             |
 |    -> metadata (snippet/slug/meta) loads for editing     |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 2. ADMIN ACTION: Edit weight / search terms / metadata   |
 |    -> Weight: PUT /api/admin/records/{id} with           |
 |       wikipedia_weight + status=draft                    |
 |    -> Search Terms: add/remove chips, save as JSON array |
 |       via PUT with status=draft                          |
 |    -> Metadata: snippet/slug/meta editable with          |
 |       auto-gen buttons (calls snippet_generator.py /      |
 |       metadata_generator.py via POST endpoints)          |
 |    -> Slug auto-gen: local slugify from title            |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 3. ADMIN ACTION: Click "Recalculate" (per record or all) |
 |    -> launches `pipeline_wikipedia.py`                   |
 |    -> reads wikipedia_search_term from records table     |
 |    -> queries Wikipedia REST API with search terms       |
 |    -> filters out non-article pages (disambiguation,     |
 |       lists, categories, portals, templates)             |
 |    -> selects best match, computes base score from       |
 |       wordcount (log scale, 1-100)                       |
 |    -> writes wikipedia_title, wikipedia_link (JSON),     |
 |       wikipedia_rank (base score) with status=draft      |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 4. ADMIN ACTION: Modify wikipedia_weight (multiplier)    |
 |    (sidebar -> weight input × prefix)                   |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 5. ADMIN ACTION: Click "Refresh"                         |
 |    -> recalculates: Final Rank = Base Rank × Multiplier  |
 |    -> re-sorts list by computed score                    |
 |    -> PUTs new rank positions + status=draft             |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 6. ADMIN ACTION: Click "Publish"                         |
 |    -> PUT /api/admin/lists/wikipedia (ranked order)      |
 |    -> Sets all listed records to status=published        |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 7. FRONTEND: Ranked Wikipedia List (§4.1)                |
 |    Public page reads wikipedia_rank, sorts, displays     |
 +----------------------------------------------------------+


### 4.2 Challenge Weights — Data Flow

```text
 +----------------------------------+
 |  4.2 Challenges (Metrics)        |
 | (Base Popularity / Academic      |
 |  Importance Context)             |
 |                                  |
 | pipeline_popular_challenges.py   |
 | pipeline_academic_challenges.py  |
 +-----------+----------------------+
             |
             v
 +-------------------------------------------------------+
 |  Admin Editor: edit_academic_weights.js               |
 |                edit_popular_weights.js                |
 |  (ranks-challenges tab -> loadModule — 2-tab container)|
 |                                                       |
 |  [ Academic Challenges (Active) ] [ Popular Challenges ] |
 |                                                       |
 |  Academic tab (loaded first):                         |
 |  -> Fetches academic_challenge_rank,                  |
 |     academic_challenge_weight,                        |
 |     academic_challenge_title,                         |
 |     academic_challenge_link                           |
 |  -> Renders editable rows with Save per row           |
 |                                                       |
 |  Popular tab (lazy-loaded on first click):            |
 |  -> Same pattern for popular_challenge_* columns       |
 |                                                       |
 |  Save: PUT /api/admin/records/{id}                   |
 |    Body: field-specific weight/rank updates           |
 +-------------------------------------------------------+
             |                                    |
             v                                    v
 +--------------------------+    +---------------------------+
 | Calculate Final          |    | Calculate Final           |
 | Academic Rank =          |    | Popular Rank =            |
 | Base × Multiplier        |    | Base × Multiplier         |
 +-----------+--------------+    +--------------+------------+
             |                                    |
             +-------+----------------+-----------+
                     |                |
                     v                v
 +-------------------------------------------------------+
 |           Update SQLite DB Records                    |
 |  academic_challenge_rank, academic_challenge_weight,   |
 |  popular_challenge_rank,  popular_challenge_weight,    |
 |  (plus _title and _link columns)                      |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |    WASM Query -> ORDER BY academic_rank DESC          |
 |                   / popular_rank DESC                 |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |  Frontend Render: Ranked Academic + Popular Lists     |
 |  (§4.2 Public Views — 2 separate ranked feeds)        |
 +-------------------------------------------------------+
```

### 4.3 Inserting Responses — Data Flow

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> ranks-responses (Insert Responses)        |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   Router injects 2-tab container into admin-canvas    |
 |                                                       |
 |   [ Academic Challenges (Active) ] [ Popular Challenges ] |
 +-------------------------------------------------------+
                         |
          +--------------+--------------+
          |                             |
          v                             v
 +--------------------------+  +--------------------------+
 | Academic Tab (active)    |  | Popular Tab (lazy-load) |
 | renderEditInsertResponse |  | renderEditInsertResponse |
 | _Academic()              |  | _Popular()              |
 +-----------+--------------+  +-------------+------------+
             |                                |
             v                                v
 +-------------------------------------------------------+
 |  Fetches challenge list from SQLite (read-only):      |
 |    SELECT academic_challenge_title,                   |
 |           academic_challenge_rank,                    |
 |           responses                                   |
 |    FROM records                                       |
 |    WHERE academic_challenge_title != ''               |
 |    ORDER BY academic_challenge_rank                   |
 +-------------------------------------------------------+
             |
             v
 +-------------------------------------------------------+
 |  Renders browsable list with response status:         |
 |                                                       |
 |  1. historicity-of-miracles                           |
 |     responses: [none]               [+ Add Response]  |
 |                                                       |
 |  2. council-of-nicaea-claims                          |
 |     responses: [none]               [+ Add Response]  |
 |                                                       |
 |  3. jesus-myth-theory                                 |
 |     responses: [response-001]   [Remove]   [Edit]    |
 +-------------------------------------------------------+
             |
    +--------+--------+
    |                  |
    v                  v
 +------------------+  +-------------------------------+
 | [+ Add Response] |  | [Save / Remove]               |
 |                  |  |                               |
 | Opens §5.2       |  | PUT /api/admin/records/{id}   |
 | Response Editor  |  | Body: { responses:            |
 | to author        |  |   "response-001" }            |
 | content, then    |  |                               |
 | links back here  |  | -> Removes response link      |
 |                  |  |    when empty                 |
 +------------------+  +-------------------------------+
    |                  +-------------------------------+
    +--------+---------+
             |
             v
 +-------------------------------------------------------+
 |           Update SQLite DB Records                    |
 |    responses column (JSON Blob) updated with          |
 |    linked response ID(s)                              |
 +-------------------------------------------------------+
             |
             v
 +-------------------------------------------------------+
 |   Frontend re-render: list refreshes with new status  |
 +-------------------------------------------------------+
```

---

## 5.0 Essays & Responses Module

```text
 +---------------------------+       +---------------------------+
 |  5.1 Essays (text-essays) |       | 5.2 Responses             |
 |                           |       | (text-responses)          |
 |  Context Essays tab       |       |                           |
 |  (edit_essay.js)          |       |  edit_response.js         |
 |                           |       |  (single-pane editor)     |
 |  Historiography tab       |       |                           |
 |  (edit_historiography.js) |       |  Linked to challenge      |
 |                           |       |  records via §4.3         |
 +-----------+---------------+       +-------------+-------------+
             |                                     |
             v                                     v
 +-----------+-----------+         +---------------+-------------+
 |  Write Markdown via   |         |  Write Markdown via         |
 |  Split-Pane Editor    |         |  Split-Pane Editor          |
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

---

## 6.0 News & Blog Module

### 6.1 News Ingestion Pipeline

```text
             [ Scheduled Job / Manual Trigger ]
                             |
                             v
 +-------------------------------------------------------------+
 |             backend/pipelines/pipeline_news.py              |
 |                                                             |
 |  -> Scrape external RSS feeds / target News APIs            |
 |  -> Extract and filter for relevant historical events       |
 |  -> Rank entries by recency and contextual relevance        |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |             SQLite Database (INSERT / UPDATE)               |
 |                                                             |
 |  -> news_items   (JSON Blob payload)                        |
 |  -> news_sources (Attribution metadata)                     |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |                   WASM Query (Frontend)                     |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |  news_snippet_display.js → Combined Landing Page (§1.3)    |
 |  list_newsitem.js        → Full News Feed (§5.3)            |
 +-------------------------------------------------------------+
```

### 6.2 News Articles & Sources — Admin Editor Flow

 +---------------------------------------------------------------+
 |                     Admin Dashboard                           |
 |                                                               |
 |  User manages search keywords & news sources, then clicks     |
 |  [Launch News-Crawler]                                        |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |   `launch_news_crawler.js` — Triggers the backend pipeline    |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |          `backend/pipelines/pipeline_news.py`                 |
 |                                                               |
 |  1. Reads search keywords                                     |
 |  2. Reads news source URLs                                    |
 |  3. Crawls news source URLs                                   |
 |  4. Extracts news items                                       |
 |  5. Saves to SQLite                                           |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |                      SQLite Database                          |
 |                                                               |
 |  `news_items` table populated with crawled results            |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |                    Frontend Display                           |
 |                                                               |
 |  `list_newsitem.js` → News Feed                               |
 |  `news_snippet_display.js` → Combined Landing Page            |
 +---------------------------------------------------------------+


### 6.3 Blog Posts — Admin Editor Flow

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> text-blog (Blog Posts tab)               |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   Direct single-pane call:                            |
 |   window.renderEditBlogpost("admin-canvas")           |
 |   (protected by typeof guard)                         |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   edit_blogpost.js                                    |
 |                                                       |
 |  On mount: GET /api/admin/blogposts                   |
 |    -> SELECT id, title, created_at, blogposts         |
 |       FROM records WHERE blogposts IS NOT NULL        |
 |       ORDER BY created_at DESC                        |
 |                                                       |
 |  Renders 3-column dashboard layout:                   |
 |                                                       |
 |  COL 1                    | COL 2               | COL 3 — BLOG POST        |
 |  [Save Post]              | [ Existing posts:   | Publish Date: [______]   |
 |  [Discard]                | "Jesus and History" | Title:        [______]   |
 |  [Delete Post]            |   2025-01-10        | Author:       [______]   |
 |  [+ New Post]             |   [Edit] [Delete]   | Body:                   |
 |                           | "The Empty Tomb"    | [WYSIWYG / Markdown    |
 |                           |   2024-12-03        |  editor                ]|
 |                           |   [Edit] [Delete]   |                         |
 +-------------------------------------------------------+
                         |
             +-----------+-----------+
             |                       |
             v                       v
 +-------------------------+  +---------------------------+
 |  Save: PUT /api/admin/  |  Delete: DELETE /api/admin/ |
 |  records/{id}            |  records/{id}/blogpost      |
 |  Body: { blogposts:      |                             |
 |    { "publish_date":     |  -> Clears blogposts field  |
 |      "2025-01-10",       |     on the record           |
 |      "title": "...",     |                             |
 |      "author": "...",    |                             |
 |      "body": "..."       |                             |
 |    }                     |                             |
 |  }                       |                             |
 +-------------------------+  +---------------------------+
             |                       |
             +-------+------+--------+
                     |      |
                     v      v
 +-------------------------------------------------------+
 |               SQLite Database                         |
 |    blogposts column (JSON Blob) — full CRUD           |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |   Frontend re-render: editor clears or loads post     |
 |   List refreshes to reflect changes                   |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |  WASM Query (public side):                            |
 |    SELECT blogposts FROM records                      |
 |    WHERE blogposts IS NOT NULL                        |
 |    ORDER BY json_extract(blogposts,                    |
 |             '$.publish_date') DESC                     |
 |                                                       |
 |  list_blogitem.js renders blog feed (§6.3 Public)    |
 +-------------------------------------------------------+
```

---

## 7.0 System Module

```text
    [ External Web Traffic ]               [ Automated AI Agents ]
               |                                      |
               +-------------------+------------------+
                                   |
                                   v
 +-------------------------------------------------------------+
 |                   Nginx Reverse Proxy                       |
 |          (Rate Limit, robots.txt, sitemap.xml)              |
 +-------------------------------------------------------------+
          |                        |                       |
          v                        v                       v
 +----------------+      +----------------+      +------------------+
 | Static Assets  |      | Admin Auth API |      | MCP Server Agent |
 |     Files      |      |   (Backend)    |      |    (API Tool)    |
 |                |      |                |      |                  |
 | HTML, JS, CSS, |      |   Auth & JWT   |      | rate_limiter.py  |
 | SQLite WASM    |      |   Utilities    |      |                  |
 +----------------+      +----------------+      +------------------+
                                   |                       |
                                   v                       v
                         +----------------+      +------------------+
                         | SQLite DB File |      |  SQLite DB File  |
                         |  (Read/Write)  |      |   (Read-Only)    |
                         +----------------+      +------------------+
```

### 7.1 Admin Portal

```text
 +-------------------------------------------------------------+
 |   Browser loads dashboard.html                              |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |  JS: dashboard_auth.js                                      |
 |  -> Calls window.verifyAdminSession() from load_middleware  |
 |     (GET /api/admin/verify)                                 |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |                API: verify_token dependency                 |
 |                                                             |
 |  -> Read 'admin_token' string from HttpOnly Cookie          |
 |  -> Decode JWT payload via auth_utils.py                    |
 |  -> Validate expiration time & Role ('admin' required)      |
 +-------------------------------------------------------------+
                                |
             +------------------+------------------+
             |                                     |
       [ VALID TOKEN ]                      [ INVALID / NULL ]
       (Returns 200 OK)                   (Returns 401 Unauth)
             |                                     |
             v                                     v
 +------------------------+              +------------------------------+
 | dashboard_init.js runs |              | window.location.href =       |
 | -> renders module tab  |              | '/admin/frontend/admin.html' |
 |    bar & loads default |              | (redirect — no DOM wipe)     |
 |    module (records-all)|              +------------------------------+
 +------------------------+
```

#### Authentication Handshake (Login)
```text
 +-------------------------------------------------------------+
 |   Browser: admin.html   -- (POST /api/admin/login) --+      |
 |   (User submits password)                            |      |
 +------------------------------------------------------|------+
                                                        v
 +-------------------------------------------------------------+
 |                Utils: auth_utils.py                         |
 |                                                             |
 |  -> Check Brute Force table (Verify IP is not locked out)   |
 |  -> Verify Admin Password strictly matches .env variable    |
 +-------------------------------------------------------------+
                                |
             +------------------+------------------+
             |                                     |
       [ SUCCESS (Match) ]                  [ FAIL (No Match) ]
             |                                     |
             v                                     v
 +------------------------+              +---------------------+
 | -> Generate new JWT    |              | Return 401 Response |
 | -> Set HttpOnly Cookie |              | (Unauthorized)      |
 | -> Return 200 OK       |              +---------------------+
 +------------------------+
             |
             v
 +-------------------------------------------------------------+
 |   JS: admin_login.js                                        |
 |   window.location.href = '/admin/frontend/dashboard.html'   |
 +-------------------------------------------------------------+
```

### 7.1.1 Dashboard Module Router (loadModule)

```text
 +-------------------------------------------------------------+
 |   Tab clicked in #module-tab-bar                            |
 |   (render_tab_bar.js fires -> window.loadModule(module))    |
 |   OR: dashboard_init.js calls loadModule("records-all")     |
 |       on DOMContentLoaded (default view)                    |
 |   OR: active tab clicked again (refresh — re-renders fresh) |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   dashboard_app.js :: loadModule(module)                    |
 |                                                             |
 |   -> Updates is-active on #module-tab-bar buttons           |
 |   -> Routes module name to the correct editor function      |
 |   (No session check here — done once at page load           |
 |    by dashboard_auth.js)                                    |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   Router Branches (if/else chain)                           |
 |                                                             |
 |   records-all    -> inline record list + pagination +       |
 |                      search                                 |
 |   records-edit   -> window.renderEditRecord("admin-canvas"  |
 |                       , recordId)                           |
 |   lists-ordinary -> window.renderEditLists("admin-canvas",  |
 |                       selectedListName)                     |
 |   records-bulk   -> window.renderBulkUpload("admin-canvas") |
 |   config-arbor   -> window.renderEditDiagram("admin-canvas")|
 |   ranks-wikipedia-> window.renderEditWikiWeights(           |
 |                       "admin-canvas")                       |
 |   ranks-challenges-> 2-tab container injected into canvas   |
 |                      (Academic tab default /                |
 |                       Popular tab lazy-loaded)              |
 |   ranks-responses-> 2-tab container injected into canvas    |
 |                      (Academic tab default /                |
 |                       Popular tab lazy-loaded)              |
 |   text-essays    -> 2-tab container injected into canvas    |
 |                      (Context Essay tab default /           |
 |                       Historiography tab lazy-loaded)       |
 |   text-responses -> window.renderEditResponse("admin-canvas")|
 |   text-news      -> 2-tab container injected into canvas    |
 |                      (News Snippet tab default /            |
 |                       News Sources tab lazy-loaded)         |
 |   text-blog      -> window.renderEditBlogpost(              |
 |                       "admin-canvas")                       |
 |   system-admin   -> system status view                      |
 |   *fallback*     -> generic placeholder                     |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   Editor renders into #admin-canvas                         |
 +-------------------------------------------------------------+
```

### 7.2 Agent Logic & Instructional Prompts

```text
               [ AI Agent / LLM Crawler ]
                           |
                           v
 +-------------------------------------------------------------+
 |               .agent/  Workflows & Skills                  |
 |                                                             |
 |  -> Defines task-specific routines (plan generation,       |
 |     code review, browser testing)                          |
 |  -> Templates for structured output (.md plans)            |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |              assets/ai-instructions.txt                     |
 |                                                             |
 |  -> Targeted guidance for LLM crawlers on content           |
 |     interpretation and expected response behavior           |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |                    README.md                                |
 |                                                             |
 |  -> Project overview and setup instructions                 |
 |  -> Architectural context and module map reference          |
 +-------------------------------------------------------------+
```

### 7.3 Backend API, MCP Server & VPS Config

```text
                 [ External AI Agent ]
                           |
                           v
 +-------------------------------------------------------------+
 |                 Nginx Proxy (Rate Limited)                  |
 |                   (Route: /mcp/...)                         |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |             MCP Server Service (mcp_server.py)              |
 |                                                             |
 |  -> Establishes read-only connection to SQLite database     |
 |  -> Executes strictly sanitized SELECT queries              |
 +-------------------------------------------------------------+
                           |
                           v
             [ JSON Formatted Payload Response ]
                           |
                           v
                [ Agent Context Window ]
```

### 7.3.1 URL Slug Rewriting Architecture

```text
               [ Browser Address Bar ]
               /records or /record/jesus-baptism
                           |
                           v
 +-------------------------------------------------------------+
 |                    nginx.conf (First)                       |
 |                                                             |
 |  GET /records  -->  rewrite to /frontend/pages/records.html |
 |  GET /record/jesus-baptism                                 |
 |    --> named-capture: rewrite to record.html?slug=jesus-bap |
 |  GET /frontend/pages/... (old paths) --> 301 to new slug   |
 |  GET /record.html?slug=... (legacy) --> 301 to /record/... |
 |  GET /record.html?id=...  (legacy) --> 301 to /record/...  |
 +-------------------------------------------------------------+
                      |                    |
                      v                    v
          (rewrite hit)            (rewrite miss)
                |                        |
                v                        v
 +---------------------------+  +----------------------------+
 |  Static file served from  |  | FastAPI route handler     |
 |  /frontend/pages/...      |  | serve_all.py (fallback)   |
 |                           |  |                            |
 |  <base href="/frontend/   |  | @app.get("/records")      |
 |           pages/">         |  | @app.get("/record/{slug}")|
 |                           |  | @app.get("/context") ...  |
 |  All relative CSS/JS/font |  |                            |
 |  references resolve from  |  | Each returns FileResponse( |
 |  /frontend/pages/ dir     |  |   "frontend/pages/...")   |
 +---------------------------+  +----------------------------+
                                           |
                                           v
                              [ Backward Compat 301s ]
                              Old /frontend/pages/*.html
                              --> 301 redirect to /clean-slug
                              (retained for 6 months)
```

### 7.4 Security Protocols & JWT Management

```text
                 [ Incoming Requests ]
                           |
                           v
 +-------------------------------------------------------------+
 |          Nginx Reverse Proxy (rate_limiter.py)              |
 |                                                             |
 |  -> Rate limiting per IP (DDoS protection)                  |
 |  -> SSL termination via nginx.conf                          |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |                .env Credential Vault                        |
 |                                                             |
 |  -> ADMIN_PASSWORD (sha256 hashed for admin login)          |
 |  -> ESV_API_KEY (external Bible API access)                 |
 |  -> DEEPSEEK_API_KEY (AI provider integration)              |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |              auth_utils.py (JWT & Brute Force)             |
 |                                                             |
 |  -> JWT generation with expiration and role claims          |
 |  -> Brute force lockout table (per IP tracking)            |
 |  -> Password verification against .env hash                |
 +-------------------------------------------------------------+
```

### 7.5 Admin Dashboard Refactor Roadmap

The Admin Portal is undergoing a systematic refactor to implement the 'providence' design system and a modular 3-column architecture. The implementation follows this sequence:

1.  **Module 7.1: Login & Dashboard Shell**
    - [plan_dashboard_login_shell.md]
    - Entry point, authentication, and the universal orchestrator for the dashboard grid.

2.  **Module 2.1: All Records Management**
    - [plan_dashboard_records_all.md]
    - High-density tabular view with endless scroll and bulk CSV ingestion.

3.  **Module 2.2: Single Record Editor**
    - [plan_dashboard_records_single.md]
    - Dense multi-section form with sidebar navigation and image handling.

4.  **Module 3.1: Arbor Diagram Management**
    - [plan_dashboard_arbor.md]
    - Interactive hierarchy editor for the recursive evidence tree.

5.  **Module 4.1: Wikipedia Ranked Lists**
    - [plan_dashboard_wikipedia.md]
    - Ranked list curation with integrated weighting and scoring sidebars.

6.  **Module 4.2: Challenge Ranked Lists**
    - [plan_dashboard_challenge.md]
    - Academic/Popular debate management with category-specific weights.

7.  **Module 5.1: Challenge Responses**
    - [plan_dashboard_challenge_response.md]
    - Markdown editor with live preview for scholarly response authoring.

8.  **Module 5.2: Essay & Historiography**
    - [plan_dashboard_essay_historiography.md]
    - Long-form thematic context and historiography document editing.

9.  **Module 6.1: News Sources & Crawler**
    - [plan_dashboard_news_sources.md]
    - Source curation and search keyword management for automated news ingestion.

10. **Module 6.2: Blog Posts**
    - [plan_dashboard_blog_posts.md]
    - Update management with integrated markdown editing and feed control.

11. **Module 7.2: System Health & Maintenance**
    - [plan_dashboard_system.md]
    - Real-time API monitoring, test orchestration, and agent generation.



### 7.6 DeepSeek Agent Client & Generator Scripts

The System module includes three shared Python scripts that power AI-assisted
editorial workflows across the admin dashboard:

```text
             [ Admin Dashboard (JS Frontend) ]
                           |
                           v
 +-------------------------------------------------------------+
 |               admin_api.py (FastAPI)                        |
 |                                                             |
 |  POST /api/admin/snippet/generate                           |
 |  POST /api/admin/metadata/generate                          |
 |  POST /api/admin/agent/run                                  |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |           backend/scripts/agent_client.py                   |
 |                                                             |
 |  -> Shared DeepSeek API client (OpenAI-compatible)          |
 |  -> Three public functions:                                 |
 |     - search_web(search_terms, record_slug, pipeline)       |
 |       Web-search enabled DeepSeek call for article          |
 |       discovery with relevance scores. Logs to              |
 |       agent_run_log. Returns articles, trace_reasoning,     |
 |       tokens_used.                                          |
 |     - generate_snippet(content, slug)                       |
 |       Non-search DeepSeek call requesting a 2-3 sentence    |
 |       archival-quality summary in scholarly tone. Logs to   |
 |       agent_run_log with pipeline = snippet_generation.     |
 |     - generate_metadata(content, slug)                      |
 |       Non-search DeepSeek call requesting 5-10 SEO keywords |
 |       and a meta-description (max 160 chars). Logs to       |
 |       agent_run_log with pipeline = metadata_generation.    |
 |                                                             |
 |  -> All functions write a running row to agent_run_log      |
 |     at start, then update to completed/failed on finish.    |
 |  -> On exception (timeout, auth failure, malformed          |
 |     response), updates log row to failed and re-raises.     |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |               DeepSeek Chat Completions API                 |
 |               (api.deepseek.com/v1/chat/completions)        |
 |                                                             |
 |  -> Reads DEEPSEEK_API_KEY from .env                        |
 |  -> Retries on 429 with exponential backoff (up to 3x)     |
 |  -> Returns content, reasoning_content, and token usage     |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |                  database/database.sqlite                   |
 |                  (agent_run_log table)                      |
 +-------------------------------------------------------------+
```

### 7.6.1 Snippet Generator Flow

```text
 [ Dashboard: User clicks "Generate Snippet" on a record ]
                           |
                           v
 +-------------------------------------------------------------+
 |  JS: snippet_generator.js                                   |
 |  -> Sends POST /api/admin/snippet/generate                  |
 |     Body: { "slug": "jesus-baptism", "content": "..." }    |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  admin_api.py: trigger_snippet_generation()                 |
 |  -> Validates content is non-empty and >= 50 chars          |
 |  -> Calls snippet_generator.generate_snippet(content, slug) |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  backend/scripts/snippet_generator.py                       |
 |  -> Thin wrapper: validates input length                    |
 |  -> Delegates to agent_client.generate_snippet()            |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  backend/scripts/agent_client.py                            |
 |  -> Inserts agent_run_log row (status: running)             |
 |  -> Constructs system + user prompts for scholarly summary  |
 |  -> Calls _call_deepseek() with web_search=False            |
 |  -> Updates agent_run_log row (status: completed)            |
 |  -> Returns snippet string to API                           |
 +-------------------------------------------------------------+
                           |
                           v
 [ API returns { "snippet": "...", "slug": "..." } ]
 [ JS saves snippet to record via PUT /api/admin/records/{id} ]
```

### 7.6.2 Metadata Generator Flow

```text
 [ Dashboard: User clicks "Generate Metadata" on a record ]
                           |
                           v
 +-------------------------------------------------------------+
 |  JS: metadata_handler.js                                    |
 |  -> Sends POST /api/admin/metadata/generate                 |
 |     Body: { "slug": "jesus-baptism", "content": "..." }    |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  admin_api.py: trigger_metadata_generation()                |
 |  -> Validates content is non-empty and >= 100 chars         |
 |  -> Calls metadata_generator.generate_metadata(content,     |
 |     slug)                                                   |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  backend/scripts/metadata_generator.py                      |
 |  -> Thin wrapper: validates input length                    |
 |  -> Delegates to agent_client.generate_metadata()           |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  backend/scripts/agent_client.py                            |
 |  -> Inserts agent_run_log row (status: running)             |
 |  -> Constructs system + user prompts for SEO extraction     |
 |  -> Calls _call_deepseek() with web_search=False            |
 |  -> Parses JSON response for keywords + meta_description    |
 |  -> Updates agent_run_log row (status: completed)            |
 |  -> Returns dict to API                                     |
 +-------------------------------------------------------------+
                           |
                           v
 [ API returns { "keywords": "...", "meta_description": "..." } ]
 [ JS saves metadata to record via PUT /api/admin/records/{id} ]
```

### 7.6.3 Agent Run Flow (Challenge Pipeline)

```text
 [ Dashboard: User clicks "Run Agent" on a challenge record ]
                           |
                           v
 +-------------------------------------------------------------+
 |  admin_api.py: trigger_agent_run()                          |
 |  -> Validates pipeline (academic_challenges |                |
 |     popular_challenges)                                     |
 |  -> Looks up record's search terms from                     |
 |     academic_challenge_search_term or                       |
 |     popular_challenge_search_term                           |
 |  -> Inserts agent_run_log row (status: running)             |
 |  -> Returns 202 Accepted with run_id                        |
 |  -> Spawns background thread:                               |
 |     agent_client.search_web(search_terms, slug, pipeline)   |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  backend/scripts/agent_client.py :: search_web()            |
 |  -> Updates agent_run_log row (now managed in-function)     |
 |  -> Constructs system + user prompts for article discovery  |
 |  -> Calls _call_deepseek() with web_search=True             |
 |  -> Parses JSON response for articles array                 |
 |  -> Updates agent_run_log row (status: completed,           |
 |     articles_found, tokens_used)                            |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  GET /api/admin/agent/logs                                  |
 |  -> Dashboard polls for run completion + results            |
 +-------------------------------------------------------------+
```

### 7.6.4 System Config Flow

The `system_config` table provides a key/value store for global site-wide
configuration that is not tied to any single record. The admin dashboard
reads and writes config values through the system config API endpoints.

```text
 [ Dashboard: System Health module loads ]
                           |
                           v
 +-------------------------------------------------------------+
 |  GET /api/admin/system/config                               |
 |  -> Returns all system_config rows as JSON key/value pairs  |
 +-------------------------------------------------------------+
                           |
                           v
 [ Dashboard displays current configuration ]
                           |
                           v
 [ Admin edits a config value ]
                           |
                           v
 +-------------------------------------------------------------+
 |  PUT /api/admin/system/config                               |
 |  -> Accepts JSON body: { "key": "value", ... }              |
 |  -> Upserts each key/value pair into system_config table    |
 |  -> Uses INSERT ... ON CONFLICT DO UPDATE (SQLite upsert)   |
 +-------------------------------------------------------------+
```


---

## 8.0 Setup & Testing Module

### 8.1 Local Environment Initialization

```text
              [ Developer Run: python build.py ]
                             |
                             v
 +-------------------------------------------------------------+
 |                     tools/db_seeder.py                      |
 |                                                             |
 |  -> Reads structural schema from database.sql               |
 |  -> Injects payload records from seed_data.sql              |
 |  -> Compiles and finalizes database.sqlite                  |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |                     Pipeline Triggers                       |
 |                                                             |
 |  -> pipeline_wikipedia.py                                   |
 |  -> pipeline_popular_challenges.py                          |
 |  -> pipeline_academic_challenges.py                         |
 |  -> pipeline_news.py                                        |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |   tools/generate_sitemap.py (Rebuilds live sitemap.xml)     |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |      tools/minify_admin.py (Obfuscates admin JS payload)    |
 +-------------------------------------------------------------+
                             |
                             v
               [ System Ready for Deployment ]
```

### 8.2 Core Unit & Integration Testing

```text
               [ Developer Local Environment ]
                             |
                             v
 +-------------------------------------------------------------+
 |        port_test.py (Waits for all local services)          |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |      security_audit.py (pip-audit & security scans)         |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |            Trigger `browser_test_skill` agent               |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |         Agent boots Headless Browser UI framework           |
 |         Validates Functional UX + DB Return Paths           |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |   agent_readability_test.py (Asserts JSON/SEO formats)      |
 +-------------------------------------------------------------+
                             |
                             v
             [ Write Audit Report to `/logs` ]
```

### 8.3 Architectural Documentation & Guides

```text
               [ Developer / AI Agent ]
                           |
                           v
 +-------------------------------------------------------------+
 |            documentation/  Root                              |
 |                                                             |
 |  module_sitemap.md     -- Source of truth module map        |
 |  vibe_coding_rules.md  -- Coding philosophies & aesthetics  |
 |  style_guide.md        -- UI / UX visual design guide      |
 |  data_schema.md        -- Core SQLite database blueprint    |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |            documentation/guides/                             |
 |                                                             |
 |  guide_appearance.md         -- Page appearance diagrams    |
 |  guide_dashboard_appearance.md -- Dashboard appearance     |
 |  guide_donations.md          -- External integrations      |
 |  guide_function.md           -- System logic flows (This)  |
 |  guide_security.md           -- Security protocols         |
 |  guide_style.md              -- Visual design reference    |
 |  guide_welcoming_robots.md   -- SEO & AI accessibility    |
 +-------------------------------------------------------------+
```
