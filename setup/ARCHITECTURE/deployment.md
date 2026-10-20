# Deployment

A push to `main` changes the live site. The deploy makes the VPS match the repository, rebuilds the
generated files, restarts the services and clears the edge cache, in an order that never serves stale content.

**Source of truth:** `.github/workflows/deploy.yml` and `deploy.sh` — win any disagreement with this doc.
**Spans:** `.github/workflows/deploy.yml`, `api/routes/deploy-webhook.js`, `api/routes/deploy-status.js`, `deploy.sh`, `scripts/pm2-apply.js`, `ecosystem.config.js`, `deploy/nginx.conf`, `api/scripts/version-assets.js`, `api/scripts/deploy-step-cache.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The flow is one way: local, then GitHub, then VPS. Nothing is live until it is pushed and deployed | Only the code on the VPS has effect, which matters most for security and auth fixes | A fix stays local and the site stays unsafe |
| Every fix made directly on the VPS is mirrored into the local tree and pushed | Each deploy runs `git reset --hard origin/main` | The next deploy erases the hot fix |
| The webhook runs `deploy.sh` with `SKIP_RESTART=1`, replies, then starts `scripts/pm2-apply.js` detached | A pm2 restart inside `deploy.sh` kills the process that serves the webhook | The deploy stops halfway and the workflow waits for a status that never comes |
| The order is: asset stamp, nginx reload (both inside `deploy.sh`), pm2 restart and health check, Cloudflare purge | The purge must run after the origin serves new content | A purge that runs earlier lets the edge cache old bytes again |
| The purge step never has `continue-on-error`. A failed purge, restart or health check turns the job red on purpose | A red job is the only signal | The edge serves old content and the job looks green |
| `api/scripts/version-assets.js` runs on the VPS working copy only, never in the committed tree | Each reset removes the stamp and the next deploy applies it again | A stamp in the committed tree makes local dev and the diff noisy. A missing stamp on the VPS serves old JS and CSS (`performance-and-caching.md`) |
| `/etc/nginx/sites-available/thejesuswebsite` on the VPS is a symlink to `deploy/nginx.conf` | `deploy.sh` reloads the file at that path and never copies the repo file there | A committed header change reloads "successfully" and has no effect |
| Only one deploy runs at a time: the workflow has a `concurrency` group, and the webhook returns 409 while a deploy runs | Two deploys would reset and restart over each other | Two resets and restarts overlap, and the site can end in a half-updated state |
| Files ignored by git (most of `setup/`, `.env`, `*.db`) never reach GitHub or the VPS. `.gitignore` lists the `setup/` files that are tracked | The VPS gets the repository only | A rule or script that lives in an ignored file does not exist in production |

Rows 3, 4 (order inside `deploy.sh` and the step order in the workflow), 5 and 8 are enforced by `api/tests/guide-deployment.test.js` (TEST-10). The other rows are not.

## Shape

1. A push to `main` triggers `.github/workflows/deploy.yml`.
2. The workflow calls the HTTPS deploy webhook in `api/routes/deploy-webhook.js`. The webhook runs the reset, then `deploy.sh`.
3. `deploy.sh` runs migrations, `npm run pages`, `npm run sitemap`, the about-page date stamps, data embedding, the asset stamp and the nginx reload.
4. `scripts/pm2-apply.js` restarts the pm2 processes and runs the health check.
5. The workflow polls `/api/deploy-status` until the restart and health checks pass, then purges the Cloudflare cache.

`deploy.sh` skips its slow steps (`npm install` for `api/` and `mcp-server/`, the GeoIP import, the Wikipedia scoring import) when their input files are unchanged since the step last succeeded. `FORCE_FULL_DEPLOY=1` runs every step. The sitemap, static pages, date stamps, data embedding and asset stamping always run, because they read the production database and the reset restores their tracked outputs.

## Extending it

- **A new deploy step:** add it to `deploy.sh` before the nginx reload if it changes served files. Keep the purge last.
- **A new pm2 process:** define it in `ecosystem.config.js`, and add its health route to `HEALTH_URLS` in `scripts/pm2-apply.js`.
- **A slow step that can be skipped:** wrap it in `deploy-step-cache.js check` and `record` calls in `deploy.sh`. A step that fails is never recorded, so it runs again.

## Not documented here

The migration list is in `database/migrations/`. The nginx rules are in `deploy/nginx.conf`, and the pm2 paths are in `ecosystem.config.js`.
