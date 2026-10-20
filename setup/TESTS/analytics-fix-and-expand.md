# Tests: Analytics — Fix Collection & Expand to Geo/Device

**Plan:** `setup/PLANS/New/analytics-fix-and-expand.md`
**Date:** 2026-07-10

## Manual Verification

### Fix — Referrer & Session Data

- [ ] Open any public page (e.g. `https://thejesuswebsite.org/`) with browser dev tools Network tab open
- [ ] Look for the `POST /api/analytics` request — payload should now include `page`, `referrer`, and `session_id`
- [ ] `referrer` should be empty string on direct navigation, non-empty when arriving from a link (Google, another site)
- [ ] Reload the page — `session_id` should remain the same (persisted in sessionStorage)
- [ ] Open a new tab and navigate to the site — `session_id` should be different (new session)
- [ ] Open the admin analytics dashboard — "Unique Sessions" stat card should show a number > 0

### Device Data

- [ ] Visit the site from a desktop browser (Chrome/macOS) — the analytics row should have `device_type = 'desktop'`, `browser = 'Chrome'`, `os = 'macOS'`
- [ ] Visit from a mobile device (Safari/iOS) — `device_type = 'mobile'`, `browser = 'Safari'`, `os = 'iOS'`
- [ ] Visit from an Android phone (Chrome) — `device_type = 'mobile'`, `browser = 'Chrome'`, `os = 'Android'`
- [ ] Admin dashboard shows a "Devices" section with device type, browser, and OS breakdowns
- [ ] All three sub-sections (Device Type, Browser, OS) show correct counts and percentages

### Country/Region Data (requires GeoLite2 CSV import into SQLite)

- [ ] Run `node api/scripts/import-geoip.js` — imports GeoLite2 Country CSV into the `geoip_blocks` table
- [ ] Verify the table has rows: `SELECT COUNT(*) FROM geoip_blocks` should return ~400K
- [ ] Visit the site from an Australian IP — analytics row should have `country = 'Australia'`
- [ ] Visit from a US IP (VPN or actual) — `country = 'United States'`
- [ ] Visit from localhost (127.0.0.1) — `country` and `region` should be `NULL` (private IP, skipped)
- [ ] Admin dashboard shows a "Countries" section with country names, counts, and percentages
- [ ] Admin dashboard shows a "Regions" section with region names, counts, and percentages

### Graceful Degradation

- [ ] Truncate the `geoip_blocks` table — the API should still record page views without geo fields (no crash, no 500)
- [ ] The analytics dashboard should render geo sections as "No data available" or hide them when no geo data exists
- [ ] Send a request with a malformed user-agent string — device fields should be `null`, not throw

### Regression

- [ ] `GET /api/analytics?days=30` still returns `{ stats, pageViews, referrers }` in the same shape
- [ ] `GET /api/analytics/summary` still works
- [ ] `GET /api/analytics/top-pages` still works
- [ ] `GET /api/analytics/top-referrers` still works (and now actually has data!)
- [ ] All three time-range chips (7/30/90 days) still filter correctly
- [ ] Sparkline trends still render on the Page Views table

## Automated

- [ ] `cd api && node --test tests/ua-parser.test.js` — all parser test cases pass
- [ ] `cd api && node --test tests/analytics-route.test.js` — new geo/device endpoints return correct shapes
- [ ] `cd api && npm test` — full test suite passes (no regressions)
