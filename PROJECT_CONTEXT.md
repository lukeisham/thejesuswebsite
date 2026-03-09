# The Jesus Website — Project Context Summary

**Last Updated**: 2026-03-10
**Project Location**: `/sessions/zen-wizardly-dijkstra/mnt/thejesuswebsite/`

---

## 1. Project Overview

The Jesus Website is a full-stack application for managing and displaying biblical records related to Jesus, including events, locations, persons, and thematic content.

**Technology Stack**:
- **Backend**: Rust/Axum HTTP server
- **Storage**: SQLite (primary relational data), ChromaDB (vector search)
- **Frontend**: Vanilla JavaScript with public and authenticated dashboard views

---

## 2. Project Structure

### Directory Layout
```
thejesuswebsite/
├── app/
│   ├── app_ui/              # Axum HTTP server, API handlers, router
│   ├── app_core/            # Shared types, DTOs, business logic
│   ├── app_storage/         # SQLite and ChromaDB adapters
│   └── app_brain/           # AI/inference engine
├── frontend/                # Public views (records.html, etc.)
├── frontend/private/        # Authentication-gated dashboard
├── Add_Records_Feed_to_System_View.md
└── PROJECT_CONTEXT.md       # This file
```

---

## 3. Core Features: Records Feed

### What Was Built
A Records Feed feature was added alongside the existing card grid on both the public `records.html` page and the private dashboard. Users can toggle between grid and feed (scrollable list) views, with sorting and filtering capabilities.

### Modified/Created Files

#### Frontend Core
- **`frontend/records.html`**: Tab bar added (`data-view="grid"` / `data-view="feed"`), `#record-feed` section added
- **`frontend/private/dashboard.html`**: "Feed View" tab + `#crud-records-feed` panel added; "Records" viewer tab added
- **`frontend/js/record_feed.js`**: Exports `window.createRecordFeedItem(record)` to render individual feed items
- **`frontend/js/toggle_record_view.js`**: Toggles grid/feed tabs, persists selection to `sessionStorage`
- **`frontend/js/feed_controls.js`**: Sort dropdown + category filter chips via MutationObserver
- **`frontend/js/refresh_records.js`**: Fetches records from `/api/v1/records`, unwraps `ApiResponse` structure correctly
- **`frontend/js/search_records.js`**: Mirrors fixes from `refresh_records.js`
- **`frontend/private/js/edit_records.js`**: Dashboard CRUD form builder; feeds records into both CRUD panel and feed view
- **`frontend/private/js/wgt_records_viewer.js`**: New viewer widget for rendering checkable record rows with batch delete and edit actions

#### Backend Core
- **`app/app_ui/src/router.rs`**: Full CRUD routes wired
- **`app/app_ui/src/api_records.rs`**: Handlers for create, read, update, delete operations
- **`app/app_ui/src/api_widgets.rs`**: Fixed `build_record_from_item()` to derive era from category
- **`app/app_storage/src/sqlite.rs`**: Rewrote record CRUD methods to use correct schema
- **`app/app_storage/src/chroma.rs`**: Added `delete_record(id)` method for vector DB cleanup

---

## 4. Database Schema

### SQLite Tables

#### `records` Table (Primary Records)
```sql
id              TEXT PRIMARY KEY,
parent_id       TEXT,                    -- self-referential FK (NULL for most)
name            TEXT NOT NULL,
category        TEXT NOT NULL,           -- Event, Location, Person, Theme
era             TEXT NOT NULL,           -- derived from category at write time
latitude        REAL,
longitude       REAL,
primary_verse   TEXT,
secondary_verse TEXT,
description     TEXT,
passion_day     INTEGER,                 -- currently unused (NULL)
passion_hour    INTEGER,                 -- currently unused (NULL)
created_at      TEXT,
updated_at      TEXT,
map_label       TEXT,
picture_bytes   BLOB,
bibliography    TEXT,
metadata_json   TEXT,                    -- complex nested types stored here
content_json    TEXT,
map_json        TEXT,
timeline_json   TEXT
```

**Strategy**: Flat scalars for indexable fields; JSON blobs for complex nested types.

#### `record_drafts` Table (Draft Storage)
```sql
id        TEXT PRIMARY KEY,
payload   TEXT,                    -- full DraftRecordRequest JSON
updated_at TEXT,
name      TEXT,
type      TEXT,                    -- Theme, Event, Location, Person
region    TEXT,                    -- map region
created_at TEXT
```

### Schema Notes
- **Deprecations**: `passion_day`, `passion_hour`, and `parent_id` exist in the schema but have no matching fields in the Rust `Record` struct. They are stored as NULL.
- **Known Mismatch**: `metadata` table has a CHECK constraint on `EntryToggle` (`'On'`, `'Off'`), but the Rust enum has `Record|Challenge|Response|Context`. This is outside the current project scope.

---

## 5. Rust Type System

### Key Structs (in `app_core/src/types/`)

#### `Record`
- **Location**: `app_core/src/types/record/record.rs`
- **Fields**: 14 fields covering name, classification, verses, geo location, timeline, descriptions, metadata
- **Schema Version**: `"1.1.0"`
- **Primary Key**: ULID (`id` field)

#### Enums
- **`Classification`**: `Event | Location | Person | Theme` (PascalCase in serde)
- **`TimelineEra`**: kebab-case values
  - `"pre-incarnation"`, `"birth"`, `"life"`, `"ministry"`, `"passion"`, `"response"`, `"return"`, `"theme"`
- **`MapType`**: PascalCase values
  - `"Galilee"`, `"Jerusalem"`, `"Judea"`, `"Levant"`, `"Rome"`, `"Overview"`

### DTO Shapes

#### `PublishRecordRequest` (CREATE/UPDATE payload)
```json
{
  "name": "string",
  "description": ["string"],
  "category": "Event|Location|Person|Theme",
  "primary_verse": "John 3:16",
  "timeline": {
    "year": 0,
    "event_name": "string",
    "era": "ministry"
  },
  "map_data": {
    "region": "Overview",
    "latitude": 0.0,
    "longitude": 0.0,
    "title": "string"
  }
}
```

#### `DraftRecordRequest` (Draft storage payload)
```json
{
  "id": "optional-ulid-string",
  "name": "string",
  "type": "Theme",
  "region": "Overview"
}
```

#### `ApiResponse<T>` (Wrapper for all API responses)
```json
{
  "status": "success|error",
  "message": "string",
  "data": {
    "count": 0,
    "records": [...]
  }
}
```

**Important**: JavaScript must unwrap `json.data.records` to access the actual record array.

---

## 6. API Endpoints

### Records CRUD

| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| `GET` | `/api/v1/records` | `handle_record_list` | Fetch all records |
| `POST` | `/api/v1/records/publish` | `handle_publish_record` | Create new record |
| `PUT` | `/api/v1/records/:id` | `handle_update_record` | Update existing record (by ULID) |
| `DELETE` | `/api/v1/records/:id` | `handle_delete_record` | Delete record (by ULID) |
| `POST` | `/api/v1/records/draft` | `handle_save_record_draft` | Save draft record |
| `GET` | `/api/v1/records/drafts` | `handle_get_draft_records` | Fetch all drafts |

### Update Logic
- Parses ULID from URL path parameter
- Converts `PublishRecordRequest` DTO to `Record` struct via `TryFrom` impl
- Overrides `record.id` with the original ULID from the path
- Sets `updated_at = now()`
- Upserts via `INSERT OR REPLACE` into SQLite
- Syncs deletes to ChromaDB

---

## 7. Frontend Authentication & API Integration

### Authentication
- Bearer token stored in `sessionStorage.getItem("auth_token")`
- All API requests must include: `Authorization: Bearer <token>`

### Fixed Critical Issues
**Problem**: Initial `refresh_records.js` and `search_records.js` did not unwrap the `ApiResponse` wrapper correctly.

**Solution**: All API fetch calls now unwrap to `json.data.records` before processing:
```javascript
const response = await fetch('/api/v1/records', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const json = await response.json();
const records = json.data.records; // unwrap ApiResponse
```

---

## 8. CRUD Dashboard Implementation

### Edit Records Form (`frontend/private/js/edit_records.js`)

The dashboard's CRUD panel uses a single form that handles both create and update:

- **`getPublishPayload()`**: Builds correct nested `PublishRecordRequest` shape from form fields
- **`populateForm(record)`**: Restores all fields from a Record object, including:
  - Timeline era
  - Map region & geo coordinates
  - Primary/secondary verses
  - Keywords and bibliography
- **`publishOrUpdate()`**: Detects operation mode:
  - If `#record-id-field` is populated → `PUT /records/:id`
  - If empty → `POST /records/publish` (new record)
- **Delete**: Each record row has a `✕` delete button → `DELETE /records/:id` (with confirmation)
- **Export**: `window.editRecordInCRUD(record)` — callable from viewer panels

### Records Viewer Widget (`frontend/private/js/wgt_records_viewer.js`)

New widget that activates on "Records" viewer tab:

- Fetches all records and renders as checkable rows
- Batch delete button (with confirmation)
- "Edit in CRUD" button (single record)
- "Publish" button (currently no-op)
- Uses capture-phase event listeners to intercept shared viewer action buttons

---

## 9. Critical Bug Fixes

### Schema Reconciliation
The live SQLite `records` table had column mismatches with Rust's `store_record()` implementation.

**Fix Applied**:
1. Updated `app/app_storage/src/sqlite.rs`:
   - Rewrote `store_record()` to use all 19 correct columns
   - Rewrote `get_records()` to deserialize JSON blobs correctly
   - Rewrote `save_record_draft()` and `get_draft_records()` methods

2. Updated `app/app_ui/src/api_widgets.rs`:
   - Fixed `build_record_from_item()` bug: was setting `era: None` (violates NOT NULL constraint)
   - Now derives era from category:
     - `Event`, `Location`, `Person` → `"ministry"`
     - `Theme` → `"theme"`

### ChromaDB Sync
- Added `delete_record(id)` method to `app/app_storage/src/chroma.rs`
- Uses ChromaDB collection API: `.delete(Some(vec![id]), None, None)`

---

## 10. Known Issues & Limitations

### Unresolved
1. **Orphaned DB Columns**: `passion_day`, `passion_hour`, `parent_id` exist in schema but have no Rust struct equivalents — stored as NULL
2. **EntryToggle Mismatch**: DB `metadata` table CHECK constraint differs from Rust enum (out of scope)
3. **Legacy Scraper Widget**: `widget_record_generator.js` sends non-conformant payload to `/api/v1/records/publish` — would fail. Use `wgt_db_populator.js` instead for bulk imports

### Design Notes
- ULID primary keys used throughout for distributed ID generation
- All timestamps are ISO 8601 strings
- Vector search (ChromaDB) is synchronized via delete operations but indexing strategy for new records should be verified

---

## 11. Project Planning & Reference

**Full Project Plan**: `/sessions/zen-wizardly-dijkstra/mnt/thejesuswebsite/Add_Records_Feed_to_System_View.md` (374+ lines)
- Includes detailed schema reconciliation notes in Section 9
- Timeline and architectural decisions documented

---

## 12. Quick Reference: Common Tasks

### Adding a New Record (Backend)
1. Frontend calls `POST /api/v1/records/publish` with `PublishRecordRequest`
2. `app/app_ui/src/api_records.rs::handle_publish_record` converts to `Record`
3. `app/app_storage/src/sqlite.rs::store_record()` inserts into `records` table
4. ChromaDB indexing happens (see `app_brain/`)

### Updating a Record
1. Frontend calls `PUT /api/v1/records/:id` with `PublishRecordRequest`
2. Handler extracts ULID from path, overrides `record.id`, sets `updated_at = now()`
3. `INSERT OR REPLACE` into SQLite (upsert)
4. ChromaDB sync required

### Deleting a Record
1. Frontend calls `DELETE /api/v1/records/:id`
2. `handle_delete_record` calls `app/app_storage/src/sqlite.rs::delete_record(id)`
3. Also calls ChromaDB delete: `.delete(Some(vec![id]), None, None)`

### Saving a Draft
1. Frontend calls `POST /api/v1/records/draft` with `DraftRecordRequest`
2. Stored in `record_drafts` table with optional ULID, name, type, region

---

## 13. Session Continuation Checklist

When picking up work on this project, verify:
- [ ] SQLite migrations are applied (19 columns on `records` table)
- [ ] Rust `Record` struct is at SCHEMA_VERSION `"1.1.0"`
- [ ] API endpoints are wired in `app/app_ui/src/router.rs`
- [ ] Frontend `Bearer` token is present in `sessionStorage`
- [ ] `ApiResponse` wrapper is being unwrapped correctly in JS
- [ ] ULID parsing in URL path params works correctly
- [ ] ChromaDB delete is synchronized with SQLite deletes

---

**End of Project Context**
