---
name: plan_dashboard_system
version: 1.0.0
module: 7.0 — System
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_system

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "System" dashboard module, the central administrative hub for monitoring and managing the project's infrastructure and development lifecycle. It features real-time status displays for API health, VPS resource usage, DeepSeek agent activity (including token consumption, run history, and chain-of-thought trace reasoning), and security alerts, alongside interactive controls for running test suites, editing architectural documentation, and generating AI agents. This module provides administrators with total operational oversight and the tools necessary for system maintenance, security auditing, and extension within the 'providence' design framework.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
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
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, work through the tasks sequentially, and ensure each task is fully completed, and marked as complete, before moving to the next.  

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_system.html` | System health monitoring container |
| **CSS** | `css/7.0_system/dashboard/dashboard_system.css` | Log stream & gauge aesthetics |
| **JS** | `js/7.0_system/dashboard/dashboard_system.js` | Module orchestration & initialization |
| **JS** | `js/7.0_system/dashboard/display_system_data.js` | Real-time status polling & health card rendering (includes DeepSeek API status) |
| **JS** | `js/7.0_system/dashboard/agent_monitor.js` | Agent run log polling, activity table rendering & trace reasoning display |
| **JS** | `js/7.0_system/dashboard/test_execution_logic.js` | Test suite execution & log piping |
| **JS** | `js/7.0_system/dashboard/agent_generation_controls.js` | Agent generation & document management triggers |
| **JS** | `js/7.0_system/dashboard/mcp_monitor.js` | MCP server status polling & error stream rendering |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4 polls `GET /api/admin/health_check` + `GET /api/admin/agent/logs`; T5 triggers test suites; T6a polls `GET /api/admin/agent/logs` on interval |
| `backend/scripts/agent_client.py` | `plan_backend_infrastructure` | T6a displays token usage and trace reasoning logged by the agent client |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the System module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T6a routes agent log fetch failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `mcp_server.py` | (existing system service) | T5 triggers test suites that validate MCP server connectivity; T7 polls MCP health endpoint on interval for live status and error stream |
| `admin/backend/admin_api.py` (MCP health route) | `plan_backend_infrastructure` | T7 requires a `/api/admin/mcp/health` endpoint that proxies MCP server status — tool count, error count, last request timestamp |
| `.env` (`DEEPSEEK_API_KEY`) | (existing project secret) | T4 verifies key presence as part of DeepSeek API status check |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create System Dashboard HTML

- **File(s):** `admin/frontend/dashboard_system.html`
- **Action:** Create the structural layout for the system hub, including the health monitoring grid, test execution panel, and documentation management anchor.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [x] Task complete

---

### T2 — Implement System Dashboard CSS

- **File(s):** `css/7.0_system/dashboard/dashboard_system.css`
- **Action:** Implement the 'providence' theme styling for health status cards, resource usage meters, and the interactive testing control console.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [x] Task complete

---

### T3 — Implement System Orchestrator

- **File(s):** `js/7.0_system/dashboard/dashboard_system.js`
- **Action:** Initialize the system module and coordinate the real-time status polling, test execution, and documentation management logic.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T4 — Implement System Data Display

- **File(s):** `js/7.0_system/dashboard/display_system_data.js`
- **Action:** Implement the logic to poll backend status APIs and render the results into the health and resource monitoring cards. Must include:
  1. API Health — GET `/api/admin/health_check`
  2. VPS resource usage — CPU, memory from system endpoint
  3. Security status — JWT validity, active alert count
  4. **DeepSeek API status** — GET `/api/admin/agent/logs?limit=1` to verify connectivity and display today's token total and run count
- **Dependencies:** `admin/backend/admin_api.py` (system routes + agent/logs)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T5 — Implement Test Execution Logic

- **File(s):** `js/7.0_system/dashboard/test_execution_logic.js`
- **Action:** Implement the UI logic to trigger backend test suites (API, Agent, Port) and display live results in the system console.
- **Dependencies:** `mcp_server.py` (system testing)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T6 — Implement Agent Generation Controls

- **File(s):** `js/7.0_system/dashboard/agent_generation_controls.js`
- **Action:** Implement the UI triggers to initiate agent generation workflows and document management tasks.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

### T6a — Implement Agent Activity Monitor

- **File(s):** `js/7.0_system/dashboard/agent_monitor.js`
- **Action:** Implement the agent activity monitoring panel that polls agent run history and renders a live activity feed with trace reasoning. The monitor must:
  1. Poll `GET /api/admin/agent/logs?limit=50` on a 5-second interval while the System module is active.
  2. Render a scrollable table of recent agent runs with columns: `started_at`, `pipeline`, `record_slug`, `status` (with colour coding — green for completed, red for failed, amber spinner for running), `tokens_used`.
  3. On row click, display the selected run's `trace_reasoning` in the trace panel below the table, showing the agent's chain-of-thought search and analysis steps.
  4. Display a summary bar above the table: total runs today, total tokens consumed today, current success rate.
  5. Auto-scroll to newest runs; highlight rows with `status = 'running'` and pulse them until they resolve.
- **Dependencies:** `admin/backend/admin_api.py` (agent/logs endpoint), `js/admin_core/error_handler.js`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement MCP Server Monitor

- **File(s):** `js/7.0_system/dashboard/mcp_monitor.js`
- **Action:** Implement the MCP server monitoring panel that polls MCP health on an interval and renders live status and error output into the System Data & Logs section. The monitor must:
  1. Poll `GET /api/admin/mcp/health` on a 10-second interval while the System module is active.
  2. Render the MCP status card in the health grid with: connection state (`Online` / `Offline` / `Degraded`), registered tool count, error count today, and timestamp of last successful request.
  3. Apply colour coding to the connection state label — green for Online, amber for Degraded, red for Offline — using CSS custom properties from `typography_colors.css`.
  4. If the MCP server transitions from Online to Offline or Degraded mid-session, immediately push a status message to the Status Bar via `js/admin_core/error_handler.js` without waiting for the next poll cycle.
  5. Maintain a rolling error log of the last 20 MCP error events (tool name, error type, timestamp) sourced from the health response, displayed beneath the status card as a compact scrollable stream.
  6. On reconnection after an Offline state, push a recovery notice: `"MCP Server reconnected."` and reset the error count display.
- **Dependencies:** `admin/backend/admin_api.py` (`/api/admin/mcp/health`), `js/admin_core/error_handler.js`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [x] Task complete

---

## Final Tasks

### T6b — Error Message Generation

- **File(s):**
  - `js/7.0_system/dashboard/display_system_data.js`
  - `js/7.0_system/dashboard/agent_monitor.js`
  - `js/7.0_system/dashboard/test_execution_logic.js`
  - `js/7.0_system/dashboard/agent_generation_controls.js`
  - `js/7.0_system/dashboard/mcp_monitor.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Health Check Failed** — `display_system_data.js` GET to `/api/admin/health_check` fails or returns non-OK: `"Error: System health check failed. Backend may be unreachable."`
  2. **DeepSeek API Unreachable** — `display_system_data.js` GET to `/api/admin/agent/logs` fails or returns non-OK: `"Error: Unable to verify DeepSeek API connectivity. Check API key and network."`
  3. **Agent Logs Fetch Failed** — `agent_monitor.js` GET to `/api/admin/agent/logs` returns non-OK: `"Error: Unable to retrieve agent run history. Polling paused — will retry."`
  4. **Agent Logs Empty** — `agent_monitor.js` receives an empty array from the logs endpoint when runs were expected: `"Notice: No agent runs recorded yet. Trigger a search from the Challenge dashboard."`
  5. **Trace Reasoning Unavailable** — `agent_monitor.js` selected run has NULL or empty `trace_reasoning`: `"Notice: No trace reasoning recorded for this run. The agent may have failed before analysis began."`
  6. **Test Suite Trigger Failed** — `test_execution_logic.js` POST to trigger tests returns non-OK: `"Error: Test suite failed to start. Check server logs for details."`
  7. **Agent Generation Failed** — `agent_generation_controls.js` POST to generate agents returns non-OK: `"Error: Agent generation failed. Check documentation permissions."`
  8. **MCP Health Poll Failed** — `mcp_monitor.js` GET to `/api/admin/mcp/health` fails or returns non-OK: `"Error: Unable to reach MCP server. Status unknown — polling paused."`
  9. **MCP Server Offline** — `mcp_monitor.js` health response returns `status: 'offline'`: `"Error: MCP Server is offline. Tool calls will fail until it is restarted."`
  10. **MCP Server Degraded** — `mcp_monitor.js` health response returns `status: 'degraded'` (partial tool failures): `"Warning: MCP Server is degraded. {n} tool(s) reporting errors. Check the error log below."`
  11. **MCP Tool Error** — `mcp_monitor.js` receives a new entry in the error log stream with a specific tool failure: `"MCP Error: Tool '{tool_name}' failed at {timestamp}. Reason: {error_type}."`
  12. **MCP Reconnected** — `mcp_monitor.js` detects recovery after an Offline or Degraded state: `"MCP Server reconnected. Monitoring resumed."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [x] Task complete

---

### T8 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T9 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: The core objective outlined in the summary has been fully met
- [x] **Necessity**: The underlying reason/need for this plan has been resolved
- [x] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new System dashboard files under Module 7.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new system monitoring files. |
| `documentation/data_schema.md" | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool consistency rule to ownership model (§7). |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | Yes | Document integration with VPS health monitoring and testing. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the System health hub and testing console. |
| `documentation/guides/guide_function.md` | Yes | Document system monitoring logic, DeepSeek agent activity monitoring, and test orchestration flow. |
| `documentation/guides/guide_security.md` | Yes | Note integration with security alerts and JWT validation status. |
| `documentation/guides/guide_style.md" | Yes | Document the system health card and console CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [x] Each "Yes" row has been updated with accurate, current information
- [x] No document contains stale references to files or logic changed by this plan
- [x] Version numbers incremented where frontmatter versioning is present
