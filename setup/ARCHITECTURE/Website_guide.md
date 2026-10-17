# Technical Summary

This is a modular full-stack web application built with **vanilla HTML, CSS, and JavaScript** — no frameworks and no build step. The browser code uses no third-party libraries except display assets (the Feather SVG sprite). Each Node package lists its own dependencies in its `package.json`, and the Wikipedia ranking runs a Python sidecar (`wikipedia-ranking-pipeline.md`). A new dependency needs sign-off (SR-2). The public frontend and the admin panel are two separate design systems (D-017).

The public frontend presents historical data about Jesus through static pages, interactive timelines, arbor (network) diagrams, and geographic maps. Published content is public to guests and automated agents.

Content is managed through an admin interface that talks to a Node.js/Express API backed by SQLite. The admin panel has visual editors for timelines, arbor diagrams, and maps. Admin access uses WebAuthn passkeys only (D-016).

An MCP (Model Context Protocol) server exposes published content as read-only tools for AI agents.

**How to use this document:** read it before starting any refactor, bug fix, or new feature. The *Project Map* and *Cross-module patterns* sections show what lives where and how the parts connect; the *Feature & Refactoring Guide* tells you the workflow and checklists to follow.

**This is a map, not a reference manual.** It holds purpose, navigation, and behaviour that crosses modules. Code rules are in `setup/Vibe_coding_rules.md`, and the dated record of each decision is in `setup/Decisions_log.md`. It does not restate what the code already says — no HTML templates, no CSS pixel values, no function walkthroughs, no counts that drift the moment someone adds a row. Feature-level mechanics live in `setup/ARCHITECTURE/` (see its `INDEX.md`). When you're tempted to add a long feature walkthrough here, add it there and link it instead.

---

## Project Map

```
thejesuswebsite/
│
├── setup/                  # Project docs, plans, coding rules, agent skills, tests specs
│   └── ARCHITECTURE/       # Cross-file subsystem docs (see INDEX.md)
├── frontend/               # Public website — static HTML, CSS, JS (no build step)
│   ├── evidence/           # Core content: detail pages, search, arbor, timeline, maps
│   ├── contextual-essays/  # Long-form journal essays
│   ├── debate/             # Challenges, responses, historiography, Wikipedia rankings
│   ├── resources/          # Curated ranked resource lists
│   ├── news-and-blog/      # Blog posts and external news
│   └── assets/             # CSS (base/components/layout/pages), JS (ES modules), images, data
├── admin/                  # CMS — passkey auth, CRUD, visual editors
│   ├── index.html          # Dashboard — aggregates pending drafts
│   ├── diagrams/           # Visual editors for Arbor, Timeline, Maps pins
│   ├── <entity>/           # One CRUD directory per content type; also auth/, settings/
│   ├── tests/              # Admin JS tests (node --test)
│   └── assets/             # Admin-specific CSS and JS
├── api/                    # Express + better-sqlite3 — routes, models, middleware, config,
│                           #   lib (guards, error codes), services (page-generator), scripts, tests
├── database/               # SQLite schema, migrations, seeds, scoring-export.json, the .db file itself
├── mcp-server/             # Read-only MCP tools that call the HTTP API
├── Wikipedia algorithm/    # Wikipedia scoring data — gold sets, calibration, vector stores
│   └── vector-sidecar/     # Python FastAPI sidecar for FAISS vector queries (localhost only)
├── public/                 # Runtime-served files — uploads/ (admin image uploads)
├── deploy/                 # nginx.conf (HTTPS) + nginx-http.conf + nginx-realip.conf
├── deploy.sh               # VPS deploy steps
├── ecosystem.config.js     # pm2 process definitions (VPS paths)
├── scripts/                # pm2-apply.js (restart + health check), vector store/sidecar sync scripts
├── .github/workflows/      # deploy.yml — webhook deploy, health poll, Cloudflare purge
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

Both frontends fetch **relative** `/api/...` URLs. In production, nginx (`deploy/nginx.conf`) serves the static files and proxies `/api/` to Express. nginx strips the `/api` prefix, so Express mounts its routes without it. `dev-proxy.js` does the same locally. The MCP server does **not** touch the database directly. Its tools call the same public HTTP API (`API_BASE_URL`), so they obey the API's publishing rules. On the VPS the default `http://localhost:3000` reaches Express directly, with no `/api` prefix. A client that goes through nginx or `dev-proxy.js` must add `/api` itself.

### Cross-module patterns

- **Draft to publish.** Every content row starts with `published_draft = 0`. The admin dashboard lists drafts through `api/routes/drafts.js`. Publishing is a separate action in `api/routes/publish.js`, which then regenerates that row's static page. If page generation fails, the publish still succeeds and only a log line records the failure. `npm run pages` repairs the page. Public routes return published rows only (API-5).
- **One URL, one HTML file.** There is no JS router. Each section has a `[slug].html` template, and `api/services/page-generator.js` writes a real file per slug, with its SEO `<head>`, at publish and at deploy. `api/config/content-pages.js` lists the content types it covers. A new content type is added there, not in a new generator.
- **Allowed values live in the database.** Categories, eras and timeline periods are `CHECK (... IN (...))` constraints in `database/schema.sql`. Frontend and admin lists follow the schema, so a new value needs a migration first.
- **Public visuals are split in three.** Arbor, timeline and maps each have `*-data.js`, `*-render.js` and `*-interactions.js` in `frontend/assets/js/<visual>/`. A new public visual uses the same split. The admin editors in `admin/assets/js/admin-*/` are split by task instead (canvas, nodes, edges, zoom).
- **Third-party keys stay on the server.** A new outside API follows the ESV pattern: an `api/routes/` proxy reads the key from `.env`, and the browser calls only the proxy (SR-5, `ARCHITECTURE/esv-api.md`).
- **Uploads are files, never code.** Admin uploads go through `api/routes/uploads.js` (behind `requireAuth`) into `public/uploads/`, and nginx serves that folder as static files at `/uploads/`.

### Running locally

1. `cd api && npm install`
2. Create `.env` at the repo root with `NODE_ENV=development`. The API refuses to boot without an explicit `NODE_ENV` (`api/config/load-env.js`).
3. Start the API: `cd api && npm run dev` (port 3000, override with `PORT`).
4. Serve a static root with the proxy: `node dev-proxy.js frontend` or `node dev-proxy.js admin` (default root `admin`, default port 4174). It forwards `/api/*` to port 3000 and strips the prefix.
5. First passkey registration needs `SETUP_TOKEN` in `.env` and no enrolled credential (`api/routes/passkey.js`). Agents that test the admin locally use the `ADMIN_DEV_BYPASS` route instead (`api/routes/dev-bypass.js`).
6. Run tests: `cd api && npm test` and `cd mcp-server && npm test` (Node's built-in test runner). Admin and frontend tests sit beside their code (`admin/tests/`, `frontend/**/tests/`). Run them with `node --test <path>`.

Useful scripts: `npm run sitemap` (regenerate sitemap.xml), `npm run pages` (regenerate all static SEO pages).

### Deployment flow (one-way)

**Local → GitHub → VPS.** Nothing you change locally is live until it is both
pushed *and* deployed. This matters most for security and auth fixes: only the
code running on the VPS has real effect. Pushing to `main` triggers `.github/workflows/deploy.yml`:

1. The workflow calls the HTTPS deploy webhook (`api/routes/deploy-webhook.js`). The webhook runs `git reset --hard origin/main`, then `deploy.sh` with `SKIP_RESTART=1`.
2. The webhook replies, then starts `scripts/pm2-apply.js` detached. A pm2 restart inside `deploy.sh` would kill the process that serves the webhook.
3. The workflow polls `/api/deploy-status` until the restart and health checks pass.
4. The workflow purges the Cloudflare cache.

Only one deploy runs at a time: the workflow has a `concurrency` group, and the webhook returns 409 while a deploy runs.

`deploy.sh` skips its slow, repo-only steps (`npm install` for `api/` and
`mcp-server/`, the GeoIP import, the Wikipedia scoring import) when their input
files are unchanged since the step last succeeded. `FORCE_FULL_DEPLOY=1` runs every step.
The sitemap, static pages, about-page date stamps, data embedding and asset stamping always run. They read the production
database, and the reset restores their tracked outputs.

The one-way rule applies in reverse too. The reset erases anything hot-fixed directly on the VPS, so mirror
every VPS fix into the local tree and push it. Files ignored by git (most of `setup/`, `.env`, `*.db`) never
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
4. Log known issues and their status in `setup/ISSUES/issues.md`.

### Definition of done

- `cd api && npm test` passes (and `mcp-server` tests if touched)
- New/changed files reflected in `frontend/sitemap.xml`; generated pages/sitemap regenerated if content types changed
- No new dependencies, no inline styles, no raw `fetch` outside the sanctioned modules, all interpolated content escaped
- Relevant spec in `setup/TESTS/` updated
- If you touched a file described in `setup/ARCHITECTURE/`: run `node setup/scripts/check-architecture-docs.js --touched` and update or delete anything it flags as stale
- Pushed to `main` — work that isn't deployed isn't done

---

## Performance & caching

### Performance rules

- ES modules stay `defer`red at the bottom of `<body>` (HTML-4).
- Images use native `loading="lazy"` or `data-src`, which `utils/lazy-load.js` swaps in (`image-display.md`).
- List and visual pages get an embedded first-paint snapshot at deploy (`npm run embed-data`). `utils/data-revalidation.js` then fetches live data and re-renders only if it differs.
- Do not add per-page CSS or JS that duplicates a shared component file.
- Measure with Lighthouse or WebPageTest against the deployed VPS, not local. An optimisation that does not move a measured number is not done.

### Cache policy

Each `Cache-Control` value lives where it is set: `deploy/nginx.conf` for static assets and HTML, `api/middleware/security-headers.js` for public `/api/` reads, and `api/middleware/auth.js` (`no-store`) for authenticated responses. Read the values there. The shape of the policy:

- Versioned JS and CSS (`/assets/js/`, `/assets/css/`) are cached immutable for a year. Their URLs change every deploy.
- Other `/assets/` files, such as images, are also cached immutable for a year at stable URLs. A replaced image needs a new filename. The exception is `/assets/images/maps/`, which revalidates and uses `?v=`.
- HTML is `max-age=60` (D-013). A Cloudflare Cache Rule honours that value for everything except `/api/*` and `/admin/*`. Each deploy purges the edge.
- `/admin/` always revalidates.

### Cache busting — the deploy-order invariant

Production order: **asset stamp → nginx reload (both inside `deploy.sh`) → pm2 restart and health check → Cloudflare purge.** The purge runs last, after the origin serves new content. A purge before that lets the edge re-cache stale bytes. A purge failure turns the CI job red on purpose. Never add `continue-on-error` to the purge step. A failed restart or health check also turns the job red.

`api/scripts/version-assets.js` runs at deploy time only, on the VPS working copy. It never runs in the committed tree. Each `git reset --hard origin/main` removes the stamp, and the next deploy applies it again. Local dev and the committed tree carry unstamped references.

**VPS prerequisite for `nginx.conf` changes to take effect:** the `deploy.sh` reload step re-reads whatever file is already at `/etc/nginx/sites-available/thejesuswebsite`. It never copies `deploy/nginx.conf` into place. That path must be a symlink to the repo's `deploy/nginx.conf` (one-time setup, see the comment at the top of that file). Without the symlink, committed header changes reload "successfully" and have no effect.

---

## Accessibility

Target: **WCAG** ([WAI overview](https://www.w3.org/WAI/standards-guidelines/wcag/)). Project-specific rules:

- Alt text for an uploaded image is stored next to the image reference in a `*_alt` column, not hard-coded (`image-display.md`).
- Each page's `<h1>` sits in the visually hidden header (`.sr-only` in `frontend/assets/css/base/invisible-header.css`). Visible headings start at `<h2>` (HTML-3).
- The global `:focus-visible` outline is in `frontend/assets/css/base/reset.css`. Component CSS that removes it must supply a replacement.
- The skip link (`.skip-link`) is styled in `invisible-header.css`. Each page template carries the `<a class="skip-link" href="#main-content">` element.
- Arbor, timeline, and maps interactions need keyboard equivalents. Their `*-interactions.js` files handle keys, and `*-keyboard.test.js` files cover them.
- Auto-dismiss durations for toasts are in `frontend/assets/js/utils/toasts.js`. `{ duration: 0 }` disables auto-dismiss.
- Test with the keyboard alone and with VoiceOver, plus a Lighthouse accessibility pass. Automated tools catch only part of the issues.
