---
name: fix_dashboard_aesthetics
version: 1.0.0
module: 7.0 — System Module
status: draft
created: 2025-07-17
---

# Plan: fix_dashboard_aesthetics

## Purpose

> **Fixes two issues identified in the §18 "Dashboard & Editor Aesthetics" audit.**
>
> **Issue 1:** The `.dashboard` dark-mode scope in `typography_colors.css` is missing overrides for `--color-bg-tertiary`, `--color-text-muted`, and `--color-border-strong`, causing hover backgrounds (sidebar links, return-link) and muted text labels to fall through to light-theme values on the dark admin background.
>
> **Issue 2:** The Providence 3-column editor layout (§18.1) is implemented ad-hoc only in the Blog Editor (`blog-editor-grid`). No reusable CSS pattern exists for other edit modules to adopt it. This plan extracts a canonical `.providence-editor-grid` class and updates the style guide and dashboard appearance docs to clarify the layout architecture.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Add missing CSS variables to the `.dashboard` dark-mode scope

- **File(s):** `css/elements/typography_colors.css`
- **Action:** Add `--color-bg-tertiary`, `--color-text-muted`, and `--color-border-strong` overrides inside the `.dashboard { ... }` scope block, mapping them to appropriate dark-mode values (`--color-dash-surface-hover`, `--color-dash-text-muted`, `--color-dash-border-strong` or inline hex values consistent with the existing dark palette).
- **Vibe Rule(s):** CSS variables for everything · Section comments present

- [x] Task complete

---

### T2 — Create reusable `.providence-editor-grid` CSS class

- **File(s):** `css/design_layouts/views/dashboard_admin.css`
- **Action:** Extract the 3-column grid pattern from `.blog-editor-grid` into a new generic `.providence-editor-grid` class in the same stylesheet. Use `grid-template-columns: 160px 1fr 2fr` (COL1: narrow actions, COL2: medium metadata/list, COL3: widest editor). Keep `.blog-editor-grid` as a backward-compatible alias that `@extends` or duplicates the same rules. Add a section comment block documenting the Providence pattern and its column rules (§18.1).
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables for all values · Section comments with sub-headings

- [x] Task complete

---

### T3 — Update `guide_style.md` §18.1 to clarify shell vs. editor layout

- **File(s):** `documentation/guides/guide_style.md`
- **Action:** Add a clarifying paragraph to §18.1 noting that the `.admin-body-layout` (sidebar + canvas) is the dashboard navigation frame and that the Providence 3-column pattern applies to **editor content** rendered inside the canvas. Reference the new `.providence-editor-grid` CSS class as the canonical implementation. Update the Component Token Reference's "Editor" row to mention the 3-column variant.
- **Vibe Rule(s):** Semantic documentation · Human-first readability

- [x] Task complete

---
### T4 — Update `guide_dashboard_appearance.md` to reference `.providence-editor-grid`

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** In the "Layout Convention — Providence 3-Column Pattern" section, add a note after the ASCII diagram that the pattern is implemented as the `.providence-editor-grid` CSS class in `dashboard_admin.css`. Update the Blog Editor wireframe (§6.2) if needed to reflect that its grid now derives from this shared class.
- **Vibe Rule(s):** Semantic documentation · Accurate cross-references

- [x] Task complete

---

### T5 — Update `guide_dashboard_appearance.md` version and sitemap

- **File(s):** `documentation/detailed_module_sitemap.md` · `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Increment the version number in the frontmatter of `guide_dashboard_appearance.md`. No new files are added, so no sitemap entries need creation, but confirm the sitemap references to `dashboard_admin.css` and `typography_colors.css` are current.
- **Vibe Rule(s):** Accurate documentation · Version discipline

- [x] Task complete

---

<!-- Add additional T4, T5 … blocks as needed using the same pattern above -->

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] No HTML files are created or modified by this plan — N/A

### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [ ] No JavaScript files are created or modified by this plan — N/A

### Python
- [ ] No Python files are created or modified by this plan — N/A

### SQL / Database
- [ ] No SQL or database files are created or modified by this plan — N/A

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `css/elements/typography_colors.css` | 1.0 — Foundation Module | Yes | None — existing entry, no structural change |
| `css/design_layouts/views/dashboard_admin.css` | 7.1 — Admin Portal | Yes | None — existing entry, no structural change |
| `documentation/guides/guide_style.md` | 8.3 — Documentation | Yes | None — content update only |
| `documentation/guides/guide_dashboard_appearance.md` | 8.3 — Documentation | Yes | None — content and version bump only |
| `documentation/detailed_module_sitemap.md` | 8.3 — Documentation | Yes | None — no new files or paths added |

### Sitemap Integrity Checks
- [x] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [x] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [x] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 7.0: System Module (Sub-Module 7.1 Admin Portal)

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `admin/frontend/admin.html` | No | No structural changes to the HTML shell — CSS variable additions are inherited automatically |
| `admin/frontend/dashboard_app.js` | No | No JS logic changes — the new `.providence-editor-grid` class is additive CSS only; editor modules opt in optionally |
| `admin/frontend/admin_login.js` | No | No impact identified — login flow is unrelated |
| `admin/frontend/load_middleware.js` | No | No impact identified — middleware is unrelated to CSS or docs |
| `admin/frontend/logout_middleware.js` | No | No impact identified — middleware is unrelated to CSS or docs |
| `admin/backend/admin_api.py` | No | No impact identified — backend API is unrelated to CSS or docs |
| `admin/backend/auth_utils.py` | No | No impact identified — auth utilities are unrelated to CSS or docs |
| `css/design_layouts/views/login_view.css` | No | No impact identified — login view CSS is separate from dashboard aesthetics |
| `css/elements/markdown_editor.css` | No | No impact identified — markdown editor CSS inherits variables but changes are additive only |

### Intra-Module Check — Module 1.0: Foundation Module

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `css/elements/grid.css` | No | No impact identified — grid.css controls public page layout, not the dashboard scope |
| `css/elements/list_card_button.css` | No | No impact identified — component styles inherit variables but the changes are additive only |
| `css/design_layouts/public.css` | No | No impact identified — public layout is unrelated |

### Cross-Module Check

> Modules that are architecturally connected to Module 7.0 System Module per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation Module | Yes | `typography_colors.css` (Module 1.0) is edited — the `.dashboard` scope block is part of the foundation CSS. Changes are additive only (new variable overrides), no breaking changes. |
| 2.0 — Records Module | No | No impact identified — the edit modules (edit_record.js, etc.) inherit the new `.providence-editor-grid` CSS class but are not required to use it. No JS or HTML changes propagate. |
| 3.0 — Visualizations Module | No | No impact identified — diagram editor is a standalone module. |
| 4.0 — Ranked Lists Module | No | No impact identified — weight editors use tables, not the 3-column grid pattern. |
| 5.0 — Essays & Responses Module | No | No impact identified — essay/response editors use split-pane layouts, not the 3-column grid pattern. |
| 6.0 — News & Blog Module | No | The Blog Editor already implements the 3-column pattern via `blog-editor-grid`; the new `.providence-editor-grid` class is a refactor of the same rules, so behaviour is unchanged. |
| 7.2 — Agent Logic & Instructional Prompts | No | No impact identified — agent instructions are unrelated. |
| 7.3 — Backend API, MCP Server & VPS Config | No | No impact identified — backend config is unrelated. |
| 7.4 — Security Protocols & JWT Management | No | No impact identified — security is unrelated to CSS or docs. |
| 8.0 — Setup & Testing Module | No | No impact identified — testing infrastructure is unrelated. |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 7.1 and 1.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [x] Impact result: **Null — no downstream impact identified** (all changes are additive CSS overrides or documentation updates; no behavioural changes to JS, Python, or SQL)

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files or paths added — existing entries remain accurate |
| `documentation/simple_module_sitemap.md` | No | No high-level structural change to module scope |
| `documentation/site_map.md` | No | No new files added — /sync_sitemap not required |
| `documentation/data_schema.md` | No | No database schema changes |
| `documentation/vibe_coding_rules.md` | No | No rule ambiguities encountered — CSS variable and grid patterns already covered |
| `documentation/style_mockup.html` | No | No new page layout or visual mockup added |
| `documentation/git_vps.md` | No | No deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update the Layout Convention section to reference `.providence-editor-grid` as the canonical CSS implementation. Increment version number. |
| `documentation/guides/guide_function.md` | No | No new logic flow added — CSS and docs only |
| `documentation/guides/guide_security.md` | No | No auth, session, or security changes |
| `documentation/guides/guide_style.md` | Yes | Update §18.1 to clarify that the Providence 3-column pattern applies to editor content, not the dashboard shell. Add cross-reference to `.providence-editor-grid`. |
| `documentation/guides/guide_maps.md` | No | No map-related changes |
| `documentation/guides/guide_timeline.md` | No | No timeline-related changes |
| `documentation/guides/guide_donations.md` | No | No donation flow changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or AI-accessibility changes |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present