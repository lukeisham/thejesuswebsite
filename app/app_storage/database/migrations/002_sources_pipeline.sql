-- =============================================================================
-- Migration 002: Sources Pipeline
-- Adds publication year, source type, and page-source junction table.
-- Safe to run multiple times (IF NOT EXISTS / column guards).
-- =============================================================================

PRAGMA foreign_keys = ON;

-- Add year column to sources (nullable INTEGER, stored as u16)
ALTER TABLE sources ADD COLUMN year        INTEGER;

-- Add source_type column to sources (nullable TEXT enum)
ALTER TABLE sources ADD COLUMN source_type TEXT CHECK (source_type IN ('Book', 'Article', 'WebSource'));

-- Junction table: links a source to a content page
-- Supports essays, records, responses, and historiography pages.
CREATE TABLE IF NOT EXISTS page_sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_slug   TEXT    NOT NULL,   -- e.g. "crucifixion", "john-1"
    page_type   TEXT    NOT NULL CHECK (page_type IN ('essay', 'record', 'response', 'historiography')),
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_id, page_slug, page_type)   -- prevent duplicate citations
);
