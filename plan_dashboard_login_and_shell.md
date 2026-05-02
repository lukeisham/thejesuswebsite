---
name: plan_dashboard_login_shell
version: 1.1.0
module: 7.0 — System
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_login_shell

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the login and dashboard shell for the Admin Portal as specified in the dashboard refractor documentation. It establishes the authentication gateway and the main landing page with a grid-based module navigation system, universal header, and error display footer. Critically, it defines the Providence 3-column grid system with permanently visible divider lines between columns and CSS custom property hooks that allow individual dashboard modules to request custom column widths at render time. This refactor ensures the admin interface follows the project's premium 'providence' theme and modular architecture, providing a stable foundation for the subsequent implementation of specific dashboard module pages.

```text
+-------------------------------------------------+
|                                                 |
|                 [ Logo ]                        |
|                                                 |
|            +-----------------------+            |
|            |      Admin Login      |            |
|            |                       |            |
|            |  Username: [_______]  |            |
|            |  Password: [_______]  |            |
|            |                       |            |
|            |      [ Login ]        |            |
|            |   'error message'     |            |
|            +-----------------------+            |
|                                                 |
+-------------------------------------------------+

+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | All Records        |  | Single Record      |  | Arbor Diagram      |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Wikipedia          |  | Challenges         |  | Challenge Resp.    |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Essay & Hist.      |  | News Sources       |  | Blog Posts         |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+                                                         |
|  | System             |                                                         |
|  +--------------------+                                                         |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking T12 (Audit) as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/login.html` | Authentication entry point |
| **HTML** | `admin/frontend/dashboard.html` | Main module grid orchestrator |
| **CSS** | `css/7.0_system/admin.css` | Login page 'providence' styling |
| **CSS** | `css/1.0_foundation/dashboard/admin_components.css` | Providence grid, dividers, column width hooks |
| **CSS** | `css/1.0_foundation/dashboard/admin_shell.css` | Dashboard chrome, header, canvas |
| **CSS** | `css/7.0_system/dashboard/dashboard_universal_header.css` | Standardized header aesthetics |
| **JS** | `js/7.0_system/admin.js` | Login submission & error handling |
| **JS** | `js/7.0_system/dashboard/dashboard_orchestrator.js` | Main app initialization & session check |
| **JS** | `js/7.0_system/dashboard/dashboard_app.js` | Module router: loadModule(), _setGridColumns() |
| **JS** | `js/7.0_system/dashboard/dashboard_universal_header.js` | Header injection & logout logic |
| **JS** | `js/7.0_system/dashboard/display_dashboard_cards.js` | Module navigation card rendering |
| **JS** | `js/7.0_system/dashboard/display_error_footer.js` | Universal status/error log stream UI |
| **JS** | `js/admin_core/error_handler.js` | Shared error routing API consumed by all dashboard modules |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T3, T7, T10 call login, logout, verify_session routes |
| `admin/backend/auth_utils.py` | `plan_backend_infrastructure` | T3, T10 depend on JWT/session helpers |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T5 references Providence CSS custom properties |
| All `js/*/dashboard/edit_*.js` module files | Various plan_dashboard_* plans | These modules call `_setGridColumns()` at render time to set per-module column widths (T10) |
| `plan_dashboard_wikipedia` | (Wikipedia plan) | Requests wider left column for record detail sidebar via `_setGridColumns()` |
| All `js/*/dashboard/edit_*.js` module files | Various plan_dashboard_* plans | These modules call `surfaceError()` to route errors to the Status Bar (T9) |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Login HTML Structure

- **File(s):** `admin/frontend/login.html`
- **Action:** Create the structural skeleton for the admin login page featuring the logo, login form anchors, and error message container.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Login CSS Styling

- **File(s):** `css/7.0_system/admin.css`
- **Action:** Implement the 'providence' theme aesthetics for the login screen using CSS Grid for centering and referencing system variables for the gold-accented theme.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Login Logic

- **File(s):** `js/7.0_system/admin.js`
- **Action:** Implement the login form submission handler that interfaces with the backend authentication API.
- **Dependencies:** `admin/backend/admin_api.py` (login/health_check routes), `admin/backend/auth_utils.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Create Dashboard Shell HTML

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Create the main dashboard layout shell with semantic anchors for the universal header, the Providence 3-column grid canvas (with two divider divs between columns), and the error footer.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · Predictable Hooks

- [ ] Task complete

---

### T5 — Implement Dashboard Base CSS (Providence Grid + Dividers + Width Hooks)

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`, `css/1.0_foundation/dashboard/admin_shell.css`
- **Action:** Define the core dashboard grid layout using the Providence 3-column system. Requirements:
  1. **7-track CSS Grid** — Column track widths: a fixed sidebar column | 1px divider | gap | list column (default 1fr) | 1px divider | gap | editor column (default 2fr).
  2. **Permanent divider lines** — Both 1px divider tracks must fill with `var(--color-border)` so a thin vertical line is always visible between sidebar/list and list/editor, regardless of whether adjacent columns have content. Dividers must span the full height of the canvas.
  3. **Per-module width hooks** — CSS custom properties `--editor-col-two-fr` and `--editor-col-three-fr` override the default 1fr / 2fr ratio. Individual module render functions set these dynamically via `_setGridColumns()` in `dashboard_app.js` before populating their columns (see T10).
  4. **Sidebar width control** — CSS custom property `--editor-col-one-width` controls the fixed width of the actions/sidebar column (default 240px). Modules may override this at render time for layouts that need a wider sidebar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Rich Aesthetics · User Comments

- [ ] Task complete

---

### T6 — Implement Universal Header Styling

- **File(s):** `css/7.0_system/dashboard/dashboard_universal_header.css`
- **Action:** Style the universal dashboard header with the double-sized favicon, gold accents, and navigation links (Return, Dashboard, Logout).
- **Vibe Rule(s):** CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T7 — Implement Universal Header Logic

- **File(s):** `js/7.0_system/dashboard/dashboard_universal_header.js`
- **Action:** Implement the component injection logic for the universal header and the logout functionality.
- **Dependencies:** `admin/backend/admin_api.py` (logout route)
- **Vibe Rule(s):** 1 function per JS file · Component Injection · User Comments

- [ ] Task complete

---

### T8 — Implement Dashboard Card Rendering

- **File(s):** `js/7.0_system/dashboard/display_dashboard_cards.js`
- **Action:** Implement the logic to dynamically render the 10-module navigation grid using the dashboard card component pattern.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement Error Footer + Shared Error Handler

- **File(s):** `js/7.0_system/dashboard/display_error_footer.js`, `js/admin_core/error_handler.js`
- **Action:** Implement the universal error display system in two parts:
  1. **Error Footer UI** (`display_error_footer.js`) — inject the fixed Status Bar DOM element at the bottom of the dashboard shell. It must render a monospaced message area that listens for error events and displays the most recent message with a timestamp.
  2. **Shared Error Handler** (`error_handler.js`) — expose a global function `window.surfaceError(message)` that any dashboard edit module can call. It must:
     - Prepend a timestamp to the message.
     - Write the message into the Status Bar DOM element.
     - Log the message to the browser console for debugging.
     - Be safe to call before the DOM is ready (queue messages and flush on DOMContentLoaded).
  All other dashboard plans depend on this shared handler to route their error messages to the Status Bar.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Component Injection · Vanilla ES6+

- [ ] Task complete

---

### T10 — Implement Module Router with Per-Module Width Hooks

- **File(s):** `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** Implement `loadModule()` and the per-module column width system:
  1. `loadModule(moduleName)` clears all three Providence columns, updates the active tab in `#module-tab-bar`, and routes to the correct module render function.
  2. `_clearColumns()` resets grid widths to the default 1fr / 2fr ratio before loading any module.
  3. `_setGridColumns(twoFr, threeFr)` exposes a CSS custom property hook on `#admin-canvas` so individual module render functions can call it at the top of their render to override column ratios. For example, a module with a wide sidebar might call `_setGridColumns('2fr', '3fr')`.
  4. `_setColumn(colName, html)` injects child content into the named Providence column via `insertAdjacentHTML`. The column div itself is never destroyed or replaced.
  5. Expose `_setGridColumns` globally (on `window`) so all dashboard edit modules can access it without importing.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T11 — Implement Dashboard Orchestrator

- **File(s):** `js/7.0_system/dashboard/dashboard_orchestrator.js`
- **Action:** Initialize and coordinate all dashboard components, including session verification and initial data fetching.
- **Dependencies:** `admin/backend/admin_api.py` (verify_session), `admin/backend/auth_utils.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T12 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [ ] Divider lines render as 1px grid tracks using var(--color-border) — not as borders on column elements

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern
- [ ] _setGridColumns() is exposed globally so all edit modules can call it
- [ ] surfaceError() is exposed globally so all edit modules can route errors to the Status Bar

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T13 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in this plan's tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new dashboard shell and component files under Module 7.0. |
| `documentation/simple_module_sitemap.md` | Yes | Reflect the completed refactor of the dashboard entry points. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to regenerate the master sitemap. |
| `documentation/data_schema.md` | No | No changes to database schema in this plan. |
| `documentation/vibe_coding_rules.md` | No | Coding rules remain consistent. |
| `documentation/style_mockup.html` | No | Global style mockup is unchanged. |
| `documentation/git_vps.md` | No | No deployment or VPS config changes. |
| `documentation/guides/guide_appearance.md` | No | This guide focuses on public-facing pages. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams to reflect the new login and dashboard grid layout including divider lines. |
| `documentation/guides/guide_function.md` | Yes | Document the dashboard orchestration, component injection logic, and per-module width hook system. |
| `documentation/guides/guide_security.md` | Yes | Update with details on the new login flow and session verification logic. |
| `documentation/guides/guide_style.md` | Yes | Document the Providence grid system, divider track approach, and CSS custom property width hooks for per-module layout. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation integrations are unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO and bot access remain unchanged for the admin portal. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
