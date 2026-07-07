-- Full-text search for news articles and Bible-verse resources, backing the
-- search page's "News" and "Bible Verses" filter chips. Backfills existing
-- rows since these FTS tables are external-content and start empty. Run with:
--   sqlite3 database/thejesuswebsite.db < database/migrations/004_news_and_resource_search.sql

CREATE VIRTUAL TABLE news_articles_fts USING fts5(
    news_article_title, news_article_author, news_article_publisher, metadata_keywords,
    content='news_articles', content_rowid='id'
);

INSERT INTO news_articles_fts(rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
SELECT id, news_article_title, news_article_author, news_article_publisher, metadata_keywords FROM news_articles;

CREATE TRIGGER news_articles_fts_ai AFTER INSERT ON news_articles BEGIN
    INSERT INTO news_articles_fts(rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES (new.id, new.news_article_title, new.news_article_author, new.news_article_publisher, new.metadata_keywords);
END;
CREATE TRIGGER news_articles_fts_ad AFTER DELETE ON news_articles BEGIN
    INSERT INTO news_articles_fts(news_articles_fts, rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES ('delete', old.id, old.news_article_title, old.news_article_author, old.news_article_publisher, old.metadata_keywords);
END;
CREATE TRIGGER news_articles_fts_au AFTER UPDATE ON news_articles BEGIN
    INSERT INTO news_articles_fts(news_articles_fts, rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES ('delete', old.id, old.news_article_title, old.news_article_author, old.news_article_publisher, old.metadata_keywords);
    INSERT INTO news_articles_fts(rowid, news_article_title, news_article_author, news_article_publisher, metadata_keywords)
    VALUES (new.id, new.news_article_title, new.news_article_author, new.news_article_publisher, new.metadata_keywords);
END;

CREATE VIRTUAL TABLE resources_fts USING fts5(
    resource_title, resource_description,
    content='resources', content_rowid='id'
);

INSERT INTO resources_fts(rowid, resource_title, resource_description)
SELECT id, resource_title, resource_description FROM resources;

CREATE TRIGGER resources_fts_ai AFTER INSERT ON resources BEGIN
    INSERT INTO resources_fts(rowid, resource_title, resource_description)
    VALUES (new.id, new.resource_title, new.resource_description);
END;
CREATE TRIGGER resources_fts_ad AFTER DELETE ON resources BEGIN
    INSERT INTO resources_fts(resources_fts, rowid, resource_title, resource_description)
    VALUES ('delete', old.id, old.resource_title, old.resource_description);
END;
CREATE TRIGGER resources_fts_au AFTER UPDATE ON resources BEGIN
    INSERT INTO resources_fts(resources_fts, rowid, resource_title, resource_description)
    VALUES ('delete', old.id, old.resource_title, old.resource_description);
    INSERT INTO resources_fts(rowid, resource_title, resource_description)
    VALUES (new.id, new.resource_title, new.resource_description);
END;
