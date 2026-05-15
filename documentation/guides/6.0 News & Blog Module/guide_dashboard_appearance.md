---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 6.0 News & Blog Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, high_level_schema.md, guide_frontend_appearance.md, guide_function.md, news_blog_nomenclature.md]
---

## 6.0 News & Blog Module
**Scope:** News Articles & Sources, Blog Posts.

### 6.1 Backend for News Articles & Sources (`dashboard_news_sources.js`)
**Corresponds to Public Sections:** 6.1 (Combined News & Blog Landing Page), 6.2 (News Feed Page)
**Purpose:** Dual-pane interface for searching external news sources with search terms and the automated news crawler. Left sidebar shows contextual record details (search keywords, source URLs, snippet/slug/metadata with auto-gen). Right pane displays the news sources list with status indicators.

**Plan:** `plan_dashboard_news_sources.md`

**DB Fields:**
```
── news_sources_handler.js ──────────────────────────────────────────────
news_sources      TEXT (JSON Blob)     — named external source references
news_item_title   TEXT                 — article/headline title
news_item_link    TEXT                 — external article URL
last_crawled      TEXT (ISO8601)       — timestamp of last crawl for this item

── search_keywords_handler.js ───────────────────────────────────────────
news_search_term  TEXT (JSON Array)    — per-record search keywords for crawler

> **Deprecated:** `news_items` (TEXT / JSON Blob) is superseded by `news_item_title` + `news_item_link`.
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]           |
+---------------------------------------------------------------------------------+
| Record Detail Sidebar         | News Sources List (Main Area)                   |
| (contextual — selected source)|                                                 |
|-------------------------------+-------------------------------------------------|
| SOURCE: Example News          | Source Name          | URL            | Status  |
| URL: example.com/news         | ---------------------+----------------+-------- |
|                               | Example News         | example.com/.. | Active  |
| Search Keywords:              | Christian Post       | cpost.com/rss  | Active  |
| +----------------------------+| Daily Bugle          | bugle.com      | Inactive|
| | keyword 1             [x]  || ...                                            |
| | keyword 2             [x]  || (Endless Scroll)                               |
| +----------------------------+|                                                 |
| [ Add Keyword _________ ] [Add]                                                |
|                               |                                                 |
| ----------------------------- |                                                 |
| Snippet:                       |                                                 |
| [ Latest headlines from...   ]|                                                 |
| Slug: [ example-news       ]  |                                                 |
| Meta: [ {"region":"us"}     ] |                                                 |
| [Auto-gen Snippet] [Auto-gen Slug] [Auto-gen Meta]                             |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]               |
+---------------------------------------------------------------------------------+
```

> **Sidebar Activation:** When no record row is selected from the right-hand table, all sidebar inputs and buttons are visually disabled (dimmed at opacity 0.45) and the `disabled` attribute is set on each interactive control. Selecting a record row calls `populateNewsSourcesSidebar()`, which removes the `disabled` attributes and restores full opacity, making the sidebar fully interactive for that record.
>
> **Draft/Publish Cycle:** Any keyword or URL modification auto-saves as draft. "Save Draft" collects sidebar state (source URL, keywords, metadata) and PUTs with `status: 'draft'`. "Gather" triggers the news crawler pipeline — crawled items are deduplicated (by URL) and appended to the existing list. Returns "N new items" or "No new results" if everything is already in the database. Only "Publish" commits the current source configuration to live.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_news_sources.html` | News source management container |
| `css/6.0_news_blog/dashboard/news_sources_dashboard.css` | Pipeline control aesthetics |
| `js/6.0_news_blog/dashboard/dashboard_news_sources.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/news_sources_handler.js` | Data fetching & row hydration |
| `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js` | Sidebar: keywords, URLs, crawler |
| `js/6.0_news_blog/dashboard/search_keywords_handler.js` | Search keyword management |
| `js/6.0_news_blog/dashboard/launch_news_crawler.js` | Crawler pipeline trigger |
| `backend/pipelines/pipeline_news.py` | News crawler pipeline |

**Shared tools consumed via `<script>` tag:**
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

### 6.2 Backend for Blog Posts (`dashboard_blog_posts.js`)
**Corresponds to Public Section:** 6.3 (Blog Feed Page)
**Purpose:** Split-pane WYSIWYG editor for authoring and managing blog posts. Features a sidebar with Published/Drafts list, and a markdown editor with live preview and integrated metadata management.

**Plan:** `plan_dashboard_blog_posts.md`

**DB Fields:**
```
── dashboard_blog_posts.js ────────────────────────────────────────────
body              TEXT (WYSIWYG Markdown) — full blog post content
blogposts         TEXT (JSON Blob)     — blog post content and metadata
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Draft ]   [ Publish ]   [ Delete ]             |
+---------------------------------------------------------------------------------+
| Blog Posts Sidebar        | Blog Post WYSIWYG Editor                            |
|---------------------------+-----------------------------------------------------|
| *Published*               | Title: [___________________________________]        |
| - Blog Post 1             |                                                     |
| - Blog Post 2             | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Post A            | |  Markdown blog post content goes here...      |   |
| - Draft Post B            | |                                               |   |
|                           | +-----------------------------------------------+   |
| (Endless Scroll)          |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
|                           | MLA Sources: [_________] Context Links: [_____]     |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_blog_posts.html` | Split-pane blog editor container |
| `css/6.0_news_blog/dashboard/blog_posts_dashboard.css` | Navigator sidebar & editor layout |
| `css/6.0_news_blog/dashboard/blog_WYSIWYG_editor.css` | Markdown editor & preview styling |
| `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/display_blog_posts_data.js` | Blog post fetching & population |
| `js/6.0_news_blog/dashboard/blog_post_status_handler.js` | Save/Publish/Delete logic |

**Shared tools consumed via `<script>` tag:**
- `js/5.0_essays_responses/dashboard/markdown_editor.js` — 🔑 Shared tool: WYSIWYG editor (owned by §5.1)
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/context_link_handler.js` — Context links
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

