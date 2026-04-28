---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens, mapped to front-end components and database fields (source of truth)
version: 1.2.0
dependencies: [guide_appearance.md, detailed_module_sitemap.md, data_schema.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Portal (`admin.html`). Unlike the public pages, the portal operates primarily as a Single Page Application (SPA) driven by `dashboard_app.js`.

The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

Each section includes a **DB Fields** block listing the exact column names from `data_schema.md` that are read or written by that dashboard view. This is the authoritative reference for which part of the `records` table each editor owns.

---

## Field Ownership Map

Quick-reference index showing which dashboard section owns each `records` column.

| Column | Type | Owned By |
|--------|------|----------|
| `id` | TEXT (ULID) | Auto-generated on create (§2.2 / §2.5) |
| `title` | TEXT | §2.2 edit_record.js |
| `slug` | TEXT | §2.2 edit_record.js |
| `picture_name` | TEXT | §2.2 edit_picture.js |
| `picture_bytes` | BLOB | §2.2 edit_picture.js |
| `picture_thumbnail` | BLOB | §2.2 edit_picture.js |
| `description` | TEXT (JSON Array) | §2.2 edit_record.js |
| `snippet` | TEXT (JSON Array) | §2.2 edit_record.js |
| `bibliography` | TEXT (JSON Blob) | §2.2 edit_record.js |
| `era` | TEXT (Enum) | §2.2 edit_record.js |
| `timeline` | TEXT (Enum) | §2.2 edit_record.js |
| `map_label` | TEXT (Enum) | §2.2 edit_record.js |
| `geo_id` | INTEGER | §2.2 edit_record.js |
| `gospel_category` | TEXT (Enum) | §2.2 edit_record.js |
| `primary_verse` | TEXT (JSON Array) | §2.2 edit_record.js |
| `secondary_verse` | TEXT (JSON Array) | §2.2 edit_record.js |
| `context_links` | TEXT (JSON Blob) | §2.2 edit_links.js |
| `parent_id` | TEXT (Foreign Key) | §2.2 edit_record.js + §3.1 edit_diagram.js |
| `created_at` | TEXT (ISO8601) | Auto-generated on create (§2.2 / §2.5) |
| `updated_at` | TEXT (ISO8601) | Auto-updated on save (§2.2 / §2.5) |
| `context_essays` | TEXT (JSON Array) | §5.1 edit_essay.js |
| `theological_essays` | TEXT (JSON Array) | §5.1 edit_essay.js |
| `spiritual_articles` | TEXT (JSON Array) | §5.1 edit_essay.js |
| `ordo_salutis` | TEXT (Enum) | §5.1 edit_essay.js |
| `metadata_json` | TEXT (JSON Blob) | §2.2 edit_record.js |
| `iaa` | TEXT | §2.2 edit_record.js |
| `pledius` | TEXT | §2.2 edit_record.js |
| `manuscript` | TEXT | §2.2 edit_record.js |
| `url` | TEXT (JSON Blob) | §2.2 edit_record.js |
| `wikipedia_link` | TEXT (JSON Blob) | §4.1 edit_wiki_weights.js |
| `wikipedia_rank` | INTEGER | §4.1 edit_wiki_weights.js |
| `wikipedia_title` | TEXT | §4.1 edit_wiki_weights.js |
| `wikipedia_weight` | TEXT (Label-Value) | §4.1 edit_wiki_weights.js |
| `popular_challenge_link` | TEXT (JSON Blob) | §4.1 edit_popular_weights.js |
| `popular_challenge_title` | TEXT | §4.1 edit_popular_weights.js |
| `popular_challenge_rank` | INTEGER | §4.1 edit_popular_weights.js |
| `popular_challenge_weight` | TEXT (Label-Value) | §4.1 edit_popular_weights.js |
| `academic_challenge_link` | TEXT (JSON Blob) | §4.1 edit_academic_weights.js |
| `academic_challenge_title` | TEXT | §4.1 edit_academic_weights.js |
| `academic_challenge_rank` | INTEGER | §4.1 edit_academic_weights.js |
| `academic_challenge_weight` | TEXT (Label-Value) | §4.1 edit_academic_weights.js |
| `responses` | TEXT (JSON Blob) | §4.2 edit_insert_response_*.js + §5.1 edit_response.js |
| `blogposts` | TEXT (JSON Blob) | §5.3 edit_blogpost.js |
| `news_sources` | TEXT (Label-Value) | §5.3 edit_news_sources.js |
| `news_items` | TEXT (JSON Blob) | §5.3 edit_news_snippet.js |
| `users` | TEXT (JSON Blob) | System-managed (SPA routing — not manually edited) |
| `page_views` | INTEGER | System-managed (auto-incremented — not manually edited) |

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.

### 2.1 Backend for Master Data Index (`list_all_records.js`)
**Corresponds to Public Section:** Non-specific (Global Data Access / Backend Index)  
**Purpose:** A high-level paginated list of all entries in the `records` table. Displays only the minimum fields needed to identify and navigate to a record. All full-field editing is done in §2.2.

**DB Fields (read-only display):**
```
title             TEXT        — row label
primary_verse     JSON Array  — verse reference column
```
*All other columns are fetched only when a record is opened in the editor (§2.2).*

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  ALL DATABASE RECORDS              [+ New Record]|
|                       |  [ Search by title or primary_verse...      ]   |
|-----------------------|-------------------------------------------------|
|  > Records [Active]   |  READ: title · primary_verse                    |
|  - View All           |-------------------------------------------------|
|                       |  title                        primary_verse      |
|                       |-------------------------------------------------|
|                       |  Jesus is Baptized            Mark 1:9-11        |
|                       |                               [Edit]  [Delete]   |
|                       |-------------------------------------------------|
|                       |  Crucifixion of Jesus         Matt 27:32-56      |
|                       |                               [Edit]  [Delete]   |
|                       |-------------------------------------------------|
|                       |  Sermon on the Mount          Matt 5:1-7:29      |
|                       |                               [Edit]  [Delete]   |
|                       |-------------------------------------------------|
|                       |  Destruction of the Temple    Mark 13:1-2        |
|                       |                               [Edit]  [Delete]   |
|                       |-------------------------------------------------|
|                       |  [ Load More Records... ]                        |
+-------------------------------------------------------------------------+
```

---

### 2.2 Backend for Single Record Layout (`edit_record.js`, `edit_picture.js`, `edit_links.js`)
**Corresponds to Public Section:** 2.2 Single Record Deep-Dive  
**Purpose:** Dense, scrollable data-entry form for one row in the `records` table. Organised into eight labelled sections covering every column owned by this editor. Fields belonging to other dashboard sections are intentionally absent.

**DB Fields (read + write, grouped by form section):**

```
── CORE IDENTIFIERS ──────────────────────────────────────────────────────
id                TEXT (ULID)        — displayed read-only; auto-generated on create
title             TEXT               — free text input
slug              TEXT               — free text input (url-safe)
created_at        TEXT (ISO8601)     — auto-set on first save
updated_at        TEXT (ISO8601)     — auto-updated on every save

── PICTURE  [sub-module: edit_picture.js] ────────────────────────────────
picture_name      TEXT               — filename of the uploaded PNG
picture_bytes     BLOB               — resized PNG (max 800 px, ≤ 250 KB)
picture_thumbnail BLOB               — thumbnail derivative (max 200 px)

── TAXONOMY & DIAGRAMS ───────────────────────────────────────────────────
era               TEXT (Enum)        — 8 options: PreIncarnation → Post-Passion
timeline          TEXT (Enum)        — 38 options: PreIncarnation → ReturnOfJesus
map_label         TEXT (Enum)        — 6 options: Overview, Empire, Levant,
                                       Judea, Galilee, Jerusalem
gospel_category   TEXT (Enum)        — 5 options: event, location, person,
                                       theme, object
geo_id            INTEGER            — numeric geographic node identifier
parent_id         TEXT               — FK to another record (recursive);
                                       also managed visually in §3.1

── VERSES ────────────────────────────────────────────────────────────────
primary_verse     TEXT (JSON Array)  — e.g. [{"book":"Matthew","chapter":5,"verse":1}]
secondary_verse   TEXT (JSON Array)  — same structure as primary_verse

── TEXT CONTENT ──────────────────────────────────────────────────────────
description       TEXT (JSON Array)  — paragraphs as JSON array of strings
snippet           TEXT (JSON Array)  — short summary paragraphs, same structure

── BIBLIOGRAPHY ──────────────────────────────────────────────────────────
bibliography      TEXT (JSON Blob)   — serialised object with six MLA sub-keys:
                                       mla_book, mla_book_inline,
                                       mla_article, mla_article_inline,
                                       mla_website, mla_website_inline

── RELATIONS & LINKS  [sub-module: edit_links.js] ────────────────────────
context_links     TEXT (JSON Blob)   — internal/external link associations

── MISCELLANEOUS ─────────────────────────────────────────────────────────
metadata_json     TEXT (JSON Blob)   — general-purpose metadata blob
iaa               TEXT               — Internal Attestation Assessment value
pledius           TEXT               — Pledius classification value
manuscript        TEXT               — manuscript tradition reference
url               TEXT (JSON Blob)   — canonical and external URL references

── NOT EXPOSED HERE (managed in other sections) ──────────────────────────
ordo_salutis        → §5.1 edit_essay.js
context_essays      → §5.1 edit_essay.js
theological_essays  → §5.1 edit_essay.js
spiritual_articles  → §5.1 edit_essay.js
wikipedia_*         → §4.1 edit_wiki_weights.js
popular_*           → §4.1 edit_popular_weights.js
academic_*          → §4.1 edit_academic_weights.js
responses           → §4.2 / §5.1
blogposts           → §5.3 edit_blogpost.js
news_sources        → §5.3 edit_news_sources.js
news_items          → §5.3 edit_news_snippet.js
users               → system-managed
page_views          → system-managed
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  CREATE NEW  /  EDIT RECORD: [slug / id]        |
|                       |  [Save Changes]  [Discard]  [Delete]  [View Live]|
|-----------------------|-------------------------------------------------|
|  > Records            |  ── CORE IDENTIFIERS ──────────────────────────  |
|  - Create New         |  id:           [auto-generated ULID — read only] |
|  - Edit [Active]      |  title:        [_______________________________] |
|                       |  slug:         [_______________________________] |
|                       |  created_at:   [auto]    updated_at:   [auto]   |
|                       |-------------------------------------------------|
|                       |  ── PICTURE  (edit_picture.js) ────────────────  |
|                       |  picture_name:      [current-filename.png     ]  |
|                       |  picture_bytes:     [Choose PNG...]  [Upload]    |
|                       |  picture_thumbnail: [auto-derived on upload   ]  |
|                       |  Status: [ Ready  /  Uploading...  /  Saved ✓ ] |
|                       |-------------------------------------------------|
|                       |  ── TAXONOMY & DIAGRAMS ───────────────────────  |
|                       |  era:             [Dropdown — 8 values      ▼]  |
|                       |  timeline:        [Dropdown — 38 values     ▼]  |
|                       |  map_label:       [Dropdown — 6 values      ▼]  |
|                       |  gospel_category: [Dropdown — 5 values      ▼]  |
|                       |  geo_id:          [___________]                  |
|                       |  parent_id:       [____________________________] |
|                       |-------------------------------------------------|
|                       |  ── VERSES ────────────────────────────────────  |
|                       |  primary_verse: (JSON array)                     |
|                       |    Book [▼]  Ch [___]  Vs [___]   [+ Add Verse] |
|                       |    [Matthew · 5 · 1 ×]  [Genesis · 1 · 1 ×]    |
|                       |  secondary_verse: (JSON array)                   |
|                       |    Book [▼]  Ch [___]  Vs [___]   [+ Add Verse] |
|                       |-------------------------------------------------|
|                       |  ── TEXT CONTENT ──────────────────────────────  |
|                       |  description: (JSON paragraph array)             |
|                       |    [¶ Paragraph 1 text...               ] [×]   |
|                       |    [¶ Paragraph 2 text...               ] [×]   |
|                       |    [+ Add Paragraph]                             |
|                       |  snippet: (JSON paragraph array)                 |
|                       |    [¶ Paragraph 1 text...               ] [×]   |
|                       |    [+ Add Paragraph]                             |
|                       |-------------------------------------------------|
|                       |  ── BIBLIOGRAPHY ──────────────────────────────  |
|                       |  bibliography → (JSON blob — 6 MLA sub-keys)     |
|                       |  mla_book:           [textarea               ]   |
|                       |  mla_book_inline:    [textarea               ]   |
|                       |  mla_article:        [textarea               ]   |
|                       |  mla_article_inline: [textarea               ]   |
|                       |  mla_website:        [textarea               ]   |
|                       |  mla_website_inline: [textarea               ]   |
|                       |-------------------------------------------------|
|                       |  ── RELATIONS & LINKS  (edit_links.js) ────────  |
|                       |  context_links: (JSON blob)                      |
|                       |    [Context_Essay_Crucifixion · Context  ×]      |
|                       |    [External_URL_Josephus    · External  ×]      |
|                       |    [+ Add Link]                                  |
|                       |-------------------------------------------------|
|                       |  ── MISCELLANEOUS ─────────────────────────────  |
|                       |  metadata_json: [textarea — JSON blob        ]   |
|                       |  iaa:           [____________________________]   |
|                       |  pledius:       [____________________________]   |
|                       |  manuscript:    [____________________________]   |
|                       |  url:           [textarea — JSON blob        ]   |
|                       |-------------------------------------------------|
|                       |  [Save Changes]  [Discard]  [Delete]  [View Live]|
+-------------------------------------------------------------------------+
```

---

### 2.3 & 2.4 Backend for Ordinary Lists (`edit_lists.js`)
**Corresponds to Public Sections:** 2.3, 2.4 (Resource Lists, Verses)  
**Purpose:** A streamlined interface for curating manually ordered resource lists and groupings. Supports **bulk adding** of items via a slug list (CSV or newline) and allows removing and reordering. Reads `title` and `slug` from records for display only — no `records` columns are mutated here.

**DB Fields:**
```
── READ ONLY (for display) ───────────────────────────────────────────────
title             TEXT   — shown as the list item label
slug              TEXT   — used to identify and add records to the list

── NO WRITES TO `records` TABLE ──────────────────────────────────────────
List membership and ordering is managed in a separate list-ordering
structure keyed by list name. No record columns are mutated.
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT ORDINARY LIST: [Old Testament Verses]     |
|                       |  [Save List]                                     |
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |  READ: title · slug (display only)               |
|  - Edit Lists [Active]|  NO writes to records table                      |
|                       |-------------------------------------------------|
|  ...                  |  [ Search records to add by title or slug... ]   |
|                       |                                                  |
|                       |  Bulk Add by Slugs (CSV or newline):             |
|                       |  [ slug-1, slug-2, slug-3...              ] [Add]|
|                       |-------------------------------------------------|
|                       |  =  Isaiah 53              slug: isaiah-53       |
|                       |                                        [Remove]  |
|                       |  =  Psalm 22               slug: psalm-22        |
|                       |                                        [Remove]  |
|                       |  =  Zechariah 12           slug: zechariah-12    |
|                       |                                        [Remove]  |
|                       |-------------------------------------------------|
|                       |  (Drag '=' handle to reorder items)              |
+-------------------------------------------------------------------------+
```

---

### 2.5 Backend for Bulk Upload CSV (`edit_bulk_upload.js`)
**Corresponds to Public Section:** Non-specific (Global Data Ingestion)  
**Purpose:** Drag-and-drop CSV interface to bulk-create multiple records simultaneously. Runs client-side validation on required fields and enum values before submitting. On success, inserts one new row per CSV line.

**DB Fields:**
```
── REQUIRED (validated before insert) ────────────────────────────────────
title             TEXT               — must be present
slug              TEXT               — must be present and unique

── OPTIONAL (validated if present) ───────────────────────────────────────
era               TEXT (Enum)        — validated against 8 allowed values
timeline          TEXT (Enum)        — validated against 38 allowed values
map_label         TEXT (Enum)        — validated against 6 allowed values
gospel_category   TEXT (Enum)        — validated against 5 allowed values
primary_verse     TEXT (JSON)        — validated as parseable JSON array
[any other valid column name from the records table]

── AUTO-GENERATED ON INSERT ──────────────────────────────────────────────
id                TEXT (UUID)
created_at        TEXT (ISO8601)
updated_at        TEXT (ISO8601)
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  BULK UPLOAD CSV — Data Ingestion               |
|                       |  Required cols: title · slug                     |
|-----------------------|-------------------------------------------------|
|  > Records            |  Optional cols: era · timeline · map_label ·     |
|  - Create New         |    gospel_category · primary_verse · [any col]   |
|  - Edit Existing      |  Auto-generated:  id · created_at · updated_at   |
|  - Bulk Upload [Act]  |-------------------------------------------------|
|                       |                                                  |
|  > Lists & Ranks      |  +--------------------------------------------+ |
|  ...                  |  |                                            | |
|                       |  |        DRAG & DROP CSV FILE HERE          | |
|                       |  |            OR  [Browse File...]           | |
|                       |  |                                            | |
|                       |  +--------------------------------------------+ |
|                       |                                                  |
|                       |  Validation Results:                             |
|                       |  [ Row 2: missing slug — skipped             ]   |
|                       |  [ Row 5: invalid era value — skipped        ]   |
|                       |  [ 8 of 10 rows valid — ready to insert      ]   |
|                       |                                    [Start Upload]|
+-------------------------------------------------------------------------+
```

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Backend for Visual Interactive Displays (`edit_diagram.js`)
**Corresponds to Public Section:** 3.1 (Evidence Graph / Ardor Diagrams)  
*(Note: Maps (3.3) and Timelines (3.2) are driven by `era`, `timeline`, and `map_label` set in §2.2 — they have no separate editor.)*  
**Purpose:** Visual drag-and-drop tool for building the recursive parent-child 'Ardor' tree. The only column written is `parent_id`; `id` and `title` are read for node rendering.

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
parent_id         TEXT (Foreign Key)  — sets the recursive parent-child
                                        relationship between records;
                                        also editable as a plain text input
                                        in §2.2 edit_record.js

── READ ONLY (node display) ──────────────────────────────────────────────
id                TEXT               — node identifier
title             TEXT               — node label
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT DIAGRAM HIERARCHY                          |
|                       |  [Save Graph]                                    |
|-----------------------|-------------------------------------------------|
|  > Configuration      |  WRITE: parent_id                                |
|  - Edit Diagrams [Act]|  READ:  id · title (node display only)           |
|                       |-------------------------------------------------|
|                       |  [ Search records to add as nodes... ]           |
|                       |                                                  |
|                       |       [ ROOT: Jesus of Nazareth ]                |
|                       |          parent_id: null                         |
|                       |           |               |                      |
|                       |  [ Ministry           ]  [ Crucifixion       ]   |
|                       |  parent_id: jesus-root   parent_id: jesus-root   |
|                       |       |                        |                 |
|                       |  [+ Add Child]           [+ Add Child]           |
|                       |  [Select Parent]         [Select Parent]         |
|                       |  [Remove Node]           [Remove Node]           |
|                       |                                                  |
|                       |  (Drag nodes to reassign parent_id)              |
+-------------------------------------------------------------------------+
```

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists, Ranked historical challenges.

### 4.1 Backend for Ranked Lists Weights (`edit_wiki_weights.js`, `edit_academic_weights.js`, `edit_popular_weights.js`, `edit_rank.js`)
**Corresponds to Public Sections:** 4.1 (Ranked Views)  
**Purpose:** Tabular interface for adjusting ranking multipliers across three ranked-list types (Wikipedia, Popular Challenges, Academic Challenges). Each tab manages its own set of four columns on the `records` row.

**DB Fields:**
```
── Wikipedia tab  (edit_wiki_weights.js) ─────────────────────────────────
wikipedia_link    TEXT (JSON Blob)    — source link data
wikipedia_title   TEXT               — article title
wikipedia_rank    INTEGER            — rank position
wikipedia_weight  TEXT (Label-Value) — multiplier for rank algorithm

── Popular Challenges tab  (edit_popular_weights.js) ─────────────────────
popular_challenge_link    TEXT (JSON Blob)
popular_challenge_title   TEXT
popular_challenge_rank    INTEGER
popular_challenge_weight  TEXT (Label-Value)

── Academic Challenges tab  (edit_academic_weights.js) ───────────────────
academic_challenge_link   TEXT (JSON Blob)
academic_challenge_title  TEXT
academic_challenge_rank   INTEGER
academic_challenge_weight TEXT (Label-Value)
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT RANKED LISTS                               |
|                       |  [Wikipedia] [Popular Challenges] [Academic]     |
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |  ── WIKIPEDIA TAB ─────────────────────────────  |
|  - Edit Weights [Act] |  WRITE: wikipedia_link · wikipedia_title ·       |
|  - Insert Resp.       |         wikipedia_rank · wikipedia_weight         |
|                       |  [Save All Changes]                              |
|  ...                  |-------------------------------------------------|
|                       |  slug / title          rank    weight (mult.)    |
|                       |-------------------------------------------------|
|                       |  tacitus-annals         98     [× 1.20 ]  [Save]|
|                       |  wikipedia_title: [Tacitus Annals           ]    |
|                       |  wikipedia_link:  [{"url": "https://..."   }]    |
|                       |-------------------------------------------------|
|                       |  josephus-antiquities   95     [× 1.15 ]  [Save]|
|                       |  wikipedia_title: [Josephus Antiquities     ]    |
|                       |  wikipedia_link:  [{"url": "https://..."   }]    |
|                       |-------------------------------------------------|
|                       |  [+ Add Custom Override]            [Delete Row] |
+-------------------------------------------------------------------------+
```

---

### 4.2 Backend for Inserting Responses (`edit_insert_response_academic.js`, `edit_insert_response_popular.js`)
**Corresponds to Public Sections:** 4.2 (Standard Lists with Response Inserted)  
**Purpose:** Browse challenge lists and link a written response to a specific challenge record. The `responses` JSON blob on the record is updated here to point to a response; the response content itself is authored in §5.1.

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
responses         TEXT (JSON Blob)   — links this record to one or more
                                        response records; content is
                                        authored in §5.1 edit_response.js

── READ ONLY (list display) ──────────────────────────────────────────────
academic_challenge_title  TEXT       — challenge label (Academic tab)
academic_challenge_rank   INTEGER    — sort order
popular_challenge_title   TEXT       — challenge label (Popular tab)
popular_challenge_rank    INTEGER    — sort order
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  INSERT RESPONSES                                |
|                       |  [Academic Challenges]  [Popular Challenges]     |
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |  WRITE: responses                                |
|  - Edit Weights       |  READ:  *_challenge_title · *_challenge_rank     |
|  - Insert Resp. [Act] |-------------------------------------------------|
|                       |  [ Search challenge list... ]                    |
|                       |-------------------------------------------------|
|                       |  1. historicity-of-miracles                      |
|                       |     responses: [none]           [+ Add Response] |
|                       |-------------------------------------------------|
|                       |  2. council-of-nicaea-claims                     |
|                       |     responses: [none]           [+ Add Response] |
|                       |-------------------------------------------------|
|                       |  3. jesus-myth-theory                            |
|                       |     responses: [response-001]   [Remove] [Edit]  |
|                       |-------------------------------------------------|
|                       |  (+ Add Response opens the Full Response         |
|                       |   Editor in §5.1)                                |
+-------------------------------------------------------------------------+
```

---

## 5.0 Essays Module
**Scope:** Context-Essay (Thematic context), Historiography, Blog/News, Responses.

### 5.1 & 5.2 Backend for Response & Essay Layouts (`edit_response.js`, `edit_essay.js`, `edit_historiography.js`)
**Corresponds to Public Sections:** 5.1 & 5.2 (Long-form Essays, Responses), 5.0 (Context Essays, Historiography)  
**Purpose:** Split-pane markdown editor for authoring responses and essays. Also owns the four theological association fields on the `records` row: `ordo_salutis`, `context_essays`, `theological_essays`, and `spiritual_articles`.

**DB Fields:**
```
── Written by edit_essay.js / edit_historiography.js ─────────────────────
context_essays      TEXT (JSON Array)  — slugs of context essays linked
                                         to this record
theological_essays  TEXT (JSON Array)  — slugs of theological essays linked
spiritual_articles  TEXT (JSON Array)  — slugs of spiritual articles linked
ordo_salutis        TEXT (Enum)        — order-of-salvation classification
                                         8 values: Predestination,
                                         Regeneration, Faith, Repentance,
                                         Justification, Sanctification,
                                         Perseverance, Glorification

── Written by edit_response.js ───────────────────────────────────────────
responses           TEXT (JSON Blob)   — full response content + metadata
                                         (also linked from §4.2)
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT RESPONSE / ESSAY: [title]                  |
|                       |  [Save Changes]  [Discard]  [Delete]             |
|-----------------------|-------------------------------------------------|
|  > Text Content       |  WRITE: ordo_salutis · context_essays ·          |
|  - Responses [Active] |         theological_essays · spiritual_articles · |
|  - Essays             |         responses                                 |
|                       |-------------------------------------------------|
|                       |  Metadata:                  |  Live Preview       |
|                       |  Author:  [______________]  |  (updates as you    |
|                       |  Date:    [______________]  |   type)             |
|                       |                             |                     |
|                       |  ordo_salutis:              |  [Essay Title]      |
|                       |  [Dropdown — 8 values ▼]   |  By [Author]        |
|                       |                             |                     |
|                       |  context_essays:            |  ## Introduction    |
|                       |  [slug-essay-1 ×]           |  The historical...  |
|                       |  [+ Link Essay]             |                     |
|                       |                             |                     |
|                       |  theological_essays:        |                     |
|                       |  [slug-theology-1 ×]        |                     |
|                       |  [+ Link Theological Essay] |                     |
|                       |                             |                     |
|                       |  spiritual_articles:        |                     |
|                       |  [slug-article-1 ×]         |                     |
|                       |  [+ Link Spiritual Article] |                     |
|                       |-----------------------------|                     |
|                       |  responses (Markdown body): |                     |
|                       |  [## Introduction           |                     |
|                       |   The historical context of |                     |
|                       |   **Judea**...              ]                     |
|                       |  [+ Insert Citation]                              |
+-------------------------------------------------------------------------+
```

---

### 5.3 Backend for News Snippets & Blog Posts (`edit_news_snippet.js`, `edit_blogpost.js`, `edit_news_sources.js`)
**Corresponds to Public Sections:** 1.3, 5.3 (News Feed Snippets, News Feed/Blog)  
**Purpose:** Short-form entry interface for creating news alerts, blog snippets, and managing named news sources. Each tab writes to its own JSON blob or label-value column on the record.

**DB Fields:**
```
── edit_blogpost.js ──────────────────────────────────────────────────────
blogposts         TEXT (JSON Blob)     — blog post content and metadata

── edit_news_snippet.js ──────────────────────────────────────────────────
news_items        TEXT (JSON Blob)     — news snippet content and metadata

── edit_news_sources.js ──────────────────────────────────────────────────
news_sources      TEXT (Label-Value)   — named external source references
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT NEWS / BLOG                                |
|                       |  [News Snippet]  [Blog Post]  [News Sources]     |
|-----------------------|-------------------------------------------------|
|  > Text Content       |  ── NEWS SNIPPET TAB ──────────────────────────  |
|  - Essays             |  WRITE: news_items                               |
|  - News [Active]      |  [Save Item]  [Discard]  [Delete Item]           |
|  - Blog               |-------------------------------------------------|
|                       |  news_items → (JSON blob)                        |
|                       |  Publish Date:  [____________________]           |
|                       |  Headline:      [____________________________]   |
|                       |  Snippet body:  [WYSIWYG / Markdown editor  ]   |
|                       |                 [                            ]   |
|                       |  External link: [____________________________]   |
|                       |-------------------------------------------------|
|                       |  ── BLOG POST TAB ─────────────────────────────  |
|                       |  WRITE: blogposts                                |
|                       |  [Save Post]  [Discard]  [Delete Post]           |
|                       |  blogposts → (JSON blob)                         |
|                       |  Publish Date:  [____________________]           |
|                       |  Title:         [____________________________]   |
|                       |  Body:          [WYSIWYG / Markdown editor  ]   |
|                       |-------------------------------------------------|
|                       |  ── NEWS SOURCES TAB ──────────────────────────  |
|                       |  WRITE: news_sources                             |
|                       |  [Save Sources]                                  |
|                       |  news_sources → (Label-Value pairs)              |
|                       |  Label: [___________]  URL: [_______________]    |
|                       |  [Reuters · https://reuters.com  ×]              |
|                       |  [AP News  · https://apnews.com  ×]              |
|                       |  [+ Add Source]                                  |
+-------------------------------------------------------------------------+
```

---

## 6.0 System Module
**Scope:** Initial setup, Agent instructions, backend API management, and VPS deployment.

### 6.1 Global: Secure Login & Main Interface
**Purpose:** Entry point providing the secure login screen and the persistent structural shell (Sidebar + Dynamic Canvas). No record columns are written here.

**DB Fields:**
```
── NO WRITES TO `records` TABLE ──────────────────────────────────────────
System-managed fields (never manually edited in any dashboard section):
  users             TEXT (JSON Blob)  — SPA routing access control
                                        (Admin / Public); set programmatically
  page_views        INTEGER           — auto-incremented on public page load;
                                        read-only across all admin views
```

```text
+-------------------------------------------------------------------------+
| [ Dashboard App: Authenticated as Admin ]                  [Logout]     |
|-------------------------------------------------------------------------|
|                      |                                                   |
|  [ Admin Modules ]   |   [ DASHBOARD HOME / STATUS ]                    |
|                      |                                                   |
|  > Records           |   +------------------------------------------+   |
|  - Create New        |   | System Status: ● Online                  |   |
|  - Edit Existing     |   | WASM SQLite Sync: Active                 |   |
|  - Bulk Upload CSV   |   | users: system-managed  (not editable)    |   |
|                      |   | page_views: auto-incremented (read-only) |   |
|  > Lists & Ranks     |   +------------------------------------------+   |
|  - Edit Weights      |                                                   |
|  - Edit Resources    |   +------------------------------------------+   |
|  - Insert Responses  |   | Recent Edits / Activity Log              |   |
|                      |   | - Updated Record: "Crucifixion"          |   |
|  > Text Content      |   | - Modified Wiki Weight: ×1.20            |   |
|  - Essays            |   | - Added Essay: "Historiography Overview" |   |
|  - Responses         |   +------------------------------------------+   |
|  - Blog Posts        |                                                   |
|                      |   [ Quick Actions ]                               |
|  > Configuration     |   [Add New Record]     [Run Sync Pipeline]        |
|  - Edit Diagrams     |                                                   |
|  - News Sources      |                                                   |
|                      |                                                   |
|  [ Return to Site ]  |                                                   |
+-------------------------------------------------------------------------+
```
