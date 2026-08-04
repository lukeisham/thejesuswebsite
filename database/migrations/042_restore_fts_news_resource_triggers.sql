-- Migration 042: Restore FTS update triggers for news_articles and resources
--
-- Bug: migration 032 dropped both *_fts_au triggers under the false premise that
-- their backing virtual tables had been removed, but migration 004 created
-- resources_fts and news_articles_fts and no subsequent migration removes them.
-- Migration 022 had just recreated both triggers with WHEN guards, so 032's DROP
-- silently broke FTS re-indexing on UPDATE for both tables. On any database that
-- has run 032, editing a resource or news article's title/description no longer
-- updates its FTS index — search returns stale results until the row is deleted
-- and reinserted.
--
-- Fix: recreate both triggers with the exact WHEN-guard column lists from
-- migration 022, matching the pattern of the four surviving triggers in
-- schema.sql (set by migration 008). The trigger bodies are byte-identical to
-- migration 022; only their definitions are re-applied, since they no longer
-- exist on databases that ran 032. Idempotent via IF EXISTS on DROP.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/042_restore_fts_news_resource_triggers.sql

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
