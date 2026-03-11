# Plan: Update blog_architecture.html in Bite-Sized Batches

## Context

The current `blog_architecture.html` is a bare placeholder with a factual error: it shows `sqlite.rs` as the storage layer, but blog posts are stored in **ChromaDB only**. It needs to be replaced with accurate documentation covering the 4-step blog lifecycle:
1. Blog posts are created in the dashboard CRUD using Markdown (modal popup editor)
2. Published posts are listed/searched in the CRUD panel and can be selected to edit
3. Published posts appear on the blog feed (`blog_feed.html`)
4. The most recent post is pulled to the featured slot on `news_and_blog.html`

Key codebase facts:
- `blog_crud.js` is **fully implemented** — modal-based editor, not tab-based
- CRUD panel shows a persistent post list + `#search-blogs-input` filter; clicking opens `#blog-editor-modal`
- Storage: **ChromaDB only** via `chroma.store_blog_post()` — sqlite.rs has no blog methods
- `GET /api/blog/posts` and `POST /api/blog/posts` implemented; other routes are missing
- `GET /api/blog/latest` and `GET /api/v1/blog_feed_content` are **intended but not yet built**
- Posts always created with `is_published: false` (security rule enforced server-side)

**File modified:** `frontend/private/blog_architecture.html`

---

## Batch Plan

### Batch 1: Master Overview (4-step lifecycle diagram)
Replace placeholder box with unified lifecycle showing: Create → Search/List → Blog Feed → News & Blog, converging on POST /api/blog/posts → ChromaDB.

### Batch 2 & 3 & 4: Detailed Step Diagrams (all inserted together)
- **Step 1 & 2:** CRUD panel list + search filter + modal popup editor + save/publish flow + Gatekeeper validation + ChromaDB storage
- **Step 3:** blog_feed.html → blog_feed_hero.js → GET /api/v1/blog_feed_content (intended) → #hero-placeholder cards
- **Step 4:** news_and_blog.html → display_top_blog_post.js → GET /api/blog/latest (intended) → #top-blog-post population

### Batch 5: File & Function Reference Tables
Replace stub with 4 accurate `<details>` sections:
1. Backend — Core Types (`blog.rs`, `dtos.rs`)
2. Backend — API Handlers (2 implemented ✅, 2 intended ⚠️)
3. Backend — Storage (ChromaDB only — corrects sqlite.rs error)
4. Frontend — Admin JS (`blog_crud.js` functions + all HTML element IDs)
5. Frontend — Public JS (`blog_feed_hero.js`, `display_top_blog_post.js`, `display_top_four_news_items.js`)

### Batch 6: Terms Glossary
13-term definition table covering: BlogPost, DraftBlogPost, BlogCreateRequest, Markdown, is_published, ChromaDB, blog_posts collection, blog_crud.js, blog-editor-modal, blog_feed.html, news_and_blog.html, hero-placeholder, top-blog-post.

---

## Files Modified
- `frontend/private/blog_architecture.html` — all 6 batches
