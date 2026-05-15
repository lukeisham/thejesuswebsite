---
name: records_nomenclature.md
purpose: Glossary of terms used throughout the Records Module and the broader codebase
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md]
---

# Records Nomenclature — 2.0 Records Module

## Global Terms (Codebase-Wide)

| Term | Definition |
|------|------------|
| **The Living Museum** | Name of the overall colour palette and design aesthetic — warm parchment tones and charcoal ink evoking an archival/museum feel |
| **Technical Blueprint** | Design philosophy — sharp corners, 1px structural borders, monospace metadata, dashed blueprint-style dividers |
| **8px Grid** | Foundational spacing system — all spacing values are multiples of 8px, tokenised via `--space-{n}` |
| **BEM** | Naming convention (Block__Element--Modifier) used for all CSS component classes across the entire codebase |
| **CSS Custom Properties (Design Tokens)** | Centralised design tokens defined in `typography.css` under `:root`, including colour, typography, spacing, shadow, border, and transition tokens |
| **Colour Tokens** | `--color-*` design tokens defining the palette: `bg-primary` (Soft Parchment), `text-primary` (Charcoal Ink), `accent-primary` (Deep Oxblood), `border` (Clay Stone), `status-success` (Blueprint Green), and others |
| **Typography Tokens** | `--font-*` (body, essay, heading, mono) and `--text-*` (xs through 4xl) tokens defining font families and type scale |
| **Spacing Tokens** | `--space-*` tokens (1 through 16) implementing the 8px grid system |
| **Deep Oxblood** | `#8e3b46` — primary accent colour used for links, active states, key hovers, and loading indicators across all modules |
| **Charcoal Ink** | `#242423` — primary text colour for body copy and headings |
| **Soft Parchment** | `#fcfbf7` — main page background colour |
| **Providence** | Dashboard 2-column grid system with permanent 1px structural divider and width hooks (`#providence-col-sidebar`, `#providence-col-main`) |
| **Page Shell** | The top-level CSS Grid layout (`#page-shell`) with named grid areas: `header`, `sidebar`, `main`, `footer` |
| **Oxblood Pulse** | `@keyframes oxblood-pulse` — CSS opacity-pulse animation for indeterminate loading states |
| **Registration Marks** | Decorative L-shaped corner cut marks (1px dashed Oxblood) applied via `.has-registration-mark` — evoking print/archival aesthetics |
| **State Classes** | Composable feedback classes: `.state-loading`, `.state-success`, `.state-error`, `.state-disabled` used across all modules |
| **Utility Classes** | `.is-hidden`, `.is-visible`, `.is-visible-flex`, `.is-visible-grid`, `.is-active`, `.is-open`, `.is-dragging`, `.is-loading` for JS-controlled visibility states |
| **Invisible SEO Header** | `<header id="invisible-header" aria-hidden="true">` — zero-height DOM anchor used by `header.js` to inject SEO metadata |
| **`data-*` Body Attributes** | Standardised `data-page-title`, `data-page-description`, `data-page-canonical`, `data-og-type`, `data-og-image` attributes on `<body>` consumed by `initializer.js` |
| **AI Metadata Directives** | `<meta name="ai:purpose" content="historical-evidence-archive">`, `<meta name="ai:subject">`, `<meta name="ai:reading-level" content="academic">` — LLM-specific hints injected on every page |
| **AI-Welcoming** | Design principle giving LLM crawlers (GPTBot, ChatGPT-User, Google-Extended, Claude-Web, DeepSeek, CCBot) fast, unrestricted access in `robots.txt` |
| **Icon System** | `.icon` base class with size modifiers (`--sm`, `--md`, `--lg`) and colour variants (`--accent`, `--muted`) — thin-line stroke SVG aesthetic |

## Module-Specific Terms (2.0 Records Module)

| Term | Type | Definition |
|------|------|------------|
| **Record** | Data Type | A historical evidence entry with `type='record'` discriminator in the polymorphic single-table database. Contains core identifiers, description, taxonomy, verses, external references, and metadata |
| **Era** | Taxonomy Enum | Chronological period for a record. Values: `PreIncarnation`, `OldTestament`, `EarlyLife`, `Life`, `GalileeMinistry`, `JudeanMinistry`, `PassionWeek`, `Post-Passion` |
| **Timeline** | Taxonomy Enum | Fine-grained chronological position within an Era. 39 values from `PreIncarnation` through `ReturnOfJesus`, representing the full Gospel narrative sequence |
| **Gospel Category** | Taxonomy Enum | Narrative classification of a record. Values: `event`, `location`, `person`, `theme`, `object` |
| **Map Label** | Taxonomy Enum | Geographic scope for map placement. Values: `Overview`, `Empire`, `Levant`, `Judea`, `Galilee`, `Jerusalem`, `Supernatural`, `Spiritual` |
| **Geo ID** | DB Column | Integer (0–999) referencing a coordinate entry in the maps geo database, linking a record to a map pin |
| **Primary Verse** | DB Column | Main Bible verse reference stored as JSON array `[{book, chapter, verse}]` — limited to one verse |
| **Secondary Verse** | DB Column | Additional Bible verse references stored as JSON array `[{book, chapter, verse}, ...]` — accepts multiple verses |
| **Description** | DB Column | Multi-paragraph record body stored as a JSON array of strings (`["para1", "para2", ...]`), rendered by the paragraph editor and frontend views |
| **Snippet** | DB Column | Abbreviated description preview (JSON array or plain text), auto-generated via DeepSeek API or manually entered |
| **IAA** | DB Column | International Article Abbreviation — external reference identifier linking the record to scholarly sources |
| **Pledius** | DB Column | Pledius reference identifier — external reference linking the record to the Pledius system |
| **Manuscript** | DB Column | Manuscript reference identifier — external reference linking the record to a physical manuscript |
| **Context Links** | DB Column | JSON array of related record slugs used for cross-referencing between records |
| **TheJesusDB** | JS Global Object | `window.TheJesusDB` — WASM SQLite database interface exposed on public frontend pages. Provides `runQuery()`, `getRecord()`, `getRecordList()`, `searchRecords()` for zero-latency client-side queries |
| **`thejesusdb:ready`** | Custom Event | Dispatched on `window` when the WASM SQLite database finishes loading, signalling frontend view scripts to begin rendering |
| **`renderRecordsAll()`** | JS Function | Entry point called by `dashboard_app.js` to initialize the All Records dashboard — sets layout, injects template, loads CSS/JS dependencies, wires submodules |
| **`renderRecordsSingle(recordId)`** | JS Function | Entry point called by `dashboard_app.js` to initialize the Single Record editor — resolves record ID, loads form template, initializes all sub-editor components |
| **`collectAllFormData()`** | JS Function | Master function that gathers all 7 form sections into a single API payload by calling sub-collectors (`collectTaxonomy`, `collectVerses`, `collectDescription`, etc.). Does not set `status` — callers (`handleSaveDraft`, `handlePublish`) set status explicitly after collection |
| **Function Bar** | UI Component | Sticky top bar on the Single Record editor containing Save Draft, Publish, and Delete action buttons (`.function-bar`) |
| **Section Nav** | UI Component | Sticky horizontal navigation below the function bar listing 7 section anchors: Core IDs, Images, Description, Taxonomy, Verses, External Refs, Metadata & Status (`.section-nav`) |
| **Paragraph Editor** | UI Component | Dynamic textarea array editor (`.paragraph-editor`) for multi-paragraph fields (description, snippet). Supports add/remove rows via `renderDescriptionEditor()` and `collectDescription()` |
| **Verse Builder** | UI Component | Interactive Bible verse selector (`.verse-builder`) with cascading book/chapter/verse dropdowns and removable chip UI for selected verses |
| **Chip** | UI Component | Removable tag element (`.chip`) displaying a selected verse reference (e.g., "Matthew 5:3") with a × remove button |
| **Verse Chip** | UI Pattern | A `.chip` element inside a `.verse-builder__chips` container representing a selected Bible verse — removable by clicking `.chip__remove` |
| **Taxonomy Selectors** | UI Component | Three linked dropdown selectors for Era, Timeline, and Gospel Category, managed by `taxonomy_selector.js` via `renderTaxonomySelectors()` |
| **Bulk CSV Upload** | Workflow | Two-phase import: Phase 1 (`bulk_csv_upload_handler.js`) parses and validates a CSV file client-side; Phase 2 (`bulk_upload_review_handler.js`) displays an ephemeral review panel for admin approval before committing rows as drafts |
| **Bulk Review Panel** | UI Component | Ephemeral isolated panel (`.bulk-review-panel`) that replaces the main records table when the Bulk toggle is active, showing parsed CSV rows with validation status (✓/✗) and Commit/Discard actions |
| **CSV Field Map** | JS Constant | `CSV_FIELD_MAP` — maps human-readable CSV column headers (e.g., "Record Title") to database field names (e.g., "title") during bulk upload parsing |
| **Endless Scroll** | UI Pattern | Pagination strategy for the All Records table — an Intersection Observer on `.records-all__scroll-sentinel` triggers `fetchRecordsBatch()` when the user scrolls within range, loading 50-row batches |
| **`BATCH_SIZE`** | JS Constant | Page size for record batch queries, set to 50. Determines when `_hasMore` triggers additional fetches |
| **`_loadedRows`** | JS State | In-memory cache of all fetched record objects, used by search filtering and endless scroll. Cleared on sort change; concatenated with new batches |
| **Toggle Buttons** | UI Component | Monospace sort/status filter buttons (`.toggle-btn`) with active state modifier (`--active`, Deep Oxblood background) — includes sort toggles (`data-sort`) and status filters (`data-status`) |
| **`records-all__*`** | CSS BEM Block | BEM namespace for all All Records dashboard components (e.g., `records-all__table`, `records-all__search-input`, `records-all__col-title`) |
| **`form-section`** | CSS BEM Block | Grouped block container for each of the 7 Single Record editor sections, with heading, subheading, and field containers |
| **`form-field`** | CSS BEM Block | Individual form field container (`.form-field`) with label (`.form-field__label`), input (`.form-field__input`), textarea, select, and optional hint elements |
| **`data-record-id`** | HTML Data Attr | ULID stored on each table row in the All Records view, used for click-navigation to the Single Record editor |
| **`data-sort`** | HTML Data Attr | Sort column identifier on toggle buttons. Values: `created_at`, `id`, `primary_verse`, `title`, `list_ordinary`, `bulk` |
| **`data-status`** | HTML Data Attr | Status filter identifier on toggle buttons. Values: `all`, `published`, `draft` |
| **`data-section`** | HTML Data Attr | Section identifier on Single Record section nav links. Values: `core-ids`, `images`, `description`, `taxonomy`, `verses`, `external-refs`, `metadata` |
| **Parent Selector** | UI Component | ULID input with regex validation (`ULID_REGEX`) for linking a record to a parent record via `parent_id` foreign key, used in hierarchical/Arbor relationships |
| **JSON-LD Builder** | JS Module | `json_ld_builder.js` — constructs Schema.org structured data for individual records and injects it into `<head>` for SEO |
| **`sanitizeQuery()`** | JS Function | SQL input sanitizer in `sanitize_query.js` — strips dangerous keywords and validates SELECT-only before passing queries to the WASM SQLite engine |
| **Status Workflow** | Design Pattern | Publication lifecycle: records start as `draft` (admin-only), explicit Publish sets `status='published'` (public), Delete removes entirely (no soft-delete) |
| **CSRF Token** | Security | Per-session token issued as non-HttpOnly `csrf_token` cookie on login. Read by `getCSRFToken()` and sent as `X-CSRF-Token` header on all state-changing API calls. Validated by `CSRFMiddleware` |
| **`getCSRFToken()`** | JS Function | Reads the `csrf_token` cookie value for inclusion in fetch headers. Defined in `record_status_handler.js`, exposed as `window.getCSRFToken()` |
| **Papa Parse** | JS Library | RFC 4180-compliant CSV parser (vendored as `papaparse.min.js`) replacing the hand-rolled state machine in `bulk_csv_upload_handler.js`. Handles embedded newlines, quoted fields, and BOM |
| **`getSelectedRecordId()`** | JS Function | Getter replacing direct `window._selectedRecordId` global access. Returns the currently selected record ID from module-scoped state in `dashboard_records_single.js` |
| **`setSelectedRecordId()`** | JS Function | Setter replacing direct `window._selectedRecordId` global assignment. Updates the module-scoped state in `dashboard_records_single.js` |
| **`getRecordTitle()`** | JS Function | Getter for the current record title, replacing `window._recordTitle`. Used by sub-modules for error messages |
| **`getLoadedRecordData()`** | JS Function | Getter for the loaded record data object, replacing `window._loadedRecordData`. Used for dirty-checking |
| **Dense Dashboard** | Design Pattern | High-density table layout (monospace, small fonts, compact spacing) optimized for admin power-users managing large record datasets |
