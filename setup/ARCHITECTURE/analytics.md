# Page-view analytics

Page loads of visitors who have not declined tracking become aggregate statistics about human readers, which the admin reads. The server derives device, country and bot status itself, so the browser reports only what it alone knows.

**Source of truth:** `api/routes/analytics.js` — wins any disagreement with this doc.
**Spans:** `api/routes/analytics.js`, `api/models/analytics.model.js`, `api/server.js`, `api/services/ua-parser.js`, `api/services/geoip.js`, `api/scripts/import-geoip.js`, `deploy.sh`, `database/schema.sql`, `api/lib/analytics-retention.js`, `frontend/assets/js/api.js`, `frontend/assets/js/main.js`, `frontend/assets/js/cookies.js`, `admin/analytics.html`, `admin/assets/js/analytics.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The browser records a view only through `recordPageView()` in `api.js` (JS-5), and `recordPageViewIfAllowed()` in `main.js` is its only caller | One client keeps the field names, the length caps and the fire-and-forget behaviour in one place | A second caller double-counts views, or sends fields the route ignores |
| The browser sends only `page`, `referrer` and `session_id`. The route derives user agent, device, country, bot flag and search terms from the request | A client-supplied value would let any caller forge the statistics | A new field in the client is dropped by the route. No error appears |
| The client caps match `MAX_FIELD_LENGTHS` in the route (`referrer` is cut to 500 in `recordPageView()`) | The route answers a longer value with a 400, and the client never reads the reply | An over-long `page` path is lost, and no view is recorded |
| `POST /analytics` is public and has its own rate limit. Every `GET /analytics*` route mounts `requireAuth` (API-5) | Visitors must be able to report a view. Only the admin may read the visitors' data | An open read route shows visitor data to anyone |
| No IP address reaches the database, raw or hashed. The route reads `req.ip` only for the country lookup, and `req.ip` is the client address only while `server.js` sets `trust proxy` to 1 behind nginx | A hash of an IPv4 address can be reversed, so it counts as a stored IP. Without `trust proxy`, every request carries the proxy address | Every visitor gets the country of the proxy, and the country is empty |
| `geoip_blocks` is filled at deploy time by `deploy.sh` from the CSV files in `api/data/geoip/` through `api/scripts/import-geoip.js` | `geoip.js` reads only that table. It returns no country for private addresses, for IPv6, and when the table is empty | The country column stays empty. The dashboard shows no country data |
| The browser records nothing for a visitor who declined the cookie banner. `recordPageViewIfAllowed()` in `main.js` returns when `getConsent()` from `cookies.js` is `false`, and it runs before the only call to `recordPageView()`. No choice yet, or accept, records | The banner offers a Decline, and the site must honour it | A new caller of `recordPageView()` that skips the check records declined visitors. No error appears |
| The server deletes rows older than `RETENTION_DAYS` (365). `startAnalyticsPruning()` in `api/lib/analytics-retention.js` runs once when `server.js` starts listening and then every 24 hours, in the server process (no cron, no pm2 process) | The table would grow without bound | If the call leaves the `app.listen` callback in `server.js`, nothing prunes and the table grows. No error appears |
| Bots are recorded with `is_bot` set, but every human statistic filters with the one `HUMAN` predicate in the model. Only `getBotStats()` counts bots, and `getRecent()` lists them with their flag | Crawler hits would inflate the visitor numbers | A new statistic query that omits `HUMAN` counts bots as visitors. No error appears |
| The admin dashboard reads through `Admin.api.get()` and the route returns the shapes that `admin/assets/js/analytics.js` renders (`/analytics` returns `stats` and `pageViews`; the page reads referrers, countries, devices, search terms and bot stats from the sub-routes) | The page renders from those keys | A renamed key renders an empty card. No error appears |

Guide test: `api/tests/guide-analytics.test.js` checks that only `api.js` names the endpoint path, that every `recordPageView()` call in `main.js` sits behind the consent check, that the model defines `HUMAN`, that `server.js` starts the pruning, the route gates (row 4), and that the model and route hold no IP column or hash (row 5). It does not check that each statistic query uses `HUMAN`.

## Shape

- `frontend/assets/js/main.js` calls `recordPageViewIfAllowed()` on load and on `popstate`. `recordPageView()` keeps `session_id` in `sessionStorage`, so a session ends with the tab.
- `api/routes/analytics.js` validates, enriches with `api/services/ua-parser.js` and `api/services/geoip.js`, and calls `api/models/analytics.model.js`. The model owns all SQL for the `analytics` table.
- `api/server.js` mounts the router at `/analytics` and starts the daily pruning in `api/lib/analytics-retention.js`.
- `admin/analytics.html` loads `admin/assets/js/analytics.js`, which fetches the read routes with the admin client.

## Extending it

Adding a recorded field:

1. Add the column to `database/schema.sql` and a numbered migration.
2. Add the column name to `WRITABLE_COLUMNS` in the model.
3. Derive the value in the route from the request. Add a client field only when the server cannot know it, and add it to `recordPageView()`.

## Not documented here

The rate-limit numbers, the length caps, the bot and search-engine lists, and the dashboard layout are in
`api/routes/analytics.js`, `api/services/ua-parser.js` and `admin/assets/js/analytics.js`.
