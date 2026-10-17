-- Migration 046: Drop the spellcheck_dictionary table.
--
-- The admin now uses the browser's own spellcheck. The learned and ignored
-- words that this table held are not used by any route, model or page, so the
-- table is orphaned. Luke confirmed the drop. The browser keeps its own word
-- list, so the old words do not carry over. A grep for spellcheck_dictionary
-- outside database/ finds no reader or writer.
-- Safe to run on fresh databases (IF EXISTS handles the new-schema case).
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/046_drop_spellcheck_dictionary.sql

DROP INDEX IF EXISTS idx_spellcheck_dictionary_normalized;
DROP TABLE IF EXISTS spellcheck_dictionary;
