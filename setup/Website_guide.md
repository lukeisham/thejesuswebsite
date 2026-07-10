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
| `setup/Style_guide.md` | CSS and visual conventions |
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
| **One route file per entity** | Beyond the core content types, the API also covers: `analytics`, `collections`, `about`, `uploads` (admin image uploads into `public/uploads/`), and `esv` (ESV verse proxy). Check `api/routes/` before assuming an endpoint doesn't exist. |

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

1. **Read the binding docs** — `Vibe_coding_rules.md` for code rules, `Style_guide.md` for CSS, and the Project Map above to see what already exists.
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
3. **Leverage network caching — serve it closer and faster.** Static files are nginx's job (`deploy/nginx.conf`): long-lived `Cache-Control` headers for assets, gzip/brotli compression, and correct `ETag`/`Last-Modified` behaviour. API responses for public reads can carry cache headers too, but never cache authenticated admin responses.

Measure before and after (Lighthouse or WebPageTest against the deployed VPS, not local) — an optimisation that doesn't move a measured number isn't done.

## Video display (future work — unresolved)

The site will eventually embed a small number of videos (animations, possibly YouTube content). The open problem: third-party hosting is fragile — a YouTube video can be moved, region-blocked, or taken down, silently breaking the page.

Decision still to be made:

- **Self-host in `frontend/assets/` (or `public/`)** — robust and dependency-free (fits SR-2), served statically by nginx with range-request support; cost is repo/server size and no adaptive bitrate.
- **Self-host with DB-tracked metadata** — store the file on disk as above, but keep a `videos` table (path, title, caption/transcript, poster image) so admin pages and content pages reference videos by id rather than hard-coded paths. Do **not** store video blobs in SQLite — files on disk, metadata in the DB.
- **Embed YouTube with a self-hosted fallback** — lightest to serve, but requires monitoring for dead embeds and adds third-party scripts/cookies to an otherwise dependency-free site.

Whatever is chosen must stay consistent with the no-build, no-framework rules, and every video needs captions and a transcript (see Accessibility below).

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

