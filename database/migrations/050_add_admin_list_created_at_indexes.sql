-- Migration 050: Index created_at on blog_posts and context_essays for the admin lists.
--
-- Need: getAllAdmin() in api/models/blog-post.model.js and
-- api/models/essay.model.js runs SELECT ... ORDER BY created_at DESC with no
-- WHERE clause. The existing indexes idx_blog_posts_published and
-- idx_context_essays_published start with published_draft, so SQLite cannot use
-- them for that sort and builds a temporary B-tree on every admin list load.
--
-- Fix: one single-column index on created_at for each table. SQLite reads a
-- single-column index backwards for DESC, so no DESC key is needed.
--
-- Re-runnable: both statements use IF NOT EXISTS. schema.sql carries the same
-- two indexes for fresh databases.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/050_add_admin_list_created_at_indexes.sql

CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at
    ON blog_posts (created_at);

CREATE INDEX IF NOT EXISTS idx_context_essays_created_at
    ON context_essays (created_at);
