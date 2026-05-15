---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 2.0 Records Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, high_level_schema.md]
---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering, Bulk CSV ingestion.

### 2.1 Backend for Master Data Index (`dashboard_records_all.js`)
**Corresponds to Public Section:** Non-specific (Global Data Access / Backend Index)
**Purpose:** A high-density tabular interface for browsing and managing all records in the `records` table. Features a keyboard-driven search bar with real-time client-side filtering, toggle-based sorting (Creation Date, Unique ID, Primary Verse, Title, List Ordinary), endless scrolling, and an integrated bulk CSV upload workflow. Clicking a row opens the Single Record editor (§2.2).

**Plan:** `plan_dashboard_records_all.md`

**DB Fields (read-only display):**
```
title             TEXT        — row label
primary_verse     JSON Array  — verse reference column
snippet           JSON Array  — preview text column
status            TEXT        — Draft / Published indicator
```
*All other columns are fetched only when a record is opened in the editor (§2.2).*

```text
+===================================================================================================+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >                      |
+===================================================================================================+
| Toggle: [Creation Date] [Unique ID] [Primary Verse] [Title] [List Ord.] [Bulk]                   |
| Search: [__________________________________________________] (Cmd+K)  [✕ clear]                  |
+===================================================================================================+
|                                                                                                    |
|  ── DEFAULT VIEW (any toggle except "Bulk") ───────────────────────────────────────────────────   |
|                                                                                                    |
|  Title             | Primary Verse  | Snippet                      | Status                        |
|  ------------------+----------------+------------------------------+-------------------------------|
|  Jesus is born     | Luke 2:1-7     | In those days Caesar Aug...  | Published                     |
|  Sermon on Mount   | Matthew 5-7    | Seeing the crowds, he we...  | Published                     |
|  Draft Item 1      |                | Pending content...           | Draft                         |
|  ...               | ...            | ...                          | ...                           |
|                                                                                                    |
|  (Endless Scroll — clicking a row opens the Single Record editor)                                  |
|                                                                                                    |
+===================================================================================================+
|                                                                                                    |
|  ── BULK REVIEW VIEW (active when "Bulk" toggle selected) ────────────────────────────────────    |
|                                                                                                    |
|  ╔═══════════════════════════════════════════════════════════════════════════════════════════════╗ |
|  ║  Bulk Upload Review — 12 records parsed, 10 valid, 2 with errors    [Save as Draft] [Discard All] ║ |
|  ╠═══════════════════════════════════════════════════════════════════════════════════════════════╣ |
|  ║                                                                                               ║ |
|  ║  ☑ Row 1  | Jesus is born     | Luke 2:1-7     | Valid                                        ║ |
|  ║  ☑ Row 2  | Sermon on Mount   | Matthew 5-7    | Valid                                        ║ |
|  ║  ☐ Row 3  |                   |                | ✗ Missing title                              ║ |
|  ║  ☑ Row 4  | Baptism of Jesus  | Mark 1:9-11    | Valid                                        ║ |
|  ║  ☑ Row 5  | ...               | ...            | Valid                                        ║ |
|  ║  ...      |                   |                |                                              ║ |
|  ║                                                                                               ║ |
|  ╚═══════════════════════════════════════════════════════════════════════════════════════════════╝ |
|                                                                                                    |
|  ── After "Save as Draft" clicked:                                                                 |
|      • All checked valid rows are committed as permanent `draft` records                           |
|      • Records are merged into the main pool and appear under whatever toggle was previously active |
|      • The "Bulk" toggle resets and the ephemeral store is cleared                                 |
|                                                                                                    |
|  ── After "Discard All" clicked (or navigating away without saving):                               |
|      • All ephemeral records are discarded                                                         |
|      • The "Bulk" toggle resets and the default table view is restored                             |
|                                                                                                    |
+===================================================================================================+
| [ Status Bar: System running normally / Error logs appear here ]                                  |
+===================================================================================================+
```

> **Note:** This module does NOT use the Providence 2-column grid. It renders as a full-width flat layout within `#admin-canvas`, replacing the grid entirely for this module. The Bulk CSV workflow (previously a separate tab) is now integrated as the "Bulk" toggle within this view.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_records_all.html` | Tabular records management container |
| `css/2.0_records/dashboard/dashboard_records_all.css` | High-density table, sorting, bulk review panel |
| `js/2.0_records/dashboard/dashboard_records_all.js` | Module orchestration & view switching |
| `js/2.0_records/dashboard/data_populate_table.js` | API integration & row hydration |
| `js/2.0_records/dashboard/endless_scroll.js` | Intersection Observer for batch loading |
| `js/2.0_records/dashboard/table_toggle_display.js` | Sort/filter toggle logic |
| `js/2.0_records/dashboard/bulk_csv_upload_handler.js` | CSV parsing & client-side validation (Phase 1) |
| `js/2.0_records/dashboard/bulk_upload_review_handler.js` | Ephemeral review table & commit (Phase 2) |
| `js/2.0_records/dashboard/search_records.js` | Real-time client-side search |

---

### 2.2 Backend for Single Record Layout (`dashboard_records_single.js`)
**Corresponds to Public Section:** 2.2 Single Record Deep-Dive
**Purpose:** Dense, scrollable data-entry form for one row in the `records` table. Organised into seven labelled sections with a sticky section navigator bar at the top. Records are reached by clicking a row from the All Records list.

**Plan:** `plan_dashboard_records_single.md`

**DB Fields (read + write, grouped by form section):**

```
── CORE IDENTIFIERS ──────────────────────────────────────────────────────
id                TEXT (ULID)        — displayed read-only; auto-generated on create
type              TEXT (Enum)         — auto-set to 'record' on create; read-only
sub_type          TEXT                — NULL for record type; read-only
title             TEXT               — free text input
slug              TEXT               — free text input (url-safe)
created_at        TEXT (ISO8601)     — auto-set on first save
updated_at        TEXT (ISO8601)     — auto-updated on every save

── IMAGES  [shared tool: picture_handler.js] ─────────────────────────────
picture_name      TEXT               — filename of the uploaded PNG
picture_bytes     BLOB               — resized PNG (max 800 px, ≤ 250 KB)
picture_thumbnail BLOB               — thumbnail derivative (max 200 px)

── DESCRIPTION  [shared tools: description_editor.js, snippet_generator.js] ──
description       TEXT (JSON Array)  — paragraphs as JSON array of strings
snippet           TEXT (JSON Array)  — short summary paragraphs, same structure

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

── VERSES  [shared tool: verse_builder.js] ───────────────────────────────
primary_verse     TEXT (JSON Array)  — e.g. [{"book":"Matthew","chapter":5,"verse":1}]
secondary_verse   TEXT (JSON Array)  — same structure as primary_verse

── EXTERNAL REFERENCES ───────────────────────────────────────────────────
bibliography      TEXT (JSON Blob)   — serialised object with six MLA sub-keys
                    [shared tool: mla_source_handler.js]
context_links     TEXT (JSON Blob)   — internal/external link associations
                    [shared tool: context_link_handler.js]
historiography    TEXT (JSON Blob)   — historiographical analysis content
iaa               TEXT               — Internal Attestation Assessment value
pledius           TEXT               — Pledius classification value
manuscript        TEXT               — manuscript tradition reference
url               TEXT (JSON Blob)   — canonical and external URL references

── METADATA & STATUS  [shared tool: metadata_widget.js] ──────────────────
metadata_json     TEXT (JSON Blob)   — general-purpose metadata blob
status            TEXT               — Draft / Published toggle

── NOT EXPOSED HERE (managed in other sections) ──────────────────────────
body                → §5.1, §5.2, §6.2 (NULL on record type)
ordo_salutis        → §5.1 dashboard_essay_historiography.js
context_essays      → §5.1 dashboard_essay_historiography.js
theological_essays  → §5.1 dashboard_essay_historiography.js
spiritual_articles  → §5.1 dashboard_essay_historiography.js
wikipedia_*         → §4.1 wikipedia_sidebar_handler.js
popular_*           → §4.2 challenge_weighting_handler.js
academic_*          → §4.2 challenge_weighting_handler.js
responses           → §4.3 / §5.2
challenge_id        → §5.2 challenge_link_handler.js
blogposts           → §6.2 dashboard_blog_posts.js
news_sources        → §6.1 news_sources_handler.js
news_item_title     → §6.1 news_sources_handler.js
news_item_link      → §6.1 news_sources_handler.js
news_search_term    → §6.1 search_keywords_handler.js
last_crawled        → §6.1 launch_news_crawler.js
value               → §7.1 system_data rows
updated_by          → §7.1 system_data rows
trace_reasoning     → §7.1 system_data trace_reasoning rows
page_views          → system-managed
```

```text
+====================================================================================================+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >                      |
+====================================================================================================+
| Function Bar:              [ Save Draft ]   [ Publish ]   [ Delete ]                              |
+====================================================================================================+
|                                                                                                    |
|  ┌─ SECTION NAVIGATOR ─────────────────────────────────────────────────────────────────────────┐  |
|  │ [Core IDs] [Images] [Description] [Taxonomy] [Verses] [External Refs] [Metadata & Status]   │  |
|  └─────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  ═══════════════  CORE IDENTIFIERS  ════════════════════════════════════════════════════════════   |
|                                                                                                    |
|  Unique ID (ULID):   [___________________________________________]  (read-only)                    |
|  Title:              [___________________________________________]                                 |
|  Slug:               [___________________________________________]  [Auto-Generate from Title]      |
|                                                                                                    |
|  ═══════════════  IMAGES  ═══════════════════════════════════════════════════════════════════════  |
|                                                                                                    |
|  Picture Name:       [___________________________________________]                                 |
|                                                                                                    |
|  +-------------------------------------+  +-------------------------------------+                  |
|  |                                     |  |                                     |                  |
|  |          Image Preview              |  |         Thumbnail Preview           |                  |
|  |          (max 800px width)          |  |         (max 200px width)           |                  |
|  |                                     |  |                                     |                  |
|  +-------------------------------------+  +-------------------------------------+                  |
|  [ Upload Picture ]  (PNG only, ≤ 250 KB)                                                         |
|                                                                                                    |
|  ═══════════════  DESCRIPTION  ═══════════════════════════════════════════════════════════════════  |
|                                                                                                    |
|  Description:                                                                                      |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Paragraph 1: [_________________________________________________________________________]  │  |
|  │ Paragraph 2: [_________________________________________________________________________]  │  |
|  │ Paragraph 3: [_________________________________________________________________________]  │  |
|  │ Paragraph 4: [_________________________________________________________________________]  │  |
|  │ Paragraph 5: [_________________________________________________________________________]  │  |
|  │                                [ + Add Paragraph ]                                         │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  Snippet:                                                                                          |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Paragraph 1: [_________________________________________________________________________]  │  |
|  │ Paragraph 2: [_________________________________________________________________________]  │  |
|  │                                [ + Add Paragraph ]  [ Generate from Description ]          │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  ═══════════════  TAXONOMY  ════════════════════════════════════════════════════════════════════  |
|                                                                                                    |
|  Era:                [ PreIncarnation | OldTestament | EarlyLife | Life | GalileeMinistry |       |
|                        JudeanMinistry | PassionWeek | Post-Passion ▼ ]                             |
|                                                                                                    |
|  Timeline:           [ PreIncarnation | OldTestament | EarlyLifeUnborn | EarlyLifeBirth |         |
|                        EarlyLifeInfancy | EarlyLifeChildhood | LifeTradie | LifeBaptism |          |
|                        LifeTemptation | GalileeCallingTwelve | GalileeSermonMount |                |
|                        GalileeMiraclesSea | GalileeTransfiguration | JudeanOutsideJudea |          |
|                        JudeanMissionSeventy | JudeanTeachingTemple | JudeanRaisingLazarus |        |
|                        JudeanFinalJourney | PassionPalmSunday | PassionMondayCleansing |           |
|                        PassionTuesdayTeaching | PassionWednesdaySilent | PassionMaundyThursday |   |
|                        PassionMaundyLastSupper | PassionMaundyGethsemane | PassionMaundyBetrayal | |
|                        PassionFridaySanhedrin | PassionFridayCivilTrials |                        |
|                        PassionFridayCrucifixionBegins | PassionFridayDarkness |                   |
|                        PassionFridayDeath | PassionFridayBurial | PassionSaturdayWatch |           |
|                        PassionSundayResurrection | PostResurrectionAppearances | Ascension |        |
|                        OurResponse | ReturnOfJesus ▼ ]                                              |
|                                                                                                    |
|  Gospel Category:    [ event | location | person | theme | object ▼ ]                             |
|                                                                                                    |
|  Map Label:          [ Overview | Empire | Levant | Judea | Galilee | Jerusalem ▼ ]               |
|                                                                                                    |
|  Geo ID:             [____________________]  (64-bit integer)                                      |
|                                                                                                    |
|  ═══════════════  VERSES  ════════════════════════════════════════════════════════════════════════ |
|                                                                                                    |
|  Primary Verse:                                                                                    |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Book: [ Genesis ▼ ]  Chapter: [___]  Verse: [___]    [ + Add Verse Reference ]             │  |
|  │ ┌──────────────────────────────────────────────────────────────────────────────────────┐  │  |
|  │ │ Genesis 1:1  [×]  |  Mark 1:9-11  [×]  |  John 3:16  [×]                              │  │  |
|  │ └──────────────────────────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  Secondary Verse:                                                                                  |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Book: [ Genesis ▼ ]  Chapter: [___]  Verse: [___]    [ + Add Verse Reference ]             │  |
|  │ ┌──────────────────────────────────────────────────────────────────────────────────────┐  │  |
|  │ │ (verse chips appear here)                                                             │  │  |
|  │ └──────────────────────────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  ═══════════════  EXTERNAL REFERENCES  ════════════════════════════════════════════════════════   |
|                                                                                                    |
  Bibliography (MLA) — three per-type editable tables (Books, Articles, Websites) with inline Add/Remove buttons:
  ┌─ Books ───────────────────────────────────────────────────────────────────────────────────────────┐  
  │ Author | Title | Publisher | Year | Pages | [×]                  [ + Add Book ]                   │  
  ├─ Articles ───────────────────────────────────────────────────────────────────────────────────────┤  
  │ Author | Title | Journal | Volume | Year | Pages | [×]           [ + Add Article ]                │  
  ├─ Websites ───────────────────────────────────────────────────────────────────────────────────────┤  
  │ Author | Title | URL | Accessed Date | [×]                       [ + Add Website ]                │  
  └────────────────────────────────────────────────────────────────────────────────────────────────────┘  
                                                                                                    
  Context Links — editable table (Slug, Type, Remove columns) with inline add-row form:
  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  
  │ Slug                    | Type           |                                                  │  
  │ jesus-baptism           | record         | [×]    slug: [________] type: [rec|ess|blog▼] [+]│  
  └────────────────────────────────────────────────────────────────────────────────────────────┘  
                                                                                                    
  Unique Identifiers — editable two-column table (Identifier Type | Value):
  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  
  │ Identifier Type         | Value                                                            │  
  │ IAA Reference           | [__________________________________________________________]    │  
  │ Pledius Reference       | [__________________________________________________________]    │  
  │ Manuscript Reference    | [__________________________________________________________]    │  
  └────────────────────────────────────────────────────────────────────────────────────────────┘  
                                                                                                    
  Parent ID:          [___________________________________________]  (ULID of parent record)         
                                                                                                    
  URL:                                                                                              
  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  
  │ Label: [________________________]  URL: [____________________________________________]    │  
  │                                [ + Add URL ]                                                │  
  └────────────────────────────────────────────────────────────────────────────────────────────┘  
                                                                                                    
|  ═══════════════  METADATA & SEO  ═══════════════════════════════════════════════════════════════   |
|                                                                                                    |
|  URL Slug:       [ auto-generated-or-manual-slug               ] [GENERATE]                        |
|  Snippet:        [ 2-3 sentence scholarly summary...           ] [GENERATE]                        |
|                  [                                             ]                                   |
|  Keywords:       (jesus [x]) (history [x])                                                         |
|                  [ Add...                       ] [+] [GENERATE]                                   |
|                                                                                                    |
|  Created At:     [___________________________________________]  (ISO8601 — read-only)              |
|  Updated At:     [___________________________________________]  (ISO8601 — auto-set on save)       |
|                                                                                                    |
|  Status:         [ Draft ◉ ]  [ Published ○ ]             [GENERATE ALL]                             |
|                                                                                                    |
+====================================================================================================+
| [ Status Bar: System running normally / Error logs appear here ]                                   |
+====================================================================================================+
```

> **Note:** This module does NOT use the Providence 2-column grid. It renders as a full-width vertically stacked form layout within `#admin-canvas`. The section navigator bar is sticky at the top.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_records_single.html` | High-density record editor form |
| `css/2.0_records/dashboard/dashboard_records_single.css` | Multi-section form layout |
| `js/2.0_records/dashboard/dashboard_records_single.js` | Module orchestration |
| `js/2.0_records/dashboard/display_single_record_data.js` | Record fetching & form hydration |
| `js/2.0_records/dashboard/record_status_handler.js` | Save Draft, Publish & Delete |
| `js/2.0_records/dashboard/picture_handler.js` | 🔑 Shared tool: Image upload & preview |
| `js/2.0_records/dashboard/mla_source_handler.js` | 🔑 Shared tool: MLA bibliography |
| `js/2.0_records/dashboard/context_link_handler.js` | 🔑 Shared tool: Context links |
| `js/2.0_records/dashboard/snippet_generator.js` | 🔑 Shared tool: Snippet generation |
| `js/2.0_records/dashboard/metadata_widget.js` | 🔑 Shared tool: unified slug/snippet/metadata widget |
| `js/2.0_records/dashboard/description_editor.js` | 🔑 Shared tool: Paragraph array editor |
| `js/2.0_records/dashboard/taxonomy_selector.js` | era, timeline, gospel_category selectors |
| `js/2.0_records/dashboard/map_fields_handler.js` | map_label selector + geo_id input |
| `js/2.0_records/dashboard/verse_builder.js` | 🔑 Shared tool: Verse chip builder |
| `js/2.0_records/dashboard/parent_selector.js` | ULID input for parent_id |
| `js/2.0_records/dashboard/external_refs_handler.js` | iaa, pledius, manuscript inputs |
| `js/2.0_records/dashboard/url_array_editor.js` | Label/URL pair editor |

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
+-----------------------------------------------------------------------------------+
| [ The Jesuswebsite Dashboard ]              [Return to Site]  [Dashboard]  [Logout]|
|-----------------------------------------------------------------------------------|
| [ All Records ] [ Single Record ] [ ★ Ordinary Lists ] [ Arbor ] [ Wikipedia ]    |
| [ Challenge ] [ Responses ] [ Essay & Hist. ] [ Challenge Resp. ]                 |
| [ News & Sources ] [ Blog Posts ] [ System ]                                      |
|-----------------------------------------------------------------------------------|
| COL 1                  | COL 2                       | COL 3 — EDIT LIST: [Old Testament Verses] |
|                        |                             |                                           |
| [Save List]            | READ: title · slug          | [ Search records to add by title or slug ] |
|                        | (display only)              |                                           |
|                        | NO writes to records table  | Bulk Add by Slugs (CSV or newline):       |
|                        |                             | [ slug-1, slug-2, slug-3...     ]  [Add]  |
|                        |                             |-------------------------------------------|
|                        |                             | =  Isaiah 53        slug: isaiah-53       |
|                        |                             |                              [Remove]     |
|                        |                             | =  Psalm 22         slug: psalm-22        |
|                        |                             |                              [Remove]     |
|                        |                             | =  Zechariah 12     slug: zechariah-12    |
|                        |                             |                              [Remove]     |
|                        |                             |-------------------------------------------|
|                        |                             | (Drag '=' handle to reorder items)        |
+-----------------------------------------------------------------------------------+
```

---

### 2.4 Backend for Bulk Upload CSV (Integrated into §2.1)
**Corresponds to Public Section:** Non-specific (Global Data Ingestion)
**Purpose:** Bulk CSV upload is now integrated into the All Records view (§2.1) as the "Bulk" toggle. It uses a two-phase workflow: Phase 1 parses and validates the CSV client-side into an ephemeral preview store; Phase 2 presents a review table where the admin can deselect individual rows and must explicitly click "Save as Draft" to commit. Navigating away without saving discards all ephemeral records.

**DB Fields (written on commit):**
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
status            TEXT               — always "draft" on bulk insert
```

> See §2.1 for the Bulk Review View ASCII diagram.

---

