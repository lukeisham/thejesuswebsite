---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens, mapped to front-end components and database fields (source of truth)
version: 1.5.0
dependencies: [guide_appearance.md, detailed_module_sitemap.md, data_schema.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Portal (`admin.html`). Unlike the public pages, the portal operates primarily as a Single Page Application (SPA) driven by `dashboard_app.js`.

The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

Each section includes a **DB Fields** block listing the exact column names from `data_schema.md` that are read or written by that dashboard view. This is the authoritative reference for which part of the `records` table each editor owns.

---

## 0.1 Layout Convention — Providence 3-Column Pattern (Dashboard Shell)

**Purpose:** Defines the editor layout shell inherited by every dashboard editor module. This is the shared architectural frame — a 3-column Providence-style grid with a section tab bar — that all editor modules render inside. Each editor module applies `.providence-editor-grid` to inherit this shell. The shell provides structure; each module fills it with fields, controls, and data.

All dashboard wireframes in this document follow the **CollectiveAccess Providence** layout convention: a form-heavy, cataloguer-first aesthetic inspired by the open-source museum backend used by the Getty, SFMOMA, and university archives. The design is light, restrained, and built for editors working across many fields per object.

The shell layout is as follows:

```
+------------------------------------------------------------------+
| [ Tab: Section A ] [ Tab: Section B (active) ] [ Tab: Section C ]|  ← TOP BAR
|------------------------------------------------------------------|
| COL 1 (narrow)    | COL 2 (medium, optional) | COL 3 (widest)    |
|                   |                          |                   |
| Section-specific  | Sub-fields, secondary    | Data being edited |
| buttons & fields  | controls, metadata       | or viewed         |
| unique to this    | inputs tied to the       | (editor canvas,   |
| active tab        | active record/item       |  list, or form)   |
|                   |                          |                   |
+------------------------------------------------------------------+
```

**Column rules:**
- **Top bar** — tabs navigate between major sections of the module; the active tab is marked `[Active]`
- **Column 1** — action buttons (Save, Discard, Delete) and the primary field or control unique to this section = `.providence-editor-col-actions`
- **Column 2** — optional; used when a section has sub-fields, secondary metadata, or a filter/search control that warrants separation from the canvas = `.providence-editor-col-list`
- **Column 3** — always the widest; contains the main data entry surface (form fields, tables, tree views, editors, or live previews) = `.providence-editor-col-editor`

> **CSS implementation:** The grid pattern above is implemented as the `.providence-editor-grid` CSS class in `dashboard_admin.css`. Editor modules that want the 3-column layout apply this class to their container, with child columns using `.providence-editor-col-actions`, `.providence-editor-col-list`, and `.providence-editor-col-editor`. The Blog Editor (see §6.2) uses `.blog-editor-grid` as a backward-compatible alias.
>
> **Tab bar rendering:** The top-level section tab bar shown in every wireframe is rendered by `render_tab_bar.js` (`admin/frontend/render_tab_bar.js`), which exposes `window.renderTabBar(containerId, tabs, activeName)` as a shared utility. Each editor module calls this function after loading its data, passing the section tabs relevant to its module. The Blog Editor was the first adopter and still calls `renderTabBar` directly; all other editors adopted this pattern during the T1–T18 refactor.
>
> **Child modules bypass the grid:** `edit_picture.js` and `edit_links.js` do not apply `.providence-editor-grid`. Instead, they inject their content directly into designated containers within `edit_record.js`'s existing grid columns. These are not standalone editors — they are sub-components of the single-record layout (§2.2).

---

## 0.2 Field Ownership Map

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
| `popular_challenge_link` | TEXT (JSON Blob) | §4.2 edit_popular_weights.js |
| `popular_challenge_title` | TEXT | §4.2 edit_popular_weights.js |
| `popular_challenge_rank` | INTEGER | §4.2 edit_popular_weights.js |
| `popular_challenge_weight` | TEXT (Label-Value) | §4.2 edit_popular_weights.js |
| `academic_challenge_link` | TEXT (JSON Blob) | §4.2 edit_academic_weights.js |
| `academic_challenge_title` | TEXT | §4.2 edit_academic_weights.js |
| `academic_challenge_rank` | INTEGER | §4.2 edit_academic_weights.js |
| `academic_challenge_weight` | TEXT (Label-Value) | §4.2 edit_academic_weights.js |
| `responses` | TEXT (JSON Blob) | §4.3 edit_insert_response_*.js + §5.2 edit_response.js |
| `blogposts` | TEXT (JSON Blob) | §6.2 edit_blogpost.js |
| `news_sources` | TEXT (Label-Value) | §6.1 edit_news_sources.js |
| `news_items` | TEXT (JSON Blob) | §6.1 edit_news_snippet.js |
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
+----------------------------------------------------------------------------------------------+
| [ Records (Active) ]  [ Lists & Ranks ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                     | COL 3 — ALL DATABASE RECORDS            |
|                        |                           |                                          |
| [+ New Record]         | Records Overview          |  READ: title · primary_verse            |
| [Bulk Upload CSV]      | (12 total records)        |  [ Search by title or primary_verse...] |
|                        |                           |------------------------------------------|
| > View All (Active)    | Reserved for future       |  title               primary_verse      |
|                        | metadata use (1)          |------------------------------------------|
|                        |                           |  Jesus is Baptized    Mark 1:9-11       |
|                        |                           |                     [Edit]   [Delete]   |
|                        |                           |------------------------------------------|
|                        |                           |  Crucifixion of Jesus Matt 27:32-56     |
|                        |                           |                     [Edit]   [Delete]   |
|                        |                           |------------------------------------------|
|                        |                           |  Sermon on the Mount  Matt 5:1-7:29     |
|                        |                           |                     [Edit]   [Delete]   |
|                        |                           |------------------------------------------|
|                        |                           |  Destruction of the Temple Mark 13:1-2  |
|                        |                           |                     [Edit]   [Delete]   |
|                        |                           |------------------------------------------|
|                        |                           |  [ Load More Records... ]               |
+----------------------------------------------------------------------------------------------+

> **(1)** COL 2 in the Records List view is reserved for future metadata use. It currently displays the total record count and a heading placeholder, but no interactive controls. This column will gain filtering, bulk-selection, or summary widgets in a future iteration.
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
popular_*           → §4.2 edit_popular_weights.js
academic_*          → §4.2 edit_academic_weights.js
responses           → §4.3 / §5.2
blogposts           → §6.2 edit_blogpost.js
news_sources        → §6.1 edit_news_sources.js
news_items          → §6.1 edit_news_snippet.js
users               → system-managed
page_views          → system-managed
```

```text
+------------------------------------------------------------------------------------------------------------+
| [ Records (Active) ]  [ Lists & Ranks ]  [ Text Content ]  [ Configuration ]                              |
|------------------------------------------------------------------------------------------------------------|
| [ Core ]  [ Picture ]  [ Taxonomy ]  [ Verses ]  [ Text ]  [ Bibliography ]  [ Links ]  [ Misc ] (active) |
|------------------------------------------------------------------------------------------------------------|
| COL 1                      | COL 2                          | COL 3 — EDIT RECORD: [slug / id]             |
|                            |                                |                                              |
| [Save Changes]             | ── CORE IDENTIFIERS ─────────  | id:      [auto-generated ULID — read only]   |
| [Discard]                  | id · title · slug             | title:   [__________________________________] |
| [Delete]                   | created_at · updated_at       | slug:    [__________________________________] |
| [View Live]                |                                | created_at: [auto]   updated_at: [auto]      |
|                            |--------------------------------|----------------------------------------------|
| > Create New               | ── PICTURE ─────────────────  | picture_name:      [current-filename.png   ] |
| > Edit (Active)            | edit_picture.js               | picture_bytes:     [Choose PNG...]  [Upload] |
|                            | picture_name                  | picture_thumbnail: [auto-derived on upload ] |
|                            | picture_bytes                 | Status: [ Ready / Uploading... / Saved ✓ ]  |
|                            | picture_thumbnail             |                                              |
|                            |--------------------------------|----------------------------------------------|
|                            | ── TAXONOMY & DIAGRAMS ──────  | era:             [Dropdown — 8 values     ▼] |
|                            | era · timeline · map_label    | timeline:        [Dropdown — 38 values    ▼] |
|                            | gospel_category · geo_id      | map_label:       [Dropdown — 6 values     ▼] |
|                            | parent_id                     | gospel_category: [Dropdown — 5 values     ▼] |
|                            |                                | geo_id:          [___________]               |
|                            |                                | parent_id:       [__________________________] |
|                            |--------------------------------|----------------------------------------------|
|                            | ── VERSES ──────────────────  | primary_verse: (JSON array)                  |
|                            | primary_verse                 |   Book [▼]  Ch [___]  Vs [___] [+ Add Verse] |
|                            | secondary_verse               |   [Matthew · 5 · 1 ×]  [Genesis · 1 · 1 ×]  |
|                            |                                | secondary_verse: (JSON array)                |
|                            |                                |   Book [▼]  Ch [___]  Vs [___] [+ Add Verse] |
|                            |--------------------------------|----------------------------------------------|
|                            | ── TEXT CONTENT ────────────  | description: (JSON paragraph array)          |
|                            | description                   |   [¶ Paragraph 1 text...            ] [×]    |
|                            | snippet                       |   [¶ Paragraph 2 text...            ] [×]    |
|                            |                                |   [+ Add Paragraph]                          |
|                            |                                | snippet: (JSON paragraph array)              |
|                            |                                |   [¶ Paragraph 1 text...            ] [×]    |
|                            |                                |   [+ Add Paragraph]                          |
|                            |--------------------------------|----------------------------------------------|
|                            | ── BIBLIOGRAPHY ────────────  | mla_book:           [textarea            ]   |
|                            | bibliography (JSON blob)      | mla_book_inline:    [textarea            ]   |
|                            | 6 MLA sub-keys:               | mla_article:        [textarea            ]   |
|                            | mla_book                      | mla_article_inline: [textarea            ]   |
|                            | mla_book_inline               | mla_website:        [textarea            ]   |
|                            | mla_article                   | mla_website_inline: [textarea            ]   |
|                            | mla_article_inline            |                                              |
|                            | mla_website                   |                                              |
|                            | mla_website_inline            |                                              |
|                            |--------------------------------|----------------------------------------------|
|                            | ── LINKS ───────────────────  | context_links: (JSON blob)                   |
|                            | edit_links.js                 |   [Context_Essay_Crucifixion · Context  ×]   |
|                            | context_links                 |   [External_URL_Josephus    · External  ×]   |
|                            |                                |   [+ Add Link]                               |
|                            |--------------------------------|----------------------------------------------|
|                            | ── MISCELLANEOUS ───────────  | metadata_json: [textarea — JSON blob     ]   |
|                            | metadata_json · iaa           | iaa:           [__________________________]  |
|                            | pledius · manuscript · url    | pledius:       [__________________________]  |
|                            |                                | manuscript:    [__________________________]  |
|                            |                                | url:           [textarea — JSON blob     ]   |
+------------------------------------------------------------------------------------------------------------+
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
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks (Active) ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                       | COL 3 — EDIT LIST: [Old Testament Verses] |
|                        |                             |                                           |
| [Save List]            | READ: title · slug          | [ Search records to add by title or slug ] |
|                        | (display only)              |                                           |
| > Edit Lists (Active)  | NO writes to records table  | Bulk Add by Slugs (CSV or newline):       |
| > Edit Weights         |                             | [ slug-1, slug-2, slug-3...     ]  [Add]  |
| > Insert Responses     |                             |-------------------------------------------|
|                        |                             | =  Isaiah 53        slug: isaiah-53       |
|                        |                             |                              [Remove]     |
|                        |                             | =  Psalm 22         slug: psalm-22        |
|                        |                             |                              [Remove]     |
|                        |                             | =  Zechariah 12     slug: zechariah-12    |
|                        |                             |                              [Remove]     |
|                        |                             |-------------------------------------------|
|                        |                             | (Drag '=' handle to reorder items)        |
+----------------------------------------------------------------------------------------------+
```

---

### Backend for Bulk Upload CSV (`edit_bulk_upload.js`)
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
+----------------------------------------------------------------------------------------------+
| [ Records (Active) ]  [ Lists & Ranks ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — BULK UPLOAD CSV            |
|                        |                                |                                    |
| > Create New           | Required cols:                 | +--------------------------------+ |
| > Edit Existing        |   title · slug                 | |                                | |
| > Bulk Upload (Active) |                                | |  DRAG & DROP CSV FILE HERE     | |
|                        | Optional cols:                 | |    OR  [Browse File...]        | |
|                        |   era · timeline · map_label   | |                                | |
|                        |   gospel_category              | +--------------------------------+ |
|                        |   primary_verse · [any col]    |                                    |
|                        |                                | Validation Results:                |
|                        | Auto-generated on insert:      | [ Row 2: missing slug — skipped  ] |
|                        |   id · created_at · updated_at | [ Row 5: invalid era — skipped   ] |
|                        |                                | [ 8 of 10 rows valid — ready     ] |
|                        |                                |                    [Start Upload] |
+----------------------------------------------------------------------------------------------+
```

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Backend for Visual Interactive Displays (`edit_diagram.js`)
**Corresponds to Public Section:** 3.1 (Evidence Graph / Ardor Diagrams)  
*(Note: Maps (3.3) and Timelines (3.2) are driven by `era`, `timeline`, and `map_label` set in §2.2 — they have no separate editor.)*  
**Purpose:** API-driven drag-and-drop tool for building the recursive parent-child 'Ardor' tree. Fetches node data from `GET /api/admin/diagram/tree`, persists changes via `PUT /api/admin/diagram/tree`. The only column written is `parent_id`; `id` and `title` are read for node display.

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
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks ]  [ Text Content ]  [ Configuration (Active) ]                |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                       | COL 3 — EDIT DIAGRAM HIERARCHY        |
|                        |                             |                                        |
| [Save Graph]           | WRITE: parent_id            | [ Search nodes…                      ] |
|                        | READ:  id · title           |                                        |
| > Edit Diagrams        |                             | [Root: Jesus of Nazareth]              |
|   (Active)             | Orphan nodes                |  ├─ [Ministry]     [+Child]  [Remove]  |
|                        | (no parent_id):             |  ├─ [Crucifixion]  [+Child]  [Remove]  |
|                        |                             |  └─ [Resurrection] [+Child]  [Remove]  |
|                        | [Ascension         ▼]       |                                        |
|                        | [Last Supper       ▼]       | (Drag nodes to re-parent)              |
|                        | [Transfiguration   ▼]       |                                        |
+----------------------------------------------------------------------------------------------+

── API ROUND-TRIP: edit_diagram.js → admin_api.py → SQLite ───────────────────────────────────

  LOAD:  GET /api/admin/diagram/tree
         → SELECT id, title, parent_id FROM records ORDER BY title
         → Returns {"nodes": [{"id":"…","title":"…","parent_id":…}]}

  EDIT:  DnD updates window.__diagramNodes in memory
         Changes tracked in window.__changedNodes Map
         Search filters .diagram-node-label text (case-insensitive)
         "+Child" dropdown of orphan nodes sets parent_id
         "Remove" promotes node to root (parent_id = null)

  SAVE:  PUT /api/admin/diagram/tree
         Body: {"updates": [{"id":"…","parent_id":"…"},…]}
         → Validates IDs exist (422 if missing)
         → Detects direct circular refs (422 if found)
         → BEGIN TRANSACTION / UPDATE batch / COMMIT or ROLLBACK
         → Green toast: "Graph saved successfully"
         → Red toast:   "Save failed: <detail>"
```

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).

### 4.1 Backend for Wikipedia Weights (`edit_wiki_weights.js`, `edit_rank.js`)
**Corresponds to Public Sections:** 4.1 (Ranked Wikipedia Views)  
**Purpose:** Tabular interface for adjusting ranking multipliers for Wikipedia articles. Manages the four Wikipedia columns on the `records` row. The `dashboard_app.js` router (`ranks-wikipedia` branch) renders a single-pane editor directly into the canvas.

**DB Fields:**
```
── edit_wiki_weights.js ──────────────────────────────────────────────────
wikipedia_link    TEXT (JSON Blob)    — source link data
wikipedia_title   TEXT               — article title
wikipedia_rank    INTEGER            — rank position
wikipedia_weight  TEXT (Label-Value) — multiplier for rank algorithm
```

```text
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks (Active) ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — WIKIPEDIA WEIGHTS          |
|                        |                                |                                    |
| [Save All Changes]     | WRITE:                         | slug / title       rank  weight    |
| [+ Add Override]       |   wikipedia_link               |------------------------------------|
| [Delete Row]           |   wikipedia_title              | tacitus-annals      98   [× 1.20 ] |
|                        |   wikipedia_rank               |   title: [Tacitus Annals        ]  |
| > Wikipedia Weights    |   wikipedia_weight             |   link:  [{"url":"https://…"  } ]  |
|   (Active)             |                                |                          [Save]    |
| > Challenge Weights    |                                |------------------------------------|
| > Insert Responses     |                                | josephus-antiquities 95  [× 1.15 ] |
|                        |                                |   title: [Josephus Antiquities  ]  |
|                        |                                |   link:  [{"url":"https://…"  } ]  |
|                        |                                |                          [Save]    |
|                        |                                |------------------------------------|
|                        |                                | (rows continue…)                   |
+----------------------------------------------------------------------------------------------+
```

---

### 4.2 Backend for Challenge Weights (`edit_academic_weights.js`, `edit_popular_weights.js`)
**Corresponds to Public Sections:** 4.2 (Ranked Challenge Views)  
**Purpose:** Tabular interface for adjusting ranking multipliers across the two challenge types (Academic Challenges, Popular Challenges). Each tab manages its own set of four columns on the `records` row. The `dashboard_app.js` router (`ranks-challenges` branch) injects a 2-tab container (Academic / Popular) into the canvas, loading the Academic editor immediately and lazy-loading Popular on first click.

**DB Fields:**
```
── Academic Challenges tab  (edit_academic_weights.js) ───────────────────
academic_challenge_link   TEXT (JSON Blob)
academic_challenge_title  TEXT
academic_challenge_rank   INTEGER
academic_challenge_weight TEXT (Label-Value)

── Popular Challenges tab  (edit_popular_weights.js) ─────────────────────
popular_challenge_link    TEXT (JSON Blob)
popular_challenge_title   TEXT
popular_challenge_rank    INTEGER
popular_challenge_weight  TEXT (Label-Value)
```

```text
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks (Active) ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| [ Academic Challenges (Active) ]  [ Popular Challenges ]                                     |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — CHALLENGE WEIGHTS          |
|                        |                                |                                    |
| [Save All Changes]     | Academic tab WRITE:            | slug / title       rank  weight    |
| [+ Add Override]       |   academic_challenge_link      |------------------------------------|
| [Delete Row]           |   academic_challenge_title     | jesus-myth-theory   91   [× 1.30 ] |
|                        |   academic_challenge_rank      |   title: [Jesus Myth Theory     ]  |
| > Wikipedia Weights    |   academic_challenge_weight    |   link:  [{"url":"https://…"  } ]  |
| > Challenge Weights    |                                |                          [Save]    |
|   (Active)             | Popular tab WRITE:             |------------------------------------|
| > Insert Responses     |   popular_challenge_link       | council-of-nicaea   87   [× 1.10 ] |
|                        |   popular_challenge_title      |   title: [Council of Nicaea     ]  |
|                        |   popular_challenge_rank       |   link:  [{"url":"https://…"  } ]  |
|                        |   popular_challenge_weight     |                          [Save]    |
|                        |                                |------------------------------------|
|                        |                                | (rows continue…)                   |
+----------------------------------------------------------------------------------------------+
```

---

### Backend for Inserting Responses (`edit_insert_response_academic.js`, `edit_insert_response_popular.js`)
**Corresponds to Public Sections:** 4.2 (Challenge Views with Response Inserted)  
**Purpose:** Browse challenge lists and link a written response to a specific challenge record. The `responses` JSON blob on the record is updated here to point to a response; the response content itself is authored in §5.2. The `dashboard_app.js` router (`ranks-responses` branch) injects a 2-tab container (Academic Challenges / Popular Challenges) into the canvas, loading the active editor and lazy-loading the other on first click.

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
responses         TEXT (JSON Blob)   — links this record to one or more
                                        response records; content is
                                        authored in §5.2 edit_response.js

── READ ONLY (list display) ──────────────────────────────────────────────
academic_challenge_title  TEXT       — challenge label (Academic tab)
academic_challenge_rank   INTEGER    — sort order
popular_challenge_title   TEXT       — challenge label (Popular tab)
popular_challenge_rank    INTEGER    — sort order
```

```text
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks (Active) ]  [ Text Content ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| [ Academic Challenges (Active) ]  [ Popular Challenges ]                                     |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                     | COL 3 — INSERT RESPONSES                |
|                        | (reserved)                | Academic Challenges                      |
| > Wikipedia Weights    |                           | WRITE: responses                         |
| > Challenge Weights    |                           | READ:  academic_challenge_title          |
| > Insert Responses     |                           |        academic_challenge_rank           |
|   (Active)             |                           |                                          |
|                        |                           | [ Search challenge list...          ]    |
|                        |                           |------------------------------------------|
|                        |                           | 1. historicity-of-miracles               |
|                        |                           |    responses: [none]   [+ Add Response]  |
|                        |                           |------------------------------------------|
|                        |                           | 2. council-of-nicaea-claims              |
|                        |                           |    responses: [none]   [+ Add Response]  |
|                        |                           |------------------------------------------|
|                        |                           | 3. jesus-myth-theory                     |
|                        |                           |    responses: [response-001]             |
|                        |                           |               [Remove]         [Edit]   |
|                        |                           |------------------------------------------|
|                        |                           | (+ Add Response opens §5.2 editor)       |
+----------------------------------------------------------------------------------------------+
```

---

## 5.0 Essays & Responses Module
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1 Backend for Essay & Historiography Layouts (`edit_essay.js`, `edit_historiography.js`, `edit_mla_sources.js`)
**Corresponds to Public Sections:** 5.1 (Context Essay & Historiography Layouts)  
**Purpose:** Split-pane markdown editor for authoring context essays and the historiography essay. Also owns the four theological association fields on the `records` row: `ordo_salutis`, `context_essays`, `theological_essays`, and `spiritual_articles`. The `dashboard_app.js` router (`text-essays` branch) injects a 2-tab container (Context Essay / Historiography) into the canvas.

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
```

```text
+------------------------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks ]  [ Text Content (Active) ]  [ Configuration ]                              |
|------------------------------------------------------------------------------------------------------------|
| [ Context Essays (Active) ]  [ Historiography ]                                                            |
|------------------------------------------------------------------------------------------------------------|
| COL 1                      | COL 2 — MARKDOWN EDITOR         | COL 3 — LIVE PREVIEW                       |
|                            |                                  |                                            |
| [Save Changes]             | context_essays (Markdown body):  | [Essay Title]                              |
| [Discard]                  | [## Introduction                 | By [Author]                                |
| [Delete]                   |  The historical context of       |                                            |
|                            |  **Judea**...               ]    | ## Introduction                            |
| > Essays (Active)          | [+ Insert Citation]              | The historical context of                  |
| > Responses                |                                  | Judea…                                     |
|                            |                                  |                                            |
|                            |                                  | (updates as you type)                      |
| ── Metadata ─────────────  |                                  |                                            |
| Author: [______________]   |                                  |                                            |
| Date:   [______________]   |                                  |                                            |
|                            |                                  |                                            |
| ordo_salutis:              |                                  |                                            |
| [Dropdown — 8 values    ▼] |                                  |                                            |
|                            |                                  |                                            |
| context_essays:            |                                  |                                            |
| [slug-essay-1 ×]           |                                  |                                            |
| [+ Link Essay]             |                                  |                                            |
|                            |                                  |                                            |
| theological_essays:        |                                  |                                            |
| [slug-theology-1 ×]        |                                  |                                            |
| [+ Link Theological Essay] |                                  |                                            |
|                            |                                  |                                            |
| spiritual_articles:        |                                  |                                            |
| [slug-article-1 ×]         |                                  |                                            |
| [+ Link Spiritual Article] |                                  |                                            |
+------------------------------------------------------------------------------------------------------------+
```

---

### 5.2 Backend for Challenge Response Layout (`edit_response.js`)
**Corresponds to Public Sections:** 5.2 (Challenge Response Layouts)  
**Purpose:** Split-pane markdown editor for authoring challenge responses. The `dashboard_app.js` router (`text-responses` branch) renders a single-pane editor directly into the canvas. Response records are linked to challenge records via §4.3 Insert Responses.

**DB Fields:**
```
── Written by edit_response.js ───────────────────────────────────────────
responses           TEXT (JSON Blob)   — full response content + metadata
                                         (also linked from §4.3)
```

```text
+------------------------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks ]  [ Text Content (Active) ]  [ Configuration ]                              |
|------------------------------------------------------------------------------------------------------------|
| COL 1                      | COL 2 — MARKDOWN EDITOR         | COL 3 — LIVE PREVIEW                       |
|                            |                                  |                                            |
| [Save Changes]             | responses (Markdown body):       | [Response Title]                           |
|                            | [## Introduction                 | By [Author]                                |
| ── Metadata ─────────────  |  The historical claim that       |                                            |
| Author: [______________]   |  **Jesus** never existed...  ]   | ## Introduction                            |
| Date:   [______________]   |                                  | The historical claim that                  |
| Challenge: [___________]   |                                  | Jesus never existed…                       |
|                            |                                  |                                            |
| ── Insert Tools ─────────  |                                  | (updates as you type)                      |
| [+ Insert Citation]        |                                  |                                            |
| [+ Insert Record Link]     |                                  |                                            |
+------------------------------------------------------------------------------------------------------------+
```

---

## 6.0 News & Blog Module
**Scope:** News Articles & Sources, Blog Posts.

### 6.1 Backend for News Articles & Sources (`edit_news_snippet.js`, `edit_news_sources.js`)
**Corresponds to Public Sections:** 6.1 (Combined News & Blog Landing Page), 6.2 (News Feed Page)  
**Purpose:** Short-form entry interface for creating news alert snippets and managing named external news sources. The two tabs each write to their own column on the record.

**DB Fields:**
```
── edit_news_snippet.js ──────────────────────────────────────────────────
news_items        TEXT (JSON Blob)     — news snippet content and metadata

── edit_news_sources.js ──────────────────────────────────────────────────
news_sources      TEXT (Label-Value)   — named external source references
```

```text
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks ]  [ Text Content (Active) ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| [ News Snippet (Active) ]  [ News Sources ]                                                 |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — NEWS SNIPPET               |
|                        |                                |                                    |
| [Save Item]            | WRITE: news_items              | Publish Date: [__________________] |
| [Discard]              | news_items → (JSON blob)       | Headline:     [__________________] |
| [Delete Item]          |                                | Snippet body:                      |
|                        | News Sources tab WRITE:        | [WYSIWYG / Markdown editor       ] |
| > Essays               | news_sources                   | [                                ] |
| > Responses            | → (Label-Value pairs)          | External link:[__________________] |
| > News (Active)        |                                |                                    |
+----------------------------------------------------------------------------------------------+
| [ News Snippet ]  [ News Sources (Active) ]                                                 |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — NEWS SOURCES               |
|                        |                                |                                    |
| [Save Sources]         | WRITE: news_sources            | Label: [__________] URL: [_______] |
|                        | → (Label-Value pairs)          | [Reuters · https://reuters.com  ×] |
|                        |                                | [AP News  · https://apnews.com  ×] |
|                        |                                | [+ Add Source]                     |
+----------------------------------------------------------------------------------------------+
```
*Sidebar: The "News Sources" link (`config-news`, under Configuration) routes directly to the News Sources tab pane.*

---

### 6.2 Backend for Blog Posts (`edit_blogpost.js`)
**Corresponds to Public Section:** 6.3 (Blog Feed Page)  
**Purpose:** Full CRUD interface for authoring, editing, and deleting blog posts. Writes to the `blogposts` JSON blob on the record.

**DB Fields:**
```
── edit_blogpost.js ──────────────────────────────────────────────────────
blogposts         TEXT (JSON Blob)     — blog post content and metadata
```

```text
+----------------------------------------------------------------------------------------------+
| [ Records ]  [ Lists & Ranks ]  [ Text Content (Active) ]  [ Configuration ]                |
|----------------------------------------------------------------------------------------------|
| [ Blog Posts (Active) ]                                                                     |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2                          | COL 3 — BLOG POST                  |
|                        |                                |                                    |
| [Save Post]            | WRITE: blogposts               | Publish Date: [__________________] |
| [Discard]              | blogposts → (JSON blob)        | Title:        [__________________] |
| [Delete Post]          | [ Existing posts:            ] | Author:       [__________________] |
| [+ New Post]           | "Jesus and History"            | Body:                              |
|                        |   2025-01-10  [Edit] [Delete]  | [WYSIWYG / Markdown editor       ] |
| > Essays               | "The Empty Tomb"               | [                                ] |
| > Responses            |   2024-12-03  [Edit] [Delete]  |                                    |
| > Blog Posts (Active)  |                                |                                    |
+----------------------------------------------------------------------------------------------+
```
*Sidebar: The "Blog Posts" link (`text-blog`) opens this editor directly.*

*Grid: The 3-column layout uses `.blog-editor-grid`, a backward-compatible alias of `.providence-editor-grid` (defined in `dashboard_admin.css`).*

---

## 7.0 System Module
**Scope:** Initial setup, Agent instructions, backend API management, and VPS deployment.

### 7.1 Global: Secure Login & Main Interface
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
+----------------------------------------------------------------------------------------------+
| [ Dashboard App: Authenticated as Admin ]                               [Logout]            |
|----------------------------------------------------------------------------------------------|
| [ Records ]  [ Lists & Ranks ]  [ Text Content ]  [ Configuration ]  [ Home (Active) ]      |
|----------------------------------------------------------------------------------------------|
| COL 1                  | COL 2 — SYSTEM STATUS              | COL 3 — DASHBOARD HOME         |
|                        |                                    |                                |
| > Records              | ● System Status: Online            | [ Quick Actions ]              |
|   - Create New         | ● WASM SQLite Sync: Active         | [Add New Record]               |
|   - Edit Existing      | users:      system-managed         | [Run Sync Pipeline]            |
|   - Bulk Upload CSV    | page_views: auto-incremented       |                                |
|                        |   (read-only across all views)     |                                |
| > Lists & Ranks        |                                    |                                |
|   - Edit Weights       |------------------------------------|                                |
|   - Edit Resources     | Recent Edits / Activity Log        |                                |
|   - Insert Responses   | - Updated: "Crucifixion"           |                                |
|                        | - Wiki Weight: ×1.20               |                                |
| > Text Content         | - Essay: "Historiography Overview" |                                |
|   - Essays             |                                    |                                |
|   - Responses          |                                    |                                |
|   - Blog Posts         |                                    |                                |
|                        |                                    |                                |
| > Configuration        |                                    |                                |
|   - Edit Diagrams      |                                    |                                |
|   - News Sources       |                                    |                                |
|                        |                                    |                                |
| [ Return to Site ]     |                                    |                                |
+----------------------------------------------------------------------------------------------+
```
