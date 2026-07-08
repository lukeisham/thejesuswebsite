-- Migration 007: Restore the original two-tier timeline taxonomy
--
-- Changes:
--   timeline_era     — restored to the original small set: 'beginning', 'middle', 'end'
--   timeline_period  — restored CHECK against the original 38-value detailed period list
--                       (dropped entirely by migration 004; free-text since)
--
-- Data-preserving: existing evidence rows are carried across via a best-effort
-- remap (see mapping table in setup/PLANS/New/admin-layout-timeline-mla-fixes.md
-- Notes). Any current era/period value with no clean mapping is set to NULL for
-- manual re-tagging in the admin rather than being silently guessed. Era
-- assignment for each mapped period follows the canonical grouping in
-- frontend/assets/js/timeline/timeline-data.js's ERA_BOUNDARIES (the
-- display-mapping source of truth) — e.g. LifeTradie/LifeBaptism fall under
-- the 'middle' era there, not 'beginning'.
--
-- IMPORTANT: this uses CREATE new-table / DROP old-table / RENAME new-to-old,
-- never `ALTER TABLE evidence RENAME TO evidence_old`. SQLite auto-rewrites
-- every OTHER table's FK clause that references a renamed table to follow the
-- new name — so renaming `evidence` away would silently repoint every child
-- table (evidence_mla_sources, map_pins, arbor_edges, the *_links_evidence
-- tables, evidence_identifiers, collection_evidence, evidence_resource_lists,
-- etc.) at `evidence_old`, which then gets dropped, permanently orphaning
-- those FK definitions. Building the replacement under a fresh name and only
-- renaming *it* into place (nothing references that fresh name yet) avoids
-- triggering that rewrite.

PRAGMA foreign_keys = OFF;

-- Drop FTS triggers and virtual table first (they depend on evidence table)
DROP TRIGGER IF EXISTS evidence_fts_ai;
DROP TRIGGER IF EXISTS evidence_fts_ad;
DROP TRIGGER IF EXISTS evidence_fts_au;
DROP TRIGGER IF EXISTS evidence_updated_at;
DROP TABLE IF EXISTS evidence_fts;

CREATE TABLE evidence_new (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Core Content
    title               TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    description         TEXT,
    primary_verse       TEXT,
    secondary_verse     TEXT,

    -- Categorization
    gospel_category     TEXT CHECK (gospel_category IN ('theme', 'events', 'parables', 'sayings-and-sermons', 'people', 'objects', 'places', 'miracles')),

    timeline_era        TEXT CHECK (timeline_era IN ('beginning', 'middle', 'end')),

    timeline_period     TEXT CHECK (timeline_period IN (
                            'PreIncarnation', 'OldTestament',
                            'EarlyLifeUnborn', 'EarlyLifeBirth', 'EarlyLifeInfancy', 'EarlyLifeChildhood',
                            'LifeTradie', 'LifeBaptism', 'LifeTemptation',
                            'GalileeCallingTwelve', 'GalileeSermonMount', 'GalileeMiraclesSea',
                            'GalileeTransfiguration',
                            'JudeanOutsideJudea', 'JudeanMissionSeventy', 'JudeanTeachingTemple',
                            'JudeanRaisingLazarus', 'JudeanFinalJourney',
                            'PassionPalmSunday', 'PassionMondayCleansing', 'PassionTuesdayTeaching',
                            'PassionWednesdaySilent', 'PassionMaundyThursday', 'PassionMaundyLastSupper',
                            'PassionMaundyGethsemane', 'PassionMaundyBetrayal',
                            'PassionFridaySanhedrin', 'PassionFridayCivilTrials',
                            'PassionFridayCrucifixionBegins', 'PassionFridayDarkness',
                            'PassionFridayDeath', 'PassionFridayBurial', 'PassionSaturdayWatch',
                            'PassionSundayResurrection', 'PostResurrectionAppearances',
                            'Ascension', 'OurResponse', 'ReturnOfJesus'
                        )),

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

INSERT INTO evidence_new (
    id, title, slug, description, primary_verse, secondary_verse,
    gospel_category, timeline_era, timeline_period, map_location,
    map_x, map_y, metadata_keywords, published_draft, version_update,
    created_at, updated_at
)
SELECT
    id, title, slug, description, primary_verse, secondary_verse,
    gospel_category,
    CASE timeline_era
        WHEN 'theme'              THEN NULL
        WHEN 'pre-incarnation'    THEN 'beginning'
        WHEN 'old-testament'      THEN 'beginning'
        WHEN 'intertestamental'   THEN 'beginning'
        WHEN 'birth'              THEN 'beginning'
        WHEN 'childhood'          THEN 'beginning'
        WHEN 'labourer'           THEN 'middle'
        WHEN 'baptism'            THEN 'middle'
        WHEN 'ministry-Galilee'   THEN 'middle'
        WHEN 'ministry-Jerusalem' THEN 'middle'
        WHEN 'passion'            THEN 'end'
        WHEN 'resurrection'       THEN 'end'
        WHEN 'ascension'          THEN 'end'
        WHEN 'early-church'       THEN 'end'
        WHEN 'return'             THEN 'end'
        ELSE NULL
    END AS timeline_era,
    CASE
        WHEN timeline_era = 'pre-incarnation'  THEN 'PreIncarnation'
        WHEN timeline_era = 'old-testament'    THEN 'OldTestament'
        WHEN timeline_era = 'birth'            THEN 'EarlyLifeBirth'
        WHEN timeline_era = 'childhood'        THEN 'EarlyLifeChildhood'
        WHEN timeline_era = 'labourer'         THEN 'LifeTradie'
        WHEN timeline_era = 'baptism'          THEN 'LifeBaptism'
        WHEN timeline_era = 'resurrection'     THEN 'PassionSundayResurrection'
        WHEN timeline_era = 'ascension'        THEN 'Ascension'
        WHEN timeline_era = 'return'           THEN 'ReturnOfJesus'
        ELSE NULL
    END AS timeline_period,
    map_location,
    map_x, map_y, metadata_keywords, published_draft, version_update,
    created_at, updated_at
FROM evidence;

DROP TABLE evidence;

ALTER TABLE evidence_new RENAME TO evidence;

-- Recreate FTS virtual table and triggers for evidence
CREATE VIRTUAL TABLE evidence_fts USING fts5(
    title, description, primary_verse, metadata_keywords,
    content='evidence', content_rowid='id'
);

INSERT INTO evidence_fts(rowid, title, description, primary_verse, metadata_keywords)
SELECT id, title, description, primary_verse, metadata_keywords FROM evidence;

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

CREATE TRIGGER evidence_updated_at
AFTER UPDATE ON evidence
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE evidence SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE INDEX idx_evidence_published        ON evidence (published_draft);
CREATE INDEX idx_evidence_timeline_era     ON evidence (timeline_era);
CREATE INDEX idx_evidence_timeline_period  ON evidence (timeline_period);
CREATE INDEX idx_evidence_map_location     ON evidence (map_location);

PRAGMA foreign_keys = ON;
