-- Migration 009: Add fixed-period grouping to historiography
--
-- Adds `historiography_period` (CHECK-constrained to the 8 fixed periods of
-- historical-Jesus scholarship) and `period_sort_order` (user-editable integer
-- for display ordering, natural default 1-8 chronological) to the
-- `historiography` table. Lets the public index page group essays into one
-- card per period instead of a flat list.
--
-- Run with:
--   sqlite3 database/thejesuswebsite.db < database/migrations/009_add_historiography_period.sql

ALTER TABLE historiography ADD COLUMN historiography_period TEXT CHECK (historiography_period IN (
    'early-church',
    'medieval',
    'reformation-early-modern',
    'enlightenment-old-quest',
    'no-quest-period-of-silence',
    'second-quest-new-quest',
    'third-quest',
    'contemporary'
));

ALTER TABLE historiography ADD COLUMN period_sort_order INTEGER DEFAULT 0;

CREATE INDEX idx_historiography_period ON historiography (historiography_period);
