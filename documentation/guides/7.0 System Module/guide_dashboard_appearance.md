---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 7.0 System Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, high_level_schema.md, guide_donations.md, guide_frontend_appearance.md, guide_function.md, guide_security.md, guide_welcoming_robots.md, system_nomenclature.md]
---

## 7.0 System Module
**Scope:** Authentication, session management, dashboard shell, card landing page, system health monitoring, agent activity.

### 7.1 Dashboard System (`dashboard_orchestrator.js`, `dashboard_system.js`)
**Purpose:** Two-page architecture that separates authentication (login) from the dashboard itself, a card-based landing page for module navigation, and a system health monitoring hub.

**Page flow:**
1. User visits `admin.html` — login form only; no dashboard markup or scripts.
2. On successful login, the backend sets an HttpOnly JWT cookie and the browser redirects to `dashboard.html`.
3. On load, `dashboard_auth.js` calls `window.verifyAdminSession()` (from `load_middleware.js`). If the session cookie is invalid, it redirects back to `admin.html`.
4. `dashboard_init.js` runs on DOMContentLoaded: calls `renderTabBar("module-tab-bar", allModules, "records-all")` to populate the module tab bar, wires the logout button, and calls `loadModule("records-all")` to render the default view.
5. Clicking **Dashboard** in the header renders the card landing page (10 cards in a 3×3+tenth grid).
6. Clicking any module card opens that module's editor view.
7. `loadModule()` updates the active tab state and populates `#admin-canvas`.

**DB Fields:**
```
── NO WRITES TO `records` TABLE BY DASHBOARD EDITORS ────────────────────
System-managed fields (never manually edited in any dashboard section):
  page_views        INTEGER           — auto-incremented on public page load;
                                        read-only across all admin views

── system_config TABLE (separate key/value store) ────────────────────────
  key               TEXT PK           — configuration key
  value             TEXT              — configuration value (JSON for complex)
  updated_at        TEXT (ISO8601)    — last modification timestamp
  updated_by        TEXT              — admin who last modified

── agent_run_log TABLE (pipeline execution tracking) ─────────────────────
  id                INTEGER PK AUTOINCREMENT
  pipeline          TEXT NOT NULL
  record_slug       TEXT (nullable)
  status            TEXT NOT NULL    — 'running' | 'completed' | 'failed'
  trace_reasoning   TEXT
  articles_found    INTEGER DEFAULT 0
  tokens_used       INTEGER DEFAULT 0
  error_message     TEXT (nullable)
  started_at        TEXT NOT NULL ISO8601
  completed_at      TEXT (nullable) ISO8601

── POLYMORPHIC system_data ROWS (type='system_data' in records table) ────
type                TEXT              — 'system_data'
sub_type            TEXT              — NULL | 'trace_reasoning'
value               TEXT              — configuration value (JSON for complex)
updated_by          TEXT              — admin who last modified
trace_reasoning     TEXT (64-bit int) — trace reasoning identifier

**`admin.html` — Login Page:**
```text
+-----------------------------------------------------------------------------------+
| [ The Jesuswebsite ]                                                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                    ┌─────────────────────────────┐                               |
|                    │   Admin Login               │                               |
|                    │                             │                               |
|                    │   Password: [____________]  │                               |
|                    │                             │                               |
|                    │            [Login]          │                               |
|                    │                             │                               |
|                    │   [ Error message here ]    │                               |
|                    └─────────────────────────────┘                               |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

**`dashboard.html` — Card Landing Page (Dashboard):**
```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >     |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | All Records        |  | Single Record      |  | Arbor Diagram      |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Browse & manage    |  | Deep-dive record   |  | Visual evidence    |         |
|  | all records        |  | editor             |  | tree editor        |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Wikipedia          |  | Academic Challenges|  | Popular Challenges |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Rank Wikipedia     |  | Manage academic    |  | Manage popular     |         |
|  | articles           |  | debate challenges  |  | query challenges   |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Challenge Resp.    |  | Essays             |  | Historiography     |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Author scholarly   |  | Write context,     |  | Author the central |         |
|  | responses          |  | theological essays |  | historiography     |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | News Sources       |  | Blog Posts         |  | System             |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Manage news        |  | Author blog        |  | Monitor health,    |         |
|  | crawler & sources  |  | content            |  | agents & tests     |         |
|  +--------------------+  +--------------------+  +--------------------+         |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**`dashboard.html` — System Dashboard (Module View):**

**Plan:** `plan_dashboard_system.md`

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Configuration ]   [ Restart Services ]            |
+---------------------------------------------------------------------------------+
| System Data & Logs                                                              |
| +-----------------------------------------------------------------------------+ |
| | Agent Status: Online                                                        | |
| | API Health: OK (99.9% uptime)                                               | |
| | VPS CPU Usage: [|||||     ] 50%                                             | |
| | Security: JWT valid, no active alerts                                       | |
| | DeepSeek API: OK | Tokens Today: 12,450 | Runs Today: 8                     | |
| | MCP Server: Online | Tools: 12 | Errors Today: 0 | Last: 14:31:02           | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Agent Activity Monitor                                                          |
| +-----------------------------------------------------------------------------+ |
| | Started          | Pipeline            | Record       | Status    | Tokens   | |
| |------------------+---------------------+--------------+-----------+----------| |
| | 14:32:01         | academic_challenges | jesus-myth   | completed | 1,240    | |
| | 14:28:55         | popular_challenges  | shroud-turin | failed    | 890      | |
| | 14:25:12         | academic_challenges | q-source     | running   | —        | |
| +-----------------------------------------------------------------------------+ |
| Trace Reasoning (selected run):                                                 |
| +-----------------------------------------------------------------------------+ |
| | Searching "Jesus mythicism scholarly consensus 2024"...                      | |
| | Found 12 candidate articles. Filtering for academic sources...               | |
| | Selected 5 articles with relevance > 70. Assigning scores...                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Core Unit & Integration Testing                                                 |
| [ Run All Tests ] [ Run API Tests ] [ Run Agent Tests ]                         |
|                                                                                 |
| Architectural Docs                                                              |
| [ View / Edit Docs ] [ Generate Agents ]                                        |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**Login & Shell File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/login.html` | Authentication entry point |
| `admin/frontend/dashboard.html` | Main dashboard shell |
| `css/7.0_system/admin.css` | Login page styling |
| `css/1.0_foundation/dashboard/admin_components.css` | Providence grid, dividers, width hooks |
| `css/1.0_foundation/dashboard/admin_shell.css` | Dashboard chrome, header, canvas |
| `css/7.0_system/dashboard/dashboard_universal_header.css` | Header aesthetics |
| `js/7.0_system/admin.js` | Login submission & error handling |
| `js/7.0_system/dashboard/dashboard_orchestrator.js` | App initialization & session check |
| `js/7.0_system/dashboard/dashboard_app.js` | Module router: loadModule(), _setGridColumns() |
| `js/7.0_system/dashboard/dashboard_universal_header.js` | Header injection & logout logic |
| `js/7.0_system/dashboard/display_dashboard_cards.js` | Module navigation card rendering |
| `js/7.0_system/dashboard/display_error_footer.js` | Universal status/error log stream UI |
| `js/admin_core/error_handler.js` | Shared error routing API |

**System Dashboard File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_system.html` | System health monitoring container |
| `css/7.0_system/dashboard/dashboard_system.css` | Log stream & gauge aesthetics |
| `js/7.0_system/dashboard/dashboard_system.js` | Module orchestration |
| `js/7.0_system/dashboard/display_system_data.js` | Real-time status polling & health cards |
| `js/7.0_system/dashboard/agent_monitor.js` | Agent run log polling & trace reasoning |
| `js/7.0_system/dashboard/test_execution_logic.js` | Test suite execution & log piping |
| `js/7.0_system/dashboard/agent_generation_controls.js` | Agent generation & doc management |
| `js/7.0_system/dashboard/mcp_monitor.js` | MCP server status polling |

---

