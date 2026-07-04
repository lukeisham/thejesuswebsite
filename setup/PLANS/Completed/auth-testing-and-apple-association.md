# Plan: Auth Testing & Apple Passkey Association

**Module(s):** API, Frontend
**Date:** 2026-06-24
**Status:** Completed

## Goal
Two independent tasks that fill gaps in the auth system: (1) a suite of automated tests for every auth component using Node's built-in `node:test` module, and (2) the Apple passkey domain association file that enables passkey auto-fill on Apple devices.

## Coding rules to keep in mind
- **SR-2** — No external dependencies. Tests use `node:test` + `node:assert` only. The Apple association file is a static JSON file.
- **JS-2** — Test isolation. Each test suite gets a fresh in-memory SQLite database. No shared mutable state.
- **JS-3** — Simple over over-engineered. Tests verify behaviour, not implementation details. The association file is 6 lines of JSON.

## Tasks

### Automated Tests

- [x] **Create test DB helper** — Add `api/tests/helpers/db.js`. Exports `createTestDb()`: creates an in-memory `better-sqlite3` database, runs `database/schema.sql` (and any migrations) against it, returns the db instance. File: `api/tests/helpers/db.js`

- [x] **Create auth middleware test** — Add `api/tests/auth.test.js`. Tests for the session store (`createSession`, `getSession`, `destroySession`, expiry), `requireAuth` middleware (valid session passes, missing/expired returns 401), and `securityHeaders` middleware (all headers present, HSTS conditional on `NODE_ENV`). File: `api/tests/auth.test.js`

- [x] **Create passkey routes test** — Add `api/tests/passkey.test.js`. Tests for `validateHandle()` (valid, empty, too-long, invalid chars, lowercase/trim), the challenge store (single-use, expiry, lazy cleanup), the rate limiter (allows N within window, blocks N+1, independent IP counters, window reset), and `requireSetupToken` (404 when no SETUP_TOKEN, 404 when credential exists, 404 on wrong token, passes with correct token and empty DB). File: `api/tests/passkey.test.js`

- [x] **Create credential model test** — Add `api/tests/credential.model.test.js`. Tests for all CRUD paths: `insert()`, `get()` (by credential_id), `countAll()`, `updateSignCount()` (counter advances, last_used_at set), `getAllByUserHandle()` (never returns public_key), `countByUserHandle()`, and `delete()`. All tests run against an in-memory database. File: `api/tests/credential.model.test.js`

- [x] **Add test script to package.json** — In `api/package.json`, add `"test:auth": "node --test tests/auth*.test.js"` to the `scripts` block. File: `api/package.json`

### Apple Passkey Domain Association

- [x] **Create association file and directory** — Create `frontend/.well-known/` directory and add `frontend/.well-known/apple-app-site-association` containing `{"webcredentials": {"apps": []}}`. File: `frontend/.well-known/apple-app-site-association`

- [x] **Serve the association file** — In `api/server.js`, add an explicit route before any auth middleware: `app.get('/.well-known/apple-app-site-association', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.sendFile(path.join(__dirname, '../frontend/.well-known/apple-app-site-association')); })`. Requires `const path = require('path');` at the top of `server.js`. File: `api/server.js`

## Files touched
- `api/tests/helpers/db.js` — created
- `api/tests/auth.test.js` — created
- `api/tests/passkey.test.js` — created
- `api/tests/credential.model.test.js` — created
- `api/package.json` — modified (test script)
- `frontend/.well-known/apple-app-site-association` — created
- `api/server.js` — modified (one route addition)

## Completion

- [x] **Check all task boxes** — Replace every `[ ]` with `[x]` in this file.
- [x] **Move to Completed** — Move this file from `setup/PLANS/New/` to `setup/PLANS/Completed/`.

## Notes

### Testing
- Tests use only `node:test` and `node:assert` — no Jest, Mocha, or Vitest. This is SR-2 compliant.
- The in-memory SQLite helper runs the real schema + migrations, so tests catch schema drift.
- WebAuthn cryptographic primitives (`crypto.verify()`, `crypto.subtle`) are not mocked — tests focus on the logic layer (validation, storage, sessions). Manual testing with platform/virtual authenticators (§16 of Auth guide) covers the crypto path.
- Rate limiter tests clear the in-memory `Map` in `beforeEach()` to avoid cross-test pollution.
- Environment variables (`SETUP_TOKEN`, `NODE_ENV`, `RP_ID`) are set in `beforeEach()` and restored in `afterEach()`.
- Run `node --test` from the `api/` directory so `require` paths resolve correctly.

### Apple Association
- The file is a static JSON file — no build step, no template. 6 lines.
- Must be served at the domain root (`/.well-known/apple-app-site-association`), not nested under a path prefix. Nginx can serve it directly (see Auth guide §19), but an Express route is the simpler option for development and single-process deploys.
- This file enables passkey auto-fill on Safari and iOS/iPadOS. Without it, passkeys still work but the user must manually trigger the ceremony.
- Apple's CDN caches this file aggressively — set `Cache-Control: public, max-age=3600` if serving via Nginx.
- This plan has no dependency on the other four auth plans. Implement whenever convenient.
