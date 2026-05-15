---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 5.0 Essays & Responses Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, high_level_schema.md]
---

## 5.0 Essays & Responses Module
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1a Backend for Essay Layouts (`dashboard_essay.js`)
**Corresponds to Public Sections:** 5.1 (Context Essay & Historiography Layouts)
**Purpose:** Split-pane markdown editor for authoring context essays, theological essays, and spiritual articles. Features a sidebar with search-filterable document list grouped by Published/Drafts, and a WYSIWYG editor with live preview. Loads the `dashboard_essay.html` template (no toggle — fixed to essay mode).

**Plan:** `plan_dashboard_essay_historiography.md`

**DB Fields:**
```
── Written by dashboard_essay_historiography.js ─────────────────────────
body                TEXT (WYSIWYG Markdown) — full essay content
context_essays      TEXT (JSON Array)  — slugs of context essays linked
                                         to this record
theological_essays  TEXT (JSON Array)  — slugs of theological essays linked
spiritual_articles  TEXT (JSON Array)  — slugs of spiritual articles linked
historiography      TEXT (JSON Blob)   — historiographical content
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
| Function Bar:        [ Save Draft | Publish | Delete ]                       |
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]        |
| *Published*               |                                                     |
| - Context Essay 1         | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Essay A           | |  Markdown essay content goes here...           |   |
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
| `admin/frontend/dashboard_essay.html` | Essay editor container (no toggle) |
| `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css` | Dual-state layout & toolbar (shared) |
| `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css` | Markdown input & live preview (shared) |
| `js/5.0_essays_responses/dashboard/dashboard_essay.js` | Essay orchestrator (fixed mode) |
| `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` | Content fetching & population (shared) |
| `js/5.0_essays_responses/dashboard/search_essays.js` | Sidebar search & filtering (shared) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | 🔑 Shared tool: WYSIWYG & live preview |
| `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete logic (shared) |

**Shared tools consumed via `<script>` tag:**
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/context_link_handler.js` — Context links
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

---

### 5.1b Backend for Historiography Layout (`dashboard_historiography.js`)
**Corresponds to Public Sections:** 5.1 (Historiography)
**Purpose:** Split-pane markdown editor for authoring the central historiography essay. Features a sidebar with search-filterable document list grouped by Published/Drafts, and a WYSIWYG editor with live preview. Loads the `dashboard_historiography.html` template (no toggle — fixed to historiography mode). Functionally identical to the Essay editor but uses `type = 'historiographical_essay'` and fetches from `GET /api/admin/historiography`.

**Plan:** `plan_dashboard_essay_historiography.md`

**DB Fields:**
```
── Written by dashboard_historiography.js ──────────────────────────────
body                TEXT (WYSIWYG Markdown) — full essay content
historiography      TEXT (JSON Blob)   — historiographical content
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:        [ Save Draft | Publish | Delete ]                       |
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]        |
| *Published*               |                                                     |
| - Historiography Essay    | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | |                                               |   |
| - Draft Essay             | |  Markdown historiography content goes here...  |   |
|                           | |                                               |   |
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
| `admin/frontend/dashboard_historiography.html` | Historiography editor container (no toggle) |
| `css/5.0_essays_responses/dashboard/dashboard_essay_historiography.css` | Dual-state layout & toolbar (shared) |
| `css/5.0_essays_responses/dashboard/essay_WYSIWYG_editor.css` | Markdown input & live preview (shared) |
| `js/5.0_essays_responses/dashboard/dashboard_historiography.js` | Historiography orchestrator (fixed mode) |
| `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js` | Content fetching & population (shared) |
| `js/5.0_essays_responses/dashboard/search_essays.js` | Sidebar search & filtering (shared) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | 🔑 Shared tool: WYSIWYG & live preview |
| `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete logic (shared) |

**Shared tools consumed via `<script>` tag:**
- `js/2.0_records/dashboard/picture_handler.js` — Image upload
- `js/2.0_records/dashboard/mla_source_handler.js` — MLA citations
- `js/2.0_records/dashboard/context_link_handler.js` — Context links
- `js/2.0_records/dashboard/snippet_generator.js` — Snippet generation
- `js/2.0_records/dashboard/metadata_handler.js` — Metadata footer

> **Singleton Variant Note:** The Historiography module follows the unified WYSIWYG split-pane layout (§9.0) but operates as a singleton: there is no sidebar document list, the slug is locked to `"historiography"` and is not user-editable, and the record auto-loads on module mount via `GET /api/admin/records/historiography`.

---

### 5.2 Backend for Challenge Response Layout (`dashboard_challenge_response.js`)
**Corresponds to Public Sections:** 5.2 (Challenge Response Layouts)
**Purpose:** Split-pane markdown editor for authoring challenge responses. Features a sidebar with search-filterable response list grouped by Academic/Popular, and a WYSIWYG editor with live preview. Response records can be linked to parent challenges via the Challenge Link Handler.

**Plan:** `plan_dashboard_challenge_response.md`

**DB Fields:**
```
── Written by dashboard_challenge_response.js ────────────────────────────
body                TEXT (WYSIWYG Markdown) — full response content
responses           TEXT (JSON Blob)   — full response content + metadata
                                         (also linked from §4.3)

── challenge_link_handler.js ────────────────────────────────────────────
challenge_id        TEXT (FK → records.id) — parent challenge association
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Draft ]   [ Publish ]   [ Delete ]             |
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

> **Picture Upload Omitted:** Per the `challenge_response` record type schema, the Challenge Response dashboard does not include the Picture Upload section. The `challenge_response` type has no picture fields in the polymorphic `records` table.

---

