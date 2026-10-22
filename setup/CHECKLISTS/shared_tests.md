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

## Validation: Cloudflare HTML Edge Caching & Origin Performance
**Plan:** 3-cloudflare-html-edge-caching.md
**Date:** 2026-07-11

### Manual checks
- [ ] Second `curl -sI https://thejesuswebsite.org/` shows `cf-cache-status: HIT`; same for /evidence/, /evidence/timeline/, /evidence/maps/.
- [ ] `/api/*` responses still show DYNAMIC/BYPASS (never HIT); admin pages never edge-cached.
- [ ] `curl -sI -H 'Accept-Encoding: gzip, br'` on the homepage and one CSS/JS asset shows a `content-encoding` header.
- [ ] After a deploy, a changed HTML page is visible at the edge within ~60s.
- [ ] Warm TTFB on cached pages is well under the previous ~280ms origin baseline.
- [ ] Homepage cold-start and maps-index variance findings are recorded in the plan's Notes.

### Code-review checks
- [ ] SR-3 — no caching applied to auth-bearing or dynamic routes; rule fails closed.
- [ ] `deploy/nginx.conf` comments document the HTML edge-cache contract (60s max-age bound).

## Validation: Captions for Dedicated (Non-Thumbnail) Images
**Plan:** dedicated-image-captions.md
**Date:** 2026-07-23

### Manual checks
- [ ] Migration applies cleanly to a **copy** of the dev database (never the live file) and adds `evidence.image_caption`, `challenges.challenge_picture_alt`, `challenges.challenge_picture_caption`
- [ ] `cd api && npm test` passes — a duplicate-column error here means the migration was not added to the `api/tests/helpers/db.js` skip-list
- [ ] Evidence editor (`edit-[id].html` and `new.html`): a "Caption" input appears below Alt Text, pre-fills from the saved value, and persists after Save → reload
- [ ] Academic challenge editors (both pages): Alt Text **and** Caption both appear, pre-fill, and persist — alt text was previously collected and silently discarded
- [ ] Popular challenge editors (both pages): identical behaviour to the academic ones
- [ ] **Thumbnail pickers show no Caption field** — blog `edit-[id].html`/`new.html` (blog_thumbnail) and news `index.html` modal (news_article_thumbnail) are visually unchanged
- [ ] Evidence detail page: an item with `image_caption` set shows that caption in the `<figcaption>`, and the `<img alt>` still comes from `image_alt` (the two are now independent)
- [ ] Evidence detail page, legacy record: an item with `image_alt` but no `image_caption` still shows the alt text as its caption (backward-compat fallback intact)
- [ ] Evidence detail page: an item with an image but neither field emits **no** `<figcaption>` element at all — not an empty one
- [ ] Challenge detail page: a challenge with a picture now renders it as a `<figure>` above the body — this has never displayed before
- [ ] Challenge detail page: a challenge with no picture renders nothing (no empty box, no broken `<img>`), and the console is clean
- [ ] Challenge picture participates in the same `Fig. N` numbering sequence as inline figures on the same page
- [ ] Challenge picture `<img>` has an `alt` attribute even when no alt was supplied (empty string)
- [ ] `curl` the live evidence and challenge detail API routes — the new fields are present in the JSON

### Code-review checks
- [ ] SQL-1/SQL-2/SQL-3 — new columns flow through `pickWritable`'s hardcoded whitelist and named parameters; no interpolation
- [ ] SQL-4 — no column name is derived from user input anywhere in the change
- [ ] SQL-6/SQL-7 — the new columns are **not** added to any `*_fts` table, trigger, or `WHEN` guard
- [ ] `database/schema.sql` updated to match the migration (schema.sql is authoritative per `CLAUDE.local.md`)
- [ ] `api/tests/helpers/db.js` skip-list updated with the new migration number, and its comment explains why
- [ ] SR-4 — the caption field is an opt-in option on the shared `AdminImagePicker`; no second picker variant, no per-page copy
- [ ] Both challenge models changed identically (`grep -c challenge_picture_caption` matches across both) — the `Issues.md` #97 one-of-two-models trap
- [ ] JS-2 — an absent caption renders no element; an absent alt still yields `alt=""`
- [ ] JS-6 — captions are escaped via the existing `html` tagged template / element factories; no raw `innerHTML` with author text
- [ ] HTML-1 — the challenge picture is a semantic `<figure>` + `<figcaption>`, placed inside `#challenge-content` before the body
- [ ] HTML-2 — every new `<img>` carries an `alt` attribute
- [ ] HTML-5 — the Caption input has a real `<label>` and `aria-describedby` hint, matching the Alt Text field
- [ ] CSS-1/CSS-2 — reuses `components/figures.css`; any new rules use existing tokens and stay in one component file
- [ ] Backward compatibility — the `image_caption || image_alt` figcaption fallback is present, so no published evidence record loses its caption on deploy
- [ ] Automated tests exist and pass: `api/tests/evidence.test.js` (image_caption round-trip), `api/tests/challenge-lifecycle.test.js` (picture alt/caption, both types), `admin/tests/admin-image-picker.test.js` (including the default-shape regression test)

---

## Validation: Python Offline Tooling Hygiene
**Plan:** python-offline-tooling-hygiene.md
**Date:** 2026-08-16

### Manual checks
- [ ] Every touched `.py` file passes `python3 -m py_compile`
- [ ] `rank_engine.py` produces the same ranking output on a fixture run before and after the rewrite (spot-check a few known articles' scores)
- [ ] `Wikipedia algorithm/tests/test_placement.py` and `test_section_awareness.py` still pass after their own `os.path` → `pathlib` rewrite
- [ ] Each narrowed `except` clause actually catches the exception type its `try` block can raise — spot-check by temporarily forcing a failure in 2-3 sites and confirming the narrowed clause still catches it (not silently falling through to an unhandled crash)
- [ ] No narrowed `except` clause silently swallows the error it now catches — each raises with context or exits non-zero

### Code-review checks
- [ ] PY-5 — no `os.path.*` remains in any of the 4 touched files; all paths anchor via `Path(__file__).resolve().parents[n]`
- [ ] PY-6 — no bare `except:` or `except Exception:` remains in any of the 9 touched files; each catches a specific type
- [ ] PY-4 — `rank_engine.py`'s remaining unannotated signatures now carry modern-generic annotations (`list[str]`, `dict[str, int]`, `str | None` — never `typing.List`/`Optional`)
- [ ] PY-9 — no `.fetchall()`/`.read()` on unbounded input was introduced while touching nearby lines

---

## Validation: Cluster-logic bridge cleanup
**Plan:** cluster-logic-bridge-cleanup.md
**Date:** 2026-10-19

### Manual checks
- [ ] Public timeline page (`/evidence/timeline/`, local dev server): no console error, and the dots draw in their era positions.
- [ ] Admin timeline editor (live, after sign-in): dots and labels draw, the era band shows, one horizontal spine, and the era dividers line up with the era bars.
- [ ] Admin timeline editor: drag a dot that was saved near a slot edge (offset above 0.45). It does not jump back, and it can move inwards.
- [ ] Admin arbor editor (live): edges draw, and an edge with waypoints keeps its route.
- [ ] Admin maps editor (live): pins that share a spot are fanned apart.
- [ ] If Group C ran: the browser console of each admin editor shows no "is not defined" error for any `window.Admin*` global.
- [ ] No Save button was clicked and no record was changed during the live check.

### Code-review checks
- [ ] CORE-2 — every edited file has comments that give the why and name the link to other files, with no history, dates or issue numbers.
- [ ] CORE-3, CORE-5 — `setup/ARCHITECTURE/Website_guide.md` and `setup/ARCHITECTURE/timeline.md` match the bridge files and the guide test.
- [ ] CORE-4 — if Group C ran, `setup/Decisions_log.md` has a new entry that changes D-025, and the reply names it.
- [ ] AG-1, AG-3 — no bridge holds logic, and no option or fallback was added.
- [ ] SR-4 — the drag clamp rule exists once, in `frontend/assets/js/cluster-logic/timeline-offsets.js`.
- [ ] JS-7 — `clampDragOffsetX` carries `@param` and `@returns`.
- [ ] TEST-9 — tests that read a removed bridge name read it from the canonical module.
- [ ] Touch rule + CORE-5 — `frontend/assets/js/cluster-logic/timeline-offsets.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/js/cluster-logic/tests/timeline-offsets.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/admin-timeline/timeline-node-bounds.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/cluster-density-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/cluster-labels-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/cluster-label-layout-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/cluster-map-pins-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/timeline-era-heading-placement-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/cluster-logic-bridge/timeline-offsets-bridge.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/diagrams/timeline.html`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/js/admin-timeline/timeline-events.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/js/cluster-logic/cluster-label-layout.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/js/timeline/timeline-era-heading-placement.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/tests/admin-timeline.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/tests/admin-timeline-node-drag.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/tests/admin-timeline-node-bounds.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/tests/maps.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/tests/cluster-logic-bridges.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/tests/guide-website-guide.test.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/Website_guide.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/timeline.md`: comments give the why and the links, the guide matches the file
- [ ] TEST-10 — `api/tests/guide-website-guide.test.js`: fails with the rule, file, line and guide path; exceptions are named with a reason

## Validation: Dependency guide and dependency log
**Plan:** dependency-guide-and-log.md
**Date:** 2026-10-22

### Manual checks
- [ ] `setup/ARCHITECTURE/dependencies.md` opens with a purpose of 40 words or fewer, has numbered headings, and holds no version number or advisory ID.
- [ ] `setup/DEPENDENCIES/Dependency_log.md` exists, is ignored by git (`git check-ignore -v setup/DEPENDENCIES/Dependency_log.md` prints the `/setup/*` rule), and holds row `DEP-001` for Express with status `open`.
- [ ] `DEP-001` states that the lock installs Express 4.22.2 and that no file in `api/` calls `res.redirect`.
- [ ] `node setup/scripts/check-architecture-docs.js` reports no dead path (the guide names the log without backticks).
- [ ] `setup/ARCHITECTURE/INDEX.md` lists `dependencies.md` in its Files table.
- [ ] `cd api && npm test` passes, including `guide-dependencies.test.js` and `guide-decisions-log.test.js`.

### Code-review checks
- [ ] CORE-4 — the new decision row in `setup/Decisions_log.md` has 12 cells, names Luke, and gives the reason (public repository).
- [ ] CORE-4 — the home table in `setup/Vibe_coding_rules.md` has one new row for the log, and no other change.
- [ ] CORE-6 / DOC-1 / DOC-2 — `setup/ARCHITECTURE/dependencies.md` and `setup/DEPENDENCIES/Dependency_log.md` open with a purpose of 40 words or fewer.
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/INDEX.md`: purpose, numbered headings, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/Vibe_coding_rules.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/Decisions_log.md`: new row only, entries untouched
- [ ] TEST-10 — `api/tests/guide-dependencies.test.js`: fails with the rule, file, line and guide path; exceptions are named with a reason
