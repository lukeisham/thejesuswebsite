-- Migration 005: Add hero image columns to blog_posts.
-- The frontend (blog-detail.js) already reads hero_image and hero_image_alt
-- from the blog posts response; this migration adds the columns to the schema
-- so the API actually returns them.

ALTER TABLE blog_posts ADD COLUMN hero_image TEXT;
ALTER TABLE blog_posts ADD COLUMN hero_image_alt TEXT;
