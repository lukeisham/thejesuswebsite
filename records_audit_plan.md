# Records Audit Plan
**Project:** The Jesus Website
**Architecture Reference:** `frontend/private/records_architecture.html`
**Plan file path:** `Developer/thejesuswebsite/records_audit_plan.md`

---

## Purpose

Audit every file mentioned in `records_architecture.html` and refactor or create code to exactly match the architecture specification. The architecture document is the single source of truth. If code exists but does not match the spec, refactor it. If a file does not exist yet, create it from scratch to match the spec.

---

## End Goal

A clean, empty audit — meaning every file in the key file list has been checked and the result is either:
- **PASS** — file exists and fully matches the architecture spec
- **REFACTORED** — file existed but was updated to match the spec
- **CREATED** — file did not exist and was built from scratch to match the spec

No file should have an open TODO or a mismatch with `records_architecture.html` when the audit is complete.

---

## Key File List

### Backend (Rust) — `app/app_ui/src/` or similar under `app/`

| File | What it must contain |
|------|----------------------|
| `record/record.rs` | `Record` struct (14 fields, SCHEMA_VERSION 1.1.0), `RecordGatekeeper` with `validate_name`, `validate_image_format`, `validate_description` |
| `jesus/type.rs` | `Classification` enum: `Event \| Location \| Person \| Theme` (PascalCase serde) |
| `jesus/timeline.rs` | `TimelineEra` enum: 8 variants, kebab-case serde (`pre-incarnation`, `birth-early-life`, `baptism-preparation`, `galilean-ministry`, `judean-ministry`, `passion-crucifixion`, `resurrection-ascension`, `theme`) |
| `jesus/map.rs` | `MapType` (`Galilee \| Jerusalem \| Judea \| Levant \| Rome \| Overview`), `InteractiveMap`, `MapPoint` structs |
| `jesus/content.rs` | `Content` and `ContentEntry` enums: `Miracle \| Parable \| Saying \| Sermon \| Other` (lowercase serde) |
| `dtos.rs` | `PublishRecordRequest` { name, description, category, primary_verse, timeline, map_data }, `DraftRecordRequest` { id?, name, type, region }, `TryFrom<PublishRecordRequest> for Record` |
| `api_records.rs` | All 8 handlers: `handle_publish_record`, `handle_update_record`, `handle_delete_record`, `handle_record_list`, `handle_record_search`, `handle_save_record_draft`, `handle_get_draft_records`, `handle_expand_verse` |
| `api_widgets.rs` | `handle_admin_populate`, `handle_admin_wipe_records` |
| `sqlite.rs` | `store_record`, `get_records`, `delete_record`, `wipe_records`, `save_record_draft`, `get_draft_records`, `delete_record_draft` |
| `chroma.rs` | `store_record`, `query_records`, `delete_record`, `wipe_records` — all targeting the "records" collection |
| `schema.sql` | `records` table (20 cols with CHECK constraints for category, era, map_label), `record_drafts` table (7 cols with matching CHECK constraints) |
| `router.rs` | All routes registered: GET/POST/PUT/DELETE for all record endpoints above |

### Frontend HTML

| File | What it must contain |
|------|----------------------|
| `frontend/records.html` | `#search-input`, `#search-btn`, `#record-grid`, `#record-feed`, `.record-view-tabs`, includes `record_card.js`, `record_feed.js`, `refresh_records.js`, `search_records.js`, `toggle_record_view.js`, `feed_controls.js`, `show_draft_record.js` |
| `frontend/private/dashboard.html` | CRUD editor form with all fields (name, description, category, primary_verse, timeline era, event_name, region, lat, lng), includes `edit_records.js`, `wgt_records_viewer.js` |
| `frontend/evidence.html` | Ardor tree nodes with `data-node` attributes, includes `js/ardor_tree.js` |
| `frontend/timeline.html` | 8 era period sections with `data-period` attributes, includes `js/shuffle_left.js`, `js/shuffle_right.js`, `js/zoom.js` |
| `frontend/maps/maps.html` | Hub page with links to 5 regional map pages |
| `frontend/maps/galilee/galilee.html` | Map with `data-loc` attributes, includes `js/map_zoom.js` |
| `frontend/maps/jerusalem/jerusalem.html` | Map with `data-loc` attributes, includes `js/map_zoom.js` |
| `frontend/maps/judea/judea.html` | Map with `data-loc` attributes, includes `js/map_zoom.js` |
| `frontend/maps/levant/levant.html` | Map with `data-loc` attributes, includes `js/map_zoom.js` |
| `frontend/maps/rome/rome.html` | Map with `data-loc` attributes, includes `js/map_zoom.js` |
| `frontend/context.html` | `#hero-placeholder` element, includes `js/context_hero.js` |
| `frontend/challenge_academic.html` | `#hero-placeholder` element, includes `js/challenge_academic_hero.js` |
| `frontend/_footer.html` | `#btn-toggle-links` button present |
| `frontend/list_miracles.html` | `<ul class="record-list">` with standardised `<li>` items for miracles |
| `frontend/list_events.html` | `<ul class="record-list">` with standardised `<li>` items for events |
| `frontend/list_people.html` | `<ul class="record-list">` with standardised `<li>` items for people |
| `frontend/list_places.html` | `<ul class="record-list">` with standardised `<li>` items for places (uses "places" parse strategy) |
| `frontend/list_ot_verses.html` | `<ul class="record-list">` with standardised `<li>` items for OT verses (uses "ot_verses" parse strategy) |
| `frontend/list_objects.html` | `<ul class="record-list">` with standardised `<li>` items for objects |

### Frontend JS — Public (`frontend/js/`)

| File | What it must contain |
|------|----------------------|
| `js/record_card.js` | `window.createRecordCard(r)` → `<article class="record-card">` with all 14 fields rendered; `window.formatVerse(v)` → "Book Ch:Vs" string |
| `js/record_feed.js` | `window.createRecordFeedItem(r)` → compact feed item with thumbnail, title, 120-char snippet, era/category badges, appended to `#record-feed` |
| `js/refresh_records.js` | Self-executing — on page load: `GET /api/v1/records` → `json.data.records` → populates `#record-grid` and `#record-feed` |
| `js/search_records.js` | Self-executing — binds `#search-input` / `#search-btn` → `GET /api/v1/records?q=QUERY` → renders results into grid/feed |
| `js/toggle_record_view.js` | Self-executing — Grid ↔ Feed tab toggle, persists choice to `sessionStorage` |
| `js/feed_controls.js` | Self-executing — injects `#feed-controls`, sort dropdown (newest/oldest/A-Z/category), category filter chips via `MutationObserver` |
| `js/show_draft_record.js` | `refreshDraftRecords()` — `GET /api/v1/records/drafts` → appends orange-badged draft cards to grid |
| `js/ardor_tree.js` | Handles click on `data-node` Ardor tree elements → fetches records related to that topic → renders title + primary verse |
| `js/context_hero.js` | Self-executing — fetches essay HTML from `GET /api/v1/hero_content` → injects into `#hero-placeholder` |
| `js/challenge_academic_hero.js` | Self-executing — fetches challenge HTML from `GET /api/challenges?type=academic` → injects into `#hero-placeholder` |
| `js/footer_actions.js` | `toggleRecordLinks(event)` — `document.querySelectorAll('.record-link').forEach(link => link.classList.toggle('hidden'))` |
| `js/expand_verse.js` | Self-executing — finds `.primary-verse-display[data-verse]` elements → `GET /api/v1/expand_verse?q=VERSE` → injects ESV text |
| `js/shuffle_left.js` | Timeline era navigation — shuffle left through periods |
| `js/shuffle_right.js` | Timeline era navigation — shuffle right through periods |
| `js/zoom.js` | Timeline zoom handler for era detail view |

### Frontend JS — Map (`frontend/maps/*/js/`)

| File | What it must contain |
|------|----------------------|
| `maps/galilee/js/map_zoom.js` | Handles `data-loc` clicks → pans map → fetches records for that location via `GET /api/v1/records` filtered by MapType |
| `maps/jerusalem/js/map_zoom.js` | Same as above for Jerusalem region |
| `maps/judea/js/map_zoom.js` | Same as above for Judea region |
| `maps/levant/js/map_zoom.js` | Same as above for Levant region |
| `maps/rome/js/map_zoom.js` | Same as above for Rome region |

### Frontend JS — Admin (`frontend/private/js/`)

| File | What it must contain |
|------|----------------------|
| `private/js/edit_records.js` | `loadRecords()`, `renderList(records)`, `populateForm(r)`, `clearForm()`, `getPublishPayload()`, `publishOrUpdate()`, `deleteRecord(id)`, `window.editRecordInCRUD(r)` |
| `private/js/wgt_records_viewer.js` | `loadAndRender()`, `handleDelete()` (batch delete checked), `handleEdit()` (calls `window.editRecordInCRUD()`) |
| `private/js/widget_record_generator.js` | Auto-scraper — scrapes 6 resource HTML pages, extracts Bible refs via regex, bulk POSTs to `/api/v1/admin/populate` |

### Frontend JS — Widgets & Libraries

| File | What it must contain |
|------|----------------------|
| `js/widgets/wgt_db_populator.js` | `initDBPopulator()`, `handleDBPopulate()` (fetches 6 list pages in parallel, parses, POSTs bulk payload), `setStatus()` (traffic-light UI) |
| `js/lib/list_page_parser.js` | `parseListPage(html, sourceFile)` — dispatches to 3 strategies (standard / places / ot_verses); `parseItem(li, strategy, category)` |
| `js/lib/bible_ref_parser.js` | `parseBibleRef(refStr)` → `{ book, chapter, verse } \| null`; `normalizeBookName(raw)` (66 books + aliases); `splitMultipleRefs(str)`; `extractParentheticalRefs(text)` |

### Frontend CSS

| File | What it must contain |
|------|----------------------|
| `frontend/style.css` | `.record-card` (hover shadow + transform), all `.__header/__verse/__image/__desc/__sources/__meta/__timestamps/__keywords` subsections, `.record-feed-item` + all subsections, `.record-view-tabs`, `.record-search` + subclasses, `.feed-controls`, `.record-link` (hidden by default), `.record-list`, `.primary-verse-display`, `.hidden` utility class |

---

## How to Run Each Task (Instructions for GeminiFlash)

**Before starting ANY task:**
1. Read this entire plan file at `Developer/thejesuswebsite/records_audit_plan.md`
2. Read `Developer/thejesuswebsite/frontend/private/records_architecture.html` in full
3. Only then begin the task

**For each task:**
1. Check if the file exists at the path listed
2. If it exists: read it fully, compare every function/struct/method against the spec in this plan and the architecture HTML
3. If it does not exist: create it from scratch to exactly match the spec
4. If it exists but is missing or wrong: refactor it to match the spec
5. At the end of each task, write one line to `Developer/thejesuswebsite/records_audit_log.md`:
   - Format: `[PASS | REFACTORED | CREATED] path/to/file.ext — brief note`

---

## Bite-Sized Tasks (One File Per Task)

Work through these in order. Do NOT skip ahead. Complete one task fully before moving to the next.

---

### TASK 1 — `record/record.rs`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md` and then read `frontend/private/records_architecture.html`.

1. Locate `record/record.rs` inside `Developer/thejesuswebsite/app/` (search subdirectories if needed)
2. Check it contains the `Record` struct with exactly 14 fields and `SCHEMA_VERSION = "1.1.0"`
3. Check it contains `RecordGatekeeper` with these 3 methods:
   - `validate_name`: rejects names over 80 chars or empty
   - `validate_image_format`: checks PNG magic bytes
   - `validate_description`: rejects empty descriptions, rejects any line over 1000 chars
4. Check `Record::try_new(…)` returns `Result<Record, RecordError>` and calls the gatekeeper validators
5. Refactor or create to match. Log result to `records_audit_log.md`.

---

### TASK 2 — `jesus/type.rs`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `jesus/type.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains the `Classification` enum with exactly 4 variants: `Event`, `Location`, `Person`, `Theme`
3. Check serde derives use PascalCase (i.e., serializes as `"Event"`, `"Location"`, `"Person"`, `"Theme"`)
4. Refactor or create to match. Log result.

---

### TASK 3 — `jesus/timeline.rs`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `jesus/timeline.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains `TimelineEra` enum with exactly 8 variants, serialized in kebab-case:
   - `pre-incarnation`, `birth-early-life`, `baptism-preparation`, `galilean-ministry`, `judean-ministry`, `passion-crucifixion`, `resurrection-ascension`, `theme`
3. Refactor or create to match. Log result.

---

### TASK 4 — `jesus/map.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `jesus/map.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains `MapType` enum with 6 variants: `Galilee`, `Jerusalem`, `Judea`, `Levant`, `Rome`, `Overview`
3. Check it contains `InteractiveMap` and `MapPoint` structs
4. Refactor or create to match. Log result.

---

### TASK 5 — `jesus/content.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `jesus/content.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains `Content` and `ContentEntry` with 5 variants: `Miracle`, `Parable`, `Saying`, `Sermon`, `Other` — serialized as lowercase
3. Refactor or create to match. Log result.

---

### TASK 6 — `dtos.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `dtos.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains `PublishRecordRequest` with fields: `name`, `description`, `category`, `primary_verse`, `timeline` (with `era` and `event_name`), `map_data` (with `region`, `lat`, `lng`)
3. Check it contains `DraftRecordRequest` with fields: `id` (optional), `name`, `type`, `region`
4. Check it contains `TryFrom<PublishRecordRequest> for Record` — converts string category to `Classification` enum, string era to `TimelineEra` enum, string region to `MapType` enum, verse string to `BibleVerse` struct
5. Refactor or create to match. Log result.

---

### TASK 7 — `api_records.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `api_records.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains ALL of these handler functions:
   - `handle_publish_record` → POST `/api/v1/records/publish` → deserializes `PublishRecordRequest` → validates via `RecordGatekeeper` → stores in SQLite + ChromaDB
   - `handle_update_record` → PUT `/api/v1/records/:id` → upserts by ULID, sets `updated_at`
   - `handle_delete_record` → DELETE `/api/v1/records/:id` → removes from both SQLite and ChromaDB, returns 404 if not found
   - `handle_record_list` → GET `/api/v1/records` → calls `sqlite.rs: get_records()` → returns `ApiResponse<RecordListResponse>` with shape `{ status, message, data: { count, records: [...] } }`
   - `handle_record_search` → GET `/api/v1/records?q=` → semantic search via ChromaDB
   - `handle_save_record_draft` → POST `/api/v1/records/draft`
   - `handle_get_draft_records` → GET `/api/v1/records/drafts`
   - `handle_expand_verse` → GET `/api/v1/expand_verse?q=` → ESV Bible API proxy
3. Refactor or create to match. Log result.

---

### TASK 8 — `api_widgets.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `api_widgets.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains:
   - `handle_admin_populate` → POST `/api/v1/admin/populate` → calls `build_record_from_item()` for each item in bulk payload → stores each record
   - `handle_admin_wipe_records` → DELETE `/api/v1/admin/wipe-records` → wipes all records from SQLite and ChromaDB
3. Refactor or create to match. Log result.

---

### TASK 9 — `sqlite.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `sqlite.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains ALL of these functions:
   - `store_record(record)` → `INSERT OR REPLACE` into `records` table with 20 columns (12 flat scalars + 5 JSON blobs + picture BLOB + 2 timestamps)
   - `get_records()` → `SELECT` all 20 columns, deserializes JSON blobs back into Rust structs, returns `Vec<Record>`
   - `delete_record(id) → bool` → deletes by ULID, returns `true` if row existed
   - `wipe_records() → usize` → deletes all records, returns row count
   - `save_record_draft(draft)` → `INSERT OR REPLACE` into `record_drafts` table
   - `get_draft_records()` → selects payload, deserializes into `Vec<DraftRecordRequest>`
   - `delete_record_draft(id)` → deletes draft by id
3. Refactor or create to match. Log result.

---

### TASK 10 — `chroma.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `chroma.rs` inside `Developer/thejesuswebsite/app/`
2. Check it contains ALL of these functions:
   - `store_record(record)` → embeds full record JSON → upserts into ChromaDB `"records"` collection
   - `query_records(query)` → semantic search → returns `Vec<String>` (JSON strings)
   - `delete_record(id)` → removes single document by ULID
   - `wipe_records()` → deletes then recreates an empty `"records"` collection
3. Refactor or create to match. Log result.

---

### TASK 11 — `schema.sql`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `schema.sql` inside `Developer/thejesuswebsite/app/`
2. Check the `records` table has exactly 20 columns including:
   - 12 flat scalar columns
   - 5 JSON blob columns
   - 1 picture BLOB column
   - 2 timestamp columns
   - `CHECK` constraint on `category` allowing only: `Event`, `Location`, `Person`, `Theme`
   - `CHECK` constraint on `era` allowing all 8 era kebab-case values
   - `CHECK` constraint on `map_label` allowing all 6 region values
3. Check the `record_drafts` table has 7 columns with matching `CHECK` constraints for `type` and `region`
4. Refactor or create to match. Log result.

---

### TASK 12 — `router.rs` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `router.rs` inside `Developer/thejesuswebsite/app/`
2. Check ALL of these routes are registered:
   - `POST /api/v1/records/publish` → `handle_publish_record`
   - `PUT /api/v1/records/:id` → `handle_update_record`
   - `DELETE /api/v1/records/:id` → `handle_delete_record`
   - `GET /api/v1/records` → `handle_record_list` (also handles `?q=` for search via `handle_record_search`)
   - `POST /api/v1/records/draft` → `handle_save_record_draft`
   - `GET /api/v1/records/drafts` → `handle_get_draft_records`
   - `GET /api/v1/expand_verse` → `handle_expand_verse`
   - `POST /api/v1/admin/populate` → `handle_admin_populate`
   - `DELETE /api/v1/admin/wipe-records` → `handle_admin_wipe_records`
3. Refactor or create to match. Log result.

---

### TASK 13 — `frontend/records.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/records.html`
2. Check it contains:
   - `#search-input` and `#search-btn` elements
   - `#record-grid` element (3-col CSS grid)
   - `#record-feed` element (single column)
   - `.record-view-tabs` tab bar with Grid and Feed tabs
   - Script tags loading: `record_card.js`, `record_feed.js`, `refresh_records.js`, `search_records.js`, `toggle_record_view.js`, `feed_controls.js`, `show_draft_record.js`
   - Reads `?verse` and `?id` query params on load to highlight specific records
3. Refactor or create to match. Log result.

---

### TASK 14 — `frontend/private/dashboard.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/private/dashboard.html`
2. Check the CRUD editor form has input fields for: `name`, `description`, `category`, `primary_verse`, timeline `era`, timeline `event_name`, map `region`, map `lat`, map `lng`
3. Check it includes script tags for `edit_records.js` and `wgt_records_viewer.js`
4. Check a `#viewer-results-list` element exists for the viewer tab (checkbox rows for batch operations)
5. Refactor or create to match. Log result.

---

### TASK 15 — `frontend/evidence.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/evidence.html`
2. Check Ardor tree nodes have `data-node` attributes
3. Check script tag includes `js/ardor_tree.js`
4. Refactor or create to match. Log result.

---

### TASK 16 — `frontend/timeline.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/timeline.html`
2. Check it has 8 era period sections each with a `data-period` attribute matching the 8 `TimelineEra` kebab-case values
3. Check script tags include `js/shuffle_left.js`, `js/shuffle_right.js`, `js/zoom.js`
4. Refactor or create to match. Log result.

---

### TASK 17 — `frontend/maps/maps.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/maps/maps.html`
2. Check it contains links to all 5 regional map pages: galilee, jerusalem, judea, levant, rome
3. Refactor or create to match. Log result.

---

### TASK 18 — `frontend/maps/galilee/galilee.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate this file. Check it has location markers with `data-loc` attributes and includes `js/map_zoom.js`. Refactor or create to match. Log result.

---

### TASK 19 — `frontend/maps/jerusalem/jerusalem.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 18 but for Jerusalem. Check `data-loc` attributes and `js/map_zoom.js` include. Log result.

---

### TASK 20 — `frontend/maps/judea/judea.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 18 but for Judea. Check `data-loc` attributes and `js/map_zoom.js` include. Log result.

---

### TASK 21 — `frontend/maps/levant/levant.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 18 but for Levant. Check `data-loc` attributes and `js/map_zoom.js` include. Log result.

---

### TASK 22 — `frontend/maps/rome/rome.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 18 but for Rome. Check `data-loc` attributes and `js/map_zoom.js` include. Log result.

---

### TASK 23 — `frontend/context.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/context.html`
2. Check it has a `#hero-placeholder` element where dynamic essay content is injected
3. Check script tag includes `js/context_hero.js`
4. Refactor or create to match. Log result.

---

### TASK 24 — `frontend/challenge_academic.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate this file. Check it has `#hero-placeholder` and includes `js/challenge_academic_hero.js`. Refactor or create. Log result.

---

### TASK 25 — `frontend/_footer.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/_footer.html`
2. Check it contains a button with id `btn-toggle-links`
3. Refactor or create to match. Log result.

---

### TASK 26 — `frontend/list_miracles.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate this file. Check it has `<ul class="record-list">` with `<li>` items in the standard structure (title + Bible ref). Refactor or create. Log result.

---

### TASK 27 — `frontend/list_events.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 26 but for events. Check `<ul class="record-list">` with standard `<li>` structure. Log result.

---

### TASK 28 — `frontend/list_people.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 26 but for people. Check `<ul class="record-list">` with standard `<li>` structure. Log result.

---

### TASK 29 — `frontend/list_places.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate this file. Check it has `<ul class="record-list">` with `<li>` items in the **places** structure (used by the "places" parse strategy in `list_page_parser.js`). Refactor or create. Log result.

---

### TASK 30 — `frontend/list_ot_verses.html` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate this file. Check it has `<ul class="record-list">` with `<li>` items in the **ot_verses** structure (used by the "ot_verses" parse strategy in `list_page_parser.js`). Refactor or create. Log result.

---

### TASK 31 — `frontend/list_objects.html`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Same as Task 26 but for objects. Check `<ul class="record-list">` with standard `<li>` structure. Log result.

---

### TASK 32 — `frontend/js/record_card.js` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/record_card.js`
2. Check it exports `window.createRecordCard(r)` — builds and returns an `<article class="record-card">` element with ALL 14 record fields rendered (including header, verse, image, description, sources, meta, timestamps, keywords subsections)
3. Check it exports `window.formatVerse(v)` — takes `{ book, chapter, verse }` object and returns a formatted string like `"Mark 4:35"`
4. Refactor or create to match. Log result.

---

### TASK 33 — `frontend/js/record_feed.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/record_feed.js`
2. Check it exports `window.createRecordFeedItem(r)` — returns a compact feed item element with: thumbnail, title, 120-character snippet of description, era badge, category badge
3. Feed items must be appended to `#record-feed`
4. Refactor or create to match. Log result.

---

### TASK 34 — `frontend/js/refresh_records.js` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/refresh_records.js`
2. Check it is self-executing (runs automatically on page load)
3. Check it calls `GET /api/v1/records` → unwraps `json.data.records` → calls `createRecordCard(r)` for each record → appends to `#record-grid` → also calls `createRecordFeedItem(r)` → appends to `#record-feed`
4. IMPORTANT: The API response shape is `{ status, message, data: { count, records: [...] } }` — the code MUST unwrap `json.data.records` not just `json.records`
5. Refactor or create to match. Log result.

---

### TASK 35 — `frontend/js/search_records.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/search_records.js`
2. Check it binds click on `#search-btn` and keypress/submit on `#search-input`
3. Check it calls `GET /api/v1/records?q=ENCODED_QUERY` → unwraps `json.data.records` → renders results into grid and feed (clearing previous results first)
4. Refactor or create to match. Log result.

---

### TASK 36 — `frontend/js/toggle_record_view.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/toggle_record_view.js`
2. Check it is self-executing and handles the `.record-view-tabs` tab bar
3. Check clicking "Grid" tab shows `#record-grid`, hides `#record-feed`
4. Check clicking "Feed" tab shows `#record-feed`, hides `#record-grid`
5. Check the last chosen view is saved to and read from `sessionStorage`
6. Refactor or create to match. Log result.

---

### TASK 37 — `frontend/js/feed_controls.js` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/feed_controls.js`
2. Check it is self-executing and injects a `#feed-controls` element into the page
3. Check it has a sort dropdown with options: newest, oldest, A-Z, category
4. Check it generates category filter chips using a `MutationObserver` that watches `#record-feed` for new items and extracts unique categories
5. Refactor or create to match. Log result.

---

### TASK 38 — `frontend/js/show_draft_record.js` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/show_draft_record.js`
2. Check it exports `refreshDraftRecords()` — calls `GET /api/v1/records/drafts` → for each draft creates a card with an orange "DRAFT" badge → appends to `#record-grid`
3. Refactor or create to match. Log result.

---

### TASK 39 — `frontend/js/ardor_tree.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/ardor_tree.js`
2. Check it handles click events on elements with `data-node` attributes on `evidence.html`
3. Check it calls `GET /api/v1/records` → filters records related to the clicked node's topic → renders a list of title + primary verse for each related record
4. Refactor or create to match. Log result.

---

### TASK 40 — `frontend/js/context_hero.js` 
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/context_hero.js`
2. Check it is self-executing — fetches essay HTML from `GET /api/v1/hero_content` → injects the response HTML into the `#hero-placeholder` element on `context.html`
3. Refactor or create to match. Log result.

---

### TASK 41 — `frontend/js/challenge_academic_hero.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/challenge_academic_hero.js`
2. Check it is self-executing — fetches challenge HTML from `GET /api/challenges?type=academic` → injects into `#hero-placeholder` on `challenge_academic.html`
3. Refactor or create to match. Log result.

---

### TASK 42 — `frontend/js/footer_actions.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/footer_actions.js`
2. Check it contains `toggleRecordLinks(event)` function
3. Check the function does exactly this: `document.querySelectorAll('.record-link').forEach(link => link.classList.toggle('hidden'))`
4. Check `#btn-toggle-links` in `_footer.html` calls this function on click
5. Refactor or create to match. Log result.

---

### TASK 43 — `frontend/js/expand_verse.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/expand_verse.js`
2. Check it is self-executing — finds all `.primary-verse-display[data-verse]` elements → for each one, calls `GET /api/v1/expand_verse?q=VERSE_VALUE` → injects the ESV text response into that element
3. Refactor or create to match. Log result.

---

### TASK 44 — `frontend/js/shuffle_left.js` and `frontend/js/shuffle_right.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate both files in `Developer/thejesuswebsite/frontend/js/`
2. Check they handle left/right navigation between the 8 timeline era periods on `timeline.html`
3. Refactor or create both to match. Log 2 separate results.

---

### TASK 45 — `frontend/js/zoom.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/zoom.js`
2. Check it handles the zoom/detail view for a selected timeline era period on `timeline.html`
3. Refactor or create to match. Log result.

---

### TASK 46 — Map `js/map_zoom.js` files (all 5 regions)
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

Check ALL 5 of these files exist and work correctly:
- `frontend/maps/galilee/js/map_zoom.js`
- `frontend/maps/jerusalem/js/map_zoom.js`
- `frontend/maps/judea/js/map_zoom.js`
- `frontend/maps/levant/js/map_zoom.js`
- `frontend/maps/rome/js/map_zoom.js`

Each must:
1. Listen for clicks on `data-loc` elements
2. Pan/zoom the map to the clicked location
3. Call `GET /api/v1/records` → filter records where `MapType` region matches the clicked location → render a sidebar list of title + primary verse

Refactor or create each one. Log 5 separate results.

---

### TASK 47 — `frontend/private/js/edit_records.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/private/js/edit_records.js`
2. Check ALL of these functions exist and work as described:
   - `loadRecords()` — calls `GET /api/v1/records` with a Bearer auth header → calls `renderList(records)`
   - `renderList(records)` — renders list rows showing name, category badge, delete button; also renders feed items
   - `populateForm(r)` — fills every form field with values from a Record object
   - `clearForm()` — resets all form fields, sets heading to "New Record"
   - `getPublishPayload()` — reads all form fields, assembles a `PublishRecordRequest` shaped object
   - `publishOrUpdate()` — if form has an id → `PUT /api/v1/records/:id`, otherwise → `POST /api/v1/records/publish`
   - `deleteRecord(id)` — shows confirmation dialog → `DELETE /api/v1/records/:id` → removes the row from the DOM
   - `window.editRecordInCRUD(r)` — global function: calls `populateForm(r)` then switches the dashboard to the CRUD tab
3. Refactor or create to match. Log result.

---

### TASK 48 — `frontend/private/js/wgt_records_viewer.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/private/js/wgt_records_viewer.js`
2. Check ALL of these functions exist:
   - `loadAndRender()` — calls `GET /api/v1/records` → renders checkbox rows in `#viewer-results-list`
   - `handleDelete()` — batch-deletes all checked records by calling `DELETE /api/v1/records/:id` for each
   - `handleEdit()` — calls `window.editRecordInCRUD()` passing the first selected record
3. Refactor or create to match. Log result.

---

### TASK 49 — `frontend/private/js/widget_record_generator.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/private/js/widget_record_generator.js`
2. Check it is an auto-scraper that:
   - Fetches the 6 list HTML pages
   - Extracts Bible references via regex
   - Assembles a bulk payload
   - POSTs to `POST /api/v1/admin/populate`
3. Refactor or create to match. Log result.

---

### TASK 50 — `frontend/js/widgets/wgt_db_populator.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/widgets/wgt_db_populator.js`
2. Check ALL of these functions exist:
   - `initDBPopulator()` — sets up event listeners and auto-polling for population status
   - `handleDBPopulate()` — fetches all 6 list HTML pages in parallel → passes each to `list_page_parser.js` → assembles bulk payload → POSTs to `POST /api/v1/admin/populate`
   - `setStatus()` — updates a traffic-light style UI indicator + label text
3. Refactor or create to match. Log result.

---

### TASK 51 — `frontend/js/lib/list_page_parser.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/lib/list_page_parser.js`
2. Check ALL of these functions exist:
   - `parseListPage(html, sourceFile)` — takes the raw HTML string and the source filename → dispatches to the correct parsing strategy based on the filename → returns an array of record objects
   - `parseItem(li, strategy, category)` — parses a single `<li>` element using one of 3 strategies:
     - `standard` — for miracles, events, people, objects
     - `places` — for `list_places.html` (different `<li>` structure)
     - `ot_verses` — for `list_ot_verses.html` (OT verse-centric structure)
3. Refactor or create to match. Log result.

---

### TASK 52 — `frontend/js/lib/bible_ref_parser.js`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/js/lib/bible_ref_parser.js`
2. Check ALL of these functions exist:
   - `parseBibleRef(refStr)` — parses a string like `"Mk 4:35–41"` → returns `{ book, chapter, verse }` or `null` if it can't parse
   - `normalizeBookName(raw)` — maps common abbreviations (e.g., "Mk", "Gen", "1 Cor") to the exact Rust `BibleBook` enum name strings (must cover all 66 Bible books plus common aliases)
   - `splitMultipleRefs(str)` — splits a semicolon or comma-separated string of Bible references into an array of individual ref strings
   - `extractParentheticalRefs(text)` — finds Bible references inside parentheses in a longer text string and returns them as an array
3. Refactor or create to match. Log result.

---

### TASK 53 — `frontend/style.css`
**Before starting:** Read the full plan at `Developer/thejesuswebsite/records_audit_plan.md`.

1. Locate `Developer/thejesuswebsite/frontend/style.css`
2. Check ALL of these CSS classes exist and are styled correctly:
   - `.record-card` — grid card container with hover shadow + transform
   - `.record-card__header`, `.__verse`, `.__image`, `.__desc`, `.__sources`, `.__meta`, `.__timestamps` — card subsections
   - `.record-card__keywords` — keyword badge chips
   - `.record-feed-item` — feed row container
   - `.record-feed-item__thumb`, `.__body`, `.__title`, `.__snippet`, `.__verse`, `.__meta`, `.__badge`, `.__location`, `.__date` — feed item subsections
   - `.record-view-tabs` — Grid/Feed toggle tab bar
   - `.record-search`, `.record-search__input`, `.record-search__btn` — search bar
   - `.feed-controls` — sort/filter UI wrapper
   - `.record-link` — Bible verse link, **hidden by default**
   - `.record-list` — `<ul>` container used on the 6 list pages
   - `.primary-verse-display` — verse element with `data-verse` attribute
   - `.hidden` — utility class that hides an element (used to toggle `.record-link`)
3. Refactor or create any missing classes. Log result.

---

## Audit Log

Create this file when you start Task 1 and append to it after every task:

**File:** `Developer/thejesuswebsite/records_audit_log.md`

**Format for each line:**
```
[PASS | REFACTORED | CREATED] path/to/file — brief note
```

When all 53 tasks are done, the audit log should have 53+ entries and zero open issues.

---

*Plan created: 2026-03-12*
*Architecture source: `frontend/private/records_architecture.html`*
