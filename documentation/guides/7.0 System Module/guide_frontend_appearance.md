---
name: guide_frontend_appearance.md
purpose: Complete URL routing table and clean-slug architecture for all public-facing pages
version: 2.0.0
dependencies: [simple_module_sitemap.md, guide_function.md, system_nomenclature.md]
---

# Frontend URL Routing — 7.0 System Module

## Clean Slug URL Scheme

All public-facing URLs use clean, human-readable slugs. The URL rewriting layer (nginx rewrite rules, with FastAPI `serve_all.py` as a development fallback) handles translation to internal filesystem paths transparently.

### Top-Level Pages

| Clean URL | Internal file |
|-----------|---------------|
| `/` | `index.html` (root, served by nginx `index` directive) |
| `/records` | `frontend/pages/records.html` |
| `/evidence` | `frontend/pages/evidence.html` |
| `/timeline` | `frontend/pages/timeline.html` |
| `/maps` | `frontend/pages/maps.html` |
| `/context` | `frontend/pages/context.html` |
| `/context/essay` | `frontend/pages/context_essay.html` |
| `/debate` | `frontend/pages/debate.html` |
| `/resources` | `frontend/pages/resources.html` |
| `/news` | `frontend/pages/news_and_blog.html` |
| `/news/feed` | `frontend/pages/news.html` |
| `/blog` | `frontend/pages/blog.html` |
| `/blog/post` | `frontend/pages/blog_post.html` |
| `/about` | `frontend/pages/about.html` |

### Dynamic Slug Pages

| Clean URL | Internal file | JS slug reader |
|-----------|---------------|----------------|
| `/record/{slug}` | `frontend/pages/record.html?slug={slug}` | `sanitize_query.js` reads `?slug=` |
| `/context/{slug}` | `frontend/pages/context_essay.html?slug={slug}` | `view_context_essays.js` reads `?slug=` or path `/context/{slug}` |
| `/debate/{slug}` | `frontend/pages/debate/response.html?slug={slug}` | `response_display.js` reads `?id=`, `?slug=`, or path `/debate/{slug}` |
| `/blog/{slug}` | `frontend/pages/blog_post.html?slug={slug}` | `display_blogpost.js` reads `?slug=` or path `/blog/{slug}` |

### Debate Subdirectory

| Clean URL | Internal file |
|-----------|---------------|
| `/debate/academic-challenges` | `frontend/pages/debate/academic_challenge.html` |
| `/debate/popular-challenges` | `frontend/pages/debate/popular_challenge.html` |
| `/debate/wikipedia-articles` | `frontend/pages/debate/wikipedia.html` |
| `/debate/historiography` | `frontend/pages/debate/historiography.html` |
| `/debate/response` | `frontend/pages/debate/response.html` |

### Resources Subdirectory

| Clean URL | Internal file |
|-----------|---------------|
| `/resources/events` | `frontend/pages/resources/Events.html` |
| `/resources/external-witnesses` | `frontend/pages/resources/External witnesses.html` |
| `/resources/internal-witnesses` | `frontend/pages/resources/Internal witnesses.html` |
| `/resources/manuscripts` | `frontend/pages/resources/Manuscripts.html` |
| `/resources/miracles` | `frontend/pages/resources/Miracles.html` |
| `/resources/ot-verses` | `frontend/pages/resources/OT Verses.html` |
| `/resources/objects` | `frontend/pages/resources/Objects.html` |
| `/resources/people` | `frontend/pages/resources/People.html` |
| `/resources/places` | `frontend/pages/resources/Places.html` |
| `/resources/sermons-and-sayings` | `frontend/pages/resources/Sermons and Sayings.html` |
| `/resources/sites` | `frontend/pages/resources/Sites.html` |
| `/resources/sources` | `frontend/pages/resources/Sources.html` |
| `/resources/world-events` | `frontend/pages/resources/World Events.html` |

### Public JSON API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/public/blogposts` | Paginated published blog posts (`limit`, `offset`, `type`, `status`) |
| `GET /api/public/blogposts/{slug}` | Single blog post by slug |
| `GET /api/public/news` | Paginated news items |
| `GET /api/public/essays` | All published essays |
| `GET /api/public/essays/{slug}` | Single essay by slug |
| `GET /api/public/essays/historiography` | Historiography essay |
| `GET /api/public/challenges` | Paginated challenge records |
| `GET /api/public/wikipedia` | Paginated Wikipedia article rankings |
| `GET /api/public/responses` | Paginated scholarly responses |
| `GET /api/public/responses/{slug}` | Single response by slug |
| `GET /api/public/diagram/tree` | Arbor evidence tree data |

### Legacy Redirects (301 Permanent)

All old filesystem paths 301-redirect to their clean-slug equivalents. These are defined in both nginx.conf (rewrite rules with `permanent` flag) and serve_all.py (`RedirectResponse`).

| Legacy URL | Redirects to |
|------------|-------------|
| `/frontend/pages/records.html` | `/records` |
| `/frontend/pages/evidence.html` | `/evidence` |
| `/frontend/pages/debate/academic_challenge.html` | `/debate/academic-challenges` |
| `/frontend/pages/resources/Events.html` | `/resources/events` |
| `/record.html?slug={slug}` | `/record/{slug}` |
| `/record.html?id={id}` | `/record/{id}` |
| *(37+ additional legacy rewrites — see `nginx.conf` lines 66–99)* | |

## URL Resolution Architecture

```text
 [ Browser requests /record/jesus-baptism ]
              |
              v
 +--------------------------------------+
 | nginx.conf                           |
 |                                      |
 | 1. Check legacy redirects (301)      |
 |    /frontend/pages/*.html -> /slug   |
 |    ?slug=X or ?id=X -> /record/X     |
 |                                      |
 | 2. Rewrite clean slug (break)        |
 |    /record/(.+) ->                   |
 |    /frontend/pages/record.html       |
 |    ?slug=$1                          |
 |                                      |
 | 3. try_files $uri @proxy             |
 +--------------------------------------+
         |                |
   rewrite hit      rewrite miss
         |                |
         v                v
 +----------------+ +-------------------+
 | Static file    | | @proxy -> FastAPI  |
 | served by      | | serve_all.py       |
 | nginx directly | |                    |
 +----------------+ | @app.get(          |
                     |  "/record/{slug}")|
                     | FileResponse(     |
                     |  record.html)     |
                     +-------------------+
```

## Design Decisions

**Path-based record slugs** — Records use `/record/{slug}` not query params. nginx named-capture rewrite maps the slug to `?slug=` internally so `single_view.js` reads it via `URLSearchParams` unchanged.

**`<base>` tag strategy** — Every HTML page includes a `<base href>` so relative CSS/JS/font references resolve from the original directory even though the browser address bar shows a clean slug:
- Root pages: `<base href="/frontend/pages/">`
- Debate pages: `<base href="/frontend/pages/debate/">`
- Resources pages: `<base href="/frontend/pages/resources/">`
- Maps pages: `<base href="/frontend/pages/maps/">`

**Two-layer fallback** — Clean slugs are resolved first by nginx rewrite rules (`break` flag prevents re-scanning into legacy 301s), then by FastAPI route handlers for development environments where nginx is not running.

**Rate limiting** — `limit_req_zone` at 30 req/s per IP with burst=20 on all `/api/` routes. Excess requests receive 429.
