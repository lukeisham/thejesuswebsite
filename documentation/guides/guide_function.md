---
name: guide_function.md
purpose: Visual ASCII representations of module functions 
version: 1.6.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md, data_schema.md, detailed_module_sitemap.md]
---

# Guide to Module Functions & Data Flow

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

## 1.0 Foundation Module
**Scope:** Global Grid, Typography, Colors, Shared UI (Sidebar, Header, Footer).  
**Process:** The structural shell. When a user requests a page, the core styling is applied immediately, followed by JavaScript routines that dynamically inject the universal navigation elements so they do not need to be duplicated across HTML files.

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
**Scope:** SQLite Schema, Python Pipelines, Single record views, List views, Search.  
**Process:** The heart of the site. Data is ingested actively by scripts or admins to the SQLite. The frontend `sql.js` WASM engine then reads this data locally into the browser memory, converting raw SQL rows into either dense single-item views or aggregated list cards.

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

---

### 2.1 Search Pipeline — End-to-End Logic Flow
**Purpose:** Documents the complete data path from a user-typed query in the search box through to rendered results on `records.html`.

**Relevant Files (in execution order):**
- `frontend/display_other/search_header.js`
- `frontend/pages/records.html`
- `frontend/core/sanitize_query.js`
- `frontend/core/setup_db.js`
- `frontend/display_big/list_view.js`

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

---

### 2.2 Single Record Create / Edit Pipeline
**Purpose:** Documents the flow for creating a new record or editing an existing one via the Admin Portal form.

**Relevant Files:**
- `admin/frontend/edit_modules/edit_record.js` — form renderer; delegates picture to `edit_picture.js`, relations to `edit_links.js`
- `admin/backend/admin_api.py` — `POST /api/admin/records` (create) and `PUT /api/admin/records/{id}` (update)

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

---

### 2.3 Picture Upload Pipeline
**Purpose:** Documents the flow for uploading, resizing, and compressing PNG images in the Admin Portal.

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

---

### 2.5 Bulk Upload Pipeline
**Purpose:** Documents the flow for bulk uploading and parsing CSV files to create new records rapidly.

**Expected CSV Schema:**
- `title` (Required): String (max 200 chars).
- `slug` (Required): String, unique.
- Taxonomy Enums (Optional): `era`, `timeline`, `map_label`, `gospel_category`. (Must strictly match `data_schema.md`)
- `primary_verse` (Optional): JSON array string (e.g. `[{"book":"Genesis","chapter":1,"verse":1}]`).
- Other matching text fields (e.g., `description`, `snippet`).

```text
 +---------------------------------------------------+
 |       Admin Editor: edit_bulk_upload.js           |
 |            (Drag & Drop .csv file)                |
 |  (Client validates < 5MB and .csv extension)      |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |           POST /api/admin/bulk-upload             |
 |       (Requires verify_token JWT Admin Auth)      |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |                 admin_api.py                      |
 |                                                   |
 |  -> Decodes CSV as utf-8-sig (strips Excel BOM)   |
 |  -> Parses CSV via csv.DictReader                 |
 |  -> Checks required fields (title, slug)          |
 |  -> Checks database for slug uniqueness           |
 |  -> Validates ENUMS against system schema         |
 |  -> Validates primary_verse JSON format           |
 |  (ALL rows validated before any insert)           |
 +---------------------------------------------------+
               |                       |
      [ERRORS FOUND]             [ALL ROWS VALID]
               |                       |
               v                       v
 +------------------------+  +--------------------------------------------+
 | Return 200 Response:   |  | -> Map to SQLite cols dynamically          |
 | {                      |  | -> Generate UUID string for each id        |
 |  "success": false,     |  | -> Auto-set created_at / updated_at (UTC)  |
 |  "errors": ["Row 2.."],|  | -> Execute Bulk INSERT into SQLite DB      |
 |  "created": 0          |  +--------------------------------------------+
 | }                      |                    |
 +------------------------+                    v
                             +--------------------------------------------+
                             | Return 200 Response:                       |
                             | { "success": true,                         |
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
**Scope:** Evidence (Ardor graph), Timeline (Chronological progression), Map (Geo-spatial).  
**Process:** A highly specialized display layer. It intercepts specific metadata fields returned by the WASM database (like `era`, `parent_id`, or `geo_label`) and converts them into coordinates on interactive visual canvases. An admin editor API path also writes `parent_id` relationships directly.

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

**File responsibilities:**
- `frontend/display_big/ardor_display.js` — Public SVG render (WASM read path)
- `admin/frontend/edit_modules/edit_diagram.js` — Admin tree editor (API read/write path)
- `admin/backend/admin_api.py` — GET/PUT endpoints for `parent_id` CRUD
- `css/elements/ardor_diagram.css` — Shared styles (public SVG + admin tree)

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2), Inserting Responses (§4.3).
**Process:** An algorithmic processing flow. External scripts scrape "popularity" or "importance" metrics. These metrics are combined with Admin Manual Multipliers to produce a final rank, dictating exactly where items appear in standard lists. Wikipedia and Challenges run as separate sub-modules with independent pipelines and admin weight editors. A separate Insert Responses module links authored response content to challenge records.

---

### 4.1 Wikipedia Weights — Data Flow
**Purpose:** Documents the flow for scraping Wikipedia metrics and applying admin-set multipliers to produce the final Wikipedia rank.

**Relevant Files:**
- `backend/pipelines/pipeline_wikipedia.py` — scrapes base importance scores
- `admin/frontend/edit_modules/edit_wiki_weights.js` — admin weight editor (ranks-wikipedia)
- `admin/backend/admin_api.py` — PUT /api/admin/records/{id} for weight persistence

```text
 +--------------------------+
 |  4.1 Wikipedia (Metrics) |
 | (Base Importance Score)  |
 |                          |
 | pipeline_wikipedia.py    |
 |  (scheduled or manual)   |
 +-----------+--------------+
             |
             v
 +---------------------------------------------------+
 |  Admin Editor: edit_wiki_weights.js               |
 |  (ranks-wikipedia router branch)                  |
 |                                                   |
 |  -> Fetches current wikipedia_rank,               |
 |     wikipedia_weight, wikipedia_title,            |
 |     wikipedia_link from records table              |
 |                                                   |
 |  -> Renders editable rows:                        |
 |     slug / title    rank    weight                |
 |     tacitus-annals   98   [× 1.20]               |
 |                                                   |
 |  -> Save per row: PUT /api/admin/records/{id}     |
 |     Body: { wikipedia_weight: "×1.20",           |
 |             wikipedia_rank: 98 }                  |
 +---------------------------------------------------+
             |
             v
 +--------------------------+
 | Calculate Final Wikipedia |
 | Rank = Base × Multiplier |
 +-----------+--------------+
             |
             v
 +---------------------------------------------------+
 |         Update SQLite DB Records                  |
 |  wikipedia_rank, wikipedia_weight columns         |
 |  (plus wikipedia_title, wikipedia_link)           |
 +---------------------------------------------------+
             |
             v
 +---------------------------------------------------+
 |     WASM Query -> ORDER BY wikipedia_rank DESC    |
 +---------------------------------------------------+
             |
             v
 +---------------------------------------------------+
 |  Frontend Render: Ranked Wikipedia List (§4.1)   |
 +---------------------------------------------------+
```

---

### 4.2 Challenge Weights — Data Flow
**Purpose:** Documents the flow for scraping challenge metrics and applying admin-set multipliers across Academic and Popular challenge types, each with its own editor tab.

**Relevant Files:**
- `backend/pipelines/pipeline_popular_challenges.py` — scrapes popular challenge scores
- `backend/pipelines/pipeline_academic_challenges.py` — scrapes academic challenge scores
- `admin/frontend/edit_modules/edit_academic_weights.js` — Academic tab editor
- `admin/frontend/edit_modules/edit_popular_weights.js` — Popular tab editor (lazy-loaded)
- `admin/backend/admin_api.py` — PUT /api/admin/records/{id} for weight persistence

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
 |  (ranks-challenges router — 2-tab container)          |
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

---

### 4.3 Inserting Responses — Data Flow
**Purpose:** Documents the flow for browsing challenge lists from the Admin Portal and linking an authored response to a specific challenge record. Response content is authored in §5.2 and linked here via the `responses` JSON blob.

**Relevant Files:**
- `admin/frontend/edit_modules/edit_insert_response_academic.js` — Academic Challenges tab
- `admin/frontend/edit_modules/edit_insert_response_popular.js` — Popular Challenges tab (lazy-loaded)
- `admin/backend/admin_api.py` — PUT /api/admin/records/{id} for responses linkage

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
 +------------------+  |    when empty                 |
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
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).  
**Process:** The human-authored content flow. Admins write exclusively in Markdown via an Admin Portal interface. Essays and Responses are separate sub-modules with independent editors and public layouts, but share the same write pipeline and MLA citation system.

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
**Scope:** News Feed, Blog Feed, Combined Landing Page.  
**Process:** News content is ingested automatically via a scheduled pipeline, then surfaced on the public feeds. Blog posts are authored directly via the Admin Portal. Both feeds contribute snippets to the combined landing page, which links out to the dedicated full-feed pages.

### 6.1 News Ingestion Pipeline
**Purpose:** Documents the automated flow for crawling, ranking, and inserting news events into the database.

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

---

### 6.2 News Articles & Sources — Admin Editor Flow
**Purpose:** Documents the Admin Portal flow for creating news snippets and managing external news sources. Two tabbed sub-editors write to separate columns on the record.

**Relevant Files:**
- `admin/frontend/edit_modules/edit_news_snippet.js` — News Snippet tab editor
- `admin/frontend/edit_modules/edit_news_sources.js` — News Sources tab editor
- `admin/backend/admin_api.py` — POST/PUT endpoints for news_items and news_sources

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> text-news (News Snippet + Sources)       |
 |   Routing -> config-news (direct to Sources tab)      |
 +-------------------------------------------------------+
                         |
          +--------------+--------------+
          |                             |
          v                             v
 +--------------------------+  +--------------------------+
 | text-news branch         |  | config-news branch       |
 | (2-tab container)        |  | (direct single-pane)    |
 |                          |  |                          |
 | [ News Snippet (Active) ]|  | renderEditNewsSources(   |
 | [ News Sources        ]  |  |   "admin-canvas")        |
 +-----------+--------------+  +-------------+------------+
             |                                |
    +--------+--------+              +---------+
    |                  |              |
    v                  v              v
 +----------+  +-------------+  +----------+
 | News     |  | News        |  | News     |
 | Snippet  |  | Sources     |  | Sources  |
 | tab      |  | tab         |  | (direct) |
 | (loaded  |  | (lazy-      |  |          |
 | first)   |  | loaded)     |  |          |
 +-----+----+  +------+------+  +-----+----+
       |              |               |
       v              v               v
 +-------------------------------------------------------+
 |  edit_news_snippet.js              edit_news_sources.js |
 |                                                       |
 |  Form fields:                      Form fields:       |
 |  - Publish Date                    - Label + URL pair |
 |  - Headline                        - List of existing |
 |  - Snippet Body (WYSIWYG)           sources shown as  |
 |  - External Link                     removable tags   |
 |                                                       |
 |  Save: POST /api/admin/             Save: POST/       |
 |        records/{id}/news-snippet    PUT /api/admin/   |
 |  Body: { news_items: { ... } }      records/{id}/    |
 |                                      news-sources     |
 |                                      Body: { news_    |
 |                                      sources: {...} } |
 +-------------------------------------------------------+
             |                                |
             +-------+----------------+-------+
                     |                |
                     v                v
 +-------------------------------------------------------+
 |               SQLite Database                         |
 |                                                       |
 |  news_items  (JSON Blob) — snippet content + metadata  |
 |  news_sources (Label-Value) — named source references  |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |  WASM Query                                           |
 |                                                       |
 |  news_snippet_display.js → Combined Landing Page     |
 |  list_newsitem.js        → Full News Feed (§6.2)     |
 +-------------------------------------------------------+
```

---

### 6.3 Blog Posts — Admin Editor Flow
**Purpose:** Documents the Admin Portal CRUD flow for authoring, editing, and deleting blog posts. Writes to the `blogposts` JSON blob on the record.

**Relevant Files:**
- `admin/frontend/edit_modules/edit_blogpost.js` — blog post editor
- `admin/backend/admin_api.py` — GET /api/admin/blogposts, PUT /api/admin/records/{id}, DELETE /api/admin/records/{id}/blogpost

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> text-blog (Blog Posts)                   |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   Middleware: verifyAdminSession()                    |
 |   (redirects to login if invalid)                     |
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
**Scope:** Initial setup, Agent instructions (`.agent`), backend API management, and VPS deployment.    
**Process:** The DevOps backbone governing how the different services talk to each other on the server. Nginx routes traffic either to static HTML assets, to the secure Admin API, or to the read-only Agent API. It serves as the **primary active security layer**, implementing robust session handling, authentication, and rate limiting to protect the application's data and admin interfaces.

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
**Process:** The secure handshake between the client and the server using JWT-over-Cookie transport. A frontend middleware intercepts all dashboard actions to verify session validity via the backend.

```text
 +-------------------------------------------------------------+
 |             Browser Action (e.g. Load 'Records')            |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |  JS: load_middleware.js   -- (GET /api/admin/verify) --+    |
 +--------------------------------------------------------|----+
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
 +------------------------+              +---------------------+
 | JS: Proceed with       |              | Trigger:            |
 | Module Load sequence   |              | logout_middleware.js|
 +------------------------+              +---------------------+
                                                   |
                                                   v
                                         +---------------------+
                                         | Wipe DOM, Redirect  |
                                         | back to Login Panel |
                                         +---------------------+
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
 +------------------------+
 |   JS: Transition to    |
 |   Admin Dashboard UI   |
 +------------------------+
```

### 7.1.1 Dashboard Module Router (loadModule)
**Purpose:** Routes sidebar navigation clicks to the correct admin editor functions. Defined in `dashboard_app.js` as the `loadModule(moduleName)` async function.

```text
 +-------------------------------------------------------------+
 |   Sidebar Link Clicked (e.g., "Essays", "Responses")       |
 |   data-module="text-essays" | data-module="text-responses"  |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   dashboard_app.js :: loadModule(moduleName)                |
 |                                                            |
 |   Middleware Check: verifyAdminSession()                    |
 |   (intercepts all routes — returns to login if invalid)    |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   Router Branches (if/else chain)                           |
 |                                                            |
 |   records-new    -> window.renderEditRecord("admin-canvas"  |
 |                       , null)                               |
 |   records-edit   -> inline record list + pagination +       |
 |                      search (no editor dispatch)            |
 |   ranks-wikipedia-> window.renderEditWikiWeights(             |
 |                       "admin-canvas")                        |
 |   ranks-challenges-> 2-tab container injected into canvas   |
 |                      (Academic Challenges tab default /      |
 |                       Popular Challenges tab lazy-loaded)    |
 |   lists-resources-> window.renderEditLists("admin-canvas",  |
 |                       selectedListName)                     |
 |   ranks-responses-> 2-tab container injected into canvas    |
 |                      (Academic Challenges tab default /      |
 |                       Popular Challenges tab lazy-loaded)    |
 |   records-bulk   -> window.renderBulkUpload("admin-canvas") |
 |   text-essays    -> 2-tab container injected into canvas    |
 |                      (Context Essay tab default /           |
 |                       Historiography tab lazy-loaded)       |
 |   text-responses -> window.renderEditResponse("admin-canvas")|
 |   text-news      -> 2-tab container injected into canvas    |
 |                      (News Snippet tab default /             |
 |                       News Sources tab lazy-loaded)          |
 |   text-blog      -> window.renderEditBlogpost(               |
 |                       "admin-canvas")                        |
 |   config-news    -> window.renderEditNewsSources(            |
 |                       "admin-canvas")                        |
 |   *fallback*     -> generic split-pane placeholder          |
 +-------------------------------------------------------------+
                          |
                          v
 +-------------------------------------------------------------+
 |   Editor renders into #admin-canvas (or specific pane ID)   |
 +-------------------------------------------------------------+
```

**text-essays router case details:**
- Injects a tabbed `admin-card` container with **Context Essay** (default active) and **Historiography** tabs
- Calls `window.renderEditEssay("tab-content-essay")` immediately on load
- Lazy-loads `window.renderEditHistoriography("tab-content-historiography")` on first Historiography tab click
- Tab switching uses event delegation (`document.getElementById("essays-tab-bar").addEventListener("click", ...)`) — no inline `onclick` handlers
- Pane visibility toggled via the `.is-hidden` CSS class

**text-responses router case details:**
- Direct single-pane call to `window.renderEditResponse("admin-canvas")`
- Protected by a `typeof` guard to verify the function exists before calling

**text-news router case details:**
- Injects a tabbed `admin-card` container with **News Snippet** (default active) and **News Sources** tabs
- Calls `window.renderEditNewsSnippet("tab-content-news-snippet")` immediately on load
- Lazy-loads `window.renderEditNewsSources("tab-content-news-sources")` on first News Sources tab click
- Tab switching uses event delegation (`document.getElementById("news-tab-bar").addEventListener("click", ...)`) — no inline `onclick` handlers
- Pane visibility toggled via the `.is-hidden` CSS class (all panes hidden first, then selected pane shown)

**text-blog router case details:**
- Direct single-pane call to `window.renderEditBlogpost("admin-canvas")`
- Protected by a `typeof` guard to verify the function exists before calling

**config-news router case details:**
- Direct single-pane call to `window.renderEditNewsSources("admin-canvas")`
- Protected by a `typeof` guard to verify the function exists before calling

**ranks-wikipedia router case details:**
- Direct single-pane call to `window.renderEditWikiWeights("admin-canvas")`
- Protected by a `typeof` guard to verify the function exists before calling

**ranks-challenges router case details:**
- Injects a tabbed `admin-card` container with **Academic Challenges** (default active) and **Popular Challenges** tabs
- Calls `window.renderEditAcademicWeights("tab-content-ranks-challenges-academic")` immediately on load
- Lazy-loads `window.renderEditPopularWeights("tab-content-ranks-challenges-popular")` on first Popular Challenges tab click
- Tab switching uses event delegation (`document.getElementById("ranks-challenges-tab-bar").addEventListener("click", ...)`) — no inline `onclick` handlers
- Pane visibility toggled via the `.is-hidden` CSS class (all panes hidden first, then selected pane shown)

**ranks-responses router case details:**
- Injects a tabbed `admin-card` container with **Academic Challenges** (default active) and **Popular Challenges** tabs
- Calls `window.renderEditInsertResponseAcademic("tab-content-ranks-responses-academic")` immediately on load
- Lazy-loads `window.renderEditInsertResponsePopular("tab-content-ranks-responses-popular")` on first Popular Challenges tab click
- Tab switching uses event delegation (`document.getElementById("ranks-responses-tab-bar").addEventListener("click", ...)`) — no inline `onclick` handlers
- Pane visibility toggled via the `.is-hidden` CSS class (all panes hidden first, then selected pane shown)

---


### 7.2 Agent Logic & Instructional Prompts
**Purpose:** Documents how AI agents are guided via configuration files and instructional prompts to interact correctly with the codebase.

**Relevant Files:**
- `.agent/` — Agent workflow definitions and skill templates
- `assets/ai-instructions.txt` — Specialized guidance for LLM crawlers
- `README.md` — Project overview and setup instructions for agents

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

---

### 7.3 Backend API, MCP Server & VPS Config
**Purpose:** Documents the core configuration, read-only external API, Python dependencies, web server setup, and production deployment automation.

**Relevant Files:**
- `mcp_server.py` — Exposes read-only API to external agents
- `requirements.txt` — Python dependencies (FastAPI, JWT, etc)
- `nginx.conf` — Global Web server and SSL/Proxy config
- `.gitignore` — Ensures secrets aren't committed to GitHub
- `LICENCE` — Open Use Licencing with attribution requirement
- `deployment/deploy.sh` — Pull from GitHub and restart services
- `deployment/ssl_renew.sh` — Automates SSL certificate renewal
- `deployment/admin.service` — Systemd config for Admin API
- `deployment/mcp.service` — Systemd config for MCP Server
- `assets/favicon.png` — Website favicon branding
- `assets/*.png` — Raw source images, portraits, environment shots
- `css/design_layouts/pdf_export.css` — Print media queries for exporting essays

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

---

### 7.4 Security Protocols & JWT Management
**Purpose:** Manages credentials, secrets, and security mechanisms including environment variables, rate limiting, and authentication protocols to protect application data and admin interfaces.

**Relevant Files:**
- `.env` — Global Admin, ESV and Deepseek credentials
- `backend/middleware/rate_limiter.py` — DDoS protection for API endpoints
- `admin/backend/auth_utils.py` — JWT generation and Brute Force defense
- `documentation/guides/guide_security.md` — Security protocols and auth mechanism overview

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

---

## 8.0 Setup & Testing Module
**Scope:** Browser tests, data seeders, local performance audits, Documentation.  
**Process:** The quality assurance loop. Used to verify the system's structural integrity when new features are added, ensuring ports are open and the UI layout hasn't broken.

### 8.1 Local Environment Initialization
**Purpose:** Documents the process of compiling the initial database from raw SQL seeds and running pipeline updates to set up the local development environment.

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
**Purpose:** Automated test suites, security audits, and AI-readability verification to ensure system reliability and correctness.

**Relevant Files:**
- `tests/port_test.py` — Verifies all local ports are responding
- `tests/security_audit.py` — Runs automated vulnerability scans
- `tests/agent_readability_test.py` — Simulates AI "headless" crawl
- `tests/browser_test_skill.md` — Instructions for Agents to run browser tests
- `tests/reports/` — Output directory for UI/UX audit logs

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
**Purpose:** Comprehensive documentation covering architecture, style guides, data schemas, and operational procedures for developers and AI agents.

**Relevant Files:**
- `documentation/module_sitemap.md` — Source of truth module map
- `documentation/vibe_coding_rules.md` — Foundational coding philosophies and aesthetic mandates
- `documentation/style_guide.md` — UI / UX visual design guide
- `documentation/data_schema.md` — Core SQLite database blueprint
- `documentation/guides/guide_appearance.md` — Page appearance diagrams
- `documentation/guides/guide_dashboard_appearance.md` — Dashboard appearance
- `documentation/guides/guide_donations.md` — External support integrations
- `documentation/guides/guide_function.md` — System logic flows (This File)
- `documentation/guides/guide_security.md` — Security protocols
- `documentation/guides/guide_style.md` — Visual design reference
- `documentation/guides/guide_welcoming_robots.md` — SEO & AI accessibility

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
