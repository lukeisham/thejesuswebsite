-- Migration 024: Add wikipedia_article_signals child table.
-- Backs the "reliability stones" widget on the Wikipedia list page: one row
-- per (article, signal) — 27 rows per article — recording the points earned
-- (contribution) and that signal's max magnitude for the article (cap).
-- The static signal names/order/polarity live in
-- frontend/assets/js/utils/wikipedia-signals.js, not in the database.

CREATE TABLE wikipedia_article_signals (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    wikipedia_article_id INTEGER NOT NULL REFERENCES wikipedia_articles(id) ON DELETE CASCADE,
    signal_key           TEXT NOT NULL,
    contribution         INTEGER NOT NULL DEFAULT 0,
    cap                  INTEGER NOT NULL,
    UNIQUE(wikipedia_article_id, signal_key)
);

-- Fast lookup of all signals for a given article; used by the stone-wall widget queries.
CREATE INDEX idx_wikipedia_article_signals ON wikipedia_article_signals (wikipedia_article_id);
