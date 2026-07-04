# Plan: Frontend Render & API Input Bug Fixes

**Module(s):** Frontend / API / Shared
**Date:** 2026-07-03
**Status:** ✅ Implemented — all tests pass (313/313)

## Goal
Fix five confirmed defects that corrupt public-facing output or crash API
endpoints: the nested-`html`-template double-escaping bug (breaks every card,
search result, and debate list), the figure-shortcode regex that never matches,
double-encoded page/OG titles, a search crash on prototype-named `type` params,
and an analytics crash on a non-string `page` field.

## Coding rules to keep in mind
- **JS-2** — Robust & Predictable: validate inputs and fail loudly. The search
  `type` and analytics `page` bugs are both missing input validation that reaches
  the database as a 500.
- **JS-6** — Safe DOM Handling: the `html` templating layer is the single choke
  point that keeps user data out of `innerHTML`; the fix must preserve escaping
  for untrusted values while allowing *already-escaped* fragments to compose.
- **JS-3** — Modern & Simple: prefer a small `SafeString` marker + `raw()` helper
  over a heavier templating rewrite.
- **JS-4** — Comments explain *why*: the `raw()` escape-hatch needs a one-line
  note on when it is safe to use.

## Tasks

### Shared (templating core — do first, everything else depends on it)

- [x] **Add a `SafeString` marker, `raw()`, and safe-join to the templating layer** — introduce a `SafeString` class (with `toString()`), a `raw(value)` helper returning a `SafeString`, and make `html` skip escaping for `SafeString` values while escaping all other interpolations, then return a `SafeString` so nested `html` calls compose without re-escaping. File: `frontend/assets/js/utils/templates.js`
- [x] **Fix `renderCard`/`renderBadge` composition** — wrap the already-safe `${desc}`, `${badges}`, and `${inner}` fragments so the joined badge string is treated as safe HTML (not re-escaped), and confirm both helpers return `SafeString`. File: `frontend/assets/js/utils/templates.js`

### Frontend — templating consumers

- [x] **Fix search results rendering** — treat the joined section/card HTML as safe (`raw()` around the `.join('')` results) and pass the FTS `<mark>` snippet through `raw()` so highlight tags render as markup, not literal text. File: `frontend/assets/js/search.js`
- [x] **Verify debate list composition** — confirm the nested `html`/`innerHTML` assignment renders correctly under the new `SafeString` rules and adjust any `.join('')` fragments to `raw()`. File: `frontend/assets/js/debate.js` — verified no changes needed

### Frontend — detail page body/figure parsing

- [x] **Fix figure & pullquote shortcodes in blog body** — match `[figure ...]`/`[pullquote]` against the *raw* text before HTML-escaping (or unescape the delimiters), so `src="..."`/`caption="..."` are found; keep the surrounding prose escaped. File: `frontend/assets/js/blog-detail.js`
- [x] **Fix figure & pullquote shortcodes in essay body** — apply the same parse-before-escape fix. File: `frontend/assets/js/essay-detail.js`
- [x] **Fix figure & pullquote shortcodes in historiography body** — apply the same parse-before-escape fix. File: `frontend/assets/js/historiography-detail.js`
- [x] **Fix figure & pullquote shortcodes in response body** — apply the same parse-before-escape fix. File: `frontend/assets/js/response-detail.js`

### Frontend — double-encoded titles (SEO/OG)

- [x] **Stop pre-escaping the blog title before `setSEO`** — pass the raw title; `document.title` and meta `content` attributes are text sinks that must not receive HTML entities. File: `frontend/assets/js/blog-detail.js`
- [x] **Stop pre-escaping the essay title before `setSEO`** — same fix. File: `frontend/assets/js/essay-detail.js`
- [x] **Stop pre-escaping the challenge title before `setSEO`** — same fix. File: `frontend/assets/js/challenge-detail.js`
- [x] **Stop pre-escaping the historiography title before `setSEO`** — same fix. File: `frontend/assets/js/historiography-detail.js`
- [x] **Stop pre-escaping the evidence title before `setSEO`** — same fix (leave the legitimate `escapeHTML` in the linked-items `innerHTML` block untouched). File: `frontend/assets/js/evidence-detail.js`
- [x] **Stop pre-escaping the news title before `setSEO`** — same fix. File: `frontend/assets/js/news-detail.js`
- [x] **Stop pre-escaping the response title before `setSEO`** — same fix. File: `frontend/assets/js/response-detail.js`

### API — input validation crashes

- [x] **Harden search `type` validation in the model** — guard `searchOne` with `Object.hasOwn(SEARCHABLE, type)` so inherited keys (`constructor`, `toString`) return `[]` instead of building SQL against `undefined` table names. File: `api/models/search.model.js`
- [x] **Harden search `type` validation in the route** — replace the truthy `SEARCHABLE[req.query.type]` check with `Object.hasOwn(...)`. File: `api/routes/search.js`
- [x] **Validate analytics `page` is a string** — reject a non-string `page` with 400 before the length checks and the DB insert. File: `api/routes/analytics.js`

### API — tests (mandatory for `api/` changes)

- [x] **Add search prototype-key test** — assert `searchModel.search('jesus', 'constructor')` and `searchOne('toString', ...)` return `[]` and never throw. File: `api/tests/search.model.test.js`
- [x] **Add analytics non-string `page` route test** — POST `/analytics` with a numeric/object `page` returns 400, not 500. File: `api/tests/analytics-route.test.js`

## Files touched
- `frontend/assets/js/utils/templates.js` — modified
- `frontend/assets/js/search.js` — modified
- `frontend/assets/js/debate.js` — verified, no changes needed
- `frontend/assets/js/blog-detail.js` — modified
- `frontend/assets/js/essay-detail.js` — modified
- `frontend/assets/js/historiography-detail.js` — modified
- `frontend/assets/js/response-detail.js` — modified
- `frontend/assets/js/challenge-detail.js` — modified
- `frontend/assets/js/evidence-detail.js` — modified
- `frontend/assets/js/news-detail.js` — modified
- `api/models/search.model.js` — modified
- `api/routes/search.js` — modified
- `api/routes/analytics.js` — modified
- `api/tests/search.model.test.js` — modified
- `api/tests/analytics-route.test.js` — created

## Notes
- **Do the two `templates.js` tasks first.** Every list page (`evidence-list`,
  `blog-list`, `essays-list`, `historiography-list`, `news-list`,
  `news-and-blog`) renders through `renderCard`, so they are fixed transitively
  once the core composes correctly — but they should still be spot-checked in the
  browser (see the validation checklist).
- **`raw()` is an escape hatch, not a default.** It must only ever wrap strings
  the code itself produced via `html`/`renderBadge` or a server value already
  known safe (the FTS `<mark>` snippet, which the server generates around
  escaped content). Never pass a raw user value to `raw()`.
- **The prototype-key bug lives in two places.** The model (`searchOne`, the
  `SEARCHABLE[type]` lookup) and the route both need the `Object.hasOwn` guard;
  fixing only the route still leaves `searchModel.search(q, 'constructor')`
  callable (e.g. from the MCP server) and crashing.
- **Frontend automated tests are out of scope** — the project has no frontend
  test runner (per the module structure, `frontend/` ships no `.test.js`), so
  the frontend fixes are covered by the manual validation checklist instead.
  Only the `api/` changes carry mandatory automated tests, per the skill rule.
- **The double-encoded-title fix is safe** because `setSEO` writes to
  `document.title` and to `content`/attribute sinks, none of which parse HTML;
  the client-injected JSON-LD uses `JSON.stringify`, which is also a text sink.
