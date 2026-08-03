-- Migration 041: Add title and external_url columns to identifiers table.
-- `title` is a human-readable display name (e.g. "Codex Sinaiticus" for manuscript_number "01").
-- `external_url` is an optional URL that opens in a new tab (e.g. a museum page or Wikipedia article).
-- Both are nullable — existing rows get NULL for both columns.

ALTER TABLE identifiers ADD COLUMN title TEXT;
ALTER TABLE identifiers ADD COLUMN external_url TEXT;
