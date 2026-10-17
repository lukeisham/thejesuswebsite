-- Migration 047: Add the abstract, response strength and footnote fields.
--
-- Need: the essay, response and historiography detail pages already render an
-- abstract block, a footnote list and (responses only) a strength indicator,
-- but no column fed them, so the blocks never showed.
--
-- Fix:
--   * abstract TEXT on context_essays, responses and historiography.
--   * strength INTEGER (1 to 5, NULL = not rated) on responses only.
--   * One footnote child table per content type, shaped like the breakout
--     tables so api/models/relations/child-rows.js can read and replace them.
--     A body marker [fn:N] points to the footnote at list position N
--     (sort_order + 1), because replaceChildren() re-inserts rows on every
--     save and the row ids change.
--
-- No FTS table or trigger changes: the *_fts tables name their columns, and the
-- *_fts_au triggers fire only on title, content and keywords.
--
-- ALTER TABLE ... ADD COLUMN has no IF NOT EXISTS in SQLite, so those four
-- statements are not re-runnable. deploy.sh records this file in
-- schema_migrations and runs it once. The tables and indexes use IF NOT EXISTS.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/047_add_journal_article_fields.sql

ALTER TABLE context_essays ADD COLUMN abstract TEXT;
ALTER TABLE responses ADD COLUMN abstract TEXT;
ALTER TABLE historiography ADD COLUMN abstract TEXT;
ALTER TABLE responses ADD COLUMN strength INTEGER CHECK (strength IS NULL OR strength BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS essay_footnotes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    content          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS response_footnotes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    content     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historiography_footnotes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    content           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_essay_footnotes          ON essay_footnotes (context_essay_id);
CREATE INDEX IF NOT EXISTS idx_response_footnotes       ON response_footnotes (response_id);
CREATE INDEX IF NOT EXISTS idx_historiography_footnotes ON historiography_footnotes (historiography_id);
