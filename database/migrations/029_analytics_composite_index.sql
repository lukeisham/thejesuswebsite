-- Composite index on analytics(page, visited_at) to speed up
-- getTopPagesWithTrend()'s per-page date-range JOIN, which currently filters
-- on both columns. SQLite can use this index to narrow to a single page's
-- rows before scanning visited_at, even though visited_at is still wrapped
-- in date() at query time (see analytics-composite-index plan Notes for the
-- follow-up sargable-rewrite optimization, not in scope here).

CREATE INDEX IF NOT EXISTS idx_analytics_page_visited_at ON analytics (page, visited_at);
