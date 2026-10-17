# Technical Summary

This is a modular full-stack web application built with **vanilla HTML, CSS, and JavaScript** — no frameworks and no build step. The browser code uses no third-party libraries except display assets (the Feather SVG sprite). The server side keeps a short dependency list: each Node package lists its own in its `package.json`, and the Wikipedia ranking runs a Python sidecar (`wikipedia-ranking-pipeline.md`). A new dependency needs sign-off (SR-2). The public frontend and admin panel use separate design systems optimised for their respective audiences.

The public frontend prioritises clarity, precision, and performance (desktop and mobile). It presents historical data about Jesus through static pages, interactive timelines, arbor (network) diagrams, and geographic maps. All published content is fully public and accessible to both guests and automated agents.

Content creation and management is handled through a dedicated admin interface that communicates with a Node.js/Express API backed by SQLite. The admin panel includes visual editors for timelines, arbor diagrams, and maps, and uses its own distinct interface optimised for data management tasks. Administrative access is secured exclusively via WebAuthn using Apple Passkeys.

The project also includes an MCP (Model Context Protocol) server that exposes database content as tools for AI agents. The codebase itself is edited by both Claude (Claude Code) and Zed (DeepSeek), which can use these same tools to navigate the content.

**How to use this document:** read it before starting any refactor, bug fix, or new feature. The *Project Map* and *Cross-module patterns* sections show what lives where and how the parts connect; the *Feature & Refactoring Guide* tells you the workflow and checklists to follow.

**This is a map, not a reference manual.** It holds purpose, navigation, and behaviour that crosses modules. Code rules are in `setup/Vibe_coding_rules.md`, and the dated record of each decision is in `setup/Decisions_log.md`. It does not restate what the code already says — no HTML templates, no CSS pixel values, no function walkthroughs, no counts that drift the moment someone adds a row. Feature-level mechanics live in `setup/ARCHITECTURE/` (see the index below). When you're tempted to add a long feature walkthrough here, add it there and link it instead.

---

## Project Map

```
thejesuswebsite/
│
├── setup/                  # Project docs, plans, coding rules, agent skills, tests specs
│   └── ARCHITECTURE/       # Feature-level deep docs (see INDEX.md)
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
│                           #   lib (guards, error codes), services (page-generator), scripts, tests
├── database/               # SQLite schema, migrations, seed data, the .db file itself
├── mcp-server/             # Read-only MCP tools that call the HTTP API
├── Wikipedia algorithm/    # Section-classifier pipeline — gold set, calibration, LLM labels
│   └── vector-sidecar/     # Python FastAPI sidecar for FAISS vector queries (localhost only)
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

Both frontends fetch **relative** `/api/...` URLs — in production, nginx (`deploy/nginx.conf`) serves the static files and proxies `/api/` to Express. The MCP server does **not** touch the database directly; its tools call the same public HTTP API (`API_BASE_URL`, default `http://localhost:3000/api`), so it obeys the API's publishing rules.

### Cross-module patterns

- **Draft to publish.** Every content row starts with `published_draft = 0`. The admin dashboard lists drafts through `api/routes/drafts.js`. Publishing is a separate action in `api/routes/publish.js`, which then regenerates that row's static page. Public routes return published rows only (API-5).
- **One URL, one HTML file.** There is no JS router. Each section has a `[slug].html` template, and `api/services/page-generator.js` writes a real file per slug, with its SEO `<head>`, at publish and at deploy. `api/config/content-pages.js` lists the content types it covers. A new content type is added there, not in a new generator.
- **Allowed values live in the database.** Categories, eras and timeline periods are `CHECK (... IN (...))` constraints in `database/schema.sql`. Frontend and admin lists follow the schema, so a new value needs a migration first.
- **Public visuals are split in three.** Arbor, timeline and maps each have `*-data.js`, `*-render.js` and `*-interactions.js` in `frontend/assets/js/<visual>/`. A new public visual uses the same split. The admin editors in `admin/assets/js/admin-*/` are split by task instead (canvas, nodes, edges, zoom).
- **Third-party keys stay on the server.** A new outside API follows the ESV pattern: an `api/routes/` proxy reads the key from `.env`, and the browser calls only the proxy (SR-5, `ARCHITECTURE/esv-api.md`).
- **Uploads are files, never code.** Admin uploads go through `api/routes/uploads.js` (behind `requireAuth`) into `public/uploads/`, and nginx serves that folder as static files at `/uploads/`.

### Running locally

1. `cd api && npm install`
2. Start the API: `npm run dev` (port 3000 by default, override with `PORT`)
3. Serve `frontend/` (and `admin/`) with a static server that proxies `/api/` to port 3000 — `node dev-proxy.js` does this locally, or use the nginx configs in `deploy/`
4. Open `/admin/` and register a passkey on first visit
5. Run tests: `cd api && npm test` (Node's built-in test runner; also `mcp-server/tests/`)

Useful scripts: `npm run sitemap` (regenerate sitemap.xml), `npm run pages` (regenerate all static SEO pages).

### Deployment flow (one-way)

**Local → GitHub → VPS.** Nothing you change locally is live until it is both
pushed *and* deployed. This matters most for security and auth fixes: only the
code running on the VPS has real effect. Pushing to `main` triggers `.github/workflows/deploy.yml`,
which calls the HTTPS deploy webhook (`api/routes/deploy-webhook.js`). The
webhook does `git reset --hard origin/main` and runs `deploy.sh` (migrations,
`npm run pages`, `npm run sitemap`, asset stamping, pm2 restart) — roughly
15 s end to end. Only one deploy runs at a time: the workflow has a
`concurrency` group and the webhook returns 409 while a deploy runs.

`deploy.sh` skips its slow, repo-only steps (`npm install` for `api/` and
`mcp-server/`, the GeoIP import, the Wikipedia scoring import) when their input
files are unchanged since the step last succeeded. `api/scripts/deploy-step-cache.js`
keeps one hash per step in `.deploy-state/` at the repo root, which git ignores
and the reset keeps. `FORCE_FULL_DEPLOY=1` runs every step. Sitemap, static
pages, data embedding and asset stamping always run: they read the production
database, and the reset restores their tracked outputs. The one-way rule also
applies in reverse — anything hot-fixed directly on the VPS must be mirrored back into the
local tree and pushed. Files ignored by git (most of `setup/`, `.env`, `*.db`) never
reach GitHub or the VPS at all. `.gitignore` lists the `setup/` files that are tracked.

### Binding documents (read before writing code)

| File | What it governs |
|---|---|
| `setup/Vibe_coding_rules.md` | Code rules, cited throughout the codebase by stable ID (`SR-`, `JS-`, `CSS-`, `API-` and more) |
| `setup/STYLE_GUIDE/INDEX.md` | CSS and visual conventions (split by section — see the index) |
| `setup/ARCHITECTURE/INDEX.md` | Feature-level mechanics split out of this guide |
| `database/schema.sql` | The authoritative database schema |
| `frontend/sitemap.xml` | XML sitemap for search engines — lists all public pages |
| `setup/plan_template.md` | Template for new implementation plans (`setup/PLANS/New/`) |
| `setup/TESTS/*.md` | Manual/automated test specs per module |
| `deploy.sh` + `deploy/` | Production deploy steps (migrations, `npm run pages`, `npm run sitemap`, nginx configs) |

### Architecture reference (`setup/ARCHITECTURE/`)

| File | Covers |
|---|---|
| `image-display.md` | Figures vs thumbnails — the two image patterns and their rules |
| `esv-api.md` | ESV Bible verse proxy + progressive-enhancement client |
| `node-cluster-logic.md` | Timeline/map/arbor cluster placement, labels, edge routing |
| `error-notification.md` | The 4-category error code system and the error toast |
| `wikipedia-ranking-pipeline.md` | Vector-embedding scoring pipeline, import path, VPS sidecar |

---

## Feature & Refactoring Guide

This section governs future vibe-coding sessions. Follow it in order.

### Before touching code (any task)

1. **Read the binding docs** — `Vibe_coding_rules.md` for code rules, `STYLE_GUIDE/INDEX.md` for CSS (then only the section file(s) relevant to your task), `ARCHITECTURE/INDEX.md` if the task touches a documented subsystem, and the Project Map above to see what already exists.
2. **Check for an existing home.** New helpers probably belong in `frontend/assets/js/utils/`, `api/models/model-helpers.js`, or `admin/assets/js/admin.js`. New files must be reflected in `frontend/sitemap.xml` (`npm run sitemap`) once created.
3. **Non-trivial work starts as a plan** in `setup/PLANS/New/`, using `setup/plan_template.md`.

### Adding a new feature

**New content entity** (the most common feature) touches, in order:

1. `database/migrations/NNN_*.sql` — table (+ junction tables, FTS + triggers if searchable, `updated_at` trigger, `published_draft` if publishable) and matching update to `schema.sql`
2. `api/models/<entity>.model.js` — prepared statements, `pickWritable` whitelist, `generateUniqueSlug`, `relations/` helpers for links
3. `api/routes/<entity>.js` — validation + error mapping only; mount in `server.js` behind `publicReadLimit` (or `requireAuth` if it isn't public); add to `publish.js` MODELS map and `drafts.model.js` if publishable
4. `api/config/content-pages.js` — if the entity gets generated static pages
5. `admin/<entity>/` — CRUD page(s) using `Admin.api.*`
6. `frontend/<section>/` — index page, `[slug].html` template, page script importing from `api.js`
7. `mcp-server/tools/` — only if AI agents should query it
8. `api/tests/` — model + route tests; update `setup/TESTS/*.md` specs
9. `frontend/sitemap.xml` (`npm run sitemap`)

**New frontend visual:** follow the data/render/interactions triad, one CSS file per component, tokens from `variables.css` only.

**Smaller features:** trace the same chain (schema → model → route → UI) and touch only the layers involved — but never skip a layer (e.g. no SQL in a route, no `fetch` in a page script).

### Refactoring rules

- **Behaviour-preserving means byte-identical output.** Extracted functions must be drop-in replacements. Run `cd api && npm test` before and after.
- **Refactor toward the existing patterns**, not new abstractions: duplicated SQL → `model-helpers.js` or `relations/`; duplicated fetch/DOM code → `utils/` or `Admin`; duplicated CSS values → `variables.css`. Do not introduce a base-class hierarchy, ORM, or framework — that violates SR-2/JS-3 no matter how clean it looks.
- **Don't merge the two design systems** (frontend vs admin) or the two API-client styles (`{data, error}` vs throwing) — see D-017.
- **Keep rule-code comments** (`(JS-5)` etc.) intact and add them to new extracted code.
- **Schema refactors are migrations**, never edits to applied migration files. Remember FTS triggers and CHECK constraints when renaming or adding columns.
- **Error notification impact.** Refactoring anything that produces or displays errors means routing it through the encoding layer, and any new failure mode needs a new `E-*` code — see `ARCHITECTURE/error-notification.md`.
- **Security impact.** Any change to route mounting, middleware order, cookie handling, or `.env` usage is a security change: re-check API-5, SR-5, D-015 and D-016 before and after.

### Bug fixes

1. Reproduce first; for API bugs write a failing test in `api/tests/` when practical.
2. Fix at the correct layer — a bad value in the UI is usually a model/validation bug, not a render patch. `pickWritable` whitelists and CHECK constraints are the usual suspects for "field not saving" bugs.
3. Check the blast radius of shared code: `model-helpers.js`, `relations/`, `api.js`, `admin.js`, `page-generator.js`, and the utils are used everywhere — run the full test suite after touching them.
4. Log known issues and their status in `setup/ISSUES/issues.md` (the active log; older rows are archived to `Issues_30_to_110.md` / `Issues_111_to_200.md` in the same directory).

### Definition of done

- `cd api && npm test` passes (and `mcp-server` tests if touched)
- New/changed files reflected in `frontend/sitemap.xml`; generated pages/sitemap regenerated if content types changed
- No new dependencies, no inline styles, no raw `fetch` outside the sanctioned modules, all interpolated content escaped
- Relevant spec in `setup/TESTS/` updated
- If you touched a file described in `setup/ARCHITECTURE/`: run `node setup/scripts/check-architecture-docs.js --touched` and update or delete anything it flags as stale
- Pushed to `main` — work that isn't deployed isn't done

---

## Performance & caching

### Optimisation priority order

When speed-testing or optimising the public site, work in this order:

1. **Optimise the critical rendering path — load what matters first.** The first paint should depend only on the HTML and the CSS it needs. ES modules stay `defer`red at the bottom of `<body>` (HTML-4), non-critical CSS and images load lazily (`utils/lazy-load.js`), and nothing above the fold waits on an API call — the static pages already carry their content and SEO `<head>`.
2. **Reduce asset payloads — ship less data.** No frameworks means the JS baseline is already small; keep it that way. Compress and correctly size images before they enter `public/uploads/`, prefer SVG (Feather sprite, map SVGs) over raster where possible, and don't add per-page CSS/JS that duplicates a shared component file.
3. **Leverage network caching — serve it closer and faster.** Static files are nginx's job; the cache policy below is the contract.

Measure before and after (Lighthouse or WebPageTest against the deployed VPS, not local) — an optimisation that doesn't move a measured number isn't done.

### Cache policy

One policy per path class, each guaranteeing freshness a different way. The HTML edge-cache choice is D-013 in `setup/Decisions_log.md`.

Per-path `Cache-Control` values live where they are set — `deploy/nginx.conf`
for static assets and HTML, `api/middleware/security-headers.js` for `/api/`
responses — read them there, not here. The shape of the policy: versioned
JS/CSS are cached immutable for a year (their URLs change every deploy),
HTML is `max-age=60` with a Cloudflare purge at the end of each deploy,
`/admin/` is always revalidated, and embedded snapshots revalidate in the
background.

There are four caching layers in play: **Cloudflare edge** (honours the origin's HTML `max-age=60` via a Cache Rule scoped to exclude `/api/*` and `/admin/*`; purged wholesale at the end of every deploy), **nginx** (per-location headers in `deploy/nginx.conf`), **API middleware** (`security-headers.js` for public reads, `auth.js` forcing `no-store` on authenticated ones), and an **in-memory sidecar cache** (`api/lib/vector-sidecar-client.js`, 10 min TTL keyed on `family::text::k`, swept by an interval timer).

### Cache busting — the deploy-order invariant

**Stamp → pm2 restart → nginx reload → Cloudflare purge.** That order is the invariant. The purge must run *last*, after the origin is already serving new content — purging first just lets the edge re-cache stale bytes on the next request. Purge failures are deliberately not swallowed; they turn the CI job red.

`api/scripts/version-assets.js` runs at deploy time only, on the VPS working copy — never in the committed tree. It rewrites local `.js`/`.css` references in `.html` and `.js` files to carry `?v=<short-commit-hash>`, replacing any existing `?v=` (idempotent). Each `git reset --hard origin/main` wipes the previous stamp and the stamper immediately re-applies it, so local dev and the committed tree always carry clean, unstamped references. Because the URL changes every deploy, nginx can cache JS/CSS for a year with `immutable` — there is nothing to revalidate away.

**VPS prerequisite for `nginx.conf` changes to take effect:** `deploy.sh`'s reload step only re-reads whatever file is already at `/etc/nginx/sites-available/thejesuswebsite` — it never copies `deploy/nginx.conf` into place. That path must be symlinked to the repo's `deploy/nginx.conf` (one-time setup, see the comment at the top of that file), or committed header changes reload "successfully" while staying completely inert.

---

## Accessibility

Target: **WCAG** (W3C Web Accessibility Initiative — see the [WAI WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)). Test against it and implement fixes **without sacrificing speed, data integrity, or security** — semantic HTML and ARIA attributes cost nothing at runtime, so there is rarely a real trade-off. WCAG's four principles (**POUR**):

**1. Perceivable** — users can see and hear the content.

- Every meaningful image gets descriptive `alt` text (decorative images get `alt=""`). Alt text for uploaded images is content — store it alongside the image reference, not hard-coded.
- Videos get accurate captions; audio-only content gets a transcript.
- Text/background contrast meets WCAG ratios — check any new colour pairing against `variables.css` tokens rather than eyeballing it.
- Never rely on colour alone to convey meaning: pair error states, timeline eras, arbor node types, and map pin categories with a label, icon, or pattern as well.

**2. Operable** — users can navigate and interact with everything.

- Every link, button, and form works with keyboard alone (Tab, Enter, arrows). This especially applies to the interactive visuals — arbor, timeline, and maps interactions must have keyboard equivalents, not just pointer handlers.
- Keyboard focus is always visible — the global `:focus-visible` outline lives in `frontend/assets/css/base/reset.css`; any component CSS that removes it must provide a replacement.
- No content flashes more than three times per second.
- Any timed behaviour (auto-dismissing toasts, session expiry warnings) is adjustable or long enough to act on — durations and the no-dismiss option live in `frontend/assets/js/utils/toasts.js`.
- Each page provides a "Skip to main content" link before the sidebar/navigation — implemented in `frontend/assets/css/base/invisible-header.css` plus the page templates.

**3. Understandable** — users can comprehend the interface.

- Navigation, search, and layout stay consistent across pages (the shared sidebar/footer scripts already enforce this — don't fork them per page).
- Form fields have real `<label>` elements, not placeholder-only labelling. Error messages are specific and actionable ("Slug must be lowercase letters and hyphens", not "Invalid input").
- Public-facing prose uses plain language where scholarship allows.

**4. Robust** — assistive technologies can parse it.

- Semantic HTML first: `<button>` for actions, `<a>` for navigation, one `<h1>` per page with properly nested headings, `<nav>`/`<main>`/`<figure>` landmarks. This is HTML-1..5 territory — the rules already point this way.
- Valid, parseable markup: templates and the page-generator must emit HTML that works in NVDA, JAWS, and VoiceOver, which mostly means no divs-as-buttons and no ARIA where a native element would do.

When auditing, test with keyboard only and with a screen reader (VoiceOver is available on this machine), plus an automated pass (Lighthouse accessibility score) — automated tools catch at most half of real issues.
