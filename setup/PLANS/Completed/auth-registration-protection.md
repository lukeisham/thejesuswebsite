# Plan: Auth Registration Protection

**Module(s):** API, Database
**Date:** 2026-06-24
**Status:** Completed

## Goal
Lock down the registration endpoints so only an authorised admin can enrol a passkey credential. Add rate limiting on all auth endpoints to prevent brute-force and DoS. These are the two highest-priority security items from the Auth guide.

## Coding rules to keep in mind
- **SR-1** — One file per function. Middleware, model addition, and route wiring are separate tasks.
- **SR-2** — No external dependencies. Rate limiter and token check use only Node built-ins.
- **JS-2** — Defensive programming. The setup token guard returns 404 on any failure — never reveals why access was denied.

## Tasks

### Setup Token Guard

- [x] **Add countAll() to credential model** — Add a synchronous `countAll()` function to `api/models/credential.model.js`. Runs `SELECT COUNT(*) AS count FROM credentials` and returns the integer count. Used by the setup token guard to check if a credential already exists. File: `api/models/credential.model.js`

- [x] **Add requireSetupToken middleware to passkey routes** — In `api/routes/passkey.js`, add a `requireSetupToken` middleware function. Logic: if `SETUP_TOKEN` env var is absent → 404. If `credentialModel.countAll() > 0` → 404. If `x-setup-token` header or `?setupToken=` query param doesn't match → 404. Apply it to both `/register/options` and `/register/verify` routes. File: `api/routes/passkey.js`

- [x] **Add SETUP_TOKEN to .env** — Document the `SETUP_TOKEN` environment variable in `.env` (or `.env.example`). Include a comment explaining how to generate one and that it's consumed after first registration. File: `.env`

### Rate Limiting

- [x] **Create rate limiter middleware** — Add `api/middleware/rate-limit.js`. In-memory `Map` keyed by IP. Configurable `maxAttempts` and `windowMs`. Returns 429 when limit exceeded. Uses `req.ip` with `resetAt <= now` boundary check. File: `api/middleware/rate-limit.js`

- [x] **Wire rate limiter into passkey routes** — In `api/routes/passkey.js`, apply the rate limiter to the four auth endpoints with these limits: `POST /passkey/login/options` (10 req / 60s), `POST /passkey/login/verify` (5 req / 60s), `POST /passkey/register/options` (3 req / 60s), `POST /passkey/register/verify` (3 req / 60s). File: `api/routes/passkey.js`

- [x] **Add trust proxy to server.js** — In `api/server.js`, add `app.set('trust proxy', 1)` before any route mounts. Ensures `req.ip` returns the real client IP when behind Nginx. File: `api/server.js`

### Automated Tests

- [x] **Create setup token guard tests** — Add `api/tests/setup-token.test.js`. Tests for `requireSetupToken`: returns 404 when `SETUP_TOKEN` env is absent, returns 404 when a credential already exists (`countAll() > 0`), returns 404 on wrong token (header and query param), passes `next()` with correct token and empty DB. Tests for `countAll()`: returns 0 on empty DB, returns N after N inserts. Use `node:test` + `node:assert` with in-memory SQLite. File: `api/tests/setup-token.test.js`

- [x] **Create rate limiter tests** — Add `api/tests/rate-limit.test.js`. Tests: allows N requests within window, blocks N+1 with 429, resets after window expiry, different IPs get independent counters, `resetAt <= now` boundary works correctly. Use `node:test` + `node:assert`. File: `api/tests/rate-limit.test.js`

## Files touched
- `api/models/credential.model.js` — modified (add countAll)
- `api/routes/passkey.js` — modified (requireSetupToken + rate limiter wiring)
- `api/middleware/rate-limit.js` — created
- `api/server.js` — modified (trust proxy)
- `.env` — modified (SETUP_TOKEN)
- `api/tests/setup-token.test.js` — created
- `api/tests/rate-limit.test.js` — created

## Completion

- [x] **Check all task boxes** — Replace every `[ ]` with `[x]` in this file.
- [x] **Move to Completed** — Move this file from `setup/PLANS/New/` to `setup/PLANS/Completed/`.

## Notes
- `requireSetupToken` uses a DB query (`countAll()`) rather than an in-memory flag. This is restart-proof — the credential count survives in SQLite, so registration stays locked after the first enrolment regardless of deploys.
- To re-enable registration: delete all rows from `credentials`, set a new `SETUP_TOKEN`, restart.
- Rate limiter is per-process and resets on deploy. Acceptable for a single-admin VPS.
- auth-security-foundation is already complete — its changes to `passkey.js` (cookie flags, `validateHandle`) are in place. This plan's changes to the same file should merge cleanly. Apply this plan's changes on top of the completed foundation.
