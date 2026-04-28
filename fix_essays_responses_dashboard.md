---
name: fix_essays_responses_dashboard
version: 1.0.0
module: 5.0 — Essays
status: draft
created: 2025-07-16
---

# Plan: fix_essays_responses_dashboard

## Purpose

> Wire the admin dashboard's "Text Content" sidebar section to its real editor UIs for essays and responses — specifically the "Essays" (`text-essays`) and "Responses" (`text-responses`) links. Currently both fall through to the generic split-pane placeholder in `dashboard_app.js`. Three editor files (`edit_essay.js`, `edit_historiography.js`, `edit_response.js`) already have `window.renderEdit*` functions ready, but (a) their JS files are not loaded by `admin.html`, and (b) the `loadModule` router has no cases for their sidebar links. This plan fixes both problems and adds a lightweight tabbed container for the Essays link so both Context Essays and Historiography articles can be authored without leaving the canvas.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Load essays and responses scripts in admin.html

- **File(s):** `admin/frontend/admin.html`
- **Action:** Add three missing `<script>` tags below the existing edit-module script block, one for each essays/responses editor that is currently excluded from the page: `edit_essay.js`, `edit_historiography.js`, and `edit_response.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id`/`class` hooks

- [ ] Task complete

---

### T2 — Wire router cases for Essays and Responses in dashboard_app.js

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add two new `if` branches inside `loadModule` — for `text-essays` and `text-responses` — that render the correct editor UI into the admin canvas, including a 2-tabbed container for `text-essays` (Context Essay tab + Historiography tab, defaulting to Context Essay) and a direct single-pane call to `window.renderEditResponse` for `text-responses`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (already present) · Vanilla ES6+ · Component injection for tab panes

- [ ] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup (admin.html already uses a well-structured skeleton)
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [ ] **No CSS changes in this plan** — the existing `dashboard_admin.css` styles are reused

### JavaScript
- [ ] One function per file (already satisfied by dashboard_app.js's existing functions)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern
- [ ] Tabbed container uses event delegation (not inline onclick) to switch panes

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
| `admin/frontend/admin.html` | 6.1 — Admin Portal | Yes | None (file exists, script tags added) |
| `admin/frontend/dashboard_app.js` | 6.1 — Admin Portal | Yes | None (file exists, router logic extended) |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 5.0: Essays

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `backend/pipelines/pipeline_news.py` | No | No impact identified — plan touches only admin UI routing and script loading |
| `frontend/pages/context_essay.html` | No | No impact identified |
| `frontend/pages/news.html` | No | No impact identified |
| `frontend/pages/blog.html` | No | No impact identified |
| `frontend/pages/debate/historiography.html` | No | No impact identified |
| `frontend/pages/debate/response.html` | No | No impact identified |
| `frontend/display_big/list_blogpost.js` | No | No impact identified |
| `frontend/display_big/list_newsitem.js` | No | No impact identified |
| `frontend/display_big/view_context_essays.js` | No | No impact identified |
| `frontend/display_big/view_historiography.js` | No | No impact identified |
| `frontend/display_big/response_display.js` | No | No impact identified |
| `frontend/display_big/list_view_responses.js` | No | No impact identified |
| `frontend/display_other/sources_biblio_display.js` | No | No impact identified |
| `frontend/display_other/mla_snippet_display.js` | No | No impact identified |
| `frontend/display_other/news_snippet_display.js` | No | No impact identified |
| `frontend/display_other/blog_snippet_display.js` | No | No impact identified |
| `css/design_layouts/views/essay_layout.css` | No | No impact identified |
| `css/design_layouts/views/response_layout.css` | No | No impact identified |
| `admin/frontend/edit_modules/edit_blogpost.js` | No | No impact identified — not loaded or wired by this plan; still orphaned from the router |
| `admin/frontend/edit_modules/edit_news_snippet.js` | No | No impact identified — not loaded or wired by this plan; still orphaned |
| `admin/frontend/edit_modules/edit_news_sources.js` | No | No impact identified — not loaded or wired by this plan; still orphaned |
| `admin/frontend/edit_modules/edit_mla_sources.js` | No | No impact identified — not loaded or wired by this plan; still orphaned |
| `admin/frontend/edit_modules/edit_insert_response_academic.js` | No | No impact identified — already wired by the `fix_ranked_lists_dashboard` plan; no further changes |
| `admin/frontend/edit_modules/edit_insert_response_popular.js` | No | No impact identified — already wired by the `fix_ranked_lists_dashboard` plan; no further changes |
| `admin/frontend/edit_modules/edit_essay.js` | Yes | Will be loaded by admin.html and called by the `text-essays` router case; its `window.renderEditEssay` function is consumed, not modified |
| `admin/frontend/edit_modules/edit_historiography.js` | Yes | Will be loaded by admin.html and called by the `text-essays` router case; its `window.renderEditHistoriography` function is consumed, not modified |
| `admin/frontend/edit_modules/edit_response.js` | Yes | Will be loaded by admin.html and called by the `text-responses` router case; its `window.renderEditResponse` function is consumed, not modified |

### Cross-Module Check

> Modules that are architecturally connected to Module 5.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation | No | No impact identified — CSS variables and typography tokens are already consumed by the editor files; no new tokens introduced |
| 2.0 — Records | No | No impact identified — no record CRUD logic, list editor, or bulk upload touched |
| 3.0 — Visualizations | No | No impact identified — no diagram or visualization logic touched |
| 4.0 — Ranked Lists | No | No impact identified — the response-insertion editors for ranked lists (`edit_insert_response_*.js`) are already wired by a separate plan and are not touched here |
| 6.1 — Admin Portal | Yes | `admin.html` (script loading) and `dashboard_app.js` (router) are the two files directly modified by this plan |
| 6.2 — System Core & DevOps | No | No impact identified — no deployment, .env, or MCP config changes |
| 7.0 — Setup & Testing | No | No impact identified |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 5.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **See flagged rows above** — three intra-module editor files (edit_essay.js, edit_historiography.js, edit_response.js) are now consumed by the router; Module 6.1 (Admin Portal) is directly modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Increment version number to reflect that editor files `edit_essay.js`, `edit_historiography.js`, and `edit_response.js` are now actively consumed by the admin router (no path change, but their status in the system architecture shifts from "available but orphaned" to "wired") |
| `documentation/simple_module_sitemap.md` | No | No impact identified — module scope and high-level structure unchanged |
| `documentation/site_map.md` | No | No impact identified — no new files added to the codebase |
| `documentation/data_schema.md` | No | No impact identified — no schema changes |
| `documentation/vibe_coding_rules.md` | No | No impact identified — rules are already followed by existing patterns |
| `documentation/style_mockup.html` | No | No impact identified — no new page layout or visual change |
| `documentation/git_vps.md` | No | No impact identified — no deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No impact identified — no public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | The §5.1/5.2 ASCII diagram should be reviewed to confirm accuracy with how the sidebar links (`text-essays`, `text-responses`) now route to the editors; if the sidebar nav structure differs from the diagram's sub-navigation, update accordingly |
| `documentation/guides/guide_function.md` | Yes | Document the two new `loadModule` router cases for `text-essays` (2-tab container) and `text-responses` (single call) in the admin router section |
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