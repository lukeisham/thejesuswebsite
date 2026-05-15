---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the System Module URL slug architecture and clean URL scheme
version: 1.0.0
dependencies: [detailed_module_sitemap.md, guide_style.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 7.0 System Module
**Scope:** Clean-slug URL rewriting layer that maps human-readable paths to internal filesystem locations.

### 7.1 Clean Slug URL Scheme
**Purpose:** All public-facing URLs use clean, human-readable slugs instead of raw filesystem paths. The URL rewriting layer (nginx → FastAPI) handles the translation transparently.

**Relevant Documentation:** `url_slug_restructure.md` (full plan), `guide_function.md §7.3.1` (architecture diagram)

**Path Convention:**
| Pattern | Example | Serves |
|---------|---------|--------|
| `/` | `/` | `index.html` |
| `/about` | `/about` | `frontend/pages/about.html` |
| `/records` | `/records` | `frontend/pages/records.html` |
| `/record/{slug}` | `/record/jesus-baptism` | `frontend/pages/record.html?slug=jesus-baptism` |
| `/context/essay?id=` | `/context/essay?id=1` | `frontend/pages/context_essay.html?id=1` |
| `/blog/post?id=` | `/blog/post?id=my-post` | `frontend/pages/blog_post.html?id=my-post` |
| `/debate/academic-challenges` | `/debate/academic-challenges` | `frontend/pages/debate/academic_challenge.html` |
| `/resources/events` | `/resources/events` | `frontend/pages/resources/Events.html` |
| `/maps/roman-empire` | `/maps/roman-empire` | `frontend/pages/maps/map_empire.html` |

**Key Design Decisions:**
1. **Path-based record slugs** — Records use `/record/{slug}` (e.g. `/record/jesus-baptism`) not query params. Nginx named-capture rewrite maps the slug to `?slug=` internally so `single_view.js` reads it unchanged.
2. **`<base>` tag strategy** — Every HTML page has `<base href="/frontend/pages/">` (or `/frontend/pages/debate/`, `/frontend/pages/maps/`, `/frontend/pages/resources/` for subdirectories) so relative CSS/JS asset references resolve from the original directory even though the browser address bar shows a clean slug.
3. **Two-layer fallback** — Clean slugs are resolved first by nginx rewrite rules, then by FastAPI route handlers as a fallback for development environments.
4. **301 redirects** — Old `/frontend/pages/...` paths permanently redirect to the new clean slugs. Legacy query-param record URLs (`/record.html?slug=...` or `?id=...`) also 301 to `/record/{slug}`.
