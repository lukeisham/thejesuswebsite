---
name: standardize_metadata_block
version: 1.0.0
module: Multiple — Shared Tool Integration
status: draft
created: 2026-05-09
---

# Plan: standardize_metadata_block

## Target Appearance: Meta Data & SEO Block

```text
+-------------------------------------------------------------+
| META DATA & SEO                                             |
+-------------------------------------------------------------+
| URL Slug                                                    |
| [===============================================] [GENERATE]|
|                                                             |
| Snippet                                                     |
| [=========================================================] |
| [=========================================================] |
|                                                   [GENERATE]|
|                                                             |
| Keywords                                                    |
| [tag1] [tag2] [tag3] +[Add]                       [GENERATE]|
+-------------------------------------------------------------+
|                                              [GENERATE ALL] |
+-------------------------------------------------------------+
```

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan standardizes the appearance and functionality of the metadata block (URL Slug, Snippet, Keywords) across the Wikipedia, Challenge Response, Essay & Historiography, News Sources, and Blog Posts dashboard modules. By removing custom ad-hoc layouts and replacing them with the shared `metadata_widget` UI and CSS (from the Records module), this plan ensures consistent design aesthetics, unified API payload handling, and eliminates code drift across the admin dashboard, explicitly excluding the Single Record module which is already up to date.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Update Wikipedia Metadata HTML

- **File(s):** `admin/frontend/dashboard_wikipedia.html`
- **Action:** Replace the existing metadata input layout with the standardized HTML structure required by `metadata_widget.css`.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles

- [ ] Task complete

---

### T2 — Update Wikipedia Metadata JS

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** Refactor the logic to instantiate and utilize the shared `metadata_widget.js` instead of custom DOM manipulation for slug, snippet, and keyword generation.
- **Vibe Rule(s):** Component injection · Event delegation

- [ ] Task complete

---

### T3 — Update Challenge Response HTML

- **File(s):** `admin/frontend/dashboard_challenge.html`
- **Action:** Update the hidden response modal or sidebar layout to include the standardized metadata widget container.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles

- [ ] Task complete

---

### T4 — Update Challenge Response JS

- **File(s):** `js/4.0_ranked_lists/dashboard/insert_challenge_response.js`
- **Action:** Refactor the response insertion modal logic to mount and use the shared `metadata_widget.js` for metadata generation.
- **Vibe Rule(s):** Component injection · Event delegation

- [ ] Task complete

---

### T5 — Update Essay HTML

- **File(s):** `admin/frontend/dashboard_essay_historiography.html`
- **Action:** Replace the essay metadata section with the standardized metadata widget container structure.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles

- [ ] Task complete

---

### T6 — Update Essay JS

- **File(s):** `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js`
- **Action:** Integrate the shared `metadata_widget.js` to manage the slug, snippet, and keywords for essays.
- **Vibe Rule(s):** Component injection · Event delegation

- [ ] Task complete

---

### T7 — Update News Sources HTML

- **File(s):** `admin/frontend/dashboard_news_sources.html`
- **Action:** Refactor the keyword/metadata sidebar to use the standardized `metadata_widget` HTML layout.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles

- [ ] Task complete

---

### T8 — Update News Sources JS

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Replace custom keyword and metadata generation logic with the shared `metadata_widget.js` utility.
- **Vibe Rule(s):** Component injection · Event delegation

- [ ] Task complete

---

### T9 — Update Blog Posts HTML

- **File(s):** `admin/frontend/dashboard_blog_posts.html`
- **Action:** Replace the current blog metadata sidebar inputs with the standardized `metadata_widget` container structure.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles

- [ ] Task complete

---

### T10 — Update Blog Posts JS

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`
- **Action:** Initialize and bind the `metadata_widget.js` tool to handle metadata generation for blog posts.
- **Vibe Rule(s):** Component injection · Event delegation

- [ ] Task complete

---

## Final Tasks

### T11 — Vibe-Coding Audit

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

### T12 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Standardized metadata block (slug, snippet, keywords) integrated into Wikipedia dashboard.
- [ ] **Achievement**: Standardized metadata block integrated into Challenge Response insertion UI.
- [ ] **Achievement**: Standardized metadata block integrated into Essay & Historiography dashboard.
- [ ] **Achievement**: Standardized metadata block integrated into News Sources dashboard.
- [ ] **Achievement**: Standardized metadata block integrated into Blog Posts dashboard.
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved, removing UI drift and custom ad-hoc layouts.
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended, avoiding changes to the Single Record module.
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified.

---

### T13 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table to reflect that `metadata_widget.js` is now consumed by Wikipedia, Challenge Responses, Essays, News, and Blog modules.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`): Update any layout diagrams for the affected modules to show the standardized metadata widget instead of ad-hoc inputs.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Update Shared-Tool Ownership Registry to show new consumers for metadata_widget.js |
| `documentation/simple_module_sitemap.md` | No | |
| `documentation/site_map.md` | No | |
| `documentation/data_schema.md` | No | |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 shared-tool ownership table to add new consumer modules |
| `documentation/style_mockup.html` | No | |
| `documentation/git_vps.md` | No | |
| `documentation/guides/guide_appearance.md` | No | |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII layout diagrams for affected modules to reflect the shared metadata widget structure |
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
