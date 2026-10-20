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
