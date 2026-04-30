---
name: dashboard_page_split
version: 3.0.0
module: 7.0 — System Module
status: draft
created: 2026-04-30
revised: 2026-04-30
---

# Plan: dashboard_page_split

## Purpose

> Split the existing single-page admin portal (`admin.html`) into two distinct HTML pages with a redirect-based flow. `admin.html` becomes a login-only page — after successful authentication (HttpOnly cookie set by the backend), the browser redirects to a new `dashboard.html`. This new page statically renders only the structural shell (header with favicon, title "The JesusWebsite Dashboard", "Return to Site" link, and logout button) plus an empty nav container that `render_tab_bar.js` populates dynamically. There is no sidebar. All module navigation lives in one flat tab bar: `dashboard_init.js` calls `renderTabBar("module-tab-bar", allModules, "records-all")` on DOMContentLoaded to render all 13 tabs, then calls `window.loadModule("records-all")` to load the default view. `loadModule()` updates `is-active` on `#module-tab-bar` and populates `#admin-canvas` by calling the appropriate editor render function. Individual editor render functions call `render_tab_bar.js` internally for any within-canvas tab bars they require (e.g. Academic/Popular inside Challenge, Essay/Historiography inside text-essays) — `loadModule()` does not call `renderTabBar()` directly. `dashboard.html` carries its own lightweight auth-check script (`dashboard_auth.js`) that calls `window.verifyAdminSession()` from `load_middleware.js` on page load and redirects back to `admin.html` if the session is invalid. The logout flow redirects back to `admin.html` instead of resetting the DOM in-place. This separates concerns (login vs. dashboard), eliminates the hidden dashboard container in the login page, removes the sidebar entirely, and lands the user directly on the Records editor as the default view.

### Module Tab Structure

One flat tab bar with 13 tabs, rendered into `#module-tab-bar` by `dashboard_init.js` → `renderTabBar()`. Clicking the active tab re-renders the current module fresh, clearing any unsaved input.

| # | Tab Label | data-module |
|---|-----------|-------------|
| 1 | All Records | `records-all` |
| 2 | Single Record | `records-edit` |
| 3 | Ordinary Lists | `lists-ordinary` |
| 4 | Bulk CSV | `records-bulk` |
| 5 | Arbor | `config-arbor` |
| 6 | Wikipedia | `ranks-wikipedia` |
| 7 | Challenge | `ranks-challenges` |
| 8 | Responses | `ranks-responses` |
| 9 | Essay & Historiography | `text-essays` |
| 10 | Challenge Response | `text-responses` |
| 11 | News & Sources | `text-news` |
| 12 | Blog Posts | `text-blog` |
| 13 | System | `system-admin` |

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Define the purpose and scope of the split in documentation

- **File(s):** `documentation/detailed_module_sitemap.md`, `documentation/guides/guide_dashboard_appearance.md`, `documentation/guides/guide_function.md`, `documentation/guides/guide_security.md`
- **Action:** Update all affected documentation to reflect the architectural split before writing code.
  - In `detailed_module_sitemap.md`: add entries for `admin/frontend/dashboard.html`, `js/7.0_system/dashboard/dashboard_auth.js`, and `js/7.0_system/dashboard/dashboard_init.js`; update descriptions for `admin.html`, `dashboard_app.js`, and `render_tab_bar.js`.
  - In `guide_dashboard_appearance.md`:
    - Rewrite the intro paragraph to describe the two-page architecture — remove the SPA and `admin.html` references.
    - Update §0.1 to show two distinct tab bar rows in the diagram (top-level section tabs served by `dashboard_init.js` + `renderTabBar()`; sub-module tabs served by `loadModule()` + `renderTabBar()`), and replace the single NAV BAR label with labels for both tiers.
    - Replace the entire §7.1 content (title, Purpose, DB Fields, ASCII diagram) with: the §7.1 title renamed to "Dashboard System", a description of the two-page flow (`admin.html` login → redirect → `dashboard.html`), documentation of the `dashboard_auth.js` page guard and its dependency on `load_middleware.js`, documentation of the `dashboard_init.js` first-run wiring and top-level tab bar render, and a new ASCII diagram showing the `admin.html` login page UI.
    - Update the ASCII diagram in every section (§2.1, §2.2, §2.3, §2.4, §3.1, §4.1, §4.2, §4.3, §5.1, §5.2, §6.1, §6.2) to: (1) replace the top nav bar row with the correct 4-tab top-level bar with ★ on the active section, (2) add a sub-module tab bar row below it with ★ on the active sub-module, (3) remove the sidebar column (COL 1 in each diagram now shows only action buttons, not navigation links).
    - Fix §6.2: remove the `.blog-editor-grid` alias mention — replace with direct `.providence-editor-grid` reference, and correct `dashboard_admin.css` to `admin_components.css`.
  - In `guide_function.md`: document the new redirect-based login flow and the two-script JS architecture (init vs. router), plus the dynamic tab bar system.
  - In `guide_security.md`: note the `dashboard_auth.js` page guard and its dependency on `load_middleware.js`.
- **Vibe Rule(s):** Maintain documentation as source of truth · Keep docs in sync with architecture

- [x] Task complete

---

### T2 — Create `dashboard.html` with static shell and empty nav containers

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Create a new HTML page with the structural shell rendered as static markup. There is **no sidebar** in this file. The shell contains: a `<header>` with the favicon, title "The JesusWebsite Dashboard", a "Return to Site" `<a>` link, and the logout button (`id="logout-btn"`). Below the header: a single empty `<nav id="module-tab-bar">` (populated by `dashboard_init.js` + `renderTabBar()` on DOMContentLoaded with all 13 module tabs). Below the nav: `<main class="admin-canvas" id="admin-canvas"></main>`. Include CSS links (same set as `admin.html`, excluding sidebar-specific rules that will be removed in T11) and JS script tags in the following load order: `load_middleware.js` first, then `dashboard_auth.js`, `logout_middleware.js`, `dashboard_app.js`, `dashboard_init.js`, `render_tab_bar.js`, then all edit module scripts.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline `<script>` blocks · Descriptive `id` hooks for JS · Modular `class` names for CSS · Component injection pattern for dynamic content
- Do not use the async attribute on any script tag. defer is acceptable if used consistently across all scripts in the file, since defer preserves document order.

- [x] Task complete

---

### T3 — Create `dashboard_auth.js` — lightweight page guard

- **File(s):** `js/7.0_system/dashboard/dashboard_auth.js`
- **Action:** Create a new JS file that on DOMContentLoaded calls `window.verifyAdminSession()` (defined in `load_middleware.js` — do not duplicate the fetch logic). If the returned promise resolves to `false`, redirect `window.location.href` to `/admin/frontend/admin.html`. If it resolves to `true`, do nothing. `load_middleware.js` must be loaded before this file in `dashboard.html` (enforced by script tag order in T2).
- **Vibe Rule(s):** One function per file · Three-line comment header (trigger, main function, output) · Vanilla ES6+ · No frameworks

- [x] Task complete

---

### T4 — Confirm `render_tab_bar.js` works correctly for both call sites

- **File(s):** `js/7.0_system/dashboard/render_tab_bar.js`
- **Action:** `render_tab_bar.js` has two call sites: (1) `dashboard_init.js` calls `renderTabBar("module-tab-bar", allModules, "records-all")` once on DOMContentLoaded to build the shell module tab bar; (2) individual editor render functions call `renderTabBar(containerId, tabs, activeTab)` for any within-canvas tab bars they need (e.g. Academic/Popular inside Challenge, Essay/Historiography inside text-essays). `loadModule()` is not a call site. 
- Confirm that `window.renderTabBar(containerId, tabs, activeTab)` accepts a container ID, tabs array, and active tab value — no logic change is required. 
- Confirm the `is-active` toggle on click correctly updates only buttons within the given container, and that clicking an already-active button still fires the click event and calls `window.loadModule()` (enabling the refresh behaviour).
- Update the three-line comment header to reflect these two call sites. 
- Confirm load_middleware.js three-line comment header correctly reflects the new call site (dashboard_auth.js on DOMContentLoaded) rather than the old call site (dashboard_app.js per-module)
- **Vibe Rule(s):** Three-line comment header · Single Responsibility (one function, two call sites) · No dead code

- [x] Task complete

---

### T5 — Strip `admin.html` down to login-only

- **File(s):** `admin/frontend/admin.html`
- **Action:** Remove the `#dashboard-app` container, all dashboard-related CSS links (`admin_shell.css`, `admin_components.css`, all editor module CSS files), and all dashboard JS scripts (`load_middleware.js`, `logout_middleware.js`, `dashboard_app.js`, `dashboard_init.js`, `render_tab_bar.js`, all edit module scripts). Keep only the login view markup, the login stylesheet (`auth_login.css`), and `admin_login.js`. Remove the `admin-full-height` body class if present.
- **Vibe Rule(s):** Semantic HTML5 tags · Clean skeletons · No dead DOM · Predictable hooks

- [x] Task complete

---

### T6 — Rewrite `admin_login.js` to redirect to `dashboard.html`

- **File(s):** `js/7.0_system/dashboard/admin_login.js`
- **Action:** Rewrite so the `DOMContentLoaded` callback is the only function. Remove `transitionToDashboard()` — on successful login or passing auto-session check, set `window.location.href = '/admin/frontend/dashboard.html'` directly in the success branch. Remove the `adminAuthSuccess` event dispatch. Remove all DOM toggle logic (`loginView.classList` / `dashboardApp` references). Keep form handling, error display, and brute-force delay intact.
- **Vibe Rule(s):** One function per file · Three-line comment header · Vanilla ES6+ · Single Responsibility

- [x] Task complete

---

### T7 — Rewrite `logout_middleware.js` to redirect to `admin.html`

- **File(s):** `js/7.0_system/dashboard/logout_middleware.js`
- **Action:** Change `window.adminLogout` so that after the POST to `/api/admin/logout`, it sets `window.location.href = '/admin/frontend/admin.html'` instead of manipulating DOM elements. Remove all DOM references (`dashboardApp`, `loginView`, `passField`). Keep the fetch call and error handling.
- **Vibe Rule(s):** One function per file · Three-line comment header · Vanilla ES6+ · Single Responsibility

- [x] Task complete

---

### T8 — Create `dashboard_init.js` — top-level tab bar render and one-time wiring

- **File(s):** `js/7.0_system/dashboard/dashboard_init.js`
- **Action:** Create a new JS file with a single `DOMContentLoaded` listener that: (1) defines the full 13-module tabs config array — each entry is `{ label, module }` matching the tab structure table in the Purpose section above; (2) calls `window.renderTabBar("module-tab-bar", allModules, "records-all")` to render the flat module tab bar; (3) attaches a click handler to `#logout-btn` that calls `window.adminLogout()`; (4) calls `window.loadModule("records-all")` to set the default view. No routing logic belongs in this file.
- **Vibe Rule(s):** One function per file · Three-line comment header (trigger: DOMContentLoaded on dashboard.html · main function: renders module tab bar and fires initial loadModule · output: module-tab-bar populated, default module loaded) · Vanilla ES6+ · Single Responsibility

- [x] Task complete

---

### T9 — Refactor `dashboard_app.js` into a pure router

- **File(s):** `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** Remove `renderDashboardShell()` entirely. Remove all event wiring (logout, sidebar delegation — all of that moves to `dashboard_init.js`). Remove the `moduleGroupMap` and `syncTabBar()` — the flat tab bar has no section grouping to sync. Remove the `DOMContentLoaded` listener from this file. The file must contain exactly one declared function: `window.loadModule(module)`, which: (1) updates `is-active` on `#module-tab-bar` by removing it from all buttons and adding it to the button whose `data-module` matches `module`; (2) routes `module` to the appropriate editor render function and populates `#admin-canvas`. Clicking the active tab passes the same `module` value again — `loadModule()` re-renders the editor fresh, which clears any unsaved DOM state. Update the three-line comment header to reflect the new scope.
- **Vibe Rule(s):** One function per file · Three-line comment header (trigger: called by dashboard_init.js or render_tab_bar.js click handler · main function: sets active tab and routes module name to editor · output: #module-tab-bar active state updated, #admin-canvas populated) · Vanilla ES6+ · Component injection pattern

- [x] Task complete

---

### T10 — Confirm `is-active` CSS rule for both tab bar tiers

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** Confirm that the existing `.admin-tab-btn.is-active` rule (currently at line 32) correctly styles the active button in `#module-tab-bar`. The rule is already class-based and not container-scoped, so it should apply correctly. Confirm colour values reference CSS variables from `typography_colors.css`. No changes required if the rule is already correct.
- **Vibe Rule(s):** CSS Grid for macro layout · Flexbox for micro alignment · All colours/fonts/spacing reference CSS variables · Section headings as comments

- [x] Task complete

---

### T11 — CSS alignment audit: remove shell debris, keep grid aliases

- **File(s):** `css/1.0_foundation/dashboard/admin_shell.css`, `css/1.0_foundation/dashboard/admin_components.css`
- **Action:**
  - In `admin_shell.css`: remove the `.admin-sidebar` block and all its child rules (`.admin-sidebar h3`, `.admin-sidebar ul`, `.admin-sidebar li`, `.admin-sidebar a`, `.admin-sidebar a:hover`, `.admin-sidebar a.is-active`, `#sidebar-return-link`, `#sidebar-return-link:hover`). Remove `.admin-body-layout` (the flex wrapper that included the sidebar). Remove the home screen debris: `.dashboard-home-grid`, `.system-meta`, `.system-meta dt`, `.system-meta dd`, `.admin-card`, `.admin-card h2`, `.admin-card ul`, `.admin-card li`, `.quick-action-btn`, `.quick-action-btn:hover`, `.status-indicator`, `.status-online`. Remove `.admin-full-height` and `.is-visible-flex` if they are only used by the old SPA toggle mechanism — audit call sites first. Keep `.admin-canvas`, `.admin-header`, `.admin-logout-btn`, `.admin-dashboard-container`, `.is-hidden`, `.is-visible`.
  - In `admin_components.css`: keep `.column-one`, `.column-two`, `.column-three` — these are general wireframe alias classes used across all Providence-layout editor modules, not tied to the removed home screen. Add a clarifying comment above them: `/* Wireframe alias classes — used by all Providence 3-column editor modules. Not specific to any one view. */` Remove any reference to `.blog-editor-grid` if present (the class does not exist in CSS and the alias was never implemented).
  - Confirm all class names used in the static `dashboard.html` shell markup have corresponding rules.
- **Vibe Rule(s):** No dead code · Clean skeletons · All colours reference CSS variables · Section headings as comments

- [x] Task complete

---

### T12 — Codebase alignment audit

- **File(s):** All files created or modified in this plan
- **Action:** Audit every file touched by this plan for code, class names, function names, IDs, event names, and comments that are misaligned, misleading, or redundant given the new architecture. Check for: (a) any remaining references to `adminAuthSuccess` custom event; (b) JS comments referencing `renderDashboardShell()` or the old injection flow; (c) any `data-module` values in HTML or JS that do not match a valid entry in the module tab structure table in the Purpose section; (d) any remaining sidebar references (`.admin-sidebar`, `#admin-sidebar`, `#sidebar-return-link`, `admin-body-layout`) in HTML, JS, or CSS; (e) any remaining `.blog-editor-grid` references in JS, HTML, or documentation; (f) any CSS class in the static `dashboard.html` shell with no rule in the stylesheet, or any CSS rule in the stylesheet with no corresponding element in the shell; (g) any comments or strings referencing "Home", "home screen", "welcome page", "welcome screen", or "Dashboard Home"; (h) `.admin-full-height` and `.is-visible-flex` — confirm they are fully dead before removal; (i) any reference to `moduleGroupMap`, `syncTabBar`, `main-tab-bar`, `sub-tab-bar`, or section-grouping navigation labels (Records / Lists & Ranks / Text Content / Configuration) — artefacts of the superseded two-tier hierarchy.
- **Vibe Rule(s):** Clean skeletons · No dead code · Single Responsibility · No dead DOM

- [x] Task complete

---

### T13 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [x] One function per file
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T14 — Purpose Check

> Verify that every claim in the Purpose section has been delivered and that no unintended scope creep occurred.

- [x] `admin.html` serves as a login-only page with no dashboard shell markup or scripts
- [x] Successful authentication redirects the browser to `dashboard.html` via `window.location.href`
- [x] `dashboard.html` statically renders only the structural shell — header (favicon, title, Return to Site link, logout button) plus a single empty `#module-tab-bar` nav container and an empty `#admin-canvas`
- [x] There is no sidebar in `dashboard.html`
- [x] `dashboard.html` script load order is correct: `load_middleware.js` before `dashboard_auth.js`, `dashboard_init.js` after `dashboard_app.js`
- [x] `dashboard_auth.js` calls `window.verifyAdminSession()` from `load_middleware.js` — no duplicated fetch logic — and redirects to `admin.html` if the session is invalid
- [x] `dashboard_init.js` defines the 13-module tabs config array, calls `renderTabBar("module-tab-bar", allModules, "records-all")`, wires the logout button, and calls `loadModule("records-all")` on DOMContentLoaded
- [x] `dashboard_app.js` is a pure router — `window.loadModule()` is its only declared function; it updates `is-active` on `#module-tab-bar` and populates `#admin-canvas`; no `moduleGroupMap`, no `syncTabBar`, no sub-tab-bar
- [x] Clicking the active tab calls `loadModule()` again with the same module, re-rendering the editor fresh and clearing any unsaved input
- [x] The complete module tab structure — all 13 tabs with correct labels and `data-module` values — matches the Purpose section table
- [x] The logout flow redirects to `admin.html` instead of resetting the DOM in-place
- [x] No hidden dashboard container exists in `admin.html`
- [x] All sidebar HTML, sidebar CSS, and sidebar JS wiring have been removed
- [x] `.dashboard-home-grid` and all companion home-screen CSS rules have been removed from `admin_shell.css`
- [x] `.column-two` and `.column-three` alias classes are kept and annotated as general-purpose Providence-layout aliases
- [x] All misaligned references (adminAuthSuccess, renderDashboardShell, sidebar, blog-editor-grid, Home/welcome) have been removed from all touched files
- [x] No scope creep — only files listed in §Tasks were created or modified

---

### T15 — Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `admin/frontend/dashboard.html` | 7.0 — System Module | No (new file) | Add entry under `admin/frontend/` |
| `js/7.0_system/dashboard/dashboard_auth.js` | 7.0 — System Module | No (new file) | Add entry under JS admin section |
| `js/7.0_system/dashboard/dashboard_init.js` | 7.0 — System Module | No (new file) | Add entry under JS admin section |
| `js/7.0_system/dashboard/render_tab_bar.js` | 7.0 — System Module | Yes | Update description: handles both top-level and sub-module tab bars |
| `admin/frontend/admin.html` | 7.0 — System Module | Yes | Update description to reflect login-only scope |
| `js/7.0_system/dashboard/admin_login.js` | 7.0 — System Module | Yes | Update description to reflect redirect logic |
| `js/7.0_system/dashboard/logout_middleware.js` | 7.0 — System Module | Yes | Update description to reflect redirect logic |
| `js/7.0_system/dashboard/dashboard_app.js` | 7.0 — System Module | Yes | Update description: pure router, `window.loadModule()` only, no shell injection, no renderTabBar call |
| `css/1.0_foundation/dashboard/admin_shell.css` | 1.0 — Foundation Module | Yes | Update description: sidebar and home-screen rules removed |
| `css/1.0_foundation/dashboard/admin_components.css` | 1.0 — Foundation Module | Yes | Update description: column alias classes annotated as general-purpose |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

### T16 — Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted.

#### Intra-Module Check — Module 7.0: System Module

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `admin/backend/admin_api.py` | No | No API contract changes — login, logout, verify endpoints unchanged; `/api/admin/verify` confirmed to exist |
| `admin/backend/auth_utils.py` | No | JWT and auth logic unchanged |
| `.agent/` | No | Agent workflows unchanged |
| `assets/ai-instructions.txt` | No | Unchanged |
| `README.md` | No | Unchanged |
| `mcp_server.py` | No | Unchanged |
| `requirements.txt` | No | Unchanged |
| `nginx.conf` | No | Both HTML pages served from the same directory |
| `.gitignore` | No | Unchanged |
| `LICENCE` | No | Unchanged |
| `deployment/deploy.sh` | No | Unchanged |
| `deployment/ssl_renew.sh` | No | Unchanged |
| `deployment/admin.service` | No | Unchanged |
| `deployment/mcp.service` | No | Unchanged |
| `.env` | No | Unchanged |
| `backend/middleware/rate_limiter.py` | No | Unchanged |

#### Cross-Module Check

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation Module (CSS System) | Yes | `admin_shell.css` and `admin_components.css` modified in T10 and T11 — covered explicitly |
| 2.0 — Records Module | No | Edit module JS files loaded on `dashboard.html`; logic and selectors unchanged |
| 3.0 — Visualizations Module | No | `edit_diagram.js` loaded on `dashboard.html`; no logic changes |
| 4.0 — Ranked Lists Module | No | Weights and responses editors loaded on `dashboard.html`; no logic changes |
| 5.0 — Essays & Responses Module | No | Essay and response editors loaded on `dashboard.html`; no logic changes |
| 6.0 — News & Blog Module | No | News and blog editors loaded on `dashboard.html`; no logic changes |
| 8.0 — Setup & Testing Module | No | No test files or build scripts modified |

### Module Impact Summary
- [ ] Intra-module check completed — all other files in Module 7.0 reviewed
- [ ] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **Partial — CSS changes in Module 1.0 are in scope and covered by T10 and T11**

---

### T17 — Documentation Update

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/site_map.md` | Yes | Run `/sync_sitemap` to regenerate with entries for `dashboard.html`, `dashboard_auth.js`, `dashboard_init.js`; updated descriptions for `admin.html`, `admin_login.js`, `logout_middleware.js`, `dashboard_app.js`, `render_tab_bar.js`, `admin_shell.css`, `admin_components.css` |

### Documentation Checklist
- [x] `/sync_sitemap` has been run and `site_map.md` reflects all changes
- [x] No other documentation files need updating — purpose and scope were defined in T1 before any code was written

---

## T18 — Push to Github

```
git add .
git commit -m "new dashboard architecture"
git push origin main
```
