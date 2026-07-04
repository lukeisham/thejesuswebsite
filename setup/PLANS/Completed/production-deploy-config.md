# Plan: Production Deployment Configuration

**Module(s):** API / Shared (deploy + docs)
**Date:** 2026-07-03
**Status:** ✅ Completed

## Goal
Close the deployment-level blockers that prevent a correct production launch:
environment variables are never loaded into the running process (so passkey
login, the setup lock, secure cookies, and the WebAuthn origin check all
misbehave on the real domain), 47 stale test credentials in the production
database permanently lock passkey enrolment, and `deploy/nginx.conf` will not
pass `nginx -t` while also blocking `/.well-known/` and never serving the admin
panel. This plan makes a fresh `./deploy.sh` on the VPS produce a working,
secure site.

## Coding rules to keep in mind
- **SR-2** — No non-visual dependencies. The env loader must be hand-rolled with
  Node built-ins (`fs`), matching the project's existing pattern of hand-rolling
  cookie parsing, rate limiting, and WebAuthn rather than pulling `dotenv`.
- **JS-2** — Robust & predictable. The env loader must not overwrite variables
  already present in `process.env` (so tests that set `DB_PATH=:memory:` keep
  working), and the credential-reset script must refuse to run without an
  explicit confirmation flag so it can never be triggered by accident.
- **JS-3** — Modern & simple. Small, single-purpose modules; no config framework.
- **JS-4** — Comments explain *why* (e.g. why load-env must be required first).

## Tasks

### API — environment loading

- [x] **Create a dependency-free `.env` loader** — parse `KEY=VALUE` lines from
  the project-root `.env` with `fs`, skipping blanks/comments, and assign each
  key to `process.env` **only if not already set**. File:
  `api/config/load-env.js`
- [x] **Load env before anything else at boot** — make `require("./config/load-env")()`
  the very first statement in the entry point, above every other `require`, so
  `RP_ID`/`ORIGIN`/`NODE_ENV`/`SETUP_TOKEN` are populated before `config.js` and
  `routes/passkey.js` read them at module-load time. File: `api/server.js`
- [x] **Test the env loader** — cover: sets a missing key, does **not** override
  an already-set key, ignores comments/blank lines, tolerates a missing `.env`
  file without throwing. File: `api/tests/load-env.test.js`
- [x] **Document required env vars in `.env`** — add commented placeholders for
  `RP_ID` (must equal the production domain), `ORIGIN` (full `https://` origin
  for the WebAuthn check), `NODE_ENV=production`, and `PORT`, alongside the
  existing `SETUP_TOKEN`. File: `.env`

### API — stale credential cleanup

- [x] **Create a guarded credential-reset script** — delete all rows from the
  `credentials` table (returning the count removed) so the real admin can enrol
  a fresh passkey; refuse to run unless invoked with a `--confirm` argument
  (JS-2: never destructive by default). File: `api/scripts/reset-credentials.js`
- [x] **Test the reset script's guard and effect** — against an in-memory DB:
  seeded rows survive without `--confirm`, and are all removed with it. File:
  `api/tests/reset-credentials.test.js`

### Deploy — nginx correctness

- [x] **Create the http-context nginx snippet** — hold the `limit_req_zone`,
  `limit_conn_zone`, and the `$page_csp` `map` (all of which are only valid in
  the `http` context, not inside a `server` block). File: `deploy/nginx-http.conf`
- [x] **Fix the server block** — remove the in-`server` `map` (now in the http
  snippet); add `location ^~ /.well-known/ { }` so certbot's ACME challenge and
  the apple-app-site-association file are served (the `location ~ /\.` deny rule
  currently swallows them); add a `location /admin/` block that `alias`es the
  sibling `admin/` directory with the same security headers. File:
  `deploy/nginx.conf`

### Deploy — orchestration & docs

- [x] **Wire env + credential steps into the deploy script** — after the schema
  step, echo a reminder to populate `.env`; the app now self-loads it at boot so
  no shell `export` is needed. Reference `reset-credentials.js` in a comment for
  first-time setup. File: `deploy.sh`
- [x] **Document the full first-run sequence** — in the deployment guide, add:
  populate `.env` (with `RP_ID`/`ORIGIN`/`NODE_ENV`/`SETUP_TOKEN`), include
  `deploy/nginx-http.conf` from the nginx `http` block, how `/admin/` is served,
  and running `node scripts/reset-credentials.js --confirm` before enrolling the
  first real passkey. File: `setup/DEPLOYMENT.md`

## Files touched
- `api/config/load-env.js` — created
- `api/server.js` — modified
- `api/tests/load-env.test.js` — created
- `.env` — modified
- `api/scripts/reset-credentials.js` — created
- `api/tests/reset-credentials.test.js` — created
- `deploy/nginx-http.conf` — created
- `deploy/nginx.conf` — modified
- `deploy.sh` — modified
- `setup/DEPLOYMENT.md` — modified

## Notes
- **Ordering:** the loader (`load-env.js`) must exist and be required *first* in
  `server.js` before any module that reads `process.env` at load time
  (`config.js` reads `DB_PATH`; `routes/passkey.js` reads `RP_ID` into a `const`).
  Requiring it anywhere below those is a silent no-op.
- **Test compatibility (JS-2):** the loader must not override existing
  `process.env` keys — the API test suite sets `DB_PATH=:memory:` before
  requiring `config`. "Don't override" also matches standard dotenv semantics.
- **Secrets stay out of git:** `.env` is already git-ignored; the task only adds
  commented placeholders, never real token values. `SETUP_TOKEN` is generated on
  the VPS per the instructions already in `.env`.
- **Why no `dotenv` dependency:** SR-2 forbids non-visual dependencies. A ~25-line
  `fs`-based parser is consistent with the project hand-rolling its cookie
  parser, rate limiter, and WebAuthn core for the same reason.
- **nginx zones vs. server block:** `map`, `limit_req_zone`, and `limit_conn_zone`
  are http-context directives; they cannot live in the included `server` block.
  The snippet is meant to be included from `conf.d/` or the main `http {}` block.
  Validate with `nginx -t` after wiring.
- **Admin exposure:** the admin panel is static HTML with all data behind the
  authenticated API, so serving `/admin/` publicly exposes no data — but this is
  an owner-visible decision (an IP allowlist or basic-auth in front of `/admin/`
  is an option). Logged to Issues.md for sign-off.
- The `credentials` deletion is irreversible; the `--confirm` guard plus the
  fact that WebAuthn credentials are re-enrollable (not recoverable secrets)
  makes this safe. Back up the DB file first per the deploy guide.

---

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [x]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
