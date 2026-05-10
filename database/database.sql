-- =============================================================================
--
--   THE JESUS WEBSITE — DATABASE SCHEMA
--   File:    database.sql
--   Version: 2.0.0
--   Purpose: Blueprint schema for the SQLite database (Single Source of Truth)
--   Source:  high_level_schema.md v2.1.0, data_schema.md v1.0.3
--
--   DESIGN:  Polymorphic single-table architecture with type discriminator.
--            All entities live in the `records` table, discriminated by `type`.
--            Each type extends a shared base with its own unique fields.
--            External-alias types (wikipedia, challenges, news) additionally
--            use `sub_type` to split weight, search term, and source
--            configuration into separate rows sharing a grouping `id`.
--
--   USAGE:
--     Apply to a fresh database with:
--       sqlite3 database.sqlite < database.sql
--
-- =============================================================================


-- =============================================================================
-- TABLE: records
-- Central polymorphic table holding ALL entity types for the Jesus Website.
-- Each row carries a `type` discriminator; the application logic determines
-- which columns are meaningful for a given type + sub_type combination.
-- =============================================================================

CREATE TABLE IF NOT EXISTS records (

    -- =========================================================================
    --  LAYER 1: CORE IDENTITY  (Every Row)
    -- =========================================================================

    id                          TEXT        PRIMARY KEY,
    -- ULID string (universally unique lexicographically sortable identifier)

    type                        TEXT        NOT NULL,
    -- Entity type discriminator. Enum values:
    --   record | context_essay | historiographical_essay | theological_essay |
    --   spiritual_article | challenge_response | blog_post |
    --   challenge_academic | challenge_popular | wikipedia_entry |
    --   news_article | system_data

    sub_type                    TEXT,
    -- Sub-type variant discriminator. Only used on:
    --   challenge_academic, challenge_popular, wikipedia_entry, news_article, system_data
    -- Values: ranked_weight | ranked_search_term | news_source |
    --         news_search_term | trace_reasoning | NULL (main entry)

    status                      TEXT        DEFAULT 'draft',
    -- Flat Indexable: publication state. Enum values: draft | published


    -- =========================================================================
    --  LAYER 2: CONTENT METADATA  (Every Row)
    -- =========================================================================

    title                       TEXT,
    -- Flat Indexable: human-readable display title for the record

    slug                        TEXT        UNIQUE,
    -- Flat Indexable: URL-safe unique identifier derived from title

    snippet                     TEXT,
    -- JSON Array (Paragraphs): short preview text for list/card displays

    metadata_json               TEXT,
    -- JSON Blob: SEO keywords, search metadata, flexible key-value store

    users                       TEXT,
    -- JSON Blob (SPA Routing): access level. Enum: "Admin" | "Public" | "Agent"

    context_links               TEXT,
    -- JSON Blob: links to related internal records by slug/id

    iaa                         TEXT,
    -- Flat Indexable: Israel Antiquities Authority reference identifier

    pledius                     TEXT,
    -- Flat Indexable: Pledius (textual analysis) classification or reference

    manuscript                  TEXT,
    -- Flat Indexable: associated manuscript identifier or reference

    url                         TEXT,
    -- JSON Blob: structured external URL reference(s) (label/URL pairs)

    page_views                  INTEGER     DEFAULT 0,
    -- Flat Indexable (64-bit int): cumulative view count for this record

    created_at                  TEXT,
    -- ISO8601 String: timestamp of record creation (e.g. "2026-01-01T00:00:00Z")

    updated_at                  TEXT,
    -- ISO8601 String: timestamp of last record modification


    -- =========================================================================
    --  LAYER 3A: CONTENT-TYPE FIELDS
    --  Used by: record | context_essay | historiographical_essay |
    --           theological_essay | spiritual_article | challenge_response |
    --           blog_post
    -- =========================================================================

    description                 TEXT,
    -- JSON Array (Paragraphs): full descriptive text broken into paragraph blocks

    bibliography                TEXT,
    -- JSON Blob: MLA-formatted source citations:
    --   mla_book | mla_book_inline | mla_article | mla_article_inline |
    --   mla_website | mla_website_inline

    body                        TEXT,
    -- WYSIWYG markdown content (essays, articles, responses, blog posts only)

    picture_name                TEXT,
    -- Flat Indexable: filename of the associated picture asset

    picture_bytes               BLOB,
    -- Raw PNG Data: full-resolution primary image (max 800px width, ≤ 250 KB)

    picture_thumbnail           BLOB,
    -- Raw PNG Data: compressed thumbnail image (max 200px width derivative)

    historiography              TEXT,
    -- JSON Blob: historiographical analysis content


    -- =========================================================================
    --  LAYER 3B: RECORD-SPECIFIC FIELDS
    --  Used only by: type = 'record'
    -- =========================================================================

    gospel_category             TEXT,
    -- Flat Indexable. Type of record. Enum values:
    --   event | location | person | theme | object

    era                         TEXT,
    -- Flat Indexable. Broad chronological era. Enum values:
    --   PreIncarnation | OldTestament | EarlyLife | Life |
    --   GalileeMinistry | JudeanMinistry | PassionWeek | Post-Passion

    timeline                    TEXT,
    -- Flat Indexable. Granular chronological position. Enum values:
    --   PreIncarnation | OldTestament |
    --   EarlyLifeUnborn | EarlyLifeBirth | EarlyLifeInfancy | EarlyLifeChildhood |
    --   LifeTradie | LifeBaptism | LifeTemptation |
    --   GalileeCallingTwelve | GalileeSermonMount | GalileeMiraclesSea |
    --   GalileeTransfiguration |
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

    map_label                   TEXT,
    -- Flat Indexable. Map zoom level. Enum values:
    --   Overview | Empire | Levant | Judea | Galilee | Jerusalem

    geo_id                      INTEGER,
    -- Flat Indexable: 64-bit integer S2CellId representing a geographic point

    primary_verse               TEXT,
    -- JSON Array of verse objects: [{"book": "Genesis", "chapter": 1, "verse": 1}]
    -- Supported books: full Old and New Testament canon

    secondary_verse             TEXT,
    -- JSON Array of verse objects: [{"book": "Genesis", "chapter": 1, "verse": 1}]
    -- Supported books: full Old and New Testament canon

    parent_id                   TEXT        REFERENCES records(id),
    -- Foreign Key (Recursive): links to a parent record for hierarchical grouping


    -- =========================================================================
    --  LAYER 3C: THEOLOGICAL-SPECIFIC
    --  Used only by: type = 'theological_essay'
    -- =========================================================================

    ordo_salutis                TEXT,
    -- Flat Indexable. Soteriological category. Enum values:
    --   Predestination | Regeneration | Faith | Repentance |
    --   Justification | Sanctification | Perseverance | Glorification


    -- =========================================================================
    --  LAYER 3D: CHALLENGE RESPONSE-SPECIFIC
    --  Used only by: type = 'challenge_response'
    -- =========================================================================

    challenge_id                TEXT        REFERENCES records(id),
    -- Foreign Key: stored on the response record; points to the parent challenge
    -- this response addresses

    responses                   TEXT,
    -- JSON Blob: structured apologetics responses to associated challenges

    blogposts                   TEXT,
    -- JSON Blob: blog post content linked to this record


    -- =========================================================================
    --  LAYER 3E: CONTENT RELATIONS
    --  Used by: type = 'record' (links to related content)
    -- =========================================================================

    context_essays              TEXT,
    -- JSON Array: thematic contextual essays attached to this record

    theological_essays          TEXT,
    -- JSON Array: theological deep-dive essays attached to this record

    spiritual_articles          TEXT,
    -- JSON Array: devotional or spiritual articles attached to this record


    -- =========================================================================
    --  LAYER 4A: EXTERNAL-ALIAS — WIKIPEDIA
    --  Used by: type = 'wikipedia_entry'
    -- =========================================================================

    wikipedia_link              TEXT,
    -- JSON Blob: structured link data pointing to the associated Wikipedia article

    wikipedia_rank              TEXT,
    -- Flat Indexable (64-bit int): relative importance rank from Wikipedia pipeline

    wikipedia_title             TEXT,
    -- Flat Indexable: title of the associated Wikipedia article

    wikipedia_weight            TEXT,
    -- JSON Object (Multi-Weight Multipliers): multiplier metadata for ranking

    wikipedia_search_term       TEXT,
    -- JSON Array (Search Scope): search terms used to source Wikipedia content


    -- =========================================================================
    --  LAYER 4B: EXTERNAL-ALIAS — ACADEMIC CHALLENGE
    --  Used by: type = 'challenge_academic'
    -- =========================================================================

    academic_challenge_link     TEXT,
    -- JSON Blob: structured link data for the associated academic historical debate

    academic_challenge_title    TEXT,
    -- Flat Indexable: title of the academic challenge/debate

    academic_challenge_rank     TEXT,
    -- Flat Indexable (64-bit int): computed rank from the academic challenge pipeline

    academic_challenge_weight   TEXT,
    -- JSON Object (Multi-Weight Multipliers): multiplier metadata for ranking

    academic_challenge_search_term TEXT,
    -- JSON Array (Search Scope): search terms used to source academic challenge content


    -- =========================================================================
    --  LAYER 4C: EXTERNAL-ALIAS — POPULAR CHALLENGE
    --  Used by: type = 'challenge_popular'
    -- =========================================================================

    popular_challenge_link      TEXT,
    -- JSON Blob: structured link data for the associated popular public query/challenge

    popular_challenge_title     TEXT,
    -- Flat Indexable: title of the popular challenge/question

    popular_challenge_rank      TEXT,
    -- Flat Indexable (64-bit int): computed rank from the popular challenge pipeline

    popular_challenge_weight    TEXT,
    -- JSON Object (Multi-Weight Multipliers): multiplier metadata for ranking

    popular_challenge_search_term TEXT,
    -- JSON Array (Search Scope): search terms used to source popular challenge content


    -- =========================================================================
    --  LAYER 4D: EXTERNAL-ALIAS — NEWS
    --  Used by: type = 'news_article'
    -- =========================================================================

    news_sources                TEXT,
    -- JSON Blob: metadata about the news source associated with this record

    news_item_title             TEXT,
    -- Flat Indexable: title of the associated news item

    news_item_link              TEXT,
    -- Flat Indexable: external URL of the associated news item

    news_search_term            TEXT,
    -- JSON Array (Search Scope): search terms used to source news content

    last_crawled                TEXT,
    -- ISO8601 String: timestamp of last crawl for this news article/source


    -- =========================================================================
    --  LAYER 5: SYSTEM DATA
    --  Used by: type = 'system_data'
    -- =========================================================================

    value                       TEXT,
    -- Configuration value stored as text (JSON for complex values)

    updated_by                  TEXT,
    -- Identifier of the admin user who last modified this config entry

    trace_reasoning             TEXT
    -- Flat Indexable (64-bit int): trace reasoning identifier for system data

);


-- =============================================================================
-- INDEXES
-- All 'Flat Indexable' fields receive an index for fast query performance.
-- =============================================================================

-- Layer 1: Core Identity
CREATE INDEX IF NOT EXISTS idx_records_type        ON records (type);
CREATE INDEX IF NOT EXISTS idx_records_sub_type    ON records (sub_type);
CREATE INDEX IF NOT EXISTS idx_records_status      ON records (status);

-- Layer 2: Content Metadata
CREATE INDEX IF NOT EXISTS idx_records_title       ON records (title);
CREATE INDEX IF NOT EXISTS idx_records_slug        ON records (slug);
CREATE INDEX IF NOT EXISTS idx_records_page_views  ON records (page_views);
CREATE INDEX IF NOT EXISTS idx_records_iaa         ON records (iaa);
CREATE INDEX IF NOT EXISTS idx_records_pledius     ON records (pledius);
CREATE INDEX IF NOT EXISTS idx_records_manuscript  ON records (manuscript);

-- Layer 3B: Record-Specific
CREATE INDEX IF NOT EXISTS idx_records_era                 ON records (era);
CREATE INDEX IF NOT EXISTS idx_records_timeline            ON records (timeline);
CREATE INDEX IF NOT EXISTS idx_records_map_label           ON records (map_label);
CREATE INDEX IF NOT EXISTS idx_records_geo_id              ON records (geo_id);
CREATE INDEX IF NOT EXISTS idx_records_gospel_category     ON records (gospel_category);
CREATE INDEX IF NOT EXISTS idx_records_picture_name        ON records (picture_name);

-- Layer 3C: Theological-Specific
CREATE INDEX IF NOT EXISTS idx_records_ordo_salutis        ON records (ordo_salutis);

-- Layer 3D: Challenge Response
CREATE INDEX IF NOT EXISTS idx_records_challenge_id        ON records (challenge_id);

-- Layer 3B: Foreign Keys
CREATE INDEX IF NOT EXISTS idx_records_parent_id           ON records (parent_id);

-- Layer 4A: Wikipedia
CREATE INDEX IF NOT EXISTS idx_records_wikipedia_rank      ON records (wikipedia_rank);
CREATE INDEX IF NOT EXISTS idx_records_wikipedia_title     ON records (wikipedia_title);

-- Layer 4B: Academic Challenge
CREATE INDEX IF NOT EXISTS idx_records_academic_challenge_rank  ON records (academic_challenge_rank);
CREATE INDEX IF NOT EXISTS idx_records_academic_challenge_title ON records (academic_challenge_title);

-- Layer 4C: Popular Challenge
CREATE INDEX IF NOT EXISTS idx_records_popular_challenge_rank   ON records (popular_challenge_rank);
CREATE INDEX IF NOT EXISTS idx_records_popular_challenge_title  ON records (popular_challenge_title);

-- Layer 4D: News
CREATE INDEX IF NOT EXISTS idx_records_news_item_title     ON records (news_item_title);
CREATE INDEX IF NOT EXISTS idx_records_news_item_link      ON records (news_item_link);


-- =============================================================================
-- COMPOSITE INDEXES
-- Optimized for queries generated by setup_db.js
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_records_public_type
    ON records (users, type);

CREATE INDEX IF NOT EXISTS idx_records_public_era
    ON records (users, era);

CREATE INDEX IF NOT EXISTS idx_records_public_category
    ON records (users, gospel_category);

CREATE INDEX IF NOT EXISTS idx_records_public_map
    ON records (users, map_label);

CREATE INDEX IF NOT EXISTS idx_records_type_status
    ON records (type, status);

CREATE INDEX IF NOT EXISTS idx_records_type_sub_type
    ON records (type, sub_type);


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
-- INDEXES for resource_lists
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_resource_lists_list_position
    ON resource_lists (list_name, position);


-- =============================================================================
-- TABLE: system_config
-- Global key/value configuration store for site-wide settings not tied to
-- any single record. Populated at runtime by the admin dashboard.
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_config (

    key             TEXT        PRIMARY KEY,
    -- Configuration key (e.g. 'site_title', 'default_snippet_length')

    value           TEXT,
    -- Configuration value stored as text (JSON for complex values)

    updated_at      TEXT,
    -- ISO8601 String: timestamp of last modification

    updated_by      TEXT
    -- Identifier of the admin user who last modified this config entry

);


-- =============================================================================
-- TABLE: agent_run_log
-- Tracks every DeepSeek agent pipeline execution for observability,
-- debugging, and cost monitoring.
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_run_log (

    id              INTEGER     PRIMARY KEY AUTOINCREMENT,
    -- Auto-incrementing unique identifier for each agent run

    pipeline        TEXT        NOT NULL,
    -- Name of the pipeline that triggered this run
    -- e.g. 'academic_challenges', 'popular_challenges',
    --      'snippet_generation', 'metadata_generation'

    record_slug     TEXT,
    -- Slug of the record being processed (NULL for batch runs)

    status          TEXT        NOT NULL DEFAULT 'running',
    -- Execution status: 'running', 'completed', 'failed'

    trace_reasoning TEXT,
    -- The agent's chain-of-thought reasoning log from the DeepSeek response

    articles_found  INTEGER     DEFAULT 0,
    -- Count of articles discovered (for web-search pipelines)

    tokens_used     INTEGER     DEFAULT 0,
    -- Total tokens consumed by this run (prompt + completion)

    error_message   TEXT,
    -- Error details if status is 'failed' (NULL otherwise)

    started_at      TEXT        NOT NULL,
    -- ISO-8601 timestamp of when the run began

    completed_at    TEXT
    -- ISO-8601 timestamp of when the run finished (NULL while running)

);


-- =============================================================================
-- INDEXES for agent_run_log
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_run_log_pipeline
    ON agent_run_log (pipeline);

CREATE INDEX IF NOT EXISTS idx_agent_run_log_status
    ON agent_run_log (status);

CREATE INDEX IF NOT EXISTS idx_agent_run_log_started_at
    ON agent_run_log (started_at);


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
