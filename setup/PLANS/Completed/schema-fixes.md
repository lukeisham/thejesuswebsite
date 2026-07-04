# Plan: Schema Fixes

**Module(s):** Database
**Date:** 2026-06-16

## Goal
Fix all syntax errors, structural gaps, and consistency issues in `database/schema.sql` so the schema runs cleanly, enforces its own constraints, and covers every table the API models and admin reference.

## Coding rules to keep in mind
- **SR-1** — Each task touches exactly one file or one tightly scoped change.
- **SR-2** — No external dependencies; all fixes are plain SQL.
- **SR-3** — Schema correctness directly serves performance (proper indexes, correct types).

## Tasks

### Syntax errors — fix first (schema will not run without these)

- [x] **Fix missing comma in `challenges`** — Added comma after `metadata_keywords TEXT`.
- [x] **Fix missing comma in `responses`** — Added comma after `metadata_keywords TEXT`.
- [x] **Fix missing comma in `historiography`** — Added comma after `metadata_keywords TEXT`.
- [x] **Fix missing comma in `news_articles`** — Added comma after `metadata_keywords TEXT`.
- [x] **Fix missing comma in `wikipedia_articles`** — Added comma after `metadata_keywords TEXT`.

### PRAGMA fix

- [x] **Remove `PRAGMA foreign_keys = ON` from `database/schema.sql`** — Replaced with a comment directing the API to set this on each connection in `api/config.js`.

### Missing tables — add to `database/schema.sql`

- [x] **Add `credentials` table** — Stores WebAuthn passkey public keys, credential IDs, user handles, and sign count.
- [x] **Add `analytics` table** — Stores page, referrer, and visited_at for the admin analytics dashboard.
- [x] **Add `collections` table** — Placeholder for future education collections.
- [x] **Add `resources` table** — Stores curated resource list items with list_number and sort_order.
- [x] **Add `maps` table** — Stores named map regions with map_key, map_name, description, image_path.
- [x] **Add `map_pins` table** — Stores pins on each map linked to evidence items with x/y coordinates.

### Structural corrections — `database/schema.sql`

- [x] **Replace `map_coordinates INTEGER` with `map_x REAL, map_y REAL`** — On the `evidence` table.
- [x] **Rename `parent_child_id` to `parent_id` on `evidence`** — Column and FK declaration updated.
- [x] **Remove `resource_lists TEXT` from `evidence`** — Replaced with `evidence_resource_lists` junction table referencing `resources`.
- [x] **Remove duplicate `key_words TEXT` from `blog_posts`** — Removed; `metadata_keywords` covers this.
- [x] **Replace numbered breakout/picture columns** — All `_a/_b/_c/_d` columns removed; replaced with `response_breakouts`, `essay_breakouts`, `blog_breakouts`, `historiography_breakouts`, `response_pictures`, `essay_pictures`, `blog_pictures`, `historiography_pictures` child tables.

### Consistency fixes — `database/schema.sql`

- [x] **Add `UNIQUE NOT NULL` to all `slug` columns** — Applied across all content tables.
- [x] **Add `CHECK (published_draft IN (0, 1))` to all `published_draft` columns** — Applied to all 11 tables.
- [x] **Move `slug` column to top of each table's column list** — Fixed in `challenges`, `news_articles`, `wikipedia_articles`; others already correct.

### Indexes — `database/schema.sql`

- [x] **Add indexes on all FK columns in junction tables** — 42 `CREATE INDEX` statements added covering all junction, link, identifier, breakout, picture, and resource list tables.
- [x] **Add index on `evidence.timeline_era`, `evidence.timeline_period`, `evidence.map_location`** — Done.
- [x] **Add index on `challenges.challenge_rank_number`** — Done.
- [x] **Add index on `analytics.page` and `analytics.visited_at`** — Done.

### Migration file

- [x] **Write `database/migrations/001_initial.sql`** — Copied from final `schema.sql`.

## Files touched
- `database/schema.sql` — modified
- `database/migrations/001_initial.sql` — created

## Notes
- The `PRAGMA` removal note: add `db.pragma('foreign_keys = ON')` to `api/config.js` — flagged for the API build plan.
- `responses.slug` — responses don't currently have their own public URL. Slug is present for consistency; confirm in API plan whether a slug route is needed.
- `identifiers.pledius_number` / `pledius_name` — spelling unconfirmed; verify before finalising.
- `mla_sources` mixes website/book/journal fields (many NULLs per row). Optional improvement: add `source_type TEXT CHECK (source_type IN ('website','book','journal'))` — deferred.
