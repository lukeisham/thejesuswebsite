-- SQLite schema for thejesuswebsite
-- Enable foreign keys on every connection in api/config.js: db.pragma('foreign_keys = ON')

-- =====================
-- MAIN TABLES
-- =====================

CREATE TABLE evidence (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Core Content
    title               TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    description         TEXT,
    primary_verse       TEXT,
    secondary_verse     TEXT,

    -- Categorization
    gospel_category     TEXT CHECK (gospel_category IN ('theme', 'person', 'object', 'location', 'event', 'message', 'parable')),

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

    map_location        TEXT CHECK (map_location IN ('theme', 'Roman Empire', 'Levant', 'Judea', 'Galilee', 'Jerusalem')),

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

CREATE TABLE identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT,
    isbn_book_title TEXT,
    isbn_book_author TEXT,
    iaa_number TEXT,
    iaa_location TEXT,
    pleiades_number TEXT,
    pleiades_name TEXT,
    event_name TEXT,
    event_date TEXT,
    event_location TEXT,
    source_title TEXT,
    source_location TEXT,
    source_author TEXT,
    source_date TEXT,
    individual TEXT,
    individual_location TEXT,
    manuscript_number TEXT,
    manuscript_title TEXT,
    manuscript_location TEXT,
    published_draft INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1))
);

CREATE TABLE challenges (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                   TEXT UNIQUE NOT NULL,
    academic_popular       TEXT CHECK (academic_popular IN ('academic', 'popular')),
    challenge_title        TEXT,
    challenge_summary      TEXT,
    challenge_picture      TEXT,
    challenge_url_a        TEXT,
    challenge_url_b        TEXT,
    challenge_url_c        TEXT,
    challenge_url_d        TEXT,
    challenge_rank_number  INTEGER,
    challenge_rank_pluses  INTEGER,
    challenge_rank_minuses INTEGER,
    published_draft        INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords      TEXT
);

CREATE TABLE responses (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    slug               TEXT UNIQUE NOT NULL,
    challenge_id       INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    response_title     TEXT,
    response_content   TEXT,
    response_author    TEXT,
    response_date      TEXT,
    response_publisher TEXT,
    response_headings  TEXT,
    published_draft    INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords  TEXT,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (published_draft = 0 OR challenge_id IS NOT NULL)
);

CREATE TABLE context_essays (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    slug             TEXT UNIQUE NOT NULL,
    essay_title      TEXT,
    essay_content    TEXT,
    essay_author     TEXT,
    essay_date       TEXT,
    essay_publisher  TEXT,
    essay_headings   TEXT,
    published_draft  INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords TEXT,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_posts (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                 TEXT UNIQUE NOT NULL,
    blog_title           TEXT,
    blog_date            TEXT,
    blog_content         TEXT,
    landing_page_display INTEGER DEFAULT 0,
    published_draft      INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords    TEXT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historiography (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    slug              TEXT UNIQUE NOT NULL,
    essay_title       TEXT,
    essay_content     TEXT,
    essay_author      TEXT,
    essay_date        TEXT,
    essay_publisher   TEXT,
    essay_headings    TEXT,
    published_draft   INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mla_website_title TEXT,
    mla_website_url TEXT,
    mla_website_date TEXT,
    mla_website_author TEXT,
    mla_website_publisher TEXT,
    mla_book_title TEXT,
    mla_book_author TEXT,
    mla_book_publisher TEXT,
    mla_book_date TEXT,
    mla_book_page_reference TEXT,
    mla_journal_article_author TEXT,
    mla_journal_article_title TEXT,
    mla_journal_title TEXT,
    mla_journal_volume TEXT,
    mla_journal_issue TEXT,
    mla_journal_date TEXT,
    mla_journal_page_reference TEXT,
    published_draft INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1))
);

CREATE TABLE news_articles (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                   TEXT UNIQUE NOT NULL,
    news_article_title     TEXT,
    news_article_url       TEXT,
    news_article_date      TEXT,
    news_article_author    TEXT,
    news_article_publisher TEXT,
    landing_page_display   INTEGER DEFAULT 0,
    published_draft        INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords      TEXT
);

CREATE TABLE wikipedia_articles (
    id                                     INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                                   TEXT UNIQUE NOT NULL,
    wikipedia_article_title                TEXT,
    wikipedia_article_url                  TEXT,
    wikipedia_article_latest_revision_date TEXT,
    wikipedia_article_rank_number          INTEGER,
    wikipedia_rank_pluses                  INTEGER,
    wikipedia_rank_minuses                 INTEGER,
    published_draft                        INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords                      TEXT
);

CREATE TABLE about_pages (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    about_section_title   TEXT,
    about_section_content TEXT,
    published_draft       INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    version_update        INTEGER DEFAULT 1,
    metadata_keywords     TEXT,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    published_draft INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    list_key             TEXT NOT NULL CHECK (list_key IN (
                             'sermons-and-sayings', 'parables', 'objects', 'people', 'sites',
                             'ot-verses', 'internal-witnesses', 'external-witnesses', 'places',
                             'world-events', 'miracles', 'events', 'apologetics',
                             'manuscripts', 'sources'
                         )),
    resource_title       TEXT NOT NULL,
    resource_url         TEXT,
    resource_description TEXT,
    sort_order           INTEGER,
    published_draft      INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1))
);

CREATE TABLE maps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    map_key     TEXT UNIQUE NOT NULL,
    map_name    TEXT NOT NULL,
    description TEXT,
    image_path  TEXT
);

CREATE TABLE map_pins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    map_id      INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    evidence_id INTEGER REFERENCES evidence(id) ON DELETE SET NULL,
    label       TEXT,
    x           REAL NOT NULL,
    y           REAL NOT NULL
);

-- =====================
-- AUTH & ANALYTICS
-- =====================

CREATE TABLE credentials (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id  TEXT UNIQUE NOT NULL,
    public_key     TEXT NOT NULL,
    user_handle    TEXT NOT NULL,
    sign_count     INTEGER DEFAULT 0,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analytics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    page       TEXT NOT NULL,
    referrer   TEXT,
    user_agent TEXT,
    ip_hash    TEXT,
    session_id TEXT,
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schema_migrations (
    filename   TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- INDEXES
-- =====================

-- Bibliography junctions (all point to mla_sources)
CREATE TABLE evidence_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evidence_id, mla_source_id)
);

CREATE TABLE challenge_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, mla_source_id)
);

CREATE TABLE response_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(response_id, mla_source_id)
);

CREATE TABLE context_essay_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(context_essay_id, mla_source_id)
);

CREATE TABLE blog_post_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blog_post_id, mla_source_id)
);

CREATE TABLE historiography_mla_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(historiography_id, mla_source_id)
);

-- Internal links - Evidence
CREATE TABLE evidence_links_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order         INTEGER DEFAULT 0,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_evidence_id, target_evidence_id),
    CHECK (source_evidence_id <> target_evidence_id)
);

CREATE TABLE evidence_links_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_evidence_id       INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_context_essay_id  INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order               INTEGER DEFAULT 0,
    created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_evidence_id, target_context_essay_id)
);

-- Internal links - Responses
CREATE TABLE response_links_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    target_evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order         INTEGER DEFAULT 0,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_response_id, target_evidence_id)
);

CREATE TABLE response_links_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_response_id      INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    target_context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order              INTEGER DEFAULT 0,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_response_id, target_context_essay_id)
);

-- Internal links - Context Essays
CREATE TABLE context_essay_links_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    target_evidence_id      INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order              INTEGER DEFAULT 0,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_context_essay_id, target_evidence_id)
);

CREATE TABLE context_essay_links_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    target_context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order              INTEGER DEFAULT 0,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_context_essay_id, target_context_essay_id),
    CHECK (source_context_essay_id <> target_context_essay_id)
);

-- Internal links - Blog Posts
CREATE TABLE blog_post_links_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    target_evidence_id  INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order          INTEGER DEFAULT 0,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_blog_post_id, target_evidence_id)
);

CREATE TABLE blog_post_links_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_blog_post_id     INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    target_context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order              INTEGER DEFAULT 0,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_blog_post_id, target_context_essay_id)
);

-- Internal links - Historiography
CREATE TABLE historiography_links_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    target_evidence_id       INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order               INTEGER DEFAULT 0,
    created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_historiography_id, target_evidence_id)
);

CREATE TABLE historiography_links_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    target_context_essay_id  INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order               INTEGER DEFAULT 0,
    created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_historiography_id, target_context_essay_id)
);

-- Identifiers junctions
CREATE TABLE evidence_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(evidence_id, identifier_id)
);

CREATE TABLE challenge_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, identifier_id)
);

CREATE TABLE response_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(response_id, identifier_id)
);

CREATE TABLE context_essay_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(context_essay_id, identifier_id)
);

CREATE TABLE blog_post_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blog_post_id, identifier_id)
);

CREATE TABLE historiography_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(historiography_id, identifier_id)
);

-- =====================
-- BREAKOUT CHILD TABLES
-- =====================

CREATE TABLE response_breakouts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    title       TEXT,
    content     TEXT
);

CREATE TABLE essay_breakouts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    title            TEXT,
    content          TEXT
);

CREATE TABLE blog_breakouts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    title        TEXT,
    content      TEXT
);

CREATE TABLE historiography_breakouts (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    title             TEXT,
    content           TEXT
);

-- =====================
-- PICTURE CHILD TABLES
-- =====================

CREATE TABLE evidence_pictures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    image_path  TEXT NOT NULL,
    caption     TEXT
);

CREATE TABLE response_pictures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    image_path  TEXT NOT NULL,
    caption     TEXT
);

CREATE TABLE essay_pictures (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    context_essay_id INTEGER NOT NULL REFERENCES context_essays(id) ON DELETE CASCADE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    image_path       TEXT NOT NULL,
    caption          TEXT
);

CREATE TABLE blog_pictures (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    image_path   TEXT NOT NULL,
    caption      TEXT
);

CREATE TABLE historiography_pictures (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    historiography_id INTEGER NOT NULL REFERENCES historiography(id) ON DELETE CASCADE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    image_path        TEXT NOT NULL,
    caption           TEXT
);

-- =====================
-- ARBOR DIAGRAM
-- =====================

CREATE TABLE arbor_edges (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id         INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_id         INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    relationship_type TEXT CHECK (relationship_type IN ('root', 'supports', 'leads_to', 'related')),
    sort_order        INTEGER DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, target_id),
    CHECK (source_id <> target_id)
);

-- =====================
-- COLLECTIONS JUNCTION
-- =====================

CREATE TABLE collection_evidence (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    evidence_id   INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order    INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, evidence_id)
);

-- =====================
-- RESOURCE JUNCTION
-- =====================

CREATE TABLE evidence_resource_lists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    sort_order  INTEGER,
    UNIQUE(evidence_id, resource_id)
);

-- =====================
-- INDEXES
-- =====================

-- Evidence filters (used heavily in API queries)
CREATE INDEX idx_evidence_published        ON evidence (published_draft);
CREATE INDEX idx_evidence_timeline_era     ON evidence (timeline_era);
CREATE INDEX idx_evidence_timeline_period  ON evidence (timeline_period);
CREATE INDEX idx_evidence_map_location     ON evidence (map_location);
-- Arbor edges
CREATE INDEX idx_arbor_edges_source        ON arbor_edges (source_id);
CREATE INDEX idx_arbor_edges_target        ON arbor_edges (target_id);

-- Responses per challenge
CREATE INDEX idx_responses_challenge_id     ON responses (challenge_id);

-- Ranking queries
CREATE INDEX idx_challenges_rank           ON challenges (challenge_rank_number);
CREATE INDEX idx_wikipedia_rank            ON wikipedia_articles (wikipedia_article_rank_number);

-- Analytics dashboard queries
CREATE INDEX idx_analytics_page            ON analytics (page);
CREATE INDEX idx_analytics_visited_at      ON analytics (visited_at);

-- Map pins
CREATE INDEX idx_map_pins_map_id           ON map_pins (map_id);
CREATE INDEX idx_map_pins_evidence_id      ON map_pins (evidence_id);

-- Bibliography junctions (second FK not covered by UNIQUE index)
CREATE INDEX idx_evidence_mla_source       ON evidence_mla_sources (mla_source_id);
CREATE INDEX idx_challenge_mla_source      ON challenge_mla_sources (mla_source_id);
CREATE INDEX idx_response_mla_source       ON response_mla_sources (mla_source_id);
CREATE INDEX idx_essay_mla_source          ON context_essay_mla_sources (mla_source_id);
CREATE INDEX idx_blog_mla_source           ON blog_post_mla_sources (mla_source_id);
CREATE INDEX idx_historiography_mla_source ON historiography_mla_sources (mla_source_id);

-- Link tables (second FK not covered by UNIQUE index)
CREATE INDEX idx_evidence_links_target     ON evidence_links_evidence (target_evidence_id);
CREATE INDEX idx_evidence_links_ctx_target ON evidence_links_context (target_context_essay_id);
CREATE INDEX idx_response_links_ev_target  ON response_links_evidence (target_evidence_id);
CREATE INDEX idx_response_links_ctx_target ON response_links_context (target_context_essay_id);
CREATE INDEX idx_essay_links_ev_target     ON context_essay_links_evidence (target_evidence_id);
CREATE INDEX idx_essay_links_ctx_target    ON context_essay_links_context (target_context_essay_id);
CREATE INDEX idx_blog_links_ev_target      ON blog_post_links_evidence (target_evidence_id);
CREATE INDEX idx_blog_links_ctx_target     ON blog_post_links_context (target_context_essay_id);
CREATE INDEX idx_hist_links_ev_target      ON historiography_links_evidence (target_evidence_id);
CREATE INDEX idx_hist_links_ctx_target     ON historiography_links_context (target_context_essay_id);

-- Identifier junctions (second FK not covered by UNIQUE index)
CREATE INDEX idx_evidence_identifier       ON evidence_identifiers (identifier_id);
CREATE INDEX idx_challenge_identifier      ON challenge_identifiers (identifier_id);
CREATE INDEX idx_response_identifier       ON response_identifiers (identifier_id);
CREATE INDEX idx_essay_identifier          ON context_essay_identifiers (identifier_id);
CREATE INDEX idx_blog_identifier           ON blog_post_identifiers (identifier_id);
CREATE INDEX idx_historiography_identifier ON historiography_identifiers (identifier_id);

-- Breakout child tables
CREATE INDEX idx_response_breakouts        ON response_breakouts (response_id);
CREATE INDEX idx_essay_breakouts           ON essay_breakouts (context_essay_id);
CREATE INDEX idx_blog_breakouts            ON blog_breakouts (blog_post_id);
CREATE INDEX idx_historiography_breakouts  ON historiography_breakouts (historiography_id);

-- Picture child tables
CREATE INDEX idx_evidence_pictures         ON evidence_pictures (evidence_id);
CREATE INDEX idx_response_pictures         ON response_pictures (response_id);
CREATE INDEX idx_essay_pictures            ON essay_pictures (context_essay_id);
CREATE INDEX idx_blog_pictures             ON blog_pictures (blog_post_id);
CREATE INDEX idx_historiography_pictures   ON historiography_pictures (historiography_id);

-- Resource lists
CREATE INDEX idx_evidence_resource_lists   ON evidence_resource_lists (resource_id);
CREATE INDEX idx_resources_list_key             ON resources (list_key);
CREATE INDEX idx_collection_evidence_collection ON collection_evidence (collection_id);
CREATE INDEX idx_collection_evidence_evidence   ON collection_evidence (evidence_id);
CREATE INDEX idx_analytics_session_id      ON analytics (session_id);

-- =====================
-- FULL TEXT SEARCH
-- =====================

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

CREATE VIRTUAL TABLE responses_fts USING fts5(
    response_title, response_content, metadata_keywords,
    content='responses', content_rowid='id'
);

CREATE TRIGGER responses_fts_ai AFTER INSERT ON responses BEGIN
    INSERT INTO responses_fts(rowid, response_title, response_content, metadata_keywords)
    VALUES (new.id, new.response_title, new.response_content, new.metadata_keywords);
END;
CREATE TRIGGER responses_fts_ad AFTER DELETE ON responses BEGIN
    INSERT INTO responses_fts(responses_fts, rowid, response_title, response_content, metadata_keywords)
    VALUES ('delete', old.id, old.response_title, old.response_content, old.metadata_keywords);
END;
CREATE TRIGGER responses_fts_au AFTER UPDATE ON responses BEGIN
    INSERT INTO responses_fts(responses_fts, rowid, response_title, response_content, metadata_keywords)
    VALUES ('delete', old.id, old.response_title, old.response_content, old.metadata_keywords);
    INSERT INTO responses_fts(rowid, response_title, response_content, metadata_keywords)
    VALUES (new.id, new.response_title, new.response_content, new.metadata_keywords);
END;

CREATE VIRTUAL TABLE context_essays_fts USING fts5(
    essay_title, essay_content, metadata_keywords,
    content='context_essays', content_rowid='id'
);

CREATE TRIGGER context_essays_fts_ai AFTER INSERT ON context_essays BEGIN
    INSERT INTO context_essays_fts(rowid, essay_title, essay_content, metadata_keywords)
    VALUES (new.id, new.essay_title, new.essay_content, new.metadata_keywords);
END;
CREATE TRIGGER context_essays_fts_ad AFTER DELETE ON context_essays BEGIN
    INSERT INTO context_essays_fts(context_essays_fts, rowid, essay_title, essay_content, metadata_keywords)
    VALUES ('delete', old.id, old.essay_title, old.essay_content, old.metadata_keywords);
END;
CREATE TRIGGER context_essays_fts_au AFTER UPDATE ON context_essays BEGIN
    INSERT INTO context_essays_fts(context_essays_fts, rowid, essay_title, essay_content, metadata_keywords)
    VALUES ('delete', old.id, old.essay_title, old.essay_content, old.metadata_keywords);
    INSERT INTO context_essays_fts(rowid, essay_title, essay_content, metadata_keywords)
    VALUES (new.id, new.essay_title, new.essay_content, new.metadata_keywords);
END;

CREATE VIRTUAL TABLE blog_posts_fts USING fts5(
    blog_title, blog_content, metadata_keywords,
    content='blog_posts', content_rowid='id'
);

CREATE TRIGGER blog_posts_fts_ai AFTER INSERT ON blog_posts BEGIN
    INSERT INTO blog_posts_fts(rowid, blog_title, blog_content, metadata_keywords)
    VALUES (new.id, new.blog_title, new.blog_content, new.metadata_keywords);
END;
CREATE TRIGGER blog_posts_fts_ad AFTER DELETE ON blog_posts BEGIN
    INSERT INTO blog_posts_fts(blog_posts_fts, rowid, blog_title, blog_content, metadata_keywords)
    VALUES ('delete', old.id, old.blog_title, old.blog_content, old.metadata_keywords);
END;
CREATE TRIGGER blog_posts_fts_au AFTER UPDATE ON blog_posts BEGIN
    INSERT INTO blog_posts_fts(blog_posts_fts, rowid, blog_title, blog_content, metadata_keywords)
    VALUES ('delete', old.id, old.blog_title, old.blog_content, old.metadata_keywords);
    INSERT INTO blog_posts_fts(rowid, blog_title, blog_content, metadata_keywords)
    VALUES (new.id, new.blog_title, new.blog_content, new.metadata_keywords);
END;

-- =====================
-- TRIGGERS
-- =====================

-- updated_at: only fires when the caller did not explicitly set a new updated_at value,
-- preventing a redundant write on the auto-update itself.

CREATE TRIGGER evidence_updated_at
AFTER UPDATE ON evidence
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE evidence SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER responses_updated_at
AFTER UPDATE ON responses
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE responses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER context_essays_updated_at
AFTER UPDATE ON context_essays
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE context_essays SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER blog_posts_updated_at
AFTER UPDATE ON blog_posts
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE blog_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER historiography_updated_at
AFTER UPDATE ON historiography
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE historiography SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER about_pages_updated_at
AFTER UPDATE ON about_pages
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE about_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER collections_updated_at
AFTER UPDATE ON collections
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER credentials_updated_at
AFTER UPDATE ON credentials
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
