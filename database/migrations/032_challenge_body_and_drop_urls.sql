-- 032_challenge_body_and_drop_urls.sql
-- Add long-form challenge_body column and drop the four unused
-- challenge_url_a–d columns (MLA sources supersede the legacy URL slots).
-- SQLite >= 3.35 required (DROP COLUMN); better-sqlite3 is current enough.
--
-- Also drops two orphaned FTS triggers that block the DROP COLUMN
-- (their backing virtual tables were removed in a prior migration but
-- the triggers were never cleaned up). Script is idempotent via IF EXISTS.

-- Clean up orphaned triggers first — they block DROP COLUMN because
-- SQLite rebuilds the table and validates every referencing trigger.
DROP TRIGGER IF EXISTS news_articles_fts_au;
DROP TRIGGER IF EXISTS resources_fts_au;

ALTER TABLE challenges ADD COLUMN challenge_body TEXT;

ALTER TABLE challenges DROP COLUMN challenge_url_a;
ALTER TABLE challenges DROP COLUMN challenge_url_b;
ALTER TABLE challenges DROP COLUMN challenge_url_c;
ALTER TABLE challenges DROP COLUMN challenge_url_d;
