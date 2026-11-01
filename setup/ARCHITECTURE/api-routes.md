# API routes

Requests reach the database only through models, writes need a signed-in admin, and reads name their columns, so a new route or column cannot serve drafts or private data.

**Source of truth:** `api/server.js` — mount order and auth middleware; wins any disagreement with this doc.
**Spans:** `api/server.js`, `api/routes/`, `api/models/`, `api/services/page-generator.js`, `api/middleware/auth.js`, `api/lib/error-handler.js`.

## 1. Invariants

Guide test: `api/tests/guide-api-routes.test.js`. Its row numbers match the rows below.

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | No file in `api/routes/` runs SQL: no `require("../config")`, `.prepare(` or `.exec(` | The model applies the published-only filter (API-5) and caches statements (SQL-1) | A route query skips the filter and serves drafts to the public |
| 2 | Every `router.post/put/patch/delete` in `api/routes/` passes `requireAuth` (or `auth`) before its handler, except the public writes listed in the guide test | A session cookie is the only proof of the admin | Anyone can change content |
| 3 | Reads in `api/models/` and `api/services/` name their columns: no `SELECT *` and no `alias.*`, except a query whose table is chosen at run time | A new private column must not reach a response unasked (SQL-9) | A new column, such as a draft note or a credential field, appears in public JSON |

## 2. Shape

- **Routes** parse input, call a model and shape the response (API-1).
- **Models** own all SQL. Each table with a read keeps one `ALL_COLUMNS` constant, as in `api/models/news-article.model.js`.
- **Errors** follow `setup/ARCHITECTURE/error-notification.md` row 1, which its own guide test enforces.

## 3. Extending it

- **A route file:** mount it in `api/server.js`, put `requireAuth` on every write, and add the two tests of TEST-7.
- **A column:** add it to the model's `ALL_COLUMNS`. Add it to a public read only on purpose.

## 4. Not documented here

- The route list: read `api/server.js`.
- The error codes: read `api/lib/error-codes.js`.
