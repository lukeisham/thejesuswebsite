---
name: data_schema.md
version: 1.0.2
purpose: data schema for the jesus website (source of truth)
dependencies: [site_map.md, module_sitemap.md]
---

# data schema 

`id` | TEXT | Primary Key (ULID) 
`metadata_json` | TEXT | JSON Blob 
`title` | TEXT | Flat Indexable 
`slug` | TEXT | Flat Indexable 
`picture_name` | TEXT | Flat Indexable 
`picture_bytes` | BLOB | Raw PNG Data (max 800px width, ≤ 250 KB)
`picture_thumbnail` | BLOB | Raw PNG Data (max 200px width derivative)
`description` | TEXT | JSON Array (Paragraphs) 
`snippet` | TEXT | JSON Array (Paragraphs) 
`bibliography` | TEXT | JSON Blob 
    `mla_book`
    `mla_book_inline`
    `mla_article`
    `mla_article_inline`
    `mla_website`
    `mla_website_inline`
`era` | TEXT | Flat Indexable
    `PreIncarnation`,
    `OldTestament`,
    `EarlyLife`,
    `Life`,
    `GalileeMinistry`,
    `JudeanMinistry`,
    `PassionWeek`,
    `Post-Passion`,
`timeline` | TEXT | Flat Indexable
    `PreIncarnation`,
    `OldTestament`,
    `EarlyLifeUnborn`,
    `EarlyLifeBirth`,
    `EarlyLifeInfancy`,
    `EarlyLifeChildhood`,
    `LifeTradie`,
    `LifeBaptism`,
    `LifeTemptation`,
    `GalileeCallingTwelve`,
    `GalileeSermonMount`,
    `GalileeMiraclesSea`,
    `GalileeTransfiguration`,
    `JudeanOutsideJudea`,
    `JudeanMissionSeventy`,
    `JudeanTeachingTemple`,
    `JudeanRaisingLazarus`,
    `JudeanFinalJourney`,
    `PassionPalmSunday`,
    `PassionMondayCleansing`,
    `PassionTuesdayTeaching`,
    `PassionWednesdaySilent`,
    `PassionMaundyThursday`,
    `PassionMaundyLastSupper`,
    `PassionMaundyGethsemane`,
    `PassionMaundyBetrayal`,
    `PassionFridaySanhedrin`,
    `PassionFridayCivilTrials`,
    `PassionFridayCrucifixionBegins`,
    `PassionFridayDarkness`,
    `PassionFridayDeath`,
    `PassionFridayBurial`,
    `PassionSaturdayWatch`,
    `PassionSundayResurrection`,
    `PostResurrectionAppearances`,
    `Ascension`,
    `OurResponse`,
    `ReturnOfJesus`,  
`map_label` | TEXT | Flat Indexable
    `Overview`
    `Empire`
    `Levant`
    `Judea`
    `Galilee`
    `Jerusalem`
`geo_id` | INTEGER | Flat Indexable (64-bit int)
`gospel_category` | TEXT | Flat Indexable
    `event`
    `location`
    `person`
    `theme`
    `object`
`primary_verse` | TEXT | JSON Array (e.g., `[{"book": "Genesis", "chapter": 1, "verse": 1}]`)
    `Genesis`
    `Exodus`
    `Leviticus`
    `Numbers`
    `Deuteronomy`
    `Joshua`
    `Judges`
    `Ruth`
    `1 Samuel`
    `2 Samuel`
    `1 Kings`
    `2 Kings`
    `1 Chronicles`
    `2 Chronicles`
    `Ezra`
    `Nehemiah`
    `Esther`
    `Job`
    `Psalms`
    `Proverbs`
    `Ecclesiastes`
    `Song of Solomon`
    `Isaiah`
    `Jeremiah`
    `Lamentations`
    `Ezekiel`
    `Daniel`
    `Hosea`
    `Joel`
    `Amos`
    `Obadiah`
    `Jonah`
    `Micah`
    `Nahum`
    `Habakkuk`
    `Zephaniah`
    `Haggai`
    `Zechariah`
    `Malachi`
    `Matthew`
    `Mark`
    `Luke`
    `John`
    `Acts`
    `Romans`
    `1 Corinthians`
    `2 Corinthians`
    `Galatians`
    `Ephesians`
    `Philippians`
    `Colossians`
    `1 Thessalonians`
    `2 Thessalonians`
    `1 Timothy`
    `2 Timothy`
    `Titus`
    `Philemon`
    `Hebrews`
    `James`
    `1 Peter`
    `2 Peter`
    `1 John`
    `2 John`
    `3 John`
    `Jude`
    `Revelation`
`secondary_verse` | TEXT | JSON Array (e.g., `[{"book": "Genesis", "chapter": 1, "verse": 1}]`)
    `Genesis`
    `Exodus`
    `Leviticus`
    `Numbers`
    `Deuteronomy`
    `Joshua`
    `Judges`
    `Ruth`
    `1 Samuel`
    `2 Samuel`
    `1 Kings`
    `2 Kings`
    `1 Chronicles`
    `2 Chronicles`
    `Ezra`
    `Nehemiah`
    `Esther`
    `Job`
    `Psalms`
    `Proverbs`
    `Ecclesiastes`
    `Song of Solomon`
    `Isaiah`
    `Jeremiah`
    `Lamentations`
    `Ezekiel`
    `Daniel`
    `Hosea`
    `Joel`
    `Amos`
    `Obadiah`
    `Jonah`
    `Micah`
    `Nahum`
    `Habakkuk`
    `Zephaniah`
    `Haggai`
    `Zechariah`
    `Malachi`
    `Matthew`
    `Mark`
    `Luke`
    `John`
    `Acts`
    `Romans`
    `1 Corinthians`
    `2 Corinthians`
    `Galatians`
    `Ephesians`
    `Philippians`
    `Colossians`
    `1 Thessalonians`
    `2 Thessalonians`
    `1 Timothy`
    `2 Timothy`
    `Titus`
    `Philemon`
    `Hebrews`
    `James`
    `1 Peter`
    `2 Peter`
    `1 John`
    `2 John`
    `3 John`
    `Jude`
    `Revelation`
`context_links` | TEXT | JSON Blob 
`parent_id` | TEXT | Foreign Key (Recursive) 
`created_at` | TEXT | ISO8601 String 
`updated_at` | TEXT | ISO8601 String 
`status` | TEXT | Flat Indexable
    `draft`
    `published`
`context_essays` | TEXT | JSON Array 
`theological_essays` | TEXT | JSON Array 
`spiritual_articles` | TEXT | JSON Array 
`ordo_salutis` | TEXT | Flat Indexable
    `Predestination`
    `Regeneration`
    `Faith`
    `Repentance`
    `Justification` 
    `Sanctification`
    `Perseverance`
    `Glorification` 
`wikipedia_link` | TEXT | JSON Blob 
`wikipedia_rank` | TEXT | Flat Indexable (64-bit int) 
`wikipedia_title` | TEXT | Flat Indexable 
`wikipedia_weight` | TEXT | Label-Value Pair 
`wikipedia_search_term` | TEXT | JSON Blob 
`popular_challenge_link` | TEXT | JSON Blob 
`popular_challenge_title` | TEXT | Flat Indexable     
`popular_challenge_rank` | TEXT | Flat Indexable (64-bit int) 
`popular_challenge_weight` | TEXT | Label-Value Pair 
`popular_challenge_search_term` | TEXT | JSON Blob 
`academic_challenge_link` | TEXT | JSON Blob 
`academic_challenge_title` | TEXT | Flat Indexable 
`academic_challenge_rank` | TEXT | Flat Indexable (64-bit int) 
`academic_challenge_weight` | TEXT | Label-Value Pair 
`academic_challenge_search_term` | TEXT | JSON Blob 
`challenge_id` | TEXT | Foreign Key → records(id) (stored on the response record; points to the parent challenge this response addresses)
`responses` | TEXT | JSON Blob 
`blogposts` | TEXT | JSON Blob 
`news_sources` | TEXT | Label-Value Pair    
`news_items` | TEXT | JSON Blob    
`news_search_term` | TEXT | JSON Blob 
`users` | TEXT | JSON Blob (SPA Routing)
    `Admin`
    `Public`
`page_views` | INTEGER | Flat Indexable (64-bit int)
`iaa` | TEXT | Flat Indexable 
`pledius` | TEXT | Flat Indexable 
`manuscript` | TEXT | Flat Indexable 
`url` | TEXT | JSON Blob 




---

## `system_config` Table

Global key/value configuration store for site-wide settings not tied to any
single record. Populated at runtime by the admin dashboard.

| Column | Type | Description |
| :--- | :--- | :--- |
| `key` | TEXT | Primary Key — Configuration key |
| `value` | TEXT | Configuration value stored as text (JSON for complex values) |
| `updated_at` | TEXT | ISO8601 String — timestamp of last modification |
| `updated_by` | TEXT | Admin user who last modified this config entry |

---

## `agent_run_log` Table

Tracks every DeepSeek agent pipeline execution for observability, debugging,
and cost monitoring.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key — Auto-incrementing unique identifier |
| `pipeline` | TEXT | NOT NULL — Pipeline name |
| `record_slug` | TEXT | Slug of the record being processed (NULL for batch runs) |
| `status` | TEXT | NOT NULL — running, completed, failed |
| `trace_reasoning` | TEXT | Agent chain-of-thought reasoning log from DeepSeek |
| `articles_found` | INTEGER | DEFAULT 0 — Count of articles discovered |
| `tokens_used` | INTEGER | DEFAULT 0 — Total tokens consumed |
| `error_message` | TEXT | Error details if status is failed (NULL otherwise) |
| `started_at` | TEXT | NOT NULL — ISO-8601 timestamp of run start |
| `completed_at` | TEXT | ISO-8601 timestamp of run finish (NULL while running) |
