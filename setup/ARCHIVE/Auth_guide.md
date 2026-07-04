# Auth Guide

**Purpose**: Document the authentication and authorization system — how it works, how to activate it, and how to register admin credentials.

---

## 1. Architecture Overview

The auth system uses **WebAuthn passkeys** for sign-in and **in-memory cookie-based sessions** for authorization. There are no external dependencies beyond Node's built-in `crypto` module (SR-2).

```mermaid
sequenceDiagram
    participant Browser
    participant API as API (Express)
    participant Store as Session Store (Map)
    participant DB as SQLite (credentials)

    Note over Browser,DB: Registration (one-time setup)
    Browser->>API: POST /passkey/register/options { handle }
    API-->>Browser: { challenge, rp, user, pubKeyCredParams }
    Browser->>Browser: navigator.credentials.create()
    Browser->>API: POST /passkey/register/verify { handle, id, clientDataJSON, publicKeyPem }
    API->>API: Verify challenge + clientDataJSON
    API->>DB: INSERT credential (id, public_key, user_handle, sign_count: 0)
    API-->>Browser: 201 { registered: true }

    Note over Browser,DB: Login
    Browser->>API: POST /passkey/login/options { handle }
    API-->>Browser: { challenge, rpId, timeout }
    Browser->>Browser: navigator.credentials.get()
    Browser->>API: POST /passkey/login/verify { handle, id, clientDataJSON, authenticatorData, signature, signCount }
    API->>DB: SELECT credential by id
    API->>API: Verify challenge, clientDataJSON, signature, sign counter
    API->>Store: createSession(userHandle) → token
    API-->>Browser: Set-Cookie: sid=<token>; HttpOnly; SameSite=Strict

    Note over Browser,DB: Authenticated Requests
    Browser->>API: GET /admin/endpoint (Cookie: sid=<token>)
    API->>Store: getSession(token) → { userHandle, expiresAt }
    API->>DB: Perform CRUD operation
    API-->>Browser: 200 { data }

    Note over Browser,DB: Logout
    Browser->>API: POST /auth/logout (Cookie: sid=<token>)
    API->>Store: destroySession(token)
    API-->>Browser: Clear-Cookie: sid
```

---

## 2. Files Involved

| File | Role |
|---|---|
| `api/middleware/auth.js` | Session store, cookie parsing, `requireAuth` guard |
| `api/routes/passkey.js` | WebAuthn challenge generation, registration, and assertion verification |
| `api/routes/auth.js` | Session status (`/auth/me`) and logout (`/auth/logout`) |
| `api/models/credential.model.js` | SQLite CRUD for WebAuthn credential records |
| `database/schema.sql` | `credentials` table definition |

---

## 3. Session Design

### Store

- **Type**: In-memory `Map<string, { userHandle, createdAt, expiresAt }>`
- **`createdAt`**: `Date.now()` timestamp set at session creation. Enables "Logged in since…" display in the admin UI (low-priority future feature).
- **Lifetime**: Process-bound. Server restart destroys all sessions — admin re-logs in.
- **Rationale**: Single-admin VPS. No Redis, no DB table. A restart forcing a fresh login is acceptable.

### Token

- Generated via `crypto.randomBytes(32).toString('hex')` — 64-character hex string.
- Sent to the browser as an `httpOnly`, `SameSite=Strict` cookie named `sid`.

### Expiry

- **12 hours** (`SESSION_TTL_MS = 1000 * 60 * 60 * 12`).
- Stale sessions are lazily cleaned up when `getSession()` encounters an expired entry.

### Cookie

The cookie is set with these flags, conditionally including `Secure` only in production:

```js
// In routes/passkey.js — login/verify handler:
res.cookie(auth.SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',  // conditional
    maxAge: auth.SESSION_TTL_MS,
    path: '/',
});
```

Result in production:

```
Set-Cookie: sid=<64-char-hex>; HttpOnly; SameSite=Strict; Secure; Max-Age=43200; Path=/
```

Result in development (`NODE_ENV` not set to `production`):

```
Set-Cookie: sid=<64-char-hex>; HttpOnly; SameSite=Strict; Max-Age=43200; Path=/
```

- **`HttpOnly`** — JavaScript cannot read the cookie. Prevents XSS-based session theft.
- **`SameSite=Strict`** — The cookie is never sent on cross-origin requests. Prevents CSRF.
- **`Secure`** (production only) — The cookie is only sent over HTTPS. Must be omitted during local development over HTTP, or the browser will refuse to store it.
- **`Path=/`** — The cookie is sent for all paths on the domain (both public frontend and admin API calls).

---

## 4. Passkey (WebAuthn) Detail

### Relying Party

- `RP_ID`: Set via `process.env.RP_ID`, defaults to `localhost` for development.
- `RP_NAME`: `'The Jesus Website'`
- In production, `RP_ID` must match the site's domain (e.g., `thejesuswebsite.org`).

### Challenge Store (`challengeStore`)

The in-memory challenge store is named `challengeStore` (an ES6 `Map`) to clearly distinguish it from the session store.

- **Structure**: `Map<string, { challenge, expiresAt }>` keyed by user handle.
- **Single-use**: `consumeChallenge()` reads and deletes the challenge atomically. A challenge cannot be replayed.
- **5-minute TTL** — if the user doesn't complete the ceremony within 5 minutes, the challenge expires and the verification endpoint returns `400`.
- **Cleanup**: Expired challenges are cleaned up lazily when `consumeChallenge()` encounters one. Optionally, a `setInterval` every 5 minutes can sweep stale entries to prevent memory accumulation if many abandoned ceremonies occur.

### Supported Algorithms

```js
pubKeyCredParams: [
    { type: 'public-key', alg: -7 },   // ES256
    { type: 'public-key', alg: -257 }, // RS256
]
```

### Key Storage (SPKI PEM — No CBOR Parsing)

The browser is expected to extract the credential's public key from the `attestationObject` and send it to the API as **SPKI PEM** (base64-encoded SubjectPublicKeyInfo). This avoids hand-rolling a CBOR parser on the server side.

```js
// Browser-side (implemented in admin/assets/js/passkey.js):
// IMPORTANT: credential.response.getPublicKey() is ONLY available on
// AuthenticatorAttestationResponse — i.e., after navigator.credentials.create().
// Do NOT call it on an AuthenticatorAssertionResponse (login). Guard with:
if (credential.response instanceof AuthenticatorAttestationResponse) {
    const publicKey = await crypto.subtle.exportKey('spki', credential.response.getPublicKey());
    const publicKeyPem = arrayBufferToPem(publicKey);
}
```

The API stores this exact string in `credentials.public_key` and uses it directly with `crypto.verify()` during login. On the login path, the browser sends the `authenticatorData` and `signature` — no key export is needed.

### Sign Counter Replay Protection

After a successful assertion, the API checks the authenticator's sign counter:

- If `signCount > 0` **and** `signCount <= credential.sign_count` → **Reject** (possible cloned authenticator).
- If `signCount > credential.sign_count` → Update the stored counter.
- If `signCount` is `0` or missing → Skip the check (some authenticators don't use counters).

### Input Validation

The `handle` field must be validated on all passkey endpoints:

- **Lowercased**: Convert to lowercase on storage and retrieval. Prevents `Admin` vs `admin` mismatches.
- **Trimmed**: Leading/trailing whitespace removed.
- **Non-empty**: Reject empty or whitespace-only handles.
- **Length**: Maximum 64 characters.
- **Allowed characters**: Alphanumeric, hyphens, and underscores only (`/^[a-zA-Z0-9_-]+$/`).
- **No enumeration**: Return the same generic error regardless of whether a handle exists — never confirm or deny a handle's existence to an unauthenticated caller.

Implement as a shared validation function used by both registration and login endpoints.

---

## 5. Registration Endpoint Protection

Registration endpoints (`/passkey/register/*`) are currently unauthenticated — anyone who knows the URL can attempt to register a credential. For a single-admin site, this must be locked down before going live.

### Recommended Approach: One-Time Setup Token

Generate a random token and store it as an environment variable. The registration endpoints require the token; once a credential is successfully registered, the token is invalidated.

```bash
# Generate a setup token (run once, save the output):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → export SETUP_TOKEN=3f8a1b2c...
```

```js
// In routes/passkey.js — guard registration endpoints:
// Checks the database, not an in-memory flag. If the server restarts, the
// credential count persists in SQLite so registration stays locked.
function requireSetupToken(req, res, next) {
    if (!process.env.SETUP_TOKEN) {
        // No token configured: registration is disabled entirely.
        return res.status(404).json({ error: 'Not found.' });
    }

    // If any credential exists, registration is already done — lock the door.
    const existing = credentialModel.countAll();
    if (existing > 0) {
        return res.status(404).json({ error: 'Not found.' });
    }

    const token = req.headers['x-setup-token'] || req.query.setupToken;
    if (token !== process.env.SETUP_TOKEN) {
        return res.status(404).json({ error: 'Not found.' });
    }
    next();
}
```

**Why DB-based instead of in-memory?** An in-memory `setupTokenConsumed` flag resets on every server restart — the registration door re-opens. Checking `credentialModel.countAll()` is restart-proof: the credential count lives in SQLite, so registration stays locked after the first successful enrolment regardless of deploys.

To re-enable registration (e.g., admin lost their device), delete all rows from the `credentials` table and set a new `SETUP_TOKEN`, then restart.

Add `countAll()` to the credential model:

```js
// credential.model.js — synchronous (better-sqlite3). No async/await needed.
function countAll() {
    return db.prepare('SELECT COUNT(*) AS count FROM credentials').get().count;
}
```

### Alternatives

| Method | Effort | Trade-off |
|---|---|---|
| **One-time setup token** (recommended) | Low — ~15 lines | Requires storing a secret in `.env`. Simple and effective. |
| **IP allowlisting** | Low — ~5 lines | `if (req.ip !== process.env.ADMIN_IP) return 404;`. Brittle if your IP changes. |
| **Disable after first credential** | Low — ~5 lines | Check `credentialModel.count()` at `/register/options` — if ≥ 1, return 404. No token needed but slightly less secure during the window before the first registration. |
| **Remove registration routes entirely** | Lowest — comment them out | Register once via a one-off script that inserts directly into SQLite. Most secure but least convenient. |

---

## 6. Rate Limiting

Rate limiting prevents brute-force and DoS attempts on auth endpoints. Since the project avoids external dependencies (SR-2), use a lightweight in-memory limiter.

### Design

```js
// api/middleware/rate-limit.js
const attempts = new Map(); // IP → { count, resetAt }

function rateLimit(maxAttempts = 5, windowMs = 60_000) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        let record = attempts.get(ip);

        if (!record || record.resetAt <= now) {
            record = { count: 0, resetAt: now + windowMs };
            attempts.set(ip, record);
        }

        record.count += 1;

        if (record.count > maxAttempts) {
            return res.status(429).json({ error: 'Too many requests. Try again later.' });
        }

        next();
    };
}
```

**Important**: If the API sits behind a reverse proxy (Nginx, Cloudflare, etc.), Express must be told to trust the proxy's `X-Forwarded-For` header so `req.ip` reflects the real client IP, not the proxy's IP:

```js
// In server.js — before any routes:
app.set('trust proxy', 1); // Trust first proxy (Nginx on same VPS)
// Or for Cloudflare: app.set('trust proxy', 'loopback, linklocal, uniquelocal');
```

### Where to Apply

| Endpoint | Limit | Window | Rationale |
|---|---|---|---|
| `POST /passkey/login/options` | 10 | 60 seconds | Challenge generation is cheap but should not be spammed. |
| `POST /passkey/login/verify` | 5 | 60 seconds | Assertion verification involves crypto — more expensive, lower limit. |
| `POST /passkey/register/options` | 3 | 60 seconds | Registration is rare. Aggressive limit. |
| `POST /passkey/register/verify` | 3 | 60 seconds | Same rationale as register/options. |

Apply the middleware directly in `routes/passkey.js` on each route before the handler:

```js
const rateLimit = require('../middleware/rate-limit');
router.post('/login/verify', rateLimit(5, 60_000), (req, res) => { ... });
```

---

## 7. Route Protection

### Security Headers Middleware

Before auth activation, add basic security headers to every API response. Create `api/middleware/security-headers.js`:

```js
// Applied to every response — no auth required, no per-route config.
function securityHeaders(req, res, next) {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',                    // deprecated but harmless; zero disables legacy auditor
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store',                 // auth responses must never be cached
        'Strict-Transport-Security': process.env.NODE_ENV === 'production'
            ? 'max-age=31536000; includeSubDomains'
            : '',                                    // HSTS — only in production over HTTPS
    });
    next();
}

module.exports = securityHeaders;
```

Wire it in `server.js` before any route mounts:

```js
app.use(require('./middleware/security-headers'));
```

This is a one-time, set-and-forget addition that benefits the entire API.

### Current State (all routes open)

Every write route and admin GET route has `requireAuth` **commented out**:

```js
// const requireAuth = require('../middleware/auth'); // at top of file
router.post('/', /* requireAuth, */ (req, res) => { ... });  // inline
```

The only exceptions are public GET routes (evidence list, search, etc.) which were never intended to be gated.

### Activation Checklist

To activate auth across the API, uncomment `requireAuth` in these route files:

| Route File | Lines to Uncomment |
|---|---|
| `routes/evidence.js` | Line 6 (`require`), lines 35, 49, 61 (middleware) |
| `routes/arbor.js` | Line 6, lines 34, 48, 60 |
| `routes/essays.js` | Line 6, lines 35, 49, 61 |
| `routes/popular-challenges.js` | Line 6, lines 34, 48, 60 |
| `routes/academic-challenges.js` | (same pattern) |
| `routes/historiography.js` | (same pattern) |
| `routes/responses.js` | (same pattern) |
| `routes/blog-posts.js` | (same pattern) |
| `routes/news-articles.js` | (same pattern) |
| `routes/wikipedia.js` | (same pattern) |
| `routes/resources.js` | (same pattern) |
| `routes/collections.js` | (same pattern) |
| `routes/maps.js` | (same pattern) |
| `routes/identifiers.js` | (same pattern) |
| `routes/drafts.js` | Lines 6, 12, 22 |
| `routes/publish.js` | Line 16, lines 53, 63 |
| `routes/analytics.js` | Line 6, lines 31, 41, 51, 61 |

**Total**: ~20 files, ~60 lines changed. All changes are deleting `//` or `/* ... */`.

---

## 8. Registration Flow (First-Time Setup)

Before the admin panel exists, the first credential can be registered either via a minimal HTML page or direct API calls.

### Recommended: `admin/auth/register.html`

A small standalone page at `admin/auth/register.html` makes initial setup much cleaner than using curl or Postman. It should:

- Accept a `?setupToken=` query parameter and pass it as the `x-setup-token` header on both `/register/options` and `/register/verify`.
- Call `navigator.credentials.create()` with the options returned by the API.
- Export the public key using `crypto.subtle.exportKey('spki', ...)` (guarded with `instanceof AuthenticatorAttestationResponse`).
- POST the result to `/register/verify`.
- Show a success message and a link to the login page.
- Contain no other links or navigation — it's a one-purpose page.

If the admin panel isn't ready and you need to register via direct API calls, use the steps below.

### Step 1: Start Registration

```http
POST /passkey/register/options
Content-Type: application/json

{ "handle": "admin" }
```

Response:
```json
{
    "challenge": "base64url-encoded-challenge",
    "rp": { "id": "localhost", "name": "The Jesus Website" },
    "user": { "id": "base64url-encoded-handle", "name": "admin", "displayName": "admin" },
    "pubKeyCredParams": [
        { "type": "public-key", "alg": -7 },
        { "type": "public-key", "alg": -257 }
    ],
    "timeout": 300000
}
```

### Step 2: Create Credential (Browser)

```js
const publicKeyCredential = await navigator.credentials.create({
    publicKey: {
        challenge: base64urlToBuffer(challenge),
        rp: { id: "localhost", name: "The Jesus Website" },
        user: { id: base64urlToBuffer(userId), name: "admin", displayName: "admin" },
        pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
        ],
        timeout: 300000,
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred"
        },
        attestation: "none"
    }
});
```

### Step 3: Complete Registration

```http
POST /passkey/register/verify
Content-Type: application/json

{
    "handle": "admin",
    "id": "<credential.id>",
    "clientDataJSON": "<base64url-encoded>",
    "publicKeyPem": "<SPKI-PEM-string>"
}
```

Response: `201 { "registered": true }`

The credential is now stored in the `credentials` table and ready for login.

---

## 9. Login Flow

### Step 1: Request Login Challenge

```http
POST /passkey/login/options
Content-Type: application/json

{ "handle": "admin" }
```

### Step 2: Get Assertion (Browser)

```js
const assertion = await navigator.credentials.get({
    publicKey: {
        challenge: base64urlToBuffer(challenge),
        rpId: "localhost",
        timeout: 300000,
        userVerification: "preferred"
    }
});
```

### Step 3: Verify Assertion

```http
POST /passkey/login/verify
Content-Type: application/json

{
    "handle": "admin",
    "id": "<assertion.id>",
    "clientDataJSON": "<base64url-encoded>",
    "authenticatorData": "<base64url-encoded>",
    "signature": "<base64url-encoded>",
    "signCount": 1
}
```

Response: `200 { "authenticated": true, "handle": "admin" }` + `Set-Cookie` header.

---

## 10. Authenticated Requests

Once the `sid` cookie is set, all subsequent requests to gated endpoints automatically carry it:

```http
GET /drafts
Cookie: sid=<token>
```

The `requireAuth` middleware:
1. Reads the `sid` cookie from the `Cookie` header.
2. Looks up the session in the in-memory `Map`.
3. If valid: attaches `req.user = { handle: session.userHandle }` and calls `next()`.
4. If missing/expired: returns `401 { "error": "Authentication required." }`.

---

## 11. Logout

```http
POST /auth/logout
Cookie: sid=<token>
```

Response: `204 No Content` + `Clear-Cookie: sid`.

---

## 12. Session Check

```http
GET /auth/me
Cookie: sid=<token>
```

Response (authenticated):
```json
{ "authenticated": true, "handle": "admin" }
```

Response (unauthenticated or expired):
```json
{ "authenticated": false }
```

The admin shell calls this on page load to decide whether to show the login form or the dashboard.

---

## 13. Database Schema

```sql
CREATE TABLE credentials (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id   TEXT UNIQUE NOT NULL,      -- WebAuthn credential ID (base64url)
    public_key      TEXT NOT NULL,             -- SPKI PEM string
    user_handle     TEXT NOT NULL,             -- User identifier (e.g., "admin")
    sign_count      INTEGER NOT NULL DEFAULT 0, -- Authenticator signature counter
    last_used_at    TEXT                         -- ISO 8601 timestamp of last successful assertion
);
```

Add an index on `user_handle` for the credential listing query:

```sql
CREATE INDEX idx_credentials_user_handle ON credentials(user_handle);
```

`last_used_at` is updated on every successful login assertion. It enables the admin UI to show which passkey was used most recently and when.

Multiple credentials per user are supported — the same admin can register passkeys on multiple devices.

---

## 14. Credential Management (Future)

Plan for these endpoints even if the admin UI for them comes later. Having the backend ready allows the admin panel to list and revoke credentials without an API change.

### GET /passkey/credentials

List all registered credentials for the authenticated user. Returns credential metadata only — never the public key.

```json
[
    { "id": 1, "credential_id": "abc123...", "user_handle": "admin", "sign_count": 42 },
    { "id": 2, "credential_id": "def456...", "user_handle": "admin", "sign_count": 7 }
]
```

### DELETE /passkey/credentials/:id

Revoke a specific credential by its primary key. Protected by `requireAuth`. Never delete the last remaining credential unless a replacement has been registered — the endpoint should return `400` if the deletion would leave the user with zero credentials.

### Model Additions

```js
// credential.model.js — add these functions:
function getAllByUserHandle(userHandle) { ... }   // existing: getByUserHandle
function countByUserHandle(userHandle) { ... }     // for the "last credential" guard
```

---

## 15. Error Response Reference

Error messages in production must be generic — never leak whether a handle exists, whether a credential is known, or why verification failed. All auth failures return the same shape.

| Endpoint | Status | Response | Notes |
|---|---|---|---|
| Any gated route (no session) | `401` | `{ "error": "Authentication required." }` | Standard response from `requireAuth`. |
| `POST /passkey/login/options` (rate limited) | `429` | `{ "error": "Too many requests. Try again later." }` | Rate limit middleware. |
| `POST /passkey/login/verify` (bad challenge) | `400` | `{ "error": "Challenge expired or missing." }` | Does not reveal whether the handle exists. |
| `POST /passkey/login/verify` (bad signature) | `401` | `{ "error": "Signature verification failed." }` | Does not reveal whether the credential exists. |
| `POST /passkey/login/verify` (unknown credential) | `404` | `{ "error": "Unknown credential." }` | Acceptable — the credential ID is already public from `navigator.credentials.get()`. |
| `POST /passkey/login/verify` (sign counter) | `401` | `{ "error": "Possible replay: sign counter did not advance." }` | Rare — indicates a cloned authenticator. |
| `POST /passkey/register/verify` (expired challenge) | `400` | `{ "error": "Challenge expired or missing." }` | Generic — same as login. |
| `POST /passkey/register/verify` (duplicate) | `409` | `{ "error": "Credential already registered." }` | The credential ID is globally unique. |
| `POST /passkey/register/*` (no setup token) | `404` | `{ "error": "Not found." }` | Registration endpoint appears not to exist. |
| `GET /auth/me` (no session) | `401` | `{ "authenticated": false }` | Not an error — the admin shell uses this to decide login vs. dashboard. |

---

## 16. How to Test Locally

WebAuthn has quirks on `localhost`. Here's what to expect.

### Platform Authenticators (Touch ID, Windows Hello)

- **macOS + Safari/Chrome**: Works on `localhost` without HTTPS. Safari may prompt for Touch ID twice during registration.
- **Windows + Chrome/Edge**: Works on `localhost`. Windows Hello handles the ceremony.
- **Linux**: No built-in platform authenticator. Use a roaming authenticator (security key) or test in a browser that supports virtual authenticators (see below).

### Virtual Authenticators (Chrome DevTools)

Chrome's DevTools includes a virtual authenticator for testing without a physical device:

1. Open DevTools → **Application** tab → **WebAuthn** panel.
2. Check "Enable virtual authenticator environment."
3. Click "Add virtual authenticator" — leave settings at default (CTAP2, user verification: default).
4. Perform registration and login normally. The virtual authenticator stores credentials in memory and clears on page reload.

### Testing the Full Flow

```bash
# 1. Start the API
cd api && npm run dev

# 2. Set environment (for the API)
export RP_ID=localhost
export SETUP_TOKEN=test-token-123  # if registration protection is active

# 3. Open admin/auth/register.html in a browser
#    (or use the browser console with fetch calls)

# 4. After registration, open admin/auth/login.html
#    The sid cookie should be set and visible in DevTools → Application → Cookies

# 5. Verify: GET /auth/me should return { authenticated: true, handle: "admin" }
curl -b "sid=<token>" http://localhost:3000/auth/me
```

### Common Issues

| Symptom | Likely Cause |
|---|---|
| `navigator.credentials.create()` throws `NotAllowedError` | The RP_ID doesn't match the origin. On `localhost`, make sure `RP_ID` is `localhost` (not `127.0.0.1`). |
| Cookie not set after login | `Secure` flag is enabled but you're on HTTP. Set `NODE_ENV=development` to omit it. |
| `getPublicKey is not a function` | You called `getPublicKey()` on an `AuthenticatorAssertionResponse` (login) instead of `AuthenticatorAttestationResponse` (registration). Guard with `instanceof`. |
| Challenge always expires | The 5-minute TTL started. Complete the ceremony faster, or increase `CHALLENGE_TTL_MS` for debugging. |

### Automated Tests

The auth system should have automated tests for its core logic. Use Node's built-in `node:test` module — no external test framework required (SR-2).

#### Test Structure

```
api/tests/
├── auth.test.js               # Session store, requireAuth, security headers
├── passkey.test.js             # validateHandle, challenge store, rate limiter
├── credential.model.test.js    # CRUD operations, countAll, sign counter
└── helpers/
    └── db.js                   # In-memory SQLite setup/teardown
```

#### Running Tests

```bash
# Run all auth tests
cd api && node --test tests/auth*.test.js

# Or add to package.json scripts:
# "test:auth": "node --test tests/auth*.test.js"
```

#### What to Test

| Area | What to Cover |
|---|---|
| `validateHandle()` | Valid handles pass. Empty, too-long, invalid-char handles reject. Lowercase and trim applied. |
| Session store | `createSession()` returns a 64-char hex token. `getSession()` returns the session or null. Expired sessions return null. `destroySession()` removes the entry. |
| Challenge store | `consumeChallenge()` returns the challenge once then null (single-use). Expired challenges return null. |
| Rate limiter | Allows N requests within the window, blocks N+1 with 429, resets count after window expiry. Different IPs get independent counters. |
| `requireSetupToken()` | Returns 404 when `SETUP_TOKEN` env var is absent. Returns 404 when a credential already exists. Returns 404 on wrong token. Passes `next()` with the correct token and an empty DB. |
| `securityHeaders()` | All expected headers present on every response. `Strict-Transport-Security` only in production. |
| Credential model | `insert()`, `get()`, `countAll()`, `updateSignCount()`, `getAllByUserHandle()`, `countByUserHandle()`, `delete()` — all read/write paths tested against an in-memory database. |

#### In-Memory SQLite for Tests

Use `better-sqlite3` with `:memory:` to avoid touching the real database:

```js
// tests/helpers/db.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function createTestDb() {
    const db = new Database(':memory:');
    const schema = fs.readFileSync(
        path.join(__dirname, '../../database/schema.sql'),
        'utf-8'
    );
    db.exec(schema);
    return db;
}

module.exports = { createTestDb };
```

#### Testing Considerations

- **Database isolation**: Every test suite creates a fresh in-memory database via `createTestDb()`. No shared state between test files. Run migrations in `before()` hooks so the schema is ready.
- **No WebAuthn crypto mocking**: Tests focus on the logic around WebAuthn (validation, storage, sessions), not on `crypto.verify()` itself. Cryptographic verification is outside the scope of unit tests — it's covered by the manual platform-authenticator tests above.
- **Rate limiter state**: The in-memory `Map` is process-bound. Place rate limiter tests within a single `describe` block and clear the `Map` in `beforeEach()` to ensure test isolation.
- **Environment variables**: Set `process.env.SETUP_TOKEN`, `process.env.NODE_ENV`, and `process.env.RP_ID` in `beforeEach()` hooks. Restore original values in `afterEach()`.

---

## 17. Security Properties

| Property | Implementation |
|---|---|
| **Phishing resistance** | WebAuthn origin-bound credentials. The browser verifies `rp.id` matches the origin. |
| **Credential theft protection** | Private key never leaves the authenticator. Only the public key is stored. |
| **Replay protection** | Challenges are single-use. Signature counter prevents cloned authenticators. |
| **Session hijacking** | `httpOnly` cookie prevents JS access. `SameSite=Strict` prevents CSRF. `Secure` flag prevents transmission over HTTP in production. |
| **Brute force** | WebAuthn ceremonies are asymmetric crypto — no passwords to guess. Rate limiting adds a second layer. |
| **No secrets in code** | No API keys, no passwords. `RP_ID` and `SETUP_TOKEN` are environment variables. |

---

## 18. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `RP_ID` | Production only | `localhost` | WebAuthn Relying Party ID — must match the site's domain. |
| `NODE_ENV` | Production only | `development` | Set to `production` to enable the `Secure` cookie flag and suppress verbose error messages. |
| `SETUP_TOKEN` | Before first registration | (none) | One-time token that gates `/passkey/register/*`. Once consumed, remove or regenerate. If absent, registration endpoints return 404. |

---

## 19. Apple Passkey Domain Association

Apple devices (iPhone, iPad, Mac) require a domain association file to enable passkey auto-fill — the system offers to sign in with a saved passkey without the user manually triggering the WebAuthn ceremony. Without this file, passkeys still work but auto-fill suggestions are disabled.

### File Location

```
frontend/.well-known/apple-app-site-association
```

This file must be served at the root of the domain (e.g., `https://thejesuswebsite.org/.well-known/apple-app-site-association`) with `Content-Type: application/json`. No redirects, no authentication — Apple's CDN fetches it directly.

### Content

```json
{
    "webcredentials": {
        "apps": []
    }
}
```

- **`webcredentials`**: Tells Apple devices that this domain supports passkey (WebAuthn) sign-in.
- **`apps`**: An empty array means no native iOS app is associated — sign-in is web-only. If an iOS app is created later, list its App ID prefix + bundle ID here (e.g., `"ABCDE12345.com.example.app"`).

### Serving the File

If using Nginx as a reverse proxy, serve the file directly (no need to route through Express):

```nginx
location = /.well-known/apple-app-site-association {
    root /path/to/frontend;
    default_type application/json;
    add_header Cache-Control "public, max-age=3600";
}
```

If the Express API serves static files from `frontend/`, ensure `.well-known` is reachable or add an explicit route:

```js
// In server.js — before auth middleware:
const path = require('path');
app.get('/.well-known/apple-app-site-association', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, '../frontend/.well-known/apple-app-site-association'));
});
```

### Validation

After deploying, verify the file is accessible:

```bash
curl -H "Accept: application/json" https://thejesuswebsite.org/.well-known/apple-app-site-association
# Should return the JSON with Content-Type: application/json
```

Apple also provides a [validation tool](https://search.developer.apple.com/appsearch-validation-tool/) for associated domains.

### Note

This file is not required for the passkey ceremony to function — only for Apple's auto-fill UI. It can be deployed after the auth system is live without affecting functionality.

---

## 20. Known Limitations

### Server Restart Behaviour

- **All sessions are lost** on server restart or deploy. The in-memory `Map` does not survive a process exit. The admin must re-authenticate via passkey login after any restart. This is intentional — persisting sessions adds complexity with no benefit for a single-admin VPS.
- **All pending challenges are lost** on server restart. Any in-progress WebAuthn ceremony (registration or login) that hasn't called the verify endpoint will fail. The browser's `navigator.credentials` call will time out, and the user will need to start again. This is a minor inconvenience that only occurs during deploys.

### Registration Endpoint Exposure

- Before the setup token is implemented (see §5), `/passkey/register/*` is open to anyone who knows the URL. An attacker could register their own credential and gain admin access. **This is the highest-priority fix before going live.**
- With the setup token active: registration requires knowledge of the token. Once consumed, the endpoints return 404. If the admin loses all credentials (e.g., device wiped), a new `SETUP_TOKEN` must be generated and the server restarted.

### Single-Admin Design

- The session model and credential schema support multiple user handles, but the current code assumes a single administrator. No UI exists for managing users or their credentials.
- Adding multi-admin support would require: (a) per-user credential listing in the admin panel, (b) admin credential revocation UI, (c) differentiating between "super admin" and "content editor" roles if needed. None of this requires schema changes — only UI and route logic.

### Sign Counter Gaps

- The `signCount` field is a best-effort defense against cloned authenticators. Some platform authenticators (e.g., Apple Touch ID) always report `0`, so the replay check is skipped entirely on those devices.
- Roaming authenticators (USB security keys) do increment the counter reliably. The check provides real protection when those are in use.

### No CBOR Parsing

- The public key is sent from the browser in SPKI PEM format rather than extracted from the attestation object on the server. This shifts responsibility to the browser-side `passkey.js`. If the browser code has a bug and sends a malformed key, the server cannot detect it until login verification fails. Adding a proper CBOR parser would close this gap, but SR-2 discourages non-visual dependencies.

### Rate Limiting Scope

- The in-memory rate limiter (see §6) is per-process and does not survive restarts. **Every deploy resets all rate limit counters to zero** — an attacker who triggers a deploy could reset their rate limit window and resume attempts immediately. For a single-admin site with low traffic, this is acceptable. For higher-traffic scenarios, consider a SQLite-backed rate limit store (adds ~20 lines, no new dependency).
