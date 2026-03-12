[PASS] app/app_core/src/types/record/record.rs — Verified 14 fields, schema version 1.1.0, and RecordGatekeeper validation logic.
[PASS] app/app_core/src/types/jesus/type.rs — Verified Classification enum with PascalCase serde.
[REFACTORED] app/app_core/src/types/jesus/timeline.rs — Refactored TimelineEra to match 8-era specification. Updated dtos.rs and api_widgets.rs.
[PASS] app/app_core/src/types/jesus/map.rs — Verified MapType (6 variants), InteractiveMap, and MapPoint structs match spec.
[PASS] app/app_core/src/types/jesus/content.rs — Verified Content enum (5 variants, lowercase serde) and ContentEntry struct match spec.
[REFACTORED] app/app_core/src/types/dtos.rs — Implemented real Bible verse parsing in TryFrom mapping and aligned DTO fields (lat/lng) with spec.
[REFACTORED] app/app_ui/src/api_records.rs — Unified search/list handlers and integrated explicit RecordGatekeeper validation.
[REFACTORED] app/app_ui/src/api_widgets.rs — Implemented real data retrieval for Map, Timeline, and Tree handlers and moved them from api_records.rs.
[PASS] app/app_storage/src/sqlite.rs — All 7 required record functions present: store_record (INSERT OR REPLACE, 20 cols), get_records (SELECT all, deserializes JSON blobs), delete_record (→ bool), wipe_records (→ usize), save_record_draft, get_draft_records, delete_record_draft.
[PASS] app/app_storage/src/chroma.rs — All 4 required record functions present: store_record (embeds full JSON, upserts into "records" collection), query_records (→ Vec<String>), delete_record (by ULID), wipe_records (deletes + recreates empty "records" collection).
[REFACTORED] app/app_storage/database/schema.sql — Fixed `era` CHECK constraint in `records` table: replaced abbreviated values (birth, life, ministry, passion, response, return) with the canonical 8 kebab-case TimelineEra strings (birth-early-life, baptism-preparation, galilean-ministry, judean-ministry, passion-crucifixion, resurrection-ascension). record_drafts table (7 cols, correct CHECK constraints) passed unchanged.
[PASS] app/app_ui/src/router.rs — All 9 required record routes registered: POST /records/publish, PUT /records/:id, DELETE /records/:id, GET /records, POST /records/draft, GET /records/drafts, GET /expand_verse, POST /admin/populate, DELETE /admin/wipe-records.
[REFACTORED] frontend/records.html — All required elements (#search-input, #search-btn, #record-grid, #record-feed, .record-view-tabs) and script includes (record_card.js, record_feed.js, refresh_records.js, search_records.js, toggle_record_view.js, feed_controls.js, show_draft_record.js) present. Added missing inline ?verse and ?id query param highlight script.
[REFACTORED] frontend/private/dashboard.html — All CRUD form fields present (name, description, category, primary_verse, timeline era/event_name, map region/lat/lng). Fixed era dropdown values from old abbreviated shorthand to canonical kebab-case TimelineEra strings. edit_records.js, wgt_records_viewer.js includes and #viewer-results-list all present.
[PASS] frontend/evidence.html — Verified Ardor tree nodes have `data-node` attributes and the `js/ardor_tree.js` script is included.
[REFACTORED] frontend/timeline.html — Replaced old mismatched timeline periods (birth, preparation, etc.) with the 8 canonical TimelineEra kebab-case values (pre-incarnation through theme). Also fixed a typo in the included script tag (suffle_right.js -> shuffle_right.js).
[PASS] frontend/maps/maps.html — Verified it contains links to all 5 regional map pages (galilee, jerusalem, judea, levant, rome).
[REFACTORED] frontend/maps/galilee/galilee.html — Verified `data-loc` attributes present. Fixed relative script path `js/map_zoom.js` to absolute `/js/map_zoom.js`.
[REFACTORED] frontend/maps/jerusalem/jerusalem.html — Verified `data-loc` attributes present. Fixed relative script path `js/map_zoom.js` to absolute `/js/map_zoom.js`.
[REFACTORED] frontend/maps/judea/judea.html — Verified `data-loc` attributes present. Fixed relative script path `js/map_zoom.js` to absolute `/js/map_zoom.js`.
[REFACTORED] frontend/maps/levant/levant.html — Verified `data-loc` attributes present. Fixed relative script path `js/map_zoom.js` to absolute `/js/map_zoom.js`.
[REFACTORED] frontend/maps/rome/rome.html — Verified `data-loc` attributes present. Fixed relative script path `js/map_zoom.js` to absolute `/js/map_zoom.js`.
[PASS] frontend/context.html — Verified `#hero-placeholder` and `js/context_hero.js` script include are both present.
[PASS] frontend/challenge_academic.html — Verified `#hero-placeholder` and `js/challenge_academic_hero.js` script include are both present.
[PASS] frontend/_footer.html — Verified `#btn-toggle-links` button is present.
[PASS] frontend/list_miracles.html — Verified `<ul class="record-list">` with standard structure (title + Bible ref) is present.
[REFACTORED] frontend/list_events.html — Standard `<li>` structure matches. Fixed a stray `</div <section>` typo found around line 313.
[PASS] frontend/list_people.html — Verified `<ul class="record-list">` with standard structure (title + Bible ref) is present.
[PASS] frontend/list_places.html — Verified `<ul class="record-list">` with 'places' structure (Name, span(Ref), description) is present.
[PASS] frontend/list_ot_verses.html — Verified `<ul class="record-list">` with 'ot_verses' structure (Name, EM dash, text) is present.
[PASS] frontend/list_objects.html — Verified `<ul class="record-list">` with standard structure (title + Bible ref) is present.
[PASS] frontend/js/record_card.js — Verified exports for `createRecordCard` and `formatVerse` rendering all 14 fields.
[PASS] frontend/js/record_feed.js — Verified `createRecordFeedItem` export returning a feed item element with all required parts.
[PASS] frontend/js/refresh_records.js — Verified self-executing fetch to `/api/v1/records`, unwrapping `json.data.records`, and rendering grid and feed items.
[PASS] frontend/js/search_records.js — Verified bounds `#search-btn` click and `#search-input` keydown(Enter), calls GET `/api/v1/records?q=ENCODED_QUERY`, unwraps `json.data.records`, and renders to grid and feed.
[PASS] frontend/js/toggle_record_view.js — Verified self-executing toggle between grid and feed views, persisting to `sessionStorage`.
[PASS] frontend/js/feed_controls.js — Verified self-executing injection of `#feed-controls` with sort dropdown and MutationObserver for category chips.
[REFACTORED] frontend/js/show_draft_record.js — Fixed fetch unwrap logic to extract `json.data.records` and verified DRAFT badge rendering on `#record-grid`.
[REFACTORED] frontend/js/ardor_tree.js — Created script to bind `data-node` clicks, fetch `/api/v1/records` (unwrapping `json.data.records`), filter by node, and render to `#node-detail`.
[PASS] frontend/js/context_hero.js — Verified self-executing fetch from `/api/v1/hero_content` injecting into `#hero-placeholder`.
[REFACTORED] frontend/js/challenge_academic_hero.js — Rewrote the incorrect fetch path to point to `/api/challenges?type=academic`.
[REFACTORED] frontend/js/footer_actions.js — Rewrote toggleRecordLinks to strictly match the exact logic specified.
[REFACTORED] frontend/js/expand_verse.js — Rewrote to strictly find .primary-verse-display[data-verse], call GET /api/v1/expand_verse, and inject the text.
[CREATED] frontend/js/shuffle_left.js — Created script to handle left navigation between timeline eras.
[CREATED] frontend/js/shuffle_right.js — Created script to handle right navigation between timeline eras.
[CREATED] frontend/js/zoom.js — Created script to handle zooming in and out of the timeline era periods on the timeline view.
[REFACTORED] frontend/maps/galilee/js/map_zoom.js — Added click handlers for data-loc to pan map, fetch /api/v1/records, filter by map region and location, and append a sidebar list.
[REFACTORED] frontend/maps/jerusalem/js/map_zoom.js — Added click handlers for data-loc to pan map, fetch /api/v1/records, filter by map region and location, and append a sidebar list.
[REFACTORED] frontend/maps/judea/js/map_zoom.js — Added click handlers for data-loc to pan map, fetch /api/v1/records, filter by map region and location, and append a sidebar list.
[REFACTORED] frontend/maps/levant/js/map_zoom.js — Added click handlers for data-loc to pan map, fetch /api/v1/records, filter by map region and location, and append a sidebar list.
[REFACTORED] frontend/maps/rome/js/map_zoom.js — Added click handlers for data-loc to pan map, fetch /api/v1/records, filter by map region and location, and append a sidebar list.
[REFACTORED] frontend/private/js/edit_records.js — Verified all functions. Refactored `getPublishPayload()` to perfectly assemble a `PublishRecordRequest` structurally matching the `dtos.rs` definition (e.g. `map_data` using `lat`/`lng`).
[PASS] frontend/private/js/wgt_records_viewer.js — Verified all 3 functions: loadAndRender (fetches and renders checkbox rows), handleDelete (batch deletes via DELETE /api/v1/records/:id), and handleEdit (calls editRecordInCRUD).
[REFACTORED] frontend/private/js/widget_record_generator.js — Refactored to fetch the correct 6 list pages, aggregate extracted items into a single bulk payload, and POST to `/api/v1/admin/populate` as requested.
[PASS] frontend/js/widgets/wgt_db_populator.js — Verified all 3 functions: `initDBPopulator` sets up UI and polling, `handleDBPopulate` fetches the 6 lists and POSTs the bulk payload correctly, and `setStatus` updates the traffic-light UI.
[PASS] frontend/js/lib/list_page_parser.js — Verified all required functions are present: `parseListPage` and `parseItem` with the `standard`, `places`, and `ot_verses` strategies implemented exactly as specified.
[PASS] frontend/js/lib/bible_ref_parser.js — Verified all 4 functions: `parseBibleRef` parses strings into `{book, chapter, verse}`, `normalizeBookName` correctly maps strings to Rust `BibleBook` enums, `splitMultipleRefs` splits on semicolons/commas, and `extractParentheticalRefs` isolates refs within parentheses.
[REFACTORED] frontend/style.css — Verified existing classes (`.record-card`, `.record-feed-item`, `.record-list`, etc.) and appended missing utility classes (`.feed-controls`, `.record-link`, `.primary-verse-display`, and `.hidden`).
