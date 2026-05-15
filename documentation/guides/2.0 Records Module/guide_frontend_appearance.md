---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Records Module pages (search index, single record deep-dive, resource lists)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, guide_style.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.

### 2.1 Search Pipeline & Master Data Index
**Purpose:** The primary entry point for browsing and searching all records. Displays a dynamically populated row-based list filtered by a search query or showing all records as a master index. The page reads the `search` URL parameter on load and queries the WASM SQLite engine for matching results.

**Relevant Files:**
- **HTML:** `frontend/pages/records.html`
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`, `js/2.0_records/frontend/setup_db.js`, `js/2.0_records/frontend/sanitize_query.js`, `js/1.0_foundation/frontend/search_header.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   MASTER DATA INDEX / SEARCH RESULTS              |
|                     |                                                   |
|                     |   Query: "peter" — 47 results                     |
|                     |                                                   |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |                                                   |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 2.2 Single Record Deep-Dive Layout 
**Purpose:** The detailed presentation for individual items from the database. Prioritizes dense data presentation including pictures, bibliography, and context links.

**Relevant Files:**
- **HTML:** `frontend/pages/record.html`
- **CSS:** `css/2.0_records/frontend/detail_view.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/pictures.css`
- **JS:** `js/2.0_records/frontend/single_view.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`, `js/2.0_records/frontend/pictures_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: specific canonical/meta tags for this record]        |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW ]                              |
|-------------------------------------------------------------------------|
|< Back to Landingpage|   [RECORD TITLE]                                  |
|                     |   [PRIMARY VERSE]                                 |
|                     |                                                   | 
|  [Sidebar]          |   [PICTURE]                                       |
|                     |   [PICTURE LABEL]                                 |
|                     |                                                   |
|                     |   [DESCRIPTION]                                   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY — combined MLA list]              |
|                     |   [CONTEXT LINKS — linked list]                   |
|                     |   [UNIQUE IDENTIFIERS — label:value list]         |
|                     |                                                   |
|                     |   [OTHER DATA eg ERA, MAP AND CATEGORY etc]       |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 2.3 Resource List (Verses) View
**Purpose:** High-density row-based layout for resource lists involving specific biblical references.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/OT Verses.html`, `frontend/pages/resources/People.html`, `frontend/pages/resources/Miracles.html`, `frontend/pages/resources/Events.html`, `frontend/pages/resources/Sermons and Sayings.html`, `frontend/pages/resources/objects.html`
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   LIST TITLE: [Category or Ranked List Name]      |
|                     |                                                   |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 2.4 Resource List (Non-Verses) View
**Purpose:** High-density row-based layout for resource lists with unique IDs like manuscripts or archeological sites.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/Manuscripts.html`, `frontend/pages/resources/Sites.html`, `frontend/pages/resources/Internal witnesses.html`, `frontend/pages/resources/External witnesses.html`, `frontend/pages/resources/Objects.html`, `frontend/pages/resources/Places.html`, `frontend/pages/resources/Sources.html`, `frontend/pages/resources/World Events.html`
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   LIST TITLE: [Category or Ranked List Name]      |
|                     |                                                   |
|                     |[Title]  | [Unique ID eg IAA-001] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-002] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-003] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-004] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-005] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-006] [Snippet] [Link] |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

