---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Dashboard and editing screens, mapped to front-end components (source of truth)
version: 1.0.1
dependencies: [guide_appearance.md, module_sitemap.md]
---

# Guide to Dashboard Appearance & Editor Layouts

This document maintains visual ASCII blueprints for the secure Admin Dashboard (`admin.html`). Unlike the public pages, the dashboard operates primarily as a Single Page Application (SPA) driven by `dashboard_app.js`.

The tools below represent the **backend editing interfaces** for the front-end layouts defined in `guide_appearance.md`.

---

## 6.1 Global: Secure Login & Main Interface (System Module)
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

---

## 2.2 Backend for Single Record Layout (`edit_record.js`, `edit_links.js`)
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

---

## 4.1 Backend for Ranked Lists (`edit_wiki_weights.js`, `edit_academic_weights.js`, `edit_popular_weights.js`)
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

---

## 4.2 Backend for Inserting Responses (`edit_insert_response_*.js`)
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

## 2.0 Backend for Ordinary Lists (`edit_lists.js`)
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

---

## 5.0 Backend for Context Essays & Blog Posts (`edit_essay.js`, `edit_blogpost.js`, `edit_historiography.js`)
**Corresponds to Public Sections:** 5.3 (Blog/News), 5.1 & 5.2 (Context Essays, Historiography)  
**Purpose:** A focused text editor layout geared towards creating standard articles and essays. Provides fields for metadata (author, date) and an abstract, followed by a split-screen markdown editing and preview pane.
    
```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT ARTICLE/ESSAY: [ Title ]                  |
|                       |  [ Save Changes ]                               |
|-----------------------|-------------------------------------------------|
|  > Text Content       |   Metadata:              |  Live Preview        |
|  - Essays [Active]    |   Author: [________]     |  (Auto-updates as    |
|  - Blog Posts         |   Date:   [________]     |   you type)          |
|                       |                          |                      |
|  ...                  |   Abstract: [________]   |  [Title]             |
|                       |--------------------------|  By [Author]         |
|                       |   Markdown (Edit)        |                      |
|                       |   ## Introduction        |  Introduction        |
|                       |   The historical context |  The historical      |
|                       |   of **Judea**...        |  context of Judea... |
+-------------------------------------------------------------------------+
```

---

## 5.3 Backend for News Snippets (`edit_news_snippet.js`)
**Corresponds to Public Sections:** 1.3, 5.3 (News Feed Snippets, News Feed)  
**Purpose:** A short-form data entry layout for rapidly creating news alerts or external updates. Focuses on brief text, an external link or internal reference, and published dates.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT NEWS SNIPPET: [ Headline ]                |
|                       |  [ Save Snippet ]                               |
|-----------------------|-------------------------------------------------|
|  > Text Content       |                                                 |
|  - Essays             |  Publish Date: [________]                       |
|  - Blog Posts         |                                                 |
|  - News [Active]      |  Headline:     [______________________________] |
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

## 5.1 & 5.2 Backend for Response Layouts (`edit_response.js`)
**Corresponds to Public Sections:** 5.1 & 5.2 (Long-form Essays, Responses)  
**Purpose:** Specifically tailored for writing debate responses or historiographical arguments. Includes a split-screen editor emphasizing quick-insertion tools for citations, footnotes, and cross-references crucial for rigorous defenses.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  EDIT RESPONSE: [ Title ]                       |
|                       |  [ Save Response ]                              |
|-----------------------|-------------------------------------------------|
|  > Text Content       |   Addressing Challenge: [ Dropdown ]            |
|  - Responses [Active] |--------------------------|----------------------|
|                       |   Markdown (Edit)        |  Live Preview        |
|  ...                  |                          |                      |
|                       |   ## The Evidence        |  ## The Evidence     |
|                       |   Based on the findings  |  Based on the        |
|                       |   of Josephus...         |  findings of...      |
|                       |                          |                      |
|                       |  [ + Insert Citation ]   |                      |
|                       |  [ + Insert Record ]     |                      |
+-------------------------------------------------------------------------+
```

---

## 3.1 Backend for Visual Interactive Displays (`edit_diagram.js`)
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

## 2.1 Backend for Master Data Index (`list_all_records.js`)
**Corresponds to Public Section:** Non-specific (Global Data Access / Backend Index)
**Purpose:** A high-level, infinitely scrolling feed or paginated list displaying all entries currently stored in the central `records` table. Built to allow admins to quickly scan, filter, and access records for editing, displaying only the Title and the Primary Verse.

```text
+-------------------------------------------------------------------------+
| [ Dashboard Sidebar ] |  ALL DATABASE RECORDS                           |
|                       |  [ Search by Title or Verse... ]    [+ Add New] |
|-----------------------|-------------------------------------------------|
|  > Records [Active]   |                                                 |
|  - View All           |  [ Title ]                  [ Primary Verse ]   |
|  - Create New         |-------------------------------------------------|
|                       |  Jesus is Baptized          Mark 1:9-11         |
|                       |-------------------------------------------------|
|  > Lists & Ranks      |  Crucifixion of Jesus       Matthew 27:32-56    |
|  ...                  |-------------------------------------------------|
|                       |  Sermon on the Mount        Matthew 5:1-7:29    |
|                       |-------------------------------------------------|
|                       |  Destruction of the Temple  Mark 13:1-2         |
|                       |-------------------------------------------------|
|                       |  [ Pagination / Infinite Scroll Loader ]        |
+-------------------------------------------------------------------------+
```
