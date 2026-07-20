-- Migration 031: Add dedicated primary image columns to evidence.
-- Enables the admin to upload a dedicated featured image for evidence items,
-- displayed at the top of the evidence detail page, replacing [figure]
-- shortcode-only image insertion for the primary image.
-- Mirrors hero_image / hero_image_alt from blog_posts.

ALTER TABLE evidence ADD COLUMN image TEXT;
ALTER TABLE evidence ADD COLUMN image_alt TEXT;
