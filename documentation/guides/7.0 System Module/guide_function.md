---
name: guide_function.md
purpose: Visual ASCII representations of System Module data flows — admin portal auth, module router, agent logic, backend API/MCP, URL slugs, security, DeepSeek clients
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_donations.md, guide_frontend_appearance.md, guide_security.md, guide_welcoming_robots.md, system_nomenclature.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

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
 |   challenge-academic -> renderChallengeAcademic()         |
 |                      (single-mode, hardcoded academic)      |
 |   challenge-popular  -> renderChallengePopular()            |
 |                      (single-mode, hardcoded popular)       |
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
                  (Claude, DeepSeek, etc.)
                           |
                    stdin/stdout
                           |
                           v
 +-------------------------------------------------------------+
 |          MCP Server Service — stdio transport               |
 |                     (mcp_server.py)                         |
 |                                                             |
 |  1. Agent sends tool request via stdin                       |
 |  2. FastMCP dispatches to the requested tool                |
 |     - list_records()  → filtered columns + type exclusion   |
 |     - get_record()    → explicit column list + type filter  |
 |     - query_encyclopedia_by_era() → filtered by era + type  |
 |     - search_records() → LIKE search + type filter          |
 |  3. Each tool applies filters at the SQL query level:       |
 |     - WHERE type NOT IN ('system_data')                     |
 |     - No queries touch system_config or agent_run_log       |
 |  4. Parameterised (? placeholders) SQL queries execute      |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |            SQLite Database (database/database.sqlite)       |
 |                                                             |
 |  Allowed:  records table (content types only)               |
 |  Blocked:  system_config table (no tools reference it)      |
 |  Blocked:  agent_run_log table (no tools reference it)      |
 |  Excluded: system-managed columns never selected                      |
 |  Excluded: system_data type filtered out at query level     |
 +-------------------------------------------------------------+
                           |
                           v
             [ JSON Formatted Payload Response ]
                           |
                           v
                [ Agent Context Window ]
```

> **Client wiring:** The agent does not discover this server magically — its MCP client must be configured to spawn `mcp_server.py` as a subprocess. See `documentation/guides/guide_welcoming_robots.md` §1a for the config JSON, or copy `deployment/mcp_client_config.example.json` to your client's config directory.

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



### 7.6 DeepSeek Agent Client & Generator Scripts

Wrapping every AI feature in the admin dashboard is a three-layer pipeline:
the frontend JS sends HTTP requests to FastAPI routes, which delegate to thin
Python generator scripts, which all funnel through a single shared
`agent_client.py` that talks to the DeepSeek API and logs every run to the
`agent_run_log` table. There are four distinct pipelines — slug generation,
snippet generation, SEO keywords generation, and web-search-enabled challenge
agent runs — each hitting a different route but sharing the same authentication,
retry logic, and logging infrastructure.

```text
+----------+     +----------+     +----------+     +----------+
|  Slug    |     | Snippet  |     | SEO Kwds |     | Challenge|
| GENERATE |     | GENERATE |     | GENERATE |     | Run Agent|
| button   |     | button   |     | button   |     | button   |
+----+-----+     +----+-----+     +----+-----+     +----+-----+
     |                |                |                |
     v                v                v                v
+-----------+  +-----------+  +-------------+  +-------------------+
| POST /api/|  | POST /api/|  | POST /api/ |  | POST /api/admin/  |
| admin/slug|  | admin/snip|  | admin/meta |  | agent/run         |
| /generate |  | /generate |  | /generate  |  | (web_search=True) |
+-----+-----+  +-----+-----+  +------+-----+  +---------+---------+
      |              |               |                   |
      v              v               v                   v
+-------------------------------------------------------------+
|              backend/scripts/agent_client.py                 |
|                                                             |
|  generate_slug()  generate_snippet()  generate_metadata()   |
|  search_web()  ←────── all four pipelines converge here     |
|                                                             |
|  -> Constructs system + user prompts from templates         |
|  -> Calls _call_deepseek(web_search=True|False)             |
|  -> Writes agent_run_log row (running → completed/failed)   |
|  -> Retries on 429 with exponential backoff (up to 3x)     |
|  -> Reads API key from DEEPSEEK_API_KEY in .env             |
+----+------------------------+-------------------+-----------+
     |                        |                   |
     v                        v                   v
+----------+          +-------------+      +---------------+
| DeepSeek |          | agent_run_  |      | records table |
| Chat     |          | log table   |      | (written when|
| API      |          | (SQLite)    |      | user saves)  |
+----------+          +-------------+      +---------------+
```

Each sub-section below documents one pipeline in detail, following request from
the frontend button click through to the returned API response.

### 7.6.1 Shared Generators: Slug, Snippet & SEO Keywords

The metadata widget (`metadata_widget.js`) is a shared DOM component registered
on `window.renderMetadataWidget()` that provides a unified interface for
auto-generating three record fields — `slug`, `snippet`, and
`metadata_json` (keywords) — across all six consumer dashboard modules
(Records, Visualizations, Challenge Academic, Challenge Popular, News Sources,
and Blog Posts). At injection, the orchestrator calls
`renderMetadataWidget(containerId, options)`, passing an
`onAutoSaveDraft(recordData)` callback, `getRecordTitle()`, and
`getRecordId()` overrides. The widget builds its own DOM: a slug text input with
GENERATE button, a snippet textarea with GENERATE button, a keyword tag editor
with GENERATE button, created_at/updated_at displays, and a GENERATE ALL button.
On load, `populateMetadataWidget(containerId, data)` hydrates all fields from
the record object. On save, `collectMetadataWidget(containerId)` returns
`{ slug, snippet, metadata_json }`. Individual GENERATE buttons POST to their
respective API endpoint and populate the widget field only; they do not persist.
GENERATE ALL fires all three POSTs in parallel via `Promise.allSettled`,
then invokes `onAutoSaveDraft(recordData)` which syncs generated values into
the canonical form fields (Section 1 slug, Section 3 snippet editor, and the
hidden `#record-metadata-json` input) and programmatically clicks
`#btn-save-draft`. The status handler gathers all seven sections via
`collectAllFormData()`, stringifies array-typed fields to JSON, and sends
PUT `/api/admin/records/{id}` (or POST for new records), whose route handler
filters the payload against `get_valid_columns()` and commits the SQLite
transaction. Each generation pipeline is logged to the `agent_run_log` table
with its pipeline name, token count, and completion status.

```text
+-------------------------------------------------------------+
| SLUG GENERATION PIPELINE                                    |
|                                                             |
|  User clicks GENERATE (slug) or GENERATE ALL                 |
|       |                                                     |
|       v                                                     |
|  metadata_widget.js                                         |
|  -> POST /api/admin/slug/generate                           |
|     Body: { slug, content: record_title }                   |
|       |                                                     |
|       v                                                     |
|  admin_api route -> slug_generator.py                       |
|  -> validates title >= 3 chars                              |
|  -> delegates to agent_client.generate_slug()               |
|       |                                                     |
|       v                                                     |
|  agent_client.py                                            |
|  -> prompts DeepSeek for lowercase, hyphenated slug         |
|     without stop words                                      |
|  -> agent_run_log: pipeline=slug_generation                 |
|       |                                                     |
|       v                                                     |
|  Response: { slug: "jesus-baptism" }                        |
|  -> populates #metadata-widget-slug                         |
|  -> syncs to #record-slug via _wireSlugSync()               |
+-------------------------------------------------------------+
```

```text
+-------------------------------------------------------------+
| SNIPPET GENERATION PIPELINE                                  |
|                                                             |
|  User clicks GENERATE (snippet) or GENERATE ALL              |
|       |                                                     |
|       v                                                     |
|  metadata_widget.js (or snippet_generator.js via API)        |
|  -> POST /api/admin/snippet/generate                        |
|     Body: { slug, content: description_paragraphs }         |
|       |                                                     |
|       v                                                     |
|  admin_api route -> snippet_generator.py                    |
|  -> validates content >= 50 chars                           |
|  -> delegates to agent_client.generate_snippet()            |
|       |                                                     |
|       v                                                     |
|  agent_client.py                                            |
|  -> prompts DeepSeek for 2-3 sentence scholarly summary     |
|     in archival tone                                        |
|  -> agent_run_log: pipeline=snippet_generation              |
|       |                                                     |
|       v                                                     |
|  Response: { snippet: "...", slug: "..." }                 |
|  -> populates #metadata-widget-snippet textarea             |
|  -> (on GENERATE ALL) syncs into #snippet-editor-container  |
+-------------------------------------------------------------+
```

```text
+-------------------------------------------------------------+
| SEO KEYWORDS GENERATION PIPELINE                             |
|                                                             |
|  User clicks GENERATE (keywords) or GENERATE ALL             |
|       |                                                     |
|       v                                                     |
|  metadata_widget.js                                         |
|  -> POST /api/admin/metadata/generate                       |
|     Body: { slug, content: description_paragraphs }         |
|       |                                                     |
|       v                                                     |
|  admin_api route -> metadata_generator.py                   |
|  -> validates content >= 100 chars                          |
|  -> delegates to agent_client.generate_metadata()           |
|       |                                                     |
|       v                                                     |
|  agent_client.py                                            |
|  -> prompts DeepSeek for 5-10 SEO keywords and             |
|     meta_description (max 160 chars)                        |
|  -> agent_run_log: pipeline=metadata_generation             |
|       |                                                     |
|       v                                                     |
|  Response: { keywords: "tag1, tag2, ...",                   |
|              meta_description: "..." }                      |
|  -> populates #metadata-widget-tags (keyword chips)         |
|  -> stored as metadata_json: {"keywords": "..."}           |
+-------------------------------------------------------------+
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

### 7.7 Dashboard Sidebar Drag Resize Flow

Introduced by `plan_draggable_sidebar_width.md`. A draggable resize handle in
the Providence divider track lets admin users adjust the sidebar width in real
time. The width is persisted across page reloads via a cookie.

**Files involved:**
- `js/7.0_system/dashboard/dashboard_sidebar_resize.js` — core utility
- `js/7.0_system/dashboard/dashboard_sidebar_resize_init.js` — init wrapper
- `css/1.0_foundation/dashboard/admin_components.css` — handle CSS (section 7)
- `admin/frontend/dashboard.html` — handle element + script tags

```text
 [ Dashboard module loads → loadModule(moduleName) called ]
                           |
                           v
 +-------------------------------------------------------------+
 |  loadModule() calls _clearColumns() (wrapped version)       |
 |  → Original clears columns, resets grid widths              |
 |  → Wrapper cleans up handle's is-dragging class,            |
 |    restores pointer-events                                  |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  Module render function calls _setLayoutColumns()           |
 |  (wrapped version)                                          |
 |                                                             |
 |  CASE A: _setLayoutColumns(false, '1fr')                    |
 |  → Original collapses grid to full-width                    |
 |  → Original adds .no-sidebar class to #admin-canvas         |
 |  → Wrapper checks canvas.classList.contains('no-sidebar')   |
 |  → Sets handle.style.pointerEvents = 'none'                 |
 |  → CSS hides handle (#admin-canvas.no-sidebar               |
 |    #providence-drag-handle { display: none })               |
 |                                                             |
 |  CASE B: _setLayoutColumns('280px', '1fr')                  |
 |  → Original restores sidebar + main columns                 |
 |  → Original removes .no-sidebar class                       |
 |  → Wrapper detects .no-sidebar is absent                    |
 |  → Calls initSidebarResize(canvasEl, { handleEl, ... })     |
 |  → Utility reads saved width from cookie (if any)           |
 |  → Attaches mousedown/touchstart listeners to handle        |
 +-------------------------------------------------------------+
                           |
                           v
 [ Admin user clicks & drags the handle ]
                           |
                           v
 +-------------------------------------------------------------+
 |  onDragStart(e):                                             |
 |  → Records startX (clientX) and startWidth (computed        |
 |    --sidebar-width from getComputedStyle)                    |
 |  → Adds .is-dragging class to handle (accent colour)        |
 |  → Sets body cursor to col-resize, userSelect to none       |
 |  → Attaches global mousemove/mouseup/touchmove/touchend     |
 |    listeners to document (tracks even outside handle)        |
 +-------------------------------------------------------------+
                           |
                           v
 +-------------------------------------------------------------+
 |  onDragMove(e):                                              |
 |  → Calculates deltaX = clientX - startX                     |
 |  → newWidth = startWidth + deltaX                           |
 |  → Clamps: Math.max(180px, Math.min(40vw, newWidth))        |
 |    180px = minimum readable sidebar                         |
 |    40vw  = maximum to prevent main area being obscured       |
 |  → Sets containerEl.style.setProperty('--sidebar-width',    |
 |    newWidth + 'px')                                          |
 |  → CSS Grid reflows both columns immediately                |
 +-------------------------------------------------------------+
                           |
                           v
 [ Admin releases mouse / lifts finger ]
                           |
                           v
 +-------------------------------------------------------------+
 |  onDragEnd(e):                                               |
 |  → Removes .is-dragging class                                |
 |  → Restores body cursor and userSelect                      |
 |  → Removes all global listeners                              |
 |  → Reads final --sidebar-width inline style                  |
 |  → Saves to cookie: setCookie('dashboard-sidebar-width',     |
 |    finalWidth, 90)                                           |
 |  → Cookie path=/ — applies across entire dashboard           |
 +-------------------------------------------------------------+
```

**Backstop limits:**
- Minimum: `180px` — narrow enough for compact nav but wide enough to read
- Maximum: `40vw` — prevents sidebar from consuming more than 40% of viewport

**Cookie persistence:**
- Cookie name: `dashboard-sidebar-width`
- Expiry: 90 days
- Path: `/` (applies across entire dashboard)
- On init: read cookie → parse → apply `--sidebar-width` immediately
- Fallback: `getComputedStyle(containerEl).getPropertyValue('--sidebar-width')`
  (respects whatever `:root` value is set in `shell.css` — currently `280px`)

**No-sidebar modules unaffected:** Modules that call `_setLayoutColumns(false)`
(All Records, Single Record, Arbor, Wikipedia, Challenge, Essay & Hist.,
News Sources, Blog Posts, System) hide the handle via CSS and
`pointer-events: none`. No existing JS files were modified.


---

