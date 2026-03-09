/**
 * glossary_records.js
 * ────────────────────
 * Glossary content for the Records topic.
 * Exposes window.GLOSSARY_RECORDS = { tabId, html }.
 *
 * To add a new topic, create a new file following this same pattern:
 *   window.GLOSSARY_<TOPIC> = { tabId: "crud-<topic>", html: `...` };
 * Then add one <script> tag to dashboard.html. No other wiring needed.
 */

window.GLOSSARY_RECORDS = {

    tabId: "crud-records",

    html: `
<div class="glossary-topic">

  <!-- ═══════════════════════════════════════════════════════════════
       DIAGRAMS
  ══════════════════════════════════════════════════════════════════ -->

  <h4 class="glossary-heading">Data Flow: Record Creation &amp; Storage</h4>
  <pre class="glossary-diagram">
 Path A: Dashboard CRUD Form               Path B: DB Populator Widget
 ─────────────────────────                  ───────────────────────────
 dashboard.html                             wgt_db_populator.js
 └─ edit_records.js                         └─ list_page_parser.js
    └─ getPublishPayload()                     ├─ Fetches 6 HTML list pages
       { name, description,                    ├─ Parses &lt;li&gt; items + Bible refs
         category, primary_verse,              └─ POSTs bulk payload to:
         timeline: {era, event_name},             POST /api/v1/admin/populate
         map_data: {region, lat, lng} }            └─ api_widgets.rs
                                                      handle_admin_populate()
    NEW  → POST /api/v1/records/publish               build_record_from_item()
    EDIT → PUT  /api/v1/records/:id
                │
                ▼
       api_records.rs
       handle_publish_record / handle_update_record
       ├─ Deserialise PublishRecordRequest DTO
       ├─ TryFrom → core Record struct
       │   (category→Classification, era→TimelineEra,
       │    region→MapType, verse str→BibleVerse)
       └─ RecordGatekeeper validates:
           name ≤ 80 chars · PNG magic bytes · description non-empty
                │
       ┌────────┴────────┐
       ▼                 ▼
  sqlite.rs         chroma.rs
  store_record()    store_record()
  INSERT OR REPLACE  Embed JSON → upsert
  20 columns:        "records" collection
  · 12 flat scalars  (vector semantic search)
  · 5 JSON blobs
  · picture BLOB
  · 2 timestamps
</pre>

  <h4 class="glossary-heading">Data Flow: Record Display</h4>
  <pre class="glossary-diagram">
 Public: records.html              Dashboard: dashboard.html
 ─────────────────────             ──────────────────────────
 refresh_records.js (page load)    edit_records.js (page load)
 search_records.js  (user query)   wgt_records_viewer.js (viewer tab)
         │                                   │
         ▼                                   ▼
    GET /api/v1/records           GET /api/v1/records
    (or ?q=QUERY → ChromaDB)      (with Bearer auth header)
         │
         ▼
  api_records.rs: handle_record_list()
  sqlite.rs: get_records()
  · SELECT all 20 columns
  · Deserialise JSON blobs → Rust structs
  · Return ApiResponse&lt;RecordListResponse&gt;
    { status, message,
      data: { count, records: [...] } }
         │
         │  JS must unwrap: json.data.records
         │
    ┌────┼───────────────────────────────────┐
    ▼    ▼                                   ▼
 Grid   Feed                           Dashboard list
 ─────  ──────                         ──────────────
 record_card.js    record_feed.js      edit_records.js
 createRecord      createRecord        renderList()
 Card(r)           FeedItem(r)         · name + category badge
 · 14 fields       · thumbnail         · ✕ delete button
   fully             title             · click → populateForm(r)
   rendered          snippet
                     era + cat badges  Viewer panel
 #record-grid      #record-feed        wgt_records_viewer.js
 (3-col CSS)       (single col)        · checkbox rows
                                       · Delete (batch)
 toggle_record_view.js                 · Edit in CRUD (single)
 · Grid ↔ Feed tab
 · persists to sessionStorage

 feed_controls.js
 · sort: newest / oldest / A-Z / category
 · category filter chips via MutationObserver
</pre>

  <!-- ═══════════════════════════════════════════════════════════════
       FILE REFERENCE — grouped by layer, collapsible
  ══════════════════════════════════════════════════════════════════ -->

  <h4 class="glossary-heading" style="margin-top:1.2rem;">File &amp; Function Reference</h4>

  <!-- ── Backend: Core Types ── -->
  <details class="glossary-section">
    <summary>Backend — Core Types</summary>
    <table class="glossary-table">
      <thead><tr><th>File</th><th>Export / Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td rowspan="5"><code>record/record.rs</code></td>
            <td><code>Record</code> struct</td>
            <td>14 fields · SCHEMA_VERSION 1.1.0</td></tr>
        <tr><td><code>Record::try_new(…)</code></td><td>Validated constructor → Result&lt;Record, RecordError&gt;</td></tr>
        <tr><td><code>RecordGatekeeper::validate_name</code></td><td>Name ≤ 80 chars, non-empty</td></tr>
        <tr><td><code>RecordGatekeeper::validate_image_format</code></td><td>PNG magic bytes check</td></tr>
        <tr><td><code>RecordGatekeeper::validate_description</code></td><td>Non-empty · each line ≤ 1000 chars</td></tr>
        <tr><td><code>jesus/type.rs</code></td>
            <td><code>Classification</code></td>
            <td>Event | Location | Person | Theme (PascalCase serde)</td></tr>
        <tr><td><code>jesus/timeline.rs</code></td>
            <td><code>TimelineEra</code></td>
            <td>8 variants · kebab-case serde: pre-incarnation … theme</td></tr>
        <tr><td><code>jesus/map.rs</code></td>
            <td><code>MapType</code> / <code>InteractiveMap</code> / <code>MapPoint</code></td>
            <td>Galilee | Jerusalem | Judea | Levant | Rome | Overview</td></tr>
        <tr><td><code>jesus/content.rs</code></td>
            <td><code>Content</code> / <code>ContentEntry</code></td>
            <td>Miracle | Parable | Saying | Sermon | Other (lowercase serde)</td></tr>
        <tr><td rowspan="3"><code>dtos.rs</code></td>
            <td><code>PublishRecordRequest</code></td>
            <td>{ name, description, category, primary_verse, timeline, map_data }</td></tr>
        <tr><td><code>DraftRecordRequest</code></td><td>{ id?, name, type, region }</td></tr>
        <tr><td><code>TryFrom&lt;PublishRecordRequest&gt; for Record</code></td><td>Parses enums · maps all DTO fields to core Record</td></tr>
      </tbody>
    </table>
  </details>

  <!-- ── Backend: API Handlers ── -->
  <details class="glossary-section">
    <summary>Backend — API Handlers</summary>
    <table class="glossary-table">
      <thead><tr><th>Handler</th><th>Route</th><th>Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>handle_publish_record</code></td><td>/api/v1/records/publish</td><td>POST</td><td>Create → SQLite + ChromaDB</td></tr>
        <tr><td><code>handle_update_record</code></td><td>/api/v1/records/:id</td><td>PUT</td><td>Upsert by ULID · sets updated_at</td></tr>
        <tr><td><code>handle_delete_record</code></td><td>/api/v1/records/:id</td><td>DELETE</td><td>Removes from both stores · 404 if missing</td></tr>
        <tr><td><code>handle_record_list</code></td><td>/api/v1/records</td><td>GET</td><td>All published records</td></tr>
        <tr><td><code>handle_record_search</code></td><td>/api/v1/records?q=</td><td>GET</td><td>Semantic search via ChromaDB</td></tr>
        <tr><td><code>handle_save_record_draft</code></td><td>/api/v1/records/draft</td><td>POST</td><td>Save lightweight draft</td></tr>
        <tr><td><code>handle_get_draft_records</code></td><td>/api/v1/records/drafts</td><td>GET</td><td>List all drafts</td></tr>
        <tr><td><code>handle_expand_verse</code></td><td>/api/v1/expand_verse?q=</td><td>GET</td><td>ESV Bible API proxy</td></tr>
        <tr><td><code>handle_admin_populate</code></td><td>/api/v1/admin/populate</td><td>POST</td><td>Bulk import via DB Populator widget</td></tr>
        <tr><td><code>handle_admin_wipe_records</code></td><td>/api/v1/admin/wipe-records</td><td>DELETE</td><td>Wipe all records (used before repopulate)</td></tr>
      </tbody>
    </table>
    <p class="glossary-note">All handlers live in <code>app/app_ui/src/api_records.rs</code> (except populate/wipe → <code>api_widgets.rs</code>). Routes registered in <code>router.rs</code>.</p>
  </details>

  <!-- ── Backend: Storage ── -->
  <details class="glossary-section">
    <summary>Backend — Storage</summary>
    <table class="glossary-table">
      <thead><tr><th>Layer</th><th>Method</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td rowspan="7"><code>sqlite.rs</code></td>
            <td><code>store_record(record)</code></td>
            <td>INSERT OR REPLACE · 20 cols: 12 flat scalars + 5 JSON blobs + picture BLOB + 2 timestamps</td></tr>
        <tr><td><code>get_records()</code></td><td>SELECT all cols · deserialise blobs · reconstruct Record</td></tr>
        <tr><td><code>delete_record(id) → bool</code></td><td>DELETE by ULID · true if row existed</td></tr>
        <tr><td><code>wipe_records() → usize</code></td><td>DELETE all · returns row count</td></tr>
        <tr><td><code>save_record_draft(draft)</code></td><td>INSERT OR REPLACE into record_drafts</td></tr>
        <tr><td><code>get_draft_records()</code></td><td>SELECT payload → deserialise DraftRecordRequest</td></tr>
        <tr><td><code>delete_record_draft(id)</code></td><td>DELETE draft by id</td></tr>
        <tr><td rowspan="4"><code>chroma.rs</code></td>
            <td><code>store_record(record)</code></td>
            <td>Embed full JSON · upsert into "records" collection</td></tr>
        <tr><td><code>query_records(query)</code></td><td>Semantic search · returns Vec of JSON strings</td></tr>
        <tr><td><code>delete_record(id)</code></td><td>Remove single doc by ULID</td></tr>
        <tr><td><code>wipe_records()</code></td><td>Delete + recreate empty "records" collection</td></tr>
        <tr><td><code>schema.sql</code></td>
            <td><code>records</code> table</td>
            <td>20 cols · category CHECK (Event/Location/Person/Theme) · era CHECK (8 eras) · map_label CHECK (6 regions)</td></tr>
        <tr><td></td>
            <td><code>record_drafts</code> table</td>
            <td>7 cols · type + region CHECK constraints match records table</td></tr>
      </tbody>
    </table>
  </details>

  <!-- ── Frontend: Public JS ── -->
  <details class="glossary-section">
    <summary>Frontend — Public JS (records.html)</summary>
    <table class="glossary-table">
      <thead><tr><th>File</th><th>Function / Export</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>record_card.js</code></td>
            <td><code>window.createRecordCard(r)</code></td>
            <td>Full 14-field card as &lt;article class="record-card"&gt;</td></tr>
        <tr><td></td>
            <td><code>window.formatVerse(v)</code></td>
            <td>{ book, chapter, verse } → "Book Ch:Vs" string</td></tr>
        <tr><td><code>record_feed.js</code></td>
            <td><code>window.createRecordFeedItem(r)</code></td>
            <td>Compact feed item: thumbnail, title, 120-char snippet, era/category badges</td></tr>
        <tr><td><code>refresh_records.js</code></td>
            <td>(self-executing)</td>
            <td>Page load: GET /api/v1/records → populate #record-grid + #record-feed</td></tr>
        <tr><td><code>search_records.js</code></td>
            <td>(self-executing)</td>
            <td>Binds #search-input/#search-btn · GET /api/v1/records?q= · renders results</td></tr>
        <tr><td><code>toggle_record_view.js</code></td>
            <td>(self-executing)</td>
            <td>Grid ↔ Feed tab toggle · persists choice to sessionStorage</td></tr>
        <tr><td><code>feed_controls.js</code></td>
            <td>(self-executing)</td>
            <td>Injects #feed-controls · sort dropdown · category chips via MutationObserver</td></tr>
        <tr><td><code>show_draft_record.js</code></td>
            <td><code>refreshDraftRecords()</code></td>
            <td>GET /api/v1/records/drafts · appends orange-badged draft cards to grid</td></tr>
      </tbody>
    </table>
  </details>

  <!-- ── Frontend: Admin JS ── -->
  <details class="glossary-section">
    <summary>Frontend — Admin JS (dashboard)</summary>
    <table class="glossary-table">
      <thead><tr><th>File</th><th>Function / Export</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td rowspan="8"><code>private/js/edit_records.js</code></td>
            <td><code>loadRecords()</code></td>
            <td>GET /api/v1/records with auth → renders list + feed</td></tr>
        <tr><td><code>renderList(records)</code></td><td>List rows with name, badge, ✕ delete button + feed items</td></tr>
        <tr><td><code>populateForm(r)</code></td><td>Fills all form fields from a Record object</td></tr>
        <tr><td><code>clearForm()</code></td><td>Resets all fields · sets heading to "New Record"</td></tr>
        <tr><td><code>getPublishPayload()</code></td><td>Collects form → PublishRecordRequest shape</td></tr>
        <tr><td><code>publishOrUpdate()</code></td><td>id in form → PUT /records/:id · no id → POST /records/publish</td></tr>
        <tr><td><code>deleteRecord(id)</code></td><td>DELETE /records/:id with confirmation · removes row from DOM</td></tr>
        <tr><td><code>window.editRecordInCRUD(r)</code></td><td>Global: fills form + switches to CRUD tab (called by viewer)</td></tr>
        <tr><td rowspan="3"><code>private/js/wgt_records_viewer.js</code></td>
            <td><code>loadAndRender()</code></td>
            <td>GET /records → checkbox rows in #viewer-results-list</td></tr>
        <tr><td><code>handleDelete()</code></td><td>Batch-deletes all checked records</td></tr>
        <tr><td><code>handleEdit()</code></td><td>Calls window.editRecordInCRUD() with first selected record</td></tr>
        <tr><td><code>private/js/widget_record_generator.js</code></td>
            <td>(auto-scraper)</td>
            <td>Scrapes 6 resource HTML pages · extracts Bible refs via regex · bulk posts to /admin/populate</td></tr>
      </tbody>
    </table>
  </details>

  <!-- ── Frontend: CSS ── -->
  <details class="glossary-section">
    <summary>Frontend — CSS Classes (style.css)</summary>
    <table class="glossary-table">
      <thead><tr><th>Class</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>.record-card</code></td><td>Grid card container with hover shadow + transform</td></tr>
        <tr><td><code>.record-card__header</code> <code>.__verse</code> <code>.__image</code> <code>.__desc</code> <code>.__sources</code> <code>.__meta</code> <code>.__timestamps</code></td><td>Card subsections</td></tr>
        <tr><td><code>.record-card__keywords</code></td><td>Keyword badge chips</td></tr>
        <tr><td><code>.record-feed-item</code></td><td>Feed row container</td></tr>
        <tr><td><code>.record-feed-item__thumb</code> <code>.__body</code> <code>.__title</code> <code>.__snippet</code> <code>.__verse</code> <code>.__meta</code> <code>.__badge</code> <code>.__location</code> <code>.__date</code></td><td>Feed item subsections</td></tr>
        <tr><td><code>.record-view-tabs</code></td><td>Grid / Feed toggle tab bar on records.html</td></tr>
        <tr><td><code>.record-search</code> <code>.record-search__input</code> <code>.record-search__btn</code></td><td>Search bar layout</td></tr>
        <tr><td><code>.feed-controls</code></td><td>Sort / filter UI wrapper</td></tr>
      </tbody>
    </table>
  </details>

</div>
`

};
