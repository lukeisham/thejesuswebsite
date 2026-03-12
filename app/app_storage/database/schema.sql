-- =============================================================================
-- THE JESUS WEBSITE — SQLite Schema
-- =============================================================================
-- This database stores all STRUCTURED, relational data.
-- Unstructured/semantic data (essays, records, responses, pictures, blog posts)
-- lives in ChromaDB — see chroma.rs.
--
-- Conventions:
--   • Primary keys are TEXT (ULID or UUID strings) — no auto-increment IDs
--   • Timestamps are ISO 8601 TEXT (SQLite has no native datetime)
--   • All monetary values are INTEGER cents (no floats)
--   • ENUMs are stored as TEXT with CHECK constraints
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;


-- ─────────────────────────────────────────────────────────────────────────────
-- RECORDS  (published)
-- ─────────────────────────────────────────────────────────────────────────────
-- Storage strategy: flat columns for the fields the DB populator and query
-- layer need to index/filter on; JSON blobs for the compound nested types
-- (bibliography, metadata, map_data, content) that are only read back whole.
-- picture_bytes is stored separately as a BLOB to keep text queries fast.
-- Schema version tracks Record::SCHEMA_VERSION in app_core.

CREATE TABLE IF NOT EXISTS records (
    -- Identity
    id              TEXT PRIMARY KEY,                -- ULID
    parent_id       TEXT REFERENCES records(id),     -- optional parent link

    -- Core fields (flat columns for filtering/display)
    name            TEXT NOT NULL,                   -- max 80 chars
    category        TEXT NOT NULL CHECK (category IN ('Event','Location','Person','Theme')),
    era             TEXT NOT NULL CHECK (era IN (
                        'pre-incarnation','birth-early-life','baptism-preparation',
                        'galilean-ministry','judean-ministry','passion-crucifixion',
                        'resurrection-ascension','theme'
                    )),

    -- Geography (from InteractiveMap.points[0])
    map_label       TEXT NOT NULL DEFAULT 'Overview' CHECK (map_label IN (
                        'Galilee','Jerusalem','Judea','Levant','Rome','Overview'
                    )),
    latitude        REAL,                            -- primary map point lat
    longitude       REAL,                            -- primary map point lng

    -- Scripture
    primary_verse   TEXT,                            -- "Book chapter:verse"
    secondary_verse TEXT,                            -- optional

    -- Passion timeline (specific sub-fields for events)
    passion_day     INTEGER,
    passion_hour    INTEGER,

    -- Text content
    description     TEXT,                            -- JSON array of strings Vec<String>
    picture_bytes   BLOB,                            -- PNG bytes (may be empty)

    -- Rich compound types stored as JSON blobs
    bibliography    TEXT NOT NULL DEFAULT '[]',      -- JSON: Vec<Source>
    metadata_json   TEXT NOT NULL DEFAULT '{}',      -- JSON: Metadata { id, keywords, toggle }
    content_json    TEXT NOT NULL DEFAULT '{}',      -- JSON: ContentEntry { id, title, body, category }
    map_json        TEXT NOT NULL DEFAULT '{}',      -- JSON: InteractiveMap (full, including all points)
    timeline_json   TEXT NOT NULL DEFAULT '{}',      -- JSON: TimelineEntry (full)

    -- Timestamps
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT                             -- ISO 8601, NULL until first edit
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RECORD DRAFTS  (work-in-progress, not yet published)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS record_drafts (
    id          TEXT PRIMARY KEY,                    -- ULID (auto-generated if missing)
    name        TEXT NOT NULL,                       -- record name for quick display
    type        TEXT NOT NULL DEFAULT 'Theme' CHECK (type IN ('Event','Location','Person','Theme')),
    region      TEXT NOT NULL DEFAULT 'Overview' CHECK (region IN (
                    'Galilee','Jerusalem','Judea','Levant','Rome','Overview'
                )),
    payload     TEXT NOT NULL,                       -- full DraftRecordRequest JSON blob
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT                                 -- ISO 8601, NULL until edited
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NEWS ITEMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news_items (
    id           TEXT PRIMARY KEY,     -- UUID
    title        TEXT NOT NULL,
    source_url   TEXT NOT NULL,
    snippet      TEXT NOT NULL,         -- AI-generated summary
    contents     TEXT NOT NULL,         -- Full copy of source
    picture_url  TEXT,                  -- Optional image URL
    harvested_at TEXT NOT NULL          -- ISO 8601 timestamp
);

CREATE TABLE IF NOT EXISTS news_holding_area (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    url           TEXT NOT NULL,         -- Unvalidated raw URL
    raw_content   TEXT NOT NULL,
    raw_image_url TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
    id    TEXT PRIMARY KEY,              -- ULID
    name  TEXT NOT NULL,
    email TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY,          -- ULID
    contact_id TEXT NOT NULL REFERENCES contacts(id),
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    sent_at    TEXT NOT NULL,             -- ISO 8601
    read_at    TEXT                       -- ISO 8601, NULL = unread
);


-- ─────────────────────────────────────────────────────────────────────────────
-- BUDGET & DONORS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budget (
    id             INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton row
    total_budget   INTEGER NOT NULL DEFAULT 0,           -- Cents
    donated_budget INTEGER NOT NULL DEFAULT 0            -- Cents
);

CREATE TABLE IF NOT EXISTS donors (
    id                      TEXT PRIMARY KEY,  -- ULID
    display_name            TEXT NOT NULL,
    privacy                 TEXT NOT NULL CHECK (privacy IN ('Published', 'Unpublished')),
    total_contributed_cents  INTEGER NOT NULL DEFAULT 0
);


-- ─────────────────────────────────────────────────────────────────────────────
-- CHALLENGES (Popular + Academic)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges_popular (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT NOT NULL,
    name        TEXT NOT NULL,
    ranking     INTEGER NOT NULL CHECK (ranking BETWEEN 1 AND 100),
    metadata_id TEXT REFERENCES metadata(id)
);

CREATE TABLE IF NOT EXISTS challenges_academic (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT NOT NULL,
    name        TEXT NOT NULL,
    ranking     INTEGER NOT NULL CHECK (ranking BETWEEN 1 AND 100),
    metadata_id TEXT REFERENCES metadata(id)
);

CREATE TABLE IF NOT EXISTS challenges_raw_popular (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges_raw_academic (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- WIKIPEDIA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wikipedia_articles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL UNIQUE,
    ranking     INTEGER,               -- NULL = unranked
    metadata_id TEXT REFERENCES metadata(id)
);

CREATE TABLE IF NOT EXISTS wikipedia_weights (
    id TEXT PRIMARY KEY,           -- ULID
    name TEXT NOT NULL,
    match_target TEXT NOT NULL,    -- 'url', 'title', 'content'
    match_value TEXT NOT NULL,     -- e.g., '.edu'
    weight_score INTEGER NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM TABLES (all system types except Picture)
-- ─────────────────────────────────────────────────────────────────────────────

-- Metadata (shared lookup referenced by challenges, wikipedia, etc.)
CREATE TABLE IF NOT EXISTS metadata (
    id       TEXT PRIMARY KEY,          -- ULID
    keywords TEXT NOT NULL,             -- JSON array of strings
    toggle   TEXT NOT NULL CHECK (toggle IN ('On', 'Off'))
);

-- Sources (bibliography entries)
CREATE TABLE IF NOT EXISTS sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    author_type TEXT NOT NULL CHECK (author_type IN ('Name', 'Orcid')),
    author_val  TEXT NOT NULL,
    title_text  TEXT NOT NULL,
    identity    TEXT,                    -- JSON SourceIdentity or NULL
    year        INTEGER,                 -- Publication year (1000–2100) or NULL
    source_type TEXT CHECK (source_type IN ('Book', 'Article', 'WebSource'))
);

-- Junction table: links a source to a content page
-- Supports essays, records, responses, and historiography pages.
CREATE TABLE IF NOT EXISTS page_sources (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page_slug   TEXT    NOT NULL,        -- e.g. "crucifixion", "john-1"
    page_type   TEXT    NOT NULL CHECK (page_type IN ('essay', 'record', 'response', 'historiography')),
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_id, page_slug, page_type)  -- prevent duplicate citations
);

-- Bible verses
CREATE TABLE IF NOT EXISTS bible_verses (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    book    TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse   INTEGER                     -- NULL = whole chapter reference
);

-- Academic article identifiers (DOI)
CREATE TABLE IF NOT EXISTS academic_article_ids (
    doi TEXT PRIMARY KEY
);

-- Geo identifiers
CREATE TABLE IF NOT EXISTS geo_ids (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude  REAL NOT NULL,
    longitude REAL NOT NULL,
    label     TEXT
);

-- IAA identifiers
CREATE TABLE IF NOT EXISTS iaa_ids (
    id    TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ISBN identifiers
CREATE TABLE IF NOT EXISTS isbn_ids (
    isbn TEXT PRIMARY KEY
);

-- LGPN identifiers
CREATE TABLE IF NOT EXISTS lgpn_ids (
    id    TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Manuscript identifiers
CREATE TABLE IF NOT EXISTS manuscript_ids (
    id    TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ORCID identifiers
CREATE TABLE IF NOT EXISTS orcid_ids (
    orcid TEXT PRIMARY KEY              -- 0000-0000-0000-0000
);

-- Pleiades identifiers
CREATE TABLE IF NOT EXISTS pleiades_ids (
    id    TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Page tracking
CREATE TABLE IF NOT EXISTS page_ids (
    id   TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS page_views (
    page_id    TEXT NOT NULL REFERENCES page_ids(id),
    view_count INTEGER NOT NULL DEFAULT 0,
    last_viewed TEXT
);

-- Referrals (AI agent referral log)
CREATE TABLE IF NOT EXISTS referrals (
    id          TEXT PRIMARY KEY,        -- ULID
    anchor      TEXT NOT NULL,
    priority    TEXT NOT NULL,
    reason      TEXT NOT NULL,
    detail      TEXT,
    created_at  TEXT NOT NULL
);

-- Server metrics (singleton)
CREATE TABLE IF NOT EXISTS server_metrics (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    ram_used_mb   INTEGER NOT NULL DEFAULT 0,
    ram_total_mb  INTEGER NOT NULL DEFAULT 0,
    disk_used_mb  INTEGER NOT NULL DEFAULT 0,
    disk_total_mb INTEGER NOT NULL DEFAULT 0
);

-- AI tokens
CREATE TABLE IF NOT EXISTS tokens (
    id         TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Trace reasoning (audit log of AI decisions)
CREATE TABLE IF NOT EXISTS trace_reasoning (
    id         TEXT PRIMARY KEY,         -- ULID
    step       TEXT NOT NULL,
    reasoning  TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- User metrics
CREATE TABLE IF NOT EXISTS user_metrics (
    id              TEXT PRIMARY KEY,
    total_visits    INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    recorded_at     TEXT NOT NULL
);

-- Work queue
CREATE TABLE IF NOT EXISTS work_queue (
    id         TEXT PRIMARY KEY,         -- ULID
    payload    TEXT NOT NULL,            -- JSON-encoded task
    status     TEXT NOT NULL CHECK (status IN ('Pending', 'InProgress', 'Done', 'Failed')),
    created_at TEXT NOT NULL,
    updated_at TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id    TEXT PRIMARY KEY,              -- ULID
    email TEXT NOT NULL UNIQUE,
    role  TEXT NOT NULL CHECK (role IN ('Admin'))
);

CREATE TABLE IF NOT EXISTS mentions (
    id          TEXT PRIMARY KEY,        -- ULID
    source_type TEXT NOT NULL,           -- "Human" or "Agent"
    url         TEXT NOT NULL,
    snippet     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SYSTEM DATA & MONITORING
-- ─────────────────────────────────────────────────────────────────────────────

-- Page metrics (performance tracking)
CREATE TABLE IF NOT EXISTS page_metrics (
    page_id          TEXT PRIMARY KEY,
    views            INTEGER NOT NULL DEFAULT 0,
    avg_time_on_page INTEGER NOT NULL DEFAULT 0, -- Seconds
    bounce_rate      REAL NOT NULL DEFAULT 0.0
);

-- Spelling errors (audit tracking)
CREATE TABLE IF NOT EXISTS spelling_errors (
    error_id             TEXT PRIMARY KEY,
    word                 TEXT NOT NULL,
    location             TEXT NOT NULL,
    suggested_correction TEXT,
    severity             TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deadlinks (link health tracking)
CREATE TABLE IF NOT EXISTS deadlinks (
    link_id      TEXT PRIMARY KEY,
    url          TEXT NOT NULL,
    source_page  TEXT NOT NULL,
    http_status  INTEGER,
    last_checked TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Self reflection (AI agent state logs)
CREATE TABLE IF NOT EXISTS self_reflection (
    reflection_id TEXT PRIMARY KEY,
    topic         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    timestamp     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS security_logs (
    id         TEXT PRIMARY KEY,          -- ULID
    event_type TEXT NOT NULL CHECK (event_type IN (
        'Honeypot', 'RateLimit', 'LoginRequest', 'LoginSuccess', 'LoginFail'
    )),
    ip_address TEXT,
    details    TEXT,
    created_at TEXT NOT NULL              -- ISO 8601
);
