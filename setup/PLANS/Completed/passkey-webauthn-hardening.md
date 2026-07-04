# Plan: Passkey / WebAuthn Verification Hardening

**Module(s):** API
**Date:** 2026-07-02
**Status:** Done

## Goal
Close four gaps in the WebAuthn ceremony implemented in `api/routes/passkey.js`: the client-data check never validates `origin`, the login assertion never checks the relying-party ID hash or the user-present flag inside `authenticatorData`, the login challenge is keyed by a client-supplied handle instead of the credential actually being asserted, and the credential-delete lockout guard counts the wrong handle's credentials. None of these require a new dependency — every check is built from Node's `crypto` and the data already on the request, consistent with the from-scratch WebAuthn approach documented at the top of that file.

## Coding rules to keep in mind
- **JS-2** — Every check added here exists to reject a request that should not be trusted; each must fail the ceremony outright rather than degrade gracefully.
- **JS-4** — The WebAuthn byte-layout checks (rpIdHash offset, flags bit) are non-obvious; document the *why* inline, not what the code does.
- **SR-1** — Each task is a single, independently testable change within `passkey.js`.
- **SR-2** — No new dependency: origin/rpIdHash/user-present checks use only `crypto` and buffer slicing already available.

## Tasks

### API

- [ ] **Add origin validation to `verifyClientData`** — accept an `expectedOrigin` parameter; when it is non-null, reject the ceremony if `clientData.origin` does not exactly match it. Have both call sites (`register/verify`, `login/verify`) pass `process.env.ORIGIN || null` — leaving `ORIGIN` unset keeps today's behavior (no origin check) for local development against arbitrary ports; setting it in production enforces a strict match. File: `api/routes/passkey.js`
- [ ] **Verify `rpIdHash` and the user-present flag in `POST /passkey/login/verify`** — before the signature check, compute `sha256(RP_ID)` and compare it against the first 32 bytes of the decoded `authenticatorData`, and confirm bit 0 of the flags byte (offset 32) is set. Return 401 on either mismatch. File: `api/routes/passkey.js`
- [ ] **Bind the login challenge to the resolved credential, not the request's `handle`** — in `POST /passkey/login/verify`, look up the credential by `id` first, then validate/consume the challenge keyed by `credential.user_handle` instead of the client-supplied `handle`. This also stops one handle's pending challenge from being overwritten by a request naming the same handle for a different credential. File: `api/routes/passkey.js`
- [ ] **Fix the credential-delete lockout check to count the target credential's own handle** — in `DELETE /passkey/credentials/:id`, change the guard from `credentialModel.countByUserHandle(req.user.handle) <= 1` to `credentialModel.countByUserHandle(credential.user_handle) <= 1`, so a session holding several credentials can no longer strip a *different* handle's last credential. File: `api/routes/passkey.js`

### Tests

- [ ] **Unit-test the origin check** — export `_verifyClientData` (matching the existing `_issueChallenge`/`_consumeChallenge` export pattern) and add cases: passes with a matching origin, passes when `expectedOrigin` is `null`, fails on a mismatched origin. File: `api/tests/passkey.test.js`
- [ ] **Regression-test the delete-lockout fix** — seed two user handles (`admin` with 3 credentials, `editor` with 1), authenticate as `admin`, and assert `DELETE /passkey/credentials/:id` for `editor`'s sole credential returns 400 rather than 204. File: `api/tests/credential-management.test.js`

## Files touched
- `api/routes/passkey.js` — modified
- `api/tests/passkey.test.js` — modified
- `api/tests/credential-management.test.js` — modified

## Notes
- No files or folders are added, so `sitemap.md` needs no changes for this plan.
- `ORIGIN` is a new environment variable read via `process.env.ORIGIN`; document it in `.env` alongside `SETUP_TOKEN` when deploying to production (RP-ID must already match the domain per the existing `RP_ID` comment). `.env` itself is not listed under "Files touched" — it's implicitly updated, per this project's plan conventions.
- The rpIdHash/user-present checks apply only to `login/verify` (assertions). `register/verify` does not carry `authenticatorData` in this implementation (see the file's scope note on skipping CBOR attestation parsing), so no equivalent check is added there.
- This plan does not touch registration's trust model (client-supplied `publicKeyPem`, gated by `SETUP_TOKEN` + zero-credentials) — that trade-off is already documented in the file and out of scope here.
