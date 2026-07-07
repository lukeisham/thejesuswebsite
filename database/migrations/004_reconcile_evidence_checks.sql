-- Migration 004: Reconcile evidence CHECK constraints with admin form
--
-- Changes:
--   gospel_category  — replaced CHECK values with form's event-based categories
--   timeline_era     — replaced CHECK values with form's timeline eras
--   timeline_period  — dropped CHECK (free-text input)
--   map_location     — dropped CHECK (free-text input)
--
-- Safe to run because the evidence table is empty.

PRAGMA foreign_keys = OFF;

-- Drop FTS triggers and virtual table first (they depend on evidence table)
DROP TRIGGER IF EXISTS evidence_fts_ai;
DROP TRIGGER IF EXISTS evidence_fts_ad;
DROP TRIGGER IF EXISTS evidence_fts_au;
DROP TRIGGER IF EXISTS evidence_updated_at;
DROP TABLE IF EXISTS evidence_fts;

-- Recreate evidence with updated CHECK constraints
DROP TABLE IF EXISTS evidence;

CREATE TABLE evidence (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Core Content
    title               TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    description         TEXT,
    primary_verse       TEXT,
    secondary_verse     TEXT,

    -- Categorization
    gospel_category     TEXT CHECK (gospel_category IN ('birth', 'baptism', 'temptation', 'ministry', 'miracles', 'parables', 'passion', 'crucifixion', 'resurrection', 'ascension')),

    timeline_era        TEXT CHECK (timeline_era IN ('beginning', 'patriarchs', 'exodus', 'conquest', 'judges', 'kingdom', 'exile', 'return', 'intertestamental', 'jesus-life', 'early-church')),

    timeline_period     TEXT,

    map_location        TEXT,

    map_x               REAL,
    map_y               REAL,

    -- Relationships & Metadata
    metadata_keywords   TEXT,

    -- Publishing & Versioning
    published_draft     INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    version_update      INTEGER DEFAULT 1,

    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recreate FTS virtual table and triggers for evidence
CREATE VIRTUAL TABLE evidence_fts USING fts5(
    title, description, primary_verse, metadata_keywords,
    content='evidence', content_rowid='id'
);

CREATE TRIGGER evidence_fts_ai AFTER INSERT ON evidence BEGIN
    INSERT INTO evidence_fts(rowid, title, description, primary_verse, metadata_keywords)
    VALUES (new.id, new.title, new.description, new.primary_verse, new.metadata_keywords);
END;

CREATE TRIGGER evidence_fts_ad AFTER DELETE ON evidence BEGIN
    INSERT INTO evidence_fts(evidence_fts, rowid, title, description, primary_verse, metadata_keywords)
    VALUES ('delete', old.id, old.title, old.description, old.primary_verse, old.metadata_keywords);
END;

CREATE TRIGGER evidence_fts_au AFTER UPDATE ON evidence BEGIN
    INSERT INTO evidence_fts(evidence_fts, rowid, title, description, primary_verse, metadata_keywords)
    VALUES ('delete', old.id, old.title, old.description, old.primary_verse, old.metadata_keywords);
    INSERT INTO evidence_fts(rowid, title, description, primary_verse, metadata_keywords)
    VALUES (new.id, new.title, new.description, new.primary_verse, new.metadata_keywords);
END;

-- Recreate updated_at trigger
CREATE TRIGGER evidence_updated_at
AFTER UPDATE ON evidence
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE evidence SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Recreate indexes
CREATE INDEX idx_evidence_published        ON evidence (published_draft);
CREATE INDEX idx_evidence_timeline_era     ON evidence (timeline_era);
CREATE INDEX idx_evidence_timeline_period  ON evidence (timeline_period);
CREATE INDEX idx_evidence_map_location     ON evidence (map_location);

PRAGMA foreign_keys = ON;
