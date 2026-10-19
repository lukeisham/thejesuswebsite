# Technical Summary

The site turns historical evidence about Jesus, entered by an admin, into public pages and interactive timelines, arbor diagrams and maps. Two functions make this work: passkey-gated editing with a draft-to-publish step, and read-only access for visitors and AI agents to published content only.

The site is **vanilla HTML, CSS, and JavaScript** with no framework and no build step. The browser code uses no third-party libraries except display assets (the Feather SVG sprite). Each Node package lists its own dependencies in its `package.json`, and the Wikipedia ranking runs a Python sidecar (`wikipedia-ranking-pipeline.md`). A new dependency needs sign-off (SR-2).

Both frontends talk to a Node.js/Express API backed by SQLite. The admin panel has visual editors for timelines, arbor (network) diagrams, and maps. Admin access uses WebAuthn passkeys only (D-016). An MCP (Model Context Protocol) server exposes published content as read-only tools for AI agents.

**This is a map, not a reference manual.** Read the *Project Map* and *Cross-module patterns* first. They show what lives where and how the parts connect. Each area with its own rules has a guide in this folder (`INDEX.md` lists them). Code rules are in `setup/Vibe_coding_rules.md`, and the dated record of each decision is in `setup/Decisions_log.md`.

---

## Project Map

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

### How the parts connect

Both frontends fetch **relative** `/api/...` URLs. In production, nginx (`deploy/nginx.conf`) serves the static files and proxies `/api/` to Express. nginx strips the `/api` prefix, so Express mounts its routes without it. `dev-proxy.js` does the same locally.

In the API, routes call models, and models run prepared SQL against one SQLite file, with no ORM. The MCP server does **not** touch the database. Its tools call the same public HTTP API (`API_BASE_URL`), so they obey the API's publishing rules. On the VPS the default `http://localhost:3000` reaches Express directly, with no `/api` prefix. A client that goes through nginx or `dev-proxy.js` must add `/api` itself.

### Cross-module patterns

Publishing (drafts, static pages, first-paint snapshots, partial saves) is in `publishing-pipeline.md`. The patterns below span the visuals, the admin and the server.

- **Public visuals are split in three.** Arbor, timeline and maps each have `*-data.js`, `*-render.js` and `*-interactions.js` in `frontend/assets/js/<visual>/`. A new public visual uses the same split. The admin editors in `admin/assets/js/admin-*/` are split by task instead (canvas, nodes, edges, zoom).
- **Admin editors reuse public code through bridges.** The modules in `frontend/assets/js/cluster-logic/` hold the placement rules for the timeline, arbor and maps (`ARCHITECTURE/timeline.md`, `arbor.md`, `maps.md`). The public pages import them. The admin pages load classic scripts, so each module that an admin script needs is published as a `window.Admin*` global by one bridge file per visual in `admin/assets/js/cluster-logic-bridge/`: `timeline-bridge.js` (timeline), `edge-path-bridge.js` (arbor) and `cluster-map-pins-bridge.js` (maps). Four rules keep the editor and the public page in step, because a break in any of them shows no error, only a different layout in the editor:
  - A bridge imports names and publishes them. It holds no function, no constant and no renamed export. A bridge with logic is a second copy of a rule.
  - In each `admin/diagrams/*.html` page, a bridge `<script>` comes before every script that reads its global, because scripts run in document order.
  - A script reads only the names that its bridge exports. A name that no bridge exports is `undefined`.
  - No file in `cluster-logic/` uses `document` or `window`, because the bridges and the node tests load these modules where there is no page.

  Adapter logic (DOM measuring, data-shape conversion) goes into the canonical module or the admin caller, never into a bridge. A change to a module's exports updates its bridge in the same commit. Guide test: `api/tests/guide-website-guide.test.js`. Behaviour test: `admin/tests/cluster-logic-bridges.test.js`.
- **The frontend and the admin stay separate (D-017).** They keep separate stylesheets and separate API clients. The frontend client returns `{ data, error }` and never throws. The admin client throws, and it sends the user to the login page on a 401. Neither side imports CSS from the other. When the two must look the same, each side writes the same spec in its own tokens.
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

### Binding documents

| File | What it governs |
|---|---|
| `setup/Vibe_coding_rules.md` | Code rules, cited throughout the codebase by stable ID (`SR-`, `JS-`, `CSS-`, `API-` and more) |
| `setup/STYLE_GUIDE/INDEX.md` | CSS and visual conventions (split by section — see the index) |
| `setup/ARCHITECTURE/INDEX.md` | The guides for each area, and the rules for writing them |
| `database/schema.sql` | The authoritative database schema |
