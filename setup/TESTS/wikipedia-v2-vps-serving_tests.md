## Validation: Wikipedia v2 — VPS Vector Store Serving
**Plan:** wikipedia-v2-09-vps-vector-store-serving.md
**Date:** 2026-07-27

### Manual checks
- [ ] `scripts/sync-vector-stores.sh --verify` run against the live VPS reports matching local vs. remote file counts under `vector-stores/`.
- [ ] `curl -s http://127.0.0.1:<sidecar-port>/health` on the VPS (via SSH) returns `{"status":"ok", "families_loaded": [...]}` listing at least one family, confirming the sidecar booted and the embedding model loaded.
- [ ] `curl https://thejesuswebsite.org/api/wikipedia/related?slug=<real-slug>&family=<real-family>` returns a 200 with a non-empty `results` array containing real article data (slug/title/score fields matching what `GET /wikipedia` would show for those slugs) — not a stub, not an error shape.
- [ ] Stopping the sidecar (`pm2 stop thejesuswebsite-vector-sidecar`) and re-hitting the route returns the expected `E-PERSIST-026` error shape via the error toast/API response, not a raw 500 or an unhandled crash; restart the sidecar afterward and confirm it recovers (`pm2 start` / `pm2 restart`).
- [ ] `/var/www/thejesuswebsite-vector-store/` survives a full deploy (`git reset --hard origin/main` + `deploy.sh`) untouched — confirm file counts under it are identical before and after triggering a deploy.

### Code-review checks
- [ ] **SR-2** — no new Node dependency was added; the sidecar-call helper uses built-in `fetch`/`AbortController` only.
- [ ] **JS-2** — `api/lib/vector-sidecar-client.js` validates the sidecar response shape and never lets a malformed response propagate as an unhandled exception; connection-refused and timeout are handled as distinct, logged cases.
- [ ] **JS-5** — all raw HTTP calls to the sidecar are centralized in `api/lib/vector-sidecar-client.js`, not scattered inline in `api/routes/wikipedia.js`.
- [ ] **SQL-4 (spirit)** — the `family` query parameter on `GET /api/wikipedia/related` is validated against a hardcoded whitelist of known family names before being forwarded to the sidecar, never passed through raw.
- [ ] Error codes `E-PERSIST-026`, `E-PERSIST-027`, `E-TRANSFORM-016` exist in `api/lib/error-codes.js` with the full `{ code, category, httpStatus, message, detail, severity }` shape and are actually used (not just defined) in `api/routes/wikipedia.js` / `api/lib/vector-sidecar-client.js`.
- [ ] `scripts/sync-vector-stores.sh` and `scripts/sync-vector-sidecar.sh` target `/var/www/thejesuswebsite-vector-store/` — a path outside `/var/www/thejesuswebsite` (the git working tree `deploy.sh` resets) — confirmed by reading the script, not just its header comment.
- [ ] `deploy.sh` itself was **not** modified to add Python/pip steps — the sidecar setup/update stays entirely in the separate `scripts/sync-vector-sidecar.sh`, keeping the Node-only deploy path intact.
- [ ] `api/tests/wikipedia-related-route.test.js` and `api/tests/vector-sidecar-client.test.js` use `node:test` + `node:assert/strict` (CommonJS) — no Jest/Vitest imports.
