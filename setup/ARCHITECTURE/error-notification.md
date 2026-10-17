# Error notification

Every error in the system is encoded into a stable machine-readable code before
it reaches a user, so failures are diagnosable from a code alone and the
frontend has exactly one way to display them.

**Source of truth:** `api/lib/error-codes.js` — wins any disagreement with this doc. Do not count the codes here; read the file.
**Spans:** `api/lib/error-codes.js`, `api/lib/error-handler.js`, `api/lib/safe-transform.js`, `api/lib/db-guard.js`, `api/lib/env-check.js`, `api/lib/io-guard.js`, `api/server.js`, `frontend/assets/js/error-toast.js` + `.css`, `frontend/assets/js/utils/error-display.js`, `frontend/assets/js/utils/error-fallback.js`, `frontend/assets/js/utils/date-format.js`.

## Invariants

Two conventions apply codebase-wide and have no single owning file — this
paragraph is the cross-module record of them. Every route error resolves to
an `E-*` code via `sendError()`/`sendValidationError()`, never a raw
`res.status(500).json()` — the code is the only stable, greppable identity an
error has across a deploy. And every user-facing failure surfaces via
`showErrorToast()`/`handleApiError()`, never `alert()` or a silent
`console.error` — one display path, one accessibility/design contract.

## Shape

Four categories, each owned by a different guard layer:

- **Ingestion** (`E-INPUT-*`) — request bodies, query params, URL segments, uploads, WebAuthn ceremonies. Thrown before business logic runs.
- **Transformation** (`E-TRANSFORM-*`) — string ops, date parsing, division, JSON decoding, slugging, sort comparisons. `safe-transform.js` / `date-format.js` prevent `TypeError`/`NaN`/`"Invalid Date"` from reaching rendered output.
- **Persistence & I/O** (`E-PERSIST-*`) — DB, filesystem, external calls (ESV, vector sidecar), env validation. `db-guard.js` maps SQLite errors; `io-guard.js` maps `errno`; `env-check.js` fails fast at startup.
- **Egress** (`E-EGRESS-*` or similar) — response formatting, headers, cookies, page-generation sync, client-side display fallbacks. `error-fallback.js` guarantees an error surfaces somehow even when the expected DOM element is missing.

The error toast is a fixed-position, stacking, dismissible/copyable notification
— its visual spec belongs to the style guide, not here.

## Extending it

1. Add the definition to `api/lib/error-codes.js` under the right category constant: `{ code, category, httpStatus, message, detail, severity }`.
2. Call `sendError(res, ERRORS.YOUR_CODE, context)` in the route (or `sendValidationError` for a field-level failure).
3. Frontend: call `handleApiError(error)` from `utils/error-display.js` — it extracts the code and shows the toast. Client-only errors call `showErrorToast()` directly.
4. Refactoring anything that produces or displays an error: check whether the refactor changes *how* the error is surfaced (raw response → `sendError()`, `alert()` → toast) and whether it introduces a genuinely new failure mode that needs its own code.

## Not documented here

The current code count per category, the exact toast CSS (position, colours,
z-index), and the full code registry — all in `api/lib/error-codes.js` and the
style guide.
