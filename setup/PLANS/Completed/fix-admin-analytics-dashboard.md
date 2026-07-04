# Plan: Fix Admin Analytics Dashboard

**Module(s):** API / Admin
**Date:** 2026-07-02
**Status:** ✅ Completed

## Goal
`admin/assets/js/analytics.js` has always called `GET /analytics`, but no such route exists — only `/analytics/summary`, `/analytics/top-pages`, `/analytics/top-referrers`, and `/analytics/recent` are mounted, so the dashboard hits the API's 404 handler on every load. This plan adds the missing aggregate endpoint with the exact `{ stats, pageViews, referrers }` shape the frontend already renders, fixes a field-name mismatch that would still show referrer counts as zero, and wires up the date-range chips and sparklines that Style_guide.md §13 specifies but were never connected.

## Coding rules to keep in mind
- **JS-2** — The new route must fail predictably: reject an out-of-range `days` value instead of silently ignoring it.
- **JS-5** — Centralize the fetch in `Admin.api.get`; show the existing loading state before the call and an error state on failure.
- **JS-6** — Replace the raw `err.message` concatenated into `innerHTML` with `textContent`; never build markup from a value the API controls without escaping.
- **SR-1** — Each task below touches one file or one clearly scoped change.

## Tasks

### API

- [ ] **Rename the referrer count column so it matches the frontend contract** — `getTopReferrers` in `api/models/analytics.model.js` currently aliases `COUNT(*) AS views`, but `admin/assets/js/analytics.js` reads `row.count`; rename the alias to `count`. File: `api/models/analytics.model.js`
- [ ] **Add `getTopPagesWithTrend(days, limit)` to the analytics model** — for the top `limit` pages by view count within the last `days`, also compute `unique` (distinct `session_id` count) and a `trend` array of daily view counts for that page, zero-filled for days with no rows, oldest first. File: `api/models/analytics.model.js`
- [ ] **Add `GET /analytics` aggregate route, admin-only** — accepts `?days=` restricted to `[7, 30, 90]` (400 on any other value), defaulting to 30. Composes the response from existing model functions: `stats` = `[{label: 'Total Page Views', value}, {label: 'Unique Sessions', value}, {label: 'Top Page', value}, {label: 'Top Referrer', value}]` (from `getSummary`/`getTopPagesWithTrend`/`getTopReferrers`), `pageViews` = top 5 rows from `getTopPagesWithTrend(days, 5)`, `referrers` = `getTopReferrers(20)`. File: `api/routes/analytics.js`

### Admin Frontend

- [ ] **Fix the date-range chip set to match the API's 7/30/90-day contract** — `admin/analytics.html` already has an `.analytics-chip-row` (labelled "Today" / "7 Days" / "30 Days", marked "visual only, client-side filtering" — it currently does nothing). Replace the labels with "Last 7 days" / "Last 30 days" / "Last 90 days", add a `data-days="7|30|90"` attribute to each button, and default the 30-day chip to `analytics-chip--active`. No CSS changes needed — `.analytics-chip`/`.analytics-chip--active` already exist in `admin/assets/css/analytics.css`. File: `admin/analytics.html`
- [ ] **Wire the chips and fix the error-rendering XSS gap in `AdminAnalytics.render`** — read the active chip's `data-days` value, call `Admin.api.get('/analytics?days=' + days)`, toggle `analytics-chip--active` and re-render on chip click (event delegation on `.analytics-chip-row`, per JS-6), and replace `container.innerHTML = '<div class="admin-error" ...>' + err.message + '</div>'` with a `textContent` assignment on a created element. File: `admin/assets/js/analytics.js`

### Tests

- [ ] **Add model tests for the renamed/new analytics functions** — cover `getTopReferrers` returning a `count` field, and `getTopPagesWithTrend` returning correct `views`/`unique`/zero-filled `trend` for a seeded date range. File: `api/tests/analytics.model.test.js`
- [ ] **Extend the existing analytics auth-guard tests** — add a case asserting `GET /analytics` returns 401 without a session and passes through with one, alongside the existing `/analytics/summary` and `/analytics/top-pages` cases in the `auth guard: analytics routes` block. File: `api/tests/auth-guard.test.js`

## Files touched
- `api/models/analytics.model.js` — modified
- `api/routes/analytics.js` — modified
- `admin/analytics.html` — modified
- `admin/assets/js/analytics.js` — modified
- `api/tests/analytics.model.test.js` — created
- `api/tests/auth-guard.test.js` — modified

## Notes
- `admin/assets/js/analytics.js` already expects exactly this response shape (`stats`/`pageViews`/`referrers`, with `row.trend` for sparklines and `row.count`/`row.source` for referrers) — this plan is a backend + wiring fix, not a frontend rewrite. No new rendering logic is needed beyond the date-range chips.
- The `since` parameter already accepted by `getSummary` stays ISO-string based internally; the route converts `days` to an ISO cutoff before calling it, so no existing callers of `getSummary` need to change.
- `getTopPagesWithTrend`'s trend query runs one grouped query per page (bounded to 5 rows by the route), not N+1 across the whole table — acceptable for a single-admin dashboard (SR-3) but worth revisiting if `limit` is ever raised.
- The `Cache-Control: no-store` header already applied globally in `api/middleware/security-headers.js` is appropriate here since analytics data must always be fresh — no change needed in this plan.
