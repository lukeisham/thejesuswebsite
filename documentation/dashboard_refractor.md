---
purpose: refractor Dashboard
---

## Implementation List 

1	Arbor Diagram	Critical	Stateful Visualization: Managing recursive drag-and-drop, re-parenting nodes, and maintaining structural integrity in a hierarchical graph.
2	Backend Foundation	Critical	Infrastructure: Building shared utilities (snippet/metadata generators), system config tables, and essential editorial API endpoints.
3	All Records	High	Data Orchestration: Implementing endless scroll with complex, multi-criteria sorting logic (Bible order, alphabet, date, and bulk status).
4	Essay & Historiography	High	Dual-State Editor: Managing a split-pane WYSIWYG editor that must toggle state between two distinct document types with shared metadata handlers.
5	Blog Posts	High	Content Lifecycle: Managing a high-density editor with image handling, source linking, and a navigational sidebar for draft/published states.
6	Challenge Response	High	Linking Logic: Ensuring the markdown editor correctly links responses to parent challenge records and triggers snippet generation.
7	Single Record Editor	Medium	Field Density: Managing a high-volume form with specific sorting rules, image processing, and automated snippet triggers.
8	Challenge Lists	Medium	Weighted Toggles: Handling the Academic vs. Popular toggle state and real-time score recalculation via sidebar multipliers.
9	Wikipedia Lists	Medium	Ranking Logic: implementing the sidebar multiplier UI and the real-time ranking calculator for archival items.
10	News Sources	Medium	Pipeline Triggers: Managing source/keyword lists and orchestrating triggers for the external news-crawler script.
11	Login & Shell	Low-Med	Orchestration: Setting up the "Universal Dashboard" component injection pattern and the authentication handshake.
12	System Dashboard	Low	Monitoring: Implementing real-time health gauges, log streaming, and documentation management triggers.

## mini sitemap of refractor

admin.html                                      = login
└── dashboard.html                              = layout for the dashboard
    ├── dashboard_records_all.html              = all records view
    ├── dashboard_records_single.html           = single record view
    ├── dashboard_arbor.html                    = arbor diagram
    ├── dashboard_wikipedia.html                = wikipedia ranked list
    ├── dashboard_challenge.html                = challenge ranked list (academic and popular)
    ├── dashboard_essay_and_historiography.html = essays and historiography essay (WYSIWYG)
    ├── dashboard_challenge_responses.html      = challenge responses (WYSIWYG)
    ├── dashboard_news_sources.html             = news sources
    ├── dashboard_blog_posts.html               = blog posts (WYSIWYG)
    └── dashboard_system.html                   = system

## Notes

New css saved within relevant modules inside the css sub-directory 
    - create /Users/lukeishammacbookair/Developer/thejesuswebsite/css/1.0_foundation/dashboard-temp etc 
New JS saved within relevant modules inside the js sub-directory
    - create /Users/lukeishammacbookair/Developer/thejesuswebsite/js/1.0_foundation/dashboard-temp etc
New HTML saved within /Users/lukeishammacbookair/Developer/thejesuswebsite/admin/frontend sub-directory

Also create login-temp.html and dashboard-temp.html (in admin/frontend sub-directory)
BUT to make it easy for the agent to plan creat eand update, all code should assume login.html and dashboard.hmtl are the correct file names. 

## Style rules from guide_style.md

Dashboard & Editor Aesthetics
| Category | Rule / Visual Description | Implementation / CSS |
| :--- | :--- | :--- |
| **Layout Convention** | Bespoke single page layout, featuring a universal header, an occasional sidebar (left), and a fixed universal footer. | Documentation convention |
| **Field Ownership Map** | Documents database column ownership using `§N.M` notation. | Documentation convention |
| **Section Numbering** | Numbered (`### 2.1`) for sitemap modules; un-numbered for sub-features. | Documentation convention |
| **Admin Shell** | Dashboard color scheme; 'providence' theme with Gold accents. | `--color-dash-bg`, `--color-dash-accent` |
| **Editor Style** | Mono fields; data-dense aesthetics; minimalist input borders. | `--font-mono`, `--border-input` |
| **Function Bar** | Sticky secondary header below the main header containing toggles and primary page actions (Refresh, Publish, Delete). | `--color-dash-accent`, `position: sticky` |
| **Return Link**| Lead Grey, tertiary BG hover. | `--font-mono`, `--color-text-muted`, `--transition-fast` |
| **WYSIWYG Toolbar**| Utilitarian markdown action buttons (`[B] [I] [U]`) with minimalist spacing. | `.wysiwyg-toolbar-btn` |
| **Data Tables** | High density, monospaced typography for unique IDs and metadata, hover states on rows, endless scroll overflow. | `.dashboard-table`, `overflow-y: auto` |
| **Sidebars** | Fixed width, independently scrollable, distinct separation from main content area via 1px dashed border. | `.dashboard-sidebar` |

Consistency Checklist
| Component | Rule | Status |
| :--- | :--- | :--- |
| **Dashboard Header** | Logo & Title Left. Links Right ('Return to frontpage', 'Dashboard', 'Logout'). | **Implemented** |
| **Dashboard Footer** | Fixed bottom span. "Error Message Display" / System status stream. | **Implemented** |
| **Typography** | All pages must use the "Type System" defined in Section 3 (Mono heavily used). | **Implemented** |
| **Color** | All pages must use the "Color Palette" defined in Section 4. | **Implemented** |
| **Spacing** | All pages must follow the 8px grid logic in Section 13. | **Implemented** |
| **Borders** | All structural borders must be 1px dashed (`--border-width-thin`). | **Implemented** |
| **Corners** | All structural corners must be 0px (`--radius-none`). | **Implemented** |
| **Responsive** | Sidebar must collapse below 768px; Footer stays fixed. | **Implemented** |
| **Interactive Toggles** | Active toggle states must be clearly delineated (e.g. Academic vs Popular). | **Pending** |

## Login

```text
+-------------------------------------------------+
|                                                 |
|                 [ Logo ]                        |
|                                                 |
|            +-----------------------+            |
|            |      Admin Login      |            |
|            |                       |            |
|            |  Username: [_______]  |            |
|            |  Password: [_______]  |            |
|            |                       |            |
|            |      [ Login ]        |            |
|            |   'error message'     |            |
|            +-----------------------+            |
|                                                 |
+-------------------------------------------------+
```

Module: 7.1 and 7.4 (partially)
Purpose: controls access to dashboard
    css: admin.css (all the css required for login 1page)
    js: 
        - admin.js
    dependencies: admin/backend/admin_api.py (login/health_check routes), admin/backend/auth_utils.py (JWT cookies)

## Dashboard

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | All Records        |  | Single Record      |  | Arbor Diagram      |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Wikipedia          |  | Challenges         |  | Challenge Resp.    |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+  +--------------------+  +--------------------+         |
|  | Essay & Hist.      |  | News Sources       |  | Blog Posts         |         |
|  +--------------------+  +--------------------+  +--------------------+         |
|                                                                                 |
|  +--------------------+                                                         |
|  | System             |                                                         |
|  +--------------------+                                                         |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 1.0 and 7.3 (partially)
Purpose: landing page for all 10 dashboard pages
    css: dashboard.css (all the css required for dashboard)
    js: 
        - dashboard_orchestrator.js (orchestrates the page)
        - display_dashboard_cards.js (displays cards for each dashboard page)
        - display_error_footer.js (displays error message footer)
    dependencies: admin/backend/admin_api.py (verify_session), admin/backend/auth_utils.py
Unique Features
    - grid of cards linking to each page
    - Universal Dashboard feature
        A header with double sized favicon and "Jesus Website Dashboard" on the left and on the right: 'Return to frontpage', 'Return to Dashboard' and 'Logout' buttons.
            css: dashboard_universal_header.css (all the css required for dashboard universal header)
            js: dashboard_universal_header.js (all the js required for dashboard universal header)
            dependencies: admin/backend/admin_api.py (logout route)
    - Error message display = displays error messages if any are thrown from the API call or some other failure on the relevant page. 


## Display all lists

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Toggle: [Creation Date] [Unique ID] [Primary Verse] [Title] [List Ord.] [Bulk]  |
+---------------------------------------------------------------------------------+
| Title             | Primary Verse  | Snippet                      | Status      |
+-------------------+----------------+------------------------------+-------------+
| Jesus is born     | Luke 2:1-7     | In those days Caesar Aug...  | Published   |
| Sermon on Mount   | Matthew 5-7    | Seeing the crowds, he we...  | Published   |
| Draft Item 1      |                | Pending content...           | Draft       |
| Bulk Upload Item  |                | Uploaded from CSV...         | Draft       |
| ...               | ...            | ...                          | ...         |
+---------------------------------------------------------------------------------+
| (Endless Scroll)                                                                |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 2.0 and 2.1 (partially)
Purpose: Contains a table of all the records, (clicking on one takes you to the single record page)
    css: dashboard_records_all.css (all the css required for display all lists page)
    js: 
        - dashboard_records_all.js (orchestrates the page)
        - data_populate_table.js (fetches and passes data)
        - endless_scroll.js (endless scroll function)
        - table_toggle_display.js (functions for toggling display options)
        - bulk_csv_upload_handler.js (functions for ingesting and accepting bulk CSV uploads)
    dependencies: admin/backend/admin_api.py (get_all_records, bulk_upload_records)
Page Function bar: Toggle display bar above the list of records with options to display by Creation date, Unique ID, Primary Bible verse (organised by Bible order), Title (organised alphabetically or in reverse alphabetical order), List ordinary (OT Prophecy, Parables, Place, People, Event etc etc) or by Bulk CSV upload (draft or accepted - if rejected they vanish)
Unique Features: 
    - Table view with endless scroll (no pagination)
    - Table displays, title, primary verse, snippet, and draft or published status.
    - Clickable rows, opens the row in the single record page for editing
    - All records are always displayed in the list (but order determined by toggle options) EXCEPT incoming bulk uploads which populate the list until 'accepted' and then they merged into the master list (with 'draft' status)

## Single Record Page

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Draft ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
|  Title:           [___________________________________________]                 |
|  Primary Verse:   [___________________________________________]                 |
|  Creation Date:   [___________________________________________]                 |
|  Unique ID:       [___________________________________________]                 |
|                                                                                 |
|  +-------------------------------------+                                        |
|  |                                     |  [ Add Picture ]                       |
|  |          Image Display              |                                        |
|  |                                     |                                        |
|  +-------------------------------------+                                        |
|                                                                                 |
|  Snippet:         [___________________________________________]  [Generate]     |
|  Date Added:      [___________________________________________]                 |
|  Status:          [ Draft | Published | Archived ]                              |
|                                                                                 |
|  MLA Sources:     [___________________________________________]  [Add Source]   |
|  Context Links:   [___________________________________________]  [Add Link]     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 2.0 
Purpose: A page dedicated to editing, creating or displaying a single record. 
    css: dashboard_records_single.css (all the css required for single record page)
    js: 
        - dashboard_records_single.js (orchestrates the page)
        - display_single_record_data.js (fetching data and displaying it in the fields)
        - record_status_handler.js (handles draft, publish, and delete functions)
        - picture_handler.js (handles picture uploading and display)
        - mla_source_handler.js (handles MLA source adding and display)
        - context_link_handler.js (handles context link adding and display)
        - snippet_generator.js (triggers record_snippet.py for new snippets)
    dependencies: admin/backend/admin_api.py (get_single_record, create_record, update_record, delete_record, upload_record_picture), backend/scripts/snippet_generator.py (planned)
Page Function bar: 'Draft', 'Publish' and 'Delete' buttons. 
Unique Features:
    - Fields to be displayed in this order:
        - Title (Alphabetical order)
        - Primary Bible verse (Organised by Bible order)
        - Creation date (Organised by creation date)
        - Unique ID (Organised by unique ID)
        - Full image  (display image)
        - Snippet (Display snippet)
        - Date added (Display date added)
        - Status (Draft / Published / Archived) (Display status)
        - etc etc [fill in later]


## Arbor 

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
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
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 3.0 and 3.1 (partially)
Purpose: A page dedicated to visulaising the records as an Arbor tree structure. (it mimics the frontend page)
    css: dashboard_arbor.css (all the css required for Arbor page)
    js: 
        - dashboard_arbor.js (orchestrates the page)
        - arbor_diagram_handler.js (fetching data, displaying nodes, and scrolling)
        - arbor_node_editor.js (handles drag-and-drop and updating parent nodes)
    dependencies: admin/backend/admin_api.py (get_diagram_tree, update_diagram_tree)
Page Function bar: 'Refresh' and 'Publish' buttons
Unique Features:
    - Mimics the frontend display of nodes  


## Wikipedia

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Refresh ]   [ Recalculate ]                            |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar) | Wikipedia Items (Main Area)                         |
|---------------------------+-----------------------------------------------------|
| First century context (1) | 1. Article Title One (Total Score: 42)              |
| [^] [v]                   |                                                     |
|                           | 2. Article Title Two (Total Score: 38)              |
| Theological weight (5)    |                                                     |
| [^] [v]                   | 3. Article Title Three (Total Score: 35)            |
|                           |                                                     |
|                           | ... (Endless Scroll)                                |
| [New Name] [Val] [Publish]|                                                     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 4.0 and 4.1 (partially)
Purpose: A page dedicated to displaying, reordering ranked Wikiepedia items and editing the ranking weights. 
    css: dashboard_wikipedia.css (all the css required for Wikipedia page)
    js: 
        - dashboard_wikipedia.js (orchestrates the page)
        - wikipedia_list_display.js (fetching data, displaying, and endless scroll)
        - wikipedia_weighting_handler.js (displaying sidebar, updating, and pushing weights)
        - wikipedia_ranking_calculator.js (refreshes list based on calculated scores and pushes to DB)
    dependencies: admin/backend/admin_api.py (get_list, update_list), backend/pipelines/pipeline_wikipedia.py
Page Function bar: 
    - 'Refresh' button (Refreshes the page)
    - 'Recalculate' button (Refreshes the page based on new calculated scores - scores are total of all weights)
Unique Features:
    - Special side bar to edit weighting ranks
        - Each seperate weight has the name of the weight followed by ranking score in brackets. (eg. First century context (1)) - [with up and down arrows to increase/decrease value]. 
        -  Below list of weights, blank field name and blank weight number (and publish weight button)
    - Main area displaying list of items (endless scroll)
    - Title of article with total ranking score in brackets 

## Challenge

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Academic | Popular ] Toggle   [ Refresh ]   [ Push ]            |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar) | Challenge Items (Main Area)                         |
|---------------------------+-----------------------------------------------------|
| Difficulty (8)            | 1. Challenge Title One (Total Score: 85)            |
| [^] [v]                   |                                                     |
|                           | 2. Challenge Title Two (Total Score: 72)            |
| Popularity (3)            |                                                     |
| [^] [v]                   | 3. Challenge Title Three (Total Score: 60)          |
|                           |                                                     |
|                           | ... (Endless Scroll)                                |
| [New Name] [Val] [Publish]|                                                     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 4.0 and 4.2 (partially)
Purpose: Displaying the two challenge lists (Popular and Academic), the function bar to switch between them. and a side bar to view and modify ranking weights. 
    css: dashboard_challenge.css (all the css required for challenge page)
    js: 
        - dashboard_challenge.js (orchestrates the page and Academic/Popular toggle)
        - challenge_list_display.js (fetching data, displaying, and scrolling active list)
        - challenge_weighting_handler.js (displaying sidebar, updating, and pushing weights)
        - challenge_ranking_calculator.js (refreshes list based on calculated scores and pushes to DB)
        - insert_challenge_response.js (inserts a response into the database, creates draft response essay)
    dependencies: admin/backend/admin_api.py (get_list, update_list), backend/pipelines/pipeline_academic_challenges.py, backend/pipelines/pipeline_popular_challenges.py
Page Function bar: 
    - Toggle between Popular and Academic. 
    - a Refresh button 
    - a Push button to push changes to the frontend. 
Unique Features:   
    - Special side bar to edit weighting ranks
        - Each seperate weight has the name of the weight followed by ranking score in brackets. (eg. First century context (1)) - [with up and down arrows to increase/decrease value]. 
        -  Below list of weights, blank field name and blank weight number (and publish weight button)
    - Main area displaying list of items (endless scroll)
    - Title of challenge with total ranking score in brackets

## Challenge Response

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Draft ]   [ Publish ]   [ Delete ]                     |
+---------------------------------------------------------------------------------+
| Response Sidebar          | Response WYSIWYG Editor                             |
|---------------------------+-----------------------------------------------------|
| *Academic*                | Title: [___________________________________]        |
| - Response 1 (Draft)      |                                                     |
| - Response 2 (Pub)        | [B] [I] [U] [Link] [Image] [Code]                   |
|                           | +-----------------------------------------------+   |
| *Popular*                 | |                                               |   |
| - Response A (Pub)        | |  Markdown response content goes here...       |   |
|                           | |                                               |   |
|                           | +-----------------------------------------------+   |
|                           |                                                     |
|                           | Snippet: [_______________________] [Generate]       |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
``` 

Module: 5.0 and 5.2 (partially)
Purpose: CRUD for a challenge response 
    css: 
        - dashboard_challenge_response.css (all the css required for challenge response page)
        - response_markdown.css (all the css required for markdown editing)
    js: 
        - dashboard_challenge_response.js (orchestrates the page)   
        - display_challenge_response_data.js (fetching data and displaying it in the fields)
        - markdown_editor.js (enables markdown editing in the response essay fields)
        - response_status_handler.js (handles publishing and deleting responses)
        - snippet_generator.js (triggers response_snippet.py for new snippets)
    dependencies: admin/backend/admin_api.py (challenge response routes planned), backend/scripts/snippet_generator.py (planned)
Page Function bar:  
    - Draft, Publish (appears on frontend challenge pages) and Delete (removes from list of published and draft responses - so won't appear on challenge pages)
Unique Features:
    - Special side bar displays current and draft responses under academic and popular sub-headings 

## Essay & Historiography

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Essay | Historiography ] Toggle     [ Draft | Publish | Delete ]|
+---------------------------------------------------------------------------------+
| Editor Sidebar            | WYSIWYG Editor                                      |
|---------------------------+-----------------------------------------------------|
| *Published*               | Title: [___________________________________]        |
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
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Module: 5.0 and 5.1 (partially)
Purpose: WYSIWYG editor for an essay and its historiography (historiography = edits only one front-end page, essays = add new essays to the context front end.)
    css: 
        - dashboard_essay_historiography.css (all the css required for essay and historiography page)
        - essay_WYSIWYG_editor.css (all the css required for WYSIWYG editor)
    js: 
        - dashboard_essay_historiography.js (orchestrates the page and Essay/Historiography toggle)   
        - essay_historiography_data_display.js (fetching data and displaying it based on toggle)
        - markdown_editor.js (enables WYSIWYG markdown editing)
        - document_status_handler.js (handles publishing and deleting for both document types)
        - picture_handler.js (handles picture uploading and display)
        - mla_source_handler.js (handles MLA source adding and display)
        - context_link_handler.js (handles context link adding and display)
        - snippet_generator.js (triggers snippet generation script)
    dependencies: admin/backend/admin_api.py (essay/historiography routes planned), backend/scripts/snippet_generator.py (planned)
Page Function bar:  
    - Toggle between Essay and Historiography (changes title of essay and historiography page)
    - Draft, Publish (appears on frontend context pages or the historiography page depending on toggle), and Delete (removes from list of published and draft essays and historiographies - so won't appear on context page)
Unique Features: 
    - WYSIWYG editor. 

## News Sources

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Refresh Sources ] [ Update Sources ] [ Launch News-Crawler ]    |
+---------------------------------------------------------------------------------+
| Sidebar                   | News Sources List (Main Area)                       |
|---------------------------+-----------------------------------------------------|
| *Search Keywords*         | Source Name          | URL              | Status    |
| "keyword 1"               | ---------------------+------------------+---------- |
| [Edit] [Delete]           | Example News         | example.com/news | Active    |
| "keyword 2"               | Christian Post       | cpost.com/rss    | Active    |
| [Edit] [Delete]           | Daily Bugle          | bugle.com        | Inactive  |
|                           | ...                                                 |
| [New Keyword] [Publish]   | (Endless Scroll)                                    |
|                           |                                                     |
| *Sources*                 |                                                     |
| Example News     [Delete] |                                                     |
| Christian Post   [Delete] |                                                     |
| [New Source URL] [Add]    |                                                     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
``` 

Module 6.0 and 6.1 (partially - news crawler)
Purpose: News Sources list editor (editing list of news sources which controls where the news-crawler searches for articles).
    css: news_sources_dashboard.css 
    js: 
        - dashboard_news_sources.js (orchestrates the page)
        - news_sources_handler.js (fetching, displaying, refreshing, and updating news sources)
        - search_keywords_handler.js (displaying and updating search keywords)
        - launch_news_crawler.js (launches the news_crawler.py script on the sources list)
        - snippet_generator.js (triggers snippet generation script)
    dependencies: admin/backend/admin_api.py (news routes planned), backend/pipelines/pipeline_news.py, backend/scripts/snippet_generator.py (planned)
Page Function bar: 
    - Refresh sources list (refreshes the list of news sources - removes any duplicates)
    - Update sources list (update list of news sources which controls where the news-crawler searches for articles)
    - Launch News-Crawler (launches the news-crawler on the sources list, which are then published to front-end)
Unique Features:
    - Side-bar to list and then also add or remove sources (also controls where the news-crawler searches for articles). 
    - Side also contains sub-heading "search keywords" the news crawler uses to search news sources. (this can be edited and published in the same way as weightings)   
    - Main area displays list of news sources in a table (endless scroll)

## Blog Posts

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Draft ]   [ Publish ]   [ Delete ]                     |
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
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
``` 

Module: 6.0 and 6.3 (partially)
Purpose: WYSIWYG editor for blog posts
    css: blog_posts_dashboard.css 
    js: 
        - dashboard_blog_posts.js (orchestrates the page)
        - display_blog_posts_data.js (fetching data and displaying it in the fields)
        - markdown_editor.js (enables WYSIWYG markdown editing)
        - blog_post_status_handler.js (handles publishing and deleting blog posts)
        - picture_handler.js (handles picture uploading and display)
        - mla_source_handler.js (handles MLA source adding and display)
        - context_link_handler.js (handles context link adding and display)
        - snippet_generator.js (triggers snippet generation script)
    dependencies: admin/backend/admin_api.py (blog routes planned), backend/scripts/snippet_generator.py (planned)
Page Function bar:  
    - Draft, Publish (appears on frontend blog pages), and Delete (removes from list of published and draft blog posts - so won't appear on blog page)
Unique Features: 
    - Sidebar of published and draft blog posts (endless scroll)
    - WYSIWYG editor

## System

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Save Configuration ]   [ Restart Services ]            |
+---------------------------------------------------------------------------------+
| System Data & Logs                                                              |
| +-----------------------------------------------------------------------------+ |
| | Agent Status: Online                                                        | |
| | API Health: OK (99.9% uptime)                                               | |
| | VPS CPU Usage: [|||||     ] 50%                                             | |
| | Security: JWT valid, no active alerts                                       | |
| +-----------------------------------------------------------------------------+ |
|                                                                                 |
| Core Unit & Integration Testing                                                 |
| [ Run All Tests ] [ Run API Tests ] [ Run Agent Tests ]                         |
|                                                                                 |
| Architectural Docs                                                              |
| [ View / Edit Docs ] [ Generate Agents ]                                        |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

Modules: 7.0 and 8.0
Purpose: Display of all system data and functions relating to 
    - admin portal 
    - AI agent logic 
    - backend API, MCP Server & VPS Config
    - Security protocols & JWT Management 
    - local environment initialization
    - core unit & integration testing
    - architectural documentation & guides
    - including the function to create system agents
css: dashboard_system.css (all the css required for system page)
js: 
    - dashboard_system.js (orchestrates the page)
    - display_system_data.js (fetching data and displaying it in the fields)
dependencies: admin/backend/admin_api.py (system routes planned), mcp_server.py (system testing)
Page Function bar: 
Unique Features:
    -   

