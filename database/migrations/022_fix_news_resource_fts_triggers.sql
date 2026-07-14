-- Migration 022: Fix FTS trigger recursion on news_articles and resources
--
-- Bug: news_articles_fts_au and resources_fts_au (defined in migration 004)
-- lack WHEN guards, so they re-sync the FTS5 external-content index on every
-- UPDATE. Migration 008 already fixed this exact pattern for evidence,
-- responses, context_essays, and blog_posts: if a table gains an `_updated_at`
-- trigger that self-UPDATEs the row, that self-UPDATE re-fires the FTS
-- trigger a second time within the same transaction, issuing a second
-- 'delete'+insert pair against the FTS5 shadow tables and desyncing the
-- external-content index ("database disk image is malformed" on the next
-- UPDATE). news_articles and resources don't have `updated_at` triggers yet,
-- but the FTS triggers are otherwise unguarded and would corrupt silently if
-- that column is ever added later.
--
-- Fix: add a WHEN guard to each `_fts_au` trigger so it only re-indexes when
-- an actual FTS-tracked column changed, matching migration 008's pattern.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/022_fix_news_resource_fts_triggers.sql

DROP TRIGGER IF EXISTS news_articles_fts_au;
CREATE TRIGGER news_articles_fts_au AFTER UPDATE ON news_articles
WHEN NEW.news_article_title IS NOT OLD.news_article_title
   OR NEW.news_article_author IS NOT OLD.news_article_author
   OR NEW.news_article_publisher IS NOT OLD.news_article_publisher
   OR NEW.metadata_keywords IS NOT OLD.metadata_keywords
BEGIN
    INSERT INTO news_articles_fts(news_articles_fts, rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES ('delete', old.id, old.news_article_title, old.news_article_author, old.news_article_publisher, old.metadata_keywords);
    INSERT INTO news_articles_fts(rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES (new.id, new.news_article_title, new.news_article_author, new.news_article_publisher, new.metadata_keywords);
END;

DROP TRIGGER IF EXISTS resources_fts_au;
CREATE TRIGGER resources_fts_au AFTER UPDATE ON resources
WHEN NEW.resource_title IS NOT OLD.resource_title
   OR NEW.resource_description IS NOT OLD.resource_description
BEGIN
    INSERT INTO resources_fts(resources_fts, rowid, resource_title, resource_description)
    VALUES ('delete', old.id, old.resource_title, old.resource_description);
    INSERT INTO resources_fts(rowid, resource_title, resource_description)
    VALUES (new.id, new.resource_title, new.resource_description);
END;
