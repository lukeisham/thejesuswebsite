-- =============================================================================
--
--   THE JESUS WEBSITE — TEST RECORDS
--   File:    test_records.sql
--   Version: 1.0.1
--   Purpose: Benchmarking and Query Plan Analysis
--
-- =============================================================================

.echo on
.timer on

-- 1. Simple lookup by slug
EXPLAIN QUERY PLAN
SELECT * FROM records WHERE slug = 'jesus-birth';

-- 2. Filter by era and timeline
EXPLAIN QUERY PLAN
SELECT id, title FROM records WHERE era = 'EarlyLife' AND timeline = 'EarlyLifeBirth';

-- 3. Geographic query
EXPLAIN QUERY PLAN
SELECT * FROM records WHERE map_label = 'Jerusalem' ORDER BY geo_id;

-- 4. Ranking queries
EXPLAIN QUERY PLAN
SELECT * FROM records WHERE wikipedia_rank IS NOT NULL ORDER BY CAST(wikipedia_rank AS INTEGER) DESC LIMIT 10;

-- 5. Full text search simulating frontend list view filtering via title
EXPLAIN QUERY PLAN
SELECT * FROM records WHERE title LIKE '%resurrection%';

-- 6. Hierarchical query
EXPLAIN QUERY PLAN
SELECT * FROM records WHERE parent_id = 'SOME_ULID';

-- 7. Querying JSON (e.g. users)
EXPLAIN QUERY PLAN
SELECT id FROM records WHERE json_extract(users, '$') = 'Public';
