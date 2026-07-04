# Plan: Auth Credential Management

**Module(s):** API, Database
**Date:** 2026-06-24
**Status:** Done

## Goal
Prepare the backend for credential management — add the `last_used_at` tracking column and `user_handle` index to the credentials table, then build the GET and DELETE endpoints so the future admin panel can list and revoke passkeys.

## Coding rules to keep in mind
- **SR-1** — One file per function. Schema migration, model additions, and routes are separate.
- **JS-2** — Validate inputs. The DELETE endpoint must guard against removing the last credential.
- **JS-3** — Simple over over-engineered. Two small endpoints, no abstraction layer needed.

## Tasks

### Database

- [x] **Add last_used_at column to credentials table** — Write a migration SQL file that adds `last_used_at TEXT` to the `credentials` table (stores ISO 8601 timestamps). Also add `CREATE INDEX idx_credentials_user_handle ON credentials(user_handle)`. File: `database/migrations/002_auth_credential_updates.sql`

- [x] **Run the migration** — Apply the migration: `sqlite3 database/thejesuswebsite.db < database/migrations/002_auth_credential_updates.sql`

### Model

- [x] **Add getAllByUserHandle to credential model** — Add a function that returns all credentials for a user handle (credential metadata only — never expose the public_key). Used by the GET endpoint. Already partially exists as `getByUserHandle`. File: `api/models/credential.model.js`

- [x] **Add countByUserHandle to credential model** — Add a function that returns the number of credentials for a user handle. Used by the DELETE endpoint to prevent removing the last credential. File: `api/models/credential.model.js`

- [x] **Update sign count to also set last_used_at** — In `credential.model.js`, update the `updateSignCount` function to also set `last_used_at = datetime('now')` in the same UPDATE statement. File: `api/models/credential.model.js`

### Routes

- [x] **Add GET /passkey/credentials route** — Returns all credentials for `req.user.handle`. Protected by `requireAuth`. Response shape: `[{ id, credential_id, user_handle, sign_count, last_used_at }]`. File: `api/routes/passkey.js`

- [x] **Add DELETE /passkey/credentials/:id route** — Deletes a credential by primary key. Protected by `requireAuth`. Before deleting, checks `countByUserHandle() > 1` — returns 400 if deletion would leave zero credentials. Returns 204 on success. File: `api/routes/passkey.js`

### Automated Tests

- [x] **Create credential management tests** — Add `api/tests/credential-management.test.js`. Tests for `getAllByUserHandle()` (returns correct fields, never includes `public_key`), `countByUserHandle()` (returns 0 for empty, N after inserts), GET `/passkey/credentials` (authenticated returns array, unauthenticated returns 401), DELETE `/passkey/credentials/:id` (deletes when >1 credential, returns 400 on last credential, 404 on missing id, 401 unauthenticated), and `last_used_at` is updated on login. Use `node:test` + `node:assert` with in-memory SQLite. File: `api/tests/credential-management.test.js`

## Files touched
- `database/migrations/002_auth_credential_updates.sql` — created
- `api/models/credential.model.js` — modified (three new/updated functions)
- `api/routes/passkey.js` — modified (two new routes)
- `api/tests/credential-management.test.js` — created

## Notes
- The GET endpoint must never return `public_key`. Map the fields explicitly in the model — don't `SELECT *`.
- The DELETE endpoint uses the credential's primary key (`id`), not the WebAuthn `credential_id`. This avoids leaking WebAuthn credential IDs in URLs.
- `last_used_at` is set on every successful login assertion, not on every authenticated request. The update happens in the existing `updateSignCount` path in `login/verify`.
- This plan has no dependency on auth-security-foundation or auth-registration-protection — implement in any order.
