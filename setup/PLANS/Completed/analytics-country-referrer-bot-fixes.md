# Plan: Analytics Country/Referrer/Bot Accuracy Fixes

**Module(s):** API / Database / Deploy / Admin
**Date:** 2026-07-17
**Status:** ✅ Completed

## Goal
Fix three confirmed accuracy problems on the live `/admin/analytics.html` dashboard: country data is 100% "Unknown" because GeoIP was never imported on the VPS and the true client IP is never resolved behind Cloudflare; the "Top Referrer" stat card contradicts the (correctly empty) external-referrers table below it; and the human/bot split silently counts UA-less scripted traffic as human.

## Coding rules to keep in mind
- **SQL-1 / SQL-3** — `getBotStats()` changes must keep using prepared statements and named/positional params, no string-built SQL beyond the existing `since` guard pattern already in the file.
- **JS-2** — GeoIP/UA enrichment must keep failing silently into `null`/`false`, never throwing and blocking a page view.
- **JS-4** — Any new comment in `deploy.sh` / `deploy/nginx-realip.conf` explains *why* (Cloudflare IP trust chain), not what the directive does.
- **CSS-2 / CSS-1** — no CSS changes are planned; if the bot-stats markup change needs a class, reuse `--space-xs`/`--admin-*` tokens already in `analytics.css`, don't hardcode.

## Tasks

### Database / Deploy — populate GeoIP data on every deploy

- [x] **Add an `import-geoip` npm script** — File: `api/package.json`. Add `"import-geoip": "node scripts/import-geoip.js"` alongside the existing `sitemap`/`pages`/`embed-data` scripts, so deploy.sh can invoke it the same way.
- [x] **Invoke the GeoIP import idempotently from deploy.sh** — File: `deploy.sh`. After the migrations loop and before "Generate sitemap", add a step that checks whether `api/data/geoip/GeoLite2-Country-Blocks-IPv4.csv` exists; if present, run `npm run import-geoip` (the script already does `DELETE FROM geoip_blocks` before re-inserting, so reruns on every deploy are safe); if absent, print a warning and continue rather than aborting the deploy (matches the existing warn-and-continue pattern used for the nginx-reload step).

### Networking — resolve the true client IP behind Cloudflare

- [x] **Create an nginx real-IP snippet** — File: `deploy/nginx-realip.conf` (new). An http-block include listing Cloudflare's published IPv4 and IPv6 ranges via `set_real_ip_from`, plus `real_ip_header CF-Connecting-IP;` and `real_ip_recursive on;`, so `$remote_addr` becomes the actual visitor IP (validated against Cloudflare's ranges) before nginx forwards `X-Real-IP`/`X-Forwarded-For` to Express. Comment the file with a reminder to refresh the IP ranges periodically from Cloudflare's IPs page.
- [x] **Document the required include in nginx.conf** — File: `deploy/nginx.conf`. Add a comment near the top (next to the existing note about including `nginx-http.conf`'s `map` directive) instructing the operator to also `include` `nginx-realip.conf` in the `http {}` block. No server-block changes — `proxy_set_header X-Real-IP $remote_addr;` and `X-Forwarded-For $proxy_add_x_forwarded_for;` already reference the now-corrected variable once the include is in place.

### API — reconcile the Top Referrer stat with the external-referrers panel

- [x] **Use external-only referrers for the GET / aggregate stats** — File: `api/routes/analytics.js`. In the `GET /` handler (~line 152), change `analyticsModel.getTopReferrers(20)` to `analyticsModel.getTopReferrers(20, true)` so both the returned `referrers` field and the "Top Referrer" stat card value agree with the admin panel's separately-fetched `/analytics/top-referrers?external=true` table — both currently disagree because one includes internal `thejesuswebsite.org` navigation and the other excludes it.

### API — distinguish UA-less traffic from confirmed-human traffic

- [x] **Add an `unknown` bucket to `getBotStats()`** — File: `api/models/analytics.model.js`. Rows with `user_agent IS NULL` (headless/scripted requests with no UA header at all) are currently folded into `human` via `(is_bot = 0 OR is_bot IS NULL)`. Add a third count for `user_agent IS NULL`, and narrow `human` to `user_agent IS NOT NULL AND (is_bot = 0 OR is_bot IS NULL)`. Return `{ human, bot, unknown, bot_breakdown }`.
- [x] **Render the unknown-visits bucket** — File: `admin/assets/js/analytics.js`. In `renderBotStats()` (~line 524), add a third stat segment ("Unknown visits: ") next to Human/Bot reading `data.unknown`, following the same `Admin.formatNumber(...)` pattern as the other two.
- [x] **Add model tests for the unknown bucket** — File: `api/tests/analytics.model.test.js`. In the existing `describe("model: getBotStats()")` block, add a test asserting a row with `user_agent: null` (server records this when the request has no `user-agent` header) increments `unknown`, not `human`, and that `human` + `bot` + `unknown` account for every seeded row.
- [x] **Add a route test for the reconciled Top Referrer stat** — File: `api/tests/analytics-route.test.js`. Add a `describe("GET /analytics — aggregate stats")` block: seed one internal (`thejesuswebsite.org`) and one external referrer, call `GET /analytics`, and assert the `stats` entry labeled "Top Referrer" equals the external referrer's count, not the combined total.

### Close out

- [x] **Log the schema.sql/migrations drift found during this plan** — File: `setup/Issues.md`. Add one row (next available `#`) noting that `database/schema.sql`'s `analytics` table definition is missing `is_bot` and `search_terms` (added later by `database/migrations/017_add_analytics_bot_search.sql`), even though `CLAUDE.local.md` calls `schema.sql` the authoritative source — a pre-existing drift, not something this plan fixes.

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Fix analytics geoip/referrer/bot-stat accuracy"`, `git push`. The push triggers `deploy.sh` which runs the GeoIP import and all migrations.
- [x] **Smoke test** — after the VPS deploy completes (~15s after push), run `node api/tests/analytics.model.test.js` and `node --test api/tests/analytics-route.test.js` from the project root to confirm the model and route changes work end-to-end. No browser-based live testing is required for this plan.

## Files touched
- `api/package.json` — modified
- `deploy.sh` — modified
- `deploy/nginx-realip.conf` — created
- `deploy/nginx.conf` — modified
- `api/routes/analytics.js` — modified
- `api/models/analytics.model.js` — modified
- `admin/assets/js/analytics.js` — modified
- `api/tests/analytics.model.test.js` — modified
- `api/tests/analytics-route.test.js` — modified
- `setup/Issues.md` — modified

## Error notification

**a) Does this plan impact existing error handling?**

No. None of these changes add a new failure mode a user or admin can hit — GeoIP import failure is a deploy-time warning (console only), the referrer/bot-stat changes only change which rows an existing, already-successful query counts. No new `E-*` codes are needed.

**b) Should this plan add, update, or remove any error notification behaviour?**

No. `sendError`/`showErrorToast` usage in `api/routes/analytics.js` and `admin/assets/js/analytics.js` is unchanged — the admin panel's existing try/catch-and-fallback-text pattern (e.g. "Country data unavailable.") already covers these endpoints.

## Notes
- `app.set("trust proxy", 1)` in `api/server.js` does **not** need to change. It already trusts exactly one hop (nginx). The bug was that nginx itself was forwarding the wrong address — once `nginx-realip.conf` resolves `$remote_addr` to the true, Cloudflare-validated client IP, the existing `trust proxy 1` setting reads it correctly. The tempting alternative (`trust proxy 2`, counting Cloudflare as a second blindly-trusted hop) was rejected: it would let anyone who reaches the origin server directly (bypassing Cloudflare) spoof their IP via a crafted `X-Forwarded-For` header. The `set_real_ip_from` approach only trusts the header when the connecting peer is actually inside Cloudflare's published ranges.
- This same IP-resolution bug currently affects `POST /analytics` rate limiting (`api/middleware/rate-limit.js` keys on `req.ip`) — today all visitors arriving via Cloudflare share a handful of edge IPs, so the 30-req/min limiter is effectively shared across all visitors rather than per-visitor. Fixing the real-IP chain fixes this as a side effect; no separate task needed since it's the same root cause.
- `ip_hash` in `api/routes/analytics.js` is also affected the same way (currently hashes Cloudflare's edge IP, not the visitor's) — again fixed as a side effect of the nginx change, not a separate task.
- The GeoIP CSVs (`api/data/geoip/*.csv`) are already committed to git (confirmed via `git ls-files`), so they will always be present on the VPS after `git reset --hard origin/main` — the deploy.sh existence check is a defensive guard, not expected to actually trigger the warning path in normal operation.
- No automated test covers the nginx/deploy.sh shell changes (not JS) — this is consistent with the project's existing test coverage, which only targets `api/`, `admin/`, and `mcp-server/` JS.
- No `frontend/sitemap.xml` changes — this plan adds no new HTML pages.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above. When all tasks are complete, update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **All done**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`. Push everything — code changes, `setup/Issues.md` update, and this plan file's own edits/move — in one commit/push.
