---
name: system_nomenclature.md
purpose: Glossary of terms used throughout the System Module and the broader codebase
version: 1.0.0
dependencies: [simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md, guide_security.md, guide_welcoming_robots.md]
---

# System Nomenclature — 7.0 System Module

## Global Terms (Codebase-Wide)

| Term | Definition |
|------|------------|
| **The Living Museum** | Name of the overall colour palette and design aesthetic — warm parchment tones and charcoal ink evoking an archival/museum feel |
| **Technical Blueprint** | Design philosophy — sharp corners, 1px structural borders, monospace metadata, dashed blueprint-style dividers |
| **8px Grid** | Foundational spacing system — all spacing values are multiples of 8px, tokenised via `--space-{n}` |
| **BEM** | Naming convention (Block__Element--Modifier) used for all CSS component classes across the entire codebase |
| **CSS Custom Properties (Design Tokens)** | Centralised design tokens defined in `typography.css` under `:root`, including colour, typography, spacing, shadow, border, and transition tokens |
| **Colour Tokens** | `--color-*` design tokens defining the palette: `bg-primary` (Soft Parchment), `text-primary` (Charcoal Ink), `accent-primary` (Deep Oxblood), `border` (Clay Stone), `status-success` (Blueprint Green), and others |
| **Typography Tokens** | `--font-*` (body, essay, heading, mono) and `--text-*` (xs through 4xl) tokens defining font families and type scale |
| **Spacing Tokens** | `--space-*` tokens (1 through 16) implementing the 8px grid system |
| **Deep Oxblood** | `#8e3b46` — primary accent colour used for links, active states, key hovers, and loading indicators across all modules |
| **Charcoal Ink** | `#242423` — primary text colour for body copy and headings |
| **Soft Parchment** | `#fcfbf7` — main page background colour |
| **Providence** | Dashboard 2-column grid system with permanent 1px structural divider and width hooks (`#providence-col-sidebar`, `#providence-col-main`) |
| **Page Shell** | The top-level CSS Grid layout (`#page-shell`) with named grid areas: `header`, `sidebar`, `main`, `footer` |
| **Oxblood Pulse** | `@keyframes oxblood-pulse` — CSS opacity-pulse animation for indeterminate loading states |
| **Registration Marks** | Decorative L-shaped corner cut marks (1px dashed Oxblood) applied via `.has-registration-mark` — evoking print/archival aesthetics |
| **State Classes** | Composable feedback classes: `.state-loading`, `.state-success`, `.state-error`, `.state-disabled` used across all modules |
| **Utility Classes** | `.is-hidden`, `.is-visible`, `.is-visible-flex`, `.is-visible-grid`, `.is-active`, `.is-open`, `.is-dragging`, `.is-loading` for JS-controlled visibility states |
| **Invisible SEO Header** | `<header id="invisible-header" aria-hidden="true">` — zero-height DOM anchor used by `header.js` to inject SEO metadata |
| **`data-*` Body Attributes** | Standardised `data-page-title`, `data-page-description`, `data-page-canonical`, `data-og-type`, `data-og-image` attributes on `<body>` consumed by `initializer.js` |
| **AI Metadata Directives** | `<meta name="ai:purpose" content="historical-evidence-archive">`, `<meta name="ai:subject">`, `<meta name="ai:reading-level" content="academic">` — LLM-specific hints injected on every page |
| **AI-Welcoming** | Design principle giving LLM crawlers (GPTBot, ChatGPT-User, Google-Extended, Claude-Web, DeepSeek, CCBot) fast, unrestricted access in `robots.txt` |
| **Icon System** | `.icon` base class with size modifiers (`--sm`, `--md`, `--lg`) and colour variants (`--accent`, `--muted`) — thin-line stroke SVG aesthetic |

## Module-Specific Terms (7.0 System Module)

| Term | Type | Definition |
|------|------|------------|
| **Admin Portal** | Concept | Two-page authentication and module-access pattern — `login.html` handles password entry, `dashboard.html` hosts the card grid and Providence canvas |
| **Module Routing** | Concept | Card-click navigation flow: user clicks a module card → `loadModule(name)` hides the card grid, shows the Providence canvas, and calls the module's registered render function |
| **Health Cards** | Concept | Live-polling status widgets (API, VPS, Security, DeepSeek, MCP) rendered as `.health-card` elements with colour-coded value variants (`--ok`, `--degraded`, `--error`, `--offline`) |
| **Agent Monitor** | Concept | Live-polling activity table (5 s cadence) displaying agent pipeline runs with expandable `.trace-reasoning-panel` for chain-of-thought output |
| **Agent Run Log** | Concept | `agent_run_log` database table — audit trail for every agent pipeline execution, tracking status, token consumption, trace reasoning, and error messages |
| **Field Persistence** | Concept | `sessionStorage`-backed form-state caching via `tjw_field_cache_*` keys, namespaced by JWT suffix and module name, so unsaved edits survive tab switches |
| **Brute Force Defense** | Concept | Per-IP login-attempt tracking in `AuthUtils` — 5 consecutive failures trigger a 300 s lockout with an artificial 1 s delay on each failure |
| **System Config** | Concept | `system_config` key/value database table for global site settings (replaces hard-coded constants), exposed via `GET/PUT /api/admin/system/config` |
| **`#login-shell`** | DOM ID | CSS Grid shell that vertically and horizontally centres the `#login-card` on the login page |
| **`#login-card`** | DOM ID | Bordered form container holding the password input, submit button, and error output on `login.html` |
| **`#admin-header`** | DOM ID | Universal dashboard header containing `.header-brand` (logo + title) and `.header-nav` (navigation links + logout) |
| **`#admin-cards`** | DOM ID | 3 × 3 + 1 module navigation card grid rendered by `display_dashboard_cards.js` |
| **`#admin-canvas`** | DOM ID | Providence 2-column work area (sidebar + main) activated when a module is loaded |
| **`#admin-error-footer`** | DOM ID | Universal status/error message bar at the bottom of the dashboard, managed by `display_error_footer.js` |
| **`#module-tab-bar`** | DOM ID | Horizontal tab strip showing open modules, allowing quick switching between loaded views |
| **`#providence-drag-handle`** | DOM ID | Draggable divider between sidebar and main columns, powered by `dashboard_sidebar_resize.js` |
| **`.header-brand`** | CSS class | BEM block — flexbox container for logo image and dashboard title in the admin header |
| **`.header-nav`** | CSS class | BEM block — flexbox container for navigation buttons (Return to Frontend, Dashboard, Logout) |
| **`.header-nav__link--logout`** | CSS class | BEM modifier — logout button variant that turns Oxblood on hover |
| **`.health-card`** | CSS class | BEM block — individual health-status card (flex column) containing label, value, detail, and optional meter |
| **`.health-card__value--ok`** | CSS class | BEM modifier — green value text indicating healthy status |
| **`.health-card__value--degraded`** | CSS class | BEM modifier — amber (`#c79100`) value text indicating degraded status |
| **`.health-card__value--error`** | CSS class | BEM modifier — Oxblood value text indicating error status |
| **`.health-card__value--offline`** | CSS class | BEM modifier — muted grey value text indicating offline status |
| **`.meter-bar`** | CSS class | BEM block — progress-bar background (rounded, bordered) used inside health cards for CPU/memory gauges |
| **`.meter-bar__fill`** | CSS class | BEM element — animated inner fill of `.meter-bar`, width set dynamically to reflect resource usage |
| **`.meter-bar__fill--warning`** | CSS class | BEM modifier — amber fill for elevated resource usage |
| **`.meter-bar__fill--critical`** | CSS class | BEM modifier — Oxblood fill for critical resource usage |
| **`.agent-summary-bar`** | CSS class | Summary stats row above the agent activity table showing total runs, tokens consumed, and success rate |
| **`.agent-activity-table`** | CSS class | Semantic table element (monospace, xs) displaying agent run history with sticky header |
| **`.trace-reasoning-panel`** | CSS class | Collapsible `<details>` element displaying chain-of-thought output for a selected agent run |
| **`.mcp-error-log`** | CSS class | Scrollable container for the MCP stdio error stream with count badge and monospace output |
| **`.test-output-console`** | CSS class | Bordered scrollable area displaying test-runner stdout/stderr in monospace pre-wrap |
| **`@keyframes agent-pulse`** | CSS animation | Amber background pulse applied to `.is-running` table rows to indicate an in-progress agent run |
| **`@keyframes agent-spin`** | CSS animation | 360° rotation driving the `.status-spinner` icon on running-status badges |
| **`.status--completed`** | CSS class | Status badge variant — green checkmark for finished agent runs |
| **`.status--failed`** | CSS class | Status badge variant — Oxblood × for errored agent runs |
| **`.status--running`** | CSS class | Status badge variant — amber with rotating spinner for in-progress agent runs |
| **`MODULE_RENDERERS`** | JS constant | Map of `{ moduleName → renderFunctionName }` used by `loadModule()` to dispatch rendering |
| **`MODULE_LABELS`** | JS constant | Map of `{ moduleName → human-readable label }` used for tab-bar display text |
| **`MODULE_CARDS`** | JS constant | Array of 10 card definitions `{ id, icon, title, desc }` driving the `#admin-cards` grid |
| **`window.initDashboard()`** | JS function | Dashboard orchestrator — calls header injection, card rendering, footer setup, and session verification in sequence |
| **`window.loadModule(moduleName)`** | JS function | Module router — hides the card grid, shows the Providence canvas, adds a tab, and invokes the module's render function |
| **`window.surfaceError(message)`** | JS function | Shared error/status message router — writes timestamped messages to `#admin-error-footer` (queues if DOM not ready) |
| **`window.verifyAdminSession()`** | JS function | Session guard middleware — calls `GET /api/admin/verify` and redirects to `login.html` on failure |
| **`window.startSystemDataPolling()`** | JS function | Begins 10 s interval polling of `GET /api/admin/health_check`, updating all health cards |
| **`window.startAgentMonitorPolling()`** | JS function | Begins 5 s interval polling of `GET /api/admin/agent/logs`, updating the agent activity table |
| **`window.initSidebarResize(containerEl, opts)`** | JS function | Drag-to-resize utility for the Providence sidebar — persists width to `dashboard-sidebar-width` cookie (90 d) |
| **`window.stashFieldState(moduleName, fieldData)`** | JS function | Serialises form state to `sessionStorage` under the `tjw_field_cache_*` namespace |
| **`window.restoreFieldState(moduleName)`** | JS function | Retrieves previously stashed form state from `sessionStorage` |
| **`window.triggerGather(pipelineName, recordSlug)`** | JS function | Pipeline executor — fires `POST /api/admin/agent/run`, polls for completion (2 s cadence, 120 s timeout), then auto-refreshes the view |
| **`AuthUtils`** | Python class | Static utility class providing JWT creation/decoding, password verification, and brute-force tracking |
| **`verify_token(request)`** | Python function | FastAPI dependency injected into all admin routes — extracts and validates the `admin_token` cookie |
| **`LoginRequest`** | Pydantic model | Request body schema `{ password: str }` for `POST /api/admin/login` |
| **`AgentRunRequest`** | Pydantic model | Request body schema `{ pipeline: str, slug: str }` for `POST /api/admin/agent/run` |
| **`admin_token`** | Cookie | HttpOnly JWT session cookie with 12 h expiry, set on successful login |
| **`csrf_token`** | Cookie | Non-HttpOnly CSRF protection token set alongside `admin_token` |
| **`dashboard-sidebar-width`** | Cookie | Persisted sidebar pixel width (90-day expiry) read on dashboard load to restore the Providence layout |
| **`tjw_field_cache_*`** | sessionStorage key | Namespaced field-persistence entries keyed by JWT suffix + module name |
| **`ADMIN_PASSWORD`** | Env var | Single admin password validated by `AuthUtils.verify_password()` |
| **`SECRET_KEY`** | Env var | HS256 JWT signing key — `AuthUtils` enforces that the default value is never used in production |
| **`DEEPSEEK_KEY`** | Env var | DeepSeek API key consumed by `agent_client.py` for LLM-powered pipelines |
| **`GATHER_POLL_INTERVAL_MS`** | JS constant | 2 000 ms polling cadence used by `triggerGather()` while waiting for a pipeline to finish |
| **`GATHER_POLL_TIMEOUT_MS`** | JS constant | 120 000 ms maximum wait before `triggerGather()` aborts polling and reports a timeout |
| **`system_config`** | DB table | Key/value store (`key TEXT PK`, `value TEXT`, `updated_at`, `updated_by`) for site-wide configuration |
| **`agent_run_log`** | DB table | Audit log (`id INTEGER PK`, `pipeline`, `record_slug`, `status`, `trace_reasoning`, `tokens_used`, `articles_found`, `error_message`, `started_at`, `completed_at`) for agent pipeline runs |
| **`POST /api/admin/login`** | API route | Authentication entry point — accepts `LoginRequest`, returns JWT cookie on success |
| **`POST /api/admin/logout`** | API route | Session destruction — deletes the `admin_token` and `csrf_token` cookies |
| **`GET /api/admin/verify`** | API route | Session validation — returns 200 if the JWT is valid, 401 otherwise |
| **`GET /api/admin/health_check`** | API route | System health endpoint — returns DB connectivity, DeepSeek reachability, VPS resource usage, and JWT status |
| **`GET/PUT /api/admin/system/config`** | API route | Read and upsert key/value pairs in the `system_config` table |
| **`POST /api/admin/agent/run`** | API route | Trigger an agent pipeline (returns 202 Accepted); the run is logged in `agent_run_log` |
| **`GET /api/admin/agent/logs`** | API route | Paginated agent run history with optional `pipeline` and `status` filters |
| **`POST /api/admin/tests/run`** | API route | Spawns test suites as a subprocess and streams results |
| **`POST /api/admin/services/restart`** | API route | Restarts the `admin.service` systemd unit on the VPS |
