-- Journal article metadata columns: two_column layout flag, DOI/citation, and
-- author bio. Added to all three journal content tables — context_essays,
-- responses, and historiography. Run with:
--   sqlite3 database/thejesuswebsite.db < database/migrations/003_journal_article_metadata.sql

ALTER TABLE context_essays ADD COLUMN two_column INTEGER DEFAULT 0 CHECK (two_column IN (0,1));
ALTER TABLE context_essays ADD COLUMN doi TEXT;
ALTER TABLE context_essays ADD COLUMN author_bio TEXT;

ALTER TABLE responses ADD COLUMN two_column INTEGER DEFAULT 0 CHECK (two_column IN (0,1));
ALTER TABLE responses ADD COLUMN doi TEXT;
ALTER TABLE responses ADD COLUMN author_bio TEXT;

ALTER TABLE historiography ADD COLUMN two_column INTEGER DEFAULT 0 CHECK (two_column IN (0,1));
ALTER TABLE historiography ADD COLUMN doi TEXT;
ALTER TABLE historiography ADD COLUMN author_bio TEXT;
