---
name: guide_function.md
purpose: ASCII lifecycle diagrams and technical descriptions for the 7.0 System Module — auth, module routing, URL rewriting, agent pipelines, health polling, sidebar resize
version: 2.0.0
dependencies: [simple_module_sitemap.md, guide_dashboard_appearance.md, system_nomenclature.md]
---

# Function — 7.0 System Module

## 7.1 Authentication Lifecycle

```text
 [ User visits login.html ]
              |
              v
 +----------------------------------+
 | admin.js :: handleLogin()        |
 | POST /api/admin/login            |
 | Body: { password }               |
 +----------------------------------+
              |
              v
 +----------------------------------+
 | auth_utils.py                    |
 | check_brute_force(ip)            |
 |   5 failures -> 300s lockout     |
 |   1s artificial delay on fail    |
 | verify_password(password)        |
 |   strict match vs ADMIN_PASSWORD |
 +----------------------------------+
              |
     +--------+--------+
     |                  |
  SUCCESS            FAILURE
     |                  |
     v                  v
 +-----------------+ +------------------+
 | create JWT      | | record_attempt() |
 |  (HS256, 12h)   | | Return 401       |
 | Set cookies:    | +------------------+
 |  admin_token    |
 |   (HttpOnly)    |
 |  csrf_token     |
 |   (non-HttpOnly)|
 | Return 200      |
 +-----------------+
         |
         v
 +----------------------------------+
 | admin.js redirects browser to    |
 | /admin/frontend/dashboard.html   |
 +----------------------------------+
              |
              v
 +----------------------------------+
 | dashboard_orchestrator.js        |
 | verifyAdminSession()             |
 |  GET /api/admin/verify           |
 +----------------------------------+
              |
     +--------+--------+
     |                  |
  200 OK             401
     |                  |
     v                  v
 +-----------------+ +------------------+
 | initDashboard() | | Redirect back to |
 |  1. injectUniv- | | login.html       |
 |     ersalHeader | +------------------+
 |  2. renderDash- |
 |     boardCards  |
 |  3. injectError |
 |     Footer      |
 +-----------------+
```

The System Module uses a two-page architecture. `login.html` contains only the password form and `admin.js`; no dashboard markup or scripts are loaded until authentication succeeds. On successful login, `auth.py` sets an HttpOnly JWT cookie (`admin_token`, 12 h expiry, HS256-signed with `SECRET_KEY`) and a non-HttpOnly `csrf_token`. The browser redirects to `dashboard.html`, where `dashboard_orchestrator.js` calls `verifyAdminSession()` before initialising the shell. If the JWT is missing or expired, the user is redirected back to `login.html`.

Brute-force protection is implemented per IP in `AuthUtils`: 5 consecutive failures lock the IP for 300 s, and every failed attempt incurs a 1 s artificial delay. The lockout state is stored in-memory (resets on server restart).

## 7.2 Module Routing Lifecycle

```text
 [ User clicks a module card in #admin-cards ]
 [ OR clicks a tab in #module-tab-bar       ]
              |
              v
 +--------------------------------------+
 | dashboard_app.js :: loadModule(name)  |
 |                                       |
 | 1. _clearColumns()                    |
 |    - wipes sidebar + main content     |
 |    - resets grid widths               |
 |    - cleans up drag handle state      |
 |                                       |
 | 2. _setActiveTab(name)                |
 |    - updates .is-active on tab bar    |
 |                                       |
 | 3. Lookup MODULE_RENDERERS[name]      |
 |    - resolves render function name    |
 |    - calls window[renderFn]()         |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | MODULE_RENDERERS map:                |
 |                                      |
 | records-all       -> renderRecordsAll       |
 | records-single    -> renderRecordsSingle    |
 | arbor             -> renderArbor            |
 | wikipedia         -> renderWikipedia        |
 | challenge-academic-> renderChallengeAcademic|
 | challenge-popular -> renderChallengePopular |
 | challenge-response-> renderChallengeResponse|
 | essay             -> renderEssay            |
 | historiography    -> renderHistoriography   |
 | news-sources      -> renderNewsSources      |
 | blog-posts        -> renderBlogPosts        |
 | system            -> renderSystem           |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | Render function populates            |
 | #admin-canvas via Providence columns |
 |                                      |
 | _setLayoutColumns(sidebar, main)     |
 |  - sidebar='280px' -> 2-column mode  |
 |  - sidebar=false   -> full-width     |
 |    (hides drag handle, adds          |
 |     .no-sidebar to #admin-canvas)    |
 +--------------------------------------+
```

Module routing is a static dispatch. `dashboard_app.js` maintains two maps — `MODULE_RENDERERS` (module name to render function name) and `MODULE_LABELS` (module name to display text). When `loadModule(name)` is called, it clears the Providence canvas, updates the tab bar, looks up the render function by name from `MODULE_RENDERERS`, and calls `window[renderFn]()`. There is no default module auto-loaded on init — the user must click a card to begin.

Each render function decides its own layout by calling `_setLayoutColumns(sidebarWidth, mainWidth)`. Modules that use a sidebar pass `('280px', '1fr')`; modules that don't pass `(false, '1fr')`, which adds the `.no-sidebar` class and hides the drag handle.

## 7.3 URL Routing

| Clean URL | nginx rewrite target | FastAPI fallback (`serve_all.py`) |
|-----------|---------------------|----------------------------------|
| `/` | `index.html` (nginx `index` directive) | Static mount fallback |
| `/records` | `frontend/pages/records.html` | `@app.get("/records")` |
| `/record/{slug}` | `frontend/pages/record.html?slug={slug}` | `@app.get("/record/{slug}")` |
| `/context` | `frontend/pages/context.html` | `@app.get("/context")` |
| `/context/essay` | `frontend/pages/context_essay.html` | `@app.get("/context/essay")` |
| `/context/{slug}` | `frontend/pages/context_essay.html?slug={slug}` | `@app.get("/context/{slug}")` |
| `/debate` | `frontend/pages/debate.html` | `@app.get("/debate")` |
| `/debate/{slug}` | `frontend/pages/debate/response.html?slug={slug}` | `@app.get("/debate/{slug}")` |
| `/blog` | `frontend/pages/blog.html` | `@app.get("/blog")` |
| `/blog/{slug}` | `frontend/pages/blog_post.html?slug={slug}` | `@app.get("/blog/{slug}")` |
| `/news` | `frontend/pages/news_and_blog.html` | `@app.get("/news")` |
| `/resources` | `frontend/pages/resources.html` | `@app.get("/resources")` |
| `/frontend/pages/*.html` | 301 redirect to clean slug | 301 redirect to clean slug |
| `/debate/response/{slug}` | 301 redirect to `/debate/{slug}` | 301 redirect to `/debate/{slug}` |

```text
 [ Browser requests /record/jesus-baptism ]
              |
              v
 +--------------------------------------+
 | nginx.conf                           |
 | location ~ ^/record/(.+)$ {          |
 |   rewrite ^/record/(.+)$             |
 |   /frontend/pages/record.html        |
 |   ?slug=$1 break;                    |
 | }                                    |
 +--------------------------------------+
         |                |
   rewrite hit      rewrite miss
         |                |
         v                v
 +----------------+ +-------------------+
 | Static file    | | FastAPI           |
 | served by      | | serve_all.py      |
 | nginx directly | | @app.get(         |
 |                | |  "/record/{slug}")|
 | <base href=    | | FileResponse(     |
 | "/frontend/    | |  "frontend/pages/ |
 |  pages/">      | |   record.html")   |
 +----------------+ +-------------------+

 [ Legacy URL: /frontend/pages/record.html?slug=jesus-baptism ]
              |
              v
 +--------------------------------------+
 | nginx 301 redirect                   |
 | -> /record/jesus-baptism             |
 | (backward compat, retained 6 months) |
 +--------------------------------------+
```

URL routing uses a two-tier strategy. nginx handles all clean-slug rewrites first: `/record/{slug}` is internally rewritten to `/frontend/pages/record.html?slug={slug}` without a redirect. If nginx doesn't match (e.g. the app is running without nginx during development), FastAPI's `serve_all.py` provides identical route handlers that return `FileResponse` to the same HTML files.

Legacy URLs (`/frontend/pages/*.html`, `/record.html?slug=...`, `/record.html?id=...`) are caught by nginx and 301-redirected to their clean-slug equivalents. All HTML pages use `<base href="/frontend/pages/">` so relative CSS/JS/font references resolve correctly regardless of the clean URL in the address bar.

Rate limiting is configured in the nginx `limit_req_zone` directive at 30 req/s per IP. API routes are proxied to the FastAPI Unix socket.

## 7.4 System Health Polling Lifecycle

```text
 [ renderSystem() called ]
              |
              v
 +--------------------------------------+
 | _setLayoutColumns(false, '1fr')      |
 | Fetch dashboard_system.html template |
 | Inject into #providence-col-main     |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | Start 3 polling loops:               |
 |                                      |
 | startSystemDataPolling()  (10s)      |
 |   GET /api/admin/health_check        |
 |   -> _renderApiHealth(data)          |
 |   -> _renderVpsResources(data)       |
 |   -> _renderSecurity(data)           |
 |   -> _renderDeepSeek(data)           |
 |                                      |
 | startAgentMonitorPolling() (5s)      |
 |   GET /api/admin/agent/logs?limit=50 |
 |   -> _renderSummaryBar(runs)         |
 |   -> _renderTable(runs)              |
 |                                      |
 | startMcpMonitorPolling()             |
 |   -> renderMcpStdioStatus() (static) |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | health_check returns:                |
 | {                                    |
 |   status: "ok"|"degraded"|"error",   |
 |   database: { status, record_count },|
 |   resources: {                       |
 |     cpu_percent, memory: {           |
 |       total_gb, used_gb, percent },  |
 |     disk: { total_gb, used_gb,       |
 |       percent }, uptime_seconds      |
 |   },                                 |
 |   deepseek_api: { status },          |
 |   esv_api: { status },               |
 |   security: {                        |
 |     session: { status, expires_in }, |
 |     authentication: {                |
 |       failed_login_attempts,         |
 |       locked_ips, top_offenders      |
 |     },                               |
 |     rate_limiter: {                   |
 |       tracked_ips,                    |
 |       currently_throttled            |
 |     },                               |
 |     api_keys: { deepseek, esv }      |
 |   }                                  |
 | }                                    |
 +--------------------------------------+
              |
              v
 [ Health cards update with colour-coded status ]
 [ .health-card__value--ok | --degraded | --error | --offline ]
              |
              v
 [ On module unload: stopSystemDataPolling(),  ]
 [ stopAgentMonitorPolling(), stopMcpMonitor() ]
```

The system dashboard launches three independent polling loops when `renderSystem()` is called. `startSystemDataPolling()` hits `GET /api/admin/health_check` every 10 s and updates four health cards: API health, VPS resources (CPU/memory/disk meter bars), security status, and DeepSeek API reachability. `startAgentMonitorPolling()` hits `GET /api/admin/agent/logs?limit=50` every 5 s and renders the agent activity table plus the summary stats bar. `startMcpMonitorPolling()` renders a static MCP stdio status card (no live polling). All intervals are cleared when the user navigates away from the system module.

The `health_check` endpoint (`system.py`) probes the SQLite database, pings the DeepSeek and ESV APIs, reads VPS resource metrics via `psutil`, and inspects the brute-force lockout table and rate-limiter state.

## 7.5 DeepSeek Agent Pipeline Lifecycle

```text
 +----------+    +----------+    +----------+    +----------+
 |  Slug    |    | Snippet  |    | SEO Kwds |    | Challenge|
 | GENERATE |    | GENERATE |    | GENERATE |    | Run Agent|
 | button   |    | button   |    | button   |    | button   |
 +----+-----+    +----+-----+    +----+-----+    +----+-----+
      |               |               |               |
      v               v               v               v
 POST /api/      POST /api/      POST /api/      POST /api/
 admin/slug/     admin/snippet/  admin/metadata/  admin/agent/
 generate        generate        generate         run
      |               |               |               |
      v               v               v               v
 +-------------------------------------------------------------+
 |           backend/scripts/agent_client.py                    |
 |                                                              |
 | generate_slug()     -> pipeline: slug_generation             |
 | generate_snippet()  -> pipeline: snippet_generation          |
 | generate_metadata() -> pipeline: metadata_generation         |
 | search_web()        -> pipeline: academic_challenges |       |
 |                                  popular_challenges          |
 |                                                              |
 | Shared infrastructure:                                       |
 |  _call_deepseek(web_search=True|False)                       |
 |  _insert_log_run() -> agent_run_log (status: running)        |
 |  _update_log_completed() | _update_log_failed()              |
 |  Retry on 429 with exponential backoff (up to 3x)            |
 |  API key from DEEPSEEK_KEY env var                            |
 +-----+-------------------+--------------------+--------------+
       |                   |                    |
       v                   v                    v
 +----------+       +-------------+      +---------------+
 | DeepSeek |       | agent_run_  |      | records table |
 | Chat API |       | log table   |      | (updated on   |
 |          |       | (audit log) |      |  user save)   |
 +----------+       +-------------+      +---------------+
```

```text
 CHALLENGE AGENT ASYNC FLOW:

 [ User clicks "Run Agent" ]
              |
              v
 +--------------------------------------+
 | POST /api/admin/agent/run            |
 | Body: { pipeline, slug }             |
 |                                      |
 | 1. Validate pipeline name            |
 | 2. Look up search terms from record  |
 | 3. Insert agent_run_log (running)    |
 | 4. Return 202 Accepted + run_id      |
 | 5. Spawn background thread:          |
 |    agent_client.search_web()         |
 +--------------------------------------+
              |
     +--------+--------+
     |                  |
  202 to client    Background thread
     |                  |
     v                  v
 +-----------------+ +---------------------+
 | gather_trigger  | | search_web()        |
 | .js polls       | | _call_deepseek(     |
 | GET /api/admin/ | |   web_search=True)  |
 | agent/logs      | | Parse JSON articles |
 | every 2s        | | Update agent_run_log|
 | timeout: 120s   | |  (completed/failed) |
 +-----------------+ +---------------------+
         |
         v
 [ Poll detects status != 'running' ]
 [ Auto-refreshes module view       ]
```

All AI generation features funnel through `agent_client.py`, which provides four pipeline functions. The three metadata generators (slug, snippet, SEO keywords) are synchronous — the FastAPI route calls the generator, waits for the DeepSeek response, and returns the result directly.

The challenge agent pipeline is asynchronous. `POST /api/admin/agent/run` inserts an `agent_run_log` row with status `running`, returns 202 immediately, and spawns a background thread that calls `search_web()` with `web_search=True`. The frontend uses `triggerGather()` to poll `GET /api/admin/agent/logs` every 2 s (120 s timeout) until the run status changes from `running`, then auto-refreshes the view.

The metadata widget (`metadata_widget.js`) is a shared DOM component used by six consumer modules (Records, Arbor, Challenge Academic, Challenge Popular, News Sources, Blog Posts). It provides GENERATE buttons for slug, snippet, and keywords individually, plus a GENERATE ALL button that fires all three in parallel via `Promise.allSettled` and auto-saves the draft.

## 7.6 Sidebar Drag Resize Lifecycle

```text
 [ Module renders with sidebar: _setLayoutColumns('280px', '1fr') ]
              |
              v
 +--------------------------------------+
 | initSidebarResize(canvasEl, opts)     |
 |  1. Read 'dashboard-sidebar-width'   |
 |     cookie (if set)                   |
 |  2. Apply --sidebar-width inline      |
 |  3. Attach mousedown/touchstart       |
 |     to #providence-drag-handle        |
 +--------------------------------------+
              |
              v
 [ User drags handle ]
              |
 +--------------------------------------+
 | onDragStart:                          |
 |  Record startX, startWidth            |
 |  Add .is-dragging to handle           |
 |  Set body cursor: col-resize          |
 |  Attach global move/end listeners     |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | onDragMove (per frame):               |
 |  deltaX = clientX - startX            |
 |  newWidth = startWidth + deltaX        |
 |  Clamp: min 180px, max 40vw           |
 |  Set --sidebar-width on container      |
 |  CSS Grid reflows immediately          |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | onDragEnd:                            |
 |  Remove .is-dragging                   |
 |  Restore cursor, userSelect            |
 |  Remove global listeners               |
 |  Save final width to cookie            |
 |   name: 'dashboard-sidebar-width'      |
 |   expiry: 90 days, path: /             |
 +--------------------------------------+

 [ Module renders without sidebar: _setLayoutColumns(false, '1fr') ]
              |
              v
 +--------------------------------------+
 | .no-sidebar added to #admin-canvas    |
 | Handle hidden via CSS display:none    |
 | Handle pointer-events set to none     |
 +--------------------------------------+
```

The Providence sidebar is drag-resizable via `dashboard_sidebar_resize.js`. When a module calls `_setLayoutColumns('280px', '1fr')`, the wrapper function detects that `.no-sidebar` is absent and calls `initSidebarResize()`, which reads any previously saved width from the `dashboard-sidebar-width` cookie and applies it as a `--sidebar-width` CSS custom property. The drag handle responds to both mouse and touch events, clamping the sidebar between 180 px (minimum readable width) and 40 vw (prevents obscuring the main column). On drag end, the final width is persisted to a 90-day cookie.

Modules that call `_setLayoutColumns(false, '1fr')` (all 12 modules currently use full-width mode) add `.no-sidebar` to `#admin-canvas`, which hides the drag handle and disables pointer events.

## 7.7 MCP Server Lifecycle

```text
 [ External AI Agent (Claude, DeepSeek, etc.) ]
              |
         stdin/stdout
              |
              v
 +--------------------------------------+
 | mcp_server.py (FastMCP, stdio)       |
 |                                      |
 | Tools:                                |
 |  list_records()                       |
 |    SELECT filtered columns            |
 |    WHERE type NOT IN ('system_data')  |
 |                                      |
 |  get_record(slug)                     |
 |    SELECT explicit column list        |
 |    WHERE slug=? AND type!=system_data |
 |                                      |
 |  query_encyclopedia_by_era(era)       |
 |    WHERE era=? AND type!=system_data  |
 |                                      |
 |  search_records(query)                |
 |    LIKE search + type filter          |
 |                                      |
 | All queries use ? placeholders        |
 | No tools access system_config or      |
 |  agent_run_log tables                 |
 +--------------------------------------+
              |
              v
 +--------------------------------------+
 | SQLite (database/database.sqlite)    |
 | Read-only connection                  |
 +--------------------------------------+
              |
              v
 [ JSON response via stdout -> Agent context window ]
```

The MCP server (`mcp_server.py`) exposes four read-only tools over stdio transport using the FastMCP framework. Each tool queries the `records` table with parameterised SQL and filters out `system_data`-type rows at the query level. The `system_config` and `agent_run_log` tables are never referenced by any tool. The agent's MCP client must be configured to spawn `mcp_server.py` as a subprocess — see `deployment/mcp_client_config.example.json` for the configuration template.

## 7.8 System Config Lifecycle

```text
 [ System dashboard loads ]
              |
              v
 +--------------------------------------+
 | GET /api/admin/system/config          |
 | Returns all key/value pairs as JSON   |
 +--------------------------------------+
              |
              v
 [ Admin edits config values ]
              |
              v
 +--------------------------------------+
 | PUT /api/admin/system/config          |
 | Body: { "key": "value", ... }         |
 | INSERT ... ON CONFLICT DO UPDATE      |
 | (SQLite upsert per key)               |
 +--------------------------------------+
```

The `system_config` table is a simple key/value store for site-wide settings. The GET endpoint returns all rows; the PUT endpoint accepts a JSON object and upserts each key/value pair using SQLite's `INSERT ... ON CONFLICT DO UPDATE` syntax. Both endpoints require a valid admin session.
