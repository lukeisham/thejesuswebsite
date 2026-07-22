-- 033_reorder_fts_update_triggers.sql
-- Fix: editing/saving a record failed with SQLITE_CORRUPT_VTAB
-- ("A data lookup failed" in the admin) under SQLite >= 3.53 (bundled by
-- better-sqlite3 12.x).
--
-- Root cause: every FTS-backed table has TWO "AFTER UPDATE" triggers — the
-- FTS sync trigger (*_fts_au) and the row's *_updated_at trigger. SQLite fires
-- same-event triggers in CREATION ORDER. In schema.sql the FTS triggers were
-- created BEFORE the *_updated_at triggers, so the FTS index was synced first,
-- then the *_updated_at trigger issued a SECOND UPDATE on the same row. Under
-- SQLite >= 3.53's stricter FTS5, that post-sync content change leaves the
-- external-content index inconsistent, and the next write to a column that was
-- empty across all rows fails with SQLITE_CORRUPT_VTAB. Older SQLite (3.45)
-- tolerated it silently.
--
-- Fix: drop and recreate each *_fts_au trigger. Because the *_updated_at
-- triggers already exist by the time this migration runs, recreating the FTS
-- triggers moves them to the END of creation order, so they fire LAST — after
-- updated_at has settled — keeping the FTS index consistent.
--
-- The trigger bodies are byte-identical to schema.sql; only their creation
-- order changes. Safe to re-run: each is dropped IF EXISTS before recreation.

DROP TRIGGER IF EXISTS evidence_fts_au;
CREATE TRIGGER evidence_fts_au AFTER UPDATE ON evidence
WHEN NEW.title IS NOT OLD.title
   OR NEW.description IS NOT OLD.description
   OR NEW.primary_verse IS NOT OLD.primary_verse
   OR NEW.metadata_keywords IS NOT OLD.metadata_keywords
BEGIN
    INSERT INTO evidence_fts(evidence_fts, rowid, title, description, primary_verse, metadata_keywords)
    VALUES ('delete', old.id, old.title, old.description, old.primary_verse, old.metadata_keywords);
    INSERT INTO evidence_fts(rowid, title, description, primary_verse, metadata_keywords)
    VALUES (new.id, new.title, new.description, new.primary_verse, new.metadata_keywords);
END;

DROP TRIGGER IF EXISTS responses_fts_au;
CREATE TRIGGER responses_fts_au AFTER UPDATE ON responses
WHEN NEW.response_title IS NOT OLD.response_title
   OR NEW.response_content IS NOT OLD.response_content
   OR NEW.metadata_keywords IS NOT OLD.metadata_keywords
BEGIN
    INSERT INTO responses_fts(responses_fts, rowid, response_title, response_content, metadata_keywords)
    VALUES ('delete', old.id, old.response_title, old.response_content, old.metadata_keywords);
    INSERT INTO responses_fts(rowid, response_title, response_content, metadata_keywords)
    VALUES (new.id, new.response_title, new.response_content, new.metadata_keywords);
END;

DROP TRIGGER IF EXISTS context_essays_fts_au;
CREATE TRIGGER context_essays_fts_au AFTER UPDATE ON context_essays
WHEN NEW.essay_title IS NOT OLD.essay_title
   OR NEW.essay_content IS NOT OLD.essay_content
   OR NEW.metadata_keywords IS NOT OLD.metadata_keywords
BEGIN
    INSERT INTO context_essays_fts(context_essays_fts, rowid, essay_title, essay_content, metadata_keywords)
    VALUES ('delete', old.id, old.essay_title, old.essay_content, old.metadata_keywords);
    INSERT INTO context_essays_fts(rowid, essay_title, essay_content, metadata_keywords)
    VALUES (new.id, new.essay_title, new.essay_content, new.metadata_keywords);
END;

DROP TRIGGER IF EXISTS blog_posts_fts_au;
CREATE TRIGGER blog_posts_fts_au AFTER UPDATE ON blog_posts
WHEN NEW.blog_title IS NOT OLD.blog_title
   OR NEW.blog_content IS NOT OLD.blog_content
   OR NEW.metadata_keywords IS NOT OLD.metadata_keywords
BEGIN
    INSERT INTO blog_posts_fts(blog_posts_fts, rowid, blog_title, blog_content, metadata_keywords)
    VALUES ('delete', old.id, old.blog_title, old.blog_content, old.metadata_keywords);
    INSERT INTO blog_posts_fts(rowid, blog_title, blog_content, metadata_keywords)
    VALUES (new.id, new.blog_title, new.blog_content, new.metadata_keywords);
END;

-- Rebuild the FTS indexes so any inconsistency left by the old trigger order
-- is cleared. External-content FTS5 'rebuild' re-derives the index from the
-- base tables; no base-table data is touched.
INSERT INTO evidence_fts(evidence_fts) VALUES('rebuild');
INSERT INTO responses_fts(responses_fts) VALUES('rebuild');
INSERT INTO context_essays_fts(context_essays_fts) VALUES('rebuild');
INSERT INTO blog_posts_fts(blog_posts_fts) VALUES('rebuild');
