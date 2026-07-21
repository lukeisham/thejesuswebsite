# Plan 02: Challenge API — Normalized Detail + MLA Persistence

**Module(s):** API
**Date:** 2026-07-21
**Status:** ✅ Completed
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). -->
**Refactor:** Part 2 of 4. Run after Plan 01 (needs the `challenge_body` column and dropped URL columns). Sequence: **01 schema → 02 API → 03 admin editors → 04 detail page**.

## Goal
Fix the public `GET /:slug` contract so it returns normalized `title`/`summary`/`body`/`bibliography` instead of raw DB columns (this alone fixes the "Untitled Challenge" bug), and give both challenge models MLA read/write parity with essays: essay-shaped `getLinkedMlaSources` on read and transactional `createComposite`/`updateComposite` that persist `mla_source_ids` into the existing `challenge_mla_sources` junction. Backend only — no browser-visible change yet.

## Coding rules to keep in mind
- **SQL-3 / SQL-4** — add `challenge_body` to `WRITABLE_COLUMNS`, remove the four `challenge_url_*` entries; MLA links persist only via `replaceLinks()` with the hardcoded, already-whitelisted `challenge_mla_sources` / `challenge_id` identifiers (see `api/models/relations/junctions.js`).
- **JS-5** — composite create/update must be transactional so a mid-write failure never leaves half-written junction rows (mirror the essay model's `createComposite`/`updateComposite`).
- **JS-2** — public `getBySlug()` keeps returning `undefined` for missing/unpublished slugs; the route maps that to `SQL_RECORD_NOT_FOUND`.
- **SQL-1 / SQL-2** — all SQL stays prepared statements with `?` / named params.

## Tasks

### API

- [x] **Rework the popular model** — in `api/models/popular-challenges.model.js`: (a) add `"challenge_body"` and remove the four `challenge_url_*` entries in `WRITABLE_COLUMNS`; (b) drop `challenge_url_*` from the `getAllPublished()` SELECT; (c) add a `normalizeForPublic()` mapper (`challenge_title→title`, `challenge_summary→summary`, `challenge_body→body`, keep `mla_sources`, add `bibliography: mla_sources`) and route the public detail through it; (d) attach MLA via `getLinkedMlaSources("challenge_mla_sources","challenge_id","citation_order",id)` so `getDetailBySlug()` is essay-shaped while `getAdminById()` keeps raw columns; (e) add `createComposite`/`updateComposite` wrapping `create`/`update` + `replaceLinks("challenge_mla_sources","challenge_id","mla_source_id","citation_order",id,mla_source_ids)` in a transaction. File: `api/models/popular-challenges.model.js`
- [x] **Mirror all of the above in the academic model** — identical changes. File: `api/models/academic-challenges.model.js`
- [x] **Point the popular routes at the composite writers** — `POST /` → `createComposite(req.body)`, `PUT /:id` → `updateComposite(...)`. File: `api/routes/popular-challenges.js`
- [x] **Mirror the route change for academic** — File: `api/routes/academic-challenges.js`
- [x] **Extend challenge lifecycle tests** — this file builds its own in-memory `CREATE TABLE challenges` fixture (currently has `challenge_url_a`–`_d`, no `challenge_body`); update that DDL to match the migrated schema (add `challenge_body TEXT`, drop the four `challenge_url_*` columns) or `pickWritable`'s new whitelist will try to write a column the fixture doesn't have. Remove/rewrite the existing test around line 624 that asserts `challenge_url_a`/`challenge_url_b` round-trip as writable. Then assert `getDetailBySlug()` returns `title`/`summary`/`body`/`bibliography`; `challenge_body` round-trips; `mla_source_ids` link and reload via `createComposite`/`updateComposite`; `challenge_url_*` are no longer writable. File: `api/tests/challenge-lifecycle.test.js`

### Deploy & verify

- [x] **Push to GitHub** — `git add -p`, `git commit -m "challenge API: normalized detail + MLA persistence"`, `git push`.
- [x] **Smoke test** — run the API suite (`cd api && npm test`), including the new lifecycle assertions. After deploy, `curl -s https://thejesuswebsite.org/api/popular-challenges/<slug>` and the academic equivalent, asserting the JSON now contains `title`/`summary`/`body`/`bibliography` and no longer contains `challenge_url_*`. (These are JSON/API checks, not browser rendering — a smoke test is the right verification; the user-facing render is live-tested in Plan 04.)

## Files touched
- `api/models/popular-challenges.model.js` — modified
- `api/models/academic-challenges.model.js` — modified
- `api/routes/popular-challenges.js` — modified
- `api/routes/academic-challenges.js` — modified
- `api/tests/challenge-lifecycle.test.js` — modified

## Error notification

**a) Does this plan impact existing error handling?** No new `E-*` codes. The `/:slug` route already returns `SQL_RECORD_NOT_FOUND` via `sendError` for missing/unpublished slugs, unchanged. The composite writers' transaction throws on failure and is caught by the existing route `try/catch` → generic 500, consistent with the essay/blog routes.

**b) Should this plan add, update, or remove any error notification behaviour?** No.

## Notes
- **This is the plan that actually fixes "Untitled Challenge"** at the data layer — once the detail route returns `title`, even the current frontend renderer (which reads `challenge.title`) stops showing "Untitled". Full body/figure/citation rendering still needs Plan 04.
- **Normalize only the public path** (`getDetailBySlug` → `normalizeForPublic`). The admin path (`getAdminById`) must keep raw column names, because the Plan 03 editors read raw keys (`challenge_title`, `challenge_body`, `mla_sources` with ids) to populate the form.
- **MLA plumbing is half-built already**: the junctions and `getDetailBySlug` attachment exist and `relations/junctions.js` already whitelists `challenge_mla_sources` / `challenge_id`. This plan only adds the write path and the essay-shaped read.
- **Depends on Plan 01** — the model must not reference `challenge_url_*` or `challenge_body` before the migration has run.
- **No sitemap change**.

## Completion Protocol

**For any implementing agent — including LLMs other than Claude:**
- **Use a Python script for every markdown edit here, never manual find/replace.**
- **Marking progress**: `- [x]` → `- [x]` as each task completes and its test passes.
- **Logging issues**: log only problems discovered during this plan's work; not the refactor goal.
- **Automated tests are mandatory here** (this plan touches `api/*.js`) — the lifecycle-test task covers it; do not mark the plan done with that box unchecked.
- **Shipped-artifact audit**: confirm both models have the whitelist swap + `normalizeForPublic` + `getLinkedMlaSources` + composite writers, both routes call the composite writers, and the new tests exist and pass.
- **Plan lifecycle**: once all boxes are ticked and the audit passes, set **Status** to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step**.
