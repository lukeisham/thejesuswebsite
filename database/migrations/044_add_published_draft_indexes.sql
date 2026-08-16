-- Migration 044: Add published_draft indexes to content tables (SQL-10)
--
-- Every content table except `evidence` runs its hottest query
-- (WHERE published_draft = 1 ORDER BY <sort col>) as an unindexed full
-- table scan. `evidence` already has idx_evidence_published. No cost today
-- (tables are near-empty) but this compounds directly with API-8's
-- unbounded queries on exactly the tables the site exists to fill.
-- See setup/PLANS/New/vibe-coding-review-2026-08-08.md §4 (SQL-10).
--
-- Composite indexes lead with published_draft (the filter column) and
-- include each table's real ORDER BY column(s), matching the actual
-- queries in api/models/*.js rather than a generic guess.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/044_add_published_draft_indexes.sql

CREATE INDEX IF NOT EXISTS idx_blog_posts_published
    ON blog_posts (published_draft, created_at);

CREATE INDEX IF NOT EXISTS idx_historiography_published
    ON historiography (published_draft, period_sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_context_essays_published
    ON context_essays (published_draft, created_at);

CREATE INDEX IF NOT EXISTS idx_responses_published
    ON responses (published_draft, created_at);

CREATE INDEX IF NOT EXISTS idx_challenges_published
    ON challenges (published_draft, academic_popular, challenge_rank_number);

CREATE INDEX IF NOT EXISTS idx_wikipedia_articles_published
    ON wikipedia_articles (published_draft, wikipedia_article_rank_number);

CREATE INDEX IF NOT EXISTS idx_collections_published
    ON collections (published_draft, created_at);

CREATE INDEX IF NOT EXISTS idx_identifiers_published
    ON identifiers (published_draft, id);
