## Validation: Reconcile Evidence Schema Constraints with Admin Form
**Plan:** reconcile-evidence-schema-form.md
**Date:** 2026-07-07

### Manual checks
- [ ] Open `https://thejesuswebsite.org/admin/evidence/new.html`, fill in all four previously-broken fields (Gospel Category, Timeline Era, Map Location, Timeline Period), and save — should succeed without error.
- [ ] Verify the saved record's detail page shows the correct values for all four fields.

### Code-review checks
- [ ] **DB-1** — `database/schema.sql` `gospel_category` CHECK matches the form's `<option value="...">` list exactly.
- [ ] **DB-2** — `database/schema.sql` `timeline_era` CHECK matches the form's `<option value="...">` list exactly.
- [ ] **DB-3** — `database/schema.sql` `map_location` has no CHECK constraint (plain `TEXT`).
- [ ] **DB-4** — `database/schema.sql` `timeline_period` has no CHECK constraint (plain `TEXT`).
- [ ] **API-1** — `cd api && npm test` passes with no failures.
- [ ] **JS-2** — `pickWritable` in `api/models/evidence.model.js` still includes all four columns (`gospel_category`, `timeline_era`, `map_location`, `timeline_period`).

## Validation: Image Upload Pipeline
**Plan:** image-upload-pipeline.md
**Date:** 2026-07-08

### Manual checks
- [ ] `database/migrations/005_add_blog_hero_image.sql` applies cleanly against a fresh copy of `database/schema.sql` (run it against a scratch DB, not the shared dev DB).
- [ ] `PRAGMA table_info(blog_posts);` on the migrated DB shows both `hero_image` and `hero_image_alt` as nullable `TEXT` columns.

### Code-review checks
- [ ] `database/schema.sql`'s `blog_posts` table definition matches the post-migration schema exactly (both new columns present, same types).
- [ ] The migration only adds columns — no existing `blog_posts` row data, FTS table, or trigger is touched.
- [ ] The migration filename sorts after `004_reconcile_evidence_checks.sql` and `004_news_and_resource_search.sql`.

## Validation: Migration 007 — Restore Timeline Era/Period Taxonomy
**Plan:** admin-layout-timeline-mla-fixes.md
**Date:** 2026-07-08

### Manual checks
- [ ] Running `deploy.sh` on a copy of the production DB logs `Applying migration: 007_restore_timeline_era_period.sql` and completes without error.
- [ ] After migration, `PRAGMA table_info(evidence)` and the table SQL show `timeline_era` CHECK = beginning/middle/end and the 38-value `timeline_period` CHECK.
- [ ] Existing evidence rows survive with era/period remapped per the plan's mapping table; unmappable values are NULL, no rows lost.
- [ ] `evidence_fts` search still returns results and the `updated_at` trigger still fires after the rebuild.

### Code-review checks
- [ ] Migration uses RENAME → CREATE → INSERT…SELECT → DROP (data-preserving), unlike 004's drop-and-recreate
- [ ] FTS virtual table, its three sync triggers, `evidence_updated_at`, and both timeline indexes are all recreated
- [ ] `database/schema.sql` matches migration 007's table definition byte-for-byte in the CHECK lists
- [ ] Migration filename `007_*` sorts after `006_drop_unused_pictures_tables.sql`; no historical migration edited

## Validation: Open Issues Cleanup (July 8) — Migration Rename
**Plan:** open-issues-cleanup-july8.md
**Date:** 2026-07-08

### Manual checks
- [ ] `ls database/migrations/` shows no two files sharing a numeric prefix (`004_news_and_resource_search.sql` and `004b_reconcile_evidence_checks.sql` coexist; no plain `004_reconcile_evidence_checks.sql` remains).
- [ ] `ls database/migrations/*.sql | sort` lists `004_news_and_resource_search.sql` immediately before `004b_reconcile_evidence_checks.sql`, immediately before `005_add_blog_hero_image.sql` — apply order is preserved.
- [ ] On the VPS, **before** running `deploy.sh`: `sqlite3 database/thejesuswebsite.db "SELECT filename FROM schema_migrations WHERE filename LIKE '004%';"` returns `004b_reconcile_evidence_checks.sql` (and `004_news_and_resource_search.sql`), not the old `004_reconcile_evidence_checks.sql` name.
- [ ] After running `deploy.sh` on the VPS, its output contains no `[deploy] Applying migration: 004b_reconcile_evidence_checks.sql` line — confirming it was recognized as already-applied, not re-run.
- [ ] After deploy, `SELECT COUNT(*) FROM evidence;` on the VPS DB matches the pre-deploy count (no data loss from an accidental re-run).

### Code-review checks
- [ ] Migration content is byte-identical to the original `004_reconcile_evidence_checks.sql` except the header comment's migration number label — no logic changes to a historical migration (per `Website_guide.md`'s "Schema refactors are migrations, never edits to applied migration files" — this is a rename + label fix, not a logic edit).
- [ ] `git log --follow` on the renamed file still shows its full history (used `git mv`, not delete+create).

## Validation: Timeline Era & Period Refactor (Database)
**Plan:** timeline-era-period-refactor.md
**Date:** 2026-07-09

### Manual checks
- [ ] Run migration 008 against a scratch copy of the DB — completes without error and `schema_migrations` records it.
- [ ] After migration, `PRAGMA table_info(evidence)` and the table SQL show `timeline_era` CHECK with all eight new values.
- [ ] Existing evidence rows with `timeline_period = 'PreIncarnation'` now have `timeline_era = 'PreIncarnation'`; rows with `timeline_period = 'PassionSundayResurrection'` now have `timeline_era = 'PassionWeek'`; etc.
- [ ] Rows that had `timeline_period = NULL` with old `timeline_era = 'beginning'` are remapped to `'PreIncarnation'` (or whichever fallback era the migration chooses for unmappable old-era values).
- [ ] `evidence_fts` search still works after the migration.
- [ ] The `updated_at` trigger still fires after the rebuild.

### Code-review checks
- [ ] Migration filename `008_*` sorts after `007_restore_timeline_era_period.sql`.
- [ ] Migration uses RENAME → CREATE → INSERT…SELECT → DROP (data-preserving pattern from 007).
- [ ] `database/schema.sql` CHECK constraint matches migration 008's table definition byte-for-byte.
- [ ] No historical migration edited — only migration 008 and `schema.sql` are modified.
- [ ] The `ERA_ORDER` array in `api/models/timeline.model.js` lists the eight era values in the same narrative order as the period nesting.
