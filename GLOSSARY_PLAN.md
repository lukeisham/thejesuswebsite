# Glossary Reference — Implementation Plan

**Project:** The Jesus Website
**Date:** 10 March 2026
**Author:** Luke Isham
**Status:** Draft — awaiting approval
**First topic:** Records

---

## 1. Purpose

Turn the empty glossary stub in `dashboard.html` (row 4, `#dashboard-glossary` / `#glossary-content`) into a **working, tab-aware reference panel** that:

1. Shows diagrams of how data flows through the system
2. Lists every file and function involved in the selected topic
3. Switches content when the user clicks different CRUD tabs (just like the cheatsheet row above it)

The first topic implemented will be **Records**. The architecture is designed so that adding a second topic (Essays, Responses, Blogs, Wiki Weights, etc.) is a copy-paste of the pattern established here.

---

## 2. Data Flow Diagrams — Records

### 2.1 Record Creation & Storage Pipeline

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                    RECORD CREATION PATHS                        │
 └─────────────────────────────────────────────────────────────────┘

 Path A: Dashboard CRUD Form               Path B: DB Populator Widget
 ─────────────────────────                  ───────────────────────────
 dashboard.html                             wgt_db_populator.js
 └─ edit_records.js                         └─ list_page_parser.js
    ├─ getPublishPayload()                     ├─ Fetches 6 HTML list pages
    │  builds PublishRecordRequest              │  (miracles, events, people,
    │  { name, description,                     │   places, OT verses, objects)
    │    category, primary_verse,               ├─ Parses <li> items + Bible refs
    │    timeline: { year,                      └─ POSTs bulk payload to:
    │      event_name, era },                      POST /api/v1/admin/populate
    │    map_data: { region,                       ┌──────────────────────┐
    │      lat, lng, title } }                     │ api_widgets.rs       │
    │                                              │ handle_admin_populate│
    ├─ NEW record:                                 │  └─ wipe_records()   │
    │  POST /api/v1/records/publish                │  └─ for each item:   │
    │                                              │     build_record_    │
    ├─ UPDATE record:                              │     from_item()      │
    │  PUT /api/v1/records/:id                     └──────────┬───────────┘
    │                                                         │
    └───────────────────────┐                                 │
                            ▼                                 ▼
                   ┌─────────────────────────────────────────────┐
                   │          api_records.rs                      │
                   │  handle_publish_record / handle_update_record│
                   │                                              │
                   │  1. Deserialise PublishRecordRequest          │
                   │  2. TryFrom → core Record struct             │
                   │     (dtos.rs: category→Classification,       │
                   │      era→TimelineEra, region→MapType)        │
                   │  3. RecordGatekeeper validates:              │
                   │     - name ≤ 80 chars                        │
                   │     - PNG magic bytes                        │
                   │     - description non-empty                  │
                   └──────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌──────────────────┐       ┌───────────────────┐
          │  sqlite.rs       │       │  chroma.rs         │
          │  store_record()  │       │  store_record()    │
          │                  │       │                    │
          │ INSERT OR REPLACE│       │ Embed full JSON    │
          │ 20 columns:      │       │ via InferenceEngine│
          │ • 12 flat scalars│       │ Upsert into        │
          │ • 5 JSON blobs   │       │ "records" collection│
          │ • picture BLOB   │       └───────────────────┘
          │ • 2 timestamps   │
          └──────────────────┘
```

### 2.2 Record Display Pipeline

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                    RECORD DISPLAY PATHS                         │
 └─────────────────────────────────────────────────────────────────┘

 Path A: Public records.html                Path B: Dashboard
 ──────────────────────────                 ─────────────────
 records.html                               dashboard.html
 └─ refresh_records.js   ◄── page load      └─ edit_records.js ◄── page load
 └─ search_records.js    ◄── user search       loadRecords()
                                                  │
         │                                        │
         ▼                                        ▼
    GET /api/v1/records  ──────────────────►  GET /api/v1/records
    (or ?q=QUERY for search)                  (with Bearer auth header)
         │
         ▼
 ┌────────────────────────────────────────────┐
 │ api_records.rs: handle_record_list()       │
 │   or handle_record_search() via ChromaDB   │
 │                                            │
 │ sqlite.rs: get_records()                   │
 │   SELECT all 20 columns                    │
 │   Deserialise JSON blobs → Rust structs    │
 │   Reconstruct full Record objects          │
 │                                            │
 │ Wrap in ApiResponse<RecordListResponse>    │
 │ { status, message,                         │
 │   data: { count, records: [...] } }        │
 └─────────────────┬──────────────────────────┘
                   │
                   ▼ (JSON response)
     ┌─────────────┴──────────────────────────┐
     │  JS must unwrap: json.data.records     │
     └─────────────┬──────────────────────────┘
                   │
     ┌─────────────┼──────────────┐
     ▼             ▼              ▼
 Grid View    Feed View      Dashboard List
 ──────────   ──────────     ──────────────
 record_      record_        edit_records.js
 card.js      feed.js        renderList()
 createRecord createRecord   ├─ name + category
 Card(r)      FeedItem(r)    │  + ✕ delete btn
 │            │              └─ click → populateForm(r)
 │            │
 ├─ 14 fields ├─ thumbnail       Dashboard Feed View
 │  fully     │  title            ──────────────────
 │  rendered  │  120-char snippet record_feed.js
 │            │  era + cat badges createRecordFeedItem(r)
 │            │  source count     click → switch to CRUD tab
 ▼            ▼
 #record-grid #record-feed        Viewer Panel
 (3-col CSS)  (single-col)        ──────────────
                                  wgt_records_viewer.js
 toggle_record_view.js            checkbox rows
 ├─ switches Grid ↔ Feed          Delete / Edit in CRUD
 └─ persists to sessionStorage

 feed_controls.js
 ├─ sort: newest, oldest, A-Z, category
 └─ filter chips via MutationObserver
```

---

## 3. Complete File & Function Reference — Records

### 3.1 Rust Backend

#### `app/app_core/src/types/record/record.rs`
Core data type and validation. **Schema version: 1.1.0**

| Export | Kind | Description |
|--------|------|-------------|
| `Record` | struct | 14 fields: id, metadata, name, picture_bytes, description, bibliography, timeline, map_data, category, content, primary_verse, secondary_verse, created_at, updated_at |
| `Record::SCHEMA_VERSION` | const | `"1.1.0"` — bump on any struct change |
| `Record::try_new(...)` | async fn | Validates via Gatekeeper, returns `Result<Record, RecordError>` |
| `Record::to_json()` | fn | Serialize to JSON string |
| `Record::from_json(json)` | fn | Deserialize from JSON string |
| `RecordGatekeeper::validate_name(name)` | fn | Name ≤ 80 chars, non-empty |
| `RecordGatekeeper::validate_image_format(bytes)` | fn | PNG magic bytes check |
| `RecordGatekeeper::validate_description(lines)` | fn | Non-empty, each line ≤ 1000 chars |
| `RecordError` | enum | `InvalidName`, `InvalidImage`, `InvalidDescription`, `SystemError` |

#### `app/app_core/src/types/jesus/type.rs`
| Export | Kind | Description |
|--------|------|-------------|
| `Classification` | enum | `Event \| Location \| Person \| Theme` (PascalCase in serde) |
| `TypedEntry` | struct | `{ id: Uuid, label: String, classification: Option<Classification> }` |
| `TypeError` | enum | `MissingTypeSelection`, `SystemConflict` |

#### `app/app_core/src/types/jesus/timeline.rs`
| Export | Kind | Description |
|--------|------|-------------|
| `TimelineEra` | enum | 8 variants, kebab-case serde: `pre-incarnation`, `birth`, `life`, `ministry`, `passion`, `response`, `return`, `theme` |
| `TimelineEntry` | struct | `{ id: Uuid, event_name: String, era: Option<TimelineEra>, description: String }` |
| `TimelineError` | enum | `MissingEraSelection`, `ChronologyViolation`, `IntegrityError` |

#### `app/app_core/src/types/jesus/map.rs`
| Export | Kind | Description |
|--------|------|-------------|
| `MapType` | enum | `Galilee \| Jerusalem \| Judea \| Levant \| Rome \| Overview` (PascalCase) |
| `MapPoint` | struct | `{ id: Uuid, title, description, latitude: f64, longitude: f64, metadata: HashMap }` |
| `InteractiveMap` | struct | `{ map_id: Uuid, label: MapType, version: u32, points: Vec<MapPoint> }` |
| `MapError` | enum | `InvalidBounds`, `SecurityViolation`, `PointNotFound`, `StorageFailure` |

#### `app/app_core/src/types/jesus/content.rs`
| Export | Kind | Description |
|--------|------|-------------|
| `Content` | enum | `Miracle \| Parable \| Saying \| Sermon \| Other` (lowercase serde) |
| `ContentEntry` | struct | `{ id: Uuid, title, body, category: Option<Content> }` |
| `EntryError` | enum | `MissingSelection`, `ValidationFailure`, `UnauthorizedAccess` |

#### `app/app_core/src/types/dtos.rs` (record-related)
| Export | Kind | Description |
|--------|------|-------------|
| `DraftRecordRequest` | struct | `{ id: Option<String>, name, r#type, region }` |
| `PublishRecordRequest` | struct | `{ name, description, category, primary_verse, timeline, map_data }` |
| `PublishTimelineRequest` | struct | `{ year: i32, event_name, era }` |
| `PublishMapRequest` | struct | `{ region, latitude: f64, longitude: f64, title }` |
| `RecordListResponse` | struct | `{ count: usize, records: Vec<Record> }` |
| `TryFrom<PublishRecordRequest> for Record` | impl | Converts frontend DTO → core Record with enum parsing |

#### `app/app_ui/src/api_records.rs`
| Handler | Route | Method | Description |
|---------|-------|--------|-------------|
| `handle_publish_record` | `/api/v1/records/publish` | POST | Create new record → SQLite + ChromaDB |
| `handle_update_record` | `/api/v1/records/:id` | PUT | Update existing record (upsert by ULID) |
| `handle_delete_record` | `/api/v1/records/:id` | DELETE | Remove from SQLite + ChromaDB |
| `handle_record_list` | `/api/v1/records` | GET | List all published records |
| `handle_record_search` | `/api/v1/records?q=` | GET | Semantic search via ChromaDB |
| `handle_save_record_draft` | `/api/v1/records/draft` | POST | Save lightweight draft |
| `handle_get_draft_records` | `/api/v1/records/drafts` | GET | List all drafts |
| `handle_expand_verse` | `/api/v1/expand_verse?q=` | GET | ESV Bible API proxy |
| `handle_draft_counts` | `/api/v1/system/draft_counts` | GET | Returns stub counts |
| `handle_record_map` | (stub) | — | Future map data endpoint |
| `handle_record_timeline` | (stub) | — | Future timeline endpoint |
| `handle_record_tree` | (stub) | — | Future tree/hierarchy endpoint |

#### `app/app_ui/src/api_widgets.rs` (record-related)
| Handler | Route | Description |
|---------|-------|-------------|
| `handle_admin_populate` | `POST /api/v1/admin/populate` | Bulk import records from list pages |
| `handle_admin_wipe_records` | `DELETE /api/v1/admin/wipe-records` | Wipe all records |
| `build_record_from_item(item)` | internal fn | Constructs Record from PopulateRecordItem |

#### `app/app_storage/src/sqlite.rs` (record-related methods)
| Method | Description |
|--------|-------------|
| `store_record(record)` | INSERT OR REPLACE — 20 columns (12 flat + 5 JSON blobs + BLOB + 2 timestamps) |
| `get_records()` | SELECT all columns → deserialise blobs → reconstruct full Record |
| `delete_record(id) → bool` | DELETE by ULID, returns true if row existed |
| `wipe_records() → usize` | DELETE all, returns row count |
| `save_record_draft(draft)` | INSERT OR REPLACE into record_drafts |
| `get_draft_records()` | SELECT payload → deserialise DraftRecordRequest |
| `delete_record_draft(id)` | DELETE draft by id |

#### `app/app_storage/src/chroma.rs` (record-related methods)
| Method | Description |
|--------|-------------|
| `store_record(record)` | Embed full JSON → upsert into "records" collection |
| `query_records(query_text)` | Semantic search → returns Vec of JSON strings |
| `delete_record(id)` | Remove single doc by ULID |
| `wipe_records()` | Delete + recreate empty "records" collection |

#### `app/app_storage/database/schema.sql`
| Table | Columns | Notes |
|-------|---------|-------|
| `records` | 20 columns | `category` CHECK: Event, Location, Person, Theme. `era` CHECK: 8 lifecycle eras. `map_label` CHECK: 6 regions. |
| `record_drafts` | 7 columns | `type` CHECK: same as category. `region` CHECK: same as map_label. |

### 3.2 Frontend — Public (records.html)

#### `frontend/records.html`
| Section | ID | Description |
|---------|-----|-------------|
| Search bar | `#record-search-section` | Text input + search button |
| View tabs | `.record-view-tabs` | Grid / Feed toggle tabs |
| Grid container | `#record-grid` | 3-column CSS grid of record cards |
| Feed container | `#record-feed` | Single-column feed items (hidden by default) |

#### `frontend/js/record_card.js`
| Export | Description |
|--------|-------------|
| `window.createRecordCard(record)` | Full 14-field card as `<article class="record-card">` |
| `window.formatVerse(verseInfo)` | Formats `{ book, chapter, verse }` → `"Book Ch:Vs"` |

#### `frontend/js/record_feed.js`
| Export | Description |
|--------|-------------|
| `window.createRecordFeedItem(record)` | Compact feed item with thumbnail, title, snippet, era/category badges |

#### `frontend/js/refresh_records.js`
| Function | Description |
|----------|-------------|
| `(self-executing)` | On page load: `GET /api/v1/records` → populate both grid and feed |

#### `frontend/js/search_records.js`
| Function | Description |
|----------|-------------|
| `(self-executing)` | Binds to `#search-input` / `#search-btn`, sends `GET /api/v1/records?q=` |

#### `frontend/js/toggle_record_view.js`
| Function | Description |
|----------|-------------|
| `(self-executing)` | Click handler on `.record-view-tabs .tab`, toggles `#record-grid` / `#record-feed` display, persists to `sessionStorage("records_view_preference")` |

#### `frontend/js/feed_controls.js`
| Function | Description |
|----------|-------------|
| `(self-executing)` | Injects `#feed-controls` after `#record-search-section`. Sort dropdown (newest/oldest/A-Z/category). Category filter chips via MutationObserver on `#record-feed`. |

#### `frontend/js/show_draft_record.js`
| Export | Description |
|--------|-------------|
| `refreshDraftRecords()` | Fetches `GET /api/v1/records/drafts`, appends orange-badged draft cards to `#record-grid` |

### 3.3 Frontend — Admin Dashboard

#### `frontend/private/js/edit_records.js`
| Function | Description |
|----------|-------------|
| `loadRecords()` | `GET /api/v1/records` with auth → renders list + feed |
| `renderList(records)` | Builds list rows with name, category badge, ✕ delete button; builds feed items |
| `populateForm(r)` | Fills all form fields from a Record object (name, category, content, keywords, description, both verses, timeline, map, bibliography) |
| `clearForm()` | Resets all fields, sets heading to "New Record" |
| `getPublishPayload()` | Collects form → `PublishRecordRequest` JSON shape |
| `getDraftPayload()` | Collects form → `DraftRecordRequest` JSON shape |
| `publishOrUpdate()` | If `#record-id-field` is populated → `PUT /records/:id`, else → `POST /records/publish` |
| `deleteRecord(id, name, rowEl)` | `DELETE /records/:id` with confirmation |
| `saveAsDraft()` | `POST /records/draft` |
| `window.editRecordInCRUD(record)` | Global: populates form + switches to CRUD tab (used by viewer) |
| `window.addBibEntry()` | Global: appends blank bibliography entry to form |

#### `frontend/private/js/wgt_records_viewer.js`
| Function | Description |
|----------|-------------|
| `loadAndRender()` | `GET /api/v1/records` → checkbox rows in `#viewer-results-list` |
| `handleDelete()` | Batch-deletes all checked records |
| `handleEdit()` | Calls `window.editRecordInCRUD()` with first selected record |
| `handleSelectAll()` | Toggles all `.viewer-checkbox` inputs |

#### `frontend/private/js/widget_record_generator.js`
| Function | Description |
|----------|-------------|
| `(self-executing on DOMContentLoaded)` | Scrapes 6 resource HTML pages, extracts Bible refs via regex, posts `{ wipe: true, records: [...] }` to `POST /api/v1/admin/populate` |

#### `frontend/private/js/record_card.js`
| Export | Description |
|--------|-------------|
| `window.createRecordCard(record)` | Simplified admin card (dashboard variant — fewer fields) |

### 3.4 Styling

#### `frontend/style.css` (record-specific classes)
| Class | Description |
|-------|-------------|
| `.record-list` | Nav-style list items |
| `.record-search`, `.record-search__input`, `.record-search__btn` | Search bar layout |
| `.record-view-tabs` | Grid/Feed tab toggle bar |
| `.record-card` | Grid card container (hover effects) |
| `.record-card__header`, `__verse`, `__image`, `__desc`, `__sources`, `__meta`, `__timestamps` | Card subsections |
| `.record-card__keywords` | Keyword badge chips |
| `.record-feed-item` | Feed row container |
| `.record-feed-item__thumb`, `__body`, `__title`, `__snippet`, `__verse`, `__meta`, `__badge`, `__location`, `__date` | Feed subsections |
| `.feed-controls` | Sort/filter UI wrapper |

---

## 4. Implementation Steps

### Phase 1: Glossary Infrastructure (topic-agnostic)

**Goal:** Make `#glossary-content` switch its content when the user clicks different CRUD tabs, using the same pattern as the cheatsheet row above it.

**File structure — each topic gets its own dedicated JS file:**

```
frontend/private/js/
├── glossary_records.js       ← Records topic (implemented first)
├── glossary_essays.js        ← Essays topic (future)
├── glossary_responses.js     ← Responses topic (future)
└── glossary_blogs.js         ← Blogs topic (future)
```

Each glossary JS file exposes a single `window.GLOSSARY_<TOPIC>` object:
```js
window.GLOSSARY_RECORDS = {
  tabId: "crud-records",   // matches the data-target on the CRUD tab button
  html: `...`              // full HTML string for the glossary panel
};
```

| Step | File | Change |
|------|------|--------|
| 1 | `frontend/private/js/glossary_records.js` | Create file. Assigns `window.GLOSSARY_RECORDS` with `tabId` and `html` containing diagrams + file/function tables. |
| 2 | `dashboard.html` (script tags, ~line 1359) | Add `<script src="/private/js/glossary_records.js" defer></script>`. Future topics: add one line per topic. |
| 3 | `dashboard.html` (inline JS, ~line 1184) | Build `glossaries` object dynamically from all `window.GLOSSARY_*` entries. After the cheatsheet update block, add a parallel block that sets `#glossary-content` innerHTML from the matching glossary object. |
| 4 | Verify | Clicking "Records" CRUD tab shows Records glossary. Clicking any other tab shows a placeholder. |

### Phase 2: Records Glossary Content

**Goal:** Populate `glossary_records.js` with diagrams and the file/function reference.

| Step | File | Change |
|------|------|--------|
| 5 | `frontend/private/js/glossary_records.js` | `html` string contains: (a) two ASCII data-flow diagrams in `<pre class="glossary-diagram">` blocks; (b) file/function tables in collapsible `<details class="glossary-section">` groups: Backend Types, API Handlers, Storage, Public JS, Admin JS, CSS. |
| 6 | `frontend/style.css` | Add styles for `.glossary-diagram`, `.glossary-table`, `details.glossary-section`, `details.glossary-section summary`. |

### Phase 3: Template for Future Topics

**Goal:** Adding a new glossary topic should require only two steps.

| Step | Action |
|------|--------|
| 7 | Create `frontend/private/js/glossary_<topic>.js` following the `window.GLOSSARY_<TOPIC>` pattern — assign `tabId` matching the CRUD tab and write the `html` content. |
| 8 | Add one `<script>` tag to `dashboard.html` for the new file. The infrastructure in the inline JS automatically picks it up via the `window.GLOSSARY_*` registry. No other changes needed. |

---

## 5. Scope & Constraints

- The glossary is a **read-only reference** — no interactive forms, no API calls.
- Each topic's content lives in its own dedicated JS file — not inline in `dashboard.html`.
- Adding a new topic requires creating one JS file + one script tag. Zero changes to wiring logic.
- Diagrams use `<pre>` monospace ASCII art — no external diagram libraries needed.
- File/function tables use `<details>/<summary>` for collapsibility — no extra JS.
- The glossary panel is **below** the cheatsheet panel and spans the full width of grid row 4.
- Existing cheatsheet behaviour is not changed — they remain independent panels.

---

## 6. How to Use This Plan

When giving instructions to a coding agent about the Records system, you can reference specific sections:

- **"Fix a bug in record display"** → See §3.2 (Public JS) — `record_card.js`, `record_feed.js`
- **"Add a field to the Record struct"** → See §3.1 `record.rs` — must bump `SCHEMA_VERSION`, update `schema.sql`, update `sqlite.rs` store/get, update `dtos.rs` if field comes from frontend
- **"Record CRUD form isn't saving correctly"** → See §3.3 `edit_records.js` — `getPublishPayload()` and `publishOrUpdate()`
- **"Record not showing up after DB Populator runs"** → See §3.1 `api_widgets.rs` — `build_record_from_item()` + §3.1 `sqlite.rs` — `store_record()`
- **"Add search filtering"** → See §3.2 `search_records.js` + `feed_controls.js`
- **"Style changes to record cards"** → See §3.4 — CSS classes in `style.css`
- **"Add a new CRUD endpoint"** → See §3.1 `api_records.rs` + `router.rs`
