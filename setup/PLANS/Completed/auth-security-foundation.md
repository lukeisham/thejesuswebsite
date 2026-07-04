# Plan: Auth Security Foundation

**Module(s):** API
**Date:** 2026-06-24

## Goal
Lay the security base layer for the entire API — security headers on every response, production-safe cookie handling, session metadata, and input validation for auth endpoints. These are small, high-impact changes with no dependencies between them.

## Coding rules to keep in mind
- **SR-1** — One file per function. Each task creates or edits a single file.
- **SR-2** — No external dependencies. All solutions use Node built-ins only.
- **JS-2** — Validate inputs, handle errors explicitly. Input validation is the primary focus.

## Tasks

### Security Headers Middleware

- [x] **Create security headers middleware** — Add `api/middleware/security-headers.js`. Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: no-store`, and conditional `Strict-Transport-Security` (production only). Single function, exported directly. File: `api/middleware/security-headers.js`

- [x] **Wire security headers into server.js** — Add `app.use(require('./middleware/security-headers'))` before all route mounts. One line insertion. File: `api/server.js`

### Cookie Security

- [x] **Add conditional Secure flag to session cookie** — In `api/routes/passkey.js`, update the `res.cookie()` call in the login/verify handler. Add `secure: process.env.NODE_ENV === 'production'` and `path: '/'`. The existing cookie already has `httpOnly` and `sameSite: 'strict'`. File: `api/routes/passkey.js`

### Session Metadata

- [x] **Add createdAt to session store** — In `api/middleware/auth.js`, update `createSession()` to include `createdAt: Date.now()` in the session object. Update the store comment to reflect the new shape: `Map<string, { userHandle, createdAt, expiresAt }>`. File: `api/middleware/auth.js`

### Input Validation

- [x] **Add handle validation function** — In `api/routes/passkey.js`, add a `validateHandle(handle)` function that: lowercases, trims, rejects empty strings, enforces max 64 chars, and only allows `[a-zA-Z0-9_-]`. Returns the sanitised handle or throws. Call it at the top of every passkey endpoint handler. File: `api/routes/passkey.js`

## Files touched
- `api/middleware/security-headers.js` — created
- `api/server.js` — modified (one-line addition)
- `api/routes/passkey.js` — modified (cookie flags + validateHandle)
- `api/middleware/auth.js` — modified (createdAt field)

## Notes
- Security headers middleware runs on every request, including public routes — this is intentional.
- The `Secure` flag must be conditional. If set unconditionally, login breaks on localhost over HTTP.
- `validateHandle` should be called before challenge issuance so bad input is rejected early.
- None of these changes depend on each other — they can be implemented in any order.
