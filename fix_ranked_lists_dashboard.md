---
name: fix_ranked_lists_dashboard
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2025-07-16
---

# Plan: fix_ranked_lists_dashboard

## Purpose

> Wire the admin dashboard's "Lists & Ranks" sidebar section to its real editor UIs, instead of falling through to the generic split-pane placeholder. Three sidebar links are broken: "Edit Weights" (`ranks-weights`), "Edit Resources" (`lists-resources`), and "Insert Responses" (`ranks-responses`). Each has a render function or set of render functions already written, but (a) the JS files are not loaded by `admin.html`, and (b) the `loadModule` router in `dashboard_app.js` has no cases for them. This plan fixes both problems and adds a light tabbed container so the three weight editors (Wikipedia / Academic / Popular) and the two response inserters (Academic / Popular) are navigable without leaving the canvas.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Load ranked-lists scripts in admin.html

- **File(s):** `admin/frontend/admin.html`
- **Action:** Add seven missing `<script>` tags below the existing edit-module script block, one for each ranked-lists and response-insertion module that is currently excluded from the page.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id`/`class` hooks

- [ ] Task complete

---

### T2 — Wire router cases for Lists & Ranks in dashboard_app.js

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add three new `if` branches inside `loadModule` — for `ranks-weights`, `lists-resources`, and `ranks-responses` — that render a tabbed container (where applicable), call the existing `window.renderEdit*` functions into a content pane, and attach tab-switching event delegation.
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
| `admin/frontend/admin.html` | 6.1 — Admin Portal | Yes | None (file exists, no structural change) |
| `admin/frontend/dashboard_app.js` | 6.1 — Admin Portal | Yes | None (file exists, router logic extended) |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

**Note:** The sitemap lists `edit_insert_response_academic.js` and `edit_insert_response_popular.js` under Module 5.0 (Essays), while the dashboard guide lists them under §4.2 (Ranked Lists). This documentation inconsistency should be resolved after implementation — see Documentation Update section.

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 4.0: Ranked Lists

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `backend/pipelines/pipeline_wikipedia.py` | No | No impact identified — plan touches only admin UI routing and script loading |
| `backend/pipelines/pipeline_popular_challenges.py` | No | No impact identified |
| `backend/pipelines/pipeline_academic_challenges.py` | No | No impact identified |
| `frontend/pages/debate/wikipedia.html` | No | No impact identified |
| `frontend/pages/debate/popular_challenge.html` | No | No impact identified |
| `frontend/pages/debate/academic_challenge.html` | No | No impact identified |
| `frontend/display_big/list_view_wikipedia.js` | No | No impact identified |
| `frontend/display_big/list_view_popular_challenges.js` | No | No impact identified |
| `frontend/display_big/list_view_academic_challenges.js` | No | No impact identified |
| `frontend/display_big/list_view_popular_challenges_with_response.js` | No | No impact identified |
| `frontend/display_big/list_view_academic_challenges_with_response.js` | No | No impact identified |
| `admin/frontend/edit_modules/edit_rank.js` | No | No impact identified — not loaded or routed; orphaned but unchanged |
| `admin/frontend/edit_modules/edit_wiki_weights.js` | Yes | Will be loaded by admin.html and called by dashboard_app.js router; its `window.renderEditWikiWeights` function is consumed, not modified |
| `admin/frontend/edit_modules/edit_academic_weights.js` | Yes | Will be loaded by admin.html and called by dashboard_app.js router; its `window.renderEditAcademicWeights` function is consumed, not modified |
| `admin/frontend/edit_modules/edit_popular_weights.js` | Yes | Will be loaded by admin.html and called by dashboard_app.js router; its `window.renderEditPopularWeights` function is consumed, not modified |

### Cross-Module Check

> Modules that are architecturally connected to Module 4.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation | No | No impact identified — CSS variables and typography tokens are already consumed by the editor files; no new tokens introduced |
| 2.0 — Records | Yes | `edit_lists.js` (listed under Module 2.0 Records / §2.3–2.4 "Ordinary Lists") is referenced by the "Edit Resources" sidebar link (`lists-resources`) and will be loaded/wired by this plan |
| 3.0 — Visualizations | No | No impact identified |
| 5.0 — Essays | Yes | `edit_insert_response_academic.js` and `edit_insert_response_popular.js` are listed under Module 5.0 in the sitemap; they will be loaded by admin.html and wired by the `ranks-responses` router case |
| 6.1 — Admin Portal | Yes | `admin.html` (script loading) and `dashboard_app.js` (router) are the two files directly modified by this plan |
| 6.2 — System Core & DevOps | No | No impact identified — no deployment, .env, or MCP config changes |
| 7.0 — Setup & Testing | No | No impact identified |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 4.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [ ] Impact result: **See flagged rows above** — three intra-module files (the weight editors) are consumed by the new router; two cross-module areas (Module 2.0 via `edit_lists.js`, Module 5.0 via `edit_insert_response_*.js`) are affected; Module 6.1 (Admin Portal) is directly modified.

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add `edit_insert_response_academic.js` and `edit_insert_response_popular.js` to Module 4.0 admin file list (currently only listed under Module 5.0); add `edit_lists.js` reference in the sidebar context if needed; increment version number |
| `documentation/simple_module_sitemap.md` | No | No impact identified — module scope and high-level structure unchanged |
| `documentation/site_map.md` | No | No impact identified — no new files added to the codebase |
| `documentation/data_schema.md` | No | No impact identified — no schema changes |
| `documentation/vibe_coding_rules.md` | No | No impact identified — rules are already followed by existing patterns |
| `documentation/style_mockup.html` | No | No impact identified — no new page layout or visual change |
| `documentation/git_vps.md` | No | No impact identified — no deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No impact identified — no public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | The §4.1 ASCII diagram should be updated to show the tabbed container orchestration layer; §4.2 ASCII diagram should likewise reflect that Insert Responses is a tabbed container calling into `edit_insert_response_academic.js` / `edit_insert_response_popular.js` |
| `documentation/guides/guide_function.md` | Yes | Document the new `loadModule` router cases for `ranks-weights`, `lists-resources`, and `ranks-responses`, including the tabbed container orchestration logic |
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