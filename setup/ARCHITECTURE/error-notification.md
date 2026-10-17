# Error notification

Route errors carry a stable machine-readable code. A failure is diagnosable from
its code alone, and the frontend branches on the code instead of on message text.

**Source of truth:** `api/lib/error-codes.js` — wins any disagreement with this doc.
**Spans:** `api/lib/error-codes.js`, `api/lib/error-handler.js`, `api/server.js`, `api/routes/essays.js` (one of the slug routes that return it), `frontend/assets/js/api.js`, `frontend/assets/js/utils/toasts.js`, `frontend/assets/js/evidence-detail.js`, `frontend/assets/js/essay-detail.js`, `frontend/assets/js/blog-detail.js`, `frontend/assets/js/response-detail.js`, `frontend/assets/js/historiography-detail.js`, `frontend/assets/js/challenge-detail.js`, `mcp-server/server.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Content and admin routes send errors through `sendError()` or `sendValidationError()` with a definition from `error-codes.js` | `sendError()` is the only place that strips `detail` in production, and it gives every error one code | A raw `res.status(500).json({ error: err.message })` shows internals to visitors and has no code to grep |
| The six detail-page scripts compare `error.code === "E-PERSIST-004"` (`SQL_RECORD_NOT_FOUND`) to show the "not found" state | A missing slug must return that code from the route | If a route returns another code for a missing slug, the page shows a load-failure toast instead of "not found" |
| Every consumer of an error body accepts two shapes: `{ error: "text" }` and `{ error: { code, message } }` | `sendError()` sends the object. The deploy routes, the dev-login route and the 404 fallthrough in `server.js` send text | A consumer that handles one shape shows a blank or wrong message for the other. No error appears |

Rows 1 and 2 are enforced by `api/tests/guide-error-notification.test.js` (TEST-10). Row 3 is not.

## Shape

- Codes are grouped by prefix in `error-codes.js`: `E-INPUT-*`, `E-TRANSFORM-*`, `E-PERSIST-*` and `E-EGRESS-*`.
- `api.js` returns `{ data, error }`. `error` is the full object when the body has one, and a string otherwise. The MCP server's `apiRequest()` in `mcp-server/server.js` reads both shapes.
- Pages show a failure with `showToast(message, "error")` from `utils/toasts.js`. No page imports `error-toast.js` or the `utils/error-display.js` and `utils/error-fallback.js` modules.

## Extending it

1. Add the definition to `api/lib/error-codes.js` under the matching category constant, with the next free number.
2. In the route, call `sendError(res, ERRORS.YOUR_CODE, context)`. For a field-level failure, call `sendValidationError()`.
3. If the page must behave differently for the new code, compare `error.code` in the page script, as the detail pages do for `E-PERSIST-004`. Otherwise call `showToast(message, "error")`.
4. If you change the code or the status of a not-found response, update every detail-page script that compares `E-PERSIST-004`.

## Not documented here

The code registry, the number of codes per category, the toast durations and the toast styling are in
`api/lib/error-codes.js`, `frontend/assets/js/utils/toasts.js` and `setup/STYLE_GUIDE/`.
