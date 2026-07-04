# Plan: Auth Admin Pages

**Module(s):** Admin
**Date:** 2026-06-24
**Status:** Completed

## Goal
Build the two minimal admin auth pages — a registration page for first-time passkey enrolment and a login page for ongoing access. These are standalone vanilla HTML pages that call the passkey API endpoints. No admin shell, no dashboard — just the auth ceremony.

## Coding rules to keep in mind
- **HTML-1** — Semantic first. Use `<main>`, `<form>` where applicable, proper heading hierarchy.
- **HTML-3** — Exactly one `<h1>` per page.
- **HTML-5** — Every form control has a proper `<label>`. Error messages use `aria-describedby`.
- **JS-5** — async/await + try/catch for all fetch calls. Show loading states and error states.
- **JS-6** — Safe DOM handling. Event delegation for dynamic elements. Never use `innerHTML` with user data.
- **CSS-1** — One CSS file per page. Keep under 150 lines.
- **CSS-2** — Use custom properties from the admin style guide (admin color palette), not hardcoded values.
- **SR-2** — No external dependencies. Vanilla HTML + CSS + JS only.

## Tasks

### Register Page

- [x] **Create admin/auth/register.html** — A standalone page for first-time passkey enrolment. Contains: a heading, a short explanation, a "Register Passkey" button, and a status area for success/error messages. Calls `POST /passkey/register/options` then `navigator.credentials.create()`, exports the public key via `crypto.subtle.exportKey('spki', ...)` guarded with `instanceof AuthenticatorAttestationResponse`, and POSTs the result to `/passkey/register/verify`. Passes the setup token from `?setupToken=` in the URL as the `x-setup-token` header. On success, shows a link to the login page. File: `admin/auth/register.html`

- [x] **Create admin/auth/register.css** — Styles for the registration page. Centred card layout using admin design tokens (`--admin-bg`, `--admin-surface`, `--admin-accent`, etc.). Clean, minimal — a single purpose page. File: `admin/auth/register.css`

### Login Page

- [x] **Create admin/auth/login.html** — A standalone login page. Contains: a heading, a "Sign in with Passkey" button, and a status area. Calls `POST /passkey/login/options`, then `navigator.credentials.get()`, POSTs the assertion to `/passkey/login/verify`. On success (200 + set-cookie), redirects to `admin/index.html`. On failure, shows the error message. File: `admin/auth/login.html`

- [x] **Create admin/auth/login.css** — Styles for the login page. Same centered card layout as register. Distinct — registration and login should look like siblings, not copies. File: `admin/auth/login.css`

### Shared JS

- [x] **Create admin/assets/js/passkey.js** — Extracted from the inline logic in both pages. Contains: `base64urlToBuffer()`, `bufferToBase64url()`, `arrayBufferToPem()`, and the full `registerPasskey(setupToken)` and `loginWithPasskey()` functions. Both HTML pages load this script and call the relevant function. File: `admin/assets/js/passkey.js`

### Automated Tests

- [x] **Create admin auth page tests** — Add `admin/tests/passkey.test.js` (create the `admin/tests/` directory if needed). Tests for `base64urlToBuffer()`, `bufferToBase64url()`, `arrayBufferToPem()`, and the `registerPasskey()` and `loginWithPasskey()` functions. Use `node:test` + `node:assert`. File: `admin/tests/passkey.test.js`

## Files touched
- `admin/auth/register.html` — created
- `admin/auth/register.css` — created
- `admin/auth/login.html` — created
- `admin/auth/login.css` — created
- `admin/assets/js/passkey.js` — created
- `admin/tests/passkey.test.js` — created

## Completion

- [x] **Check all task boxes** — Replace every `[ ]` with `[x]` in this file.
- [x] **Move to Completed** — Move this file from `setup/PLANS/New/` to `setup/PLANS/Completed/`.

## Notes
- These pages must work before the admin panel exists. They are standalone — no shared header/footer/sidebar dependency.
- The `passkey.js` file bundles five tightly coupled WebAuthn functions. All share the same domain (base64url conversion, PEM export, WebAuthn ceremonies) and form a single linear sequence during registration and login. This is the SR-1 exception for related-by-purpose functions.
- The admin panel's future auth flow (dashboard → auto-check `/auth/me` → redirect to login if 401) will reuse these functions.
- `register.html` should be inaccessible after first registration (the setup token guard in the API returns 404). The page can show a "Registration is no longer available" message if the API returns 404.
- `login.html` is the entry point for all future admin sessions. Keep it simple — no "remember me", no multi-factor beyond the passkey itself.
- This plan depends on auth-registration-protection (the setup token guard and rate limiter must exist for register.html to test against). auth-security-foundation is already complete — its cookie `Secure` flag and security headers are required for the login flow.
