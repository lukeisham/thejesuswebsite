-- Migration 026: Add blog_thumbnail column to blog_posts.
-- Enables the admin to upload a dedicated thumbnail image for blog posts,
-- displayed on the News & Blog landing page cards.
-- Mirrors news_article_thumbnail from migration 023.

ALTER TABLE blog_posts ADD COLUMN blog_thumbnail TEXT;
