---
name: fix_metadata_widget_persistence
version: 1.0.0
module: 2.0 — Records
status: draft
created: 2026-05-09
---

# Plan: fix_metadata_widget_persistence

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Resolve the persistent Metadata Widget alignment bug by addressing three structural issues. First, remove legacy "double scripting" conflicts by purging `metadata_handler.js` from `dashboard.html` and decoupling it from all consuming modules. Second, implement cache-busting on `metadata_widget.css` and `metadata_widget.js` to bypass aggressive browser caching. Third, correct the DOM injection sequence in `metadata_widget.js` so the tag container correctly follows, rather than splits, the keyword input row for true visual symmetry across the admin portal.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Implement Cache-Busting and Remove Legacy Script

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Add `?v=1.1.2` cache-busters to the `<link>` for `metadata_widget.css` and the `<script>` for `metadata_widget.js`, and completely remove the `<script>` tag for the legacy `metadata_handler.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline scripts

- [ ] Task complete

---

### T2 — Remove Legacy Metadata Handler Calls

- **File(s):** `js/2.0_records/dashboard/dashboard_records_single.js`, `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`, `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js`, `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js`, `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`, `js/6.0_news_blog/dashboard/display_blog_posts_data.js`, `js/6.0_news_blog/dashboard/blog_post_status_handler.js`, `js/6.0_news_blog/dashboard/dashboard_news_sources.js`
- **Action:** Remove all instances and conditional checks for `window.renderMetadataFooter()` across all dashboard modules, as its functionality is fully superseded by the unified `metadata_widget.js`.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+

- [ ] Task complete

---

### T3 — Correct DOM Injection Sequence

- **File(s):** `js/2.0_records/dashboard/metadata_widget.js`
- **Action:** Reorder the `appendChild` calls for the `keywordsField` so `keywordsInline` (the input row) is appended immediately after `keywordsLabel`, followed by the `tagsContainer` at the bottom, perfectly matching the visual symmetry of the Snippet and Slug rows.
- **Vibe Rule(s):** Vanilla ES6+ only

- [ ] Task complete

---

### T4 — Delete Deprecated Legacy Handler

- **File(s):** `js/2.0_records/dashboard/metadata_handler.js`
- **Action:** Delete the legacy file from the repository to finalize the architectural transition to the unified widget.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

## Final Tasks

### T5 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file (or tightly-related group for a single widget/component)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T6 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Legacy `metadata_handler.js` has been completely purged from the codebase.
- [ ] **Achievement**: Cache-busting query strings have been added to the metadata widget assets in the dashboard shell.
- [ ] **Achievement**: The keywords tag container has been correctly positioned below the input row in the DOM injection sequence.
- [ ] **Necessity**: The persistent UI layout bug and the cross-scripting architectural conflict have been resolved.
- [ ] **Targeted Impact**: The shared metadata widget updates apply uniformly across all dashboard modules.
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified.

---

### T7 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`, `guide_appearance.md`): Add or update ASCII box-drawing diagrams to reflect new component placement, sidebar layout changes, or work-area structure.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for any new data flow, JS lifecycle, or Python script introduced by this plan.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example in its own subsection, with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Remove `metadata_handler.js` from the file tree; bump version. |
| `documentation/simple_module_sitemap.md` | No | |
| `documentation/site_map.md` | Yes | Run `/sync_sitemap` or manually remove `metadata_handler.js`; bump version. |
| `documentation/data_schema.md` | No | |
| `documentation/vibe_coding_rules.md` | Yes | Remove `metadata_handler.js` from the Shared-Tool Ownership table (§7); bump version. |
| `documentation/style_mockup.html` | No | |
| `documentation/git_vps.md` | No | |
| `documentation/guides/guide_appearance.md` | No | |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update Shared Tool Ownership Reference table to remove `metadata_handler.js`; bump version. |
| `documentation/guides/guide_function.md` | No | |
| `documentation/guides/guide_security.md` | No | |
| `documentation/guides/guide_style.md` | No | |
| `documentation/guides/guide_maps.md` | No | |
| `documentation/guides/guide_timeline.md` | No | |
| `documentation/guides/guide_donations.md` | No | |
| `documentation/guides/guide_welcoming_robots.md` | No | |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
