-- Migration 045: Add composite index for resources listing (SQL-10 follow-up)
--
-- Migration 044 added published_draft indexes to every content table
-- except `resources`, which was missed. `resources` is queried with
-- WHERE list_key = ? AND published_draft = 1 AND in_holding_pen = 0
-- ORDER BY sort_order, id (see api/models/resource.model.js) and has no
-- composite index covering that filter+sort shape today.
-- See setup/ISSUES/issues.md #223.
--
-- Run with: sqlite3 database/thejesuswebsite.db < database/migrations/045_add_resources_composite_index.sql

CREATE INDEX IF NOT EXISTS idx_resources_list_published_holding_sort
    ON resources (list_key, published_draft, in_holding_pen, sort_order, id);
