---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens, mapped to front-end components and database fields (source of truth)
version: 3.0.0
dependencies: [guide_appearance.md, detailed_module_sitemap.md, data_schema.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Portal. The portal spans two pages: `admin.html` (login only) and `dashboard.html` (the full dashboard). After a successful login, the browser redirects from `admin.html` to `dashboard.html`. On load, `dashboard_auth.js` verifies the session via `load_middleware.js`; if the session is invalid it redirects back to `admin.html`. `dashboard_init.js` then renders the module tab bar and loads the default module (`records-all`). There is no sidebar.

The **Dashboard** header link navigates to a card-based landing page showing all 10 modules in a 3×3+tenth grid. Clicking any card opens that module's editor view. The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

Each section includes a **DB Fields** block listing the exact column names from `data_schema.md` that are read or written by that dashboard view. This is the authoritative reference for which part of the `records` table each editor owns.

---

## Module Index

1. All Records
2. Single Record
3. Ordinary Lists
4. Bulk CSV
5. Arbor
6. Wikipedia
7. Challenge
8. Responses
9. Essay & Historiography
10. Challenge Response
11. News & Sources
12. Blog Posts
13. System

---

## 0.1 Layout Convention — Providence 3-Column Pattern (Dashboard Shell)

**Purpose:** Shared `.providence-editor-grid` architectural shell inherited by all dashboard editor modules. The three Providence column divs are **immutable structural elements** — never cleared or replaced by JavaScript. Only their inner content children are populated via `_setColumn()`.

**Render chain:** `dashboard.html` (static shell) → `dashboard_init.js` → `renderTabBar("module-tab-bar", ...)` → `loadModule(moduleName)` → `_clearColumns()` → `_setColumn("actions"/"list"/"editor", html)`

**Variable widths:** CSS custom properties `--editor-col-two-fr` and `--editor-col-three-fr` (default `1fr` / `2fr`) let modules request wider columns via `_setGridColumns(twoFr, threeFr)`. CSS custom property `--editor-col-one-width` controls the fixed actions column width (default `160px`). Divider tracks (1px) and gap tracks (24px) never change.

**CSS files:**
- `css/1.0_foundation/dashboard/admin_shell.css` — Dashboard chrome, header, canvas background
- `css/1.0_foundation/dashboard/admin_components.css` — Providence grid, dividers, column width hooks
- `css/7.0_system/dashboard/dashboard_universal_header.css` — Standardized header aesthetics

```
+===================================================================================+
|  <header class="admin-header">                                                     |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ [✦✦]  <h1>The JesusWebsite Dashboard</h1>  [Return to Frontend] [Dashboard] [Logout] │
|  │ .admin-header__favicon  .admin-header h1  .admin-return-btn .admin-dash-btn .admin-logout │
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|  CSS: admin_shell.css §1  |  admin_universal_header.css                           |
+===================================================================================+
|  <nav id="module-tab-bar">                                                         |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ [★ All Records] [Single Record] [Ordinary Lists] [Arbor] [Wikipedia]         │  |
|  │ [Challenge] [Responses] [Essay & Hist.] [Challenge Resp.] [News & Sources]   │  |
|  │ [Blog Posts] [System]                                                        │  |
|  │ Rendered by dashboard_init.js → renderTabBar("module-tab-bar", …)           │  |
|  │ CSS: admin_components.css §1 (.admin-tab-bar, .admin-tab-btn, .is-active)    │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+===================================================================================+
|  <main class="admin-canvas providence-editor-grid" id="admin-canvas">              |
|                                                                                    |
|  COL 1 — 160px           │  COL 2 — 1fr            │  COL 3 — 2fr                 |
|  (--editor-col-one-width) │  (--editor-col-two-fr)   │  (--editor-col-three-fr)     |
|                           │                         │                               |
|  <div .providence-        │ 1px  │ 24px │ <div      │ 1px  │ 24px │ <div          |
|       editor-col-actions  │ div- │ gap  │  .provid-  │ div- │ gap  │  .provid-     |
|       id="canvas-col-     │ ider │      │  ence-     │ ider │      │  ence-        |
|       actions">           │      │      │  editor-   │      │      │  editor-      |
|  ┌─────────────────────┐  │      │      │  col-list  │      │      │  col-editor   |
|  │ Action Buttons      │  │      │      │  id="can-  │      │      │  id="canvas-  |
|  │ & Primary Controls  │  │      │      │  vas-col-  │      │      │  col-editor"> |
|  │                     │  │      │      │  list">    │      │      │  ┌──────────┐ │ |
|  │ Populated by        │  │      │      │  ┌───────┐ │      │      │  │ Main     │ │ |
|  │ _setColumn(         │  │      │      │  │ Sub-   │ │      │      │  │ Editor   │ │ |
|  │   "actions", html)  │  │      │      │  │ fields,│ │      │      │  │ Form &   │ │ |
|  │                     │  │      │      │  │ Meta-  │ │      │      │  │ Live     │ │ |
|  │ NEVER innerHTML     │  │      │      │  │ data,  │ │      │      │  │ Previews │ │ |
|  │ replaced wholesale  │  │      │      │  │ Second-│ │      │      │  │          │ │ |
|  │                     │  │      │      │  │ ary    │ │      │      │  │ Populated│ │ |
|  │                     │  │      │      │  │ Controls│ │     │      │  │ by       │ │ |
|  │                     │  │      │      │  │        │ │      │      │  │ _setCol- │ │ |
|  │                     │  │      │      │  │ Popul- │ │      │      │  │ umn(     │ │ |
|  │                     │  │      │      │  │ ated by│ │      │      │  │ "editor",│ │ |
|  │                     │  │      │      │  │ _setCol-│ │     │      │  │ html)    │ │ |
|  │                     │  │      │      │  │ umn(    │ │     │      │  │ — OR —   │ │ |
|  │                     │  │      │      │  │ "list", │ │     │      │  │ _clearCol │ │ |
|  │                     │  │      │      │  │ html)   │ │     │      │  │ umnContent│ │ |
|  │                     │  │      │      │  │         │ │     │      │  │ +        │ │ |
|  │                     │  │      │      │  │ NEVER   │ │     │      │  │ _setColumn│ │ |
|  │                     │  │      │      │  │ innerHTML│ │     │      │  │ (for re-  │ │ |
|  │                     │  │      │      │  │ replaced│ │      │      │  │ renders) │ │ |
|  │                     │  │      │      │  │ wholesale│ │     │      │  └──────────┘ │ |
|  └─────────────────────┘  │      │      │  └───────┘ │      │      │               │ |
|                           │      │      │             │      │      │               │ |
|  CSS: admin_components.css §2 (.providence-editor-grid, .providence-editor-col-*)  │
|  Thin dividers: 1px grid tracks with background-color: var(--color-border)         │
|  Gaps: 24px var(--space-6) empty grid tracks                                       │
|  IMMUTABLE SHELL: Columns never cleared or replaced — only content is populated    │
+===================================================================================+
|  <footer id="status-bar">                                                           |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ [ Status Bar: System running normally / Error logs appear here ]             │  |
|  │ Rendered by display_error_footer.js  |  Errors routed via error_handler.js   │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+===================================================================================+
```

> **Immutable Shell Contract:** The three Providence column `<div>`s inside `<main id="admin-canvas">` are permanent structural elements. JavaScript modules must never call `innerHTML = ""` or `innerHTML = "..."` directly on any column ID (`canvas-col-actions`, `canvas-col-list`, `canvas-col-editor`). All content injection goes through `_setColumn()`. Intra-module re-renders must call `_clearColumnContent(colName)` before `_setColumn(colName, html)`.
>
> **Note:** Child modules (`edit_picture.js`, `edit_links.js`) bypass the grid and inject directly into `edit_record.js` parent columns.
>
> **Dual-Pane Modules:** Several modules (Wikipedia, Challenge, Essay & Historiography, Challenge Response, News & Sources, Blog Posts) use a dual-pane layout that still runs within the Providence 3-column grid. Their Column 2 and Column 3 are merged visually via `_setGridColumns()` to create the sidebar + main area ratio. The immutable column divs remain structurally present.
>
> **Dashboard Landing Page:** The card-based landing page (accessed via the "Dashboard" header link) renders outside the Providence editor grid — it fills `#admin-canvas` with a 3×3+tenth card grid directly. See §7.1.

---

## 0.2 Field Ownership Map

Quick-reference index showing which dashboard section owns each `records` column.

| Column | Type | Owned By |
|--------|------|----------|
| `id` | TEXT (ULID) | Auto-generated on create (§2.2 / §2.4) |
| `title` | TEXT | §2.2 edit_record.js |
| `slug` | TEXT | §2.2 edit_record.js |
| `picture_name` | TEXT | §2.2 picture_handler.js (shared tool) |
| `picture_bytes` | BLOB | §2.2 picture_handler.js (shared tool) |
| `picture_thumbnail` | BLOB | §2.2 picture_handler.js (shared tool) |
| `description` | TEXT (JSON Array) | §2.2 description_editor.js (shared tool) |
| `snippet` | TEXT (JSON Array) | §2.2 snippet_generator.js (shared tool) |
| `bibliography` | TEXT (JSON Blob) | §2.2 mla_source_handler.js (shared tool) |
| `era` | TEXT (Enum) | §2.2 taxonomy_selector.js |
| `timeline` | TEXT (Enum) | §2.2 taxonomy_selector.js |
| `map_label` | TEXT (Enum) | §2.2 map_fields_handler.js |
| `geo_id` | INTEGER | §2.2 map_fields_handler.js |
| `gospel_category` | TEXT (Enum) | §2.2 taxonomy_selector.js |
| `primary_verse` | TEXT (JSON Array) | §2.2 verse_builder.js (shared tool) |
| `secondary_verse` | TEXT (JSON Array) | §2.2 verse_builder.js (shared tool) |
| `context_links` | TEXT (JSON Blob) | §2.2 context_link_handler.js (shared tool) |
| `parent_id` | TEXT (Foreign Key) | §2.2 parent_selector.js + §3.1 dashboard_arbor.js |
| `created_at` | TEXT (ISO8601) | Auto-generated on create (§2.2 / §2.4) |
| `updated_at` | TEXT (ISO8601) | Auto-updated on save (§2.2 / §2.4) |
| `context_essays` | TEXT (JSON Array) | §5.1 dashboard_essay_historiography.js |
| `theological_essays` | TEXT (JSON Array) | §5.1 dashboard_essay_historiography.js |
| `spiritual_articles` | TEXT (JSON Array) | §5.1 dashboard_essay_historiography.js |
| `ordo_salutis` | TEXT (Enum) | §5.1 dashboard_essay_historiography.js |
| `metadata_json` | TEXT (JSON Blob) | §2.2 metadata_handler.js (shared tool) |
| `iaa` | TEXT | §2.2 external_refs_handler.js |
| `pledius` | TEXT | §2.2 external_refs_handler.js |
| `manuscript` | TEXT | §2.2 external_refs_handler.js |
| `url` | TEXT (JSON Blob) | §2.2 url_array_editor.js |
| `wikipedia_link` | TEXT (JSON Blob) | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_rank` | INTEGER | §4.1 wikipedia_ranking_calculator.js |
| `wikipedia_title` | TEXT | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_weight` | TEXT (Label-Value) | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_search_terms` | TEXT (JSON Blob) | §4.1 wikipedia_sidebar_handler.js |
| `popular_challenge_link` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `popular_challenge_title` | TEXT | §4.2 challenge_weighting_handler.js |
| `popular_challenge_rank` | INTEGER | §4.2 challenge_ranking_calculator.js |
| `popular_challenge_weight` | TEXT (Label-Value) | §4.2 challenge_weighting_handler.js |
| `popular_challenge_search_term` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_link` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_title` | TEXT | §4.2 challenge_weighting_handler.js |
| `academic_challenge_rank` | INTEGER | §4.2 challenge_ranking_calculator.js |
| `academic_challenge_weight` | TEXT (Label-Value) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_search_term` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `responses` | TEXT (JSON Blob) | §4.3 insert_challenge_response.js + §5.2 dashboard_challenge_response.js |
| `challenge_id` | TEXT (FK → records.id) | §5.2 challenge_link_handler.js |
| `blogposts` | TEXT (JSON Blob) | §6.2 dashboard_blog_posts.js |
| `news_sources` | TEXT (Label-Value) | §6.1 news_sources_handler.js |
| `news_items` | TEXT (JSON Blob) | §6.1 news_sources_handler.js |
| `news_search_term` | TEXT (JSON Blob) | §6.1 search_keywords_handler.js |
| `users` | TEXT (JSON Blob) | System-managed (not manually edited) |
| `page_views` | INTEGER | System-managed (auto-incremented — not manually edited) |

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

> **Note:** This module does NOT use the Providence 3-column grid. It renders as a full-width flat layout within `#admin-canvas`, replacing the grid entirely for this module. The Bulk CSV workflow (previously a separate tab) is now integrated as the "Bulk" toggle within this view.

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
iaa               TEXT               — Internal Attestation Assessment value
pledius           TEXT               — Pledius classification value
manuscript        TEXT               — manuscript tradition reference
url               TEXT (JSON Blob)   — canonical and external URL references

── METADATA & STATUS  [shared tool: metadata_handler.js] ─────────────────
metadata_json     TEXT (JSON Blob)   — general-purpose metadata blob
status            TEXT               — Draft / Published toggle

── NOT EXPOSED HERE (managed in other sections) ──────────────────────────
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
news_items          → §6.1 news_sources_handler.js
news_search_term    → §6.1 search_keywords_handler.js
users               → system-managed
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
| [ Status Bar: System running normally / Error logs appear here ]                                   |
+====================================================================================================+
```

> **Note:** This module does NOT use the Providence 3-column grid. It renders as a full-width vertically stacked form layout within `#admin-canvas`. The section navigator bar is sticky at the top.

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
| `js/2.0_records/dashboard/metadata_handler.js` | 🔑 Shared tool: Metadata footer |
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

## 3.0 Visualizations Module
**Scope:** Arbor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Backend for Visual Interactive Displays (`dashboard_arbor.js`)
**Corresponds to Public Section:** 3.1 (Evidence Graph / Arbor Diagrams)
*(Note: Maps (3.3) and Timelines (3.2) are driven by `era`, `timeline`, and `map_label` set in §2.2 — they have no separate editor.)*
**Purpose:** Interactive drag-and-drop tool for building the recursive parent-child 'Arbor' evidence tree. Features a canvas-based node editor that mimics the frontend visualization.

**Plan:** `plan_dashboard_arbor.md`

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
parent_id         TEXT (Foreign Key)  — sets the recursive parent-child
                                        relationship between records

── READ ONLY (node display) ──────────────────────────────────────────────
id                TEXT               — node identifier
title             TEXT               — node label
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Refresh ]   [ Publish ]                                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  (Root Node) --+-- (Child 1) --+-- (Sub 1)                                      |
|                |               |                                                |
|                |               +-- (Sub 2)                                      |
|                |                                                                |
|                +-- (Child 2) ----- (Sub 3)                                      |
|                                                                                 |
|  [Drag & Drop UI matching Frontend Arbor]                                       |
|                                                                                 |
|  Orphan Nodes (no parent_id):                                                   |
|  [Ascension ▼]  [Last Supper ▼]  [Transfiguration ▼]                            |
|                                                                                 |
|  Each node: [+Child] dropdown adds a child from orphan pool                      |
|  Each node: [Remove] promotes node to root (parent_id = null)                    |
|                                                                                 |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                 |
+---------------------------------------------------------------------------------+

── API ROUND-TRIP: dashboard_arbor.js → admin_api.py → SQLite ────────────────────────

  LOAD:  GET /api/admin/diagram/tree
         → SELECT id, title, parent_id FROM records ORDER BY title
         → Returns {"nodes": [{"id":"…","title":"…","parent_id":…}]}

  EDIT:  DnD updates window.__diagramNodes in memory
         Changes tracked in window.__changedNodes Map
         Every drag-and-drop re-parenting auto-saves as draft

  SAVE:  PUT /api/admin/diagram/tree
         Body: {"updates": [{"id":"…","parent_id":"…"},…]}
         → Validates IDs exist (422 if missing)
         → Detects direct circular refs (422 if found)
         → BEGIN TRANSACTION / UPDATE batch / COMMIT or ROLLBACK

  PUBLISH: Commit all draft parent_id changes to live
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_arbor.html` | Interactive diagram container |
| `css/3.0_visualizations/dashboard/dashboard_arbor.css` | Canvas & node aesthetics |
| `js/3.0_visualizations/dashboard/dashboard_arbor.js` | Module orchestration |
| `js/3.0_visualizations/dashboard/fetch_arbor_data.js` | API interface for tree fetching |
| `js/3.0_visualizations/dashboard/render_arbor_node.js` | Individual node creation |
| `js/3.0_visualizations/dashboard/draw_arbor_connections.js` | SVG/Canvas connection lines |
| `js/3.0_visualizations/dashboard/handle_node_drag.js` | Drag-and-drop interaction |
| `js/3.0_visualizations/dashboard/update_node_parent.js` | Parent-child re-assignment |

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).

### 4.1 Backend for Wikipedia Weights (`dashboard_wikipedia.js`)
**Corresponds to Public Sections:** 4.1 (Ranked Wikipedia Views)
**Purpose:** Dual-pane interface for managing Wikipedia article rankings. Left sidebar shows contextual record details (weight, search terms, metadata) for the selected record. Right pane displays the ranked list with endless scroll.

**Plan:** `plan_dashboard_wikipedia.md`

**DB Fields:**
```
── wikipedia_sidebar_handler.js ─────────────────────────────────────────
wikipedia_link         TEXT (JSON Blob)    — source link data
wikipedia_title        TEXT                — article title
wikipedia_weight       TEXT (Label-Value)  — multiplier for rank algorithm
wikipedia_search_terms TEXT (JSON Blob)    — search terms for Wikipedia pipeline

── wikipedia_ranking_calculator.js ──────────────────────────────────────
wikipedia_rank         INTEGER             — rank position
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:                       [ Refresh ]   [ Publish ]   [ Recalculate ] |
+---------------------------------------------------------------------------------+
| Record Detail Sidebar            | Wikipedia Items (Main Area)                  |
| (contextual — selected record)   |                                               |
|----------------------------------+-----------------------------------------------|
| RECORD: Tacitus — Annals         | 1. Tacitus — Annals    (Score: 42)  [select] |
| Slug: tacitus-annals             |    wikipedia.org/wiki/Annals_(Tacitus)         |
|                                  |                                               |
| Wikipedia Weight:                | 2. Josephus — Antiquities (Score: 38) [select] |
| [ x 1.20 ]  [Save Weight]       |    wikipedia.org/wiki/...                      |
|                                  |                                               |
| Wikipedia Search Terms:          | 3. Pliny the Younger   (Score: 35)  [select]  |
| +--------------------------------+    wikipedia.org/wiki/...                      |
| | Tacitus Annals            [x]  |                                               |
| | Tacitus historiography    [x]  | ... (Endless Scroll paginated)                 |
| | Roman historiography Jesus[x]  |                                               |
| +--------------------------------+                                               |
| [ Add Term ___________ ] [Add]   |                                               |
|                                  |                                               |
| --------------------------------- |                                               |
| Snippet:                          |                                               |
| [ Tacitus provides one of the...]|                                               |
| Slug: [ tacitus-annals      ]    |                                               |
| Meta: [ {"era":"early_empire"} ] |                                               |
| [Auto-gen Snippet] [Auto-gen Slug] [Auto-gen Meta]                               |
|                                  |                                               |
| [ Recalculate This Record ]      |                                               |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Any weight, search term, or metadata modification auto-saves the record as draft. "Refresh" re-sorts the list and sets affected records to draft. "Recalculate" re-fetches Wikipedia data via the pipeline and sets the record to draft. Only "Publish" commits the final ranked order and sets all listed records to published.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_wikipedia.html` | Wikipedia list management container |
| `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css` | Sidebar controls & list aesthetics |
| `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js` | Module orchestration |
| `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js` | Data fetching & row hydration |
| `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js` | Sidebar: weight, search terms, metadata |
| `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js` | Ranking & weight logic |
| `backend/pipelines/pipeline_wikipedia.py` | Wikipedia API ingestion pipeline |

---

### 4.2 Backend for Challenge Weights (`dashboard_challenge.js`)
**Corresponds to Public Sections:** 4.2 (Ranked Challenge Views)
**Purpose:** Dual-pane interface for managing Academic and Popular challenge rankings. A toggle bar switches between the two lists. Features a weighting sidebar, per-record search term management, Agent Search (DeepSeek-powered web article discovery), and full draft/publish cycle.

**Plan:** `plan_dashboard_challenge.md`

**DB Fields:**
```
── Academic Challenges (challenge_weighting_handler.js) ─────────────────
academic_challenge_link        TEXT (JSON Blob)
academic_challenge_title       TEXT
academic_challenge_rank        INTEGER
academic_challenge_weight      TEXT (Label-Value)
academic_challenge_search_term TEXT (JSON Blob)    — DeepSeek agent search terms

── Popular Challenges (challenge_weighting_handler.js) ──────────────────
popular_challenge_link         TEXT (JSON Blob)
popular_challenge_title        TEXT
popular_challenge_rank         INTEGER
popular_challenge_weight       TEXT (Label-Value)
popular_challenge_search_term  TEXT (JSON Blob)    — DeepSeek agent search terms

── Response linking (insert_challenge_response.js) ──────────────────────
responses                      TEXT (JSON Blob)    — links to response records
challenge_id                   TEXT (FK)           — set on response record
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Academic | Popular ] Toggle   [ Refresh ]   [ Publish ]         |
|               [ Agent Search ]   [ Insert Response ]                             |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar) | Challenge Items (Main Area)                         |
|---------------------------+-----------------------------------------------------|
| Difficulty (8)            | 1. Challenge Title One (Total Score: 85)            |
| [^] [v]                   |    └─ Response: (Draft)  [Edit]                     |
|                           |                                                     |
| Popularity (3)            | 2. Challenge Title Two (Total Score: 72)            |
| [^] [v]                   |    └─ Response: (Published)  [Edit]                 |
|                           |                                                     |
|                           | 3. Challenge Title Three (Total Score: 60)          |
| [New Name] [Val] [Publish]|                                                     |
|                           | ... (Endless Scroll)                                |
|                           |                                                     |
| Search Terms (per record):|                                                     |
| [ term 1              [x]]|                                                     |
| [ term 2              [x]]|                                                     |
| [ Add Term _________ ] [Add]                                                    |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Any weight or search term modification auto-saves as draft. "Refresh" re-sorts and sets affected records to draft. "Agent Search" triggers the DeepSeek pipeline, writes discovered articles as draft. Only "Publish" commits ranks to live and sets records to published. "Insert Response" creates a new draft response linked to the selected challenge and navigates to the Challenge Response editor (§5.2).

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_challenge.html` | Challenge list management container |
| `css/4.0_ranked_lists/dashboard/dashboard_challenge.css` | Sidebar controls & list aesthetics |
| `js/4.0_ranked_lists/dashboard/dashboard_challenge.js` | Module orchestration |
| `js/4.0_ranked_lists/dashboard/challenge_list_display.js` | Data fetching & row hydration |
| `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js` | Weight & search term management |
| `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js` | Score/rank logic + Agent Search |
| `js/4.0_ranked_lists/dashboard/insert_challenge_response.js` | Response creation & linking |
| `backend/pipelines/pipeline_academic_challenges.py` | Academic challenge pipeline |
| `backend/pipelines/pipeline_popular_challenges.py` | Popular challenge pipeline |
| `backend/scripts/agent_client.py` | DeepSeek API client (shared) |

---

### 4.3 Backend for Inserting Responses (`insert_challenge_response.js`)
**Corresponds to Public Sections:** 4.2 (Challenge Views with Response Inserted)
**Purpose:** Browse challenge lists and link a written response to a specific challenge record. The response content itself is authored in §5.2. This functionality is integrated into the Challenge dashboard (§4.2) via the "Insert Response" button and the Responses tab.

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
responses         TEXT (JSON Blob)   — links this record to one or more
                                        response records; content authored
                                        in §5.2 dashboard_challenge_response.js
challenge_id      TEXT (FK)          — set on the new response record

── READ ONLY (list display) ──────────────────────────────────────────────
academic_challenge_title  TEXT       — challenge label (Academic tab)
academic_challenge_rank   INTEGER    — sort order
popular_challenge_title   TEXT       — challenge label (Popular tab)
popular_challenge_rank    INTEGER    — sort order
```

```text
+-----------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >        |
+-----------------------------------------------------------------------------------+
| [ All Records ] [ Single Record ] [ Ordinary Lists ] [ Arbor ] [ Wikipedia ]      |
| [ Challenge ] [ ★ Responses ] [ Essay & Hist. ] [ Challenge Resp. ]              |
| [ News & Sources ] [ Blog Posts ] [ System ]                                      |
+-----------------------------------------------------------------------------------+
| [ ★ Academic ] [ Popular ]                                                         |
+-----------------------------------------------------------------------------------+
| COL 1                  | COL 2                     | COL 3 — INSERT RESPONSES                |
|                        | (reserved)                | Academic Challenges                      |
|                        |                           | WRITE: responses                         |
|                        |                           | READ:  academic_challenge_title          |
|                        |                           |        academic_challenge_rank           |
|                        |                           |                                          |
|                        |                           | [ Search challenge list...          ]    |
|                        |                           |------------------------------------------|
|                        |                           | 1. historicity-of-miracles               |
|                        |                           |    responses: [none]   [+ Add Response]  |
|                        |                           |------------------------------------------|
|                        |                           | 2. jesus-myth-theory                     |
|                        |                           |    responses: [response-001]             |
|                        |                           |               [Remove]         [Edit]   |
|                        |                           |------------------------------------------|
|                        |                           | (+ Add Response opens §5.2 editor)       |
+-----------------------------------------------------------------------------------+
```

---

## 5.0 Essays & Responses Module
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1 Backend for Essay & Historiography Layouts (`dashboard_essay_historiography.js`)
**Corresponds to Public Sections:** 5.1 (Context Essay & Historiography Layouts)
**Purpose:** Split-pane markdown editor for authoring context essays and the historiography essay. Features a sidebar with search-filterable document list grouped by Published/Drafts, and a WYSIWYG editor with live preview. The Essay / Historiography toggle switches between the two document types.

**Plan:** `plan_dashboard_essay_historiography.md`

**DB Fields:**
```
── Written by dashboard_essay_historiography.js ─────────────────────────
context_essays      TEXT (JSON Array)  — slugs of context essays linked
                                         to this record
theological_essays  TEXT (JSON Array)  — slugs of theological essays linked
spiritual_articles  TEXT (JSON Array)  — slugs of spiritual articles linked
ordo_salutis        TEXT (Enum)        — order-of-salvation classification
                                         8 values: Predestination,
                                         Regeneration, Faith, Repentance,
                                         Justification, Sanctification,
                                         Perseverance, Glorification
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Essay | Historiography ] Toggle     [ Save | Publish | Delete ] |
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]        |
| *Published*               |                                                     |
| - Item 1                  |                                                     |
| - Item 2                  | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Item A            | |  Markdown content goes here...                |   |
|                           | |                                               |   |
|                           | +-----------------------------------------------+   |
| (Endless Scroll)          |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
|                           | MLA Sources: [_________] Context Links: [_____]     |
|                           | ordo_salutis: [Dropdown — 8 values ▼]               |
|                           | context_essays: [slug ×] [+ Link]                    |
|                           | theological_essays: [slug ×] [+ Link]                |
|                           | spiritual_articles: [slug ×] [+ Link]               |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_essay_historiography.html` | Split-pane editor container |
| `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css` | Dual-state layout & toolbar |
| `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css` | Markdown input & live preview |
| `js/5.0_essays_responses/dashboard/dashboard_essay_historiography.js` | Dual-state toggle orchestrator |
| `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` | Content fetching & population |
| `js/5.0_essays_responses/dashboard/search_essays.js` | Sidebar search & filtering |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | 🔑 Shared tool: WYSIWYG & live preview |
| `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete logic |

**Shared tools consumed via `<script>` tag:**
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/context_link_handler.js` — Context links
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

### 5.2 Backend for Challenge Response Layout (`dashboard_challenge_response.js`)
**Corresponds to Public Sections:** 5.2 (Challenge Response Layouts)
**Purpose:** Split-pane markdown editor for authoring challenge responses. Features a sidebar with search-filterable response list grouped by Academic/Popular, and a WYSIWYG editor with live preview. Response records can be linked to parent challenges via the Challenge Link Handler.

**Plan:** `plan_dashboard_challenge_response.md`

**DB Fields:**
```
── Written by dashboard_challenge_response.js ────────────────────────────
responses           TEXT (JSON Blob)   — full response content + metadata
                                         (also linked from §4.3)

── challenge_link_handler.js ────────────────────────────────────────────
challenge_id        TEXT (FK → records.id) — parent challenge association
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
| Response Sidebar          | Response WYSIWYG Editor                             |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]        |
| *Academic*                |                                                     |
| - Response 1 (Draft)      |                                                     |
| - Response 2 (Pub)        | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Popular*                 | |                                               |   |
| - Response A (Pub)        | |  Markdown response content goes here...       |   |
|                           | |                                               |   |
|                           | +-----------------------------------------------+   |
|                           |                                                     |
|                           | Challenge Link: [challenge-slug ▼]  (or "None")     |
|                           | Snippet: [_______________________] [Generate]       |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_challenge_response.html` | Split-pane response editor container |
| `css/5.0_essays_responses/dashboard/dashboard_challenge_response.css` | Response editor layout |
| `css/5.0_essays_responses/dashboard/response_markdown.css` | Markdown editor & preview styling |
| `js/5.0_essays_responses/dashboard/dashboard_challenge_response.js` | Module orchestration |
| `js/5.0_essays_responses/dashboard/display_challenge_response_data.js` | Response fetching & population |
| `js/5.0_essays_responses/dashboard/search_responses.js` | Sidebar search & filtering |
| `js/5.0_essays_responses/dashboard/response_status_handler.js` | Save/Publish/Delete logic |
| `js/5.0_essays_responses/dashboard/challenge_link_handler.js` | Parent challenge association |

**Shared tools consumed via `<script>` tag:**
- `js/5.0_essays_responses/dashboard/markdown_editor.js` — 🔑 Shared tool: WYSIWYG editor (owned by §5.1)
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

## 6.0 News & Blog Module
**Scope:** News Articles & Sources, Blog Posts.

### 6.1 Backend for News Articles & Sources (`dashboard_news_sources.js`)
**Corresponds to Public Sections:** 6.1 (Combined News & Blog Landing Page), 6.2 (News Feed Page)
**Purpose:** Dual-pane interface for managing external news sources and the automated news crawler. Left sidebar shows contextual record details (search keywords, source URLs, snippet/slug/metadata with auto-gen). Right pane displays the news sources list with status indicators.

**Plan:** `plan_dashboard_news_sources.md`

**DB Fields:**
```
── news_sources_handler.js ──────────────────────────────────────────────
news_sources      TEXT (Label-Value)   — named external source references
news_items        TEXT (JSON Blob)     — news snippet content and metadata

── search_keywords_handler.js ───────────────────────────────────────────
news_search_term  TEXT (JSON Blob)     — per-record search keywords for crawler
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Refresh ]   [ Publish ]   [ Crawl ]                             |
+---------------------------------------------------------------------------------+
| Record Detail Sidebar         | News Sources List (Main Area)                   |
| (contextual — selected source)|                                                 |
|-------------------------------+-------------------------------------------------|
| SOURCE: Example News          | Source Name          | URL            | Status  |
| URL: example.com/news         | ---------------------+----------------+-------- |
|                               | Example News         | example.com/.. | Active  |
| Search Keywords:              | Christian Post       | cpost.com/rss  | Active  |
| +----------------------------+| Daily Bugle          | bugle.com      | Inactive|
| | keyword 1             [x]  || ...                                            |
| | keyword 2             [x]  || (Endless Scroll)                               |
| +----------------------------+|                                                 |
| [ Add Keyword _________ ] [Add]                                                |
|                               |                                                 |
| ----------------------------- |                                                 |
| Snippet:                       |                                                 |
| [ Latest headlines from...   ]|                                                 |
| Slug: [ example-news       ]  |                                                 |
| Meta: [ {"region":"us"}     ] |                                                 |
| [Auto-gen Snippet] [Auto-gen Slug] [Auto-gen Meta]                             |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]               |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Any keyword modification auto-saves as draft. "Refresh" re-fetches the sources list and sets affected records to draft. "Crawl" triggers the news crawler pipeline — crawled items are saved as draft. Only "Publish" commits the current source configuration to live and sets records to published.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_news_sources.html` | News source management container |
| `css/6.0_news_blog/dashboard/news_sources_dashboard.css` | Pipeline control aesthetics |
| `js/6.0_news_blog/dashboard/dashboard_news_sources.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/news_sources_handler.js` | Data fetching & row hydration |
| `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js` | Sidebar: keywords, URLs, crawler |
| `js/6.0_news_blog/dashboard/search_keywords_handler.js` | Search keyword management |
| `js/6.0_news_blog/dashboard/launch_news_crawler.js` | Crawler pipeline trigger |
| `backend/pipelines/pipeline_news.py` | News crawler pipeline |

**Shared tools consumed via `<script>` tag:**
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

### 6.2 Backend for Blog Posts (`dashboard_blog_posts.js`)
**Corresponds to Public Section:** 6.3 (Blog Feed Page)
**Purpose:** Split-pane WYSIWYG editor for authoring and managing blog posts. Features a sidebar with Published/Drafts list, and a markdown editor with live preview and integrated metadata management.

**Plan:** `plan_dashboard_blog_posts.md`

**DB Fields:**
```
── dashboard_blog_posts.js ──────────────────────────────────────────────
blogposts         TEXT (JSON Blob)     — blog post content and metadata
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
| Blog Posts Sidebar        | Blog Post WYSIWYG Editor                            |
|---------------------------+-----------------------------------------------------|
| *Published*               | Title: [___________________________________]        |
| - Blog Post 1             |                                                     |
| - Blog Post 2             | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Post A            | |  Markdown blog post content goes here...      |   |
| - Draft Post B            | |                                               |   |
|                           | +-----------------------------------------------+   |
| (Endless Scroll)          |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
|                           | MLA Sources: [_________] Context Links: [_____]     |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_blog_posts.html` | Split-pane blog editor container |
| `css/6.0_news_blog/dashboard/blog_posts_dashboard.css` | Navigator sidebar & editor layout |
| `css/6.0_news_blog/dashboard/blog_WYSIWYG_editor.css` | Markdown editor & preview styling |
| `js/6.0_news_blog/dashboard/dashboard_blog_posts.js` | Module orchestration |
| `js/6.0_news_blog/dashboard/display_blog_posts_data.js` | Blog post fetching & population |
| `js/6.0_news_blog/dashboard/blog_post_status_handler.js` | Save/Publish/Delete logic |

**Shared tools consumed via `<script>` tag:**
- `js/5.0_essays_responses/dashboard/markdown_editor.js` — 🔑 Shared tool: WYSIWYG editor (owned by §5.1)
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/context_link_handler.js` — Context links
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

## 7.0 System Module
**Scope:** Authentication, session management, dashboard shell, card landing page, system health monitoring, agent activity.

### 7.1 Dashboard System (`dashboard_orchestrator.js`, `dashboard_system.js`)
**Purpose:** Two-page architecture that separates authentication (login) from the dashboard itself, a card-based landing page for module navigation, and a system health monitoring hub.

**Page flow:**
1. User visits `admin.html` — login form only; no dashboard markup or scripts.
2. On successful login, the backend sets an HttpOnly JWT cookie and the browser redirects to `dashboard.html`.
3. On load, `dashboard_auth.js` calls `window.verifyAdminSession()` (from `load_middleware.js`). If the session cookie is invalid, it redirects back to `admin.html`.
4. `dashboard_init.js` runs on DOMContentLoaded: calls `renderTabBar("module-tab-bar", allModules, "records-all")` to populate the module tab bar, wires the logout button, and calls `loadModule("records-all")` to render the default view.
5. Clicking **Dashboard** in the header renders the card landing page (10 cards in a 3×3+tenth grid).
6. Clicking any module card opens that module's editor view.
7. `loadModule()` updates the active tab state and populates `#admin-canvas`.

**DB Fields:**
```
── NO WRITES TO `records` TABLE ──────────────────────────────────────────
System-managed fields (never manually edited in any dashboard section):
  users             TEXT (JSON Blob)  — access control; set programmatically
  page_views        INTEGER           — auto-incremented on public page load;
                                        read-only across all admin views
```

**`admin.html` — Login Page:**
```text
+-----------------------------------------------------------------------------------+
| [ The Jesuswebsite ]                                                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                    ┌─────────────────────────────┐                               |
|                    │   Admin Login               │                               |
|                    │                             │                               |
|                    │   Password: [____________]  │                               |
|                    │                             │                               |
|                    │            [Login]          │                               |
|                    │                             │                               |
|                    │   [ Error message here ]    │                               |
|                    └─────────────────────────────┘                               |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

**`dashboard.html` — Card Landing Page (Dashboard):**
```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >     |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | All Records        |  | Single Record      |  | Arbor Diagram      |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Browse & manage    |  | Deep-dive record   |  | Visual evidence    |         |
|  | all records        |  | editor             |  | tree editor        |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Wikipedia          |  | Challenges         |  | Challenge Resp.    |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Rank Wikipedia     |  | Manage debate      |  | Author scholarly   |         |
|  | articles           |  | challenges         |  | responses          |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Essay & Hist.      |  | News Sources       |  | Blog Posts         |         |
|  | [icon]             |  | [icon]             |  | [icon]             |         |
|  | Write narrative    |  | Manage news        |  | Author blog        |         |
|  | scholarly content  |  | crawler & sources  |  | content            |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|                        +--------------------+                                    |
|                        | System             |                                    |
|                        | [icon]             |                                    |
|                        | Monitor health,    |                                    |
|                        | agents & tests     |                                    |
|                        +--------------------+                                    |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**`dashboard.html` — System Dashboard (Module View):**

**Plan:** `plan_dashboard_system.md`

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Configuration ]   [ Restart Services ]            |
+---------------------------------------------------------------------------------+
| System Data & Logs                                                              |
| +-----------------------------------------------------------------------------+ |
| | Agent Status: Online                                                        | |
| | API Health: OK (99.9% uptime)                                               | |
| | VPS CPU Usage: [|||||     ] 50%                                             | |
| | Security: JWT valid, no active alerts                                       | |
| | DeepSeek API: OK | Tokens Today: 12,450 | Runs Today: 8                     | |
| | MCP Server: Online | Tools: 12 | Errors Today: 0 | Last: 14:31:02           | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Agent Activity Monitor                                                          |
| +-----------------------------------------------------------------------------+ |
| | Started          | Pipeline            | Record       | Status    | Tokens   | |
| |------------------+---------------------+--------------+-----------+----------| |
| | 14:32:01         | academic_challenges | jesus-myth   | completed | 1,240    | |
| | 14:28:55         | popular_challenges  | shroud-turin | failed    | 890      | |
| | 14:25:12         | academic_challenges | q-source     | running   | —        | |
| +-----------------------------------------------------------------------------+ |
| Trace Reasoning (selected run):                                                 |
| +-----------------------------------------------------------------------------+ |
| | Searching "Jesus mythicism scholarly consensus 2024"...                      | |
| | Found 12 candidate articles. Filtering for academic sources...               | |
| | Selected 5 articles with relevance > 70. Assigning scores...                 | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Core Unit & Integration Testing                                                 |
| [ Run All Tests ] [ Run API Tests ] [ Run Agent Tests ]                         |
|                                                                                 |
| Architectural Docs                                                              |
| [ View / Edit Docs ] [ Generate Agents ]                                        |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**Login & Shell File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/login.html` | Authentication entry point |
| `admin/frontend/dashboard.html` | Main dashboard shell |
| `css/7.0_system/admin.css` | Login page styling |
| `css/1.0_foundation/dashboard/admin_components.css` | Providence grid, dividers, width hooks |
| `css/1.0_foundation/dashboard/admin_shell.css` | Dashboard chrome, header, canvas |
| `css/7.0_system/dashboard/dashboard_universal_header.css` | Header aesthetics |
| `js/7.0_system/admin.js` | Login submission & error handling |
| `js/7.0_system/dashboard/dashboard_orchestrator.js` | App initialization & session check |
| `js/7.0_system/dashboard/dashboard_app.js` | Module router: loadModule(), _setGridColumns() |
| `js/7.0_system/dashboard/dashboard_universal_header.js` | Header injection & logout logic |
| `js/7.0_system/dashboard/display_dashboard_cards.js` | Module navigation card rendering |
| `js/7.0_system/dashboard/display_error_footer.js` | Universal status/error log stream UI |
| `js/admin_core/error_handler.js` | Shared error routing API |

**System Dashboard File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_system.html` | System health monitoring container |
| `css/7.0_system/dashboard/dashboard_system.css` | Log stream & gauge aesthetics |
| `js/7.0_system/dashboard/dashboard_system.js` | Module orchestration |
| `js/7.0_system/dashboard/display_system_data.js` | Real-time status polling & health cards |
| `js/7.0_system/dashboard/agent_monitor.js` | Agent run log polling & trace reasoning |
| `js/7.0_system/dashboard/test_execution_logic.js` | Test suite execution & log piping |
| `js/7.0_system/dashboard/agent_generation_controls.js` | Agent generation & doc management |
| `js/7.0_system/dashboard/mcp_monitor.js` | MCP server status polling |

---

## Shared Tool Ownership Reference

> Per `vibe_coding_rules.md` §7, each shared JS tool is OWNED by exactly one plan and lives in ONE directory. Consumer plans MUST NOT create local copies — they include the owner's file via `<script>` tag and call `window.*` APIs.

| Shared Tool | Owner Plan | File Path |
|-------------|-----------|-----------|
| `picture_handler.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/picture_handler.js` |
| `mla_source_handler.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/mla_source_handler.js` |
| `context_link_handler.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/context_link_handler.js` |
| `snippet_generator.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/snippet_generator.js` |
| `metadata_handler.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/metadata_handler.js` |
| `description_editor.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/description_editor.js` |
| `verse_builder.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/verse_builder.js` |
| `markdown_editor.js` | `plan_dashboard_essay_historiography` | `js/5.0_essays_responses/dashboard/markdown_editor.js` |

| Consumer Plan | Shared Tools Consumed |
|---------------|----------------------|
| `plan_dashboard_blog_posts` | `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `markdown_editor.js` |
| `plan_dashboard_essay_historiography` | `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js` |
| `plan_dashboard_challenge_response` | `picture_handler.js`, `mla_source_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `markdown_editor.js` |
| `plan_dashboard_challenge` | `metadata_handler.js` |
| `plan_dashboard_wikipedia` | `snippet_generator.js`, `metadata_handler.js` |
| `plan_dashboard_news_sources` | `snippet_generator.js`, `metadata_handler.js` |

---

## API Route Reference

> Canonical reference for every admin API route. Routes marked **(existing)** already exist in `admin_api.py`. Routes marked **(new)** are implemented by `plan_backend_infrastructure.md`.

### Existing routes (do not modify)

| Method | Path | Purpose |
|:---|:---|:---|
| `POST` | `/api/admin/login` | Admin authentication |
| `POST` | `/api/admin/logout` | Session termination |
| `GET` | `/api/admin/verify` | Session validation |
| `GET` | `/api/admin/records` | List all records (paginated) |
| `GET` | `/api/admin/records/{id}` | Get single record by ID |
| `POST` | `/api/admin/records` | Create new record |
| `PUT` | `/api/admin/records/{id}` | Update record fields |
| `DELETE` | `/api/admin/records/{id}` | Delete record |
| `POST` | `/api/admin/records/{id}/picture` | Upload record picture (PNG) |
| `DELETE` | `/api/admin/records/{id}/picture` | Delete record picture |
| `GET` | `/api/admin/lists/{name}` | Get ranked list entries |
| `PUT` | `/api/admin/lists/{name}` | Replace ranked list |
| `GET` | `/api/admin/diagram/tree` | Get flat node list for Arbor tree |
| `PUT` | `/api/admin/diagram/tree` | Batch-update parent_id relationships |
| `POST` | `/api/admin/bulk-upload` | CSV bulk record ingestion |

### New routes (implemented by plan_backend_infrastructure)

| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/system/config` | Read all system_config key/value pairs |
| `PUT` | `/api/admin/system/config` | Upsert system_config key/value pairs |
| `GET` | `/api/admin/health_check` | System health + DeepSeek API status + VPS resource usage |
| `GET` | `/api/admin/mcp/health` | MCP server status (tools, errors, uptime) |
| `POST` | `/api/admin/snippet/generate` | Trigger snippet_generator.py for a record |
| `POST` | `/api/admin/metadata/generate` | Trigger metadata_generator.py for a record |
| `GET` | `/api/admin/essays` | List all essay records |
| `GET` | `/api/admin/historiography` | Get the single historiography record |
| `GET` | `/api/admin/blogposts` | List all blog post records |
| `DELETE` | `/api/admin/records/{id}/blogpost` | Remove blog post content from record |
| `GET` | `/api/admin/news/items` | List all news item records |
| `POST` | `/api/admin/news/crawl` | Trigger pipeline_news.py crawler |
| `POST` | `/api/admin/responses` | Create a draft challenge response |
| `GET` | `/api/admin/responses` | List all challenge responses |
| `GET` | `/api/admin/responses/{id}` | Get single challenge response by ID |
| `POST` | `/api/admin/agent/run` | Trigger DeepSeek agent pipeline |
| `GET` | `/api/admin/agent/logs` | Paginated agent run history |

---

## Database Tables

> Tables created or modified by `plan_backend_infrastructure.md`.

### `system_config` table
| Column | Type | Purpose |
|--------|------|---------|
| `key` | TEXT PK | Configuration key |
| `value` | TEXT | Configuration value |

### `agent_run_log` table
| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER PK AUTOINCREMENT | Unique run ID |
| `pipeline` | TEXT NOT NULL | e.g. 'academic_challenges', 'popular_challenges', 'snippet_generation', 'metadata_generation' |
| `record_slug` | TEXT | Slug of record being processed (NULL for batch runs) |
| `status` | TEXT NOT NULL | 'running', 'completed', 'failed' |
| `trace_reasoning` | TEXT | Agent's chain-of-thought reasoning log |
| `articles_found` | INTEGER DEFAULT 0 | Count of articles discovered |
| `tokens_used` | INTEGER DEFAULT 0 | Total tokens consumed |
| `error_message` | TEXT | NULL unless status is 'failed' |
| `started_at` | TEXT NOT NULL | ISO-8601 timestamp |
| `completed_at` | TEXT | ISO-8601 timestamp, NULL while running |
