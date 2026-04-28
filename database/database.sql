-- =============================================================================
--
--   THE JESUS WEBSITE — DATABASE SCHEMA
--   File:    database.sql
--   Version: 1.0.1
--   Purpose: Blueprint schema for the SQLite database (Single Source of Truth)
--   Source:  data_schema.md
--
--   USAGE:
--     This file defines the full table structure.
--     Apply to a fresh database with:
--       sqlite3 database.sqlite < database.sql
--
-- =============================================================================


-- =============================================================================
-- TABLE: records
-- Central table holding all archival records about Jesus.
-- Each row represents one distinct record entry.
-- =============================================================================

CREATE TABLE IF NOT EXISTS records (

    -- -------------------------------------------------------------------------
    --  IDENTITY
    -- -------------------------------------------------------------------------

    id                          TEXT        PRIMARY KEY,
    -- ULID string (universally unique lexicographically sortable identifier)


    -- -------------------------------------------------------------------------
    --  METADATA
    -- -------------------------------------------------------------------------

    metadata_json               TEXT,
    -- JSON Blob: flexible key-value store for miscellaneous record metadata


    -- -------------------------------------------------------------------------
    --  CORE CONTENT
    -- -------------------------------------------------------------------------

    title                       TEXT,
    -- Flat Indexable: human-readable display title for the record

    slug                        TEXT        UNIQUE,
    -- Flat Indexable: URL-safe unique identifier derived from title

    picture_name                TEXT,
    -- Flat Indexable: filename of the associated picture asset

    picture_bytes               BLOB,
    -- Raw PNG Data: full-resolution primary image stored as binary

    picture_thumbnail           BLOB,
    -- Raw PNG Data: compressed thumbnail image stored as binary

    description                 TEXT,
    -- JSON Array (Paragraphs): full descriptive text broken into paragraph blocks

    snippet                     TEXT,
    -- JSON Array (Paragraphs): short preview text for list/card displays


    -- -------------------------------------------------------------------------
    --  BIBLIOGRAPHY
    -- -------------------------------------------------------------------------

    bibliography                TEXT,
    -- JSON Blob containing MLA-formatted source citations:
    --   mla_book           — Full MLA book citation
    --   mla_book_inline    — Inline MLA book reference
    --   mla_article        — Full MLA article citation
    --   mla_article_inline — Inline MLA article reference
    --   mla_website        — Full MLA website citation
    --   mla_website_inline — Inline MLA website reference


    -- -------------------------------------------------------------------------
    --  HISTORICAL CLASSIFICATION
    -- -------------------------------------------------------------------------

    era                         TEXT,
    -- Flat Indexable. Enum values:
    --   PreIncarnation | OldTestament | EarlyLife | Life |
    --   GalileeMinistry | JudeanMinistry | PassionWeek | Post-Passion

    timeline                    TEXT,
    -- Flat Indexable. Granular chronological position. Enum values:
    --   PreIncarnation | OldTestament |
    --   EarlyLifeUnborn | EarlyLifeBirth | EarlyLifeInfancy | EarlyLifeChildhood |
    --   LifeTradie | LifeBaptism | LifeTemptation |
    --   GalileeCallingTwelve | GalileeSermonMount | GalileeMiraclesSea | GalileeTransfiguration |
    --   JudeanOutsideJudea | JudeanMissionSeventy | JudeanTeachingTemple |
    --   JudeanRaisingLazarus | JudeanFinalJourney |
    --   PassionPalmSunday | PassionMondayCleansing | PassionTuesdayTeaching |
    --   PassionWednesdaySilent | PassionMaundyThursday | PassionMaundyLastSupper |
    --   PassionMaundyGethsemane | PassionMaundyBetrayal |
    --   PassionFridaySanhedrin | PassionFridayCivilTrials |
    --   PassionFridayCrucifixionBegins | PassionFridayDarkness |
    --   PassionFridayDeath | PassionFridayBurial | PassionSaturdayWatch |
    --   PassionSundayResurrection | PostResurrectionAppearances |
    --   Ascension | OurResponse | ReturnOfJesus


    -- -------------------------------------------------------------------------
    --  GEOGRAPHIC DATA
    -- -------------------------------------------------------------------------

    map_label                   TEXT,
    -- Flat Indexable. Map zoom level the record is associated with. Enum values:
    --   Overview | Empire | Levant | Judea | Galilee | Jerusalem

    geo_id                      INTEGER,
    -- Flat Indexable: 64-bit integer S2CellId representing a geographic point


    -- -------------------------------------------------------------------------
    --  RECORD TAXONOMY
    -- -------------------------------------------------------------------------

    gospel_category             TEXT,
    -- Flat Indexable. Type of record. Enum values:
    --   event | location | person | theme | object


    -- -------------------------------------------------------------------------
    --  SCRIPTURE REFERENCES
    -- -------------------------------------------------------------------------

    primary_verse               TEXT,
    -- JSON Array of verse objects: [{"book": "Genesis", "chapter": 1, "verse": 1}]
    -- Supported books: full Old and New Testament canon

    secondary_verse             TEXT,
    -- JSON Array of verse objects: [{"book": "Genesis", "chapter": 1, "verse": 1}]
    -- Supported books: full Old and New Testament canon


    -- -------------------------------------------------------------------------
    --  INTERNAL LINKS & RELATIONS
    -- -------------------------------------------------------------------------

    context_links               TEXT,
    -- JSON Blob: links to related internal records by slug/id

    parent_id                   TEXT        REFERENCES records(id),
    -- Foreign Key (Recursive): links to a parent record for hierarchical grouping


    -- -------------------------------------------------------------------------
    --  TIMESTAMPS
    -- -------------------------------------------------------------------------

    created_at                  TEXT,
    -- ISO8601 String: timestamp of record creation (e.g. "2026-01-01T00:00:00Z")

    updated_at                  TEXT,
    -- ISO8601 String: timestamp of last record modification


    -- -------------------------------------------------------------------------
    --  LONG-FORM CONTENT
    -- -------------------------------------------------------------------------

    context_essays              TEXT,
    -- JSON Array: thematic contextual essays attached to this record

    theological_essays          TEXT,
    -- JSON Array: theological deep-dive essays attached to this record

    spiritual_articles          TEXT,
    -- JSON Array: devotional or spiritual articles attached to this record

    ordo_salutis                TEXT,
    -- Flat Indexable. Soteriological category for theological classification. Enum values:
    --   Predestination | Regeneration | Faith | Repentance |
    --   Justification | Sanctification | Perseverance | Glorification


    -- -------------------------------------------------------------------------
    --  WIKIPEDIA RANKED DATA
    -- -------------------------------------------------------------------------

    wikipedia_link              TEXT,
    -- JSON Blob: structured link data pointing to the associated Wikipedia article

    wikipedia_rank              TEXT,
    -- Flat Indexable (64-bit int): relative importance rank from Wikipedia pipeline

    wikipedia_title             TEXT,
    -- Flat Indexable: title of the associated Wikipedia article

    wikipedia_weight            TEXT,
    -- Label-Value Pair: multiplier metadata used by the Wikipedia ranking pipeline


    -- -------------------------------------------------------------------------
    --  POPULAR CHALLENGE RANKED DATA
    -- -------------------------------------------------------------------------

    popular_challenge_link      TEXT,
    -- JSON Blob: structured link data for the associated popular public query/challenge

    popular_challenge_title     TEXT,
    -- Flat Indexable: title of the popular challenge/question

    popular_challenge_rank      TEXT,
    -- Flat Indexable (64-bit int): computed rank from the popular challenge pipeline

    popular_challenge_weight    TEXT,
    -- Label-Value Pair: multiplier metadata used by the popular challenge ranking pipeline


    -- -------------------------------------------------------------------------
    --  ACADEMIC CHALLENGE RANKED DATA
    -- -------------------------------------------------------------------------

    academic_challenge_link     TEXT,
    -- JSON Blob: structured link data for the associated academic historical debate

    academic_challenge_title    TEXT,
    -- Flat Indexable: title of the academic challenge/debate

    academic_challenge_rank     TEXT,
    -- Flat Indexable (64-bit int): computed rank from the academic challenge pipeline

    academic_challenge_weight   TEXT,
    -- Label-Value Pair: multiplier metadata used by the academic challenge ranking pipeline


    -- -------------------------------------------------------------------------
    --  RESPONSES & DEBATE CONTENT
    -- -------------------------------------------------------------------------

    responses                   TEXT,
    -- JSON Blob: structured apologetics responses to associated challenges


    -- -------------------------------------------------------------------------
    --  BLOG & NEWS CONTENT
    -- -------------------------------------------------------------------------

    blogposts                   TEXT,
    -- JSON Blob: blog post content linked to this record

    news_sources                TEXT,
    -- Label-Value Pair: metadata about the news source associated with this record

    news_items                  TEXT,
    -- JSON Blob: individual news stories or items linked to this record


    -- -------------------------------------------------------------------------
    --  ACCESS CONTROL
    -- -------------------------------------------------------------------------

    users                       TEXT,
    -- JSON Blob (SPA Routing): access level for this record. Enum values:
    --   Admin | Public


    -- -------------------------------------------------------------------------
    --  ANALYTICS
    -- -------------------------------------------------------------------------

    page_views                  INTEGER     DEFAULT 0,
    -- Flat Indexable (64-bit int): cumulative view count for this record


    -- -------------------------------------------------------------------------
    --  MANUSCRIPT & TEXTUAL EVIDENCE
    -- -------------------------------------------------------------------------

    iaa                         TEXT,
    -- Flat Indexable: Israel Antiquities Authority reference identifier

    pledius                     TEXT,
    -- Flat Indexable: Pledius (textual analysis) classification or reference

    manuscript                  TEXT,
    -- Flat Indexable: associated manuscript identifier or reference


    -- -------------------------------------------------------------------------
    --  EXTERNAL URL
    -- -------------------------------------------------------------------------

    url                         TEXT
    -- JSON Blob: structured external URL reference(s) for this record

);


-- =============================================================================
-- INDEXES
-- All 'Flat Indexable' fields receive an index for fast query performance.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_records_title                    ON records (title);
CREATE INDEX IF NOT EXISTS idx_records_slug                     ON records (slug);
CREATE INDEX IF NOT EXISTS idx_records_picture_name             ON records (picture_name);
CREATE INDEX IF NOT EXISTS idx_records_era                      ON records (era);
CREATE INDEX IF NOT EXISTS idx_records_timeline                 ON records (timeline);
CREATE INDEX IF NOT EXISTS idx_records_map_label                ON records (map_label);
CREATE INDEX IF NOT EXISTS idx_records_geo_id                   ON records (geo_id);
CREATE INDEX IF NOT EXISTS idx_records_gospel_category          ON records (gospel_category);
CREATE INDEX IF NOT EXISTS idx_records_parent_id                ON records (parent_id);
CREATE INDEX IF NOT EXISTS idx_records_ordo_salutis             ON records (ordo_salutis);
CREATE INDEX IF NOT EXISTS idx_records_wikipedia_rank           ON records (wikipedia_rank);
CREATE INDEX IF NOT EXISTS idx_records_wikipedia_title          ON records (wikipedia_title);
CREATE INDEX IF NOT EXISTS idx_records_popular_challenge_rank   ON records (popular_challenge_rank);
CREATE INDEX IF NOT EXISTS idx_records_popular_challenge_title  ON records (popular_challenge_title);
CREATE INDEX IF NOT EXISTS idx_records_academic_challenge_rank  ON records (academic_challenge_rank);
CREATE INDEX IF NOT EXISTS idx_records_academic_challenge_title ON records (academic_challenge_title);
CREATE INDEX IF NOT EXISTS idx_records_page_views               ON records (page_views);
CREATE INDEX IF NOT EXISTS idx_records_iaa                      ON records (iaa);
CREATE INDEX IF NOT EXISTS idx_records_pledius                  ON records (pledius);
CREATE INDEX IF NOT EXISTS idx_records_manuscript               ON records (manuscript);



-- =============================================================================
-- COMPOSITE INDEXES
-- Optimized for queries generated by setup_db.js
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_records_public_era             ON records (users, era);
CREATE INDEX IF NOT EXISTS idx_records_public_category        ON records (users, gospel_category);
CREATE INDEX IF NOT EXISTS idx_records_public_map             ON records (users, map_label);

-- =============================================================================
-- TABLE: resource_lists
-- Stores ordered lists of record slugs for curated resource collections.
-- Used by edit_lists.js for drag-to-reorder list management.
-- =============================================================================

CREATE TABLE IF NOT EXISTS resource_lists (

    id              INTEGER     PRIMARY KEY AUTOINCREMENT,
    -- Auto-incrementing primary key

    list_name       TEXT        NOT NULL,
    -- Name of the curated list (e.g. "resources", "bibliography")

    record_slug     TEXT        NOT NULL,
    -- Slug of the associated record in the list

    position        INTEGER     NOT NULL DEFAULT 0,
    -- Zero-based ordering position (0 = first)

    UNIQUE(list_name, record_slug)
    -- A record can appear in a given list only once
);


-- =============================================================================
-- INDEXES
-- Optimized for list fetch (get all entries for a list_name ordered by position)
-- and for uniqueness enforcement via the composite unique constraint.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_resource_lists_list_position
    ON resource_lists (list_name, position);


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
