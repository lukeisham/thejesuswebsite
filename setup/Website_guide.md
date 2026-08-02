# Technical Summary

This is a modular full-stack web application built entirely with **vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools, and no external dependencies except for display assets (Feather SVG sprite). The public frontend and admin panel use separate design systems optimised for their respective audiences.

The public frontend prioritises clarity, precision, and performance (desktop and mobile). It presents historical data about Jesus through static pages, interactive timelines, arbor (network) diagrams, and geographic maps. All published content is fully public and accessible to both users and automated agents.

Content creation and management is handled through a dedicated admin interface that communicates with a Node.js/Express API backed by SQLite. The admin panel includes visual editors for timelines, arbor diagrams, and maps, and uses its own distinct interface optimised for data management tasks. Administrative access is secured exclusively via WebAuthn using Apple Passkeys.

The project also includes an MCP (Model Context Protocol) server that exposes database content as tools for AI agents. The codebase itself is edited by both Claude (Claude Code) and Zed (DeepSeek), which can use these same tools to navigate the content.

**How to use this document:** read it before starting any refactor, bug fix, or new feature. The *Essential Architectural Decisions* section tells you which patterns are load-bearing (don't break them); the *Feature & Refactoring Guide* tells you the workflow and checklists to follow.

---

## Project Map

```
thejesuswebsite/
│
├── setup/                  # Project docs, plans, coding rules, agent skills, tests specs
├── frontend/               # Public website — static HTML, CSS, JS (no build step)
│   ├── evidence/           # Core content: detail pages, search, arbor, timeline, maps
│   ├── contextual-essays/  # Long-form journal essays
│   ├── debate/             # Challenges, responses, historiography, Wikipedia rankings
│   ├── resources/          # Curated ranked resource lists
│   ├── news-and-blog/      # Blog posts and external news
│   └── assets/             # CSS (base/components/layout/pages), JS (ES modules), images
├── admin/                  # CMS — passkey auth, CRUD, visual editors
│   ├── index.html          # Dashboard — aggregates pending drafts
│   ├── resources/          # Per-category drag-to-reorder list management
│   ├── diagrams/           # Visual editors for Arbor, Timeline, Maps pins
│   ├── essays/, debate/, blog/, news/, wikipedia/, evidence/,
│   │   historiography/, collections/, settings/, auth/, analytics.html
│   ├── tests/              # Admin JS tests (node --test)
│   └── assets/             # Admin-specific CSS and JS
├── api/                    # Express + better-sqlite3 — routes, models, middleware,
│                           #   services (page-generator), scripts, tests
├── database/               # SQLite schema, migrations, seed data, the .db file itself
├── mcp-server/             # Read-only MCP tools that call the HTTP API
├── public/                 # Runtime-served files — uploads/ (admin image uploads)
├── deploy/                 # nginx.conf (HTTPS) + nginx-http.conf — serve static
│                           #   files, proxy /api/ to Express; deploy.sh at repo root
└── dev-proxy.js            # Local-only static server + /api proxy (mimics nginx)
```

### Data flow

```
Public browser ──GET──▶ frontend/ (static HTML/JS) ──fetch "/api/..."──┐
Admin browser  ──GET──▶ admin/   (static HTML/JS) ──Admin.api.*────────┤
                                                                       ▼
                                            api/ (Express, port 3000)
                                            Routes → Models → better-sqlite3
                                            (no ORM — raw prepared SQL)
                                                                       │
                                                                       ▼
                                            database/thejesuswebsite.db (single file)
                                                                       ▲
AI agents ──MCP tools──▶ mcp-server/ ──HTTP──▶ api/ ───────────────────┘
```

Both frontends fetch **relative** `/api/...` URLs — in production, nginx (`deploy/nginx.conf`) serves the static files and proxies `/api/` to Express. The MCP server does **not** touch the database directly; its tools call the same public HTTP API (`API_BASE_URL`, default `http://localhost:3000/api`).

### Running locally

1. `cd api && npm install`
2. Start the API: `npm run dev` (port 3000 by default, override with `PORT`)
3. Serve `frontend/` (and `admin/`) with a static server that proxies `/api/` to port 3000 — `node dev-proxy.js` does this for `admin/`, or use the nginx configs in `deploy/`
4. Open `/admin/` and register a passkey on first visit
5. Run tests: `cd api && npm test` (Node's built-in test runner; also `mcp-server/tests/`)

Useful scripts: `npm run sitemap` (regenerate sitemap.xml), `npm run pages` (regenerate all static SEO pages).

### Binding documents (read before writing code)

| File | What it governs |
|---|---|
| `setup/Vibe_coding_rules.md` | Code rules cited throughout the codebase: SR-1..3 (setup), JS-1..6, CSS-1..6, HTML-1..5 |
| `setup/STYLE_GUIDE/INDEX.md` | CSS and visual conventions (split by section — see the index) |
| `frontend/sitemap.xml` | XML sitemap for search engines — lists all public pages |
| `setup/plan_template.md` | Template for new implementation plans (`setup/PLANS/New/`) |
| `setup/TESTS/*.md` | Manual/automated test specs per module |
| `deploy.sh` + `deploy/` | Production deploy steps (migrations, `npm run pages`, `npm run sitemap`, nginx configs) |

---

## Essential Architectural Decisions

These are the decisions that give each module its shape. When refactoring, preserve them; when adding features, extend them rather than working around them.

### Cross-cutting

| Decision | Rationale & implications |
|---|---|
| **No frameworks, no build step (SR-2)** | Only `express` and `better-sqlite3` on the server; frontend/admin ship raw files. Never add a dependency to solve a logic problem — dependencies are for display assets only. |
| **One file, one job (SR-1)** | Each page is its own HTML file; each route/model/tool is its own JS file. New functionality means a new file in the right directory, not a bigger existing file. |
| **Rule codes in comments** | Comments cite rules (e.g. `(JS-5)`, `(SR-1)`) from `Vibe_coding_rules.md`. Keep doing this — it makes intent auditable. |
| **HTML escaping everywhere** | Any DB value interpolated into HTML goes through an escape function (`templates.js` on the frontend, `escapeHTML` in `page-generator.js`). Never innerHTML raw content. |

### `frontend/` — public site

| Decision | Rationale & implications |
|---|---|
| **File-per-page routing** | Every navigable URL is a real HTML file — no JS router. Dynamic detail pages use a `[slug].html` template per section; the API's page-generator writes real per-slug files from it at publish time (SEO head included). |
| **Centralised fetch in `assets/js/api.js` (JS-5)** | All raw `fetch()` lives in one module; every helper returns `{ data, error }` and never throws. Page scripts import from here — never call `fetch` directly. |
| **Data / render / interactions triad** | Each complex visual (arbor, timeline, maps) is split into `*-data.js`, `*-render.js`, `*-interactions.js`. New visuals should follow the same triad. |
| **Shared utilities in `assets/js/utils/`** | dom, templates (escaping), storage, router, debounce, toasts, lazy-load, format, figures, content-markers. Check here before writing a helper. |
| **CSS custom properties only (CSS-2)** | Design tokens in `variables.css`; per-component files under `base/components/layout/pages` (CSS-1); mobile queries live inside each component file (CSS-3). Zoom-variant timeline pages override `--px-per-period` inline. |
| **ES modules loaded with `defer`** | Scripts at the bottom of `<body>`; page-specific boot logic only where needed (HTML-4). |

### `admin/` — CMS

| Decision | Rationale & implications |
|---|---|
| **Separate design system** | Admin CSS (`admin-base/components/layout/diagrams`) is independent of the public site's. Don't cross-import styles between the two. |
| **`window.Admin` global namespace** | Admin JS attaches helpers to a shared `Admin` object (`admin.js`) rather than ES-module imports. Pages call `Admin.api.*` wrappers, which — unlike the frontend's — **throw** on error and auto-redirect to `auth/login.html` on 401. |
| **Visual editors mirror the triad** | `admin-arbor/`, `admin-timeline/`, `admin-maps/` follow the same data/render/interactions decomposition as their frontend counterparts. |
| **Draft-first content flow** | Everything is created unpublished (`published_draft = 0`); the dashboard (`admin/index.html`, backed by `api/routes/drafts.js`) aggregates pending items; publishing is an explicit separate action. |

### `api/` — Express + SQLite

| Decision | Rationale & implications |
|---|---|
| **Routes → Models → SQL, strictly layered** | Routes own zero SQL; they validate, call a model, map errors to status codes. Models own all SQL as prepared statements. `publish.js` is the template: it delegates to each entity's own model via a type→model map. |
| **Synchronous DB (better-sqlite3)** | No async DB code, no connection pool — requiring a model opens the DB. Keep handlers synchronous where the DB is the only I/O. |
| **Shared model helpers (`model-helpers.js`, `relations/`)** | `pickWritable` whitelists columns on every create/update (JS-2 — stray body fields never reach the DB); `generateUniqueSlug` handles slug collisions; `relations/junctions.js` + `child-rows.js` genericise the ~30 link/child tables. Extend these instead of duplicating query logic. |
| **WebAuthn-only auth, in-memory sessions** | Passkey assertion mints a random token in an httpOnly `sid` cookie; sessions live in a `Map` with 12 h TTL. A restart logs the single admin out — that's acceptable by design. No passwords, no session library. |
| **Per-IP rate limiting + security headers** | All public read routes share a 300 req/min limiter mounted in `server.js`; `/search` and auth routes carry tighter limits of their own. `trust proxy` is set for nginx. |
| **Static page generation as a service** | `services/page-generator.js` renders SEO `<head>` blocks into `[slug].html` templates at publish/unpublish time, driven by `config/content-pages.js`. Adding a content type to publishing means adding it there — not writing a new generator. |
| **Tests colocated in `api/tests/`** | Node's built-in `node --test` runner, no test framework. Every behavioural change should extend these. (Admin JS has its own suite in `admin/tests/`.) |
| **One route file per entity** | Beyond the core content types, the API also covers: `analytics`, `collections`, `uploads` (admin image uploads into `public/uploads/`), and `esv` (ESV verse proxy). Check `api/routes/` before assuming an endpoint doesn't exist. |

### `database/` — SQLite

| Decision | Rationale & implications |
|---|---|
| **Single-file DB, WAL mode, FKs on** | Backups are a file copy. `schema.sql` is the canonical schema; incremental changes go in `database/migrations/NNN_*.sql` and are tracked in `schema_migrations`. Never edit historical migrations. |
| **CHECK constraints as enums** | Categories, eras, and the 38 timeline periods are enforced by `CHECK (... IN (...))` on the column — the DB, not JS, is the source of truth for valid values. Adding a period/category means a migration. |
| **Junction tables per entity-pair** | M:N links (sources, identifiers, internal links) are explicit tables like `evidence_mla_sources` with an ordering column, manipulated through the generic `relations/` helpers. |
| **FTS5 with sync triggers** | `evidence_fts`, `responses_fts`, `context_essays_fts`, `blog_posts_fts` are kept in sync by INSERT/UPDATE/DELETE triggers. If you add a searchable text column, update both the virtual table and its triggers. |
| **`published_draft` + `updated_at` triggers** | Publish state is a flag on each content table; `updated_at` is maintained by triggers, not application code. |

### `mcp-server/` — AI agent access

| Decision | Rationale & implications |
|---|---|
| **Read-only, one file per tool (SR-1)** | Each tool module exports `{ name, description, inputSchema, handler }`; `server.js` registers them declaratively over stdio transport. A new tool = a new file + one array entry. |
| **Talks HTTP, not SQL** | Tools call the public API through a single shared `apiRequest` helper (mockable in tests) — so MCP automatically respects the API's publishing rules and never needs DB credentials. |

---

## Feature & Refactoring Guide

This section governs future vibe-coding sessions. Follow it in order.

### Before touching code (any task)

1. **Read the binding docs** — `Vibe_coding_rules.md` for code rules, `STYLE_GUIDE/INDEX.md` for CSS (then only the section file(s) relevant to your task), and the Project Map above to see what already exists.
2. **Check for an existing home.** New helpers probably belong in `frontend/assets/js/utils/`, `api/models/model-helpers.js`, or `admin/assets/js/admin.js`. New files must be reflected in `frontend/sitemap.xml` (`npm run sitemap`) once created.
3. **Non-trivial work starts as a plan** in `setup/PLANS/New/`, using `setup/plan_template.md`.

### Adding a new feature

**New content entity** (the most common feature) touches, in order:

1. `database/migrations/NNN_*.sql` — table (+ junction tables, FTS + triggers if searchable, `updated_at` trigger, `published_draft` if publishable) and matching update to `schema.sql`
2. `api/models/<entity>.model.js` — prepared statements, `pickWritable` whitelist, `generateUniqueSlug`, `relations/` helpers for links
3. `api/routes/<entity>.js` — validation + error mapping only; mount in `server.js` behind `publicReadLimit`; add to `publish.js` MODELS map and `drafts.model.js` if publishable
4. `api/config/content-pages.js` — if the entity gets generated static pages
5. `admin/<entity>/` — CRUD page(s) using `Admin.api.*`
6. `frontend/<section>/` — index page, `[slug].html` template, page script importing from `api.js`
7. `mcp-server/tools/` — only if AI agents should query it
8. `api/tests/` — model + route tests; update `setup/TESTS/*.md` specs
9. `frontend/sitemap.xml` (`npm run sitemap`)

**New frontend visual:** follow the data/render/interactions triad, one CSS file per component, tokens from `variables.css` only.

**Smaller features:** trace the same chain (schema → model → route → UI) and touch only the layers involved — but never skip a layer (e.g. no SQL in a route, no `fetch` in a page script).

### Refactoring rules

- **Behaviour-preserving means byte-identical output.** The model-helpers extraction set the precedent: extracted functions must be drop-in replacements. Run `cd api && npm test` before and after.
- **Refactor toward the existing patterns**, not new abstractions: duplicated SQL → `model-helpers.js` or `relations/`; duplicated fetch/DOM code → `utils/` or `Admin`; duplicated CSS values → `variables.css`. Do not introduce a base-class hierarchy, ORM, or framework — that violates SR-2/JS-3 no matter how clean it looks.
- **Don't merge the two design systems** (frontend vs admin) or the two API-client styles (`{data, error}` vs throwing) — the asymmetry is deliberate.
- **Keep rule-code comments** (`(JS-5)` etc.) intact and add them to new extracted code.
- **Schema refactors are migrations**, never edits to applied migration files. Remember FTS triggers and CHECK constraints when renaming or adding columns.
- **Error notification impact.** Before refactoring any route, model, or frontend component that produces or displays errors, check: **(a)** does this change affect how errors are surfaced — e.g. switching from a raw `res.status(500).json()` to `sendError()`, or from `alert()` to `showErrorToast()`? If so, update the call site to use the encoding layer (`api/lib/error-codes.js`, `error-handler.js`, `error-toast.js`). **(b)** Does the refactor introduce a new failure mode? Add an `E-*` code to the registry and a task to use it. See the [Error Notification](#error-notification) section above for the full architecture.

### Bug fixes

1. Reproduce first; for API bugs write a failing test in `api/tests/` when practical.
2. Fix at the correct layer — a bad value in the UI is usually a model/validation bug, not a render patch. `pickWritable` whitelists and CHECK constraints are the usual suspects for "field not saving" bugs.
3. Check the blast radius of shared code: `model-helpers.js`, `relations/`, `api.js`, `admin.js`, `page-generator.js`, and the utils are used everywhere — run the full test suite after touching them.
4. Log known issues and their status in `setup/Issues.md`.

### Definition of done

- `cd api && npm test` passes (and `mcp-server` tests if touched)
- New/changed files reflected in `frontend/sitemap.xml`; generated pages/sitemap regenerated if content types changed
- No new dependencies, no inline styles, no raw `fetch` outside the sanctioned modules, all interpolated content escaped
- Relevant spec in `setup/TESTS/` updated

---

## Performance

When speed-testing or optimising the public site, work in this priority order:

1. **Optimise the critical rendering path — load what matters first.** The first paint should depend only on the HTML and the CSS it needs. Keep render-blocking resources minimal: ES modules stay `defer`red at the bottom of `<body>` (HTML-4), non-critical CSS and images load lazily (`utils/lazy-load.js`), and nothing above the fold waits on an API call — the static pages already carry their content and SEO `<head>`.
2. **Reduce asset payloads — ship less data.** No frameworks means the JS baseline is already small; keep it that way. Compress and correctly size images before they enter `public/uploads/`, prefer SVG (Feather sprite, map SVGs) over raster where possible, and don't add per-page CSS/JS that duplicates what a shared component file already provides.
3. **Leverage network caching — serve it closer and faster.** Static files are nginx's job (`deploy/nginx.conf`): long-lived `Cache-Control` headers for assets, gzip/brotli compression, and correct `ETag`/`Last-Modified` behaviour. API responses for public reads can carry cache headers too, but never cache authenticated admin responses. See `## Cache Strategy` below for the full policy (versioned assets, HTML edge purge, admin no-cache).

Measure before and after (Lighthouse or WebPageTest against the deployed VPS, not local) — an optimisation that doesn't move a measured number isn't done.

## Cache Strategy

Resolves Issues.md #63/#65/#66. One policy per path class, each layer guaranteeing freshness a different way:

| Path class | Header | Freshness guarantee |
|---|---|---|
| `/assets/**` JS/CSS (versioned `?v=`) | `public, max-age=31536000, immutable` | URL changes every deploy → always fresh, zero revalidation cost |
| HTML pages | `public, max-age=60` | Chrome revalidates the document on every reload; Cloudflare purged at deploy → fresh immediately |
| `/admin/**` (HTML *and* assets) | `no-cache` | Always revalidated (ETag → cheap 304s); single admin user, correctness over speed |
| `/api/**` | untouched | never edge-cached, live by definition |
| Embedded snapshots / sessionStorage | app-level `revalidateInBackground` + filter guard | fresh within one background fetch |

**Asset versioning (`?v=<commit>`):** `api/scripts/version-assets.js` runs at deploy time only, on the VPS working copy — never in the committed tree. It walks every `.html` file under `frontend/` and `admin/` and rewrites local `<script src>`/`<link href>` references ending `.js`/`.css` to carry `?v=<short-commit-hash>`, replacing any existing `?v=...` (idempotent). Each `git reset --hard origin/main` at deploy start wipes the previous stamp; the stamper immediately re-applies it with the new commit hash, so local dev and the committed tree always carry clean, unstamped references. Because the versioned URL changes every deploy, nginx can cache JS/CSS for a full year with `immutable` — there is nothing to revalidate away.

**Deploy-order invariant:** stamp → pm2 restart → nginx reload → Cloudflare purge (last). The Cloudflare purge must run after the origin is already serving the new content — purging first would just let the edge re-cache stale bytes on the next request.
**VPS prerequisite for nginx.conf changes to take effect:** `deploy.sh`'s reload step only re-reads whatever file is already at `/etc/nginx/sites-available/thejesuswebsite` on the VPS — it never copies `deploy/nginx.conf` into place. That path must be symlinked to the repo's `deploy/nginx.conf` (one-time setup, see the comment at the top of that file) or committed header changes reload "successfully" while staying completely inert. This is exactly what happened until Issues.md #68 (2026-07-19) was found and fixed.


See `deploy/nginx.conf` for the per-location headers and `setup/PLANS/Completed/cache-policy-fast-loads-instant-deploys.md` for the full design rationale.

## Video display (future work — unresolved)

The site will eventually embed a small number of videos (animations, possibly YouTube content). The open problem: third-party hosting is fragile — a YouTube video can be moved, region-blocked, or taken down, silently breaking the page.

Decision still to be made:

- **Self-host in `frontend/assets/` (or `public/`)** — robust and dependency-free (fits SR-2), served statically by nginx with range-request support; cost is repo/server size and no adaptive bitrate.
- **Self-host with DB-tracked metadata** — store the file on disk as above, but keep a `videos` table (path, title, caption/transcript, poster image) so admin pages and content pages reference videos by id rather than hard-coded paths. Do **not** store video blobs in SQLite — files on disk, metadata in the DB.
- **Embed YouTube with a self-hosted fallback** — lightest to serve, but requires monitoring for dead embeds and adds third-party scripts/cookies to an otherwise dependency-free site.

Whatever is chosen must stay consistent with the no-build, no-framework rules, and every video needs captions and a transcript (see Accessibility below).

## Image display

Two patterns cover every image on the site. Use the right one — do not mix them or invent new conventions.

### Figures (content images)

Used on about.html, evidence detail pages, and any page where an image is part of the content (not a decorative thumbnail). Follows the `<figure>` + `<figcaption>` HTML pattern styled by `frontend/assets/css/components/figures.css`.

**HTML structure:**

```html
<figure>
    <img src="/assets/images/example.jpg"
         alt="Descriptive alt text"
         width="800" height="600"
         loading="lazy" />
    <figcaption>
        <span class="fig-number">Fig. 1</span> — Caption text.
    </figcaption>
</figure>
```

**Rules:**
- Always include explicit `width` and `height` (prevents layout shift before the image loads).
- Always include `loading="lazy"` (below-the-fold images; omit only for hero images above the fold).
- Always include meaningful `alt` text (empty `alt=""` only for purely decorative images with no content value).
- `figcaption` uses `<span class="fig-number">Fig. N</span>` for numbering — the number is hardcoded in the HTML; no JS auto-numbering exists.
- Figures use the shared `figures.css`, which applies `max-width: 100%`, `height: auto`, a 1px border, and a small border-radius to the image, and small italic gray text to the caption.

**Optional utilities (from `figures.css`):**
- `.figure-full img` — full-bleed image with no border or radius (hero-style).
- `.figure-breakout-left` / `.figure-breakout-right` — side-floating figure (max 320px) at viewports ≥1024px.

**Page-specific layout** (e.g. about.html) wraps figures in a container like `.about-page` or `.evidence-detail` that sets the reading-column `max-width` — the figure inherits that constraint.

### Thumbnails (list rows)

Used on the News & Blog landing page and feed pages for article/blog post previews. Rendered dynamically by `frontend/assets/js/news-and-blog.js` using the shared `buildRow()` helper.

**API contract:**
- News articles: the API field is `news_article_thumbnail` (nullable).
- Blog posts: the API field is `blog_thumbnail` (nullable).
- Both are plain URL strings pointing into `/uploads/` (e.g. `/uploads/2026/07/5417691f-….png`).

**JS pattern (always pass `|| null`):**

```js
// In renderNewsRows:
buildRow({
    thumbnail: article.news_article_thumbnail || null,
    // …
});

// In renderBlogRows:
buildRow({
    thumbnail: post.blog_thumbnail || null,
    // …
});
```

**`buildRow()` behaviour:**
- If `thumbnail` is truthy → renders `<img class="news-blog-row-thumb" src="…" alt="" loading="lazy">`.
- If `thumbnail` is `null` → renders `<div class="news-blog-row-thumb news-blog-row-thumb--empty" aria-hidden="true">` (a dashed placeholder).

**CSS (`news-and-blog.css`):**
- `.news-blog-row-thumb` — 80×80px, `object-fit: cover`, `flex-shrink: 0`, small border-radius.
- `.news-blog-row-thumb--empty` — dashed-border placeholder with no image request.
- The thumbnail sits left of the text body in a flex row; `alt=""` marks it as decorative since the title already conveys the content.

### Cross-cutting rules

- **No inline styles.** Every image and thumbnail is styled through a shared CSS file.
- **No third-party image hosts.** All images live in `frontend/assets/images/` (static content) or `public/uploads/` (admin-uploaded, served by nginx at `/uploads/`).
- **Lazy-load by default.** Every `<img>` gets `loading="lazy"` unless it's a guaranteed above-the-fold hero.
- **Explicit dimensions.** Every content `<img>` gets `width`/`height` to prevent Cumulative Layout Shift. Thumbnails are sized by CSS (`80×80px` with `object-fit: cover`) so explicit dimensions are not needed on the `<img>` tag in that case.
- **Empty thumbnail = placeholder div, not a broken `<img>`.** `buildRow()` renders an empty dashed-box `<div>` when `thumbnail` is `null`, so the browser never requests a missing image URL.

## ESV API (Bible verse integration)

The site fetches Scripture text from the Crossway ESV API via a server-side proxy so the `ESV_API_KEY` never reaches the browser. All verse citations are progressive-enhanced: the hardcoded fallback text stays visible if the API is unreachable.

### Server proxy (`api/routes/esv.js`)

- **Endpoint:** `GET /api/esv/passage?q=Luke+1:1-3`
- **Upstream:** `https://api.esv.org/v3/passage/text/` — called with `Authorization: Token {ESV_API_KEY}`
- **Validation:** reference must match `/^[\w\s.:,–-]+$/` and be ≤60 characters
- **Cache:** in-memory `Map` — passage text never changes, so each reference is fetched once and served from cache thereafter
- **Response:** `{ reference: "Luke 1:1-3", text: "Inasmuch as many have undertaken…" }`
- **Errors:** 400 (invalid reference), 503 (key missing), upstream/network errors
- **Mounted in `server.js`** under the public read rate-limit: `app.use("/esv", publicReadLimit, …)`

### Client-side enhancement (`frontend/assets/js/esv_verse.js`)

- Finds every element with a `data-esv-ref` attribute via `document.querySelectorAll('[data-esv-ref]')`
- Calls `getEsvPassage(ref)` from `api.js` → `GET /api/esv/passage?q=…`
- On success: replaces the element's `textContent` with the API-returned passage text
- On failure: does nothing — the hardcoded inner text (already in the HTML) remains visible

### HTML pattern

```html
<a class="esv-verse"
   data-esv-ref="Luke 1:1-3"
   href="https://www.esv.org/Luke+1:1-3/">
  Hardcoded fallback text
</a>
```

- The `href` points to the ESV.org page for that passage — clicking opens the full chapter on esv.org
- The `data-esv-ref` attribute drives the API lookup; it must be a valid ESV passage reference
- The inner text is a hardcoded fallback displayed before JS runs or if the API call fails
- No custom CSS styles `.esv-verse` — it inherits the default link appearance from `typography.css`

### Where verses appear

- **Evidence, Essays, Responses, Blog posts:** verse citations are authored inside the body text as `<a class="esv-verse" …>` links. The body content passes through `parseContentBody()` (content-markers.js), which treats them as existing HTML and leaves them intact.
- **Static pages (about.html):** hardcoded `<a class="esv-verse" …>` elements in the HTML source.
- **`esv_verse.js` is loaded on every detail page** that may contain verse citations (evidence, essays, responses, blog, about).

## Accessibility

Target: **WCAG** (W3C Web Accessibility Initiative — see the [WAI WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)). Test against it and implement fixes **without sacrificing speed, data integrity, or security** — semantic HTML and ARIA attributes cost nothing at runtime, so there is rarely a real trade-off. WCAG's four principles (**POUR**):

**1. Perceivable** — users can see and hear the content.

- Every meaningful image gets descriptive `alt` text (decorative images get `alt=""`). Alt text for uploaded images is content — store it alongside the image reference, not hard-coded.
- Videos get accurate captions; audio-only content gets a transcript.
- Text/background contrast meets WCAG ratios — check any new colour pairing against `variables.css` tokens rather than eyeballing it.
- Never rely on colour alone to convey meaning: pair error states, timeline eras, arbor node types, and map pin categories with a label, icon, or pattern as well.

**2. Operable** — users can navigate and interact with everything.

- Every link, button, and form works with keyboard alone (Tab, Enter, arrows). This especially applies to the interactive visuals — arbor, timeline, and maps interactions must have keyboard equivalents, not just pointer handlers.
- Keyboard focus is always visible — don't remove `:focus` outlines without providing a replacement in the component's CSS file.
- No content flashes more than three times per second.
- Any timed behaviour (auto-dismissing toasts, session expiry warnings) is adjustable or long enough to act on.
- Each page provides a "Skip to main content" link before the sidebar/navigation.

**3. Understandable** — users can comprehend the interface.

- Navigation, search, and layout stay consistent across pages (the shared sidebar/footer scripts already enforce this — don't fork them per page).
- Form fields have real `<label>` elements, not placeholder-only labelling. Error messages are specific and actionable ("Slug must be lowercase letters and hyphens", not "Invalid input").
- Public-facing prose uses plain language where scholarship allows.

**4. Robust** — assistive technologies can parse it.

- Semantic HTML first: `<button>` for actions, `<a>` for navigation, one `<h1>` per page with properly nested headings, `<nav>`/`<main>`/`<figure>` landmarks. This is HTML-1..5 territory — the rules already point this way.
- Valid, parseable markup: templates and the page-generator must emit HTML that works in NVDA, JAWS, and VoiceOver, which mostly means no divs-as-buttons and no ARIA where a native element would do.

When auditing, test with keyboard only and with a screen reader (VoiceOver is available on this machine), plus an automated pass (Lighthouse accessibility score) — automated tools catch at most half of real issues.

---

## Node Cluster Logic

When multiple events (timeline dots) or evidence items share the same spatial coordinate, they form a **cluster**. The cluster logic system positions their dots and labels to avoid overlap while keeping each item clearly connected to its anchor — the core visual problem in dense timelines and crowded maps.

**Timelines:** Clustering solves the problem of multiple events in one period overlapping into illegibility. Three shared modules (frontend and admin, kept byte-identical) compute positions before rendering:

- **Density tiers** (`timeline-cluster-density.js`): Based on zoom level (BASE_PX_PER_PERIOD × current zoom scale, where zoom is applied via a CSS transform wrapper), clustering picks one of three modes — `compact` (≤55px), `normal` (56–119px), or `spread` (≥120px). More pixels per period = more breathing room.
- **Dot placement** (`timeline-cluster-placement.js`): Events in a period stack vertically, centred on the spine. For N events, spacing is 12px (compact), 16px (normal), or 22px (spread). At spread density, dots fan horizontally (±6px) for extra clarity.
- **Label modes** (`timeline-cluster-labels.js`): Based on tier and cluster size, each label is shown full, truncated, or hidden. Compact + 4+ events = hidden; compact + 2–3 = truncated; otherwise full.

After rendering, labels are positioned above/below the spine (with 10% clearance). A collision detector then pushes overlapping labels further out (up to 11 tiers; labels never flip sides).

**Key invariants:**
- Dots never overlap (stagger guarantees unique vertical offsets).
- Labels never overlap dots or each other (clearance + collision escalation guarantees gaps).
- Above/below side is determined by offset sign and never changes.

**Admin override:** The admin editor allows dragging events to custom positions, stored as `timeline_offset_x`/`timeline_offset_y`. When present, these **override** cluster-computed placement on both frontend and admin — labels automatically follow the new dot position.

**Architecture:** All three modules live in both `frontend/assets/js/timeline/` and `admin/assets/js/admin-timeline/` (kept identical to ensure feature parity). The frontend is read-only; the admin adds interactive drag-to-override on top.

**Maps (future):** Pins at the same geo-coordinate currently overlap. Planned: detect clusters by proximity threshold, fan pins radially from the anchor (not vertically), scale spacing by zoom level (tight at high zoom, wide at low zoom), apply the same label escalation pattern.

**Arbor edge routing** (`computeEdgePath`): Edges connect evidence nodes top-to-bottom. A single shared function renders orthogonal paths (down/across/up) with rounded corners. Parallel edges on the same source→target pair offset horizontally (±12px per edge) so they run side-by-side. Vertical-aligned nodes (within 5px) draw straight. Optional `waypoints` column (JSON in `arbor_edges`) overrides routing entirely — the path threads through waypoints manually placed in the admin's Re-route mode. Waypoints are stored as diagram-space coordinates (persist across node drags). Shared code lives in `frontend/assets/js/arbor/arbor-render.js` and `admin/assets/js/admin-arbor/arbor-edges.js` — byte-identical for consistency.

**Planned:** Unify the three cluster implementations (timeline, maps, arbor) into a shared module to eliminate duplication and ensure all three visuals evolve together.

---

## Error Notification

Every error in the system flows through a centralised encoding layer before reaching the user. The four-category architecture ensures errors are caught at the right boundary, encoded into stable machine-readable codes, and displayed consistently via the error toast — a red notification matching the cookie consent banner in size and position.

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR MESSAGE ENCODING                    │
├───────────────┬───────────────┬──────────────┬──────────────┤
│  Category 1   │  Category 2   │  Category 3  │  Category 4  │
│  Ingestion    │ Transformation│ Persistence  │   Egress     │
│  30 codes     │  15 codes     │  25 codes    │  18 codes    │
├───────────────┴───────────────┴──────────────┴──────────────┤
│              api/lib/error-codes.js (88 codes)               │
├─────────────────────────────────────────────────────────────┤
│  API Guards:            │  Frontend Display:                 │
│  • error-handler.js     │  • error-toast.js + .css           │
│  • safe-transform.js    │  • error-display.js                │
│  • db-guard.js          │  • error-fallback.js               │
│  • env-check.js         │  • date-format.js                  │
│  • io-guard.js          │                                    │
└─────────────────────────────────────────────────────────────┘
```

### Error Categories

**Category 1 — Ingestion (Input).** Validation of every external input: request bodies, query parameters, URL segments, file uploads, authentication tokens, and WebAuthn ceremonies. Guard modules throw structured `E-INPUT-*` codes before data touches business logic.

**Category 2 — Transformation (Internal Logic).** Defensive wrappers around string operations, date parsing, division, JSON decoding, slug generation, and sort comparisons. The `safe-transform.js` and `date-format.js` modules prevent `TypeError`, `NaN`, and `"Invalid Date"` leakage into rendered output.

**Category 3 — Persistence & I/O.** Database queries, transactions, file reads/writes, external API calls (ESV), and environment validation. `db-guard.js` maps SQLite error codes to `E-PERSIST-*` codes; `io-guard.js` maps `errno` codes; `env-check.js` fails fast at startup with a clear list of missing variables.

**Category 4 — Egress (Output).** Response formatting, header guards, cookie operations, page generation synchronisation, and client-side error display fallbacks. The central Express error handler in `server.js` never leaks stack traces in production and maps system errors (`entity.too.large`, `entity.parse.failed`) to stable codes. On the client, `error-fallback.js` ensures errors always surface — via inline element, error toast, or console — even when the expected DOM element is missing.

### Error Toast Design

The error toast (`frontend/assets/css/components/error-toast.css`, `frontend/assets/js/error-toast.js`) follows the same fixed bottom-right pattern as the cookie consent banner:

- **Size & position**: `min(280px, calc(100vw - 2rem))`, `bottom: 16px`, `right: 16px`, `z-index: 500`.
- **Styling**: Red left border (`--error`), subtle red-tinted background, `var(--text-2xs)` font size.
- **Actions**: A "Copy" button copies the full error text to clipboard; a "Dismiss" button (and X icon) removes the toast with a fade-out animation.
- **Stacking**: Multiple errors stack vertically via `flex-direction: column-reverse` in a singleton container.
- **Safe DOM**: All user-supplied text is set via `textContent`, never `innerHTML`.

### Adding a New Error Code

1. Add the definition to `api/lib/error-codes.js` under the appropriate category constant, following the `{ code, category, httpStatus, message, detail, severity }` shape.
2. Use `sendError(res, ERRORS.YOUR_CODE, context)` in the API route handler, or `sendValidationError(res, fieldName, ERRORS.YOUR_CODE)` for field-level validation failures.
3. On the frontend, call `handleApiError(error)` from `utils/error-display.js` — it extracts the code and shows the error toast automatically.
4. If the error is client-side only, call `showErrorToast(message, details)` directly from `error-toast.js`.

---

## Wikipedia Ranking Pipeline

The site's [Wikipedia debate rankings](/debate/wikipedia/) are powered by a hybrid vector-embedding scoring pipeline defined in `setup/Wikipedia algorithm v2/Wikipedia_alogrithm_refractor.md`. Scoring runs exclusively on the developer machine; the VPS only imports the final `scoring-export.json` via the existing import path.

### Algorithm lifecycle

The pipeline has five stages, executed by `scripts/rank_engine.py` and `scripts/extract.js` inside `setup/SKILLS/!TheJesusWebsite-Wikipedia/`:

1. **Pool (Stage 1)** — Crawl Wikipedia seed categories (Jesus, Gospels, and their subcategories) to build a cache of candidate `title→url` pairs in `candidate-pool.tsv`. Fresh crawls use a headless browser via `!HeadlessChromeBrowser`; the cache is reused so subsequent top-ups avoid re-crawling.

2. **Select (Stage 2)** — Apply inclusion/exclusion rules from `Wikipedia Articles - Reference.md` against the pool. Exclude talk pages, apocryphal/Gnostic gospels, theological/doctrinal topics, and pop-culture. Include every qualifying miracle, parable, Passion event, person, place, and scholarship article. Selection is agent judgment, not automated — the selected candidates are presented to Luke for review before scoring.

3. **Score (Stage 3)** — The hybrid vector pipeline scores each article against **25 signals** (§9 weights table). A vector classifier (§3.1.1) runs first, labelling every body paragraph as `data`, `interpretation`, or `other` — these labels are the section buckets for the entire rubric (headings are not consulted). 10 conceptual signals (balanced debate, anti-supernatural bias, mythicist framing, etc.) use per-family FAISS vector stores; 15 signals (Bible verse citations, named manuscripts, archaeology keywords, etc.) use plain keyword/list lookups. Each signal produces a capped integer contribution; `net_score` is their plain sum.

4. **Rank (Stage 4)** — Sort by `(−net_score, title)` descending. There is no tie-break signal: articles with equal `net_score` sort alphabetically by raw article title. The ranking is fully deterministic — same inputs always produce the same list.

5. **Write (Stage 5)** — Regenerate `Wikipedia Articles.csv`, `Wikipedia Articles - Scoring Detail.csv`, `wiki-bulk-paste.txt`, and `scoring-export.json`. Output conventions: commas in titles become hyphens; commas in URLs become `%2C`. The export JSON is copied to `database/` for the frontend widget. The ceiling is the current article count (254), not a fixed constant.

### Skill interaction

The agent skill `!TheJesusWebsite-Wikipedia` (`setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md`) is the repeatable operating procedure. When Luke asks to "top up the Wikipedia list" or triggers the skill name, the agent:

- Runs `rank_engine.py check` — read-only verification that `Wikipedia Articles.csv`, `Scoring Detail.csv`, and `wiki-bulk-paste.txt` agree on titles, rankings, and the exclusion list. If the row count meets the ceiling (254), the run ends here.
- If below ceiling: pools candidates from the cache (or re-crawls), applies Stage 2 selection rules, presents the list to Luke for iterative review, and on approval runs `rank_engine.py add` — which invokes `extract.js` in a headless browser to harvest signals from live Wikipedia pages, scores and merges new rows, and rewrites all deliverable files.
- Handles named exclusions (`rank_engine.py exclude`) and full rubric rescoring (`rank_engine.py rescore`, which re-harvests and re-scores every article under a changed weight table).
- The skill's TRIGGER/LOGIC/OUTPUT sections document the exact commands, gate rules, and error paths. `Wikipedia Articles - Reference.md` in the v2 directory is the canonical source of truth for pool/selection criteria and scoring weights.

**Scoring never runs on the VPS.** `deploy.sh` and the deploy workflow execute Node only — no Python, pip, or virtualenv. The developer machine runs the scoring pipeline; only `scoring-export.json` travels to production via git.

### Vector embedding database

The v2 hybrid refactor replaces keyword-pattern detectors for 10 conceptual signal families with small, specialised **FAISS vector stores**, all sharing a single ~90 MB MiniLM-class embedding model. Key properties:

- **One store per family.** Each family (balanced debate, anti-supernatural bias, mythicist framing, Jesus Seminar, OT–NT discontinuity, secular-materialist, confessional balance, literary analysis, Gnostic over-emphasis, and the data/interpretation classifier) has its own FAISS index. Families differ by their curated example set, not by their model.

- **Positive and negative exemplars.** Every store contains both: positives embody the signal; negatives are near-misses that must not fire. At query time, a span whose nearest neighbour is a negative exemplar scores **0 regardless of cosine value** — this is what gives the negative set real discriminative power.

- **Calibrated thresholds.** Each family's `t_fire` (below which a span contributes nothing), `t_strong` (upper tier), `t_asym` (computed-metric asymmetry), and `t_sep` (data/interpretation separation ratio) are fitted against a **hand-labelled gold set** (§11), frozen once recorded. The calibration sweep maximises F1 subject to a **precision floor of 0.8** — a family whose best achievable precision falls short stays on its dormant keyword fallback rather than shipping.

- **The classifier runs first and governs everything.** The §3.1.1 data/interpretation classifier labels every body paragraph before any signal is scored. Its labels *are* the section buckets for the entire rubric — every placement-sensitive signal reads them. It has no fallback (the old heading-pattern classifier is retired); if it fails its 0.85 agreement bar on a 40-article gold set, the refactor does not ship.

- **Disk footprint: ~178 MB** total (`onnxruntime` + `numpy` + `faiss-cpu`), CPU-only, no GPU. Stores live under `setup/Wikipedia algorithm v2/vector-stores/` as regenerable build artefacts and are rsynced to the VPS for live semantic query serving only — the VPS never runs scoring.

- **Dormant fallbacks.** Every replaced keyword detector stays in the codebase behind a per-family `DORMANT_FALLBACKS` flag. A family only activates its fallback if it fails the 0.8 precision floor, and the fallback reads the vector classifier's paragraph labels for placement (never the retired heading-based bucketing).

- **Similarity → contribution mapping.** Continuous cosine scores map to discrete integer contributions via: nearest-neighbour-label gating → mean cosine of positive exemplars in top‑k → threshold comparison (`t_fire` / `t_strong`) → per-family combination function (one of four shapes A–D, §3.4) → cap → placement multiplier → truncation toward zero → final integer contribution.

### Frontend widget

The Wikipedia debate page at `/debate/wikipedia/` renders a colour-coded **5×5 grid** (25 cells in §9 row order, strongest positive first) per ranked article, replacing the old click-to-reveal "reliability stones" widget. Key properties:

- **Data flow:** `scoring-export.json` → `api/scripts/import-wikipedia-scoring.js` → `wikipedia_articles` + `wikipedia_article_signals` tables → `GET /api/wikipedia` → `frontend/assets/js/wikipedia.js` renders the grid widget. No build step — the API response carries all 25 signal contributions per article.
- **Colour encoding:** Four blue intensity tiers (CSS custom properties derived from `--info`) for positive contributions; error colour for negatives. Empty cells (unfired signals) get a light background outline. A document score panel (green ≥50, yellow 25–49, red ≤24) sits alongside the grid.
- **Accessibility:** The grid is keyboard-navigable via roving tabindex (one Tab stop to enter, arrow keys within, one Tab to leave). Tooltips show signal name + contribution on hover/focus, gated behind `@media (hover: hover) and (pointer: fine)` to suppress on touch devices. Grid cells carry `role="gridcell"` with `aria-label`.
- **Responsive:** The grid stays fixed at 5 columns at all widths (26px cells ≥768px, 22px below). Page layout switches from five-column row to stacked below 768px, but the grid itself never reflows to fewer columns.
- **Performance:** No per-cell SVG, no inline styles — colour as CSS classes, 6,375 cells at full 255-article count, one delegated tooltip listener at document level.

### DB schema & import path

Two SQLite tables store Wikipedia rankings; the schema is authoritative at `database/schema.sql` and unchanged by the v2 refactor:

- **`wikipedia_articles`** (11 columns): `id`, `slug`, `title`, `url`, `revision_date`, `rank_number`, `pluses`, `minuses`, `published_draft`, `keywords`, `created_at`. One row per ranked article.
- **`wikipedia_article_signals`** (5 columns): `id`, `article_id`, `signal_key`, `contribution`, `cap`; `UNIQUE` on `(article_id, signal_key)`. 25 rows per article (one per §9 signal).
- **Import script:** `api/scripts/import-wikipedia-scoring.js` reads `database/scoring-export.json`, validates all 25 signal keys against a `KNOWN_SIGNAL_KEYS` allowlist, derives caps per signal, verifies that Σcontributions exactly equals `net_score` for every article, and upserts via a delete-and-reinsert transaction (match by URL, purge old signal rows, insert new).
- **Key migration:** The v1 import validated 28 signal keys; v2 reduces to exactly 25. Two signals were dropped outright (`historical_context`, `passion_criticism`), three referencing signals merged into one (`referencing_quality`), `journals`+`books` merged into `journal_or_book`, `location_bonus` folded into `arch_site`, `miracle_criticism` folded into `supernatural_criticism`, and four signals added (`literary_analysis`, `maps_diagrams`, `religious_art`, `secular_materialist`).
- **Tests:** `api/tests/import-wikipedia-scoring.test.js` carries 57 automated tests covering key validation, cap derivation, sum invariant, and upsert correctness.

### VPS vector store serving

Built FAISS vector stores are deployed to the VPS for live semantic query serving, reversing the earlier "developer-machine only" stance per a user-approved 1 GB VPS budget (Plan 9). Scoring itself still never runs on the VPS — only pre-built stores travel:

- **Sidecar architecture:** A Python FastAPI process (`thejesuswebsite-vector-sidecar`) loads the shared MiniLM ONNX model and all FAISS indexes at startup, exposes `POST /query` on `127.0.0.1` only (never a public interface). The Node API proxies requests through `api/lib/vector-sidecar-client.js` with a 2 s timeout and structured error mapping (`E-PERSIST-026` unreachable, `E-PERSIST-027` timeout, `E-TRANSFORM-016` malformed response).
- **Public endpoint:** `POST /api/wikipedia/signal-check` (body `{ family, text }`) — **not** an article lookup. The FAISS stores hold hand-authored calibration exemplars per family, not per-article embeddings, so there is no "related articles" capability to serve; the endpoint is a live version of the offline scoring step instead, classifying arbitrary free text against a signal family and returning the nearest exemplar(s) plus a fire/no-fire verdict (nearest-neighbour-label rule). Validates `family` against an allowlist and `text` for presence/length, and is rate-limited at 20 req/min. Responses are cached in-memory (10 min TTL, `Map` keyed on `family+text+k`).
- **Deployment:** `scripts/sync-vector-stores.sh` rsyncs `setup/Wikipedia algorithm v2/vector-stores/` (plus the classifier's ONNX model + vocab) to `/var/www/thejesuswebsite-vector-store/{vector-stores,model}/` on the VPS — a sibling path outside the git working tree, so `git reset --hard` deploys never touch it. The sidecar's own code (top-level `vector-sidecar/`) is an ordinary tracked repo directory that deploys via the normal git-based deploy, unlike the data; `scripts/sync-vector-sidecar.sh` only manages the venv + pm2 process in place, it does not rsync code.
- **Footprint:** ~290 MB total on the VPS (`onnxruntime` 75 MB + `numpy` 34 MB + `faiss-cpu` 70 MB + model 90 MB + FastAPI/uvicorn 20 MB), well inside the 1 GB budget.
- **pm2 supervision:** The sidecar runs as a third pm2 process alongside `thejesuswebsite-api` and `thejesuswebsite-mcp`. `deploy.sh` itself stays Node-only — the sidecar's venv is a one-time setup outside the deploy path.

### File layout

The Wikipedia pipeline spans three locations with different gitignore and deploy status:

| Path | Git | Deploys to VPS? | Contents |
|---|---|---|---|
| `setup/Wikipedia algorithm v2/` | **Ignored** (`.gitignore` line 7: `/setup/*`, no re-inclusion for v2) | No (rsynced manually for stores) | Refactor spec, Reference.md, gold sets, exemplars, classifier + family Python code, vector stores, threshold config |
| `setup/SKILLS/!TheJesusWebsite-Wikipedia/` | **Tracked** (`.gitignore` lines 8–9 re-include `/setup/SKILLS/**`) | No (dev-machine only) | `skill.md` (agent operating procedure), `scripts/extract.js` (browser-side DOM extraction), `scripts/rank_engine.py` (Python orchestrator) |
| `database/scoring-export.json` | **Tracked** | **Yes** (via git) | Final ranked output — 254 articles, 25 signal contributions each, consumed by the import script on the VPS |
| `api/scripts/import-wikipedia-scoring.js` | **Tracked** | **Yes** (via git) | Validates and upserts scoring data into SQLite at deploy time |
| `frontend/assets/js/wikipedia.js` | **Tracked** | **Yes** (via git) | Renders the 5×5 grid widget on `/debate/wikipedia/` |
| `/var/www/thejesuswebsite-vector-store/` | N/A (outside repo) | **Yes** (via rsync) | VPS-side vector stores + Python sidecar, never reset by deploys |

**Key invariant:** scoring (Python + headless browser) is a developer-machine activity. The VPS deployment path is Node-only (`deploy.sh` runs `npm install`, migrations, `npm run pages`, sitemap, pm2 restart — no Python). The vector stores reach the VPS by rsync, never by git, keeping binary indexes out of repository history.

### Category flags

Six boolean flags are detected from each article's Wikipedia category strip (`#mw-normal-catlinks`) at harvest time and stored per article. They gate or modify multiple signals, so a single flag error propagates further than any single signal detector error:

| Flag | Detection | Gates / modifies |
|---|---|---|
| `is_passion` | Category contains "Passion of Jesus" / "Crucifixion of Jesus" / "Resurrection of Jesus" | Sensitivity trigger for rows 15, 16, 21, 22, 23 (§3.9 Passion margin); scope gate for rows 22, 23 |
| `is_miracle` | Category contains "Miracles of Jesus" | Scope gate for rows 22, 23 (anti-supernatural + secular-materialist) |
| `is_parable` | Category contains "Parables of Jesus" | Row 4 gating (scholarly commentary); row 9 reduced cap; row 7 treatment; row 10 tier; row 15 suppression |
| `is_teaching` | Category contains "Teachings of Jesus" / "Sermon on the Mount" etc. | Row 1 raised ceiling; row 4 gating; row 10 tier; row 15 suppression |
| `is_bible_book` | Article title matches a canonical Gospel book name | Row 1 raised ceiling; row 10 tier |
| `is_location` | Category contains "New Testament places" | Row 7 archaeology bonus (+2 → +8) |

Flags are validated separately from signal detection since `is_parable` and `is_teaching` each affect five signals.

### Gold set & validation

Before any vector store is built, a hand-labelled gold set is created and frozen (Plan 3). Thresholds are fitted against these labels — never retroactively labelled to agree with store output:

- **Classifier gold set:** 40 articles drawn from the ranked 255, spanning the full shape range (many headings, few headings, headings that actively contradict structure). Each article is hand-labelled twice: per-paragraph (`data` / `interpretation` / `neither`) and per-article (which row-3 tier it deserves). Acceptance: ≥0.85 paragraph-level agreement AND ≥0.85 tier accuracy. This is the **primary gate** — the classifier has no fallback; if it fails, the refactor does not ship.
- **Per-family gold sets:** 20–30 articles per vector family, each hand-labelled for whether the signal genuinely fires and at what count or tier.
- **Negative controls:** ≥5 per family, drawn from the candidate pool (NOT the ranked 255) — articles that trip the *old* keyword detector but should not fire under the vector rubric. These are the cases the refactor exists to fix and become negative exemplars in the stores.
- **Calibration procedure:** Score every gold article at a sweep of candidate thresholds (`t_fire`, `t_strong`, `t_asym`). Choose the value maximising F1 against the frozen labels, subject to a **precision floor of 0.8**. A family whose best achievable precision falls short stays on its dormant keyword fallback.
- **Labels are frozen once recorded** — they are never updated to agree with a store's output. Thresholds fitted to their own output are worthless.

