# Plan 01: Challenge Schema — Add Body Column, Drop URL Columns

**Module(s):** Database
**Date:** 2026-07-21
**Status:** ✅ Completed
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). -->
**Refactor:** Part 1 of 4 (challenge detail essay-grade refactor). Run first. Sequence: **01 schema → 02 API → 03 admin editors → 04 detail page**.

## Goal
Add a long-form `challenge_body` column to the `challenges` table and drop the four unused `challenge_url_a`–`challenge_url_d` columns (MLA sources supersede them). This is the schema foundation the later plans build on; no application code changes here.

## Coding rules to keep in mind
- **SQL-8** — foreign key pragma is enabled per-connection; the migration must not disturb it. A plain `ALTER TABLE` is safe.
- Migrations are forward-only, numbered, one concern per file — follow the existing `database/migrations/NNN_*.sql` convention.

## Tasks

### Database

- [x] **Create migration 032** — `ALTER TABLE challenges ADD COLUMN challenge_body TEXT;` then `ALTER TABLE challenges DROP COLUMN challenge_url_a;` … `_d` (SQLite ≥3.35 supports `DROP COLUMN`; the project's better-sqlite3 is newer). Header comment: body = expanded objection; URL columns removed because MLA sources replace them. File: `database/migrations/032_challenge_body_and_drop_urls.sql`
- [x] **Update the authoritative schema** — add `challenge_body TEXT` after `challenge_summary` and remove `challenge_url_a`–`challenge_url_d` from the `challenges` table definition so `schema.sql` matches the migrated DB. File: `database/schema.sql`

### Deploy & verify

- [x] **Push to GitHub** — `git add -p`, `git commit -m "challenge schema: add body, drop url columns"`, `git push`. Deploy runs the migration on the VPS automatically.
- [x] **Smoke test** — apply the migration to a copy of the DB (or run against the deployed DB post-deploy) and assert with `PRAGMA table_info(challenges)` that `challenge_body` is present and `challenge_url_a`–`_d` are gone; run the API test suite (`cd api && npm test`) to confirm no existing query breaks on the dropped columns. (This plan changes no browser-visible behaviour, so a smoke test is sufficient — no live test.)

## Files touched
- `database/migrations/032_challenge_body_and_drop_urls.sql` — created
- `database/schema.sql` — modified

## Error notification

**a) Does this plan impact existing error handling?** No. Pure schema change; no route, model, or `E-*` code touched.

**b) Should this plan add, update, or remove any error notification behaviour?** No.

## Notes
- **Destructive on purpose** (confirmed with user): dropping `challenge_url_a`–`_d` discards any data in them. They are not referenced anywhere in `frontend/` JS (verified), and Plan 02 removes them from the model whitelist/SELECTs — so nothing reads them after this.
- **No automated `.test.js`**: this plan touches no `.js` in `api/`, `admin/`, or `mcp-server/` — only SQL — so the automated-test mandate doesn't apply. The smoke test (PRAGMA assertion + existing suite) is the verification. Plan 02 adds the model-level tests that exercise the new column.
- **No sitemap change**: no HTML pages are added.
- **Ordering**: nothing in Plans 02–04 will run until this column exists. Do this first.

## Completion Protocol

**For any implementing agent — including LLMs other than Claude:**
- **Use a Python script for every markdown edit here (checkboxes, Status), never manual find/replace** — hand-edited markdown is a known corruption source in this codebase.
- **Marking progress**: change `- [ ]` → `- [x]` as each task is done and verified.
- **Logging issues**: log to `setup/Issues.md` only problems discovered during this plan's work; do not log the refactor's goal itself.
- **Shipped-artifact audit**: before completing, confirm migration 032 exists and `schema.sql` reflects both the added and dropped columns.
- **Plan lifecycle**: once all boxes are ticked and the audit passes, set **Status** to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — code and this plan file's own edits/move in the same push.
