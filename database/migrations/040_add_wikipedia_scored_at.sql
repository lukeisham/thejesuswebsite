-- Migration 040: Add scored_at to wikipedia_articles.
--
-- The public "Scores last updated" line was driven by created_at, which is
-- only stamped on INSERT. Re-scoring existing articles (the common case —
-- most deploys update rows that already exist, matched by URL) never
-- touched created_at, so the displayed date silently went stale even when
-- scores were freshly re-imported. scored_at is set on both insert and
-- update by import-wikipedia-scoring.js, so it actually tracks the last
-- real scoring run. SQLite disallows a non-constant default in
-- ALTER TABLE ADD COLUMN, so the column is added without one; the next
-- scoring import stamps every row explicitly.

ALTER TABLE wikipedia_articles ADD COLUMN scored_at DATETIME;
