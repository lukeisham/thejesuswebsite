# Plan: Deploy, Memory & Response Hygiene

**Module(s):** Database / API
**Date:** 2026-07-02
**Status:** ✅ Plan generated — ready for implementation

## Goal
Fix five operational gaps found during review. First, `deploy.sh` never actually applies `database/migrations/*.sql` — it just re-pipes `schema.sql` (which is itself frozen at the pre-`002_auth_credential_updates.sql` state), so both fresh installs and existing-DB upgrades silently miss `last_used_at`/`idx_credentials_user_handle`. This plan introduces a `schema_migrations` tracking table so `deploy.sh` applies each migration file exactly once, mirroring the pattern already proven in `api/tests/helpers/db.js`. Second, the rate-limiter and session stores in `api/middleware/` are unbounded in-memory `Map`s that only shrink when their exact key is looked up again — this plan adds a periodic `.unref()`'d sweep to each. Third, `security-headers.js` sends `Cache-Control: no-store` on every response including public content and `/uploads`, forcing every visitor to re-download everything — this plan scopes `no-store` to genuinely authenticated responses and lets public GETs and uploaded files cache. Fourth, no response carries a Content-Security-Policy. Fifth, `express.json()`'s default 100 KB body limit can reject a long essay save, and that rejection currently surfaces as a generic 500 instead of a 4xx.

## Coding rules to keep in mind
- **JS-2** — `deploy.sh` must fail loudly (not silently) if a migration can't apply; the sweeps must remove exactly expired entries, never live ones; body-parser failures must map to a predictable 4xx, not fall through to a generic 500.
- **JS-4** — the CSP's `'unsafe-inline'` allowance needs a one-line "why" comment (it exists because of a deliberate, pre-existing pattern, not an oversight) — see Notes.
- **SR-1** — each task stays scoped to one file or one clearly-bounded change; unrelated fixes (deploy/migrations, memory sweeps, response headers, body limits) are separate task groups even though they land in one plan.
- **SR-2** — no new dependency for any fix (bash + sqlite3 CLI already required by `deploy.sh`; `setInterval` and `express.json`'s bundled `body-parser` are already in place).
- **SR-3** — the sweeps run on a coarse interval, not per-request; scoping `no-store` correctly is itself a performance fix (real caching for public content and uploads).

## Tasks

### Database

- [ ] **Add a `schema_migrations` tracking table** — `CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);` near the other AUTH & ANALYTICS tables. Apply the identical edit to `database/migrations/001_initial.sql` so it stays byte-identical to `schema.sql`, matching the convention `api/tests/helpers/db.js` already relies on (it treats `001_initial.sql` as a duplicate of the base schema and skips it when applying migrations). Files: `database/schema.sql`, `database/migrations/001_initial.sql`
- [ ] **Make `002_auth_credential_updates.sql`'s index creation idempotent** — change `CREATE INDEX idx_credentials_user_handle` to `CREATE INDEX IF NOT EXISTS idx_credentials_user_handle`. (The `ALTER TABLE ADD COLUMN` above it has no `IF NOT EXISTS` form in SQLite; the `schema_migrations` table is what prevents that line from ever re-running, not this guard — see Notes.) File: `database/migrations/002_auth_credential_updates.sql`

### Deploy

- [ ] **Rewrite `deploy.sh`'s schema step to track and apply migrations** — ensure `schema_migrations` exists (`CREATE TABLE IF NOT EXISTS`, defensive for databases that pre-date this system), apply `schema.sql` only when the database file is newly created this run, then apply every `database/migrations/*.sql` file in sorted order — excluding `001_*` — whose filename is not yet present in `schema_migrations`, recording each filename immediately after it applies successfully. Remove the now-inaccurate "idempotent via --bail + CREATE IF NOT EXISTS" comment. File: `deploy.sh`

### API — Memory Hygiene

- [ ] **Add a periodic eviction sweep to the rate limiter** — inside `createRateLimiter`, start a `setInterval` (period = `windowMs`) that deletes every `store` entry whose `resetAt` has passed; call `.unref()` on the returned timer so it never blocks process exit or test teardown. Expose the sweep as `rateLimit._evictExpired` on the returned middleware function for direct testing. File: `api/middleware/rate-limit.js`
- [ ] **Add a periodic eviction sweep to the session store** — in `api/middleware/auth.js`, start an hourly `setInterval` that deletes every `sessions` entry whose `expiresAt` has passed; `.unref()` the timer. Export the sweep as `module.exports._evictExpired`, alongside the existing session helpers. File: `api/middleware/auth.js`

### API — Response Caching & Security Headers

- [ ] **Scope `Cache-Control` by method instead of blanket `no-store`** — in `api/middleware/security-headers.js`, set `Cache-Control: public, max-age=60` for `GET`/`HEAD` requests and `Cache-Control: no-store` for every other method (mutating requests are never cacheable regardless of path). This is a default only — later middleware in the chain (see the next two tasks) can still overwrite it per response. File: `api/middleware/security-headers.js`
- [ ] **Set `no-store` from `requireAuth` itself, overriding the public default** — add `res.setHeader('Cache-Control', 'no-store')` at the top of `requireAuth` in `api/middleware/auth.js`, before the token check, so it fires on both the 401 and success paths. Every genuinely admin-gated route in this codebase — including the `/admin` and `/admin/:id` sub-routes nested under otherwise-public mounts (`evidence`, `essays`, `responses`, `blog-posts`, `historiography`, `popular-challenges`, `academic-challenges`, `about`) — already goes through `requireAuth`, so this correctly overrides the new public default without needing a path-prefix allowlist. File: `api/middleware/auth.js`
- [ ] **Explicitly no-store `GET /auth/me`** — it reveals session state without going through `requireAuth` (it reads the token manually); add `res.setHeader('Cache-Control', 'no-store')` directly in the handler so a shared cache can never serve one visitor's authentication state to another. File: `api/routes/auth.js`
- [ ] **Give uploaded files a real cache lifetime** — pass `{ maxAge: '7d' }` to the `express.static` call serving `/uploads` in `api/server.js`, overriding the new `public, max-age=60` default with a lifetime appropriate for rarely-changing uploaded images. File: `api/server.js`
- [ ] **Add a Content-Security-Policy header to every API response** — `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. File: `api/middleware/security-headers.js`

### API — Body Limits

- [ ] **Raise the JSON body limit and map body-parser errors to real status codes** — change `express.json()` to `express.json({ limit: '1mb' })` in `api/server.js`, and in the centralised error handler, check `error.type` before falling through to 500: `'entity.too.large'` → 413 `"Request body too large."`, `'entity.parse.failed'` → 400 `"Malformed JSON body."`. File: `api/server.js`

### Tests

- [ ] **Add eviction tests for the rate limiter** — manipulate a stored entry's `resetAt` into the past, call `_evictExpired()` directly (no real timers), and assert the expired IP is removed while a live IP's counter is untouched. File: `api/tests/rate-limit.test.js`
- [ ] **Add eviction tests for sessions** — create a session, manipulate its `expiresAt` into the past via the store, call `_evictExpired()` directly, and assert `getSession` no longer finds it while a second, live session is untouched. File: `api/tests/auth.test.js`
- [ ] **Update the security-headers test for the new Cache-Control rule** — replace the "sets the four standard security headers" assertion (which currently expects `cache-control === 'no-store'` unconditionally) with a `GET` case (`public, max-age=60`) and a `POST` case (`no-store`); add a case asserting the `Content-Security-Policy` header is present with `default-src 'self'`. File: `api/tests/auth.test.js`
- [ ] **Test that `requireAuth` sets `no-store` on both outcomes** — extend the existing `requireAuth middleware` block to assert `Cache-Control: no-store` on both the 401 path and the authenticated-success path, overriding whatever `security-headers.js` set. File: `api/tests/auth.test.js`
- [ ] **Test `GET /auth/me`'s no-store header and the body-limit/error-mapping behavior** — mount `routes/auth.js` to assert the `/me` response always carries `Cache-Control: no-store`; mount `server.js`'s JSON middleware + error handler to assert a request over 1MB returns 413 with a JSON error body (not a raw 500), and malformed JSON returns 400 with a JSON error body. File: `api/tests/body-limits.test.js`

## Files touched
- `database/schema.sql` — modified
- `database/migrations/001_initial.sql` — modified
- `database/migrations/002_auth_credential_updates.sql` — modified
- `deploy.sh` — modified
- `api/middleware/rate-limit.js` — modified
- `api/middleware/auth.js` — modified
- `api/middleware/security-headers.js` — modified
- `api/routes/auth.js` — modified
- `api/server.js` — modified
- `api/tests/rate-limit.test.js` — modified
- `api/tests/auth.test.js` — modified
- `api/tests/body-limits.test.js` — created

## Notes
- **This repo's own `database/thejesuswebsite.db` is already drifted**: `.schema credentials` shows `last_used_at` and `idx_credentials_user_handle` were applied by hand at some point, with no record of it. The first time the fixed `deploy.sh` runs against this file, it will try to re-run `002_auth_credential_updates.sql`, and `ALTER TABLE ADD COLUMN last_used_at` will fail with "duplicate column name" (fatal, since `deploy.sh` uses `set -euo pipefail`). Before running the fixed script against this or any already-drifted database, manually run `sqlite3 database/thejesuswebsite.db "INSERT INTO schema_migrations(filename) VALUES ('002_auth_credential_updates.sql')"` (after creating the tracking table) to mark it pre-applied. This is a one-time manual backfill; every deploy after it is fully hands-off.
- `schema.sql` and `database/migrations/001_initial.sql` were confirmed byte-identical before this plan (`diff` returns nothing) — keep them identical after editing both, since `api/tests/helpers/db.js` depends on that equivalence to skip `001_*` when replaying migrations.
- The rate-limiter sweep interval is `windowMs` per limiter instance (each route's limiter has its own `store` and its own sweep) — acceptable given the small number of limiter instances in this codebase (SR-3: no shared global timer needed).
- **`'unsafe-inline'` is required for `script-src` and `style-src`, and this CSP header does not fully protect against the `innerHTML` risk that motivated it.** The site's page-boot `<script>` blocks and zoom-variant inline `<style>` overrides are a deliberate, documented pattern used across 40+ HTML files in `frontend/` and `admin/` (see Website_guide.md's "ES modules with `defer`" and CSS custom-properties notes) — tightening `script-src`/`style-src` to drop `'unsafe-inline'` would break all of them and requires migrating every inline boot script to an external file or a nonce scheme first. More importantly, **this API server does not serve `frontend/`'s or `admin/`'s HTML pages at all** (per Website_guide.md's "Getting Started", they're served by a separate static file server) — so a CSP header set here only protects direct API/JSON consumers, not the actual pages where API-sourced content gets injected via `innerHTML`. Real protection for those pages requires a `<meta http-equiv="Content-Security-Policy">` tag (or reverse-proxy header) on the HTML documents themselves, which is a separate, much larger piece of work spanning dozens of files — out of scope here. This task still adds real, if partial, value and should not be skipped while that larger piece is undecided.
- The credential-delete lockout bug (counting the session's handle instead of the target credential's handle) and the `analytics.js` `err.message` → `innerHTML` XSS spot are already fixed by `passkey-webauthn-hardening.md` and `fix-admin-analytics-dashboard.md` respectively — not duplicated here.
- No sitemap changes beyond adding `api/tests/body-limits.test.js` to `sitemap.md`.
