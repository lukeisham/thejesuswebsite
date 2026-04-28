---
name: guide_function.md
purpose: Visual ASCII representations of module functions 
version: 1.3.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md, data_schema.md, detailed_module_sitemap.md]
---

# Guide to Module Functions & Data Flow

This document provides visual ASCII representations detailing how data physically flows through the 7 interconnected modules of the application.

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
             +----------> [ Optional: Redirect to Admin Portal (Module 6.1) ]
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

### 2.3 Bulk Upload Pipeline
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
**Process:** A highly specialized display layer. It intercepts specific metadata fields returned by the WASM database (like `era`, `parent_id`, or `geo_label`) and converts them into coordinates on interactive visual canvases.

```text
 +---------------------------------------------------+
 |            WASM SQLite Data Output                |
 |    (Extracts Era, Geo, and Parent_ID bounds)      |
 +---------------------------------------------------+
                          |
                          v
 +---------------------------------------------------+
 |        3.0 Visualizations Render Engine           |
 +---------------------------------------------------+
       |                  |                  |
       v                  v                  v
+--------------+   +--------------+   +--------------+
|   3.3 Map    |   | 3.2 Timeline |   | 3.1 Evidence |
|              |   |              |   |   (Ardor)    |
| Plots array  |   | Translates   |   | Builds       |
| of lat/longs |   | dates to X   |   | Y/Z tree     |
+--------------+   +--------------+   +--------------+
       |                  |                  |
       +------------------+------------------+
                          |
                          v
 +---------------------------------------------------+
 |      Renders SVG/Canvas Interactive Visuals       |
 +---------------------------------------------------+
```

---

## 4.0 Ranked Lists Module
**Scope:** Wikipedia article ranks, Challenge popularity limits.  
**Process:** An algorithmic processing flow. External scripts scrape "popularity" or "importance" metrics. These metrics are combined with Admin Manual Multipliers to produce a final rank, dictating exactly where items appear in standard lists.

```text
 +--------------------------+       +--------------------------+
 |  4.1 Wikipedia (Metrics) |       | 4.2 Challenges (Metrics) |
 | (Base Importance Score)  |       | (Base Popularity Context)|
 +--------------------------+       +--------------------------+
               |                                  |
               +----------------+-----------------+
                                |
                                v
 +-------------------------------------------------------------+
 |                    Calculate Final Rank                     |
 |        <-- [ Admin Weights Editor (Overrides) ]             |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |                 Update SQLite DB Records                    |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |            WASM Query -> ORDER BY final_rank DESC           |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |          Frontend Render: Displays Ranked List UI           |
 +-------------------------------------------------------------+
```

---

## 5.0 Essays Module
**Scope:** Context-Essays, Historiography, Challenge Responses, News/Blog.  
**Process:** The human-authored content flow. Admins write exclusively in Markdown via an Admin Portal interface. The backend API safely writes this to SQLite. On the frontend, Javascript fetches the markdown payload, parses it into HTML, and applies the specialized premium typography layouts.

```text
 +-------------------------------------------------------------+
 |                Admin Portal: Writer Core                    |
 |            (5.1 Context / 5.2 Historiography)               |
 +-------------------------------------------------------------+
                                |
                                v
 +-------------------------------------------------------------+
 |             Write Content via Markdown Editor               |
 +-------------------------------------------------------------+
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
                                v
 +-------------------------------------------------------------+
 |        Render specialized 'Essay Typography Layout'         |
 +-------------------------------------------------------------+
```

---

### 5.1 News Ingestion Pipeline
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
 |           list_newsitem.js renders the News Feed            |
 +-------------------------------------------------------------+
```

---

## 6.0 System Module
**Scope:** Agent instructions, backend API management, VPS deployment.  
**Process:** The DevOps backbone governing how the different services talk to each other on the server. Nginx routes traffic either to static HTML assets, to the secure Admin API, or to the read-only Agent API.

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

### 6.1 Admin Authentication Flow & Middleware
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

### 6.1.1 Dashboard Module Router (loadModule)
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
 |   lists-resources-> window.renderEditLists("admin-canvas",  |
 |                       selectedListName)                     |
 |   records-bulk   -> window.renderBulkUpload("admin-canvas") |
 |   text-essays    -> 2-tab container injected into canvas    |
 |                      (Context Essay tab default /           |
 |                       Historiography tab lazy-loaded)       |
 |   text-responses -> window.renderEditResponse("admin-canvas")|
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

---


### 6.2 MCP Server API Flow
**Purpose:** Documents the read-only data access layer for external AI agents querying the system.

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

## 7.0 Setup & Testing Module 
**Scope:** Browser tests, data seeders, local performance audits, Documentation.  
**Process:** The quality assurance loop. Used to verify the system's structural integrity when new features are added, ensuring ports are open and the UI layout hasn't broken.

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

---

### 7.1 Database Seeding & Build Flow
**Purpose:** Documents the process of compiling the initial database from raw SQL seeds and running pipeline updates.

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
