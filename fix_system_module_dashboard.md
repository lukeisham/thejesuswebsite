---
name: fix_system_module_dashboard
version: 1.0.0
module: 6.0 — System Module
status: draft
created: 2026-04-28
---

# Plan: fix_system_module_dashboard

## Purpose

> **Complete the Module 6.0 (System Module) dashboard framework** in `dashboard_app.js` by making the default Dashboard Home / Status view restorable via the router, adding a sidebar navigation link to return to it, and removing the stale placeholder scaffolding ("Module router placeholder (waiting for tasks 25-27)") that currently renders a generic split-pane fallback for all unrouted sidebar links.  
>  
> After this plan, every sidebar link in the admin portal will have either (a) a specific route handled by its own module's plan, or (b) a graceful fallback that restores the Dashboard Home view instead of displaying dead scaffolding code.  
>  
> **Important execution order:** This plan must be applied **after** all sibling plans have been implemented (`fix_module_2_dashboard`, `fix_ranked_lists_dashboard`, `fix_essays_responses_dashboard`, `fix_news_blog_dashboard`, `fix_edit_diagram_module_3_1`), because it removes the generic fallback that those plans' unfinished routes depend on.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Extract and route Dashboard Home view in `dashboard_app.js`

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Extract the default dashboard home/status HTML (the three admin-card sections: System Status, Recent Edits / Activity Log, Quick Actions) from the inline HTML template in `renderDashboardShell` into a standalone function `renderDashboardHome(containerId)` that injects the home view into a given container. Then add a `moduleName === 'dashboard-home'` case to the `loadModule` router that calls `renderDashboardHome('admin-canvas')`.
- **Vibe Rule(s):** 1 function per JS file (existing functions only, not adding a new file) · 3-line comment header · Vanilla ES6+ · Component injection pattern

- [ ] Task complete

---

### T2 — Add "Dashboard Home" link to sidebar navigation in `dashboard_app.js`

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a navigation link with `data-module="dashboard-home"` at the very top of the sidebar's `<nav class="admin-sidebar">` list, positioned above the "Records" heading and styled as a prominent "Dashboard Home" entry. When clicked, it routes through `loadModule('dashboard-home')` to restore the system status view. All existing sidebar links (`records-new`, `records-edit`, etc.) remain unchanged.
- **Vibe Rule(s):** Vanilla ES6+ · Component injection for the sidebar nav tree · Descriptive `data-module` attribute hooks

- [ ] Task complete

---

### T3 — Remove stale placeholder scaffolding from `loadModule` in `dashboard_app.js`

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Delete the comment line `// Module router placeholder (waiting for tasks 25-27)` and the entire fallback HTML block (the generic split-pane editor markup with "Technical Ledger Interface — Split Pane Active" and the associated form elements). Replace with a fallback that calls `loadModule('dashboard-home')` so any unrecognized module name degrades gracefully to the Dashboard Home view instead of displaying dead scaffolding.
- **Vibe Rule(s):** Vanilla ES6+ — clean, readable code · No dead code or stale comments

- [ ] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS
- [ ] **No HTML file changes in this plan**

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [ ] **No CSS changes in this plan**

### JavaScript
- [ ] One function per file (dashboard_app.js already follows this pattern)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern
- [ ] Extracted `renderDashboardHome` function has a 3-line comment header
- [ ] No dead code left behind — the generic split-pane fallback is fully removed

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline
- [ ] **No Python changes in this plan**

### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic
- [ ] **No SQL changes in this plan**

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `admin/frontend/dashboard_app.js` | 6.1 — Admin Portal | Yes | None (file exists, router logic restructured) |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 6.0: System Module

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `admin/frontend/admin.html` | No | No impact identified — no script tags added or removed; only `dashboard_app.js` is modified |
| `admin/frontend/admin_login.js` | No | No impact identified — the `adminAuthSuccess` event contract is unchanged |
| `admin/frontend/load_middleware.js` | No | No impact identified — `window.verifyAdminSession` signature unchanged |
| `admin/frontend/logout_middleware.js` | No | No impact identified — `window.adminLogout` signature unchanged |
| `admin/backend/admin_api.py` | No | No impact identified — no backend API changes in this plan |
| `admin/backend/auth_utils.py` | No | No impact identified — no backend changes |
| `css/design_layouts/views/login_view.css` | No | No impact identified — no CSS changes |
| `css/design_layouts/views/dashboard_admin.css` | No | No impact identified — no CSS changes; the existing `.admin-card`, `.status-indicator`, and `.quick-action-btn` classes are reused |
| `css/elements/markdown_editor.css` | No | No impact identified |
| `.agent/` (directory) | No | No impact identified |
| `.gitignore` | No | No impact identified |
| `LICENCE` | No | No impact identified |
| `requirements.txt` | No | No impact identified |
| `mcp_server.py` | No | No impact identified |
| `nginx.conf` | No | No impact identified |
| `.env` | No | No impact identified |
| `backend/middleware/rate_limiter.py` | No | No impact identified |
| `README.md` | No | No impact identified |
| `deployment/deploy.sh` | No | No impact identified |
| `deployment/ssl_renew.sh` | No | No impact identified |
| `deployment/admin.service` | No | No impact identified |
| `deployment/mcp.service` | No | No impact identified |

### Cross-Module Check

> Modules that are architecturally connected to Module 6.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation | No | No impact identified — CSS variables and sidebar/footer component injection patterns are unchanged |
| 2.0 — Records | No | No impact identified — no record CRUD, list, or bulk-upload logic touched; the `records-bulk` route and its `records-new`/`records-edit` counterparts (from fix_module_2_dashboard) continue to work as before |
| 3.0 — Visualizations | No | No impact identified — the `config-diagrams` route (from fix_edit_diagram_module_3_1) is untouched |
| 4.0 — Ranked Lists | No | No impact identified — the `ranks-weights`, `lists-resources`, and `ranks-responses` routes (from fix_ranked_lists_dashboard) are untouched |
| 5.0 — Essays | No | No impact identified — the `text-essays`, `text-responses`, `text-blog`, and `config-news` routes (from fix_essays_responses_dashboard and fix_news_blog_dashboard) are untouched |
| 7.0 — Setup & Testing | No | No impact identified |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 6.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **Null — no downstream impact identified** — this plan only restructures existing code within `dashboard_app.js`; no other files or modules are affected

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No impact identified — no new files added, no paths changed; `dashboard_app.js` already exists under 6.1 Admin Portal |
| `documentation/simple_module_sitemap.md` | No | No impact identified — module scope and high-level structure unchanged |
| `documentation/site_map.md` | No | No impact identified — no new files added to the codebase |
| `documentation/data_schema.md` | No | No impact identified — no schema changes |
| `documentation/vibe_coding_rules.md` | No | No impact identified — rules remain adequate; the component injection pattern is already followed |
| `documentation/style_mockup.html` | No | No impact identified — no new page layout or visual change |
| `documentation/git_vps.md` | No | No impact identified — no deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No impact identified — no public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update the §6.1 ASCII diagram sidebar section to include a "Dashboard Home" link at the top of the sidebar nav; optionally annotate that the generic split-pane fallback has been removed in favour of routing back to the home view |
| `documentation/guides/guide_function.md` | Yes | Document the addition of the `renderDashboardHome` function and the `dashboard-home` router case in the loadModule function description; note that the stale placeholder fallback has been replaced with a graceful home-view redirect |
| `documentation/guides/guide_security.md` | No | No impact identified — session and auth unchanged |
| `documentation/guides/guide_style.md` | No | No impact identified — no new CSS patterns introduced |
| `documentation/guides/guide_maps.md` | No | No impact identified — no map changes |
| `documentation/guides/guide_timeline.md` | No | No impact identified — no timeline changes |
| `documentation/guides/guide_donations.md` | No | No impact identified — no donation flow changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No impact identified — no SEO or robots.txt changes |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present