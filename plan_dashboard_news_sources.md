---
name: plan_dashboard_news_sources
version: 1.0.0
module: 6.0 — News & Blog
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_news_sources

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "News Sources" dashboard module, which manages the archival data sources and search criteria used by the automated news ingestion system. It features a dual-pane layout with a main table of news sources and a sidebar for managing search keywords and source URLs. This module enables administrators to control the automated discovery process, launch the news-crawler on demand, and curate the feed of relevant external updates, ensuring the news section remains accurate and current.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_news_sources.html` | News source management container |
| **CSS** | `css/6.0_news_blog/dashboard/news_sources_dashboard.css` | Pipeline control aesthetics |
| **JS** | `js/6.0_news_blog/dashboard/dashboard_news_sources.js` | Module orchestration & initialization |
| **JS** | `js/6.0_news_blog/dashboard/news_sources_handler.js` | Data fetching & row hydration |
| **JS** | `js/6.0_news_blog/dashboard/launch_news_crawler.js` | News crawler pipeline trigger |
| **JS** | `js/6.0_news_blog/dashboard/search_keywords_handler.js` | Search keyword management |
| **JS** | `js/6.0_news_blog/dashboard/snippet_generator.js` | Automated snippet generator trigger |
| **JS** | `js/6.0_news_blog/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |
| **Python** | `backend/pipelines/pipeline_news.py` | News crawler pipeline script |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create News Sources HTML

- **File(s):** `admin/frontend/dashboard_news_sources.html`
- **Action:** Create the structural layout for the news sources editor, including the keyword sidebar anchor, the source table container, and the Crawler/Update function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement News Sources CSS

- **File(s):** `css/6.0_news_blog/dashboard/news_sources_dashboard.css`
- **Action:** Implement the 'providence' theme styling for the news source table and the search keyword management sidebar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement News Sources Orchestrator

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_news_sources.js`
- **Action:** Initialize the news sources module and coordinate the source list management, keyword updates, and pipeline triggers.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement News Sources Handling

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_handler.js`
- **Action:** Implement the logic to fetch, render, and update the list of external news source references and their statuses.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Search Keywords Logic

- **File(s):** `js/6.0_news_blog/dashboard/search_keywords_handler.js`
- **Action:** Implement the UI logic for adding, editing, and publishing the search keywords used by the news discovery crawler. All keyword state for the active record is read from and written to the `news_search_term` field (TEXT / JSON Blob). Changes must be saved back to the database via the admin API before the crawler is triggered.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement News Crawler Launch Logic

- **File(s):** `js/6.0_news_blog/dashboard/launch_news_crawler.js`
- **Action:** Implement the logic to trigger the backend news-crawler pipeline and display the process status in the universal footer.
- **Dependencies:** `admin/backend/admin_api.py` (news routes planned), `backend/pipelines/pipeline_news.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement News Crawler Pipeline

- **File(s):** `backend/pipelines/pipeline_news.py`
- **Action:** Implement the Python news crawler pipeline. The script must:
  1. Read search keywords from the `system_config` table (`news_keywords` key — JSON blob of keyword strings)
  2. Read news source URLs from the `news_sources` table
  3. Crawl each source URL (RSS feeds / News APIs etc) using `backend/scripts/helper_api.py`
  4. Extract news items matching the search keywords
  5. Save results into the `news_items` field of the anchor record (`slug = 'global-news-feed'`) as a JSON blob with shape: `[{"title": str, "timestamp": ISO-8601 str, "url": str}]`
- **Dependencies:** `admin/backend/admin_api.py` (system_config GET), `backend/scripts/helper_api.py`
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence · API quirks documented inline

- [ ] Task complete

---

### T8 — Implement Snippet Generation Logic

- **File(s):** `js/6.0_news_blog/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger for generating automated snippets for news items.
- **Dependencies:** `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T9 — Implement Metadata Footer
- **File(s):** `js/6.0_news_blog/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T11 — Vibe-Coding Audit

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
- [ ] snippet_generator.js: Verify identical behaviour with counterparts in records_single, essay_historiography, blog_posts, challenge_response
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response, challenge, wikipedia
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T12 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new News Sources dashboard files under Module 6.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new news source management files. |
| `documentation/data_schema.md` | Yes | `news_search_term` (TEXT / JSON Blob) added; confirm field is documented. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the News Sources and Keyword editor. |
| `documentation/guides/guide_function.md` | Yes | Document news discovery flow and crawler orchestration logic. |
| `documentation/guides/guide_security.md` | Yes | Note validation for source URLs and crawler trigger restrictions. |
| `documentation/guides/guide_style.md` | Yes | Document the news source table and keyword sidebar CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map documentation is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline documentation is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation documentation is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO documentation is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present

---

## Dependency Table

> Tasks must not start until every file in their "Depends On" column exists.

### Internal Dependencies

| Task | Depends On (must exist first) |
|------|-------------------------------|
| T1 | — (self-contained HTML) |
| T2 | — (self-contained CSS) |
| T3 | — (self-contained JS orchestrator) |
| T4 | admin/backend/admin_api.py (news routes) |
| T5 | admin/backend/admin_api.py (system_config routes) |
| T6 | admin/backend/admin_api.py (news routes), backend/pipelines/pipeline_news.py |
| T7 | admin/backend/admin_api.py (system_config GET), backend/scripts/helper_api.py |
| T8 | backend/scripts/snippet_generator.py |
| T9 | backend/scripts/snippet_generator.py, backend/scripts/metadata_generator.py |
| T11 (Vibe Audit) | All files in File Inventory |
| T12 (Purpose Check) | All tasks complete |

### Cross-Plan Dependencies

| This plan requires | Supplied by |
|--------------------|-------------|
| admin/backend/admin_api.py (news, system_config routes) | plan_backend_infrastructure |
| backend/scripts/snippet_generator.py | plan_backend_infrastructure |
| backend/scripts/metadata_generator.py | plan_backend_infrastructure |
| backend/scripts/helper_api.py | Existing shared utility |

### Implementation Order

1. plan_backend_infrastructure — must complete first (provides API routes + scripts)
2. plan_dashboard_news_sources — this plan (depends on #1)
