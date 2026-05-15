---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of shared dashboard conventions, tool ownership, API routes, database tables, and WYSIWYG layout — cross-cutting across all modules
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, high_level_schema.md, vibe_coding_rules.md]
---

---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens, mapped to front-end components and database fields (source of truth) — polymorphic single-table schema with `type`/`sub_type` discriminators
version: 3.10.1
dependencies: [guide_appearance.md, detailed_module_sitemap.md, high_level_schema.md, data_schema.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Portal. The portal spans two pages: `admin.html` (login only) and `dashboard.html` (the full dashboard). After a successful login, the browser redirects from `admin.html` to `dashboard.html`. On load, `dashboard_auth.js` verifies the session via `load_middleware.js`; if the session is invalid it redirects back to `admin.html`. `dashboard_init.js` then renders the module tab bar and loads the default module (`records-all`). There is no sidebar.

The **Dashboard** header link navigates to a card-based landing page showing all 10 modules in a 3×3+tenth grid. Clicking any card opens that module's editor view. The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

Each section includes a **DB Fields** block listing the exact column names from `data_schema.md` and `high_level_schema.md` that are read or written by that dashboard view. This is the authoritative reference for which fields each editor owns within the polymorphic `records` single-table (discriminated by `type` and `sub_type`).

---

## Module Index

1. All Records
2. Single Record
3. Ordinary Lists
4. Bulk CSV
5. Arbor
6. Wikipedia
7. Academic Challenges
8. Popular Challenges
9. Responses
10. Essays
11. Historiography
12. Challenge Response
13. News & Sources
14. Blog Posts
15. System

---

## 0.1 Layout Convention — Providence 2-Column Pattern (Dashboard Shell)

**Purpose:** Shared architectural shell inherited by all dashboard editor modules. The two Providence column divs (`#providence-col-sidebar` and `#providence-col-main`) are **immutable structural elements** — never cleared or replaced by JavaScript. Only their inner content children are populated via `_setColumn()`.

**Render chain:** `dashboard.html` (static shell) → `dashboard_orchestrator.js` → `renderDashboardCards()` → `loadModule(moduleName)` → `_clearColumns()` → `_setColumn("sidebar"/"main", html)`

**Variable widths:** CSS custom properties `--sidebar-width` (default `280px`) and `--main-width` (default `1fr`) let modules request custom column widths via `_setLayoutColumns(sidebarWidth, mainWidth)`. When `--sidebar-width` is set to `0px`, the divider and gap tracks collapse so the main area spans the full canvas width. The divider track (1px) and gap track (24px) remain fixed otherwise.

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
|  │ [Academic Challenges] [Popular Challenges] [Responses] [Essay & Hist.]       │  |
|  │ [Challenge Resp.] [News & Sources] [Blog Posts] [System]                     │  |
|  │ Rendered by dashboard_init.js → renderTabBar("module-tab-bar", …)           │  |
|  │ CSS: admin_components.css §1 (.admin-tab-bar, .admin-tab-btn, .is-active)    │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+===================================================================================+
|  <main id="admin-canvas">                                                          |
|                                                                                    |
|  SIDEBAR — 280px                  │  MAIN — 1fr                                   |
|  (--sidebar-width)                │  (--main-width)                                |
|                           │                         │                               |
|  <div .providence-        │ 1px  │ 24px │ <div      │ 1px  │ 24px │ <div          |
|       col-sidebar  │ div- │ gap  │  .provid-  │ div- │ gap  │  .provid-     |
|       id="providence-col-     │ ider │      │  ence-     │ ider │      │  ence-        |
|       sidebar">           │      │      │  editor-   │      │      │  editor-      |
|  ┌─────────────────────┐  │      │      │  col-list  │      │      │  col-editor   |
|  │ Sidebar Controls      │  │      │      │  id="can-  │      │      │  id="canvas-  |
|  │ & Record Selection  │  │      │      │  vas-col-  │      │      │  col-editor"> |
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

> **Immutable Shell Contract:** The two Providence column `<section>`s inside `<main id="admin-canvas">` (`#providence-col-sidebar` and `#providence-col-main`) are permanent structural elements. JavaScript modules must never call `innerHTML = ""` or `innerHTML = "..."` directly on these column elements. All content injection goes through `_setColumn()`. Intra-module re-renders must call `_clearColumns()` before `_setColumn(colName, html)`.
>
> **Note:** Child modules (`edit_picture.js`, `edit_links.js`) bypass the grid and inject directly into `edit_record.js` parent columns.
>
> **Dual-Pane Modules:** Several modules (Wikipedia, Challenge, Essay & Historiography, Challenge Response, News & Sources, Blog Posts) use a dual-pane layout (sidebar + main) that maps directly to the Providence 2-column grid. The sidebar column hosts controls and record selection; the main column hosts the editor form. Module-specific widths are set via `_setLayoutColumns()`.
>
> **Dashboard Landing Page:** The card-based landing page (accessed via the "Dashboard" header link) renders outside the Providence editor grid — it fills `#admin-canvas` with a 3×3+tenth card grid directly. See §7.1.
>
> **Draggable Sidebar Width:** An 8px-wide drag handle (`#providence-drag-handle.sidebar-resize-handle`) sits in the divider track (grid column 2) between the sidebar and main columns. Admin users can click and drag it to resize the sidebar width in real time. The width is clamped between 180px (minimum) and 40vw (maximum) to prevent the sidebar from being too narrow or covering the main content. The chosen width persists across page reloads via a cookie (`dashboard-sidebar-width`, 90-day expiry). When a module collapses the sidebar via `_setLayoutColumns(false)`, the handle is hidden (CSS: `#admin-canvas.no-sidebar #providence-drag-handle { display: none; }`).

---

## 0.2 Field Ownership Map

Quick-reference index showing which dashboard section owns each `records` column.
All fields live in the polymorphic `records` single-table (see `high_level_schema.md` §4-§5).

| Column | Type | Owned By |
|--------|------|----------|
| `id` | TEXT (ULID) | Auto-generated on create (§2.2 / §2.4) |
| `type` | TEXT (Enum) | Auto-set on create (record \| context_essay \| historiographical_essay \| theological_essay \| spiritual_article \| blog_post \| etc.) — not manually edited |
| `sub_type` | TEXT (Enum) | Auto-set by pipelines (§4.1–§4.2, §6.1, §7.1) — not manually edited |
| `title` | TEXT | §2.2 edit_record.js |
| `slug` | TEXT | §2.2 edit_record.js |
| `picture_name` | TEXT | §2.2 picture_handler.js (shared tool) |
| `picture_bytes` | BLOB | §2.2 picture_handler.js (shared tool) |
| `picture_thumbnail` | BLOB | §2.2 picture_handler.js (shared tool) |
| `description` | TEXT (JSON Array) | §2.2 description_editor.js (shared tool) |
| `snippet` | TEXT (JSON Array) | §2.2 snippet_generator.js (shared tool) |
| `bibliography` | TEXT (JSON Blob) | §2.2 mla_source_handler.js (shared tool) |
| `body` | TEXT (WYSIWYG Markdown) | §5.1, §5.2, §6.2 (markdown_editor.js) — NULL on record type |
| `historiography` | TEXT (JSON Blob) | §5.1 dashboard_historiography.js |
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
| `metadata_json` | TEXT (JSON Blob) | §2.2 metadata_widget.js (shared tool) |
| `iaa` | TEXT | §2.2 external_refs_handler.js |
| `pledius` | TEXT | §2.2 external_refs_handler.js |
| `manuscript` | TEXT | §2.2 external_refs_handler.js |
| `url` | TEXT (JSON Blob) | §2.2 url_array_editor.js |
| `wikipedia_link` | TEXT (JSON Blob) | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_rank` | TEXT (64-bit int) | §4.1 wikipedia_ranking_calculator.js |
| `wikipedia_title` | TEXT | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_weight` | TEXT (JSON Object) | §4.1 wikipedia_sidebar_handler.js |
| `wikipedia_search_term` | TEXT (JSON Array) | §4.1 wikipedia_sidebar_handler.js |
| `popular_challenge_link` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `popular_challenge_title` | TEXT | §4.2 challenge_weighting_handler.js |
| `popular_challenge_rank` | TEXT (64-bit int) | §4.2 challenge_ranking_calculator.js |
| `popular_challenge_weight` | TEXT (JSON Object) | §4.2 challenge_weighting_handler.js |
| `popular_challenge_search_term` | TEXT (JSON Array) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_link` | TEXT (JSON Blob) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_title` | TEXT | §4.2 challenge_weighting_handler.js |
| `academic_challenge_rank` | TEXT (64-bit int) | §4.2 challenge_ranking_calculator.js |
| `academic_challenge_weight` | TEXT (JSON Object) | §4.2 challenge_weighting_handler.js |
| `academic_challenge_search_term` | TEXT (JSON Array) | §4.2 challenge_weighting_handler.js |
| `responses` | TEXT (JSON Blob) | §4.3 insert_challenge_response.js + §5.2 dashboard_challenge_response.js |
| `challenge_id` | TEXT (FK → records.id) | §5.2 challenge_link_handler.js |
| `blogposts` | TEXT (JSON Blob) | §6.2 dashboard_blog_posts.js |
| `news_sources` | TEXT (JSON Blob) | §6.1 news_sources_handler.js |
| `source_url` | TEXT (Flat Indexable) | §6.1 news_sources_handler.js |
| `keywords` | TEXT (JSON Array) | §6.1 news_sources_handler.js |
| `news_item_title` | TEXT | §6.1 news_sources_handler.js (replaces deprecated `news_items`) |
| `news_item_link` | TEXT | §6.1 news_sources_handler.js (replaces deprecated `news_items`) |
| `news_search_term` | TEXT (JSON Array) | §6.1 search_keywords_handler.js |
| `last_crawled` | TEXT (ISO8601) | §6.1 launch_news_crawler.js |
| `value` | TEXT (JSON) | §7.1 — system_data config rows |
| `updated_by` | TEXT | §7.1 — admin who last modified system_data row |
| `trace_reasoning` | TEXT (64-bit int) | §7.1 — system_data trace_reasoning sub-type rows |
| `page_views` | INTEGER | System-managed (auto-incremented — not manually edited) |

> **Deprecated:** `news_items` (TEXT / JSON Blob) is superseded by `news_item_title` + `news_item_link`. Existing data preserved but new code should use the dedicated columns.

---


## Shared Tool Ownership Reference

> Per `vibe_coding_rules.md` §7, each shared JS tool is OWNED by exactly one plan and lives in ONE directory. Consumer plans MUST NOT create local copies — they include the owner's file via `<script>` tag and call `window.*` APIs.

| Shared Tool | Owner Plan | File Path |
|-------------|-----------|-----------|
| `picture_handler.js` | `plan_relocate_shared_widgets_to_cross_cutting` | `js/9.0_cross_cutting/dashboard/picture_handler.js` |
| `mla_source_handler.js` | `plan_relocate_shared_widgets_to_cross_cutting` | `js/9.0_cross_cutting/dashboard/mla_source_handler.js` |
| `context_link_handler.js` | `plan_relocate_shared_widgets_to_cross_cutting` | `js/9.0_cross_cutting/dashboard/context_link_handler.js` |
| `snippet_generator.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/snippet_generator.js` |
| `metadata_widget.js` | `plan_relocate_shared_widgets_to_cross_cutting` | `js/9.0_cross_cutting/dashboard/metadata_widget.js` |
| `metadata_widget.css` | `plan_relocate_shared_widgets_to_cross_cutting` | `css/9.0_cross_cutting/dashboard/metadata_widget.css` |
| `picture_widget.css` | `plan_relocate_shared_widgets_to_cross_cutting` | `css/9.0_cross_cutting/dashboard/picture_widget.css` |
| `mla_widget.css` | `plan_relocate_shared_widgets_to_cross_cutting` | `css/9.0_cross_cutting/dashboard/mla_widget.css` |
| `context_links_widget.css` | `plan_relocate_shared_widgets_to_cross_cutting` | `css/9.0_cross_cutting/dashboard/context_links_widget.css` |
| `external_refs_widget.css` | `plan_relocate_shared_widgets_to_cross_cutting` | `css/9.0_cross_cutting/dashboard/external_refs_widget.css` |
| `description_editor.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/description_editor.js` |
| `verse_builder.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/verse_builder.js` |
| `markdown_editor.js` | `plan_dashboard_essay_historiography` | `js/5.0_essays_responses/dashboard/markdown_editor.js` |
| `external_refs_handler.js` | `plan_relocate_shared_widgets_to_cross_cutting` | `js/9.0_cross_cutting/dashboard/external_refs_handler.js` |
| `url_array_editor.js` | `plan_dashboard_records_single` | `js/2.0_records/dashboard/url_array_editor.js` |
| `wysiwyg_editor.css` | `plan_standardize_dashboard_wysiwyg` | `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` |
| `wysiwyg_dashboard_layout.css` | `plan_standardize_dashboard_wysiwyg` | `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` |
| `dashboard_challenge_response.js` (and sub-modules) | `plan_standardize_dashboard_wysiwyg` | `js/5.0_essays_responses/dashboard/dashboard_challenge_response.js` |

| Consumer Plan | Shared Tools Consumed |
|---------------|----------------------|
| `plan_dashboard_blog_posts` | `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `metadata_widget.js`, `markdown_editor.js` |
| `plan_dashboard_essay_historiography` | `picture_handler.js`, `mla_source_handler.js`, `context_link_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `metadata_widget.js` |
| `plan_dashboard_challenge_response` | `picture_handler.js`, `mla_source_handler.js`, `snippet_generator.js`, `metadata_handler.js`, `metadata_widget.js`, `markdown_editor.js` |
| `plan_dashboard_challenge` | `metadata_handler.js`, `metadata_widget.js` |
| `plan_dashboard_wikipedia` | `snippet_generator.js`, `metadata_handler.js` |
| `plan_dashboard_news_sources` | `snippet_generator.js`, `metadata_handler.js`, `metadata_widget.js` |
| `plan_dashboard_records_single` | *(owner)* |

---


## Metadata Widget Placement Convention

The shared `metadata_widget.js` renders a unified slug/snippet/metadata editor
with AI-powered auto-generation buttons and a "Generate All" button. Its placement
differs by dashboard module:

### Split-Pane Dashboards (sidebar placement)
Used by: Blog Posts, Essay & Historiography, News Sources, Challenge

> **Source:** css/9.0_cross_cutting/dashboard/metadata_widget.css and js/9.0_cross_cutting/dashboard/metadata_widget.js

```text
+---------------------+---------------------------+
|     SIDEBAR         |       WORK AREA           |
|                     |                           |
| [Published list]    |                           |
| [Drafts list]       |                           |
|                     |                           |
| +-----------------+ |                           |
| | METADATA WIDGET | |                           |
| | [Slug........]  | |                           |
| | [Snippet......] | |                           |
| | [Meta JSON....] | |                           |
| | [created/upd..]  | |                           |
| | [Generate All]  | |                           |
| +-----------------+ |                           |
+---------------------+---------------------------+
```

### Records Single-Editor (work area placement)
Used by: Records (single record editor)

```text
+---------------------------------------------------+
|               WORK AREA (full width)               |
|                                                   |
|  Section 1: Core Identifiers                      |
|  Section 2: Images                                 |
|  Section 3: Description                            |
|  Section 4: Taxonomy                               |
|  Section 5: Verses                                 |
|  Section 6: External References                    |
|  Section 7: METADATA & STATUS                      |
|  +-----------------------------------------------+ |
|  | METADATA WIDGET                               | |
|  | [Slug........] [Auto-gen Slug]                | |
|  | [Snippet......] [Auto-gen Snippet]            | |
|  | [Meta JSON....] [Auto-gen Meta]               | |
|  | [Created At...] [Updated At...]               | |
|  | [Generate All]                                | |
|  +-----------------------------------------------+ |
|  [Status: (•) Draft  ( ) Published]               |
+---------------------------------------------------+
```

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
| `POST` | `/api/admin/bulk-upload` | CSV bulk record ingestion (Phase 1: parse & validate, auto-insert) |
| `POST` | `/api/admin/bulk-upload/commit` | Commit reviewed bulk records as draft (Phase 2: review-gated insert) |

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

> Tables managed by `plan_backend_infrastructure.md` and the database schema (`database.sql` v2.0.0).

### `records` table (polymorphic single-table)

All entities live in this single `type`-discriminated table. See `high_level_schema.md` §4-§5 for the full type-group breakdown and `data_schema.md` for the flat column inventory.

| Type Value | Description | Key Unique Fields |
|:---|:---|:---|
| `record` | Archival gospel entry | `era`, `timeline`, `gospel_category`, `primary_verse`, `map_label`, `geo_id` |
| `context_essay` | Thematic context essay | `body`, `bibliography` |
| `historiographical_essay` | Historiographical essay | `body`, `bibliography` |
| `theological_essay` | Theological deep-dive | `body`, `bibliography`, `ordo_salutis` |
| `spiritual_article` | Devotional/spiritual article | `body`, `bibliography` |
| `challenge_response` | Scholarly rebuttal | `body`, `bibliography`, `challenge_id` (FK) |
| `blog_post` | Blog post | `body`, `bibliography` |
| `wikipedia_entry` | External Wikipedia reference | `wikipedia_title`, `wikipedia_link`, `wikipedia_rank`, `wikipedia_weight`, `wikipedia_search_term` + `sub_type` variants |
| `challenge_academic` | External academic challenge | `academic_challenge_*` fields + `sub_type` variants |
| `challenge_popular` | External popular challenge | `popular_challenge_*` fields + `sub_type` variants |
| `news_article` | External news article | `news_item_title`, `news_item_link`, `news_sources`, `last_crawled` + `sub_type` variants |
| `system_data` | System configuration row | `value`, `updated_by`, `trace_reasoning` + `sub_type` variants |

**Core identity columns (every row):** `id` (ULID PK), `type` (discriminator), `status` (draft \| published)

**Content metadata columns (every row):** `title`, `slug`, `snippet`, `metadata_json`, `context_links`, `iaa`, `pledius`, `manuscript`, `url`, `page_views`, `created_at`, `updated_at`

### `system_config` table
| Column | Type | Purpose |
|--------|------|---------|
| `key` | TEXT PK | Configuration key |
| `value` | TEXT | Configuration value (JSON for complex) |
| `updated_at` | TEXT (ISO8601) | Last modification timestamp |
| `updated_by` | TEXT | Admin user who last modified |

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

---


## 9.0 Unified WYSIWYG Dashboard Layout

> **Plan:** `plan_standardize_dashboard_wysiwyg.md`
>
> The `standardize_dashboard_wysiwyg` plan unified the Essay, Historiography, Blog Post, and Challenge Response dashboards under a single split-pane WYSIWYG layout with a shared BEM namespace (`wysiwyg-*`). This replaced the legacy `essay-*` and `blog-*` namespaces.

### Standardized Split-Pane Structure

```text
┌─────────────────────────────────────────────────────────────┐
│  FUNCTION BAR (sticky)                                       │
│  [+ New]  |  [Save Draft] [Publish] [Delete]                │
└─────────────────────────────────────────────────────────────┘
┌──────────────────┬──┬───────────────────────────────────────┐
│  SIDEBAR         │  │  EDITOR AREA                          │
│  (260px)         │  │  (1fr)                                │
│                  │  │                                       │
│  ┌──────────────┐│  │  Title Input                          │
│  │ Search Bar   ││  │  ┌──────────────────────────────────┐ │
│  └──────────────┘│  │  │ Markdown Toolbar                 │ │
│                  │  │  └──────────────────────────────────┘ │
│  Published       │  │  ┌─────────────┐ ┌─────────────────┐  │
│  ┌──────────────┐│  │  │ Markdown    │ │ Live Preview    │  │
│  │ Item 1       ││  │  │ Input       │ │                 │  │
│  │ Item 2       ││  │  │             │ │                 │  │
│  └──────────────┘│  │  └─────────────┘ └─────────────────┘  │
│                  │  │                                       │
│  Drafts          │  │  MLA Bibliography (9.0)               │
│  ┌──────────────┐│  │  Context Links (9.0)                  │
│  │ Item 1       ││  │  External References (9.0)            │
│  └──────────────┘│  │  URL Array Editor                     │
│                  │  │  Picture Upload (9.0)                 │
│  Metadata Widget (9.0) │  │                                       │
└──────────────────┴──┴───────────────────────────────────────┘
```

### Module Variants

| Module | Sidebar | Slug | Picture Upload | Auto-Load |
|--------|---------|------|----------------|-----------|
| Essays | Published/Drafts list, search | Editable | Yes | No |
| Blog Posts | Published/Drafts list, search | Editable | Yes | No |
| Challenge Response | Academic/Popular grouped list, search | Editable | **No** (schema) | No |
| Historiography | **None** (singleton) | Locked to `"historiography"` | Yes | Yes (on mount) |

> **Challenge Response — Picture Upload Omitted:** The `challenge_response` record type has no picture fields in the polymorphic `records` table, so the Picture Upload section is not rendered in the Challenge Response dashboard.

> **Historiography — Singleton Variant:** The Historiography module has no sidebar document list, locks the slug to `"historiography"` (non-editable), and auto-loads the singleton record on mount via `GET /api/admin/records/historiography`.

### CSS Namespace

All unified dashboards use the `wysiwyg-*` BEM namespace defined in `wysiwyg_dashboard_layout.css` and `wysiwyg_editor.css`. See `guide_style.md` for the full BEM class reference.
