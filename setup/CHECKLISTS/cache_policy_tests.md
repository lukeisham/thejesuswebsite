# Validation: Cache Policy — Fast Loads AND Instant Deploy Visibility
**Plan:** cache-policy-fast-loads-instant-deploys.md
**Date:** 2026-07-18

### Manual checks
- [ ] `curl -sI https://thejesuswebsite.org/assets/js/evidence-list.js` returns exactly one `Cache-Control` header: `public, max-age=31536000, immutable`
- [ ] `curl -sI https://thejesuswebsite.org/admin/assets/js/admin.js` returns `Cache-Control: no-cache`; a second request with `If-None-Match` returns 304
- [ ] View source of the live homepage and of `/admin/diagrams/arbor` — every local `<script src>` / `<link href>` JS/CSS reference carries `?v=<current short commit hash>`; no reference carries a doubled `?v=...?v=...` and no external URL was stamped
- [ ] View source of a generated detail page (e.g. `/evidence/<any-slug>`) — its asset references also carry the current `?v=` stamp (publish-time generation inherits deploy-time stamping)
- [ ] Deploy-visibility drill: push a trivially visible change; after the GitHub Actions workflow (including the Cloudflare purge step) goes green, a **normal reload** (not hard reload) in a previously-used browser tab shows the change immediately
- [ ] `curl -sI https://thejesuswebsite.org/` shows `cf-cache-status: MISS` immediately after a deploy purge, then `HIT` on the next request (purge worked; edge re-primed)
- [ ] Direct visit to `/evidence/?gospel_category=theme` in a tab that previously viewed the unfiltered list renders only theme-filtered items (no unfiltered snapshot/sessionStorage flash); back-navigation into the same filtered URL behaves identically
- [ ] Unfiltered `/evidence/` still first-paints instantly from the embedded snapshot (SR-3 fast path unregressed)
- [ ] GitHub Actions deploy job fails visibly (red) if the Cloudflare purge API call errors

- [ ] `setup/Website_guide.md` has a `## Cache Strategy` section whose layer table matches the headers actually observed in the curl checks above, and Performance point 3 references it

### Code-review checks
- [ ] SR-2 — no build tool or dependency added; `version-assets.js` uses only Node built-ins and runs solely from deploy.sh on the VPS copy
- [ ] JS-2 — `version-assets.js` exits non-zero on any read/write failure and never writes a partially-stamped file; deploy.sh (`set -euo pipefail`) aborts on that exit
- [ ] JS-3 — stamper is a single idempotent pass; re-running it twice yields byte-identical output
- [ ] JS-6 — `evidence-list.js` change only alters init branching; no listeners are attached or removed differently, `delegate()` wiring untouched
- [ ] `deploy/nginx.conf` — each cache location emits exactly one `Cache-Control` header (no `expires` + `add_header` duplication); `/admin/` location carries `no-cache` with `always`
- [ ] `deploy/nginx.conf` — the server block carries the `add_header`-inheritance warning comment, and `curl -sI` on a live HTML page and `/admin/` confirms CSP/HSTS/X-Frame-Options are all still present alongside the new cache headers (nothing silently suppressed)
- [ ] `api/tests/version-assets.test.js` covers: plain stamp, `?v=old` replacement, external-URL skip, inline-script skip, frontend+admin coverage, `ASSET_VERSION` override
- [ ] Purge step in `.github/workflows/deploy.yml` runs strictly after the SSH deploy step and uses `curl -fsS` so HTTP errors fail the job
