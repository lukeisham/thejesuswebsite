# Page-view analytics

Visitors' page loads become aggregate statistics that the admin reads. The server derives device, country and bot status itself, so the browser reports only what it alone knows.

**Source of truth:** `api/routes/analytics.js` — wins any disagreement with this doc.
**Spans:** `api/routes/analytics.js`, `api/models/analytics.model.js`, `api/server.js`, `api/services/ua-parser.js`, `api/services/geoip.js`, `api/scripts/import-geoip.js`, `deploy.sh`, `database/schema.sql`, `frontend/assets/js/api.js`, `frontend/assets/js/main.js`, `admin/analytics.html`, `admin/assets/js/analytics.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The browser records a view only through `recordPageView()` in `api.js` (JS-5), and `main.js` is its only caller | One client keeps the field names, the length caps and the fire-and-forget behaviour in one place | A second caller double-counts views, or sends fields the route ignores |
| The browser sends only `page`, `referrer` and `session_id`. The route derives user agent, device, country, bot flag and search terms from the request | A client-supplied value would let any caller forge the statistics | A new field in the client is dropped by the route. No error appears |
| The client caps match `MAX_FIELD_LENGTHS` in the route (`referrer` is cut to 500 in `recordPageView()`) | The route answers a longer value with a 400, and the client never reads the reply | An over-long `page` path is lost, and no view is recorded |
| `POST /analytics` is public and has its own rate limit. Every `GET /analytics*` route mounts `requireAuth` (API-5) | Visitors must be able to report a view. Only the admin may read the visitors' data | An open read route shows visitor data to anyone |
| The raw IP never reaches the database. The route stores a SHA-256 of `req.ip`, and `req.ip` is the client address only while `server.js` sets `trust proxy` to 1 behind nginx | Without `trust proxy`, every request carries the proxy address | Every visitor shares one `ip_hash`, and the country is empty |
| `geoip_blocks` is filled at deploy time by `deploy.sh` from the CSV files in `api/data/geoip/` through `api/scripts/import-geoip.js` | `geoip.js` reads only that table. It returns no country for private addresses, for IPv6, and when the table is empty | The country column stays empty. The dashboard shows no country data |
| The admin dashboard reads through `Admin.api.get()` and the route returns the shapes that `admin/assets/js/analytics.js` renders (`/analytics` returns `stats` and `pageViews`; the page reads referrers, countries, devices, search terms and bot stats from the sub-routes) | The page renders from those keys | A renamed key renders an empty card. No error appears |

Guide test: `api/tests/guide-analytics.test.js` checks row 1 for the endpoint path only (not the single-caller claim) and row 4.

## Shape

- `frontend/assets/js/main.js` calls `recordPageView()` on load and on `popstate`. `recordPageView()` keeps `session_id` in `sessionStorage`, so a session ends with the tab.
- `api/routes/analytics.js` validates, enriches with `api/services/ua-parser.js` and `api/services/geoip.js`, and calls `api/models/analytics.model.js`. The model owns all SQL for the `analytics` table.
- `api/server.js` mounts the router at `/analytics`.
- `admin/analytics.html` loads `admin/assets/js/analytics.js`, which fetches the read routes with the admin client.

## Extending it

Adding a recorded field:

1. Add the column to `database/schema.sql` and a numbered migration.
2. Add the column name to `WRITABLE_COLUMNS` in the model.
3. Derive the value in the route from the request. Add a client field only when the server cannot know it, and add it to `recordPageView()`.

## Not documented here

The rate-limit numbers, the length caps, the bot and search-engine lists, and the dashboard layout are in
`api/routes/analytics.js`, `api/services/ua-parser.js` and `admin/assets/js/analytics.js`.
