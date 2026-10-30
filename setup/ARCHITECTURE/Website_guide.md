# Website guide

The site turns historical evidence about Jesus, entered by an admin, into public pages and interactive timelines, arbor diagrams and maps. Two functions make this work: passkey-gated editing with a draft-to-publish step, and read-only access for visitors and AI agents to published content only.

---

## 1. Project Map

```
thejesuswebsite/
├── setup/
│   └── ARCHITECTURE/       # These guides (see INDEX.md)
├── frontend/               # Public website — static HTML, CSS, JS
│   ├── evidence/           # Detail pages, search, arbor, timeline, maps
│   ├── contextual-essays/
│   ├── debate/             # Challenges, responses, historiography, Wikipedia rankings
│   ├── resources/
│   ├── news-and-blog/
│   └── assets/             # CSS (base/components/layout/pages), JS (ES modules), images, data
├── admin/                  # CMS — passkey auth, CRUD, visual editors
│   ├── diagrams/           # Editors for Arbor, Timeline, Maps pins
│   ├── <entity>/           # One CRUD directory per content type
│   ├── tests/
│   └── assets/
├── api/                    # Express + better-sqlite3
│                           #   routes, models, middleware, config, lib, services, scripts, tests
├── database/               # Schema, migrations, seeds, the .db file
├── mcp-server/             # Read-only MCP tools that call the HTTP API
├── Wikipedia algorithm/    # Scoring data and the vector sidecar
├── public/                 # Runtime-served files — uploads/
├── deploy/                 # nginx configs
├── deploy.sh               # VPS deploy steps (deployment.md)
├── ecosystem.config.js     # pm2 process definitions
├── scripts/                # pm2-apply.js, vector store and sidecar sync
├── .github/workflows/      # deploy.yml
└── dev-proxy.js            # Local-only static server and /api proxy
```

### 1.1 How the parts connect

Both frontends fetch **relative** `/api/...` URLs. In production, nginx (`deploy/nginx.conf`) serves the static files and proxies `/api/` to Express. nginx strips the `/api` prefix, so Express mounts its routes without it. `dev-proxy.js` does the same locally.

In the API, routes call models, and models run prepared SQL against one SQLite file, with no ORM. The MCP server does **not** touch the database. Its tools call the same public HTTP API (`API_BASE_URL`), so they obey the API's publishing rules. On the VPS the default `http://localhost:3000` reaches Express directly, with no `/api` prefix. A client that goes through nginx or `dev-proxy.js` must add `/api` itself.

---

## 2. Modules

A module is a named group of files that one guide governs. Its files can sit in several top-level folders. The table below is the owner list: it assigns each file to one module and does not move any code. A module guide holds the detail, and this guide holds the links between modules (section 3).

| Module | Owns | Guide |
|---|---|---|
| Arbor | `frontend/assets/js/arbor/`, `admin/assets/js/admin-arbor/`, `api/routes/arbor.js`, `api/models/arbor.model.js` | `arbor.md` |
| Timeline | `frontend/assets/js/timeline/`, `admin/assets/js/admin-timeline/`, `admin/assets/js/admin-timeline-taxonomy.js`, `admin/assets/js/admin-era-utils.js`, `api/routes/timeline.js`, `api/models/timeline.model.js` | `timeline.md` |
| Maps | `frontend/assets/js/maps/`, `admin/assets/js/admin-maps/`, `api/routes/maps.js`, `api/models/map.model.js`, `api/lib/map-geo.js`, `api/scripts/generate-maps/`, `api/scripts/check-maps/` | `maps.md` |
| Wikipedia algorithm | Everything that fetches, classifies, scores and ranks Wikipedia articles, and hands the result to the server: `Wikipedia algorithm/`, `setup/SKILLS/!TheJesusWebsite-Wikipedia/`, `database/scoring-export.json`, `api/scripts/import-wikipedia-scoring.js`, `api/lib/vector-sidecar-client.js`, `scripts/sync-vector-stores.sh`, `scripts/sync-vector-sidecar.sh` | `wikipedia-ranking-pipeline.md` |
| Wikipedia list | The ranking as the site shows it: `frontend/assets/js/wikipedia.js`, `frontend/assets/js/utils/wikipedia-signals.js`, `frontend/debate/wikipedia.html`, `admin/wikipedia/`, `api/routes/wikipedia.js`, `api/models/wikipedia.model.js` | `wikipedia-quality-grid.md` |
| Public page scripts | One script for each public page, plus the files they all import. Pages: `about.js`, `blog-detail.js`, `blog-list.js`, `challenge-detail.js`, `debate.js`, `essay-detail.js`, `essays-list.js`, `evidence-detail.js`, `evidence-list.js`, `historiography-detail.js`, `historiography-list.js`, `news-and-blog.js`, `news-detail.js`, `news-list.js`, `resources.js`, `response-detail.js`, `responses-list.js`, `search.js`. Shared by every page: `api.js`, `cookies.js`, `donation.js`, `footer.js`, `main.js`, `seo.js`, `sidebar.js`, `sidebar_hamburger.js`, `utils/`. All sit in `frontend/assets/js/` | `publishing-pipeline.md`, `journal-article-fields.md`, `image-display.md`, `error-notification.md`, `accessibility.md`, `performance-and-caching.md` |
| ESV verses | `frontend/assets/js/esv_verse.js`, `api/routes/esv.js` | `esv-api.md` |
| Analytics | `admin/analytics.html`, `admin/assets/js/analytics.js`, `api/routes/analytics.js`, `api/models/analytics.model.js` | `analytics.md` |
| Content records | The record types (evidence, essays, responses, challenges, historiography, blog, news, resources, identifiers): their `api/routes/` and `api/models/` files and their `admin/<type>/` editors | `publishing-pipeline.md` |
| MCP server | `mcp-server/` | `mcp-server/README.md` |
| Deploy and server | `deploy.sh`, `deploy/`, `ecosystem.config.js`, `.github/workflows/`, `scripts/`, `dev-proxy.js` | `deployment.md`, `dependencies.md` |

**Collections is a future module.** Its route, model and admin folder exist (`api/routes/collections.js`, `api/models/collection.model.js`, `admin/collections/`), but it has no public page and no guide. When it is built, write its guide on the template in `INDEX.md` first, then add its row to this table.

The shared files `frontend/assets/js/cluster-logic/` belong to Arbor, Timeline and Maps together. Guide test: `api/tests/guide-website-guide.test.js` fails when a script in `frontend/assets/js/` is in no row of this table.

---

## 3. Cross-module patterns

Publishing (drafts, static pages, first-paint snapshots, partial saves) is in `publishing-pipeline.md`. The patterns below span the visuals, the admin and the server.

- **Public visuals are split in three.** Arbor, timeline and maps each have `*-data.js`, `*-render.js` and `*-interactions.js` in `frontend/assets/js/<visual>/`. A new public visual uses the same split. The admin editors in `admin/assets/js/admin-*/` are split by task instead (canvas, nodes, edges, zoom).
- **Admin editors reuse public code through bridges.** The modules in `frontend/assets/js/cluster-logic/` hold the placement rules for the timeline, arbor and maps (`ARCHITECTURE/timeline.md`, `arbor.md`, `maps.md`). The public pages import them. The admin pages load classic scripts, so each module that an admin script needs is published as a `window.Admin*` global by one bridge file per visual in `admin/assets/js/cluster-logic-bridge/`: `timeline-bridge.js` (timeline), `edge-path-bridge.js` (arbor) and `cluster-map-pins-bridge.js` (maps). Four rules keep the editor and the public page in step, because a break in any of them shows no error, only a different layout in the editor:
  - A bridge imports names and publishes them. It holds no function, no constant and no renamed export. A bridge with logic is a second copy of a rule.
  - In each `admin/diagrams/*.html` page, a bridge `<script>` comes before every script that reads its global, because scripts run in document order.
  - A script reads only the names that its bridge exports. A name that no bridge exports is `undefined`.
  - No file in `cluster-logic/` uses `document` or `window`, because the bridges and the node tests load these modules where there is no page.

  Adapter logic (DOM measuring, data-shape conversion) goes into the canonical module or the admin caller, never into a bridge. A change to a module's exports updates its bridge in the same commit. Guide test: `api/tests/guide-website-guide.test.js`. Behaviour test: `admin/tests/cluster-logic-bridges.test.js`.
- **The frontend and the admin stay separate (D-017).** They keep separate stylesheets and separate API clients. The frontend client returns `{ data, error }` and never throws. The admin client throws, and it sends the user to the login page on a 401. Neither side imports CSS from the other. When the two must look the same, each side writes the same spec in its own tokens.
- **Admin scripts keep three rules in step with code they cannot import.** Admin scripts are classic scripts, so they cannot import ES modules. `AdminEditorUtils.esc` (`admin/assets/js/admin-editor-utils.js`) must give the same output as `frontend/assets/js/utils/escape-html.js`. `AdminEditorUtils.SLUG_PATTERN` must equal the slug pattern in `api/lib/journal-field-validation.js`, or a form accepts a slug that the API refuses. `isHttpUrl` in `admin/assets/js/admin-identifiers.js` mirrors `frontend/assets/js/utils/safe-url.js`, so only http(s) URLs become links. Behaviour tests: `admin/tests/admin-editor-utils.test.js` and `admin/tests/admin-identifiers.test.js`.
- **Third-party keys stay on the server.** A new outside API follows the ESV pattern: an `api/routes/` proxy reads the key from `.env`, and the browser calls only the proxy (SR-5, `ARCHITECTURE/esv-api.md`).
- **Uploads are files, never code.** Admin uploads go through `api/routes/uploads.js` (behind `requireAuth`) into `public/uploads/`, and nginx serves that folder as static files at `/uploads/`.

## 4. Running locally

1. `cd api && npm install`
2. Create `.env` at the repo root with `NODE_ENV=development`. The API refuses to boot without an explicit `NODE_ENV` (`api/config/load-env.js`).
3. Start the API: `cd api && npm run dev` (port 3000, override with `PORT`).
4. Serve a static root with the proxy: `node dev-proxy.js frontend` or `node dev-proxy.js admin` (default root `admin`, default port 4174). It forwards `/api/*` to port 3000 and strips the prefix.
5. First passkey registration needs `SETUP_TOKEN` in `.env` and no enrolled credential (`api/routes/passkey.js`). Agents that test the admin locally use the `ADMIN_DEV_BYPASS` route instead (`api/routes/dev-bypass.js`).
6. Run tests: `cd api && npm test` and `cd mcp-server && npm test` (Node's built-in test runner). Admin and frontend tests sit beside their code (`admin/tests/`, `frontend/**/tests/`). Run them with `node --test <path>`.

Useful scripts: `npm run sitemap` (regenerate sitemap.xml), `npm run pages` (regenerate all static SEO pages).

## 5. Binding documents

| File | What it governs |
|---|---|
| `setup/Vibe_coding_rules.md` | Code rules, cited throughout the codebase by stable ID (`SR-`, `JS-`, `CSS-`, `API-` and more) |
| `setup/STYLE_GUIDE/INDEX.md` | CSS and visual conventions (split by section — see the index) |
| `setup/ARCHITECTURE/INDEX.md` | The guides for each area, and the rules for writing them |
| `database/schema.sql` | The authoritative database schema |
