---
name: plan_dashboard_records_single
version: 1.2.0
module: 2.0 — Records
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_records_single

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Single Record" dashboard view, a dense and comprehensive editor for the `records` table (`data_schema.md`). It features a split-pane layout with a dedicated section navigator for fast jumping between grouped fields (Core Identifiers, Images, Description, Taxonomy, Verses, External References, Metadata), integrated image upload handling with previews and thumbnail generation, and status controls (Save Draft, Publish, Delete). The form exposes all fields required for record curation — `description` paragraph editing, `era`/`timeline`/`gospel_category`/`map_label` selectors, `primary_verse` and `secondary_verse` structured inputs, MLA bibliography editing, context links, parent record relationships, and external reference fields (`iaa`, `pledius`, `manuscript`, `url`). This module is the primary administrative interface for curating, editing, and publishing the historical records that form the core of the website's archival collection. Records are reached by clicking a row from the All Records list — which includes a keyboard-driven search bar (`Cmd+K`) for quickly locating records by title, verse, or keyword — or by clicking a context link from another editor.

```text
+===================================================================================================+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >                      |
+===================================================================================================+
| Function Bar:              [ Save Draft ]   [ Publish ]   [ Delete ]                              |
+===================================================================================================+
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
|  Bibliography (MLA):                                                                               |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ [ Book ▼ ]    Author: [________________________]  Title: [________________________]        │  |
|  │               Publisher: [____________________]  Year: [____]  Pages: [________]           │  |
|  │ [ Article ▼ ] Author: [________________________]  Title: [________________________]        │  |
|  │               Journal: [_____________________]  Vol: [___]  Year: [____]  Pages: [______]  │  |
|  │ [ Website ▼ ] Author: [________________________]  Title: [________________________]        │  |
|  │               URL: [___________________________]  Accessed: [________]                     │  |
|  │                                [ + Add Citation ]                                           │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  Context Links:                                                                                    |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Slug: [________________________]  Type: [ record | essay | blog ▼ ]   [ + Add Link ]       │  |
|  │ ┌──────────────────────────────────────────────────────────────────────────────────────┐  │  |
|  │ │ jesus-baptism → record [×]  |  markan-theology → essay [×]                           │  │  |
|  │ └──────────────────────────────────────────────────────────────────────────────────────┘  │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  Parent ID:          [___________________________________________]  (ULID of parent record)         |
|                                                                                                    |
|  IAA Reference:      [___________________________________________]                                 |
|  Pledius Reference:  [___________________________________________]                                 |
|  Manuscript Ref:     [___________________________________________]                                 |
|                                                                                                    |
|  URL:                                                                                              |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ Label: [________________________]  URL: [____________________________________________]    │  |
|  │                                [ + Add URL ]                                                │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  ═══════════════  METADATA & STATUS  ═══════════════════════════════════════════════════════════   |
|                                                                                                    |
|  Metadata JSON:                                                                                    |
|  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │ [______________________________________________________________________________________]  │  |
|  │ (raw JSON blob — auto-managed; editable for advanced use)                                   │  |
|  └────────────────────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                                    |
|  Created At:         [___________________________________________]  (ISO8601 — read-only)           |
|  Updated At:         [___________________________________________]  (ISO8601 — auto-set on save)    |
|                                                                                                    |
|  Status:             [ Draft ◉ ]  [ Published ○ ]                                                 |
|                                                                                                    |
+====================================================================================================+
| [ Error Message Display: System running normally / Error logs appear here ]                       |
+====================================================================================================+
```

---

## Field Coverage Map

> Every field in `data_schema.md` §records exposed in the Single Record editor.

| Schema Field | Editability | Plan Section | Task Coverage |
| :--- | :--- | :--- | :--- |
| `id` | Read-only | Core Identifiers | T4 — fetched from API, displayed |
| `metadata_json` | Editable (advanced) | Metadata & Status | T0 — `metadata_handler.js` renders footer with raw JSON access |
| `title` | Editable | Core Identifiers | T4 — text input |
| `slug` | Editable | Core Identifiers | T4 — text input + auto-gen button via `metadata_handler.js` |
| `picture_name` | Editable | Images | T6 — text input for image filename |
| `picture_bytes` | Editable | Images | T6 — file upload + preview, max 800px / 250 KB PNG |
| `picture_thumbnail` | Read-only | Images | T6 — auto-generated 200px derivative, preview only |
| `description` | Editable | Description | T10 — dynamic paragraph array editor (add/remove/reorder) |
| `snippet` | Editable | Description | T9 — paragraph array editor + auto-gen trigger |
| `bibliography` | Editable | External Refs | T7 — structured MLA editor (book/article/website forms) |
| `era` | Editable | Taxonomy | T11 — single-select dropdown (8 values) |
| `timeline` | Editable | Taxonomy | T11 — single-select dropdown (36 values) |
| `map_label` | Editable | Taxonomy | T12 — single-select dropdown |
| `geo_id` | Editable | Taxonomy | T12 — integer input |
| `gospel_category` | Editable | Taxonomy | T11 — single-select dropdown |
| `primary_verse` | Editable | Verses | T13 — structured book/chapter/verse chip builder |
| `secondary_verse` | Editable | Verses | T13 — structured book/chapter/verse chip builder |
| `context_links` | Editable | External Refs | T8 — slug/type chip management |
| `parent_id` | Editable | External Refs | T14 — ULID input with validation |
| `created_at` | Read-only | Metadata & Status | T4 — displayed from API |
| `updated_at` | Read-only | Metadata & Status | T5 — auto-set on save, displayed |
| `status` | Editable | Metadata & Status | T5 — Draft/Published toggle |
| `iaa` | Editable | External Refs | T15 — text input |
| `pledius` | Editable | External Refs | T15 — text input |
| `manuscript` | Editable | External Refs | T15 — text input |
| `url` | Editable | External Refs | T16 — label/URL pair array editor |

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_records_single.html` | High-density record editor form with section navigator |
| **CSS** | `css/2.0_records/dashboard/dashboard_records_single.css` | Multi-section form layout, section grouping, sticky navigator |
| **JS** | `js/2.0_records/dashboard/dashboard_records_single.js` | Module orchestration & initialization |
| **JS** | `js/2.0_records/dashboard/display_single_record_data.js` | Record fetching & full form hydration (all fields) |
| **JS** | `js/2.0_records/dashboard/record_status_handler.js` | Save Draft, Publish & Delete status management |
| **JS** | `js/2.0_records/dashboard/picture_handler.js` | 🔑 OWNED shared tool: Image upload, preview & thumbnail (consumed by Blog Posts, Essay/Historiography, Challenge Response) |
| **JS** | `js/2.0_records/dashboard/mla_source_handler.js` | 🔑 OWNED shared tool: Structured MLA bibliography management (consumed by Blog Posts, Essay/Historiography, Challenge Response) |
| **JS** | `js/2.0_records/dashboard/context_link_handler.js` | 🔑 OWNED shared tool: Database relationship links (consumed by Blog Posts, Essay/Historiography) |
| **JS** | `js/2.0_records/dashboard/snippet_generator.js` | 🔑 OWNED shared tool: Automated snippet trigger (consumed by Blog Posts, Essay/Historiography, Challenge Response, News Sources) |
| **JS** | `js/2.0_records/dashboard/metadata_handler.js` | 🔑 OWNED shared tool: Snippet/Slug/Meta footer (consumed by Blog Posts, Essay/Historiography, Challenge Response, Challenges, Wikipedia, News Sources) |
| **JS** | `js/2.0_records/dashboard/description_editor.js` | 🔑 OWNED shared tool: Dynamic paragraph array editor for `description` and `snippet` fields (consumed by Blog Posts, Essay/Historiography, Challenge Response) |
| **JS** | `js/2.0_records/dashboard/taxonomy_selector.js` | Selectors for era, timeline, gospel_category fields |
| **JS** | `js/2.0_records/dashboard/map_fields_handler.js` | Selector for map_label + integer input for geo_id |
| **JS** | `js/2.0_records/dashboard/verse_builder.js` | 🔑 OWNED shared tool: Structured book/chapter/verse chip UI for primary_verse and secondary_verse |
| **JS** | `js/2.0_records/dashboard/parent_selector.js` | ULID input for parent_id with validation |
| **JS** | `js/2.0_records/dashboard/external_refs_handler.js` | Text inputs for iaa, pledius, manuscript |
| **JS** | `js/2.0_records/dashboard/url_array_editor.js` | Label/URL pair array editor |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4 GET record; T5 PUT/DELETE record; T6 POST picture; T9 POST snippet generate |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers module with dashboard router; calls `_setGridColumns()` for single-record layout |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T18 routes all failures to shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads single row; T5 writes status; T6 writes picture_bytes/thumbnail |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T9 auto-generation button triggers this script via API |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T0 auto-gen slug/metadata triggers this script via API |

### 🔑 Shared-Tool Ownership (Published by this plan)

> The following files are AUTHORED here and CONSUMED by downstream plans via `<script>` tag inclusion. Consumer plans MUST NOT create local copies. See `documentation/vibe_coding_rules.md` §7 for the shared-tool ownership rule.

| Shared Tool | Consumer Plans |
|---|---|
| `js/2.0_records/dashboard/picture_handler.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography`, `plan_dashboard_challenge_response` |
| `js/2.0_records/dashboard/mla_source_handler.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography`, `plan_dashboard_challenge_response` |
| `js/2.0_records/dashboard/context_link_handler.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography` |
| `js/2.0_records/dashboard/snippet_generator.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography`, `plan_dashboard_challenge_response`, `plan_dashboard_news_sources` |
| `js/2.0_records/dashboard/metadata_handler.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography`, `plan_dashboard_challenge_response`, `plan_dashboard_challenge`, `plan_dashboard_wikipedia`, `plan_dashboard_news_sources` |
| `js/2.0_records/dashboard/description_editor.js` | `plan_dashboard_blog_posts`, `plan_dashboard_essay_historiography`, `plan_dashboard_challenge_response` |
| `js/2.0_records/dashboard/verse_builder.js` | (no consumers yet — available for future plans) |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T0 — Implement Shared Dashboard Tools 🔑

- **File(s):**
  - `js/2.0_records/dashboard/picture_handler.js`
  - `js/2.0_records/dashboard/mla_source_handler.js`
  - `js/2.0_records/dashboard/context_link_handler.js`
  - `js/2.0_records/dashboard/snippet_generator.js`
  - `js/2.0_records/dashboard/metadata_handler.js`
  - `js/2.0_records/dashboard/description_editor.js`
  - `js/2.0_records/dashboard/verse_builder.js`
- **Action:** Create each shared handler with a `window.*` public API contract. These files are the SOLE authoritative copies — consumer plans include them via `<script>` tag in their HTML and call the exposed `window.*` functions. They MUST NOT create local copies. Each file follows the 1-function-per-file rule.
  - `picture_handler.js`: Exposes `window.renderEditPicture(containerId, recordId)` — image file selection, full-size preview, thumbnail preview, and binary upload (max 800px width PNG, ≤ 250 KB). Also exposes `window.renderPictureName(containerId, pictureName)` for the `picture_name` text field.
  - `mla_source_handler.js`: Exposes `window.renderEditBibliography(containerId)`, `window.loadEditBibliography(data)`, `window.collectEditBibliography()` — structured MLA bibliography editing with book/article/website type toggles and respective fields (author, title, publisher/journal/URL, year, pages, accessed date).
  - `context_link_handler.js`: Exposes `window.renderEditLinks(containerId, contextLinksData)` — `{slug, type}` chip management with type selector (record/essay/blog).
  - `snippet_generator.js`: Exposes `window.generateSnippet(recordId, description)` — triggers `backend/scripts/snippet_generator.py` via the admin API and returns the generated snippet string.
  - `metadata_handler.js`: Exposes `window.renderMetadataFooter(containerId, recordId)` — renders an editable Slug field with auto-gen button, plus read-only metadata_json display.
  - `description_editor.js`: Exposes `window.renderDescriptionEditor(containerId, paragraphs)` — dynamic JSON array editor for `description` and `snippet` fields. Supports add/remove/reorder of paragraphs. Reused by Blog Posts, Essay/Historiography, and Challenge Response plans.
  - `verse_builder.js`: Exposes `window.renderVerseBuilder(containerId, verses)` — structured book/chapter/verse chip builder with Bible book dropdown, chapter/verse integer inputs, and chip display row.
- **Dependencies:** `admin/backend/admin_api.py` (snippet trigger endpoint, record update endpoint), `backend/scripts/snippet_generator.py`, `backend/scripts/metadata_generator.py`
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · window.* API contract · Explicit logic

- [ ] Task complete

---

### T1 — Create Single Record HTML

- **File(s):** `admin/frontend/dashboard_records_single.html`
- **Action:** Create the dense multi-section form structure for single record editing, including the section navigator with anchors for all 7 sections (Core IDs, Images, Description, Taxonomy, Verses, External Refs, Metadata & Status). Each section is a `<section>` with a semantic `id` hook matching the navigator. No fields from other modules (rankings, responses, blogposts, news, essays, ordo_salutis) are included.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Single Record CSS

- **File(s):** `css/2.0_records/dashboard/dashboard_records_single.css`
- **Action:** Implement the 'providence' theme multi-section form layout with:
  - Sticky section navigator at the top
  - Grouped section blocks with clear visual separation
  - Dense form field styling for text inputs, selects, and textareas
  - Image preview containers side-by-side (full + thumbnail)
  - Chip/tag styling for verse references and context links
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Single Record Orchestrator

- **File(s):** `js/2.0_records/dashboard/dashboard_records_single.js`
- **Action:** Initialize the single record module and manage the overall form lifecycle. Responsibilities:
  - Parse the record ID from the URL or module context
  - Call `display_single_record_data.js` to fetch and hydrate all fields
  - Initialize all editor sub-components (description, verses, taxonomy, bibliography, context links, etc.)
  - Wire the section navigator for smooth-scroll jumping between sections
  - Manage dirty-checking: track which fields have been modified
  - Coordinate Save Draft / Publish / Delete via `record_status_handler.js`
  - Call `_setGridColumns()` to request the Providence 3-column layout (single record uses default 1fr/2fr)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Data Display Logic

- **File(s):** `js/2.0_records/dashboard/display_single_record_data.js`
- **Action:** Implement the logic to fetch a single record from `GET /api/admin/records/{id}` and hydrate every field in the form:
  - Core IDs: `id` (read-only), `title`, `slug`
  - Images: `picture_name`, `picture_bytes` → preview, `picture_thumbnail` → preview
  - Description: `description` (JSON array → paragraph editor), `snippet` (JSON array → paragraph editor)
  - Taxonomy: `era` → selector, `timeline` → selector, `gospel_category` → selector
  - Map: `map_label` → selector, `geo_id` → integer input
  - Verses: `primary_verse` (JSON array → verse builder), `secondary_verse` (JSON array → verse builder)
  - External: `bibliography` (MLA editor), `context_links` (chip editor), `parent_id`, `iaa`, `pledius`, `manuscript`, `url` (array editor)
  - Metadata: `metadata_json` (read-only collapsed), `created_at` (read-only), `updated_at` (read-only), `status` (draft/published toggle)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Record Status Handling

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Implement the logical flow for Save Draft, Publish, and Delete operations with automatic draft behaviour. Any modification to any field auto-saves with status set to `draft`. Only the explicit "Publish" button sets status to `published`. "Delete" removes the record from the database entirely. On save, `updated_at` is auto-set server-side.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Picture Upload Handling

- **File(s):** `js/2.0_records/dashboard/picture_handler.js`
- **Action:** Implement the client-side logic for image file selection, full-size preview (max 800px width), thumbnail preview (200px auto-derivative), picture name text field, and base64/blob submission. Enforce PNG-only and ≤ 250 KB client-side before upload.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement MLA Source Handling

- **File(s):** `js/2.0_records/dashboard/mla_source_handler.js`
- **Action:** Implement the structured MLA bibliography editor with type-toggled form fields:
  - Book: author, title, publisher, year, pages + inline citation
  - Article: author, title, journal, volume, year, pages + inline citation
  - Website: author, title, URL, accessed date + inline citation
  - Each entry toggleable between its full form and compact display
  - Add/remove citation entries
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Implement Context Link Handling

- **File(s):** `js/2.0_records/dashboard/context_link_handler.js`
- **Action:** Implement the dynamic UI logic for associating and displaying context links. Each link has a slug and a type (record/essay/blog). Slug input with type dropdown. Links displayed as removable chips. Array serialized to JSON for save.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T9 — Implement Snippet Generation Logic

- **File(s):** `js/2.0_records/dashboard/snippet_generator.js`
- **Action:** Implement the UI trigger to request automated snippet generation from `backend/scripts/snippet_generator.py` via `POST /api/admin/snippet/generate`. Passes the `description` content. On success, populates the snippet paragraph array. Also exposes a manual "Generate from Description" button in the snippet section.
- **Dependencies:** `admin/backend/admin_api.py`, `backend/scripts/snippet_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T10 — Implement Description Editor

- **File(s):** `js/2.0_records/dashboard/description_editor.js`
- **Action:** Implement the dynamic paragraph array editor for `description` and `snippet` fields. Features:
  - Render existing paragraphs as separate textareas
  - "Add Paragraph" button appends a new empty textarea
  - Remove button (×) on each paragraph
  - Drag-to-reorder for description paragraphs
  - Collect all paragraphs into a JSON array on save
  - Shared tool contract: `window.renderDescriptionEditor(containerId, paragraphs)`, `window.collectDescription()`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+ · window.* API

- [ ] Task complete

---

### T11 — Implement Taxonomy Selectors

- **File(s):** `js/2.0_records/dashboard/taxonomy_selector.js`
- **Action:** Implement three single-select dropdowns populated from `data_schema.md` enum values:
  - `era`: 8 values (PreIncarnation through Post-Passion)
  - `timeline`: 36 values (PreIncarnation through ReturnOfJesus)
  - `gospel_category`: 5 values (event, location, person, theme, object)
  Dropdowns render the currently selected value and emit changes into the form's dirty-checking system.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T12 — Implement Map Fields Handler

- **File(s):** `js/2.0_records/dashboard/map_fields_handler.js`
- **Action:** Implement:
  - `map_label` single-select dropdown with values from `data_schema.md` (Overview, Empire, Levant, Judea, Galilee, Jerusalem)
  - `geo_id` integer input with validation (64-bit int range)
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T13 — Implement Verse Builder

- **File(s):** `js/2.0_records/dashboard/verse_builder.js`
- **Action:** Implement the structured Bible verse reference builder for both `primary_verse` and `secondary_verse`. Features:
  - Bible book dropdown (all 66 books from `data_schema.md`)
  - Chapter integer input, Verse integer input
  - "Add Verse Reference" button appends the reference as a chip
  - Each chip displays "Book Chapter:Verse" with a remove (×) button
  - Collected as JSON array: `[{"book": "Genesis", "chapter": 1, "verse": 1}]`
  - Shared tool contract: `window.renderVerseBuilder(containerId, verses)`, `window.collectVerses()`
  - Two instances: one for primary, one for secondary
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+ · window.* API

- [ ] Task complete

---

### T14 — Implement Parent Selector

- **File(s):** `js/2.0_records/dashboard/parent_selector.js`
- **Action:** Implement ULID text input for `parent_id`. Validates format (ULID pattern). Optionally fetches the parent record title from the API to display next to the input for confirmation.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T15 — Implement External References Handler

- **File(s):** `js/2.0_records/dashboard/external_refs_handler.js`
- **Action:** Implement text inputs for `iaa`, `pledius`, and `manuscript` fields. Each is a single-line text input with label. No special formatting required — free-text external reference identifiers.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T16 — Implement URL Array Editor

- **File(s):** `js/2.0_records/dashboard/url_array_editor.js`
- **Action:** Implement a label/URL pair array editor for the `url` field. Each entry has a Label text input and a URL text input. "Add URL" button appends a new pair. Remove button per entry. Collected as JSON blob on save.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T17 — Implement Metadata Handler

- **File(s):** `js/2.0_records/dashboard/metadata_handler.js`
- **Action:** Implement the metadata display and editing:
  - `metadata_json` — raw JSON textarea for advanced editing (collapsed by default)
  - `created_at` — read-only ISO8601 display
  - `updated_at` — read-only ISO8601 display, updated on save
  - Slug auto-generation trigger that calls `metadata_generator.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T18 — Error Message Generation

- **File(s):** All JS files in the plan inventory
- **Action:** Add structured error message generation at every key failure point across all JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Record Fetch Failed** — `display_single_record_data.js`: `"Error: Unable to load record data. Please refresh and try again."`
  2. **Record Save Failed** — `record_status_handler.js`: `"Error: Failed to save changes to '{title}'. Please try again."`
  3. **Draft Failed** — `record_status_handler.js`: `"Error: Failed to set record '{title}' to Draft."`
  4. **Publish Failed** — `record_status_handler.js`: `"Error: Failed to publish record '{title}'. Check required fields."`
  5. **Delete Failed** — `record_status_handler.js`: `"Error: Failed to delete record '{title}'. Please try again."`
  6. **Image Upload Failed** — `picture_handler.js`: `"Error: Image upload failed for '{title}'. Max 250 KB PNG only."`
  7. **Image Preview Failed** — `picture_handler.js`: `"Error: Unable to preview the selected image. Please choose a valid PNG file."`
  8. **Description Parse Failed** — `description_editor.js`: `"Error: Unable to parse description data for '{title}'."`
  9. **Snippet Generation Failed** — `snippet_generator.js`: `"Error: Snippet generation failed for '{title}'. Please try again or enter manually."`
  10. **MLA Source Save Failed** — `mla_source_handler.js`: `"Error: Failed to save bibliography changes for '{title}'."`
  11. **Context Link Save Failed** — `context_link_handler.js`: `"Error: Failed to save context links for '{title}'."`
  12. **Verse Parse Failed** — `verse_builder.js`: `"Error: Unable to parse verse references for '{title}'."`
  13. **Taxonomy Save Failed** — `taxonomy_selector.js`: `"Error: Failed to save taxonomy fields for '{title}'."`
  14. **External Refs Save Failed** — `external_refs_handler.js`: `"Error: Failed to save external references for '{title}'."`
  15. **URL Save Failed** — `url_array_editor.js`: `"Error: Failed to save URL data for '{title}'."`
  16. **Parent Validation Failed** — `parent_selector.js`: `"Error: Invalid Parent ID format for '{title}'. Must be a valid ULID."`
  17. **Metadata Save Failed** — `metadata_handler.js`: `"Error: Failed to save metadata for '{title}'."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T19 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup; `<section>` for form groups, `<nav>` for section navigator
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [ ] Section navigator uses sticky positioning

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern
- [ ] All shared tools expose `window.*` API contracts

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic
- [ ] All schema fields specified in the plan are accounted for in the form

#### Shared-Tool Ownership
- [ ] All shared tools expose a single `window.*` function each — no duplicate files created in consumer module directories
- [ ] Consumer plans reference these files via `<script>` tag in their HTML, not by copying the source
- [ ] Each file opens with a comment stating "This is the authoritative copy — consumed by [list of consumer plans]"
- [ ] `description_editor.js` and `verse_builder.js` are newly published as shared tools consumed by downstream plans

---

### T20 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective has been fully met — all specified schema fields are covered: id, metadata_json, title, slug, picture_name, picture_bytes, picture_thumbnail, description, snippet, bibliography, era, timeline, map_label, geo_id, gospel_category, primary_verse, secondary_verse, context_links, parent_id, created_at, updated_at, status, iaa, pledius, manuscript, url, reachable via search or row-click from All Records
- [ ] **Necessity**: The underlying need for a complete single-record editor that touches every specified schema field has been resolved
- [ ] **Targeted Impact**: The single record dashboard view has been implemented with 7 grouped sections, a sticky section navigator, and full field coverage
- [ ] **Scope Control**: No scope creep — only files listed in this plan's tasks were created or modified; no read-only displays of foreign module fields were included

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add 17 new JS files under Module 2.0; update file inventory |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new record editor files |
| `documentation/data_schema.md` | No | No schema changes — plan covers all specified fields |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool ownership rule (§7) — records_single now owns 7 shared JS tools |
| `documentation/style_mockup.html` | No | Style mockup is unaffected |
| `documentation/git_vps.md` | No | No deployment changes |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the Single Record editor with 7 sections and full field coverage |
| `documentation/guides/guide_function.md` | Yes | Document the complete record editing flow including all sub-editors and section navigation |
| `documentation/guides/guide_security.md` | Yes | Note field-level validation requirements (PNG uploads, verse format, ULID validation) |
| `documentation/guides/guide_style.md` | Yes | Document the multi-section form, sticky navigator, and chip/tag CSS patterns |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
