-- Migration 025: Add global spellcheck dictionary for admin spellcheck widget.
-- Stores learned and ignored words so the client-side checker can suppress
-- flags for words the admin has explicitly accepted.
CREATE TABLE spellcheck_dictionary (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    word       TEXT NOT NULL,
    normalized TEXT NOT NULL UNIQUE,   -- lowercased word, used for lookups
    status     TEXT NOT NULL CHECK (status IN ('learned', 'ignored')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_spellcheck_dictionary_normalized ON spellcheck_dictionary (normalized);
