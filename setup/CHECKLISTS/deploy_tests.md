# Deploy & Infrastructure — Validation Checklists

## Validation: Deploy Skips Unchanged Heavy Steps
**Plan:** deploy-skip-unchanged-steps.md
**Date:** 2026-10-17

### Manual checks
- [x] First deploy after the change: the GitHub Actions log shows every step running (no markers exist yet).
- [x] Second deploy with no input changes: the log shows "skipping" for `api` npm install, `mcp-server` npm install, GeoIP import, and Wikipedia scoring import.
- [x] Sitemap, pages, stamp-about-dates, embed-data and version-assets still run on both deploys.
- [x] `https://thejesuswebsite.org/api/evidence` returns `200` after the second deploy.
- [x] `FORCE_FULL_DEPLOY=1` makes every step run (helper `check` exits `10`).

### Code-review checks
- [x] SR-1 — the hash logic is only in `api/scripts/deploy-step-cache.js`. `deploy.sh` only calls it.
- [x] SR-2 — the helper uses only Node built-ins.
- [x] JS-2 — a missing file, missing marker, or read error counts as "changed". No path skips a step on error.
- [x] `record` runs only after the step succeeds.
- [x] TEST-4 / TEST-5 — the helper tests use a temp directory and no sleeps.
- [x] `import-geoip.js` runs `DELETE FROM geoip_blocks` inside the transaction, and the unused `readline` stream is gone (the Locations reader still uses `readline`).
- [x] MIG-8 — the migration loop in `deploy.sh` is unchanged.
- [x] `/.deploy-state/` is in `.gitignore`.

## Validation: Shared Cache for Public API Reads
**Plan:** api-shared-cache.md
**Date:** 2026-10-17

### Manual checks
- [ ] Two `curl -sI https://thejesuswebsite.org/api/evidence` calls: the second shows `X-Cache-Status: HIT`.
- [ ] With `-H "Cookie: sid=x"` the same call shows `BYPASS`.
- [ ] `https://thejesuswebsite.org/api/auth/me` has `Cache-Control: no-store` and is never `HIT`.
- [ ] A 429 or 500 response has `Cache-Control: no-store`. A 404 keeps `public, max-age=60`.
- [ ] The deploy log shows `nginx reloaded.`, not the reload warning.

### Code-review checks
- [ ] API-3 — error bodies still come from `sendError()`. Only the header changed.
- [ ] API-5 — no route that uses `requireAuth` can be cached (it sends `no-store`, and nginx bypasses on the `sid` cookie).
- [ ] `location /api/` sets `proxy_buffering on`. No `proxy_ignore_headers`.
- [ ] Every server-level `add_header` that `/api/` had before is re-declared next to `X-Cache-Status`.
- [ ] `location = /api/deploy-webhook` and `location /mcp` are unchanged.
- [ ] TEST-6 — `api/tests/security-headers.test.js` asserts the real header values for 200, 404, 429 and 500.

## Validation: VPS Triage for the High-CPU Investigation
**Plan:** vps-triage-high-cpu.md
**Date:** 2026-10-17

### Manual checks
- [ ] Every row of the plan's Results table has a value and a date.
- [ ] `sudo nginx -T` output shows whether `nginx-http.conf` and `nginx-realip.conf` are included.
- [ ] pm2 restart counts did not rise over 10 minutes.
- [ ] Rows #245, #246 and #248 in `setup/ISSUES/issues.md` carry the new facts. Each failed check has its own new row.
- [ ] The precondition task in `api-shared-cache.md` is ticked or has a note.

### Code-review checks
- [ ] SR-5 — no secrets, tokens or visitor IP addresses in the plan or the issue log.
- [ ] Issue-log edits were made by script, and only the intended cells changed.

## Validation: Cold cache fix
**Plan:** cold-cache-fix.md
**Date:** 2026-10-23

### Manual checks
- [ ] After a deploy, `curl -sI` on an image under `/assets/images/` still shows `cf-cache-status: HIT` with an `age` larger than the deploy age.
- [ ] After a deploy, `curl -s -o /dev/null -w "%{time_starttransfer}\n" https://thejesuswebsite.org/` is well below 0.6 s.
- [ ] The `Warm Cloudflare cache` step of the deploy run shows no `::warning::`.
- [ ] After Luke sets the Cache Rule, a second `curl -sI` of the home page 70 seconds after the first shows `HIT` with an `age` above 60, never `EXPIRED`.
- [ ] The home page response still has `cache-control: public, max-age=60`.
- [ ] Luke has turned on Smart Tiered Cache and set the HTML Cache Rule to a one-day edge time for status 200, with the browser time respecting the origin.
- [ ] After an edit and a publish in the admin, the live page shows the new content within about 60 seconds, even though the HTML is cached for a day.
- [ ] The `Performance check` workflow, run right after a deploy, reports its result in chat.

### Code-review checks
- [ ] SR-5 — no token, zone ID or secret in `deploy.yml`, a comment or a log line.
- [ ] JS-2 — a failed warm request prints the URL in a `::warning::` line.
- [ ] CORE-4 — rows D-069 to D-071 exist in `setup/Decisions_log.md`, one table row each.
- [ ] Touch rule + CORE-5 — `.github/workflows/deploy.yml`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `deploy/nginx.conf`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/tests/guide-deployment.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/deployment.md`: purpose statement 40 words or fewer, numbered headings, citations of old headings fixed
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/performance-and-caching.md`: purpose statement 40 words or fewer, the warm-up and median text from the performance-check commit kept
- [ ] TEST-10 — `api/tests/guide-deployment.test.js` and `api/tests/guide-performance-and-caching.test.js`: fail with the rule, file, line and guide path; exceptions are named with a reason
