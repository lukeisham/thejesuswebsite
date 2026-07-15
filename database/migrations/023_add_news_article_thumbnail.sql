-- Migration 023: Add thumbnail column to news_articles.
-- Enables the admin to upload a thumbnail image for news articles,
-- displayed on the News & Blog landing page cards.
-- Uses the same image upload infrastructure as blog_posts.hero_image.

ALTER TABLE news_articles ADD COLUMN news_article_thumbnail TEXT;
