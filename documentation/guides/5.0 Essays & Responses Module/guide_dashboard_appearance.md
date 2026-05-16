---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 5.0 Essays & Responses Module
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, high_level_schema.md, essays_responses_nomenclature.md, guide_frontend_appearance.md, guide_function.md]
---

## 5.0 Essays & Responses Module
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1a Backend for Essay Layout (dashboard_essay.js)
**Corresponds to Public Sections:** 5.1 (Context Essay & Historiography Layouts)
**Plan:** `plan_dashboard_essay_historiography.md`

```text
+---------------------------------------------------------------------------------+
| [Jesus Website Dashboard] | < Return to Frontpage | Dashboard | Logout >        |
+---------------------------------------------------------------------------------+
| Function Bar: [+ New Context Essay] | [ Save Draft ] [ Publish ] [ Delete ]     |
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                     |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]       |
| *Published*               |                                                     |
| - Context Essay 1         | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Drafts*                  | | Markdown    | Preview                         |   |
| - Draft Essay A           | | textarea... | (live HTML preview)             |   |
|                           | +-----------------------------------------------+   |
| (scrollable list)         |                                                     |
|                           | MLA Sources: [_________]                             |
| ─ Metadata Widget ──────  | Context Links: [_____]                               |
| [slug] [snippet]          |                                                     |
| [keywords] [timestamps]   | Picture: [Full Preview 800px] [Thumb 200px]          |
| [Generate All]            |          [Upload PNG ▼]                              |
|                           |                                                     |
|                           | External References:                                 |
|                           | IAA: [___] Pledius: [___] Manuscript: [___]          |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_essay.html` | Essay editor container (unified wysiwyg-* BEM) |
| `js/5.0_essays_responses/dashboard/dashboard_essay.js` | Essay orchestrator (fixed mode) |
| `js/5.0_essays_responses/dashboard/essay_historiography_list_display.js` | Sidebar Published/Drafts population (shared) |
| `js/5.0_essays_responses/dashboard/essay_historiography_load_content.js` | Editor content loading (shared) |
| `js/5.0_essays_responses/dashboard/search_essays.js` | Sidebar search & filtering (shared) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | Shared tool: WYSIWYG & live preview |
| `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete logic (shared) |

**Shared tools consumed via `<script>` tag:**
- `js/9.0_cross_cutting/dashboard/picture_handler.js` — Image upload
- `js/9.0_cross_cutting/dashboard/mla_source_handler.js` — MLA citations
- `js/9.0_cross_cutting/dashboard/context_link_handler.js` — Context links
- `js/9.0_cross_cutting/dashboard/external_refs_handler.js` — External references
- `js/9.0_cross_cutting/dashboard/metadata_widget.js` — Metadata widget

**Shared CSS consumed via `<link>` tag:**
- `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` — Split-pane layout
- `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` — Editor & toolbar styling
- `css/9.0_cross_cutting/dashboard/picture_widget.css` — Picture upload styling
- `css/9.0_cross_cutting/dashboard/mla_widget.css` — MLA sources styling
- `css/9.0_cross_cutting/dashboard/context_links_widget.css` — Context links styling
- `css/9.0_cross_cutting/dashboard/external_refs_widget.css` — External references styling
- `css/9.0_cross_cutting/dashboard/metadata_widget.css` — Metadata widget styling

---

### 5.1b Backend for Historiography Layout (dashboard_historiography.js)
**Corresponds to Public Sections:** 5.1 (Historiography)
**Plan:** `plan_dashboard_essay_historiography.md`
**Singleton:** No sidebar document list, no "+ New" button, slug locked to "historiography", auto-loads on mount.

```text
+---------------------------------------------------------------------------------+
| [Jesus Website Dashboard] | < Return to Frontpage | Dashboard | Logout >        |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Draft ]   [ Publish ]   [ Delete ]                |
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                     |
| (metadata only)           |                                                     |
|---------------------------+-----------------------------------------------------|
|                           | Title: [___________________________________]       |
| ─ Metadata Widget ──────  |                                                     |
| [slug: "historiography"]  | [B] [I] [U] [Link] [Image] [Code]                   |
| [snippet] [keywords]      | +-----------------------------------------------+   |
| [timestamps]              | | Markdown    | Preview                         |   |
| [Generate All]            | | textarea... | (live HTML preview)             |   |
|                           | +-----------------------------------------------+   |
|                           |                                                     |
|                           | MLA Sources: [_________]                             |
|                           | Context Links: [_____]                               |
|                           |                                                     |
|                           | Picture: [Full Preview 800px] [Thumb 200px]          |
|                           |          [Upload PNG ▼]                              |
|                           |                                                     |
|                           | External References:                                 |
|                           | IAA: [___] Pledius: [___] Manuscript: [___]          |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_historiography.html` | Historiography editor container (no toggle) |
| `js/5.0_essays_responses/dashboard/dashboard_historiography.js` | Historiography orchestrator (fixed mode) |
| `js/5.0_essays_responses/dashboard/essay_historiography_list_display.js` | (not used — singleton) |
| `js/5.0_essays_responses/dashboard/essay_historiography_load_content.js` | Content loading (shared) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | Shared tool: WYSIWYG & live preview |
| `js/5.0_essays_responses/dashboard/document_status_handler.js` | Save/Publish/Delete logic (shared) |

**Shared tools consumed via `<script>` tag:**
- `js/9.0_cross_cutting/dashboard/picture_handler.js` — Image upload
- `js/9.0_cross_cutting/dashboard/mla_source_handler.js` — MLA citations
- `js/9.0_cross_cutting/dashboard/context_link_handler.js` — Context links
- `js/9.0_cross_cutting/dashboard/external_refs_handler.js` — External references
- `js/9.0_cross_cutting/dashboard/metadata_widget.js` — Metadata widget

**Shared CSS consumed via `<link>` tag:**
- `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` — Split-pane layout
- `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` — Editor & toolbar styling
- `css/9.0_cross_cutting/dashboard/picture_widget.css` — Picture upload styling
- `css/9.0_cross_cutting/dashboard/mla_widget.css` — MLA sources styling
- `css/9.0_cross_cutting/dashboard/context_links_widget.css` — Context links styling
- `css/9.0_cross_cutting/dashboard/external_refs_widget.css` — External references styling
- `css/9.0_cross_cutting/dashboard/metadata_widget.css` — Metadata widget styling

---

### 5.2 Backend for Challenge Response Layout (dashboard_challenge_response.js)
**Corresponds to Public Sections:** 5.2 (Challenge Response Layouts)
**Plan:** `plan_dashboard_challenge_response.md`
**Note:** JS files live in `js/4.0_ranked_lists/dashboard/`, not `js/5.0_essays_responses/dashboard/`. No picture upload (schema has no picture fields). No "+ New" button (responses created from challenge list insert dialog).

```text
+---------------------------------------------------------------------------------+
| [Jesus Website Dashboard] | < Return to Frontpage | Dashboard | Logout >        |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Draft ]   [ Publish ]   [ Delete ]                |
+---------------------------------------------------------------------------------+
| Response Sidebar          | Response WYSIWYG Editor                             |
|---------------------------+-----------------------------------------------------|
| Search: [_______________] | Title: [___________________________________]       |
| *Published*               |                                                     |
| - Response 1              | [B] [I] [U] [Link] [Image] [Code]                   |
| - Response 2              | +-----------------------------------------------+   |
|                           | | Markdown    | Preview                         |   |
| *Drafts*                  | | textarea... | (live HTML preview)             |   |
| - Draft Response A        | +-----------------------------------------------+   |
|                           |                                                     |
| (scrollable list)         | MLA Sources: [_________]                             |
|                           | Context Links: [_____]                               |
| ─ Metadata Widget ──────  |                                                     |
| [slug] [snippet]          | External References:                                 |
| [keywords] [timestamps]   | IAA: [___] Pledius: [___] Manuscript: [___]          |
| [Generate All]            |                                                     |
|                           | (No Picture Upload — schema has no picture fields)   |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_challenge_response.html` | Split-pane response editor container |
| `js/4.0_ranked_lists/dashboard/dashboard_challenge_response.js` | Module orchestration |
| `js/4.0_ranked_lists/dashboard/challenge_response_list_display.js` | Sidebar Published/Drafts population |
| `js/4.0_ranked_lists/dashboard/challenge_response_load_content.js` | Editor content loading |
| `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js` | Save/Publish/Delete logic |
| `js/4.0_ranked_lists/dashboard/insert_challenge_response.js` | Create response from challenge list |

**Shared tools consumed via `<script>` tag:**
- `js/5.0_essays_responses/dashboard/markdown_editor.js` — WYSIWYG editor (owned by 5.0)
- `js/9.0_cross_cutting/dashboard/mla_source_handler.js` — MLA citations
- `js/9.0_cross_cutting/dashboard/context_link_handler.js` — Context links
- `js/9.0_cross_cutting/dashboard/external_refs_handler.js` — External references
- `js/9.0_cross_cutting/dashboard/metadata_widget.js` — Metadata widget

**Shared CSS consumed via `<link>` tag:**
- `css/9.0_cross_cutting/dashboard/wysiwyg_dashboard_layout.css` — Split-pane layout
- `css/9.0_cross_cutting/dashboard/wysiwyg_editor.css` — Editor & toolbar styling
- `css/9.0_cross_cutting/dashboard/mla_widget.css` — MLA sources styling
- `css/9.0_cross_cutting/dashboard/context_links_widget.css` — Context links styling
- `css/9.0_cross_cutting/dashboard/external_refs_widget.css` — External references styling
- `css/9.0_cross_cutting/dashboard/metadata_widget.css` — Metadata widget styling

---
