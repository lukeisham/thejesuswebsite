---
name: guide_function.md
purpose: Visual ASCII representations of News & Blog Module data flows — news ingestion pipeline, blog post lifecycle
version: 1.1.0
dependencies: [simple_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, news_blog_nomenclature.md]
---

## 6.0 News & Blog Module

### 6.1 News Life Cycle

```text
+------------------------------------------------------------------+
|  SIDEBAR INPUTS (always editable, independent of article table)   |
|                                                                    |
|  Source URL:  [https://example.com/rss             ]               |
|  Search Terms: [keyword1, keyword2                 ]               |
|  (auto-saves on input debounce 1s, blur, or Enter)                 |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  GATHER BUTTON (launch_news_crawler.js -> triggerCrawl())         |
|                                                                    |
|  1. Reads source_url from #news-source-url-input DOM               |
|  2. Reads search_terms from #news-search-terms-input DOM           |
|  3. Parses terms (split by newlines/commas)                        |
|  4. POST /api/admin/news/crawl { source_url, search_terms }        |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  admin/backend/routes/news.py — trigger_news_crawl()              |
|                                                                    |
|  Accepts optional body { source_url, search_terms }                |
|  Forwards parameters to run_pipeline(**kwargs)                     |
|  Returns 202 Accepted immediately (runs in background thread)      |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  backend/pipelines/pipeline_news.py — run_pipeline()              |
|                                                                    |
|  1. Collect keywords (from params or DB fallback):                 |
|     news_search_term column OR system_config.news_keywords         |
|  2. Collect source URLs (from params or DB fallback):              |
|     source_url column with legacy news_sources JSON blob fallback  |
|  3. For each source URL:                                           |
|     a. Fetch content (RSS 2.0 / Atom XML / JSON API)              |
|     b. Parse via _parse_rss_feed() or _parse_json_feed()           |
|     c. Match items case-insensitively against keywords in title    |
|     d. Normalize timestamps via _normalize_timestamp()              |
|  4. Deduplicate: skip URLs already in records.news_item_link       |
|  5. INSERT new articles as type='news_article' rows with:          |
|     news_item_title, news_item_link, last_crawled, snippet, slug   |
|  6. Respects MAX_ARTICLES_PER_CRAWL and PIPELINE_TIMEOUT_SECONDS   |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='news_article', sub_type=NULL: main article entries          |
|  type='news_article', sub_type='news_source': source URL config    |
|  type='news_article', sub_type='news_search_term': keyword rows    |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/news?type=news_article&status=published&limit=N       |
|  /api/admin/news/items (admin: all statuses, all sub-types)        |
|                                                                    |
|  Columns served: news_item_title, news_item_link, last_crawled,    |
|  snippet, picture_thumbnail (base64), slug, created_at, status     |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Landing page (news_and_blog.html):                                |
|    news_snippet_display.js — 5 items, news-blog-landing__snippet   |
|                                                                    |
|  Full feed (news.html):                                            |
|    list_newsitem.js — paginated via "Load More" button             |
|    Uses news-feed__load-more class                                 |
|    External links open in new tab (news_item_link)                 |
+------------------------------------------------------------------+
```

### 6.2 Blog Life Cycle

```text
+------------------------------------------------------------------+
|  ADMIN BLOG DASHBOARD                                             |
|                                                                    |
|  dashboard_app.js -> loadModule("blog-posts")                      |
|  -> window.renderBlogPosts()                                       |
|                                                                    |
|  1. Fetches /admin/frontend/dashboard_blog_posts.html              |
|  2. Injects into Providence main column via _setColumn()           |
|  3. Calls displayBlogPostsList() to populate sidebar               |
|  4. Calls initMarkdownEditor() for WYSIWYG                         |
|  5. Wires shared tools (metadata_widget, picture_handler,          |
|     mla_source_handler, context_link_handler, external_refs)       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SIDEBAR LIST (blog_posts_list_display.js)                        |
|                                                                    |
|  GET /api/admin/blogposts                                          |
|  Filters type='blog_post', groups by status:                       |
|    *Published*  — status='published'                               |
|    *Drafts*     — status='draft'                                   |
|  Click a post -> loadBlogPostContent(slug)                         |
|    GET /api/admin/records/{slug_or_id}                             |
|    Populates: title, body (markdown via setMarkdownContent()),     |
|    snippet, slug, metadata_json, bibliography, context_links       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  WYSIWYG EDITOR (shared wysiwyg-* namespace)                      |
|                                                                    |
|  Split-pane:                                                       |
|  +---------------------------+-----------------------------------+  |
|  | Sidebar (260px)           | Main Editor Area                 |  |
|  | *Published*               | Title: [______________]          |  |
|  | - Post 1                  | [B][I][U][Link][Image][Code]     |  |
|  | - Post 2                  | +-----------------------------+ |  |
|  | *Drafts*                  | | Markdown editor             | |  |
|  | - Draft A                 | | (markdown_editor.js)        | |  |
|  | - Draft B                 | +-----------------------------+ |  |
|  | (scrollable list)         | | Live preview                | |  |
|  +---------------------------+ +-----------------------------+ |  |
|                              | Snippet: [________] [Generate] |  |
|                              | MLA Sources                   |  |
|                              | Context Links                 |  |
|                              | Picture Upload                |  |
|                              | External Refs (iaa/pledius)   |  |
|                              | Metadata Widget               |  |
|                              +-------------------------------+  |
+----------------------------------+-------------------------------+
                                   |
                       +-----------+-----------+
                       |           |           |
                       v           v           v
+------------------+ +------------------+ +------------------+
| SAVE DRAFT       | | PUBLISH          | | DELETE            |
|                  | |                  | |                   |
| POST/PUT records | | PUT records/{id} | | DELETE records/   |
| with status:     | | status: published| | {id} + sub-types  |
| 'draft'          | | Validates: title | | Removes record +  |
| Writes: title,   | | and body non-    | | child rows        |
| body (markdown), | | empty            | | Clears editor     |
| snippet, slug,   | | Fails if empty   | | Refreshes list    |
| metadata_json,   | |                  | |                   |
| bibliography,    | |                  | |                   |
| context_links,   | |                  | |                   |
| iaa, pledius     | |                  | |                   |
+------------------+ +------------------+ +------------------+
                       |           |           |
                       +-------+---+-----------+
                               |
                               v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='blog_post': blog posts with body (markdown),                |
|  snippet, slug, metadata_json, iaa, pledius, manuscript,          |
|  url, page_views, bibliography (JSON), context_links (JSON)       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/blogposts?type=blog_post&status=published&limit=N     |
|  /api/public/blogposts/{slug} (single post, all 17 schema fields)  |
|                                                                    |
|  Columns served: title, body (markdown), snippet, slug,            |
|  created_at, updated_at, status, blogposts (JSON), iaa, pledius,   |
|  manuscript, url, page_views, picture_thumbnail (base64),          |
|  bibliography (JSON), context_links (JSON)                         |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Landing page (news_and_blog.html):                                |
|    blog_snippet_display.js — 5 items, news-blog-landing__snippet   |
|                                                                    |
|  Full feed (blog.html):                                            |
|    list_blogpost.js — paginated via "Load More" button             |
|    Uses blog-feed__load-more class                                 |
|    Links to /blog/{slug} for full post                             |
|                                                                    |
|  Single post (blog_post.html):                                     |
|    display_blogpost.js — renders:                                  |
|    - blog-header: title + date                                     |
|    - blog-body: markdown converted to HTML                         |
|    - Unique Identifiers section (iaa, pledius, manuscript)         |
|    - Article Details section (url, page_views)                     |
|    - Bibliography section (sources_biblio_display.js)              |
|    - Context Links section                                         |
|    - Picture container (pictures_display.js)                       |
+------------------------------------------------------------------+
```

---

## Technical Description

### News Function

The News module's data flow begins with the sidebar, which is always editable and independent of the articles table. Two inputs drive the pipeline: a source URL input (`#news-source-url-input`) for entering an RSS/feed URL, and a search terms textarea (`#news-search-terms-input`) for entering keywords (one per line or comma-separated). Both inputs auto-save on debounced input (1s), blur, or Enter, writing to sub-type records (`news_source` and `news_search_term`) linked by `parent_id`. When the Gather button is clicked, `triggerCrawl()` in `launch_news_crawler.js` reads the raw values directly from the DOM, parses search terms via `split(/[\n,]+/)`, and POSTs `{ source_url, search_terms }` to `/api/admin/news/crawl`. The backend endpoint accepts an optional `NewsCrawlRequest` body and forwards the parameters to `run_pipeline()` in `pipeline_news.py`, which runs in a background thread and returns immediately with `202 Accepted`. The pipeline collects or receives a list of keywords and source URLs, crawls each source (RSS 2.0, Atom XML, or JSON API), matches items against keywords case-insensitively in the title, deduplicates by `news_item_link`, and inserts genuinely new articles as individual `type='news_article'` rows with `news_item_title`, `news_item_link`, `last_crawled`, `snippet` (JSON array), and a URL-safe slug. The pipeline respects `MAX_ARTICLES_PER_CRAWL` and `PIPELINE_TIMEOUT_SECONDS` caps. After insertion, articles become available via the public API (`/api/public/news`) and are rendered on the landing page by `news_snippet_display.js` (5-item limit) or on the full feed page by `list_newsitem.js` (paginated with a "Load More" button). News items link externally to their original source URLs.

### Blog Function

The Blog module uses a split-pane WYSIWYG editor loaded by `dashboard_app.js` via `loadModule("blog-posts")`. The orchestrator `renderBlogPosts()` in `dashboard_blog_posts.js` fetches the HTML template, injects it into the Providence layout, then initialises the sidebar list (`blog_posts_list_display.js`), the markdown editor (`markdown_editor.js`, owned by 5.0 Essays), the status handler (`blog_post_status_handler.js`), and shared cross-cutting widgets (metadata widget, picture handler, MLA source handler, context link handler, external references handler). The sidebar fetches `GET /api/admin/blogposts`, filters `type='blog_post'`, and groups entries by status into Published and Drafts sections. Clicking a post calls `loadBlogPostContent(slug)` which fetches the full record and populates the editor with `body` (markdown), `snippet`, `slug`, `metadata_json`, `bibliography` (JSON), and `context_links` (JSON). The Save Draft action POSTs or PUTs the record with `status: 'draft'` and writes all editor fields including `body`, `title`, `snippet`, `slug`, `metadata_json`, `bibliography`, `context_links`, `iaa`, `pledius`, and `manuscript`. The Publish action validates that `title` and `body` are non-empty, then sets `status: 'published'`. The Delete action removes the record and all child rows. On the public side, `blog_snippet_display.js` fetches the 5 most recent published posts for the landing page, `list_blogpost.js` renders the full paginated blog feed with "Load More" pagination, and `display_blogpost.js` renders individual posts with markdown-to-HTML conversion, a Unique Identifiers section (`iaa`, `pledius`, `manuscript`), an Article Details section (`url`, `page_views`), a bibliography section, context links, and a picture container — covering all 17 schema fields.
