## Validation: Shared Constants & Root Files
**Plan:** shared-and-root.md
**Date:** 2026-06-29

### Manual checks
- [ ] `shared/constants.js` imports cleanly from Node (`node -e "import('./shared/constants.js')"`) with no errors
- [ ] The enum sets in `constants.js` match `database/schema.sql` CHECK constraints exactly (gospel categories, timeline eras/periods, map locations, resource `list_key`s, arbor relationship types)
- [ ] `.gitignore` excludes `node_modules/`, `.env`, `*.db`, and `public/uploads/*` while keeping the folder; `git status` shows none of those as tracked
- [ ] `LICENSE` contains the agreed license text (see Issues.md decision)
- [ ] `deploy.sh` is executable, uses `set -euo pipefail`, and is idempotent on a dry read-through
- [ ] `public/uploads/.gitkeep` exists so the uploads directory is present in a fresh clone

### Code-review checks
- [ ] JS-1 / JS-3 — `constants.js` uses clear names and exports frozen plain-data objects; no logic
- [ ] JS-4 — file header explains the module's role and that the enums mirror the schema
- [ ] SR-2 — no new runtime dependencies introduced
- [ ] No automated test required — `shared/` is outside `api/`/`admin/`/`mcp-server/` and the file is pure data (see plan Notes)

## Validation: Production Deployment Configuration (deploy + nginx)
**Plan:** production-deploy-config.md
**Date:** 2026-07-03

### Manual checks
- [ ] `nginx -t` passes with `deploy/nginx.conf` as the server block and `deploy/nginx-http.conf` included from the `http {}` context (zones + `$page_csp` map resolve).
- [ ] `curl -I https://<domain>/.well-known/apple-app-site-association` returns 200 (the `location ^~ /.well-known/` block wins over the dotfile-deny rule); certbot webroot renewal succeeds.
- [ ] `https://<domain>/admin/` serves the admin login page (the new `location /admin/` alias), and its API calls still require auth (401 without a session).
- [ ] A fresh `./deploy.sh` run prints the reminder to populate `.env` and completes without error.

### Code-review checks
- [ ] The `map`, `limit_req_zone`, and `limit_conn_zone` directives live in `deploy/nginx-http.conf` (http context), not inside the `server` block.
- [ ] `deploy/nginx.conf` retains its security headers on `/` and `/admin/`; `/.well-known/` is exempted from the `location ~ /\.` deny.
- [ ] `setup/DEPLOYMENT.md` documents env-var population, the http-snippet include, `/admin/` serving, and the `reset-credentials.js --confirm` first-run step.
- [ ] SR-2 — no new runtime dependency introduced by the deploy changes.
