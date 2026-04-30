---
name: divide_css_into_focused_modules
version: 1.1.0
module: 7.0 — System
status: draft
created: 2026-04-30
---

# Plan: divide_css_into_focused_modules

## Purpose

This plan implements a deep architectural refactor of the CSS directory. It transitions from a flat numbered structure to a hierarchical one where each module folder (1.0 - 7.0) contains separate `frontend/` and `dashboard/` subdirectories. This ensures that public-facing styles and administrative styles are co-located by module but logically separated by context. Additionally, it decomposes the monolithic `admin_portal.css` into module-specific files, including dedicated styles for Wikipedia, Challenges, News, and Blog components.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Create Hierarchical Directory Structure

- **File(s):** `css/1.0_foundation/frontend/`, `css/2.0_records/frontend/`, `css/2.0_records/dashboard/`, etc.
- **Action:** Create `frontend/` and `dashboard/` subdirectories within every relevant module folder (1.0 - 7.0) in `css/`.
- **Vibe Rule(s):** Section comments

- [x] Task complete

---

### T2 — Relocate Existing Frontend CSS

- **File(s):** `css/1.0_foundation/*.css`, `css/2.0_records/*.css`, etc.
- **Action:** Move all current CSS files into their respective `frontend/` subdirectories (e.g., `css/1.0_foundation/grid.css` -> `css/1.0_foundation/frontend/grid.css`).
- **Vibe Rule(s):** Section comments

- [x] Task complete

---

### T3 — Extract Admin Shell & Core Components

- **File(s):** `css/7.0_system/dashboard/admin_shell.css`, `css/7.0_system/dashboard/admin_components.css`
- **Action:** Extract global admin layout, header, sidebar, and the Providence 3-column grid/tab-bar components from `admin_portal.css` into Module 7.0's dashboard folder.
- **Vibe Rule(s):** Grid/Flexbox hierarchy · CSS variables · Section comments

- [x] Task complete

---

### T4 — Distribute Module-Specific Admin Styles

- **File(s):** `css/2.0_records/dashboard/edit_records.css`, `css/4.0_ranked_lists/dashboard/edit_wikipedia.css`, `css/4.0_ranked_lists/dashboard/edit_challenges.css`, `css/6.0_news_blog/dashboard/edit_news.css`, `css/6.0_news_blog/dashboard/edit_blog.css`, etc.
- **Action:** Split the remaining `admin_portal.css` by module and move the pieces into the `dashboard/` subfolders of the relevant modules.
- **Vibe Rule(s):** Grid/Flexbox hierarchy · CSS variables · Section comments

- [x] Task complete

---

### T5 — Update All HTML Path References

- **File(s):** `admin/frontend/admin.html`, `index.html`, `record.html`, `records.html`, `news.html`, `blog.html`, etc.
- **Action:** Perform a project-wide update of `<link rel="stylesheet">` tags in all HTML files to point to the new hierarchical paths.
- **Vibe Rule(s):** Semantic tags · No inline styles

- [x] Task complete

---

### T6 — Sitemap Synchronization & Cleanup

- **File(s):** `documentation/detailed_module_sitemap.md`, `documentation/site_map.md`
- **Action:** Update the sitemaps to reflect the new hierarchy and run `/sync_sitemap` to regenerate the master tree. Delete the empty `admin_portal.css`.
- **Vibe Rule(s):** Section comments

- [x] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `css/1.0_foundation/frontend/grid.css` | 1.0 — Foundation | No | Update entry |
| `css/2.0_records/dashboard/edit_records.css` | 2.0 — Records | No | Add entry |
| `css/4.0_ranked_lists/dashboard/edit_wikipedia.css` | 4.0 — Ranked Lists | No | Add entry |
| `css/6.0_news_blog/dashboard/edit_news.css` | 6.0 — News & Blog | No | Add entry |
| `admin/frontend/admin.html` | 7.0 — System | Yes | Update CSS links |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented

---

## Module Impact Audit

### Intra-Module Check — Module 7.0: System
| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `admin/frontend/dashboard_app.js` | No | No impact identified (classes unchanged) |

### Cross-Module Check
| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 2.0 — Records | Yes | Frontend CSS path change |
| 3.0 — Visualizations | Yes | Frontend CSS path change |
| 4.0 — Ranked Lists | Yes | Frontend CSS path change |
| 5.0 — Essays & Responses | Yes | Frontend CSS path change |
| 6.0 — News & Blog | Yes | Frontend CSS path change |

---

## Documentation Update

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Reflect new hierarchical CSS structure. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update CSS path references. |
| `documentation/guides/guide_style.md` | Yes | Update directory structure guide. |
