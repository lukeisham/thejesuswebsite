---
name: high_level_schema.md
version: 2.1.0
purpose: High-level polymorphic data model — unified single-table design with type discriminator, sub-type variants, and shared base fields
dependencies: [data_schema.md, detailed_module_sitemap.md]
---

# High-Level Schema: Polymorphic Data Model

This document describes the layered data architecture of The Jesus Website.
All entities live in a single table, discriminated by the `type` field.
Each type extends a shared base with its own unique fields. External-alias
types additionally use `sub-type` to split weight, search term, and source
configuration into separate rows.

---

## 1. Type Discriminator Values

The `type` field is the primary discriminator on every row.

```
type            TEXT    Flat Indexable
    record
    context_essay
    historiographical_essay
    theological_essay
    spiritual_article
    challenge_response
    blog_post
    challenge_academic
    challenge_popular
    wikipedia_entry
    news_article
    system_data

sub-type        TEXT    Flat Indexable  (only on challenge_academic,
                        challenge_popular, news_article, wikipedia_entry,
                        system_data)
    ranked_weight
    ranked_search_term
    news_source
    news_search_term
    trace_reasoning
```
---

## 2. Base Columns

Every row in the table includes these two groups of columns.

### Layer 1: Core Identity (Every Row)

```
id              TEXT    Primary Key (ULID)
type            TEXT    Entity type discriminator (see §1)
status          TEXT    "draft" | "published"
```

### Layer 2: Content Metadata (All Types)

```
title           TEXT    Flat Indexable — display title
slug            TEXT    URL-safe identifier
snippet         TEXT    JSON Array (paragraphs) — archival abstract
metadata_json   TEXT    JSON Blob — SEO keywords, search metadata
users           TEXT    JSON Blob — "Admin" | "Public" | "Agent" (SPA routing)
context_links   TEXT    JSON Blob — internal website links
iaa             TEXT    Text identifier
pledius         TEXT    Text identifier
manuscript      TEXT    Text identifier
url             TEXT    JSON Blob — label/URL pairs
page_views      INTEGER Flat Indexable (64-bit)
created_at      TEXT    ISO8601
updated_at      TEXT    ISO8601
```

---

## 3. Type Hierarchy Diagram

```
                           ┌──────────────────────────────┐
                           │       EVERY ROW              │
                           │                              │
                           │  id (ULID)                   │
                           │  type (discriminator)        │
                           │  status (draft | published)  │
                           └──────────────┬───────────────┘
                                          │
                           ┌──────────────┴───────────────┐
                           │       BASE FIELDS           │
                           │                              │
                           │  title                       │
                           │  slug                        │
                           │  snippet                     │
                           │  metadata_json               │
                           │  users                       │
                           │  context_links               │
                           │  iaa / pledius / manuscript  │
                           │  url                         │
                           │  page_views                  │
                           │  created_at / updated_at     │
                           └──────────────┬───────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         │                    ┌───────────┴───────────┐                    │
         │                    │   EXTERNAL-ALIAS      │                    │
         │                    │   + sub-type variants  │                    │
         │                    │                        │                    │
         │                    │  wikipedia_entry       │                    │
         │                    │  challenge_academic    │                    │
         │                    │  challenge_popular     │                    │
         │                    │  news_article          │                    │
         │                    │                        │                    │
         │                    │  ─ NO MLA ─            │                    │
         │                    │  ─ NO body ─           │                    │
         │                    └────────────────────────┘                    │
         │                                                                  │
   ┌─────┴─────┐                                                  ┌────────┴────────┐
   │  CONTENT  │                                                  │  SYSTEM         │
   │  TYPES    │                                                  │                 │
   │           │                                                  │  system_data  │
   │  record   │                                                  │                 │
   │  *essay   │                                                  │  (singleton     │
   │  *article │                                                  │   config rows)  │
   │  response │                                                  └─────────────────┘
   │  blog     │
   │           │
   │  + MLA    │
   │  + body   │
   └───────────┘
```

---

## 4. Type-Group Breakdown

### 4a. Content Types (Hosted Content)

These types are **authored or curated on the site** — they carry body content,
MLA bibliographic citations, and type-specific fields.

Types: `record`, `context_essay`, `historiographical_essay`, `theological_essay`,
`spiritual_article`, `challenge_response`, `blog_post`.

```
┌─────────────────────────────────────────────────────┐
│  RECORD                                              │
│  type = "record"                                     │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + description       JSON Array (paragraphs)         │
│  + bibliography      MLA-structured JSON             │
│  + gospel_category   event | location | person       │
│                       | theme | object               │
│  + era               PreIncarnation … ReturnOfJesus  │
│  + timeline          PreIncarnation … ReturnOfJesus  │
│  + primary_verse     Structured book/ch/v ref        │
│  + secondary_verse   Structured book/ch/v ref        │
│  + map_label         Overview | Empire | Levant …    │
│  + geo_id            Integer (64-bit)                │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG (≤ 800px, ≤ 250 KB)    │
│  + picture_thumbnail Raw PNG (≤ 200px derivative)    │
│  + parent_id         Foreign Key (recursive)         │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────┐
│  CONTEXT ESSAY                                       │
│  type = "context_essay"                              │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + body              WYSIWYG markdown content        │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG                         │
│  + picture_thumbnail Raw PNG thumbnail               │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```
```

```
┌─────────────────────────────────────────────────────┐
│  HISTORIOGRAPHICAL ESSAY                              │
│  type = "historiographical_essay"                    │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + body              WYSIWYG markdown content        │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG                         │
│  + picture_thumbnail Raw PNG thumbnail               │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```
```

```
┌─────────────────────────────────────────────────────┐
│  THEOLOGICAL ESSAY                                    │
│  type = "theological_essay"                          │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + body              WYSIWYG markdown content        │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG                         │
│  + picture_thumbnail Raw PNG thumbnail               │
│  + ordo_salutis      Predestination … Glorification  │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```
```

```
┌─────────────────────────────────────────────────────┐
│  SPIRITUAL ARTICLE                                    │
│  type = "spiritual_article"                          │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + body              WYSIWYG markdown content        │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG                         │
│  + picture_thumbnail Raw PNG thumbnail               │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```
```

```
┌─────────────────────────────────────────────────────┐
│  CHALLENGE RESPONSE                                   │
│  type = "challenge_response"                         │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + challenge_id      Foreign Key → records(id)       │
│                       (the challenge being answered)  │
│  + body              WYSIWYG markdown content        │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘
```
```

```
┌─────────────────────────────────────────────────────┐
│  BLOG POST                                           │
│  type = "blog_post"                                  │
│                                                      │
│  + id                ULID                            │
│  + status            "draft" | "published"           │
│  + title             Display title                   │
│  + slug              URL-safe identifier              │
│  + snippet           JSON Array (paragraphs)         │
│  + metadata_json     JSON Blob                       │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  + bibliography      MLA-structured JSON             │
│  + body              WYSIWYG markdown content        │
│  + picture_name      Filename                        │
│  + picture_bytes     Raw PNG                         │
│  + picture_thumbnail Raw PNG thumbnail               │
│  + context_links     JSON Blob (internal links)      │
│  + iaa               Text identifier                 │
│  + pledius           Text identifier                 │
│  + manuscript        Text identifier                 │
│  + url               JSON Blob (label/URL pairs)     │
│  + page_views        Integer (64-bit)                │
│                                                      │
└─────────────────────────────────────────────────────┘

---

### 4b. External-Alias Types (Ranked References)

These types are **external references, not hosted content** — they point outward,
carry ranking/weight fields, and have **no MLA references** and **no body content**.

Each conceptual alias is split across multiple rows linked by a shared `id`
(grouping key), with `sub-type` distinguishing the variant:

| sub-type | Purpose |
|---|---|
| *(NULL)* | Main entry — title, link, rank |
| `ranked_weight` | Multi-weight multiplier configuration |
| `ranked_search_term` | Search scope configuration |

```
┌───────────────────────────────────────────────────────┐
│  WIKIPEDIA ENTRY                                       │
│  type = "wikipedia_entry"                              │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + title             Display title                      │
│  + slug              URL-safe identifier                │
│  + snippet           JSON Array (paragraphs)            │
│  + metadata_json     JSON Blob                          │
│  + created_at        ISO8601                            │
│  + updated_at        ISO8601                            │
│                                                         │
│  ─ NO MLA ─  ─ NO body ─                               │
│                                                         │
│  sub-type = NULL (main entry):                          │
│  + wikipedia_title    Display title                     │
│  + wikipedia_link     External URL                      │
│  + wikipedia_rank     Integer (64-bit)                  │
│                                                         │
└───────────────────────────────────────────────────────┘
```

┌───────────────────────────────────────────────────────┐
│  WIKIPEDIA WEIGHT                                      │
│  sub-type = "ranked_weight"                            │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + wikipedia_weight   JSON (multi-weight multipliers)   │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  WIKIPEDIA SEARCH TERM                                 │
│  sub-type = "ranked_search_term"                       │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + wikipedia_search_term  JSON Array (search scope)     │
└───────────────────────────────────────────────────────┘

```
┌───────────────────────────────────────────────────────┐
│  ACADEMIC CHALLENGE                                    │
│  type = "challenge_academic"                           │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + title             Display title                      │
│  + slug              URL-safe identifier                │
│  + snippet           JSON Array (paragraphs)            │
│  + metadata_json     JSON Blob                          │
│  + created_at        ISO8601                            │
│  + updated_at        ISO8601                            │
│                                                         │
│  ─ NO MLA ─  ─ NO body ─                               │
│                                                         │
│  sub-type = NULL (main entry):                          │
│  + academic_challenge_title   Display title             │
│  + academic_challenge_link   External URL               │
│  + academic_challenge_rank   Integer (64-bit)           │
│                                                         │
└───────────────────────────────────────────────────────┘
```

┌───────────────────────────────────────────────────────┐
│  ACADEMIC CHALLENGE WEIGHT                            │
│  sub-type = "ranked_weight"                            │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + academic_challenge_weight  JSON (multi-weight)       │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  ACADEMIC CHALLENGE SEARCH TERM                         │
│  sub-type = "ranked_search_term"                       │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + academic_challenge_search_term  JSON Array           │
└───────────────────────────────────────────────────────┘

```
┌───────────────────────────────────────────────────────┐
│  POPULAR CHALLENGE                                     │
│  type = "challenge_popular"                            │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + title             Display title                      │
│  + slug              URL-safe identifier                │
│  + snippet           JSON Array (paragraphs)            │
│  + metadata_json     JSON Blob                          │
│  + created_at        ISO8601                            │
│  + updated_at        ISO8601                            │
│                                                         │
│  ─ NO MLA ─  ─ NO body ─                               │
│                                                         │
│  sub-type = NULL (main entry):                          │
│  + popular_challenge_title    Display title             │
│  + popular_challenge_link    External URL               │
│  + popular_challenge_rank    Integer (64-bit)           │
│                                                         │
└───────────────────────────────────────────────────────┘
```

┌───────────────────────────────────────────────────────┐
│  POPULAR CHALLENGE WEIGHT                            │
│  sub-type = "ranked_weight"                            │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + popular_challenge_weight  JSON (multi-weight)       │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  POPULAR CHALLENGE SEARCH TERM                         │
│  sub-type = "ranked_search_term"                       │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + popular_challenge_search_term  JSON Array           │
└───────────────────────────────────────────────────────┘

```
┌───────────────────────────────────────────────────────┐
│  NEWS ARTICLE                                          │
│  type = "news_article"                                 │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + title             Display title                      │
│  + slug              URL-safe identifier                │
│  + snippet           JSON Array (paragraphs)            │
│  + metadata_json     JSON Blob                          │
│  + created_at        ISO8601                            │
│  + updated_at        ISO8601                            │
│                                                         │
│  ─ NO MLA ─  ─ NO body ─                               │
│                                                         │
│  sub-type = NULL (main entry):                          │
│  + news_item_title   TEXT | Flat Indexable              │
│  + news_item_link    TEXT | Flat Indexable              │
│  + last_crawled      ISO8601                            │
└───────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────┐
│  NEWS SOURCE                                          │
│  sub-type = "news_source"                             │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + source_url        External URL                       │
│  + keywords          JSON Array (crawl scope)           │
│  + last_crawled      ISO8601                            │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  NEWS ARTICLE SEARCH TERM                         │
│  sub-type = "news_search_term"                       │
│                                                         │
│  + id                ULID (grouping key)                │
│  + status            "draft" | "published"              │
│  + news_search_term   JSON Array (crawl scope)        │
└───────────────────────────────────────────────────────┘

---

### 4c. System Data Type

System configuration rows live in the main table alongside all other types,
discriminated by `type = "system_data"`.

```
┌─────────────────────────────────────────────────────┐
│  SYSTEM DATA                                         │
│  type = "system_data"                              │
│                                                      │
│  + id                ULID                            │
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  ─ NO MLA ─  ─ NO body ─  ─ NO picture ─            │
│                                                      │
│  + value             TEXT — stored as JSON for       │
│                       complex values                 │
│  + updated_by        TEXT — admin who last modified  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SYSTEM DATA                                         │
│  sub-type = "trace_reasoning"                              │
│                                                      │
│  + id                ULID                            │
│  + trace_reasoning   TEXT — Flat Indexable (64-bit int)
│  + created_at        ISO8601                         │
│  + updated_at        ISO8601                         │
│                                                      │
│  ─ NO MLA ─  ─ NO body ─  ─ NO picture ─            │
│                                                      │
│  + value             TEXT — stored as JSON for       │
│                       complex values                 │
│  + updated_by        TEXT — admin who last modified  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Visual Summary: What Belongs Where

| Field Group | record | context_essay | historiographical_essay | theological_essay | spiritual_article | challenge_response | blog_post | wikipedia_entry | challenge_academic | challenge_popular | news_article | system_data |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id + type + status | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| title + slug + snippet + metadata_json + users | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| created_at / updated_at | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| sub-type | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MLA bibliography | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| description | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| WYSIWYG body | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| picture | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| external link (primary URL) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| ranking fields (rank + weight) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| search terms | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| gospel / era / timeline | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| primary / secondary_verse | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| map_label / geo_id | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

| parent_id (recursive FK) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| content-type base fields (context_links, iaa, pledius, manuscript, url, page_views) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ordo_salutis | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| challenge_id (parent FK) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| config value + updated_by | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 6. Supplementary Tables

Two tables exist outside the unified `type`-discriminated model.

### `system_config`

Global key/value configuration store for site-wide settings not tied to any
single record. Populated at runtime by the admin dashboard.

| Column | Type | Description |
| :--- | :--- | :--- |
| `key` | TEXT | Primary Key — Configuration key |
| `value` | TEXT | Configuration value stored as text (JSON for complex values) |
| `updated_at` | TEXT | ISO8601 String — timestamp of last modification |
| `updated_by` | TEXT | Admin user who last modified this config entry |

### `agent_run_log`

Tracks every DeepSeek agent pipeline execution for observability, debugging,
and cost monitoring.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key — Auto-incrementing |
| `pipeline` | TEXT | NOT NULL — Pipeline name |
| `record_slug` | TEXT | Slug of the record being processed (NULL for batch runs) |
| `status` | TEXT | NOT NULL — running \| completed \| failed |
| `trace_reasoning` | TEXT | Agent chain-of-thought reasoning log from DeepSeek |
| `articles_found` | INTEGER | DEFAULT 0 — Count of articles discovered |
| `tokens_used` | INTEGER | DEFAULT 0 — Total tokens consumed |
| `error_message` | TEXT | Error details if status is failed (NULL otherwise) |
| `started_at` | TEXT | NOT NULL — ISO-8601 timestamp of run start |
| `completed_at` | TEXT | ISO-8601 timestamp of run finish (NULL while running) |

---

## 7. Unifying Principle

The website follows a **single-table, type-discriminated** architecture:

1. **Every row** in the main table carries `id`, `type`, and `status`.
2. **Every row** carries the metadata core (title, slug, snippet, metadata_json)
   plus timestamps.
3. **Content types** (records, essays, articles, responses, blog posts) add MLA
   bibliographic references, description, and WYSIWYG body content where
   appropriate.
4. **External-alias types** (wikipedia entries, academic/popular challenges, news
   articles) point outward, carry ranking and search-term data, and use `sub-type`
   to split weight/term configuration into separate rows sharing a grouping key.
5. **System data** lives in the same table as everything else, discriminated by
   `type = "system_data"`.
6. **Relationships** cross entity types freely — records link to essays,
   challenges, responses, blog posts, and news articles; responses use
   `challenge_id` to point back to their parent challenge.
