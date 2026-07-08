-- Seed 001: 8 period-grouped historiography draft essays
--
-- One row per fixed historical period (see historiography_period CHECK
-- constraint in migration 009 / schema.sql). All rows are unpublished drafts
-- with placeholder content — the user writes and publishes each essay via
-- the admin as it's ready.
--
-- Idempotent: deletes every existing historiography row first (CASCADE
-- cleans up related breakouts/junction rows), then inserts the 8 drafts.
-- Safe to re-run.
--
-- Run with:
--   sqlite3 database/thejesuswebsite.db < database/seeds/001_historiography_essays.sql

DELETE FROM historiography;

INSERT INTO historiography (
    slug, essay_title, essay_content, essay_author, published_draft,
    historiography_period, period_sort_order
) VALUES
    ('early-church', 'Early Church (1st–5th c.)', 'Essay forthcoming.', 'Luke Isham', 0, 'early-church', 1),
    ('medieval', 'Medieval (5th–15th c.)', 'Essay forthcoming.', 'Luke Isham', 0, 'medieval', 2),
    ('reformation-early-modern', 'Reformation & Early Modern (16th–18th c.)', 'Essay forthcoming.', 'Luke Isham', 0, 'reformation-early-modern', 3),
    ('enlightenment-old-quest', 'Enlightenment & Old Quest (1778–1906)', 'Essay forthcoming.', 'Luke Isham', 0, 'enlightenment-old-quest', 4),
    ('no-quest-period-of-silence', 'No Quest / Period of Silence (1906–1953)', 'Essay forthcoming.', 'Luke Isham', 0, 'no-quest-period-of-silence', 5),
    ('second-quest-new-quest', 'Second Quest / New Quest (1953–1970s)', 'Essay forthcoming.', 'Luke Isham', 0, 'second-quest-new-quest', 6),
    ('third-quest', 'Third Quest (1980s–1990s)', 'Essay forthcoming.', 'Luke Isham', 0, 'third-quest', 7),
    ('contemporary', 'Contemporary (21st c.)', 'Essay forthcoming.', 'Luke Isham', 0, 'contemporary', 8);
