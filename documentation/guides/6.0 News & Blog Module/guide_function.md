---
name: guide_function.md
purpose: Visual ASCII representations of News & Blog Module data flows — news ingestion, admin editor flows, public frontend rendering
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

---

## 6.0 News & Blog Module

### 6.1 News Ingestion Pipeline

> **Schema Update (fix_frontend_schema_compliance):** The pipeline now writes individual `type='news_article'` rows with `news_item_title`, `news_item_link`, and `last_crawled` columns instead of the legacy `news_items` JSON blob. The diagram below reflects the original data flow; see §6.4 for the new frontend data flow.

```text
             [ Scheduled Job / Manual Trigger ]
                             |
                             v
 +-------------------------------------------------------------+
 |             backend/pipelines/pipeline_news.py              |
 |                                                             |
 |  -> _crawl_source() dispatches by response type:            |
 |     • dict (JSON)  -> _parse_json_feed()                    |
 |       Handles common API shapes: {articles:[...]},          |
 |       {items:[...]}, [{title:, url:, date:}]                |
 |     • str/bytes (XML) -> _parse_rss_feed()                  |
 |       Handles RSS 2.0 <item> and Atom <entry> elements      |
 |       with namespace-aware tag extraction                   |
 |  -> Extract and filter for relevant historical events       |
 |  -> Rank entries by recency and contextual relevance        |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |             SQLite Database (INSERT / UPDATE)               |
 |                                                             |
 |  -> news_items   (JSON Blob payload)                        |
 |  -> news_sources (Attribution metadata)                     |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |                   WASM Query (Frontend)                     |
 +-------------------------------------------------------------+
                             |
                             v
 +-------------------------------------------------------------+
 |  news_snippet_display.js → Combined Landing Page (§1.3)    |
 |  list_newsitem.js        → Full News Feed (§5.3)            |
 +-------------------------------------------------------------+
```

### 6.2 News Articles & Sources — Admin Editor Flow

> **Sidebar Activation Lifecycle:** When the module initialises, `initNewsSourcesSidebar()` calls `_setSidebarDisabled(true)`, which sets the `disabled` attribute on all sidebar inputs and buttons and applies `opacity: 0.45` to the three sidebar sections (`#news-sources-url-section`, `#news-sources-search-terms`, `#metadata-widget-container`). When a record row is selected from the right-hand table, `populateNewsSourcesSidebar()` calls `_setSidebarDisabled(false)`, removing all `disabled` attributes and restoring full opacity. The `_setSidebarDisabled` helper is defined in `news_sources_sidebar_handler.js`.

 +---------------------------------------------------------------+
 |                     Admin Dashboard                           |
 |                                                               |
 |  User manages search keywords & news sources, then clicks     |
 |  [Launch News-Crawler]                                        |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |   `launch_news_crawler.js` — Triggers the backend pipeline    |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |          `backend/pipelines/pipeline_news.py`                 |
 |                                                               |
 |  1. Reads search keywords                                     |
 |  2. Reads news source URLs                                    |
 |  3. Crawls news source URLs                                   |
 |  4. Extracts news items                                       |
 |  5. Saves to SQLite                                           |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |                      SQLite Database                          |
 |                                                               |
 |  `news_items` table populated with crawled results            |
 +---------------------------------------+-----------------------+
                                         |
                                         v
 +---------------------------------------------------------------+
 |                    Frontend Display                           |
 |                                                               |
 |  `list_newsitem.js` → News Feed                               |
 |  `news_snippet_display.js` → Combined Landing Page            |
 +---------------------------------------------------------------+


### 6.3 Blog Posts — Admin Editor Flow

> **Schema Note:** The public API now uses `WHERE type = 'blog_post' AND status = 'published'` as the primary discriminator. `blogposts IS NOT NULL` is retained as a legacy fallback.

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> loadModule("blog-posts")                 |
 |   Calls window.renderBlogPosts()                      |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   dashboard_blog_posts.js (Orchestrator)               |
 |                                                       |
 |  1. Sets layout: _setLayoutColumns(false, '1fr')      |
 |  2. Fetches HTML template:                            |
 |     GET /admin/frontend/dashboard_blog_posts.html     |
 |  3. Injects into main column via _setColumn()         |
 |  4. Initialises sub-modules:                          |
 |     - displayBlogPostsList() — sidebar population     |
 |     - initMarkdownEditor() — markdown WYSIWYG         |
 |     - initBlogPostStatusHandler() — Save/Pub/Del      |
 |  5. Wires shared tools (picture, MLA, links, etc.)    |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   blog_posts_list_display.js /                     |
 |   blog_posts_load_content.js                       |
 |                                                       |
 |  Loads sidebar: GET /api/admin/blogposts              |
 |    -> SELECT id, title, slug, snippet, blogposts,      |
 |       created_at, updated_at, status                  |
 |       FROM records WHERE blogposts IS NOT NULL        |
 |       ORDER BY created_at DESC                        |
 |                                                       |
 |  Separates into Published / Drafts groups             |
 |  Clicking a post -> loadBlogPostContent(id, title)    |
 |    GET /api/admin/records/{id}                        |
 |    Populates: title, markdown (via setMarkdownContent),|
 |    snippet, slug, metadata, bibliography, links        |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   Split-Pane Blog Editor (unified wysiwyg-* namespace)    |
 |                                                       |
 |  Sidebar (260px)           | Main Editor Area         |
 |  ┌──────────────────┐     | ┌─────────────────────┐  |
 |  │ *Published*       │     | │ Title: [_________]  │  |
 |  │ - Post 1          │     | │ [B][I][U][Link]...  │  |
 |  │ - Post 2          │     | │ ┌─────────────────┐ │  |
 |  │ *Drafts*          │     | │ │ Markdown Input  │ │  |
 |  │ - Draft A         │     | │ │                 │ │  |
 |  │ - Draft B         │     | │ └─────────────────┘ │  |
 |  └──────────────────┘     | │ ┌─────────────────┐ │  |
 |                           | │ │ Live Preview    │ │  |
 |                           | │ └─────────────────┘ │  |
 |                           | │ Snippet: [_______]  │  |
 |                           | │ MLA Sources         │  |
 |                           | │ Context Links       │  |
 |                           | │ Picture Upload      │  |
 |                           | │ Metadata Footer     │  |
 |                           | └─────────────────────┘  |
 +-------------------------------------------------------+
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
 +------------------+ +------------------+ +------------------+
 | Save:            | | Publish:         | | Delete:          |
 | PUT /api/admin/  | | PUT /api/admin/  | | DELETE /api/admin|
 | records/{id}     | | records/{id}     | | /records/{id}    |
 | status: 'draft'  | | status:          | |                  |
 | blogposts: (...) | |   'published'    | | Removes record   |
 |                  | | Validates title  | | Confirms first   |
 | Checks dirty     | | & blogposts      | | Clears editor    |
 | state first      | | non-empty        | | Refreshes list   |
 +------------------+ +------------------+ +------------------+
             |           |           |
             +-------+------+--------+
                     |
                     v
 +-------------------------------------------------------+
 |               SQLite Database                         |
 |    blogposts column (TEXT) — full markdown content    |
 |    bibliography (JSON Blob) — MLA citation entries    |
 |    context_links (JSON Blob) — {slug, type} chips     |
 |    snippet (TEXT) — auto-generated summary            |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |   Frontend re-render:                                 |
 |   - Sidebar list refreshes to reflect status changes  |
 |   - Editor clears (delete) or stays (save/publish)    |
 |   - Status bar shows success/error message            |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |  Public blog feed reads blogposts column:             |
 |    SELECT ... FROM records                            |
 |    WHERE blogposts IS NOT NULL                        |
 |      AND status = 'published'                         |
 |    ORDER BY created_at DESC                           |
 |                                                       |
 |  Frontend renders markdown → HTML for visitors        |
 +-------------------------------------------------------+
```
### 6.4 News Frontend Data Flow (Public)

> **Plan:** `refactor_news_blog_landing_feeds.md`
>
> The public news feed and snippet displays now fetch real data from the
> `/api/public/news` endpoint using type and status discriminators. All
> rendering uses schema-prefixed column names (`news_item_title`,
> `news_item_link`, `last_crawled`) instead of legacy blob columns
> (`news_items`, `news_sources`). Both the news and blog APIs now return
> `picture_thumbnail` as a base64-encoded data URI for direct `<img>` rendering.

```text
  [ User lands on /news/feed or /news_and_blog ]
              |
              v
  +--------------------------------------------------------------------------+
  | Landing Page (news_and_blog.html)                                        |
  |   Left column:  news_snippet_display.js  → 5 items with thumbnails       |
  |   Right column: blog_snippet_display.js  → 5 items with thumbnails      |
  +--------------------------------------------------------------------------+
  | Full Feed (news.html / blog.html)                                        |
  |   list_newsitem.js / list_blogpost.js  → paginated with thumbnails       |
  +--------------------------------------------------------------------------+
              |
              v
  +--------------------------------------------------------------------------+
  | serve_all.py — public_news_items() / public_blogposts()                  |
  |   SELECT ... picture_name, picture_thumbnail ...                         |
  |   FROM records                                                           |
  |   WHERE type = 'news_article'/'blog_post' AND status = 'published'       |
  |   ORDER BY created_at DESC                                               |
  +--------------------------------------------------------------------------+
              |
              v
  +--------------------------------------------------------------------------+
  |  BACKEND: BLOB → base64 conversion                                       |
  |  picture_thumbnail (BLOB) → base64.b64encode() → "data:image/png;base64" |
  +--------------------------------------------------------------------------+
              |
              v
  +--------------------------------------------------------------------------+
  |  RENDER CARDS WITH THUMBNAILS                                            |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | Landing Snippet (news-blog-landing__snippet):                     |    |
  |  |   [80×80 img] + [date, headline, text]                           |    |
  |  |                                                                  |    |
  |  | Full Feed Item (feed-item):                                      |    |
  |  |   [120×90 img] + [title/h2, date, snippet body, external link]   |    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +--------------------------------------------------------------------------+
              |
              v
  +--------------------------------------------------------------------------+
  |  NAVIGATION                                                              |
  |  News items link externally:  <a href="news_item_link" target="_blank"> |
  |  Blog items link internally:  <a href="/blog/{slug}">                    |
  |                                                                          |
  |  PAGINATION (full feeds only)                                            |
  |  "Load More" button → offset += limit, re-fetch, append rows             |
  |  Hides button when has_more = false                                      |
  +--------------------------------------------------------------------------+
```

---

