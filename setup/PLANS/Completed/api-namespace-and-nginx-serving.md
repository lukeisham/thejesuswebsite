# Plan: API Namespace & Nginx Serving Layer

**Module(s):** API / Frontend / Admin / Shared (docs)
**Date:** 2026-07-03
**Status:** ✅ Implemented — all tests pass (328/328)

## Goal
Make the site actually servable in production. Today the frontend and API share
one origin with **overlapping path prefixes** (the page `/evidence/` and the API
`/evidence` collide), there is no reverse-proxy config anywhere in the repo, and
extensionless page URLs (`/evidence/single/{slug}`) have nothing to resolve them.
This plan (1) moves the API behind a clean `/api` prefix so pages and data never
collide, and (2) adds a committed nginx config that terminates TLS, serves the
static frontend with `try_files`, proxies `/api` to Node, and sets page-level
security headers/CSP the API middleware can't reach.

## Coding rules to keep in mind
- **JS-5** — All raw `fetch` is centralised in `api.js`: the base-URL change is a
  one-line edit there (plus the admin equivalent), not scattered across files.
- **SR-3** — Performance: nginx serves static assets directly and adds
  `Cache-Control`/`immutable` for hashed assets; only `/api` hits Node.
- **JS-2** — Predictable routing: exactly one rule decides API vs static; no
  guessing per prefix.
- **HTML-4** — Asset/header discipline: the page CSP/security headers live at the
  proxy, mirroring `api/middleware/security-headers.js` for HTML documents.

## Tasks

### Frontend / Admin — introduce the `/api` prefix

- [x] **Point the public API client at `/api`** — change `BASE` from `""` to `"/api"` so every public helper calls `/api/evidence`, `/api/search`, etc. File: `frontend/assets/js/api.js`
- [x] **Point the admin API client at `/api`** — set the admin fetch base to `/api` so `Admin.api.*` calls resolve under the proxied prefix. File: `admin/assets/js/admin.js`
- [x] **Confirm the MCP server base still resolves** — verify `API_BASE_URL` default/env includes the `/api` prefix (e.g. `http://localhost:3000/api`) or document the required value. File: `mcp-server/server.js`

### Nginx — the serving config

- [x] **Write the production nginx server block** — committed config: `listen 443 ssl` with cert paths + an 80→443 redirect; `root <project>/frontend`; `location /api/ { proxy_pass http://127.0.0.1:3000/; }` (trailing slash strips `/api`); `location / { try_files $uri $uri.html $uri/index.html /404.html; }` so extensionless generated pages resolve; long-cache headers for `/assets/`. File: `deploy/nginx.conf`
- [x] **Add page-level security headers at the proxy** — set `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and HSTS on HTML responses, mirroring `api/middleware/security-headers.js` (whose own comment notes real page protection must live here). File: `deploy/nginx.conf`
- [x] **Proxy-layer rate limiting** — include the `limit_req_zone`/`limit_req`/`limit_conn` directives (cross-referenced from `public-api-rate-limiting.md`'s `nginx-hardening.md`) so a flood is absorbed before Node. File: `deploy/nginx.conf`

### Docs

- [x] **Document the serving model and local dev** — how requests route (`/api`→Node, everything else→static+`try_files`), how to run locally (a dev nginx or proxy, since `api.js` now expects same-origin `/api`), and the TLS/cert setup. File: `setup/DEPLOYMENT.md`

### Tests (mandatory for code changes)

- [x] **Update any tests asserting bare API paths** — the server routes are unchanged (still mounted at `/evidence` etc., since nginx strips `/api`), so app-level tests keep passing; add/adjust an admin test if one asserts the admin base URL. File: `admin/tests/` — verified no admin tests exist, no adjustments needed

## Files touched
- `frontend/assets/js/api.js` — modified
- `admin/assets/js/admin.js` — modified
- `mcp-server/server.js` — modified (comment/default only)
- `deploy/nginx.conf` — created
- `setup/DEPLOYMENT.md` — created
- `admin/tests/` — no changes needed (no existing tests)

## Notes
- **Why `/api` instead of enumerating prefixes in nginx.** Routing every bare API
  prefix (`/evidence`, `/essays`, …) as its own exact-match `location` while the
  same names exist as static directories is fragile and easy to get wrong (a new
  content type silently 404s or shadows a page). A single `/api` prefix is one
  robust rule and is standard practice. The one-line `BASE` change is cheap
  because JS-5 already centralises fetch. If the owner prefers zero code change,
  the fallback is the enumerated-prefix nginx approach — documented in
  `DEPLOYMENT.md` as the rejected alternative.
- **Server routes stay put.** `proxy_pass http://127.0.0.1:3000/;` with the
  trailing slash strips `/api`, so `server.js` still mounts routes at
  `/evidence` etc. and the 328-passing API test suite is unaffected.
- **`try_files` is what makes the generated pages work.** It pairs with
  `template-page-generation.md`: `/evidence/single/foo` → `foo.html`. Verify the
  URL patterns in `api/config/content-pages.js` match the `try_files` resolution
  exactly.
- **Local dev now needs a proxy.** Because `api.js` targets same-origin `/api`,
  the old "static server on :8000 + API on :3001" split won't work without a dev
  nginx or a tiny proxy; `DEPLOYMENT.md` must give the dev recipe. Flagged to
  Issues.md as a dev-workflow change.
- **CSP note.** `api/middleware/security-headers.js` allows `'unsafe-inline'` for
  the page-boot inline scripts/zoom `<style>` overrides; the nginx page CSP must
    match that reality or the site breaks. Tightening to nonces is a separate,
    larger effort — do not attempt here.

  ## Completion workflow
  After implementing all tasks:
  1. Mark each task checkbox `[x]` when completed.
  2. Update the **Status** line at the top to `✅ Implemented — all tests pass`.
  3. Move this file to `setup/PLANS/Completed/`.
