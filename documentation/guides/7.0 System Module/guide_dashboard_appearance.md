---
name: guide_dashboard_appearance.md
purpose: ASCII wireframes of the Admin Portal login, card landing page, and system dashboard views
version: 2.0.0
dependencies: [simple_module_sitemap.md, guide_function.md, system_nomenclature.md]
---

# Dashboard Appearance — 7.0 System Module

## Login Page (`login.html`)

```text
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                                                                   |
|                       #login-shell (CSS Grid, centred)                            |
|                                                                                   |
|                    +-------------------------------+                              |
|                    | #login-logo                   |                              |
|                    | (64x64 favicon)                |                              |
|                    +-------------------------------+                              |
|                    | #login-card                   |                              |
|                    |                               |                              |
|                    |  #login-heading               |                              |
|                    |  "Admin Login"                |                              |
|                    |                               |                              |
|                    |  #login-form                  |                              |
|                    |  +---------------------------+ |                              |
|                    |  | #login-password           | |                              |
|                    |  | [________________________]| |                              |
|                    |  +---------------------------+ |                              |
|                    |                               |                              |
|                    |  [  #login-submit  "Login"  ] |                              |
|                    |                               |                              |
|                    |  #login-error (hidden)        |                              |
|                    |  "Invalid password"            |                              |
|                    +-------------------------------+                              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

## Card Landing Page (`dashboard.html`)

```text
+-----------------------------------------------------------------------------------+
| #admin-header                                                                     |
| .header-brand          .header-nav                                                |
| [logo] Jesus Website   < Return to Frontend | Dashboard | Logout >               |
+-----------------------------------------------------------------------------------+
| #module-tab-bar                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
| #admin-cards  (12 cards, 4 rows x 3 columns, last card centred)                  |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | records-all        |  | records-single     |  | arbor              |           |
|  | All Records        |  | Single Record      |  | Arbor Diagram      |           |
|  | Browse & manage    |  | Deep-dive record   |  | Visual evidence    |           |
|  | all records        |  | editor             |  | tree editor        |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | wikipedia          |  | challenge-academic |  | challenge-popular  |           |
|  | Wikipedia          |  | Academic Challenges|  | Popular Challenges |           |
|  | Rank Wikipedia     |  | Manage academic    |  | Manage popular     |           |
|  | articles           |  | debate challenges  |  | query challenges   |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | challenge-response |  | essay              |  | historiography     |           |
|  | Challenge Resp.    |  | Essays             |  | Historiography     |           |
|  | Author scholarly   |  | Write context,     |  | Author the central |           |
|  | responses          |  | theological essays |  | historiography     |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | news-sources       |  | blog-posts         |  | system (centred)   |           |
|  | News Sources       |  | Blog Posts         |  | System             |           |
|  | Manage news        |  | Author blog        |  | Monitor health,    |           |
|  | crawler & sources  |  | content            |  | agents & tests     |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
| #admin-error-footer                                                               |
| .error-footer__message  "System running normally"  [timestamp]                    |
+-----------------------------------------------------------------------------------+
```

## Module View — Providence Canvas (`dashboard.html`)

```text
+-----------------------------------------------------------------------------------+
| #admin-header                                                                     |
| .header-brand          .header-nav                                                |
| [logo] Jesus Website   < Return to Frontend | Dashboard | Logout >               |
+-----------------------------------------------------------------------------------+
| #module-tab-bar                                                                   |
| [ records-all ]  [ essay.is-active ]  [ system ]                                 |
+-----------------------------------------------------------------------------------+
|                                                                                   |
| #admin-canvas                                                                     |
| +---------------------------+--+------------------------------------------+       |
| | #providence-col-sidebar   |  | #providence-col-main                    |       |
| |                           |  |                                          |       |
| | (module sidebar content)  |  | (module main content)                   |       |
| |                           |  |                                          |       |
| |                           |  |                                          |       |
| |                           |  |                                          |       |
| |                           |  |                                          |       |
| |                           |##| <-- #providence-drag-handle             |       |
| |                           |  |     (draggable, persists width           |       |
| |                           |  |      to cookie, 180px-40vw range)       |       |
| |                           |  |                                          |       |
| |                           |  |                                          |       |
| +---------------------------+--+------------------------------------------+       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
| #admin-error-footer                                                               |
+-----------------------------------------------------------------------------------+
```

## System Dashboard (Module View — No Sidebar)

```text
+-----------------------------------------------------------------------------------+
| #admin-header                                                                     |
| [logo] Jesus Website   < Return to Frontend | Dashboard | Logout >               |
+-----------------------------------------------------------------------------------+
| #module-tab-bar   [ system.is-active ]                                            |
+-----------------------------------------------------------------------------------+
| .function-bar--system                                                             |
| [ Save Configuration ]   [ Restart Services ]                                    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
| .system-health-grid                                                               |
| +------------------+ +------------------+ +------------------+ +----------------+ |
| | .health-card     | | .health-card     | | .health-card     | | .health-card   | |
| | API Health       | | VPS Resources    | | Security         | | DeepSeek API   | |
| | #api-health-     | |                  | | #security-status | | #deepseek-     | |
| |  status: OK      | | CPU  [||||   ] % | |  JWT valid       | |  status: OK    | |
| | #api-health-     | | MEM  [||     ] % | | #security-detail | | #deepseek-     | |
| |  detail          | | DISK [|||    ] % | |  0 locked IPs    | |  detail        | |
| +------------------+ +------------------+ +------------------+ +----------------+ |
|                                                                                   |
| .agent-summary-bar                                                                |
| Total: 42  |  Completed: 38  |  Failed: 4  |  Tokens: 52,100                     |
|                                                                                   |
| .agent-table-wrapper                                                              |
| +---------------------------------------------------------------------------------+
| | .agent-activity-table                                                           |
| | Started    | Pipeline            | Record       | Status      | Tokens         |
| |------------+---------------------+--------------+-------------+----------------|
| | 14:32:01   | academic_challenges | jesus-myth   | .completed  | 1,240          |
| | 14:28:55   | popular_challenges  | shroud-turin | .failed     | 890            |
| | 14:25:12   | academic_challenges | q-source     | .running    | --             |
| +---------------------------------------------------------------------------------+
|                                                                                   |
| .trace-reasoning-panel  <details>                                                 |
| +---------------------------------------------------------------------------------+
| | .trace-reasoning-panel__summary  "Trace Reasoning (run #42)"                    |
| | .trace-reasoning-panel__content                                                 |
| | Searching "Jesus mythicism scholarly consensus 2024"...                         |
| | Found 12 candidate articles. Filtering for academic sources...                  |
| | Selected 5 articles with relevance > 70. Assigning scores...                    |
| +---------------------------------------------------------------------------------+
|                                                                                   |
| .system-testing                                                                   |
| .test-controls                                                                    |
| [ Run All Tests ]  [ Run API Tests ]  [ Run Agent Tests ]                         |
| .test-output-console                                                              |
| +---------------------------------------------------------------------------------+
| | .test-output-console__content  (monospace, pre-wrap)                             |
| +---------------------------------------------------------------------------------+
|                                                                                   |
| .system-docs                                                                      |
| .docs-controls                                                                    |
| [ View / Edit Docs ]  [ Generate Agents ]                                         |
|                                                                                   |
| .mcp-error-log                                                                    |
| +---------------------------------------------------------------------------------+
| | .mcp-error-log__heading  "MCP Errors"  .mcp-error-log__count (0)                |
| | .mcp-error-log__stream | .mcp-error-log__empty  "No errors recorded"           |
| +---------------------------------------------------------------------------------+
|                                                                                   |
+-----------------------------------------------------------------------------------+
| #admin-error-footer                                                               |
+-----------------------------------------------------------------------------------+
```
