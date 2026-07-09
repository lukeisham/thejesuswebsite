-- Migration 008: Refactor timeline_era from 3 broad eras to 8 granular eras
--
-- Changes:
--   timeline_era  — CHECK expanded from 3 values ('beginning','middle','end')
--                   to 8 semantically-meaningful values that map 1:1 onto the
--                   existing 38 timeline_period values:
--     PreIncarnation | OldTestament | EarlyLife | Life |
--     GalileeMinistry | JudeanMinistry | PassionWeek | Post-Passion
--
-- Data-preserving: era is derived from timeline_period first (deterministic
-- mapping — see table below), falling back to a best-effort remap of old-era
-- values only when period is NULL. Any row where both period and old-era are
-- unmappable is set to NULL for manual re-tagging in the admin.
--
--   PreIncarnation   → PreIncarnation
--   OldTestament     → OldTestament
--   EarlyLife        → EarlyLifeUnborn, EarlyLifeBirth, EarlyLifeInfancy, EarlyLifeChildhood
--   Life             → LifeTradie, LifeBaptism, LifeTemptation
--   GalileeMinistry  → GalileeCallingTwelve, GalileeSermonMount, GalileeMiraclesSea, GalileeTransfiguration
--   JudeanMinistry   → JudeanOutsideJudea, JudeanMissionSeventy, JudeanTeachingTemple, JudeanRaisingLazarus, JudeanFinalJourney
--   PassionWeek      → PassionPalmSunday … PassionSundayResurrection (all 16)
--   Post-Passion     → PostResurrectionAppearances, Ascension, OurResponse, ReturnOfJesus
--
-- IMPORTANT: this uses CREATE new-table / DROP old-table / RENAME new-to-old,
-- never ALTER TABLE evidence RENAME TO evidence_old — see migration 007 for
-- the FK-rewrite rationale.

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

    timeline_era        TEXT CHECK (timeline_era IN ('PreIncarnation', 'OldTestament', 'EarlyLife', 'Life', 'GalileeMinistry', 'JudeanMinistry', 'PassionWeek', 'Post-Passion')),

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
    -- Derive era from period first (deterministic), fall back to old-era remap
    CASE
        -- Period-based mapping (preferred: deterministic)
        WHEN timeline_period = 'PreIncarnation'                THEN 'PreIncarnation'
        WHEN timeline_period = 'OldTestament'                  THEN 'OldTestament'
        WHEN timeline_period IN ('EarlyLifeUnborn', 'EarlyLifeBirth', 'EarlyLifeInfancy', 'EarlyLifeChildhood') THEN 'EarlyLife'
        WHEN timeline_period IN ('LifeTradie', 'LifeBaptism', 'LifeTemptation') THEN 'Life'
        WHEN timeline_period IN ('GalileeCallingTwelve', 'GalileeSermonMount', 'GalileeMiraclesSea', 'GalileeTransfiguration') THEN 'GalileeMinistry'
        WHEN timeline_period IN ('JudeanOutsideJudea', 'JudeanMissionSeventy', 'JudeanTeachingTemple', 'JudeanRaisingLazarus', 'JudeanFinalJourney') THEN 'JudeanMinistry'
        WHEN timeline_period IN ('PassionPalmSunday', 'PassionMondayCleansing', 'PassionTuesdayTeaching', 'PassionWednesdaySilent', 'PassionMaundyThursday', 'PassionMaundyLastSupper', 'PassionMaundyGethsemane', 'PassionMaundyBetrayal', 'PassionFridaySanhedrin', 'PassionFridayCivilTrials', 'PassionFridayCrucifixionBegins', 'PassionFridayDarkness', 'PassionFridayDeath', 'PassionFridayBurial', 'PassionSaturdayWatch', 'PassionSundayResurrection') THEN 'PassionWeek'
        WHEN timeline_period IN ('PostResurrectionAppearances', 'Ascension', 'OurResponse', 'ReturnOfJesus') THEN 'Post-Passion'
        -- Old-era fallback (only when period is NULL or unmapped)
        WHEN timeline_era = 'beginning' THEN 'PreIncarnation'
        WHEN timeline_era = 'middle'    THEN 'GalileeMinistry'
        WHEN timeline_era = 'end'       THEN 'PassionWeek'
        ELSE NULL
    END AS timeline_era,
    timeline_period,
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
