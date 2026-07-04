## Tests: Auth Security Foundation
**Plan:** auth-security-foundation.md
**Date:** 2026-06-24

### Manual checks
- [ ] `curl -I http://localhost:3000/health` — response includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: no-store`
- [ ] `curl -I http://localhost:3000/health` with `NODE_ENV=production` — response includes `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `curl -I http://localhost:3000/health` with `NODE_ENV` unset — response does NOT include `Strict-Transport-Security`
- [ ] Login on `localhost` (HTTP, `NODE_ENV=development`) — cookie is set without `Secure` flag
- [ ] Login on production (HTTPS, `NODE_ENV=production`) — cookie is set with `Secure` flag
- [ ] Call `POST /passkey/register/options` with `{ "handle": "Admin " }` — handle is lowercased and trimmed to `admin`
- [ ] Call `POST /passkey/register/options` with `{ "handle": "admin<script>" }` — returns 400 (invalid characters)
- [ ] Call `POST /passkey/register/options` with `{ "handle": "" }` — returns 400 (empty)
- [ ] Call `POST /passkey/register/options` with a 65-character handle — returns 400 (too long)
- [ ] After successful login, inspect the session in server memory — `createdAt` is a valid timestamp within the last few seconds

### JS / HTML / SQL checks
- [ ] No `innerHTML` with user data (JS-6) — passkey.js uses `textContent` or safe DOM methods for error messages
- [ ] CSS values reference custom properties, not hardcoded values (CSS-2)
- [ ] `security-headers.js` handles `process.env.NODE_ENV` safely — no crash if unset
- [ ] `validateHandle` returns the sanitised handle, does not mutate in place
- [ ] All `try/catch` blocks in passkey routes still function after changes

## Tests: Auth Registration Protection
**Plan:** auth-registration-protection.md
**Date:** 2026-06-24

### Manual checks
- [ ] Start server with `SETUP_TOKEN=test123` — `POST /passkey/register/options` without token returns 404
- [ ] `POST /passkey/register/options` with `x-setup-token: test123` returns 200 + challenge
- [ ] `POST /passkey/register/options?setupToken=test123` returns 200 + challenge
- [ ] After registering a credential, `POST /passkey/register/options` with correct token returns 404 (credential already exists)
- [ ] Start server without `SETUP_TOKEN` — all `/passkey/register/*` endpoints return 404
- [ ] Hit `POST /passkey/login/options` 11 times within 60 seconds — 11th request returns 429
- [ ] Hit `POST /passkey/login/verify` 6 times within 60 seconds — 6th request returns 429
- [ ] Wait 61 seconds after being rate limited — request succeeds again
- [ ] `credentialModel.countAll()` returns 0 on a fresh database
- [ ] `credentialModel.countAll()` returns 1 after one registration
- [ ] Run `cd api && node --test tests/setup-token.test.js` — all tests pass
- [ ] Run `cd api && node --test tests/rate-limit.test.js` — all tests pass

### JS / HTML / SQL checks
- [ ] No `innerHTML` with user data (JS-6)
- [ ] `requireSetupToken` never returns different status codes for different failure reasons (always 404)
- [ ] Rate limiter uses `req.ip` — verify it's the real client IP, not 127.0.0.1 (check `trust proxy` is set)
- [ ] Rate limiter `Map` is cleaned up by window expiry — no unbounded memory growth
- [ ] `countAll()` SQL uses no string concatenation — parameterised or hardcoded query
- [ ] New SQL uses parameterised queries, not string concatenation

## Tests: Auth Credential Management
**Plan:** auth-credential-management.md
**Date:** 2026-06-24

### Manual checks
- [ ] `GET /passkey/credentials` (authenticated) returns array with correct shape: `[{ id, credential_id, user_handle, sign_count, last_used_at }]`
- [ ] `GET /passkey/credentials` response never includes `public_key`
- [ ] `GET /passkey/credentials` (unauthenticated) returns 401
- [ ] `DELETE /passkey/credentials/1` (authenticated, >1 credential exists) returns 204
- [ ] `DELETE /passkey/credentials/1` (only one credential exists) returns 400 with error message
- [ ] `DELETE /passkey/credentials/1` (unauthenticated) returns 401
- [ ] `DELETE /passkey/credentials/999` (non-existent id) returns 404
- [ ] After successful login, `last_used_at` on the credential is updated to current timestamp
- [ ] `SELECT * FROM credentials` — `last_used_at` column exists with ISO 8601 values
- [ ] `SELECT * FROM sqlite_master WHERE type='index' AND name='idx_credentials_user_handle'` — index exists
- [ ] Run `cd api && node --test tests/credential-management.test.js` — all tests pass

### JS / HTML / SQL checks
- [ ] GET endpoint maps fields explicitly — no `SELECT *`
- [ ] DELETE endpoint validates `id` is a positive integer
- [ ] DELETE endpoint guard uses `countByUserHandle(req.user.handle)`, not a hardcoded handle
- [ ] Migration SQL is idempotent — safe to run multiple times (use `IF NOT EXISTS`)
- [ ] New SQL uses parameterised queries, not string concatenation

## Validation: Auth Testing & Apple Passkey Association
**Plan:** auth-testing-and-apple-association.md
**Date:** 2026-06-24

### Manual checks
- [ ] Run `cd api && node --test tests/auth*.test.js` — all tests pass
- [ ] Run `cd api && node --test tests/passkey*.test.js` — all tests pass
- [ ] Run `cd api && node --test tests/credential.model*.test.js` — all tests pass
- [ ] `curl http://localhost:3000/.well-known/apple-app-site-association` — returns `{"webcredentials":{"apps":[]}}` with `Content-Type: application/json`
- [ ] `curl -I http://localhost:3000/.well-known/apple-app-site-association` — response is 200, not behind auth middleware (no 401)
- [ ] File exists at `frontend/.well-known/apple-app-site-association` with correct content

### Code-review checks
- [ ] Test helper `createTestDb()` uses `:memory:` SQLite — no real database touched
- [ ] Each test suite creates a fresh database — no shared state between test files
- [ ] Rate limiter tests clear the in-memory `Map` in `beforeEach()`
- [ ] Environment variables (`SETUP_TOKEN`, `NODE_ENV`, `RP_ID`) are set in `beforeEach()` and restored in `afterEach()`
- [ ] Tests use only `node:test` + `node:assert` — no Jest, Mocha, or Vitest (SR-2)
- [ ] Apple association route is placed before auth middleware in `server.js`
- [ ] Apple association file uses `res.sendFile()`, not `fs.readFileSync()` or string concatenation
- [ ] `api/package.json` `test:auth` script uses glob patterns that match all test files

## Validation: Complete Backend Data Layer
**Plan:** complete-backend-data-layer.md
**Date:** 2026-06-29

### Manual checks
- [ ] Run `cd api && node --test tests/auth-guard.test.js` — every write route 401s without a session, succeeds with one
- [ ] Run `cd api && node --test tests/relations.test.js` — child-rows + junctions round-trips pass
- [ ] Run `cd api && node --test tests/evidence.test.js` — evidence composite CRUD passes
- [ ] Run `cd api && node --test tests/journal-content.test.js` — responses/essays/blog/historiography composite CRUD passes
- [ ] Run `cd api && node --test tests/sources-about.test.js` — mla_sources + about CRUD passes
- [ ] `curl -X POST http://localhost:3000/evidence -H 'Content-Type: application/json' -d '{"title":"x","slug":"x"}'` with NO session cookie — returns 401 (was previously 201)
- [ ] `GET /evidence/<slug>` returns the base row PLUS `pictures`, `sources`, `identifiers`, and linked evidence/context arrays
- [ ] `GET /evidence/admin/:id` returns a draft (published_draft = 0) item; public `GET /evidence/:slug` still 404s for that same draft
- [ ] Create an evidence item with pictures + sources in one POST, then DELETE it — no orphaned rows remain in `evidence_pictures` / `evidence_mla_sources` (FK CASCADE + transaction)
- [ ] `GET /sources` and `GET /about` return data; their POST/PUT/DELETE require a session
- [ ] After updating an evidence title, `SELECT * FROM evidence_fts WHERE title MATCH 'newtitle'` finds it (FTS triggers still fire)

### Code-review checks
- [ ] SR-1 — SQL stays in models, HTTP stays in routes; child-rows and junctions are separate files
- [ ] SR-2 — no new dependency added; only `better-sqlite3` + `node:test` used
- [ ] SR-3 — composite create/update wrapped in a single `db.transaction()`; one prepared statement per child table, no N+1 loops issuing per-row queries
- [ ] JS-2 — writable columns whitelisted; unauthenticated writes 401; unknown ids 404; unknown link targets rejected, not silently dropped
- [ ] JS-4 — JSDoc on new public model functions explains why composite writes are transactional
- [ ] JS-5 — routes use synchronous `try/catch` around model calls (no promises); matches existing route style
- [ ] Public `getBySlug` retains its `published_draft = 1` filter; only `getAdminById` ignores publish state
- [ ] Tests use `:memory:` SQLite, a fresh DB per suite, and `node:test` + `node:assert` only (no Jest/Mocha/Vitest)

---

## Validation: Maps API
**Plan:** maps-api.md
**Date:** 2026-06-29

### Manual checks
- [ ] Run `cd api && node --test tests/maps.test.js` — model + pin-route CRUD passes
- [ ] After loading `database/seed.sql`, `GET /maps` returns the five maps (roman-empire, levant, judea, galilee, jerusalem) each with a `pin_count`
- [ ] `GET /maps/galilee` returns the map row plus an embedded `pins` array (and is NOT shadowed by the `/pins` routes)
- [ ] `GET /maps/pins/by-map/1` returns pins for map id 1
- [ ] `POST /maps/pins -d '{"map_id":1,"x":10,"y":20,"label":"Capernaum"}'` with a session cookie returns 201 with the created pin (incl. `evidence_title`/`evidence_slug` when linked)
- [ ] `POST /maps/pins` with NO session cookie returns 401
- [ ] `POST /maps/pins -d '{}'` (missing `map_id`/`x`/`y`) returns 400, not a 500
- [ ] `PUT /maps/pins/99999` and `DELETE /maps/pins/99999` (unknown id) return 404
- [ ] Delete an evidence row that a pin links to — the pin survives with `evidence_id` set to NULL (ON DELETE SET NULL)
- [ ] Delete a map — its pins are removed (ON DELETE CASCADE), no orphans in `map_pins`

### Code-review checks
- [ ] SR-1 — new pin SQL stays in `map.model.js` (already present); `maps.js` only parses input, calls the model, shapes the response
- [ ] JS-2 — pin create validates `map_id`/`x`/`y`; unknown ids 404; write routes 401 without a session
- [ ] JS-5 — pin route handlers use the same synchronous `try/catch` style as the existing map routes
- [ ] **Route ordering** — every `/pins…` route is declared ABOVE `GET /:map_key`, with a one-line "why" comment (JS-4)
- [ ] Tests use `:memory:` SQLite, a fresh DB per suite, and `node:test` + `node:assert` only
- [ ] No duplicate `requireAuth` edit to the existing `POST/PUT/DELETE /maps` routes (owned by complete-backend-data-layer.md)

---

## Validation: Fix Admin Analytics Dashboard (API)
**Plan:** fix-admin-analytics-dashboard.md
**Date:** 2026-07-02

### Manual checks
- [ ] `curl http://localhost:3000/analytics` with no session cookie — returns 401 (not 404)
- [ ] `curl http://localhost:3000/analytics -H 'Cookie: sid=<valid>'` — returns 200 with a body shaped `{ stats: [...], pageViews: [...], referrers: [...] }`
- [ ] `GET /analytics?days=7`, `?days=30`, `?days=90` — each returns 200; `?days=45` returns 400
- [ ] Each `stats` entry has `{ label, value }`; labels are "Total Page Views", "Unique Sessions", "Top Page", "Top Referrer"
- [ ] Each `pageViews` row has `{ page, views, unique, trend }` where `trend` is a zero-filled array with one entry per day in the selected range
- [ ] Each `referrers` row has a `count` field (not `views`) matching `GET /analytics/top-referrers`
- [ ] Run `cd api && node --test tests/analytics.model.test.js` — all tests pass
- [ ] Run `cd api && node --test tests/auth-guard.test.js` — `GET /analytics` case included and passing

### Code-review checks
- [ ] SR-1 — SQL for `getTopPagesWithTrend` lives in `analytics.model.js`; `routes/analytics.js` only composes the response
- [ ] JS-2 — `days` is validated against the `[7, 30, 90]` allow-list, not silently clamped
- [ ] JS-5 — the route uses the same synchronous `try/catch` style as the existing analytics routes
- [ ] `getTopPagesWithTrend` uses parameterised queries, not string concatenation, for the date range
- [ ] No N+1 query blow-up beyond the bounded top-5 trend lookups (SR-3)

---

## Validation: Passkey / WebAuthn Verification Hardening
**Plan:** passkey-webauthn-hardening.md
**Date:** 2026-07-02

### Manual checks
- [ ] With `ORIGIN` unset, complete a login ceremony from `http://localhost:8001` — succeeds (dev behavior unchanged)
- [ ] With `ORIGIN=https://thejesuswebsite.org` set, replay a captured `clientDataJSON` with a different `origin` value — `POST /passkey/login/verify` returns 401, not 200
- [ ] Tamper with `authenticatorData` so its first 32 bytes no longer hash-match `RP_ID` — login returns 401
- [ ] Clear the user-present bit in a captured `authenticatorData` flags byte and replay — login returns 401
- [ ] Issue a login challenge for handle `admin`, then attempt `login/verify` with a credential belonging to a different handle reusing that challenge — request fails (challenge is bound to the credential, not the request body's handle)
- [ ] Seed a session with 3 credentials and a second handle with exactly 1 credential — `DELETE /passkey/credentials/:id` for the second handle's sole credential returns 400
- [ ] Run `cd api && node --test tests/passkey.test.js` — origin-check cases pass
- [ ] Run `cd api && node --test tests/credential-management.test.js` — cross-handle lockout regression test passes
- [ ] Run `cd api && node --test tests/*.test.js` — full suite still passes (no regressions in existing WebAuthn flows)

### Code-review checks
- [ ] JS-2 — every new check rejects outright (401/400); none silently downgrade or log-and-continue
- [ ] JS-4 — the rpIdHash offset and user-present bit check carry a one-line "why", not a "what" comment
- [ ] SR-2 — no new dependency added; only `crypto` and buffer slicing used
- [ ] `verifyClientData`'s origin check is skipped (not failed) when `expectedOrigin` is `null`, preserving local dev
- [ ] The delete-lockout fix reads `credential.user_handle`, not `req.user.handle`, in the count check
- [ ] `RP_ID` / `ORIGIN` handling has no hardcoded production domain committed to source

---

## Validation: Deploy, Memory & Response Hygiene
**Plan:** deploy-migrations-and-memory-hygiene.md
**Date:** 2026-07-02

### Manual checks
- [ ] `rm -f /tmp/fresh.db && sqlite3 /tmp/fresh.db < database/schema.sql && sqlite3 /tmp/fresh.db "PRAGMA table_info(credentials)"` — before this plan, `last_used_at` is absent; confirm the plan's schema.sql edit does NOT add it directly (it stays migration-only) but DOES add `schema_migrations`
- [ ] Run the rewritten `deploy.sh` against a brand-new `DB_FILE` path — the resulting database has `credentials.last_used_at`, `idx_credentials_user_handle`, and a `schema_migrations` row for `002_auth_credential_updates.sql` (not for `001_initial.sql`)
- [ ] Manually backfill `database/thejesuswebsite.db`'s `schema_migrations` per the plan's Notes, then run the rewritten `deploy.sh` against it — completes without error (no "duplicate column name")
- [ ] Run the rewritten `deploy.sh` a second time immediately after a successful run — completes without error and applies nothing new (true idempotency, not just an inaccurate comment)
- [ ] `sqlite3 <db> "select * from schema_migrations"` — no row exists for `001_initial.sql`
- [ ] Run `cd api && node --test tests/rate-limit.test.js` — eviction test passes
- [ ] Run `cd api && node --test tests/auth.test.js` — eviction test passes
- [ ] Start `node server.js`, wait past one rate-limit window after a burst of requests, then inspect `rateLimit._evictExpired`'s effect — expired IP entries are gone (verify via a temporary `console.log` or debugger, not a new endpoint)
- [ ] `node --test tests/*.test.js` (full suite) — no hang after the last test (confirms `.unref()` on both new timers; a run that never exits means a timer is keeping the process alive)

### Code-review checks
- [ ] JS-2 — `deploy.sh` still uses `set -euo pipefail`; a failed migration aborts the deploy rather than continuing silently
- [ ] SR-2 — no new dependency introduced (bash/sqlite3 CLI and `setInterval` only)
- [ ] `database/schema.sql` and `database/migrations/001_initial.sql` remain byte-identical (`diff database/schema.sql database/migrations/001_initial.sql` → no output)
- [ ] `deploy.sh`'s migration loop sorts filenames before applying (so a future `003_*.sql` always runs after `002_*.sql`)
- [ ] Rate-limiter and session sweep intervals are `.unref()`'d — grep confirms `.unref()` appears immediately after each new `setInterval` call
- [ ] Sweep functions are exported only for tests (`_evictExpired`), not used by any production code path other than the interval itself

### Manual checks — response headers & body limits
- [ ] `curl -I http://localhost:3000/evidence` (no session) — `Cache-Control: public, max-age=60`, not `no-store`
- [ ] `curl -I -X POST http://localhost:3000/analytics -d '{"page":"/"}' -H 'Content-Type: application/json'` — `Cache-Control: no-store`
- [ ] `curl -I http://localhost:3000/evidence/admin/1 -H 'Cookie: sid=<valid>'` — `Cache-Control: no-store` (overrides the public default despite being a GET)
- [ ] `curl -I http://localhost:3000/auth/me` (no session) — `Cache-Control: no-store`
- [ ] `curl -I http://localhost:3000/uploads/<some-uploaded-file>` — `Cache-Control` shows a multi-day `max-age`, not `60`
- [ ] `curl -I http://localhost:3000/health` — response includes `Content-Security-Policy` starting with `default-src 'self'`
- [ ] `curl -X POST http://localhost:3000/evidence -H 'Cookie: sid=<valid>' -H 'Content-Type: application/json' -d "$(python3 -c "print('{\"title\":\"' + 'x'*2_000_000 + '\"}')")"` — returns 413 with a JSON `{ "error": ... }` body, not a bare connection reset or 500
- [ ] `curl -X POST http://localhost:3000/evidence -H 'Cookie: sid=<valid>' -H 'Content-Type: application/json' -d '{not valid json'` — returns 400 with a JSON `{ "error": ... }` body, not 500
- [ ] Save an essay with a long body + several footnotes/bibliography entries (well under 1MB but over the old 100KB default) — succeeds where it previously would have 500'd
- [ ] Run `cd api && node --test tests/body-limits.test.js` — all tests pass
- [ ] Run `cd api && node --test tests/*.test.js` (full suite) — no regressions

### Code-review checks — response headers & body limits
- [ ] `security-headers.js`'s `Cache-Control` branch checks `req.method`, not `req.path` — no hardcoded route allowlist to keep in sync as new routes are added
- [ ] `requireAuth`'s `no-store` header is set unconditionally at the top of the function, before the token/session check, so it covers the 401 path too
- [ ] CSP header value has no `unsafe-eval`; `object-src 'none'` and `frame-ancestors 'none'` are present
- [ ] `express.json({ limit: '1mb' })` — the limit is a named constant or otherwise easy to find, not a magic string repeated elsewhere
- [ ] Error handler checks `error.type`, not `error.message` string-matching, to identify body-parser failures (predictable, not fragile to message wording changes)

---

## Validation: Journal Article Metadata Columns (API)
**Plan:** journal-article-metadata-columns.md
**Date:** 2026-07-02

### Manual checks
- [ ] After applying `003_journal_article_metadata.sql`, `PRAGMA table_info(context_essays)` / `responses` / `historiography` each show `two_column`, `doi`, `author_bio`
- [ ] `two_column` defaults to `0` on existing rows (no NULLs breaking the frontend's `if (data.two_column)` check)
- [ ] `POST /essays` / `PUT /essays/:id` with `{"two_column": 1, "doi": "10.1234/x", "author_bio": "..."}` — response echoes all three fields back
- [ ] Same check for `POST/PUT /responses` and `POST/PUT /historiography`
- [ ] Attempting `two_column: 2` (outside the CHECK constraint) — insert/update fails at the SQLite layer rather than silently storing an invalid value
- [ ] Run `cd api && node --test tests/journal-content.test.js` — new column round-trip cases pass for all three tables
- [ ] Run `cd api && node --test tests/*.test.js` (full suite) — no regressions

### Code-review checks
- [ ] JS-2 — `WRITABLE_COLUMNS` additions are the only change in each model file; no other column list touched
- [ ] The migration's column names (`two_column`, `doi`, `author_bio`) exactly match what `essay-detail.js`/`response-detail.js`/`historiography-detail.js` already read — no renaming
- [ ] Migration uses plain `ALTER TABLE ... ADD COLUMN` (idempotency is the `schema_migrations` tracking table's job once `deploy-migrations-and-memory-hygiene.md` lands, not this migration's own responsibility)

---

## Validation: Frontend Integrity & API Hardening (API)
**Plan:** frontend-integrity-and-api-hardening.md
**Date:** 2026-07-02

### Manual checks
- [ ] Send 31 rapid `POST /analytics` requests from one IP within a minute — the 31st returns 429
- [ ] `POST /analytics` with a fabricated `ip_hash` in the body — the stored row's `ip_hash` is the server-computed sha256 of the real request IP, not the submitted value
- [ ] `POST /analytics` with a 10,000-character `page` value — returns 400, not silently truncated or stored
- [ ] `POST /analytics` with a normal-length `page`/`referrer`/`session_id` — still succeeds (204), confirming the new caps don't reject legitimate beacons
- [ ] `GET /search?q=<term matching an essay, a response, and a blog post>` — every result across all four entity types has a non-empty `title`, never `undefined`/"Untitled"
- [ ] `GET /search?q=...` response body — no result object contains `essay_content`/`response_content`/`blog_content`/full evidence description; only `id`, `slug`, `title`, `result_type`, `snippet`
- [ ] `GET /search?q=...&type=responses` — every result's implied detail URL is `/debate/responses/{slug}` (checked via the `slug` field; the URL itself is built client-side by `search.js`)
- [ ] Run `cd api && node --test tests/*.test.js` (full suite) — all pass, including the new `model-helpers.test.js` and `search.model.test.js`
- [ ] Spot-check 3 migrated models (e.g. `evidence.model.js`, `response.model.js`, `wikipedia.model.js`) via their existing test files — `create`/`update`/slug-collision behavior is identical to pre-migration (no new failures, no skipped tests)
- [ ] `grep -rn "requireFields\|requireIntParam" api/` and `grep -rn "shared/constants" .` — both return zero hits post-deletion

### Code-review checks
- [ ] JS-2 — `POST /analytics`'s new validation returns 400/429 with a JSON `{ "error": ... }` body, matching this codebase's existing error-response shape
- [ ] `ip_hash` is computed from `req.ip`, never from request body, anywhere in `api/routes/analytics.js`
- [ ] `search.model.js`'s `titleColumn` mapping covers all four `SEARCHABLE` entities; no entity silently falls back to `undefined`
- [ ] `model-helpers.js`'s three functions are pure with respect to their explicit parameters — no hidden reliance on a specific model's module-level state
- [ ] Every one of the 18 migrated model files still exports the same public function names with the same signatures — this is an internal refactor, not an API change
- [ ] `map.model.js`'s two separate `runUpdate` call sites pass the correct table name (`maps` vs `map_pins`) to the correct one
- [ ] `credential.model.js`'s `updateSignCount` was left untouched (not migrated to `runUpdate`) — confirm its fixed-shape statement still works
- [ ] SR-1 — the four task groups (CSS, analytics, search, model dedup) remain cleanly separable in the diff, even though they landed in one plan
- [ ] No remaining reference to `api/middleware/validation.js` in `api/server.js` or any route file

## Validation: Frontend Render Bug Fixes (API portion)
**Plan:** frontend-render-bug-fixes.md
**Date:** 2026-07-03

### Manual checks
- [ ] `cd api && node --test tests/search.model.test.js` passes, including the new prototype-key case.
- [ ] `cd api && node --test tests/analytics-route.test.js` passes.
- [ ] `curl 'http://localhost:3000/search?q=jesus&type=toString'` returns 200, not 500.
- [ ] `curl -X POST http://localhost:3000/analytics -H 'Content-Type: application/json' -d '{"page":123}'` returns 400.

### Code-review checks
- [ ] JS-2 — `searchOne` returns `[]` for any `type` not in `SEARCHABLE`'s own keys (`Object.hasOwn`), matching the route guard.
- [ ] JS-2 — analytics route's non-string `page` rejection reuses the existing `{ "error": ... }` 400 shape.
- [ ] The new `analytics-route.test.js` spins up the real router (or app) rather than testing the model directly, since the bug is route-level.

## Validation: Agent-Friendly Frontend
**Plan:** agent-friendly-frontend.md
**Date:** 2026-07-03

### Manual checks
- [ ] `cd api && npm run sitemap` writes `frontend/sitemap.xml`; it validates as well-formed XML and contains real published detail URLs (e.g. `/evidence/single/<slug>`), not just section indexes.
- [ ] Publish a draft, re-run the generator — its URL now appears; unpublish another, re-run — its URL is gone.
- [ ] `cd api && node --test tests/generate-sitemap.test.js` passes.
- [ ] Run `./deploy.sh` (or dry-read it) — the sitemap step runs after migrations and before the process (re)start.

### Code-review checks
- [ ] SR-2 — the generator imports only Node built-ins and the existing `config`/`better-sqlite3`; no new dependency added.
- [ ] JS-2 — the generator fails loudly (non-zero exit) if the DB or output directory is missing, and never writes a partial file on error.
- [ ] The URL paths the generator emits match the actual `[slug].html` routes exactly (no `/evidence/{slug}` vs `/evidence/single/{slug}` mismatch).

## Validation: Public API Rate Limiting
**Plan:** public-api-rate-limiting.md
**Date:** 2026-07-03

### Manual checks
- [ ] `cd api && node --test tests/public-rate-limit.test.js` passes.
- [ ] Hammer a public route past the budget: `for i in $(seq 1 320); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/evidence; done | sort | uniq -c` — shows a run of `200`s then `429`s once the per-IP budget is exceeded.
- [ ] Repeat against `/search?q=jesus` — starts returning `429` after ~60/min (its stricter budget), sooner than the general read budget.
- [ ] `for i in $(seq 1 500); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; done | sort | uniq -c` — all `200`, never `429` (health is exempt).
- [ ] Confirm a normal browsing session (load several pages) never hits `429` — the limits must not affect real visitors.
- [ ] Passkey and analytics-POST limiters still behave as before (unchanged by this plan).

### Code-review checks
- [ ] SR-2 — no new dependency; the change reuses `api/middleware/rate-limit.js` only.
- [ ] JS-2 — over-limit responses use the existing `429` + `{ "error": ... }` shape.
- [ ] One shared `publicReadLimit` instance is passed to all listed content mounts (single shared per-IP budget), and `/search` additionally carries its own `searchLimit`.
- [ ] `/health`, `/uploads`, `/auth`, `/passkey`, `/analytics` are NOT wrapped in `publicReadLimit`.
- [ ] `app.set("trust proxy", 1)` is unchanged, so `req.ip` remains the real client IP (limiter keys correctly, no XFF spoofing gap introduced).
- [ ] `setup/nginx-hardening.md`'s snippet is syntactically valid nginx and documented as the authoritative flood defense.

## Validation: Production Deployment Configuration
**Plan:** production-deploy-config.md
**Date:** 2026-07-03

### Manual checks
- [ ] `cd api && node --test tests/load-env.test.js tests/reset-credentials.test.js` passes.
- [ ] `cd api && npm test` — the full suite still passes (env loader must not disturb tests that set `DB_PATH=:memory:`).
- [ ] With `RP_ID=example.org` in `.env`, boot the server and confirm `process.env.RP_ID` is `example.org` (loader populated it); with `RP_ID` pre-exported in the shell, the shell value wins (no override).
- [ ] Delete/rename `.env` and boot — server starts without throwing (loader tolerates a missing file).
- [ ] Seed the `credentials` table, run `node scripts/reset-credentials.js` (no flag) — refuses and exits non-zero, rows intact; run `node scripts/reset-credentials.js --confirm` — reports the count removed and the table is empty.

### Code-review checks
- [ ] SR-2 — `load-env.js` and `reset-credentials.js` use only Node built-ins (`fs`, project `config`); no new dependency.
- [ ] JS-2 — loader never overrides an already-set `process.env` key; reset script is non-destructive without `--confirm`.
- [ ] `require("./config/load-env")()` is the FIRST statement in `api/server.js`, above `config.js` and every route require.
- [ ] `.env` documents `RP_ID`, `ORIGIN`, `NODE_ENV`, `PORT`, `SETUP_TOKEN` as commented placeholders with no real secret values committed.

## Validation: Pre-Launch Code Bug Fixes (API)
**Plan:** prelaunch-bug-fixes.md
**Date:** 2026-07-03

### Manual checks
- [ ] `cd api && node --test tests/publish-route.test.js` passes.
- [ ] `curl -X POST http://localhost:3000/publish/constructor/1` (with a valid admin session) returns HTTP 400, not 500.
- [ ] Publishing a real draft flips `published_draft` to 1 and unpublishing flips it to 0.

### Code-review checks
- [ ] JS-2 — `setPublished` uses `Object.hasOwn(MODELS, req.params.type)` before the lookup; unknown/prototype types return the existing 400.
- [ ] The fix changes only the guard; publish/unpublish/page-generation behavior is otherwise unchanged.
