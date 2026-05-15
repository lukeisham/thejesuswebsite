---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing News & Blog Module pages (landing, news feed, blog feed, individual posts)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_style.md, guide_dashboard_appearance.md, guide_function.md, news_blog_nomenclature.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 6.0 News & Blog Module
**Scope:** Combined News & Blog Landing Page (§6.1), News Feed (§6.2), Blog Feed (§6.3), Individual Blog Post View (§6.4).

### 6.1 Combined News & Blog Landing Page
**Purpose:** The combined entry point for news and blog content. Shows the latest snippets from both feeds side-by-side, with a link at the bottom of each column directing users to the dedicated full feed.

**Relevant Files:**
- **HTML:** `frontend/pages/news_and_blog.html`
- **CSS:** `css/6.0_news_blog/frontend/news_blog_landing.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/news_snippet_display.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: News & Blog                  |
|                     |                                                   |
|  - Records          |   ┌─────────────────────┐  ┌──────────────────┐   |
|  - Context          |   │ [NEWS]              │  │ [BLOG]           │   |
|  - Resources        |   │ ┌─────┬──────────┐  │  │ ┌─────┬────────┐ │   |
|  - Debate           |   │ │ img │ Snippet 1 │  │  │ │ img │Post 1  │ │   |
|  - About            |   │ └─────┴──────────┘  │  │ └─────┴────────┘ │   |
|                     |   │ ┌─────┬──────────┐  │  │ ┌─────┬────────┐ │   |
|                     |   │ │ img │ Snippet 2 │  │  │ │ img │Post 2  │ │   |
|                     |   │ └─────┴──────────┘  │  │ └─────┴────────┘ │   |
|                     |   │   (… 5 total)       │  │   (… 5 total)    │   |
|                     |   │                     │  │                   │   |
|                     |   │ View all news →     │  │ View all posts → │   |
|                     |   └─────────────────────┘  └──────────────────┘   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 6.1.1 Combined News & Blog Landing Page — Component Anatomy
**Purpose:** Documents the internal DOM structure of `news_and_blog.html`, including the two-column snippet grid and the per-column "view all" navigation links.

**Relevant Technical Files:**
- **Structure:** `frontend/pages/news_and_blog.html`
- **Logic:** `js/6.0_news_blog/frontend/news_snippet_display.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`
- **Styles:** `css/6.0_news_blog/frontend/news_blog_landing.css`, `css/1.0_foundation/grid.css`

**HTML DOM Structure:**
```text
<main class="site-main" id="site-main">
└── <div class="news-blog-landing">
    │
    ├── <section class="news-blog-landing__col news-blog-landing__col--news">
    │   ├── <h2>Latest News</h2>
    │   ├── <ul class="news-snippet-list">        ← rendered by news_snippet_display.js
    │   │   ├── <li class="news-snippet-item">    ← one per news_items entry
    │   │   │   ├── <img class="snippet-thumb" src="…" alt="…">
    │   │   │   ├── <span class="snippet-date">   ← Publish Date
    │   │   │   ├── <h3 class="snippet-headline"> ← Headline
    │   │   │   └── <p class="snippet-body">      ← Snippet body
    │   │   └── (repeats… up to 5)
    │   └── <a class="news-blog-landing__view-all" href="/frontend/pages/news.html">
    │           View all news →
    │
    └── <section class="news-blog-landing__col news-blog-landing__col--blog">
        ├── <h2>Latest Blog Posts</h2>
        ├── <ul class="blog-snippet-list">        ← rendered by blog_snippet_display.js
        │   ├── <li class="blog-snippet-item">    ← one per blogposts entry
        │   │   ├── <img class="snippet-thumb" src="…" alt="…">
        │   │   ├── <span class="snippet-date">   ← Publish Date
        │   │   ├── <h3 class="snippet-title">    ← Title
        │   │   └── <p class="snippet-body">      ← Body excerpt
        │   └── (repeats… up to 5)
        └── <a class="news-blog-landing__view-all" href="/frontend/pages/blog.html">
                View all posts →
```

**Layout Behaviour:**
- Two columns sit side-by-side on desktop (above 800px) using a two-column CSS grid
- Below 800px the columns stack vertically, News above Blog
- Both "view all" links are the same `.news-blog-landing__view-all` class — a minimal inline text link styled consistently with the site's ghost-link pattern

---

### 6.2 News Feed Page
**Purpose:** The dedicated full feed for news items, displaying a vertical chronological list of news posts.

**Relevant Files:**
- **HTML:** `frontend/pages/news.html`
- **CSS:** `css/6.0_news_blog/frontend/news_blog_landing.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/list_newsitem.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: News                         |
|                     |                                                   |
|  - Records          |   ┌──────┬────────────────────────────────────+   |
|  - Context          |   │ img  │ [Headline]        [Publish Date]  |   |
|  - Resources        |   │      │ [Snippet body]                     |   |
|  - Debate           |   │      │ [External link →]                  |   |
|  - About            |   └──────┴────────────────────────────────────+   |
|                     |                                                   |
|                     |   ┌──────┬────────────────────────────────────+   |
|                     |   │ img  │ [Headline]        [Publish Date]  |   |
|                     |   │      │ [Snippet body]                     |   |
|                     |   │      │ [External link →]                  |   |
|                     |   └──────┴────────────────────────────────────+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 6.3 Blog Feed Page
**Purpose:** The dedicated full feed for blog posts, displaying a vertical list of authored posts.

**Relevant Files:**
- **HTML:** `frontend/pages/blog.html`
- **CSS:** `css/6.0_news_blog/frontend/blog.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/list_blogpost.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: Blog                         |
|                     |                                                   |
|  - Records          |   ┌──────┬────────────────────────────────────+   |
|  - Context          |   │ img  │ [Title]           [Publish Date]  |   |
|  - Resources        |   │      │ [Body excerpt]                      |   |
|  - Debate           |   │      │ [Read more →]                      |   |
|  - About            |   └──────┴────────────────────────────────────+   |
|                     |                                                   |
|                     |   ┌──────┬────────────────────────────────────+   |
|                     |   │ img  │ [Title]           [Publish Date]  |   |
|                     |   │      │ [Body excerpt]                      |   |
|                     |   │      │ [Read more →]                      |   |
|                     |   └──────┴────────────────────────────────────+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 6.4 Individual Blog Post View
**Purpose:** The dedicated page for reading a single blog post with full content, metadata, bibliography, and picture.

**Relevant Files:**
- **HTML:** `frontend/pages/blog_post.html`
- **CSS:** `css/6.0_news_blog/frontend/blog.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/display_blogpost.js`, `js/2.0_records/frontend/pictures_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   [BLOG POST TITLE]                               |
|                     |   By [Author], [Publish Date]                     |
|  - Records          |                                                   |
|  - Context          |   [Body Content]                                  |
|  - Resources        |   "Lorem ipsum dolor sit amet, consectetur        |
|  - Debate           |   adipiscing elit..."                             |
|  - About            |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [ Picture ]                               |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

