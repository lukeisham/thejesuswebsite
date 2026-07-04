# Plan: Public API Rate Limiting & Flood Protection

**Module(s):** API / Frontend / Shared (docs)
**Date:** 2026-07-03
**Status:** ✅ Implemented — all tests pass (317/317)

## Goal
Protect the public read endpoints from being flooded by abusive agents or
scrapers. Today the auth (passkey) and analytics-POST routes are rate-limited,
but **every public GET content endpoint — including the FTS-backed `/search` —
is unthrottled**. This plan applies the existing in-memory limiter to the public
content routes (with a tighter budget for `/search`), documents the nginx-layer
limits that are the real defense against a flood, and adds polite-bot hints to
`robots.txt`. It reuses the existing `createRateLimiter` middleware — no new
dependency (SR-2).

## Coding rules to keep in mind
- **SR-2** — Dependencies are for visual libraries only: reuse
  `api/middleware/rate-limit.js` (Node built-ins); do **not** add
  `express-rate-limit` or similar.
- **SR-3** — Performance is non-negotiable: the limiter is O(1) per request; its
  purpose is to keep a flood from reaching SQLite/FTS. The limits must be
  generous enough never to affect a real visitor's normal browsing.
- **JS-2** — Robust & Predictable: over-limit requests return a clear `429` JSON
  body (matching the existing limiter), never a silent drop.
- **JS-3** — Modern & Simple: one shared limiter instance for the read budget
  plus one stricter instance for search — no new abstraction layer.
- **JS-4** — Comments explain *why*: note why `/search` is stricter and why
  `/health` is exempt.

## Tasks

### API — apply the shared read limiter

- [x] **Instantiate a shared public-read limiter and apply it to the content routes** — in `server.js`, create one `publicReadLimit = rateLimit({ maxAttempts: 300, windowMs: 60_000 })` and pass it as middleware on each public content mount (`/evidence`, `/arbor`, `/identifiers`, `/essays`, `/popular-challenges`, `/academic-challenges`, `/historiography`, `/responses`, `/wikipedia`, `/maps`, `/blog-posts`, `/news-articles`, `/collections`, `/resources`, `/timeline`, `/search`, `/sources`, `/about`). One shared instance = one per-IP budget across all read endpoints. File: `api/server.js`
- [x] **Keep infrastructure and already-limited routes exempt** — do **not** apply `publicReadLimit` to `/health` (uptime monitor), `/uploads` (static), or the routes that already carry their own limiters (`/auth`, `/passkey`, `/analytics`). File: `api/server.js`

### API — stricter limit for the expensive endpoint

- [x] **Add a tighter per-IP limit to `/search`** — inside the search route, add `searchLimit = rateLimit({ maxAttempts: 60, windowMs: 60_000 })` on the `GET /` handler (in addition to the global read budget), because full-text search fans out across four FTS tables and is the most expensive and most abuse-attractive endpoint. File: `api/routes/search.js`

### Frontend — polite-bot hints

- [x] **Add crawl hints to `robots.txt`** — add a `Crawl-delay: 5` directive (advisory; honored by Bing/others, ignored by Google) and confirm the existing `Sitemap:` line points at the generated sitemap. Note in a comment that this is advisory only and not a substitute for the server/nginx limits. File: `frontend/robots.txt`

### Docs — the real flood defense (nginx)

- [x] **Document nginx rate/connection limiting** — a deployment note with a ready-to-paste `limit_req_zone` + `limit_req` (e.g. 10 req/s with burst) and `limit_conn` snippet for the reverse proxy, since the in-process limiter still costs a Node request cycle per hit and resets on deploy. The nginx layer is what actually absorbs a flood before it reaches the app. File: `setup/nginx-hardening.md`

### API — tests (mandatory for `api/` changes)

- [x] **Test the public read + search limits are wired** — an HTTP-level test (same `node:http`-against-the-app pattern as `body-limits.test.js`) asserting that a public content route and `/search` return `429` after their thresholds, and that `/health` is never limited. File: `api/tests/public-rate-limit.test.js`

## Files touched
- `api/server.js` — modified
- `api/routes/search.js` — modified
- `frontend/robots.txt` — modified
- `setup/nginx-hardening.md` — created
- `api/tests/public-rate-limit.test.js` — created

## Notes
- **Reuse, don't rebuild.** `api/middleware/rate-limit.js` already does exactly
  what's needed (per-IP `Map`, 429, hourly sweep, `.unref()`); `passkey.js` and
  `analytics.js` are the reference call-sites. This plan just extends that same
  pattern to the read routes.
- **`trust proxy` is already set** (`server.js` → `app.set("trust proxy", 1)`),
  so `req.ip` is the real client IP behind nginx — the limiter keys correctly.
  Do **not** raise the trust-proxy value without reason; a too-permissive setting
  lets a client spoof `X-Forwarded-For` and evade the per-IP limit.
- **One shared instance = one shared budget.** Passing the *same*
  `publicReadLimit` function to every content mount means all read endpoints draw
  from a single per-IP counter — that's intended. `/search` additionally has its
  own separate counter via `searchLimit`.
- **Tune the numbers to real traffic.** 300 read req/min and 60 search req/min
  are deliberately generous starting points (a normal page load fires only a
  handful of API calls). Watch the analytics/logs after launch and tighten if
  needed; consider making the limits env-configurable if they need frequent
  tuning, but keep hardcoded sane defaults (JS-3).
- **In-memory limits are per-process and reset on deploy.** This is fine for the
  current single-instance pm2 setup (`deploy.sh` runs `pm2 start server.js`, not
  cluster mode). If the app is ever scaled to multiple workers/instances, each
  gets its own store and the effective limit multiplies by the worker count —
  at that point the nginx layer (or a shared store) becomes the authoritative
  limit. Logged to `Issues.md` as a scaling caveat.
- **Layered defense.** The app-level limiter stops casual/accidental hammering
  and protects the DB; the nginx `limit_req`/`limit_conn` layer is what actually
  absorbs a determined flood before it spends a Node cycle. `robots.txt` only
  affects well-behaved bots. All three are complementary, not alternatives.

## Completion workflow
After implementing all tasks:
1. Mark each task checkbox `[x]` when completed.
2. Update the **Status** line at the top to `✅ Implemented — all tests pass`.
3. Move this file to `setup/PLANS/Completed/`.
