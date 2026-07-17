-- Migration 027: Add created_at to wikipedia_articles.
-- Records when a row was uploaded to THIS website (not the Wikipedia article's
-- own revision date). Drives the "Last updated" line on the public Wikipedia
-- list. SQLite disallows a non-constant default (CURRENT_TIMESTAMP) in
-- ALTER TABLE ADD COLUMN, so the column is added without a default and existing
-- rows are backfilled; new inserts are stamped by the model / schema default.

ALTER TABLE wikipedia_articles ADD COLUMN created_at DATETIME;

UPDATE wikipedia_articles SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
