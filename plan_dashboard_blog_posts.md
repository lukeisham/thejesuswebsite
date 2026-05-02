---
name: plan_dashboard_blog_posts
version: 1.0.0
module: 6.0 — News & Blog
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_blog_posts

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Blog Posts" dashboard module, a dedicated WYSIWYG editor for authoring and managing the site's historical and theological blog updates. It features a dual-pane layout with a scrollable sidebar of published and draft posts and a markdown-based editor with live preview and integrated metadata management (MLA sources, context links, and pictures). This module ensures that blog content is produced with consistent archival quality and follows the 'providence' design system, providing a robust platform for long-form updates.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_blog_posts.html` | Split-pane blog editor container |
| **CSS** | `css/6.0_news_blog/dashboard/blog_posts_dashboard.css` | Navigator sidebar & editor layout |
| **JS** | `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` | Module orchestration & initialization |
| **JS** | `js/6.0_news_blog/dashboard/display_blog_posts_data.js` | Blog post fetching & field population |
| **JS** | `js/6.0_news_blog/dashboard/markdown_editor.js` | Markdown parsing & live preview logic |
| **JS** | `js/6.0_news_blog/dashboard/blog_post_status_handler.js` | Publish/Draft state logic |
| **JS** | `js/6.0_news_blog/dashboard/picture_handler.js` | Image upload & integration handler |
| **JS** | `js/6.0_news_blog/dashboard/mla_source_handler.js` | Citation management handler |
| **JS** | `js/6.0_news_blog/dashboard/context_link_handler.js` | Database relationship link handler |
| **JS** | `js/6.0_news_blog/dashboard/snippet_generator.js` | Automated snippet generator trigger |
| **JS** | `js/6.0_news_blog/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Blog Posts HTML

- **File(s):** `admin/frontend/dashboard_blog_posts.html`
- **Action:** Create the structural split-pane container for the blog editor, featuring the post navigator sidebar and the markdown editing canvas.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Blog Posts CSS

- **File(s):** `css/6.0_news_blog/dashboard/blog_posts_dashboard.css`
- **Action:** Implement the 'providence' theme layout for the dual-pane editor, with specific focus on the post sidebar and sticky function bar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Blog Posts Orchestrator

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`
- **Action:** Initialize the blog posts module and coordinate the sidebar loading, editor population, and preview synchronization.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Blog Data Display

- **File(s):** `js/6.0_news_blog/dashboard/display_blog_posts_data.js`
- **Action:** Implement the logic to fetch specific blog post content and metadata from the API and populate the editor fields.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Markdown Editor Logic

- **File(s):** `js/6.0_news_blog/dashboard/markdown_editor.js`
- **Action:** Implement the core markdown editing logic, including toolbar actions and the live HTML preview generation for blog updates.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Blog Post Status Handling

- **File(s):** `js/6.0_news_blog/dashboard/blog_post_status_handler.js`
- **Action:** Implement the logical flow for publishing, drafting, and deleting blog posts, interfacing with the backend blog API.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Picture Upload Handling

- **File(s):** `js/6.0_news_blog/dashboard/picture_handler.js`
- **Action:** Implement the client-side logic for image file selection, preview rendering, and submission for blog imagery.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Implement MLA Source Handling

- **File(s):** `js/6.0_news_blog/dashboard/mla_source_handler.js`
- **Action:** Implement the dynamic UI logic for adding, removing, and displaying MLA formatted sources within the blog editor.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement Context Link Handling

- **File(s):** `js/6.0_news_blog/dashboard/context_link_handler.js`
- **Action:** Implement the dynamic UI logic for associating and displaying context links for the blog post.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T10 — Implement Snippet Generation Logic

- **File(s):** `js/6.0_news_blog/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger for generating automated snippets for blog posts.
- **Dependencies:** `admin/backend/admin_api.py` (blog routes planned), `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T11 — Implement Metadata Footer
- **File(s):** `js/6.0_news_blog/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

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

#### JavaScript
- [ ] One function per file
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

#### Shared-Tool Consistency
- [ ] picture_handler.js: Verify identical behaviour with counterparts in records_single, essay_historiography, challenge_response
- [ ] mla_source_handler.js: Verify identical behaviour with counterparts in records_single, essay_historiography, challenge_response
- [ ] context_link_handler.js: Verify identical behaviour with counterparts in records_single, essay_historiography
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in records_single, essay_historiography, challenge_response, news_sources
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in essay_historiography, challenge_response, challenge, wikipedia, news_sources
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T13 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new Blog Post dashboard files under Module 6.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new blog post editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Blog Post editor and sidebar. |
| `documentation/guides/guide_function.md` | Yes | Document markdown editing flow and blog post status management. |
| `documentation/guides/guide_security.md` | Yes | Note validation for blog content and publishing permissions. |
| `documentation/guides/guide_style.md` | Yes | Document the blog editor and utilitarian toolbar CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
