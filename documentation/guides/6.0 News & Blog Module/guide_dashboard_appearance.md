---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 6.0 News & Blog Module
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, high_level_schema.md, guide_frontend_appearance.md, guide_function.md, news_blog_nomenclature.md]
---

## 6.0 News & Blog Module
**Scope:** News Articles & Sources, Blog Posts.

### 6.1 Backend for News Articles & Sources (dashboard_news_sources.js)
**Corresponds to Public Sections:** 6.1 (Combined News & Blog Landing Page), 6.2 (News Feed Page)
**Purpose:** Dual-pane interface for configuring source URLs and search keywords, triggering the automated news crawler, and viewing crawled articles. Left sidebar is always editable (independent of article row selection). Right pane displays crawled news articles with status indicators.

**Plan:** decouple_news_sidebar_from_articles.md

```text
+---------------------------------------------------------------------------------+
| [Jesus Website Dashboard] | < Return to Frontpage | Dashboard | Logout >        |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]           |
+---------------------------------------------------------------------------------+
| Source Config Sidebar         | News Articles (Main Area)                       |
| (always editable)              |                                                 |
|-------------------------------+-------------------------------------------------|
| SOURCE CONFIG                  | Article Title       | Link       | Crawled|Status|
| --                              | --------------------+------------+--------+----|
| Source URL:                     | Headline 1         | example..  | Jan 15 | Pub |
| [https://example.com/rss__]    | Headline 2         | example..  | Jan 14 | Drf |
| [Save URL]                     | ...                                              |
|                                 | (scrollable list, populated after Gather)       |
| Search Terms:                   |                                                 |
| +----------------------------+ |                                                 |
| | keyword 1                  | |                                                 |
| | keyword 2                  | |                                                 |
| +----------------------------| |                                                 |
| [enter search terms here...  ]|                                                 |
|  (auto-saves on input,       | |                                                 |
|   blur, or Enter)            | |                                                 |
| ----------------------------- |                                                 |
| Metadata Widget:              |                                                  |
| [snippet textarea]            |                                                  |
| [keywords tags]               |                                                  |
| (slug + SEO generate hidden) |                                                  |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]               |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_news_sources.html` | News source management container |
| `css/6.0_news_blog/dashboard/news_sources_dashboard.css` | Pipeline control aesthetics |
| `js/6.0_news_blog/dashboard/dashboard_news_sources.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/news_sources_handler.js` | Data fetching & row hydration |
| `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js` | Sidebar: keywords, URLs |
| `js/6.0_news_blog/dashboard/launch_news_crawler.js` | Crawler pipeline trigger |
| `backend/pipelines/pipeline_news.py` | News crawler pipeline |

**Shared tools consumed via `<script>` tag:**
- `js/9.0_cross_cutting/dashboard/metadata_widget.js` — Metadata widget (slug/SEO disabled for this module)
- `js/7.0_system/dashboard/gather_trigger.js` — Shared Gather pipeline trigger

---

### 6.2 Backend for Blog Posts (dashboard_blog_posts.js)
**Corresponds to Public Section:** 6.3 (Blog Feed Page)
**Purpose:** Split-pane WYSIWYG editor for authoring and managing blog posts. Features a sidebar with Published/Drafts list, and a markdown editor with live preview and integrated metadata management.

**Plan:** plan_dashboard_blog_posts.md

```text
+---------------------------------------------------------------------------------+
| [Jesus Website Dashboard] | < Return to Frontpage | Dashboard | Logout >        |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Draft ]   [ Publish ]   [ Delete ]                |
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
| (scrollable list)         |                                                     |
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
| `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/blog_posts_list_display.js` | Sidebar list population |
| `js/6.0_news_blog/dashboard/blog_posts_load_content.js` | Editor content loading |
| `js/6.0_news_blog/dashboard/blog_post_status_handler.js` | Save/Publish/Delete logic |

**Shared tools consumed via `<script>` tag:**
- `js/5.0_essays_responses/dashboard/markdown_editor.js` -- WYSIWYG editor (owned by 5.0)
- `js/9.0_cross_cutting/dashboard/metadata_widget.js` -- Metadata widget
- `js/9.0_cross_cutting/dashboard/picture_handler.js` -- Image upload
- `js/9.0_cross_cutting/dashboard/mla_source_handler.js` -- MLA citations
- `js/9.0_cross_cutting/dashboard/context_link_handler.js` -- Context links
- `js/9.0_cross_cutting/dashboard/external_refs_handler.js` -- External references
---

