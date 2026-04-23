---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens, mapped to front-end components (source of truth)
version: 1.0.1
dependencies: [guide_appearance.md, detailed_module_sitemap.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Portal (`admin.html`). Unlike the public pages, the portal operates primarily as a Single Page Application (SPA) driven by `dashboard_app.js`.

The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.

### 2.1 Backend for Master Data Index (`list_all_records.js`)
**Corresponds to Public Section:** Non-specific (Global Data Access / Backend Index)
**Purpose:** A high-level, infinitely scrolling feed or paginated list displaying all entries currently stored in the central `records` table. Built to allow admins to quickly scan, filter, and access records for editing, displaying only the Title and the Primary Verse.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  ALL DATABASE RECORDS                           |
|                       |  [ Search by Title or Verse... ]    [+ Add New] |
|-----------------------|-------------------------------------------------|
|  > Records [Active]   |                                                 |
|  - View All           |  [ Title ]                  [ Primary Verse ]   |
|-----------------------|-------------------------------------------------|
|  Jesus is Baptized          Mark 1:9-11         |
|-----------------------|-------------------------------------------------|
|  Crucifixion of Jesus       Matthew 27:32-56    |
|-----------------------|-------------------------------------------------|
|  Sermon on the Mount        Matthew 5:1-7:29    |
|-----------------------|-------------------------------------------------|
|  Destruction of the Temple  Mark 13:1-2         |
|-----------------------|-------------------------------------------------|
|  [ Pagination / Infinite Scroll Loader ]        |
+-------------------------------------------------------------------------+
```

### 2.2 Backend for Single Record Layout (`edit_record.js`, `edit_links.js`)
**Corresponds to Public Section:** 2.2 Single Record Deep-Dive  
**Purpose:** An incredibly dense, data-focused form layout for editing a single row in the main `records` table. This editor populates the text, bibliography, and categorical metadata that powers Maps and Timelines.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] | < Back to Records Search                        |
|-----------------------|                                                 |
|  > Records            |  EDIT RECORD: [ Record Slug / ID ]              |
|  - Create New         |  [ Save Changes ]  [ Discard ]  [ View Live ]   |
|  - Edit [Active]      |-------------------------------------------------|
|                       |  Title: [__________________________________]    |
|  ...                  |  Slug:  [__________________________________]    |
|                       |                                                 |
|                       |  Picture:                                       |
|                       |  [ Current: baptism-of-jesus.png          ]     |
|                       |  [ Choose PNG File... ]  [ Upload Picture ]     |
|                       |  [ Status: Ready / Uploading... / Saved ✓ ]    |
|                       |                                                 |
|                       |  Taxonomy & Diagrams (Maps/Timeline data):      |
|                       |  Era: [Dropdown]       Timeline: [Dropdown]     |
|                       |  Map Label: [Dropdown] Gospel Category: [DD]    |
|                       |                                                 |
|                       |  Text Content:                                  |
|                       |  [ WYSIWYG Editor Block                       ] |
|                       |  [ Abstract / Description                     ] |
|                       |                                                 |
|                       |  Relations & Links (`edit_links.js`):           |
|                       |  [ Context_Essay_1 (x) ] [+ Add Link]           |
|                       |                                                 |
|                       |  Sources (`edit_mla_sources.js`):               |
|                       |  [ Assigned Source_1 (x) ] [+ Assign Source]    |
+-------------------------------------------------------------------------+
```

### 2.3 & 2.4 Backend for Ordinary Lists (`edit_lists.js`)
**Corresponds to Public Sections:** 2.3, 2.4 (Resource Lists, Verses)  
**Purpose:** A streamlined interface for curating manually ordered resource lists and groupings. Supports **bulk adding** of items via a slug list (CSV or New Line) and allows simple removing and reordering of records.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT ORDINARY LIST: [ Old Testament Verses ]   |
|                       |  [ Save List ]                                  |
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |                                                 |
|  - Edit Lists         |   List Item / Record                            |
|                       |-------------------------------------------------|
|  ...                  |   [ search records to add... ]                  |
|                       |                                                 |
|                       |   Bulk Add by Slugs (CSV/Line):                 |
|                       |   [ slug-1, slug-2, slug-3...             ] [Add] |
|                       |-------------------------------------------------|
|                       | = [Isaiah 53]                       [ Remove ]  |
|                       | = [Psalm 22]                        [ Remove ]  |
|                       | = [Zechariah 12]                    [ Remove ]  |
|                       |                                                 |
|                       |  (Drag '=' handle to reorder items)             |
|                       |                                                 |
+-------------------------------------------------------------------------+
```

### 2.5 Backend for Bulk Upload CSV (`edit_bulk_upload.js`)
**Corresponds to Public Section:** Non-specific (Global Data Ingestion)  
**Purpose:** An interface for administrators to drag and drop CSV files to bulk create multiple records simultaneously. Features local client-side validation and direct API ingestion feedback.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDITING MODULE: Bulk Upload CSV                |
|                       |  Technical Ledger Interface — Data Ingestion    |
|-----------------------|-------------------------------------------------|
|  > Records            |                                                 |
|  - Create New         |  Upload Database Records                        |
|  - Edit Existing      |  Select or drag and drop a valid CSV...         |
|  - Bulk Upload [Act]  |                                                 |
|                       |  +-------------------------------------------+  |
|  > Lists & Ranks      |  |                                           |  |
|  ...                  |  |         DRAG & DROP CSV FILE HERE         |  |
|                       |  |            OR CLICK TO BROWSE             |  |
|                       |  |                                           |  |
|                       |  +-------------------------------------------+  |
|                       |                                                 |
|                       |  [ Upload Results Area / Status Feedback ]      |
|                       |                                                 |
|                       |                                 [Start Upload]  |
+-------------------------------------------------------------------------+
```

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Backend for Visual Interactive Displays (`edit_diagram.js`)
**Corresponds to Public Section:** 3.1 (Evidence Graph / Ardor Diagrams)  
*(Note: Maps (3.3) and Timelines (3.2) are generated programmatically via the Era, Timeline, and Map Label taxonomy fields set inside the Core Record Editor).*  
**Purpose:** A specialized visual UI diagram tool specifically designed for linking recursive parent-child nodes (`parent_id`) to build the tree-like 'Ardor' evidence graph structure.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT DIAGRAM HIERARCHY                         |
|                       |  [ Save Graph ]                                 |
|-----------------------|-------------------------------------------------|
|  > Configuration      |                                                 |
|  - Edit Diagrams      |   [ Search Node to Add ]                        |
|                       |                                                 |
|  ...                  |     [ ROOT NODE: Jesus of Nazareth ]            |
|                       |         |                |                      |
|                       |  [ Node: Ministry ]  [ Node: Crucifixion ]      |
|                       |         |                |                      |
|                       |  [ +Child Node ]    [ Select Parent ]           |
|                       |                                                 |
|                       |      (Drag and drop nodes to change             |
|                       |       parent_id relationships)                  |
+-------------------------------------------------------------------------+
```

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists, Ranked historical challenges.

### 4.1 Backend for Ranked Lists Weights (`edit_wiki_weights.js`, `edit_academic_weights.js`, `edit_popular_weights.js`)
**Corresponds to Public Sections:** 4.1 (Ranked Views)  
**Purpose:** A tabular interface designed for adjusting numerical ranking multipliers (like Wikipedia importance) for public ranked lists.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT RANKED LISTS: [ Wikipedia Weights ]       |
|                       |  [ Save All Changes ]                           |
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |                                                 |
|  - Edit Weights       |   Item Slug          | Base Rank | Multiplier   |
|  - Insert Resp.       |-------------------------------------------------|
|                       |   [ search bar ]     |           |              |
|  ...                  |-------------------------------------------------|
|                       | 1. tacitus-annals    |    98     | [ 1.2  ]     |
|                       | 2. josephus-antiq    |    95     | [ 1.15 ]     |
|                       |                                                 |
|                       |   [ + Add Custom Override ]                     |
+-------------------------------------------------------------------------+
```

### 4.2 Backend for Inserting Responses (`edit_insert_response_*.js`)
**Corresponds to Public Sections:** 4.2 (Standard Lists with Response Inserted)  
**Purpose:** An interface for browsing popular and academic challenge lists to select a specific challenge. Creating or appending a response here directs the user to the full Challenge Response Editor (Section 5.1 & 5.2).

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  INSERT RESPONSES                               |
|                       |  [ Academic Challenges ] | [ Popular Challenges]|
|-----------------------|-------------------------------------------------|
|  > Lists & Ranks      |                                                 |
|  - Edit Weights       |  Select Challenge to Append a Response to:      |
|  - Insert Resp.       |-------------------------------------------------|
|                       |   [ Search challenge list... ]                  |
|  ...                  |-------------------------------------------------|
|                       | 1. historicity-of-miracles   [+ Add Response]   |
|                       | 2. council-of-nicaea-claims  [+ Add Response]   |
|                       | 3. jesus-myth-theory         (Already Assigned) |
|                       |                                                 |
|                       |   (Clicking '+ Add Response' opens the          |
|                       |    Full Response Editor in Section 6)           |
+-------------------------------------------------------------------------+
```

---

## 5.0 Essays Module
**Scope:** Context-Essay (Thematic context), Historiography, Blog/News, Responses.

### 5.1 & 5.2 Backend for Response & Essay Layouts (`edit_response.js`, `edit_essay.js`, `edit_historiography.js`)
**Corresponds to Public Sections:** 5.1 & 5.2 (Long-form Essays, Responses), 5.0 (Context Essays, Historiography)  
**Purpose:** Specifically tailored for writing debate responses, historiographical arguments, or contextual essays. Includes a split-screen markdown editor emphasizing live previews and specialized tools for citations and cross-references.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT RESPONSE/ESSAY: [ Title ]                 |
|                       |  [ Save Changes ]                               |
|-----------------------|-------------------------------------------------|
|  > Text Content       |   Metadata:              |  Live Preview        |
|  - Responses [Active] |   Author: [________]     |  (Auto-updates as    |
|  - Essays             |   Date:   [________]     |   you type)          |
|                       |                          |                      |
|  ...                  |   Addressing Challenge?  |  [Title]             |
|                       |   [ Dropdown / None ]    |  By [Author]         |
|                       |--------------------------|                      |
|                       |   Markdown (Edit)        |                      |
|                       |   ## Introduction        |  Introduction        |
|                       |   The historical context |  The historical      |
|                       |   of **Judea**...        |  context of Judea... |
|                       |                          |                      |
|                       |  [ + Insert Citation ]   |                      |
+-------------------------------------------------------------------------+
```

### 5.3 Backend for News Snippets & Blog Posts (`edit_news_snippet.js`, `edit_blogpost.js`)
**Corresponds to Public Sections:** 1.3, 5.3 (News Feed Snippets, News Feed/Blog)  
**Purpose:** A short-form data entry layout for rapidly creating news alerts, external updates, or blog snippets. Focuses on brief text, external links, and published dates.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT NEWS/BLOG POST: [ Headline ]              |
|                       |  [ Save Item ]                                  |
|-----------------------|-------------------------------------------------|
|  > Text Content       |                                                 |
|  - Essays             |  Publish Date: [________]                       |
|  - News [Active]      |                                                 |
|  - Blog               |  Headline:     [______________________________] |
|                       |                                                 |
|  ...                  |  Snippet / Summary (Markdown):                  |
|                       |  [ WYSIWYG Editor Block                       ] |
|                       |  [                                            ] |
|                       |                                                 |
|                       |  External Link (Optional URL):                  |
|                       |  [____________________________________________] |
+-------------------------------------------------------------------------+
```

---

## 6.0 System Module
**Scope:** Intial setup, Agent instructions, backend API management, and VPS deployment.

### 6.1 Global: Secure Login & Main Interface
**Purpose:** The entry point to the dashboard, providing the secure login screen and the persistent structural shell (Sidebar + Dynamic Canvas).

```text
+-------------------------------------------------------------------------+
| [ Dashboard App: Authenticated as Admin ]                 [ Logout ]    |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [ Admin Modules ]  |   [ DASHBOARD HOME / STATUS ]                     |
|                     |                                                   |
|  > Records          |   +-------------------------------------------+   |
|  - Create New       |   | System Status: Online (WASM SQLite Sync)  |   |
|  - Edit Existing    |   +-------------------------------------------+   |
|                     |                                                   |
|  > Lists & Ranks    |   +-------------------------------------------+   |
|  - Edit Weights     |   | Recent Edits / Activity Log               |   |
|  - Edit Resources   |   | - Updated Record: "Crucifixion"           |   |
|  - Insert Responses |   | - Modified Wiki Weight: +0.5              |   |
|                     |   | - Added Essay: "Historiography Overview"  |   |
|  > Text Content     |   +-------------------------------------------+   |
|  - Essays           |                                                   |
|  - Responses        |   [ Quick Actions ]                               |
|  - Blog Posts       |   [ Add New Record ]  [ Run Sync Pipeline ]       |
|                     |                                                   |
|  > Configuration    |                                                   |
|  - Edit Diagrams    |                                                   |
|  - News Sources     |                                                   |
+-------------------------------------------------------------------------+
```
