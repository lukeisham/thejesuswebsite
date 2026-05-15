---
name: cross_cutting_nomenclature.md
purpose: Glossary of terms used throughout the Cross-Cutting Standardization Module and the broader codebase
version: 1.0.0
dependencies: [detailed_module_sitemap.md]
---

# Cross-Cutting Nomenclature — 9.0 Cross-Cutting Standardization

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

## Module-Specific Terms (9.0 Cross-Cutting Standardization)

| Term | Type | Definition |
|------|------|------------|
| **Picture Handler** | JS Module | `picture_handler.js` — shared widget for PNG image upload, preview, and deletion. Validates MIME type (`image/png`) and 5 MB size limit client-side. Server resizes to 800px full and 200px thumbnail |
| **`renderEditPicture(containerId, recordId)`** | JS Function | Entry point that wires the file input, preview containers, and upload/delete buttons for a record's picture |
| **`renderPictureName(containerId, pictureName)`** | JS Function | Updates the `#record-picture-name` read-only display with the current picture filename |
| **MLA Source Handler** | JS Module | `mla_source_handler.js` — shared bibliography editor widget with three editable tables (Books, Articles, Websites) following MLA citation format |
| **`renderEditBibliography(containerId)`** | JS Function | Creates three citation-type tables with per-row editable fields (author, title, publisher/journal/url, etc.) |
| **`loadEditBibliography(data)`** | JS Function | Hydrates the bibliography editor with an existing array of citation objects from the database |
| **`collectEditBibliography()`** | JS Function | Returns a clean array of citation objects with empty entries filtered out, ready for JSON serialisation |
| **`TYPE_FIELDS`** | JS Constant | Column definitions for each citation type: book (author, title, publisher, year, pages), article (author, title, journal, volume, year, pages), website (author, title, url, accessed_date) |
| **Context Link Handler** | JS Module | `context_link_handler.js` — shared table editor for inter-record cross-references as `{slug, type}` pairs |
| **`renderEditLinks(containerId, contextLinksData)`** | JS Function | Builds the context links table from an array of `{slug, type}` objects with add/remove controls |
| **`collectEditLinks()`** | JS Function | Returns a copy of the current `{slug, type}` array for save payload |
| **Context Link Types** | Enum | Valid values for the type dropdown in context links: `record`, `essay`, `blog`, `response` |
| **External Refs Handler** | JS Module | `external_refs_handler.js` — shared table editor for unique identifiers (IAA, Pledius, Manuscript) with support for custom identifier types |
| **`renderExternalRefs(containerId)`** | JS Function | Builds the identifiers table seeded with three default rows: IAA Reference, Pledius Reference, Manuscript Reference |
| **`setExternalRefValues(data)`** | JS Function | Hydrates the editor — supports both legacy flat keys (`{iaa, pledius, manuscript}`) and modern entries array (`[{type, value}]`) |
| **`collectExternalRefs()`** | JS Function | Returns `{iaa, pledius, manuscript, entries}` — both legacy flat keys and the full entries array for backward compatibility |
| **`DEFAULT_ROWS`** | JS Constant | Three default identifier rows seeded on render: "IAA Reference", "Pledius Reference", "Manuscript Reference" |
| **`CANONICAL_KEY_TO_LABEL`** | JS Constant | Maps legacy flat database keys (`iaa`, `pledius`, `manuscript`) to display labels ("IAA Reference", etc.) for hydration |
| **Metadata Widget** | JS Module | `metadata_widget.js` — shared SEO/metadata editor with slug, snippet, keywords fields and DeepSeek-powered auto-generation buttons |
| **`renderMetadataWidget(containerId, options)`** | JS Function | Injects the full metadata widget DOM: slug input with generate button, snippet textarea with generate button, keyword tag chips, and a Generate All button |
| **`populateMetadataWidget(containerId, data)`** | JS Function | Fills slug, snippet, and keyword fields from existing record data |
| **`collectMetadataWidget(containerId)`** | JS Function | Gathers `{slug, snippet, metadata_json}` from the widget for the save payload |
| **Metadata Widget Options** | JS Config | `{onAutoSaveDraft, descriptionContainerId, getRecordTitle, getRecordId}` — callbacks and DOM references passed to `renderMetadataWidget` |
| **Generate All** | UI Pattern | `#metadata-widget-btn-generate-all` — runs slug, snippet, and keyword generation in parallel via the DeepSeek API, then triggers auto-save |
| **Keyword Tag Chips** | UI Pattern | Editable chip/tag interface in the metadata widget for search keywords — add via text input, remove via × button on each chip |
| **ESV API Config** | JS Module | `esv_api_config.js` — placeholder configuration for the ESV Bible API integration. Exposes `window.esvConfig` |
| **Error Handler** | JS Module | `js/admin_core/error_handler.js` — universal status/error message display. Queues messages before DOMContentLoaded, then flushes to `#admin-error-footer`. Lives in `admin_core/`, not `9.0_cross_cutting/`, but consumed by all modules |
| **`surfaceError(message)`** | JS Function | `window.surfaceError()` — routes a status or error message to the admin error footer. All dashboard modules depend on this function |
| **`_errorQueue`** | JS State | Internal message queue that buffers `surfaceError()` calls made before the DOM is ready |
| **Autogen Snippet** | JS Module | `autogen_snippet.js` — triggers AI snippet generation via `POST /api/admin/snippet/generate` with `{slug, content}`. Used by sidebar-based editors (Essays, News, Challenges) |
| **`triggerAutoGenSnippet(state, config)`** | JS Function | Calls the snippet generation API and updates the state object's snippet field on success |
| **Autogen Slug** | JS Module | `autogen_slug.js` — client-side slug generation from the record title. Converts to lowercase, replaces whitespace with hyphens, strips non-alphanumeric characters |
| **`triggerAutoGenSlug(state, config)`** | JS Function | Generates a URL-safe slug from the current title and writes it to the configured slug input |
| **Autogen Metadata** | JS Module | `autogen_meta.js` — triggers AI metadata/keyword extraction via `POST /api/admin/metadata/generate` with `{slug, content}` |
| **`triggerAutoGenMeta(state, config)`** | JS Function | Calls the metadata generation API and parses the returned keywords into the state object |
| **Sidebar Save Metadata** | JS Module | `sidebar_save_metadata.js` — PUTs snippet, slug, and metadata fields to `/api/admin/records/{id}` as a minimal diff (only changed fields) |
| **`saveSidebarMetadata(state, config)`** | JS Function | Compares DOM values to current state, builds a minimal diff payload, and PUTs to the records API with `status: "draft"` |
| **Sidebar Term Chips** | JS Module | `sidebar_term_chips.js` — manages search keyword arrays for sidebar-based editors (Wikipedia, Challenges, News) |
| **`addSidebarTerm(state, config)`** | JS Function | Appends a non-duplicate term to the keywords array, PUTs the updated array as JSON to the configured database column |
| **`removeSidebarTerm(state, config, index)`** | JS Function | Removes a term by index from the keywords array and PUTs the updated array |
| **Sidebar Term Config** | JS Config | `{prefix, inputId, termColumn, stateTermsKey, renderFn}` — maps a sidebar's term input to its database column and re-render callback |
| **WYSIWYG Editor** | CSS Layout | `wysiwyg_editor.css` — split-pane markdown editor styles: `.markdown-toolbar` (button bar), `.markdown-editor-panes` (two-column layout), `.markdown-editor-textarea` (input), `.markdown-editor-preview` (rendered output) |
| **WYSIWYG Dashboard Layout** | CSS Layout | `wysiwyg_dashboard_layout.css` — shared layout for sidebar-based document editors (Essays, Historiography, Blog Posts): `.wysiwyg-function-bar` (sticky action bar), `.wysiwyg-editor-layout` (sidebar + editor split), `.wysiwyg-sidebar` (document list), `.wysiwyg-editor-area` (main editing pane) |
| **`.wysiwyg-function-bar`** | CSS BEM Block | Sticky top bar for document editors containing Save Draft, Publish, Delete buttons and a "+ New" action |
| **`.wysiwyg-sidebar-list__item`** | CSS BEM Element | Individual document entry in the sidebar list, with `--active` modifier for the currently selected document |
| **`.wysiwyg-editor-field`** | CSS BEM Block | Form field container in the editor area with label, input, textarea, and hint elements. `--title` and `--readonly` modifiers available |
| **`.bibliography-editor`** | CSS BEM Block | Root container for the MLA citation editor with `__section`, `__table`, `__row`, `__input`, `__remove-btn`, and `__add-btn` elements |
| **`.context-links-editor`** | CSS BEM Block | Root container for the context links table with `__table`, `__row`, `__td`, `__remove-btn`, and `__add-row` elements |
| **`.external-refs-editor`** | CSS BEM Block | Root container for the unique identifiers table with `__type-input`, `__value-input`, `__add-type`, `__add-value`, and `__add-btn` elements |
| **`.metadata-widget`** | CSS BEM Block | Root container for the SEO metadata widget with `__field`, `__input`, `__textarea`, `__btn`, `__tags`, `__tag`, `__tag-remove`, `__generate-all`, and `__status` elements |
| **`.picture-preview`** | CSS BEM Block | Image preview container with `--full` (400×300) and `--thumb` (200×150) modifiers, `__placeholder` text, and `__image` element |
| **Shared Widget Pattern** | Design Pattern | All 9.0 widgets follow the same API contract: `render*()` builds DOM, `load*()` / `set*()` / `populate*()` hydrates from data, `collect*()` returns payload for save. All are exposed on `window.*` for cross-module consumption |
| **Ephemeral State** | Design Pattern | Widget internal state (`_entries`, `_currentLinks`, `activeKeywords`) lives in module-scoped variables, not on `window`. External access is through the collect/set function API only |
