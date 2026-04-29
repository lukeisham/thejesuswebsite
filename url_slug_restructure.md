---
name: url_slug_restructure
version: 1.1.0
module: 2.0 — Records Module (cross-module: 1.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0)
status: draft
created: 2025-07-17
---

# Plan: URL Slug Restructure

## Purpose

> **The big idea:** When someone visits `https://www.thejesuswebsite.org/records`, the page should just work. When they read a deep dive on Jesus's baptism, the URL should be `https://www.thejesuswebsite.org/record/jesus-baptism` — not `/frontend/pages/record.html?slug=jesus-baptism`. Clean URLs are easier to remember, share, and trust. Search engines rank them higher too.
>
> **The problem:** Right now every page lives at its literal filesystem path — `/frontend/pages/records.html`, `/frontend/pages/maps.html`, etc. That exposes our internal folder structure, makes URLs ugly, and hurts SEO. The code that builds links inside those pages points to raw `.html` files with query parameters like `?id=` or `?slug=`.
>
> **How we fix it:** We add a URL rewriting layer (nginx rewrites + FastAPI route handlers) that maps each clean slug (like `/records`) to its real file on disk (`/frontend/pages/records.html`). Every HTML page gets a `<base>` tag so CSS, JS, and fonts keep loading from their original directories even though the browser's address bar shows a different path. All internal navigation (sidebar, search header, homepage links), sitemap XML, SEO canonical URLs, and the admin CSS loader get updated to use the new slugs instead of raw file paths.
>
> **The goal:** Zero broken links. Zero broken assets. Full backward compatibility — old `/frontend/pages/...` URLs will 301-redirect to the new slugs for six months, then get retired.
>
> **Scope note — Blog posts, Context essays, Responses, and Record slugs:** This plan covers four content sections, each at a different stage of development:
> - **Blog posts** have a landing feed at `/blog` and individual post pages at `/blog/post?id=...` (new `frontend/pages/blog_post.html`). Both the feed page and the individual post pages receive `<base>` tags, canonical URLs, sidebar nav updates, FastAPI route handlers, and nginx rewrite rules — matching the full scope of context essays.
> - **Context essays** have an existing landing page (`/context`) that links to individual essay pages (`/context/essay?id=...`). Both the landing page and the individual essay pages receive `<base>` tags, canonical URLs, and sidebar nav updates.
> - **Responses** have a debate landing page (`/debate`) that links to individual challenge response pages (`/debate/response?id=...`). Both the landing page and the individual response pages receive `<base>` tags, canonical URLs, sidebar nav updates, FastAPI route handlers, and nginx rewrite rules — matching the full scope of context essays and blog posts.
> - **Record slugs** use a **path-based** URL scheme where each record's database slug becomes part of the URL path: `/record/{slug}` (e.g. `/record/jesus-baptism`). The list view at `frontend/pages/records.html` gets a clean `/records` slug. The individual deep-dive view at `frontend/pages/record.html` is served at `/record/{slug}` via an nginx named-capture rewrite that maps the slug path segment to a `?slug=` query parameter internally, so `single_view.js` requires no changes — it continues reading from query string. All JavaScript that constructs record links (`maps_display.js`, `timeline_display.js`, `list_view.js`) is updated to use the path-based `/record/{slug}` pattern. The JSON-LD structured data URL is also updated to match. Legacy `?slug=` and `?id=` query-parameter URLs receive nginx 301 redirects to the new path-based equivalents. No hardcoded card links exist for records — they are dynamically generated from the database.

---

## Proposed Slug Map

> All current raw paths and their proposed clean slugs. Capitalized resource names are lowercased and hyphenated for consistency. Subdirectory pages retain a logical URL hierarchy.

| # | Current Path | Proposed Clean Slug | Notes |
|---|--------------|---------------------|-------|
| 1 | `/frontend/pages/records.html` | `/records` | Core list view |
| 2 | `/frontend/pages/record.html` | `/record/{slug}` | Deep-dive view — slug becomes path segment (e.g. `/record/jesus-baptism`). Nginx rewrite maps `{slug}` to `?slug=` internally so `single_view.js` reads unchanged. Legacy `?slug=` and `?id=` URLs get 301 redirects. |
| 3 | `/frontend/pages/evidence.html` | `/evidence` | Ardor diagram |
| 4 | `/frontend/pages/timeline.html` | `/timeline` | Interactive timeline |
| 5 | `/frontend/pages/maps.html` | `/maps` | Map landing |
| 6 | `/frontend/pages/maps/map_empire.html` | `/maps/roman-empire` | Sub-map |
| 7 | `/frontend/pages/maps/map_galilee.html` | `/maps/galilee` | Sub-map |
| 8 | `/frontend/pages/maps/map_jerusalem.html` | `/maps/jerusalem` | Sub-map |
| 9 | `/frontend/pages/maps/map_judea.html` | `/maps/judea` | Sub-map |
| 10 | `/frontend/pages/maps/map_levant.html` | `/maps/levant` | Sub-map |
| 11 | `/frontend/pages/context.html` | `/context` | Context essay landing. 5 hardcoded essay-card links on this page must be updated (see T7) |
| 12 | `/frontend/pages/context_essay.html` | `/context/essay` | Individual essay view (`?id=` param — renamed from `?slug=` for consistency) |
| 13 | `/frontend/pages/debate.html` | `/debate` | Debate landing |
| 14 | `/frontend/pages/debate/academic_challenge.html` | `/debate/academic-challenges` | Ranked list |
| 15 | `/frontend/pages/debate/popular_challenge.html` | `/debate/popular-challenges` | Ranked list |
| 16 | `/frontend/pages/debate/wikipedia.html` | `/debate/wikipedia-articles` | Ranked list |
| 17 | `/frontend/pages/debate/historiography.html` | `/debate/historiography` | Long-form essay |
| 18 | `/frontend/pages/debate/response.html` | `/debate/response` | Challenge response essay |
| 19 | `/frontend/pages/resources.html` | `/resources` | Resource list landing |
| 20 | `/frontend/pages/resources/Events.html` | `/resources/events` | Specialized list |
| 21 | `/frontend/pages/resources/External witnesses.html` | `/resources/external-witnesses` | Specialized list |
| 22 | `/frontend/pages/resources/Internal witnesses.html` | `/resources/internal-witnesses` | Specialized list |
| 23 | `/frontend/pages/resources/Manuscripts.html` | `/resources/manuscripts` | Specialized list |
| 24 | `/frontend/pages/resources/Miracles.html` | `/resources/miracles` | Specialized list |
| 25 | `/frontend/pages/resources/OT Verses.html` | `/resources/ot-verses` | Specialized list |
| 26 | `/frontend/pages/resources/Objects.html` | `/resources/objects` | Specialized list |
| 27 | `/frontend/pages/resources/People.html` | `/resources/people` | Specialized list |
| 28 | `/frontend/pages/resources/Places.html` | `/resources/places` | Specialized list |
| 29 | `/frontend/pages/resources/Sermons and Sayings.html` | `/resources/sermons-and-sayings` | Specialized list |
| 30 | `/frontend/pages/resources/Sites.html` | `/resources/sites` | Specialized list |
| 31 | `/frontend/pages/resources/Sources.html` | `/resources/sources` | Specialized list |
| 32 | `/frontend/pages/resources/World Events.html` | `/resources/world-events` | Specialized list |
| 33 | `/frontend/pages/news_and_blog.html` | `/news` | News & blog landing/feed. No individual post pages yet — feed only |
| 34 | `/frontend/pages/news.html` | `/news/feed` | Dedicated news feed |
| 35 | `/frontend/pages/blog.html` | `/blog` | Dedicated blog feed. Links to individual post pages |
| 35b | `/frontend/pages/blog_post.html` | `/blog/post` | Individual blog post view (`?id=` param — new file, same pattern as `/context/essay`) |
| 36 | `/frontend/pages/about.html` | `/about` | About page |
| 37 | `/admin/frontend/admin.html` | `/admin` | Admin portal (nav stays unchanged) |
| 38 | `/index.html` | `/` | Homepage — no change |


---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Add `<base>` tag to top-level page HTML files

- **File(s):** `frontend/pages/records.html`, `frontend/pages/record.html`, `frontend/pages/evidence.html`, `frontend/pages/timeline.html`, `frontend/pages/maps.html`, `frontend/pages/context.html`, `frontend/pages/context_essay.html`, `frontend/pages/debate.html`, `frontend/pages/resources.html`, `frontend/pages/news_and_blog.html`, `frontend/pages/news.html`, `frontend/pages/blog.html`, `frontend/pages/blog_post.html`, `frontend/pages/about.html`
- **Action:** Insert `<base href="/frontend/pages/">` inside `<head>` in every top-level HTML page file so that all relative CSS/JS asset references resolve correctly from their original directory when served via rewrite.
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id`/`class` hooks

- [x] Task complete

### T2 — Add `<base>` tag to subdirectory HTML files (debate/, maps/, resources/)

- **File(s):** `frontend/pages/debate/*.html` (5 files), `frontend/pages/maps/*.html` (5 files), `frontend/pages/resources/*.html` (13 files)
- **Action:** Insert `<base href="/frontend/pages/debate/">` for debate files, `<base href="/frontend/pages/maps/">` for map files, and `<base href="/frontend/pages/resources/">` for resource files, each inside the corresponding `<head>`.
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id`/`class` hooks

- [x] Task complete

### T3 — Update sidebar navigation links in `sidebar.js`

- **File(s):** `frontend/display_other/sidebar.js`
- **Action:** Change all 9 `href` values in the `navLinks` array from `/frontend/pages/records.html` to `/records`, `/frontend/pages/evidence.html` to `/evidence`, etc., matching the Proposed Slug Map.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

### T4 — Update search header redirect in `search_header.js`

- **File(s):** `frontend/display_other/search_header.js`
- **Action:** Change `window.location.href` from `/frontend/pages/records.html?search=` to `/records?search=` on line 78.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

### T5 — Fix record link href in `maps_display.js` and `timeline_display.js` (use path-based `/record/{slug}`, not query param)

- **File(s):** `frontend/display_other/maps_display.js`, `frontend/display_other/timeline_display.js`
- **Action:** Change `rLink.href = \`record.html?id=${record.id}\`` to `rLink.href = \`/record/${record.slug}\`` in both files. This fixes two bugs: (1) uses the URL-safe `slug` column instead of the internal SQLite primary key `id`, and (2) uses the path-based slug pattern `/record/{slug}` as defined in the scope note. The nginx rewrite rule (T11) will map `/record/{slug}` to `?slug=` internally so `single_view.js` continues reading from the query string unchanged.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

### T5b — Fix JSON-LD record URL in `json_ld_builder.js`

- **File(s):** `frontend/core/json_ld_builder.js`
- **Action:** Change `const currentUrl = \`${baseUrl}/record.html?id=${recordData.slug || ''}\`` to `const currentUrl = \`${baseUrl}/record/${recordData.slug || ''}\`` so the Schema.org structured data uses the path-based slug pattern matching the clean URL (`/record/{slug}`). The nginx rewrite will handle resolution.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

### T5c — Fix `list_view.js` subfolder detection for record links

- **File(s):** `frontend/display_big/list_view.js`
- **Action:** Remove the `isSubfolder` / `baseRecordUrl` logic (lines 76–78) that tries to detect `/resources/` in the path and use `../record.html`. Since all record links will be absolute path-based slugs under the new scheme, replace with a single absolute path: `var recordUrl = '/record/' + encodeURIComponent(record.slug);` and update both `href` template strings to use `recordUrl`.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete


### T5d — Integrate `sanitizeSlug()` into `single_view.js`

- **File(s):** `frontend/display_big/single_view.js`, `frontend/core/sanitize_query.js`
- **Action:** In `single_view.js`, wrap the raw `slug` value from `urlParams.get('slug')` with `sanitizeSlug()` (already defined in `sanitize_query.js` but currently unused). Add `const slug = sanitizeSlug(urlParams.get('slug'));` and ensure `sanitize_query.js` is loaded on `record.html` before `single_view.js`. This prevents injection of malformed slug values into the SQL query. Note: `single_view.js` still reads `?slug=` from the query string — the nginx rewrite maps `/record/{slug}` to `?slug={slug}` internally, so no change to the param-reading code is needed.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete


### T6 — Update canonical URLs in HTML pages

- **File(s):** `frontend/pages/blog.html`, `frontend/pages/blog_post.html`, `frontend/pages/debate/academic_challenge.html`, `frontend/pages/debate/historiography.html`, `frontend/pages/debate/popular_challenge.html`, `frontend/pages/debate/response.html`, `frontend/pages/debate/wikipedia.html`
- **Action:** Change each inline `canonical:` URL from `/frontend/pages/...` to the matching clean slug (e.g. `/frontend/pages/blog.html` → `/blog`, `/frontend/pages/blog_post.html` → `/blog/post`, `/frontend/pages/debate/academic_challenge.html` → `/debate/academic-challenges`).
- **Vibe Rule(s):** Semantic HTML5 tags · No inline scripts (note: these are inline script blocks — acceptable for metadata injection per existing pattern)

- [x] Task complete

### T7 — Update context essay card links on the context landing page

- **File(s):** `frontend/pages/context.html`
- **Action:** Change all 5 hardcoded `<a href="context_essay.html?id=...">` links to use the absolute clean slug `<a href="/context/essay?id=...">`. The 5 affected anchor IDs: `card-historical`, `card-jewish`, `card-roman`, `card-herodian`, `card-galilean`.
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id`/`class` hooks

- [x] Task complete

### T8 — Add canonical URL to context essay, news, and blog post pages

- **File(s):** `frontend/pages/context_essay.html`, `frontend/pages/context.html`, `frontend/pages/news.html`, `frontend/pages/news_and_blog.html`, `frontend/pages/blog_post.html`
- **Action:** Add an inline `<script>` block with `injectPageMetadata({...})` call including a `canonical:` property pointing to the new slug (e.g. `window.location.origin + '/context/essay'`, `window.location.origin + '/context'`, `window.location.origin + '/news/feed'`, `window.location.origin + '/news'`, `window.location.origin + '/blog/post'`). These pages currently rely on `initializer.js` for metadata but don't explicitly set canonical URLs.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline scripts (acceptable for metadata injection per existing pattern)

- [x] Task complete

### T9 — Update homepage link references in `index.html`

- **File(s):** `index.html`
- **Action:** Replace all 8 `href="frontend/pages/..."` (relative, no leading slash) with the new clean slugs (e.g. `href="frontend/pages/records.html"` → `href="/records"`, `href="frontend/pages/evidence.html"` → `href="/evidence"`, etc.).
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id`/`class` hooks

- [x] Task complete

### T10 — Add FastAPI route handlers for all clean slugs in `serve_all.py`

- **File(s):** `serve_all.py`
- **Action:** Add `from fastapi.responses import FileResponse` import and create route handler functions — one per static slug — that return `FileResponse("frontend/pages/records.html")` etc. Keep old path serving via static mount as fallback. Group related routes logically. For the record deep-dive view, add a **path-parameter route**: `@app.get("/record/{slug}")` that reads the slug from the path, validates it, and returns `FileResponse("frontend/pages/record.html")` — the slug is passed via query rewrite in nginx or handled directly by FastAPI. Ensure `context_essay.html` and `blog_post.html` pass their `?id=` query params through unchanged.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks inline

- [x] Task complete

### T11 — Add nginx rewrite rules for clean slugs

- **File(s):** `nginx.conf`
- **Action:** Add `rewrite` directives before the `try_files` line mapping each clean slug to the corresponding static file path (e.g. `rewrite ^/records$ /frontend/pages/records.html last;`). For the record deep-dive view, add a **named-capture rewrite**: `rewrite ^/record/(.+)$ /frontend/pages/record.html?slug=$1 last;` — this maps the path-based `/record/{slug}` to the legacy `?slug=` query parameter so `single_view.js` reads it unchanged. Add 301 redirects for old paths to new slugs for backward compatibility (e.g. `rewrite ^/frontend/pages/records\.html$ /records permanent;`). Include a rewrite for `/frontend/pages/blog_post.html` → `/blog/post` and its 301 redirect for the old path. Add a 301 redirect for legacy record URL patterns: `rewrite ^/record\.html\?slug=(.+)$ /record/$1 permanent;` and `rewrite ^/record\.html\?id=(.+)$ /record/$1 permanent;`.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks inline

- [x] Task complete

### T12 — Update XML sitemap generator

- **File(s):** `tools/generate_sitemap.py`
- **Action:** Change all static route paths from old paths (e.g. `/about.html`, `/context.html`) to the new clean slugs (e.g. `/about`, `/context`). Change record URLs from `${BASE_URL}/record.html?id=${slug}` to `${BASE_URL}/record/${slug}` — using the path-based slug pattern that matches the new URL scheme. Add blog post URLs using `${BASE_URL}/blog/post?id=${id}` (following the same `?id=` param convention as context essays).
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable

- [x] Task complete

### T13 — Update admin CSS link loader in `dashboard_app.js`

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Verify the dynamic CSS `link.href` uses an absolute path from root or a relative path from the admin HTML file location so it continues to work when the admin is served at `/admin`. Change if needed from `../../css/...` to `/css/...` (absolute).
- **Vibe Rule(s):** 1 function/file · Vanilla ES6+ · Component injection

- [x] Task complete

### T14 — Update local test endpoint list in `troubleshoot.py`

- **File(s):** `localtest/scripts/troubleshoot.py`
- **Action:** Replace `/frontend/pages/timeline.html` with `/timeline` in the `ENDPOINTS` list.
- **Vibe Rule(s):** Explicit readable logic

- [x] Task complete

### T15 — Deploy and verify on staging

- **File(s):** (no file changes — deployment & QA)
- **Action:** Deploy the updated `nginx.conf` to the VPS. Restart nginx and the FastAPI app. Walk through every clean slug in a browser, verify assets load and no 404s appear in the console. Test old paths to confirm they 301-redirect. Test both query-parameter (`/record.html?slug=jesus-baptism`) and path-based (`/record/jesus-baptism`) record URLs — the former should 301, the latter should render correctly. Run `curl -I` to confirm HTTP status codes. Run sitemap generator and verify XML output.
- **Vibe Rule(s):** Stateless/repeatable

- [ ] Task complete

### T16 — Document URL slug rewriting architecture in `guide_function.md`

- **File(s):** `documentation/guides/guide_function.md`
- **Action:** Add a new subsection `7.3.1 URL Slug Rewriting Architecture` under the Backend API section. Include an ASCII flow diagram showing: (1) nginx rewrite rules mapping clean slugs to filesystem paths, (2) the named-capture rewrite converting `/record/{slug}` to `?slug=` internally, (3) the `<base>` tag strategy for asset resolution, (4) 301 redirects for legacy paths, and (5) FastAPI route handlers as fallback. Document the four key design decisions: path-based record slugs, `<base>` tag strategy, two-layer fallback (nginx → FastAPI), and the six-month 301 redirect policy. Bump the file's frontmatter `version` from 1.6.0 to 1.7.0.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks inline

- [x] Task complete

### T17 — Update `guide_welcoming_robots.md` for clean slugs and hidden scripts

- **File(s):** `documentation/guides/guide_welcoming_robots.md`
- **Action:** Update section 3 (Context Link Standards) to document the new path-based clean slugs (e.g. `/record/jesus-baptism` instead of `/frontend/pages/record.html?slug=...`) and explain that the URL rewriting layer hides the underlying filesystem structure and JavaScript from robots — they see only clean URLs in the address bar. Update section 4 (Dynamic Sitemaps) to reference the new clean slugs (e.g. `/records`, `/record/{slug}`, `/context`, `/context/essay?id=...`) instead of the old `record.html?slug=...` pattern. Add `url_slug_restructure.md` to the frontmatter dependencies. Bump version from 1.0.1 to 1.1.0.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks inline

- [x] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup *(base tag additions are inside existing semantic head sections)*
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks *(existing canonical inline scripts are retained; acceptable per established pattern. New canonical blocks for context/news pages added in T8 follow the same pattern)*
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic *(no database changes in this plan)*

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved *(all four content sections — blog, context essays, responses, and records — have landing pages and individual post/essay pages with clean slugs, canonical URLs, FastAPI routes, and nginx rewrites. Record URLs use path-based `/record/{slug}` throughout, with nginx named-capture rewrite mapping back to `?slug=` internally)*
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `index.html` | 1.0 — Foundation Module | Yes | None (paths updated in place) |
| `frontend/pages/records.html` | 2.0 — Records Module | Yes | None (base tag added) |
| `frontend/pages/record.html` | 2.0 — Records Module | Yes | None (base tag added) |
| `frontend/pages/evidence.html` | 3.0 — Visualizations Module | Yes | None (base tag added) |
| `frontend/pages/timeline.html` | 3.0 — Visualizations Module | Yes | None (base tag added) |
| `frontend/pages/maps.html` | 3.0 — Visualizations Module | Yes | None (base tag added) |
| `frontend/pages/maps/*.html` (5) | 3.0 — Visualizations Module | Yes | None (base tag added) |
| `frontend/pages/context.html` | 2.0 — Records Module | Yes | Base tag added (T1) + internal links updated (T7) + canonical added (T8) |
| `frontend/pages/context_essay.html` | 2.0 — Records Module | Yes | Base tag added (T1) + canonical added (T8) |
| `frontend/pages/debate.html` | 4.0 — Ranked Lists Module | Yes | None (base tag added) |
| `frontend/pages/debate/*.html` (5) | 4.0 — Ranked Lists Module | Yes | None (base tag added) |
| `frontend/pages/resources.html` | 2.0 — Records Module | Yes | None (base tag added) |
| `frontend/pages/resources/*.html` (13) | 2.0 — Records Module | Yes | None (base tag added) |
| `frontend/pages/news_and_blog.html` | 6.0 — News & Blog Module | Yes | Base tag added (T1) + canonical added (T8) |
| `frontend/pages/news.html` | 6.0 — News & Blog Module | Yes | Base tag added (T1) + canonical added (T8) |
| `frontend/pages/blog.html` | 6.0 — News & Blog Module | Yes | Base tag added (T1) + canonical URL updated (T6) |
| `frontend/pages/blog_post.html` | 6.0 — News & Blog Module | **New file — add to sitemap** | Base tag added (T1) + canonical URL added (T8) + FastAPI route (T10) + nginx rewrite (T11) + sitemap entry (T12) |
| `frontend/pages/about.html` | 1.0 — Foundation Module | Yes | None (base tag added) |
| `frontend/display_other/sidebar.js` | 1.0 — Foundation Module | Yes | None (href values updated) |
| `frontend/display_other/search_header.js` | 1.0 — Foundation Module | Yes | None (redirect path updated) |
| `frontend/display_other/maps_display.js` | 3.0 — Visualizations Module | Yes | None (link path updated to `/record/{slug}`) |
| `frontend/display_other/timeline_display.js` | 3.0 — Visualizations Module | Yes | None (link path updated to `/record/{slug}`) |
| `frontend/core/json_ld_builder.js` | 2.0 — Records Module | Yes | None (URL updated to path-based `/record/{slug}`) |
| `frontend/display_other/header.js` | 1.0 — Foundation Module | Yes | None (no changes needed — canonical uses dynamic origin) |
| `frontend/display_other/initializer.js` | 1.0 — Foundation Module | Yes | None (no changes needed — canonical uses dynamic origin) |
| `frontend/display_big/single_view.js` | 2.0 — Records Module | Yes | None (canonical uses `window.location.href` — dynamic; slug still read from `?slug=` query param via nginx rewrite) |
| `frontend/display_big/list_view.js` | 2.0 — Records Module | Yes | Record link URL updated to path-based pattern |
| `serve_all.py` | 7.3 — Backend API, MCP Server & VPS Config | Yes | Add route handlers for new slugs, including `/record/{slug}` path-parameter route |
| `nginx.conf` | 7.3 — Backend API, MCP Server & VPS Config | Yes | Add rewrite directives including named-capture rule for `/record/{slug}` → `?slug=` |
| `tools/generate_sitemap.py` | 8.0 — Setup & Testing Module | Yes | Update URLs in XML output (records use `/record/{slug}` path-based) |
| `admin/frontend/dashboard_app.js` | 7.1 — Admin Portal | Yes | Verify/update CSS link path |
| `localtest/scripts/troubleshoot.py` | 8.0 — Setup & Testing Module | Yes | Update endpoint path |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan *(no files moved or renamed; only base tags and internal references changed)*
- [ ] **New files added:** `frontend/pages/blog_post.html` — must be added to `detailed_module_sitemap.md` under Module 6.0 and propagated via `/sync_sitemap`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed *(new file added — increment to 1.3.0)*

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 2.0: Records Module

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `database/database.sql` | No | No database schema changes in this plan |
| `database/database.sqlite` | No | Compiled DB — unchanged by URL rewrites |
| `frontend/core/sql-wasm.wasm` | No | Third-party binary — no URL changes needed |
| `frontend/core/sql-wasm.js` | No | Library wrapper — no URL references changed |
| `frontend/core/setup_db.js` | No | DB init logic — no URL references changed |
| `frontend/core/sanitize_query.js` | No | Security utility — no URL references changed |
| `frontend/display_big/single_view.js` | No | Uses dynamic `window.location.href` for canonical — no change needed. Still reads `?slug=` from query string — nginx rewrite maps `/record/{slug}` → `?slug=` internally |
| `frontend/display_big/list_view.js` | Yes | Record link URL **is** being changed in T5c — tracked above |
| `frontend/display_big/view_context_essays.js` | No | Currently uses mock data — no URL construction; reads `containerId` only |
| `frontend/display_big/list_blogpost.js` | No | Now fetches from `/api/blog/posts` — no page URL construction |
| `frontend/display_big/list_newsitem.js` | No | Static mock data feed — no URL construction |
| `frontend/display_other/pictures_display.js` | No | Picture rendering — no URL references changed |
| `frontend/display_other/thumbnails_display.js` | No | Thumbnail rendering — no URL references changed |
| `frontend/display_other/display_snippet.js` | No | Snippet rendering — no URL references changed |
| `css/elements/pictures.css` | No | CSS — no URL references changed |
| `css/elements/thumbnails.css` | No | CSS — no URL references changed |
| `css/design_layouts/views/single_layout.css` | No | CSS — no URL references changed |
| `css/design_layouts/views/list_layout.css` | No | CSS — no URL references changed |
| `backend/scripts/helper_api.py` | No | External API helper — no URL references changed |
| `admin/frontend/edit_modules/edit_record.js` | No | Admin editor — uses API endpoints, not page URLs |
| `admin/frontend/edit_modules/edit_picture.js` | No | Admin editor — uses API endpoints, not page URLs |
| `admin/frontend/edit_modules/edit_lists.js` | No | Admin editor — uses API endpoints, not page URLs |
| `admin/frontend/edit_modules/edit_links.js` | No | Admin editor — uses API endpoints, not page URLs |
| `admin/frontend/edit_modules/edit_bulk_upload.js` | No | Admin editor — uses API endpoints, not page URLs |

### Intra-Module Check — Module 1.0: Foundation Module (touched by T3, T4, T12)

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `css/elements/typography_colors.css` | No | No URL references changed |
| `css/elements/grid.css` | No | No URL references changed |
| `frontend/display_other/header.js` | No | Canonical URL uses dynamic `window.location.href` — no change needed |
| `frontend/display_other/footer.js` | No | No page path references |
| `frontend/display_other/initializer.js` | No | Canonical URL uses dynamic `window.location.href` — no change needed |

### Intra-Module Check — Module 3.0: Visualizations Module (touched by T2, T5)

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `frontend/pages/maps/map_empire.html` | Yes | Gets `<base>` tag in T2 |
| `frontend/pages/maps/map_galilee.html` | Yes | Gets `<base>` tag in T2 |
| `frontend/pages/maps/map_jerusalem.html` | Yes | Gets `<base>` tag in T2 |
| `frontend/pages/maps/map_judea.html` | Yes | Gets `<base>` tag in T2 |
| `frontend/pages/maps/map_levant.html` | Yes | Gets `<base>` tag in T2 |
| `frontend/display_other/maps_display.js` | Yes | Record link updated in T5 (now uses `/record/{slug}` path-based) |
| `frontend/display_other/timeline_display.js` | Yes | Record link updated in T5 (now uses `/record/{slug}` path-based) |
| `css/design_layouts/views/essay_layout.css` | No | No URL references |
| `css/design_layouts/views/response_layout.css` | No | No URL references |
| `css/design_layouts/views/list_layout.css` | No | No URL references |
| `css/elements/pictures.css` | No | No URL references |

### Cross-Module Check

> Modules that are architecturally connected per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation Module | Yes | Sidebar nav, search header, and homepage links are updated (T3, T4, T9) |
| 2.0 — Records Module | Yes | `<base>` tags added to all page files (T1, T2); JSON-LD URL updated (T5b); list_view record links updated (T5c); sanitizeSlug integrated (T5d) |
| 3.0 — Visualizations Module | Yes | `<base>` tags on map pages (T2); map/timeline info-panel record links updated to path-based (T5) |
| 4.0 — Ranked Lists Module | Yes | `<base>` tags on debate pages (T2); canonical URLs updated (T6); sidebar link (T3) |
| 5.0 — Essays & Responses Module | Yes | Historiography and response pages get `<base>` tag (T2) and canonical update (T6) |
| 6.0 — News & Blog Module | Yes | News/blog pages get `<base>` tag (T1) and canonical update (T6/T8); sidebar link (T3) |
| 7.0 — System Module (Admin, API, Security) | Yes | `serve_all.py` gets route handlers including `/record/{slug}` path-parameter route (T10); `nginx.conf` gets rewrites including named-capture rule for `/record/{slug}` (T11); admin CSS loader checked (T13); no auth/security changes |
| 8.0 — Setup & Testing Module | Yes | Sitemap generator updated to output `/record/{slug}` path-based URLs (T12); troubleshoot endpoints updated (T14) |

### Module Impact Summary
- [x] Intra-module check completed — all other files in affected modules reviewed
- [x] Cross-module check completed — all 8 modules have at least some files affected
- [ ] Impact result: **See flagged rows above** — every module has at least one affected file

---
- [ ] **Documentation Update**

### Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add entry for `url_slug_restructure.md` plan file under module documentation. Add `frontend/pages/blog_post.html` to Module 6.0 file listing. Increment version to 1.3.0. |
| `documentation/simple_module_sitemap.md` | No | No module scope changes — same files, same structure |
| `documentation/site_map.md` | No | No new files added — run `/sync_sitemap` to regenerate if desired |
| `documentation/data_schema.md` | No | No database schema changes in this plan |
| `documentation/vibe_coding_rules.md` | No | No rule clarifications needed — existing rules sufficient |
| `documentation/style_mockup.html` | No | No new visual layouts introduced |
| `documentation/git_vps.md` | Yes | Document the nginx rewrite deployment step, the named-capture `/record/{slug}` → `?slug=` rule, and the six-month backward-compatibility 301 redirect policy |
| `documentation/guides/guide_appearance.md` | Yes | Add a new section documenting the clean-slug URL scheme, including the path-based `/record/{slug}` pattern, for reference when adding new pages in the future |
| `documentation/guides/guide_dashboard_appearance.md` | No | Admin dashboard URLs unchanged |
| `documentation/guides/guide_function.md` | Yes | New subsection `7.3.1 URL Slug Rewriting Architecture` added (T16) — ASCII flow diagram of nginx rewrites, named-capture `/record/{slug}` → `?slug=` mechanism, `<base>` tag strategy, 301 redirect policy, and FastAPI fallback route handlers. Version bumped to 1.7.0 |
| `documentation/guides/guide_security.md` | No | No auth or rate-limiting changes |
| `documentation/guides/guide_style.md` | No | No CSS changes |
| `documentation/guides/guide_maps.md` | No | Map display logic is unchanged (only link href values changed) |
| `documentation/guides/guide_timeline.md` | No | Timeline display logic unchanged (only link href values changed) |
| `documentation/guides/guide_donations.md` | No | No donation flow changes |
| `documentation/guides/guide_welcoming_robots.md` | Yes | Updated context link standards and sitemap section to document clean path-based slugs (T17) — robots see only clean URLs like `/record/jesus-baptism`, never the underlying `/frontend/pages/` paths or script files. Version bumped to 1.1.0 |

### Documentation Checklist
- [x] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present