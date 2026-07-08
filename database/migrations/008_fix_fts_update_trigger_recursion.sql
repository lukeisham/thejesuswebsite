-- Migration 008: Fix FTS trigger recursion corrupting UPDATE on content tables
--
-- Bug: each of evidence, responses, context_essays, and blog_posts has both an
-- `_updated_at` trigger (which self-UPDATEs the row to bump updated_at when the
-- caller didn't set it) and an `_fts_au` trigger (which re-syncs the FTS5
-- external-content index on every UPDATE). The `_updated_at` trigger's own
-- UPDATE statement re-fires the `_fts_au` trigger a second time within the same
-- statement/transaction, issuing a second 'delete'+insert pair against the FTS5
-- shadow tables for a rowid that the first firing already touched — this
-- desyncs the external-content index and SQLite reports it as
-- "database disk image is malformed" on the very next UPDATE. In practice this
-- meant every edit-save of an existing evidence/response/essay/blog-post record
-- failed in production.
--
-- Fix: add a WHEN guard to each `_fts_au` trigger so it only re-indexes when an
-- actual FTS-tracked column changed. The `_updated_at` trigger's self-UPDATE only
-- changes `updated_at` (not tracked by FTS), so the guard makes it a no-op for
-- that second firing while preserving normal re-indexing on real content edits.

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
