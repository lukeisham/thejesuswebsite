-- Migration 010: Add arbor_nodes table for persisted node positions.
--
-- Stores the on-canvas position (x, y) for evidence nodes placed in the
-- arbor diagram editor. Positions saved here mirror to the public arbor page
-- so admin layouts survive across sessions and devices.
--
-- Run with:
--   sqlite3 database/thejesuswebsite.db < database/migrations/010_add_arbor_nodes.sql

CREATE TABLE arbor_nodes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id   INTEGER UNIQUE NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    x             REAL NOT NULL,
    y             REAL NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_arbor_nodes_evidence ON arbor_nodes (evidence_id);

-- updated_at trigger matching the existing pattern (guard against double-write on upsert-heavy drag traffic)
CREATE TRIGGER trg_arbor_nodes_updated_at
    AFTER UPDATE ON arbor_nodes
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE arbor_nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
