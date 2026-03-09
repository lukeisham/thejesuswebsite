# Add Records Feed to System View

**Project:** The Jesus Website
**Date:** 10 March 2026
**Author:** Luke Isham
**Status:** Complete

---

## 1. Overview

This project adds a **Records Feed** — a chronological, scrollable list view of all published Records — to the system viewer. Currently, records are displayed as a 3-column card grid on `records.html` via `record_card.js` and `refresh_records.js`. The feed view will provide an alternative, linear display optimised for scanning, reading, and chronological browsing, following the same pattern established by `news_feed.html` and `blog_feed.html`.

---

## 2. Current Architecture

### 2.1 Record Data Model (`app/app_core/src/types/record/record.rs`)

Each `Record` contains 14 fields:

| Field | Type | Feed Relevance |
|---|---|---|
| `id` | ULID | Unique key / anchor link |
| `name` | String | Feed item title |
| `picture_bytes` | Vec\<u8\> (PNG) | Thumbnail in feed row |
| `description` | Vec\<String\> | Summary / preview snippet |
| `primary_verse` | BibleVerse | Shown inline |
| `secondary_verse` | Option\<BibleVerse\> | Collapsed by default |
| `bibliography` | Vec\<Source\> | Source count badge |
| `timeline` | TimelineEntry | Era label / sort key |
| `map_data` | InteractiveMap | Location label |
| `category` | Classification | Filter chip |
| `content` | ContentEntry | Content type badge |
| `metadata` | Metadata (keywords) | Search / filter tags |
| `created_at` | DateTime\<Utc\> | Default sort key |
| `updated_at` | Option\<DateTime\> | "Updated" indicator |

### 2.2 Current Display Pipeline

1. **API:** `GET /api/v1/records` → `handle_record_list` in `api_records.rs` → SQLite `get_records()` → returns full `Record[]` JSON.
2. **Frontend fetch:** `refresh_records.js` calls `/api/records`, iterates results, calls `createRecordCard(record)` for each.
3. **Rendering:** `record_card.js` builds a full `<article class="record-card">` DOM element with all 14 fields displayed.
4. **Layout:** `records.html` places cards in a `<section class="a-grid a-cols-3">` grid.

### 2.3 Existing Feed Pattern

`news_feed.html` and `blog_feed.html` both use a single-column `<section id="hero-placeholder">` container populated by a dedicated JS module (`news_feed_hero.js` / `blog_feed_hero.js`). The Records Feed should follow this same convention.

---

## 3. Design: Records Feed View

### 3.1 Layout Concept

The feed will be a **single-column, vertically-stacked list** where each record is a compact horizontal row rather than a full card. This mirrors a "timeline feed" or "activity log" pattern.

```
┌──────────────────────────────────────────────────┐
│ Records Feed                              [Grid] │
│ Chronological view of all records         toggle │
├──────────────────────────────────────────────────┤
│ ┌──┐  The Crucifixion              Passion Era   │
│ │  │  Primary event of the...    Matt 27:32-56   │
│ │img│  Category: Event │ 3 sources │ Jerusalem   │
│ └──┘                                   2026-01-15│
├──────────────────────────────────────────────────┤
│ ┌──┐  The Empty Tomb             Resurrection    │
│ │  │  Discovery of the...        Mark 16:1-8     │
│ │img│  Category: Event │ 5 sources │ Jerusalem   │
│ └──┘                                   2026-01-12│
├──────────────────────────────────────────────────┤
│ ...                                              │
└──────────────────────────────────────────────────┘
```

### 3.2 Feed Item Fields (Compact Row)

Each feed row shows a **subset** of the full Record, keeping it scannable:

- **Thumbnail:** Small (48×48px) version of `picture_bytes`
- **Title:** `name` (linked, clickable to expand full card)
- **Snippet:** First line of `description`, truncated to ~120 characters
- **Primary Verse:** Inline, clickable for ESV expansion
- **Era Label:** From `timeline.era`
- **Category Badge:** From `category`
- **Source Count:** Number from `bibliography.length`
- **Location:** From `map_data.label`
- **Date:** `created_at`, formatted as relative or short date

### 3.3 Interaction

- **Click a row** → expands to full record card inline (accordion), or scrolls to / opens a detail view
- **Grid/Feed tabs** → a tab bar above the search section switches between the existing 3-column grid and the new feed view (see Section 3.4)
- **Sort controls** → default: `created_at` descending; option to sort by era, category, or name
- **Filter chips** → filter by `category` (Event, Person, Place, etc.) using the Classification enum

### 3.4 Entry Points — Navigation Decisions

Two specific access points were chosen after reviewing the existing page structures:

**`records.html` — Tab Bar (Option B)**
A `<div class="tabs">` bar is inserted between the page header and the `#record-search-section`. It contains two tabs: "Grid" (active by default, showing the existing `#record-grid`) and "Feed" (showing the new `#record-feed` section). This pattern is consistent with the tab system already used in the dashboard and is more discoverable than a small toggle button. The search bar remains visible and functional below the tabs regardless of which view is active.

```
┌─────────────────────────────────────┐
│ Records                             │
│ Searchable records for...           │
├──────────────┬──────────────────────┤
│  [ Grid ]  [ Feed ]                 │  ← new tab bar
├─────────────────────────────────────┤
│  [ Search records...          ] [🔍]│
├─────────────────────────────────────┤
│  card  card  card  (grid view)      │
│  OR                                 │
│  ── feed item ──────────────────    │
│  ── feed item ──────────────────    │
└─────────────────────────────────────┘
```

**`dashboard.html` — "Feed View" Tab in the Records CRUD Panel (Option D)**
A new "Feed View" tab is appended to the existing tab bar inside the Records Manager panel (current tabs: Records, Essays, Responses, Blogposts, Wiki Weights). The new tab panel renders a read-only admin feed of all published records — useful for reviewing content at a glance without entering the editor. It reuses `createRecordFeedItem` from `record_feed.js` and fetches from the same `/api/v1/records` endpoint.

```
┌─────────────────────────────────────────────────────┐
│ [Records] [Essays] [Responses] [Blogposts] [Weights]│
│ [Feed View]  ← new tab appended here               │
├─────────────────────────────────────────────────────┤
│  ── The Crucifixion  │ Event │ 3 sources  2026-01 ──│
│  ── The Empty Tomb   │ Event │ 5 sources  2026-01 ──│
│  ── ...                                          ───│
└─────────────────────────────────────────────────────┘
```

### 3.5 Search Integration

The existing `search_records.js` real-time filter and API search should work identically in feed mode — the feed items are simply filtered/hidden the same way cards are today. On the dashboard, no search integration is needed as the Feed View tab is read-only.

---

## 4. Implementation Plan

### Phase 1: Feed Renderer (Frontend JS)

Create `frontend/js/record_feed.js` — a new renderer module, analogous to `record_card.js`, that exports a `createRecordFeedItem(record)` function. This function returns a compact `<article class="record-feed-item">` DOM element.

### Phase 2: Tab Navigation (Frontend HTML + JS)

Modify `records.html` to add:
- A `<div class="tabs">` bar between the page header and the search section, with "Grid" and "Feed" tab buttons
- A `<section id="record-feed">` container (hidden when Grid tab is active)
- Create `frontend/js/toggle_record_view.js` to handle tab switching — shows/hides `#record-grid` and `#record-feed`, applies `.active` class to the selected tab, and persists the user's choice in `sessionStorage`

Modify `frontend/private/dashboard.html` to add:
- A "Feed View" tab button appended to the existing Records Manager tab bar
- A new `<div id="crud-records-feed" class="tab-panel">` panel containing the admin feed list
- Wire up to the existing tab-switching JS already present in the dashboard

### Phase 3: Feed Styles (CSS)

Add feed-specific styles to `frontend/style.css`:
- `.record-feed-item` — horizontal flex row layout
- `.record-feed-item__thumb` — 48×48 thumbnail
- `.record-feed-item__body` — title, snippet, verse
- `.record-feed-item__meta` — category badge, source count, location, date
- Responsive: stack vertically on mobile

### Phase 4: Sort & Filter Controls (Frontend JS)

Create `frontend/js/feed_controls.js`:
- Sort dropdown (created_at, era, category, name)
- Category filter chips derived from the loaded records' `category` values
- Client-side sorting and filtering of existing DOM elements

### Phase 5: Backend Support (Optional — if pagination needed)

If the record count grows large, add a paginated endpoint:
- `GET /api/v1/records/feed?page=1&per_page=20&sort=created_at&order=desc`
- New handler `handle_record_feed` in `api_records.rs`
- Corresponding SQLite query with `LIMIT/OFFSET` in storage layer

---

## 5. File Change Checklist

### Files to Create (New)

- [x] **`frontend/js/record_feed.js`** — Feed item renderer (`createRecordFeedItem` function). Core of the feature — renders each Record as a compact horizontal row instead of a full card.
- [x] **`frontend/js/toggle_record_view.js`** — Tab switching logic for `records.html`. Applies `.active` class to the selected tab, shows/hides `#record-grid` and `#record-feed`, and persists the user's last-viewed tab in `sessionStorage`.
- [x] **`frontend/js/feed_controls.js`** — Sort and filter controls. Adds client-side sorting (by date, era, category, name) and category filter chips to the feed view.

### Files to Modify (Existing)

- [x] **`frontend/records.html`** — Insert `<div class="tabs">` bar between the page header and search section (Grid / Feed tabs). Add the `#record-feed` section container beneath `#record-grid`. Add `<script>` tags for the three new JS files.
- [x] **`frontend/style.css`** — Add CSS rules for `.record-feed-item`, `.record-feed-item__thumb`, `.record-feed-item__body`, `.record-feed-item__meta`, and responsive breakpoints. No new toggle button styles needed — the existing `.tab` and `.tab.active` styles from the dashboard already apply via the shared `style.css`.
- [x] **`frontend/js/refresh_records.js`** — Extend to also populate the feed view (call `createRecordFeedItem` alongside `createRecordCard`) when records are fetched.
- [x] **`frontend/js/search_records.js`** — Extend real-time filter to also hide/show `.record-feed-item` elements in addition to `.record-card` elements.

### Files to Modify (Backend — Phase 5 only)

- [ ] **`app/app_ui/src/api_records.rs`** — Add `handle_record_feed` handler with pagination and sort params.
- [ ] **`app/app_ui/src/router.rs`** — Add route: `.route("/records/feed", get(handle_record_feed))` to `api_routes()`.
- [ ] **`app/app_storage/src/...`** — Add paginated query method to SQLite storage layer.

- [x] **`frontend/private/dashboard.html`** — Append a "Feed View" tab button to the Records Manager tab bar. Add a `#crud-records-feed` tab panel containing the admin read-only feed list. The existing tab-switching JS in the dashboard already handles `.tab` / `.tab-panel` toggling, so no new JS file is needed for the dashboard.

### Files NOT Changed

- **`app/app_core/src/types/record/record.rs`** — No schema changes required. The feed is a display-layer feature only.
- **`app/app_brain/src/record.rs`** — No domain logic changes needed.
- **`frontend/private/js/record_card.js`** — Admin card renderer is separate and unaffected.
- **`frontend/private/js/edit_records.js`** — Editor is unaffected.
- **`frontend/js/toggle_record_view.js`** (dashboard) — Not needed. The dashboard already has its own inline tab-switching logic that will handle the new Feed View tab natively.

---

## 6. Testing Plan

### `records.html` — Public Feed

1. **Visual check:** Load `records.html` — Grid tab is active by default, grid view renders unchanged.
2. **Tab switching:** Click "Feed" tab — feed view appears, grid hides, "Feed" tab gains `.active` class.
3. **Tab persistence:** Reload the page — feed tab is still selected (from `sessionStorage`).
4. **Feed rendering:** Each record appears as a compact row with thumbnail, title, snippet, verse, and metadata.
5. **Search:** Type in search bar while on Feed tab — feed items filter correctly. Switch to Grid tab — grid cards also reflect the same filter.
6. **Sort:** Change sort order in feed view — items re-order correctly.
7. **Filter:** Click a category chip — only matching records shown in feed.
8. **Responsive:** Resize browser — feed items stack vertically on narrow screens.
9. **Empty state:** If no records exist, feed shows a "No records available yet" message.

### `dashboard.html` — Admin Feed View Tab

10. **Tab appears:** Log in and open the dashboard — "Feed View" tab is visible in the Records Manager panel alongside the existing tabs.
11. **Tab switching:** Click "Feed View" — the admin feed list renders with all published records. Click another tab — feed panel hides correctly.
12. **Feed content:** Each row shows name, category badge, source count, and date.
13. **No interference:** Existing Records, Essays, Responses, Blogposts, and Wiki Weights tabs all continue to function correctly.

---

## 7. Implementation Review (10 March 2026)

### 7.1 What Was Implemented

The following changes were made to the codebase against this plan:

**`frontend/records.html`** — Done. Tab bar added inside `#record-search-section` as a `<div class="record-view-tabs">` with Grid/Feed tabs using `data-view` attributes. `#record-feed` section added beneath `#record-grid` with `display: none`. Three new `<script>` tags added for `record_feed.js`, `toggle_record_view.js`, and `feed_controls.js`.

**`frontend/private/dashboard.html`** — Done. "Feed View" tab button inserted as the second tab (between Records and Essays) with `data-target="crud-records-feed"` and `data-view="feed"`. A `#crud-records-feed` tab panel added inside the Records Manager panel with a scrollable `#record-feed` container. Cheatsheet entry added for `crud-records-feed`. Script tags added for `record_feed.js` and `feed_controls.js`.

**`frontend/js/refresh_records.js`** — Done. Now references `feedEl = document.getElementById("record-feed")` and calls `window.createRecordFeedItem(r)` alongside `createRecordCard(r)` when iterating records.

**`frontend/js/search_records.js`** — Done. Both the fetch-based search and the real-time `input` filter now operate on `.record-feed-item` elements in addition to `.record-card` elements.

**`frontend/private/js/edit_records.js`** — Done (bonus — not originally in plan). The `renderList` function now also populates `#record-feed` with `createRecordFeedItem` items. Clicking a feed item in the dashboard navigates to the Records CRUD tab and populates the editor form.

**`frontend/style.css`** — Done. Full set of `.record-feed-item` styles added (flex row layout, thumbnail, body, meta, badges, responsive breakpoints) plus `.record-view-tabs` styling for the public page tab bar.

**Dashboard inline JS** — Done. Cheatsheet map updated with a `crud-records-feed` entry.

### 7.2 Blockers — Resolved

**1. `frontend/js/record_feed.js`** ✅ Created. Exports `window.createRecordFeedItem(record)`. Renders thumbnail, title, snippet, primary verse, era badge, category badge, source count, location, and date as a compact horizontal row. Also sets `data-category`, `data-created`, and `data-name` attributes on each article for use by `feed_controls.js`.

**2. `frontend/js/toggle_record_view.js`** ✅ Created. Reads `data-view` from `.record-view-tabs .tab` elements, toggles `display` on `#record-grid` and `#record-feed`, applies `.active` class to the selected tab, and persists preference in `sessionStorage`.

**3. `frontend/js/feed_controls.js`** ✅ Created. Injects a controls bar after `#record-search-section` (hidden in grid view, visible in feed view). Provides a sort dropdown (Newest, Oldest, Name A–Z, Category) and dynamic category filter chips driven by a `MutationObserver` on the feed container. Reacts to tab switches to show/hide itself.

### 7.3 Bugs — Fixed

**4. API URL mismatch** ✅ Fixed. `refresh_records.js` and `search_records.js` both now fetch from `/api/v1/records` (corrected from `/api/records`).

**5. API response shape mismatch** ✅ Fixed. `refresh_records.js`, `search_records.js`, and `edit_records.js` all now unwrap `json.data.records` from the `ApiResponse<RecordListResponse>` envelope before iterating. Pattern used:
```js
var records = (json && json.data && json.data.records) ? json.data.records : [];
```

### 7.4 What Is Missing — Minor / Non-blocking

**6. Tab placement differs slightly from plan**
The plan specified the tab bar _between_ the page header and the search section as a separate `<div class="tabs">`. The implementation placed the tabs _inside_ `#record-search-section` as `<div class="record-view-tabs">`. This is a reasonable variation — it keeps the tabs visually grouped with the search bar rather than floating between header and search. No action needed unless visual alignment is a concern.

**7. Dashboard Feed View tab position**
The plan said "appended" (i.e. last tab). The implementation places "Feed View" as the second tab, right after Records. This is actually better for discoverability since it groups the two record-related tabs together. No action needed.

**8. `#crud-records-feed` nesting**
In `dashboard.html`, the `#crud-records-feed` panel is nested _inside_ the `#crud-records` panel (it appears after the record detail form, before the closing `</div>` of `crud-records`). This means the Feed View panel is a child of the Records panel rather than a sibling. The existing tab JS uses `parentPanel.querySelectorAll('.tab-panel')` scoped to the closest `.dashboard-panel`, so this should still toggle correctly. However, when the Records tab is active, `#crud-records-feed` is also technically visible (as a child of the active panel) — it just won't display because `.tab-panel { display: none }` is applied. This works but is structurally fragile; if the Feed View panel were moved to be a sibling of `#crud-records` instead of a child, it would be cleaner.

---

## 8. Data Pipeline: Record Generation → Storage → Display

### 8.1 Full Pipeline Trace

```
 CREATION (Dashboard)
 ─────────────────────────────────────────────────────
 edit_records.js:  User fills form → clicks "Save Draft"
       │
       ▼
 POST /api/v1/records/draft  (DraftRecordRequest JSON)
       │
       ▼
 api_records.rs:  handle_save_record_draft()
       │
       ▼
 sqlite.rs:  save_record_draft()
             INSERT OR REPLACE INTO record_drafts
             (id, name, type, region, payload, created_at)
             payload = full DraftRecordRequest as JSON blob

 PUBLICATION (Dashboard)
 ─────────────────────────────────────────────────────
 edit_records.js:  User fills form → clicks "Save & Publish"
       │
       ▼
 POST /api/v1/records/publish  (PublishRecordRequest JSON)
       │
       ▼
 api_records.rs:  handle_publish_record()
       │
       ├──► TryFrom: PublishRecordRequest → Record
       │    (maps category/era strings to enums,
       │     sets defaults for picture_bytes, bibliography,
       │     content, secondary_verse)
       │
       ├──► sqlite.rs: store_record()
       │    INSERT OR REPLACE INTO records
       │    (id, title, summary, json_data, created_at, updated_at)
       │    json_data = full Record serialized as JSON
       │
       └──► chroma.rs: store_record()
            Embeds full Record JSON as vector
            Upserts into ChromaDB "records" collection

 RETRIEVAL & DISPLAY (Public / Dashboard)
 ─────────────────────────────────────────────────────
 refresh_records.js / edit_records.js:  fetch on page load
       │
       ▼
 GET /api/v1/records
       │
       ▼
 api_records.rs:  handle_record_list()
       │
       ▼
 sqlite.rs:  get_records()
             SELECT json_data FROM records ORDER BY created_at DESC
       │
       ▼
 Deserialize each json_data → Record struct
       │
       ▼
 Wrap in ApiResponse<RecordListResponse>
 { status, message, data: { count, records: [...] } }
       │
       ▼
 Frontend JS: iterate records array
       ├──► createRecordCard(r)   → #record-grid
       └──► createRecordFeedItem(r) → #record-feed  [NEW — needs record_feed.js]
```

### 8.2 Pipeline Gaps

The pipeline is complete from creation through storage. The gap is entirely on the display side:

1. **`record_feed.js` does not exist** — the final rendering step for the feed view has no implementation.
2. **API URL mismatch** — `refresh_records.js` calls the wrong endpoint, so the public page never receives data.
3. **Response unwrapping** — the JS files don't unwrap `ApiResponse.data.records`, so even with the correct URL, they'd try to iterate the wrapper object.

### 8.3 Is the Backend Code Complete?

Yes. The backend pipeline — from `PublishRecordRequest` DTO through validation, dual-storage (SQLite + ChromaDB), and retrieval via `get_records()` — is fully wired and functional. No backend changes are needed for the feed feature (Phase 5 pagination is optional/future).

One note: the `PublishRecordRequest` DTO (in `dtos.rs`) has limited fields compared to the full Record. It maps `picture_bytes` to an empty `Vec`, `bibliography` to empty, and `secondary_verse` to `None`. These fields can only be populated by directly constructing a Record via `Record::try_new()` — the dashboard publish form doesn't yet support all 14 fields (e.g. picture upload constructs the bytes but the DTO doesn't carry them through). This is a pre-existing limitation, not introduced by this feature.

---

## 9. Schema Reconciliation (Rust ↔ SQL)

**Status:** Complete — fixes applied 10 March 2026.

### 9.1 The Problem

A critical mismatch existed between the live SQLite schema and the Rust storage layer. The actual `records` table used flat columns (`name`, `category`, `era`, `latitude`, `longitude`, `primary_verse`, `secondary_verse`, `description`, `passion_day`, `passion_hour`), but `sqlite.rs::store_record()` was attempting to write to non-existent columns (`title`, `summary`, `json_data`). Similarly `get_records()` attempted `SELECT json_data FROM records`, which would always fail. The `record_drafts` table lacked `name`, `type`, and `region` columns that `save_record_draft()` tried to bind.

### 9.2 Fix Strategy: Hybrid Flat + JSON Blob

Rather than replacing the existing flat-column schema (which would require a destructive migration and lose the 2 seed rows), we adopted a **hybrid flat-column + JSON blob** approach:

- **Flat scalar columns** — kept for all indexable/filterable fields: `id`, `name`, `category`, `era`, `map_label`, `latitude`, `longitude`, `primary_verse`, `secondary_verse`, `passion_day`, `passion_hour`, `description`, `created_at`, `updated_at`.
- **JSON blob columns** — added for all complex nested Rust types that cannot be represented as flat SQL scalars: `metadata_json` (`Metadata`), `content_json` (`ContentEntry`), `map_json` (`InteractiveMap`), `timeline_json` (`TimelineEntry`), `bibliography` (`Vec<Source>`).
- **BLOB column** — added `picture_bytes` for raw PNG bytes.

### 9.3 Changes Made

**`app/app_storage/database/schema.sql`** — Updated `CREATE TABLE IF NOT EXISTS` for both tables to match the full Rust struct with all new columns and correct CHECK constraints.

**`app/app_storage/src/sqlite.rs`** — Rewrote four functions:

| Function | Old | New |
|---|---|---|
| `store_record` | Wrote to `title`, `summary`, `json_data` (don't exist) | Writes all 20 columns: 12 flat scalars + 5 JSON blobs + `picture_bytes` + 2 timestamps |
| `get_records` | `SELECT json_data`, deserialised whole Record from one blob | SELECTs all named columns, deserialises blobs for nested types, reconstructs full `Record` struct |
| `save_record_draft` | Used optional field access on `name`/`type`/`region` | Title-cases `type`/`region` to satisfy CHECK constraints; binds all 6 columns |
| `get_draft_records` | No change in logic — still reads `payload` blob | Unchanged |

**Live database migration** — Added new columns to the existing `.db` file via `ALTER TABLE ADD COLUMN` without losing the 2 seed records:

```sql
-- records table: 8 new columns added
ALTER TABLE records ADD COLUMN map_label TEXT NOT NULL DEFAULT 'Overview';
ALTER TABLE records ADD COLUMN picture_bytes BLOB;
ALTER TABLE records ADD COLUMN bibliography TEXT NOT NULL DEFAULT '[]';
ALTER TABLE records ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE records ADD COLUMN content_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE records ADD COLUMN map_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE records ADD COLUMN timeline_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE records ADD COLUMN updated_at TEXT;

-- record_drafts table: 4 new columns added
ALTER TABLE record_drafts ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE record_drafts ADD COLUMN type TEXT NOT NULL DEFAULT 'Theme';
ALTER TABLE record_drafts ADD COLUMN region TEXT NOT NULL DEFAULT 'Overview';
ALTER TABLE record_drafts ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**`app/app_ui/src/api_widgets.rs`** — Fixed `build_record_from_item()`:
- Added `TimelineEra` to imports.
- Changed `era: None` to a derived default: Events/Locations/Persons default to `TimelineEra::Ministry`; Themes default to `TimelineEra::Theme`. This satisfies the `NOT NULL` constraint on the `era` column in the `records` table and prevents records inserted via the DB Populator widget from being silently dropped.

### 9.4 Serde / JSON / WASM Compatibility

All types in the data pipeline are correctly annotated:

| Type | Serde Output | WASM |
|---|---|---|
| `Classification` | `"Event"` / `"Location"` / `"Person"` / `"Theme"` (PascalCase) | `#[wasm_bindgen]` ✓ |
| `TimelineEra` | `"pre-incarnation"` / `"birth"` / `"life"` / `"ministry"` / `"passion"` / `"response"` / `"return"` / `"theme"` (kebab-case via `rename_all`) | `#[wasm_bindgen]` ✓ |
| `MapType` | `"Galilee"` / `"Jerusalem"` / `"Judea"` / `"Levant"` / `"Rome"` / `"Overview"` (PascalCase) | `#[wasm_bindgen]` ✓ |
| `BibleVerse` | `{"book": "John", "chapter": 3, "verse": 16}` | via `Serialize/Deserialize` ✓ |
| `Metadata` | `{"id": "...", "keywords": [...], "toggle": "..."}` | `#[wasm_bindgen]` ✓ |
| `InteractiveMap` | Full JSON including `points` array | `#[wasm_bindgen(getter_with_clone)]` ✓ |
| `TimelineEntry` | Full JSON including `era` (kebab-case) | `#[wasm_bindgen(getter_with_clone)]` ✓ |
| `ContentEntry` | Full JSON | `#[wasm_bindgen(getter_with_clone)]` ✓ |
| `Record` | Full JSON, all 14 fields | `#[wasm_bindgen(getter_with_clone)]` ✓ |

The JS display layer (`record_feed.js`) can safely read all fields from the JSON returned by `GET /api/v1/records`.

### 9.5 Remaining Notes

- **`passion_day` / `passion_hour`**: These columns exist in the DB and the `Record` struct does not have matching top-level fields — they would need to be added to `Record` or derived from `timeline.era` + metadata if Passion Week chronology is ever displayed in the feed. For now they are stored as `NULL`.
- **`parent_id`**: The `records` table has a `parent_id` self-referential FK for hierarchy, but `Record` has no matching field. This column is silently omitted on write (defaults to `NULL`) and is available for a future hierarchical records feature.
- **`EntryToggle`**: The DB `metadata` table has `CHECK (toggle IN ('On', 'Off'))` but the Rust `EntryToggle` enum has variants `Record | Challenge | Response | Context`. This mismatch exists in the metadata subsystem, not the records table, and is outside the scope of this project.
