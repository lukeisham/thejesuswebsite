-- Migration 017: Add is_bot and search_terms columns to analytics table.
-- Enables bot detection and search-term tracking from search-engine referrers.

ALTER TABLE analytics ADD COLUMN is_bot INTEGER DEFAULT 0;
ALTER TABLE analytics ADD COLUMN search_terms TEXT;

CREATE INDEX idx_analytics_is_bot ON analytics (is_bot);
