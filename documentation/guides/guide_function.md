---
name: guide_function.md
purpose: Visual ASCII representations of module functions 
version: 1.1.0
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
+--------------------------+
|  Foundation Bootstrapper |
+--------------------------+
| 1. Load grid.css         |
| 2. Load layout logic     |
| 3. Inject header.js      |----> [ Invisible SEO & og:tags Metadata ]
| 4. Inject sidebar.js     |----> [ Constructs Left Nav Tree + Admin Portal Entry ]
| 5. Inject search_header.js|----> [ Injects Visible Search Bar ]
| 6. Inject footer.js      |----> [ Appends Footer & Print Logic ]
+--------------------------+
         |
         v
[ Main Content Container Loaded ]
         |
         +-----> [ Optional: Redirect to Admin Portal (Module 6.1) ]
```

---

## 2.0 Records Module
**Scope:** SQLite Schema, Python Pipelines, Single record views, List views, Search.  
**Process:** The heart of the site. Data is ingested actively by scripts or admins to the SQLite. The frontend `sql.js` WASM engine then reads this data locally into the browser memory, converting raw SQL rows into either dense single-item views or aggregated list cards.

```text
[ Python ETL Pipelines ] -----------> [ SQLite Database ] <-------- [ Admin Portal ]
(Fetch raw external data)             (database.sqlite)             (Manual insertions)
                                              |
                                              v
                              +-------------------------------+
                              |    WASM `sql.js` Engine       |
                              |  (In-Memory Browser SQLite)   |
                              +-------------------------------+
                                              |
                         +--------------------+--------------------+
                         |                    |                    |
                         v                    v                    v
             (2.3 Sanitize)    (2.1 Full Lists)     (2.2 Single Record)
            [sanitize_query.js] Loops rows          Deep data merge view
                    |           into cards          [json_ld_builder.js]
                    v                                       |
             (Search Logic)                                 v
                                                      [ SEO Metadata ]
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
 +-----------+
 | Types     |   e.g. "Peter"
 | query     |
 | presses   |
 | [Enter]   |
 +-----------+
       |
       v
 +---------------------+
 | search_header.js    |   encodeURIComponent("Peter") = "Peter"
 | handleSearchKeydown |   window.location.href =
 |                     |   "/frontend/pages/records.html?search=Peter"
 +---------------------+
       |
       | (browser navigates — full page load)
       v
 +---------------------+
 | records.html        |   Loads scripts in order:
 |                     |   1. sql-wasm.js     (WASM engine)
 |                     |   2. setup_db.js     (fetches DB, fires 'thejesusdb:ready')
 |                     |   3. list_view.js    (listens for 'thejesusdb:ready')
 |                     |   4. initializer.js  (injects sidebar, search bar)
 +---------------------+
       |
       | ('thejesusdb:ready' fires once DB is loaded)
       v
 +---------------------+
 | list_view.js        |   renderListView() runs
 | renderListView()    |   searchParam = URLSearchParams.get('search') = "Peter"
 |                     |   → sets page title: "Search Results: 'Peter'"
 +---------------------+
       |
       v
 +---------------------+
 | sanitize_query.js   |   sanitizeSearchTerm("Peter")
 | sanitizeSearchTerm  |   strips control chars, collapses whitespace,
 |                     |   enforces 200-char max
 |                     |   output: "Peter" (unchanged if clean)
 +---------------------+
       |
       v
 +---------------------+
 | setup_db.js         |   db.searchRecords("Peter", 50)
 | searchRecords()     |
 |                     |   SQL executed (read-only, WASM in-memory):
 |                     |   SELECT id, title, slug, snippet ...
 |                     |   FROM records
 |                     |   WHERE users = 'Public'
 |                     |     AND (title LIKE '%Peter%'
 |                     |          OR snippet LIKE '%Peter%')
 |                     |   ORDER BY page_views DESC
 |                     |   LIMIT 50;
 +---------------------+
       |
       | returns Array<Object> of matching rows
       v
 +---------------------+
 | list_view.js        |   Builds <li> HTML for each row
 | (render loop)       |   Injects into #record-list
 |                     |   Hides pagination (search bypasses it)
 +---------------------+
       |
       v
 +---------------------------------------------------+
 | DOM: #record-list populated with search results   |
 | Title bar reads: Search Results: "Peter"          |
 +---------------------------------------------------+

  ESCAPE KEY (on any page with the search bar):
  searchInput.value = ''  ← input cleared, no navigation
```

---

### 2.2 Picture Upload Pipeline
**Purpose:** Documents the flow for uploading, resizing, and compressing PNG images in the Admin Portal.

```text
 [ Admin Editor: edit_picture.js ]
          | (Select PNG file)
          v
 [ POST /api/admin/records/{id}/picture ]
          |
          v
 [ admin_api.py ] ---> (Validates PNG, sends to pipeline)
          |
          v
 [ image_processor.py ]
  |-- Resize to max 800px width
  |-- Compress size to <= 250KB (Pillow Quantize)
  |-- Generate 200px thumbnail
          |
          v
 [ SQLite Database (UPDATE record) ]
  |-- picture_name
  |-- picture_bytes
  |-- picture_thumbnail
          |
          v
 [ Returns 200 OK + filename ] -> [ edit_picture.js renders preview ]
```

---

## 3.0 Visualizations Module
**Scope:** Evidence (Ardor graph), Timeline (Chronological progression), Map (Geo-spatial).  
**Process:** A highly specialized display layer. It intercepts specific metadata fields returned by the WASM database (like `era`, `parent_id`, or `geo_label`) and converts them into coordinates on interactive visual canvases.

```text
[ WASM SQLite Data Output ] ----> (Extracts Era, Geo, Parent_ID bounds)
          |
          v
+-----------------------------------------+
|      3.0 Visualizations Render Engine   |
+-----------------------------------------+
|                                         |
| -> 3.3 Map:      Plots Map lat/longs    |
| -> 3.2 Timeline: Translates dates to X  |
| -> 3.1 Evidence (Ardor): Builds Y/Z tree|
+-----------------------------------------+
          |
          v
[ Renders SVG/Canvas Interactive Visuals ]
```

---

## 4.0 Ranked Lists Module
**Scope:** Wikipedia article ranks, Challenge popularity limits.  
**Process:** An algorithmic processing flow. External scripts scrape "popularity" or "importance" metrics. These metrics are combined with Admin Manual Multipliers to produce a final rank, dictating exactly where items appear in standard lists.

```text
[ Pipeline Scripts ]
        |
+--------------------------+
| 4.1 Wikipedia (Metrics)  | ----> Base Importance Score
+--------------------------+
| 4.2 Challenges (Metrics) | ----> Base Popularity Context
+--------------------------+
        |
+--------------------------+
| Calculate Final Rank     | <---- [ Admin Weights Editor (Multiplier Overrides) ]
+--------------------------+
        |
[ Update SQLite DB Records ]
        |
[ WASM Query -> ORDER BY final_rank DESC ]
        |
[ Frontend Render: Displays Ranked List UI ] 
```

---

## 5.0 Essays Module
**Scope:** Context-Essays, Historiography, Challenge Responses, News/Blog.  
**Process:** The human-authored content flow. Admins write exclusively in Markdown via an Admin Portal interface. The backend API safely writes this to SQLite. On the frontend, Javascript fetches the markdown payload, parses it into HTML, and applies the specialized premium typography layouts.

```text
[ Admin Portal: Writer Core ]
 (5.1 Context / 5.2 Historiography)
                 |
[ Write Content via Markdown Editor ]
                 |
[ Admin Backend API -> Insert DB ]
                 |
[ WASM Query (User Browser) ]
                 |
[ Parse Markdown payload into HTML ]
                 |
[ Render specialized 'Essay Typography Layout' ]
```

---

## 6.0 System Module
**Scope:** Agent instructions, backend API management, VPS deployment.  
**Process:** The DevOps backbone governing how the different services talk to each other on the server. Nginx routes traffic either to static HTML assets, to the secure Admin API, or to the read-only Agent API.

```text
[ External Web Traffic ]            [ Automated AI Agents ]
           |                                  |
+----------v----------------------------------v---------+
|                   Nginx Reverse Proxy                 |
|       (Rate Limit, robots.txt, sitemap.xml)           |
+----+-----------------------+---------------------+----+
     |                       |                     |
     v                       v                     v
[ Static Assets Files ] [ Admin Auth API ]  [ MCP Server Service ]
(HTML, JS, CSS, WASM)   (Auth & JWT Utils)  (rate_limiter.py)
                            |                      |
                            v                      v
                  [ SQLite Read/Write ]    [ SQLite Read-Only ]
```

### 6.1 Admin Authentication Flow & Middleware
**Process:** The secure handshake between the client and the server using JWT-over-Cookie transport. A frontend middleware intercepts all dashboard actions to verify session validity via the backend.

```text
[ Browser Action (e.g. Load 'Records') ]
         |
         v
[ JS: load_middleware.js ] --( GET /api/admin/verify )--> [ API: admin_api.py ]
                                                                |
         +-----------------------------------------------------+
         |
         v
[ API: verify_token dependency ]
         |
         +--> [ Read 'admin_token' from HttpOnly Cookie ]
         |
         +--> [ Decode JWT via auth_utils.py ]
         |
         +--> [ Validate Exp & Role ('admin') ]
         |
         v
[ Response ] --( 200 OK )--> [ JS: Proceed with Module Load ]
      |
      +----( 401 Unauthorized )--> [ JS: Trigger logout_middleware.js ]
                                            |
                                            v
                                [ Wipe DOM / Redirect to Login ]
```

#### Authentication Handshake (Login)
```text
[ Browser: admin.html ]
         |
         v
[ JS: admin_login.js ] --( POST /api/admin/login )--> [ API: admin_api.py ]
                                                                |
         +-----------------------------------------------------+
         |
         v
[ Utils: auth_utils.py ]
         |
         +--> [ Check Brute Force (IP Lockout) ]
         |
         +--> [ Verify Admin Password ]
         |
         v
[ Success? ] --( Yes )--> [ Generate JWT ] --> [ Set HttpOnly Cookie ]
      |                                                |
      +--------( No )----[ Return 401 Unauthorized ]<--+
                                 |
          +----------------------+
          |
          v
[ JS: Transition to Dashboard ]
```

---

## 7.0 Setup & Testing Module 
**Scope:** Browser tests, data seeders, local performance audits, Documentation.  
**Process:** The quality assurance loop. Used to verify the system's structural integrity when new features are added, ensuring ports are open and the UI layout hasn't broken.

```text
[ Developer Local Environment ]
              |
[ port_test.py (Wait for services) ]
              |
[ security_audit.py (Safety Audit) ] ----> pip-audit & security scans
              |
[ Trigger `browser_test_skill` agent ]
              |
[ Agent boots Headless Browser framework ]
              |
[ Validates Functional UX + DB Return Paths ]
              |
[ agent_readability_test.py ] ----> Asserts AI-welcoming JSON & SEO
              |
[ Write Audit Report to `/logs` directory ]
```
