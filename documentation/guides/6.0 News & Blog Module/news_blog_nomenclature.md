---
name: news_blog_nomenclature.md
purpose: Glossary of terms used throughout the News & Blog Module and the broader codebase
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md]
---

# News & Blog Nomenclature — 6.0 News & Blog Module

## Global Terms (Codebase-Wide)

| Term | Definition |
|------|------------|
| **BEM Namespace: news-** | CSS class prefix for the News Sources dashboard components (sidebar, table, search terms). All dashboard classes use the `news-*` prefix: `news-editor-layout`, `news-sidebar`, `news-sidebar__header`, `news-sidebar__heading`, `news-sidebar__section`, `news-sidebar__subheader`, `news-sidebar__subheading`, `news-sidebar__divider`, `news-source-url__form`, `news-source-url__input`, `news-search-terms__editor`, `news-search-terms__textarea`, `news-search-terms-overview`, `news-search-terms-overview-list`, `news-search-terms-overview-item`, `news-search-terms-overview-item--empty`, `news-divider`, `news-list-area`, `news-articles-table`, `news-articles-table__th`, `news-articles-table__th--status`, `news-articles-table__th--select`, `news-articles-row`, `news-articles-row--selected`, `news-articles-row__cell`, `news-articles-row__cell--title`, `news-articles-row__cell--link`, `news-articles-row__status`, `news-articles-row__status--active`, `news-articles-row__status--inactive`, `news-articles-row__select-btn`, `news-function-bar` |
| **BEM Namespace: blog-** | CSS class prefix for the blog frontend components. All public-facing blog classes use the `blog-*` prefix: `blog-item`, `blog-item__title`, `blog-item__link`, `blog-item__date`, `blog-item__snippet`, `blog-item__read-more`, `blog-header`, `blog-title`, `blog-date`, `blog-body`, `blog-metadata`, `blog-metadata__heading`, `blog-metadata__grid`, `blog-metadata__item`, `blog-metadata__label`, `blog-metadata__value` |
| **BEM Namespace: news-blog-landing-** | CSS class prefix for the combined News & Blog landing page (`news_and_blog.html`): `news-blog-landing` (grid container), `news-blog-landing__column`, `news-blog-landing__heading`, `news-blog-landing__snippet`, `news-blog-landing__thumb-wrap`, `news-blog-landing__thumbnail`, `news-blog-landing__snippet-body`, `news-blog-landing__date`, `news-blog-landing__title`, `news-blog-landing__link`, `news-blog-landing__text`, `news-blog-landing__view-all` |
| **BEM Namespace: feed-item-** | CSS class prefix for full-feed thumbnail items on `news.html` and `blog.html`: `feed-item`, `feed-item__thumb-wrap`, `feed-item__thumbnail`, `feed-item__body` |
| **The Living Museum** | Name of the overall colour palette and design aesthetic — warm parchment tones and charcoal ink evoking an archival/museum feel |
| **Technical Blueprint** | Design philosophy — sharp corners, 1px structural borders, monospace metadata, dashed blueprint-style dividers |
| **8px Grid** | Foundational spacing system — all spacing values are multiples of 8px, tokenised via `--space-{n}` |
| **BEM** | Naming convention (Block__Element--Modifier) used for all CSS component classes across the entire codebase |
| **CSS Custom Properties (Design Tokens)** | Centralised design tokens defined in `typography.css` under `:root`, including colour, typography, spacing, shadow, border, and transition tokens |
| **Colour Tokens** | `--color-*` design tokens defining the palette: `bg-primary` (Soft Parchment), `text-primary` (Charcoal Ink), `accent-primary` (Deep Oxblood), `border` (Clay Stone), `status-success` (Blueprint Green), and others |
| **Typography Tokens** | `--font-*` (body, essay, heading, mono) and `--text-*` (xs through 4xl) tokens defining font families and type scale |
| **Spacing Tokens** | `--space-*` tokens (1 through 16) implementing the 8px grid system |
| **Deep Oxblood** | `#8e3b46` — primary accent colour used for links, active states, key hovers, and loading indicators across all modules |
| **Charcoal Ink** | `#242423` — primary text colour for body copy and headings |
| **Soft Parchment** | `#fcfbf7` — main page background colour |
| **Providence** | Dashboard 2-column grid system with permanent 1px structural divider and width hooks (`#providence-col-sidebar`, `#providence-col-main`) |
| **Page Shell** | The top-level CSS Grid layout (`#page-shell`) with named grid areas: `header`, `sidebar`, `main`, `footer` |
| **Oxblood Pulse** | `@keyframes oxblood-pulse` — CSS opacity-pulse animation for indeterminate loading states |
| **Registration Marks** | Decorative L-shaped corner cut marks (1px dashed Oxblood) applied via `.has-registration-mark` — evoking print/archival aesthetics |
| **State Classes** | Composable feedback classes: `.state-loading`, `.state-success`, `.state-error`, `.state-disabled` used across all modules |
| **Utility Classes** | `.is-hidden`, `.is-visible`, `.is-visible-flex`, `.is-visible-grid`, `.is-active`, `.is-open`, `.is-dragging`, `.is-loading` for JS-controlled visibility states |
| **Invisible SEO Header** | `<header id="invisible-header" aria-hidden="true">` — zero-height DOM anchor used by `header.js` to inject SEO metadata |
| **`data-*` Body Attributes** | Standardised `data-page-title`, `data-page-description`, `data-page-canonical`, `data-og-type`, `data-og-image` attributes on `<body>` consumed by `initializer.js` |
| **AI Metadata Directives** | `<meta name="ai:purpose" content="historical-evidence-archive">`, `<meta name="ai:subject">`, `<meta name="ai:reading-level" content="academic">` — LLM-specific hints injected on every page |
| **AI-Welcoming** | Design principle giving LLM crawlers (GPTBot, ChatGPT-User, Google-Extended, Claude-Web, DeepSeek, CCBot) fast, unrestricted access in `robots.txt` |
| **Icon System** | `.icon` base class with size modifiers (`--sm`, `--md`, `--lg`) and colour variants (`--accent`, `--muted`) — thin-line stroke SVG aesthetic |

## Module-Specific Terms (6.0 News & Blog Module)

| Term | Type | Definition |
|------|------|------------|
| **News Sources Dashboard** | Module View | Admin dashboard for managing RSS/feed sources and search keywords, triggering the news crawler pipeline, and viewing crawled articles. Loaded via `window.loadModule("news-sources")` → `window.renderNewsSources()`. Layout: 360px sidebar + 1px divider + 1fr articles table. |
| **Blog Posts Dashboard** | Module View | Admin dashboard for authoring blog posts with a WYSIWYG markdown editor and live preview. Uses the unified `wysiwyg-*` BEM namespace shared with Essays and Historiography modules. Loaded via `window.loadModule("blog-posts")` → `window.renderBlogPosts()`. |
| **news-editor-layout** | CSS Grid | The split-pane CSS Grid layout for the News Sources dashboard. Defines `grid-template-columns: 360px 1px 1fr` with named areas `sidebar`, `divider`, `main`. |
| **news-sidebar** | DOM Element / CSS | The left sidebar in the News Sources dashboard. Contains source URL input, search terms textarea, search terms overview list, and metadata widget. Always enabled (decoupled from article row selection). |
| **news-source-url__input** | DOM Element | `<input id="news-source-url-input">` — text input for entering an RSS/feed URL to crawl. Auto-saves on blur. |
| **news-search-terms__textarea** | DOM Element | `<textarea id="news-search-terms-input">` — multi-line textarea for entering search keywords (one per line or comma-separated). Auto-saves on input debounce (1s), blur, or Enter key. Always editable. |
| **news-search-terms-overview** | DOM Element | Read-only unordered list (`#news-search-terms-overview-list`) displaying saved search terms as chips below the textarea. Populated by `_renderSearchTermsOverview()`. |
| **news-articles-table** | DOM Element | `<table id="news-articles-table">` — the main work area displaying crawled news articles with columns: Article Title, Link, Last Crawled, Status, Select. Rows are clickable for visual selection but do not populate the sidebar. |
| **news-articles-row--selected** | CSS Modifier | Applied to the currently selected table row. Provides visual highlight via `background-color: --color-bg-tertiary` and a 1px accent outline. |
| **news-divider** | CSS | 1px permanent vertical divider between sidebar and main area. Pure CSS (`background-color: var(--color-border)`) — no JavaScript handles. |
| **news-function-bar** | DOM Element | Sticky function bar across the top of the main area containing Save Draft, Publish, Delete, and Gather buttons. Matches the pattern used by other dashboard modules. |
| **btn-gather** | DOM Element | `#btn-gather` — button that triggers the news crawler pipeline. Wired by `initNewsCrawler()`. Reads source URL and search terms directly from sidebar DOM inputs (decoupled from module state). POSTs to `/api/admin/news/crawl`. |
| **btn-save-draft** | DOM Element | `#btn-save-draft` — saves current sidebar source URL, search terms, and metadata widget data as draft records to the database. |
| **triggerCrawl()** | JS Function | `window.triggerCrawl()` — programmatic entry point for the news crawler. Reads `#news-source-url-input` and `#news-search-terms-input` from the DOM, parses search terms (split by newlines/commas), POSTs `{ source_url, search_terms }` to `/api/admin/news/crawl`. Defined in `launch_news_crawler.js`. |
| **initNewsCrawler()** | JS Function | `window.initNewsCrawler()` — wires the Gather button click handler. Called once by `dashboard_news_sources.js` during module initialisation. |
| **initNewsSidebar()** | JS Function | `window.initNewsSidebar()` — wires sidebar interactive elements (source URL save button + blur, search terms auto-save). Called once during module initialisation. |
| **displayNewsSourcesList()** | JS Function | `window.displayNewsSourcesList()` — fetches all `type='news_article'` records from `/api/admin/news/items`, filters for main entries (`sub_type IS NULL`), and renders the articles table. Called on module load and after Gather/Delete/Publish. Defined in `news_sources_handler.js`. |
| **_newsSourcesModuleState** | JS Global | `window._newsSourcesModuleState` — module state object tracking `activeGroupId`, `activeArticleTitle`, `activeSearchTerms`, `newsArticlesRecords`, `_allNewsArticleRecords`. Populated by `displayNewsSourcesList()` and row selection. |
| **Gather Function** | Concept | Design pattern: the Gather button reads source URL and search terms from the always-editable sidebar, sends them to the backend, and the articles table is populated with results after the crawl completes. The sidebar is the configuration panel, the table is the results display -- decoupled. |
| **disableSlugAndSeo** | Option | `{ disableSlugAndSeo: true }` -- metadata widget option that hides the slug input field, the snippet GENERATE button, and the "Generate all" button. Used by the News Sources dashboard where auto-generated SEO metadata is not applicable. |
| **renderNewsSources()** | JS Function | `window.renderNewsSources()` -- main orchestrator for the News Sources dashboard. Injects HTML, sets layout columns, initialises sidebar, crawler, metadata widget, wires function bar buttons, loads articles list. Defined in `dashboard_news_sources.js`. |
| **publishNewsSources()** | JS Function | `window.publishNewsSources()` -- sets all news article main entries in module state to `status='published'` via PUT to `/api/admin/records/{id}`. Refreshes the list after completion. Defined in `news_sources_handler.js`. |
| **scheduleNewsSourcesAutoSave()** | JS Function | `window.scheduleNewsSourcesAutoSave()` -- 1500ms debounced auto-save that collects source URL and search terms from sidebar elements and saves to sub-type rows. Defined in `news_sources_sidebar_handler.js`. |
| **/api/admin/news/crawl** | API Route | `POST /api/admin/news/crawl` -- triggers the news crawler pipeline asynchronously. Accepts optional body `{ source_url, search_terms }`. Returns `{ status, message, started_at }`. Defined in `admin/backend/routes/news.py`. |
| **/api/admin/news/items** | API Route | `GET /api/admin/news/items` -- fetches all `type='news_article'` records from the database, ordered by `created_at DESC`. Consumed by `displayNewsSourcesList()`. |
| **pipeline_news.py** | Python Script | `backend/pipelines/pipeline_news.py` -- the news aggregation pipeline. `run_pipeline(source_url, search_terms)` crawls RSS/Atom feeds and JSON APIs, matches items against search keywords, deduplicates by URL, and inserts new articles as `type='news_article'` records. Accepts optional `source_url` and `search_terms` parameters that override database lookups. |
| **_collect_search_keywords()** | Python Function | `_collect_search_keywords(conn)` -- reads `news_search_term` from all records, parses JSON blobs and comma-separated strings, falls back to `system_config.news_keywords`. Returns sorted deduplicated keyword list. |
| **_collect_source_urls()** | Python Function | `_collect_source_urls(conn)` -- reads `source_url` and legacy `news_sources` (JSON blob) from records. Returns list of `{ url, name }` dicts. |
| **_crawl_source()** | Python Function | `_crawl_source(source_url, source_name, keywords)` -- fetches a source URL, detects RSS/Atom XML vs JSON format, calls `_parse_rss_feed()` or `_parse_json_feed()`, returns matching items. Handles connection errors, timeouts, and parse failures gracefully. |
| **_parse_rss_feed()** | Python Function | `_parse_rss_feed(raw_text, source_url, keywords)` -- parses RSS 2.0 and Atom XML feeds. Strips XML namespaces for tag matching. Extracts title, link, publication date. Case-insensitive keyword matching against titles. |
| **_parse_json_feed()** | Python Function | `_parse_json_feed(data, source_url, keywords)` -- parses JSON news API responses. Handles shapes: `{ articles: [...] }`, `{ items: [...] }`, and bare arrays. Fields checked: `title`, `publishedAt`, `pubDate`, `timestamp`, `date`, `url`, `link`. |
| **_normalize_timestamp()** | Python Function | `_normalize_timestamp(raw_timestamp)` -- converts various timestamp formats (ISO-8601, RFC 2822, relative) to ISO-8601. Returns current UTC time if parsing fails. |
| **news_search_term** | DB Column | Column on the `records` table storing search keywords for news sourcing. Stored as JSON array or comma-separated string. Read by `_collect_search_keywords()` in the pipeline. |
| **news_sources** | DB Column | Legacy column on the `records` table storing source configuration as a JSON blob with `url` and `name` fields. Superseded by `source_url` but kept for backward compatibility. |
| **source_url** | DB Column | Column on the `records` table storing a single RSS/feed URL for news sourcing. Used by `_collect_source_urls()` with fallback to `news_sources`. |
| **news_item_title** | DB Column | Column on the `records` table storing the crawled article's headline/title. Populated by the pipeline on insert. Displayed in the articles table and public news feeds. |
| **news_item_link** | DB Column | Column on the `records` table storing the crawled article's external URL. Used for deduplication -- the pipeline skips inserts when this URL already exists. |
| **last_crawled** | DB Column | Column on the `records` table storing the ISO-8601 timestamp of when the article was discovered/crawled. Displayed in the articles table as a formatted date. |
| **sub_type: news_source** | DB Value | `sub_type = 'news_source'` -- sub-type discriminator on `news_article` records identifying source configuration rows (linked to a main article group via `parent_id`). |
| **sub_type: news_search_term** | DB Value | `sub_type = 'news_search_term'` -- sub-type discriminator on `news_article` records identifying individual search term rows (linked to a main article group via `parent_id`). |
| **Blog Posts Dashboard** | Module View | Admin dashboard for creating and editing blog posts. Uses the shared WYSIWYG editor pattern (`wysiwyg-*` CSS namespace) with: markdown editor, live preview, bibliography (MLA), context links, pictures, and metadata widget. |
| **renderBlogPosts()** | JS Function | `window.renderBlogPosts()` -- main orchestrator for the Blog Posts dashboard. Injects the WYSIWYG editor HTML, initialises sidebar list display, editor content loading, status handlers, and shared cross-cutting widgets. |
| **displayBlogPostsList()** | JS Function | `window.displayBlogPostsList()` -- fetches `type='blog_post'` records from `/api/admin/blogposts`, renders them in the sidebar list with draft/published/queued status badges. Consumed by `dashboard_blog_posts.js`. |
| **loadBlogPostContent()** | JS Function | `window.loadBlogPostContent(slug)` -- fetches full blog post content by slug, populates the WYSIWYG editor with `body` (markdown) and metadata fields. Handles slug lookup with id fallback. |
| **btn-new-blog-post** | DOM Element | `#btn-new-blog-post` -- button that creates a new blank blog post and opens it in the WYSIWYG editor. Calls `/api/admin/records` POST with `type: 'blog_post'`. |
| **wysiwyg-function-bar** | DOM/CSS | The sticky function bar in WYSIWYG editor dashboards (Blog Posts, Essays, Historiography). Contains status action buttons (Save Draft, Publish, Delete) and the "+ New" button. |
| **blog_post** | DB Type | `type = 'blog_post'` -- type discriminator on the `records` table identifying blog post entries. Used by public and admin views. |
| **blog-item** | CSS Component | Frontend CSS component for blog feed list items on `blog.html`. Contains `__title` (serif headline), `__link`, `__date` (monospace muted), `__snippet`, `__read-more`. |
| **blog-header** | CSS Component | Frontend CSS component for single blog post page (`blog_post.html`). Contains `blog-title` (2rem serif) and `blog-date` (monospace muted). |
| **blog-body** | CSS Component | Frontend CSS component for rendered blog post markdown. Serif font, relaxed leading. Typographic styles for h1-h6, p, a, strong, em, code. |
| **blog-metadata** | CSS Component | Frontend CSS component for metadata grid at bottom of single blog post. Grid layout `1fr 2fr` with `__heading`, `__grid`, `__item`, `__label`, `__value`. |
| **news-blog-landing** | CSS Component | Frontend CSS component for landing page (`news_and_blog.html`). Two-column grid `1fr 1fr`, stacks vertically under 800px. Snippet cards with thumbnail, date, title, text. |
| **feed-item** | CSS Component | Frontend CSS component for full feed pages (`news.html`, `blog.html`). Flexbox row with thumbnail wrap (120x90px). |
| **news_snippet_display.js** | JS File | Fetches top 5 published `news_article` records and renders landing-page snippet cards. |
| **blog_snippet_display.js** | JS File | Fetches top 5 published `blog_post` records and renders landing-page snippet cards. |
| **list_newsitem.js** | JS File | Fetches all published `news_article` records for `news.html`. Uses schema-prefixed columns. |
| **list_blogpost.js** | JS File | Fetches all published `blog_post` records for `blog.html`. |
| **display_blogpost.js** | JS File | Fetches single `blog_post` by slug for `blog_post.html`. Renders all 17 schema fields. |
| **news_and_blog.html** | HTML Page | Combined landing page with news (left) and blog (right) snippet columns. |
| **news.html** | HTML Page | Full news feed page listing all published `news_article` records with thumbnails. |
| **blog.html** | HTML Page | Full blog feed page listing all published `blog_post` records with thumbnails. |
| **blog_post.html** | HTML Page | Individual blog post page showing full rendered content with metadata grid. |
| **News Crawler Pipeline** | Pipeline | End-to-end: sidebar inputs -> `/api/admin/news/crawl` -> `pipeline_news.py` -> RSS/JSON feed parsing -> keyword matching -> dedup -> `INSERT` into `records` table. Stateless and idempotent. | 
