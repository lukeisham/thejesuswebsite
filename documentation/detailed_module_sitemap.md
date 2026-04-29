---
name: module_sitemap.md
version: 1.2.0
purpose: visual and list taxonomy of codebase
dependencies: [site_map.md]
---

# Module Sitemap

The purpose of this codebase is to build an archival style website organising and presenting historical information about Jesus. The website will be built using HTML, CSS, and JavaScript, with some PY helper scripts. The website will be built using a modular architecture that is easy to build, maintain and extend. This document is the source of truth, it must be updated after any code creation or code refactoring. 

## System Architecture: Big Picture

```text
+-------------------------------------------------------------+
|                       MCP Server                            |
|  (Read-only API for external agents, excludes Admin tools)  |
+------------------------------+------------------------------+
                               |
+------------------------------v------------------------------+
|                   Multi-Page HTML Nav                       |
|        (Browser loads explicit .html page files)            |
+----+-------------------------+-------------------------+----+
     |                         |                         |
+----v----+               +----v----+               +----v----+
| DISPLAY |               |  ADMIN  |               | HELPERS |
| MODULES |<--+       +-->| MODULES |               | (Python)|
| (Views) |   |       |   | (Edits) |               +----+----+
+----+----+   |       |   +---------+                    |
     |        |       |        ^                         |
+----v----+   |       |   +----v----+               +----v----+
|   CSS   |   |       |   | ADMIN   |               | DATA    |
| SYSTEM  |   |       +-->| API (PY)|               | BUILD   |
| (Grids) |   |           | + AUTH  |               | PIPELINE|
+---------+   |           +----+----+               +----+----+
              |                |                         |
     +--------v--------+       |                         |
     |  WASM SQLite    |       |                         |
     |  (sql.js)       |       |                         |
     +--------+--------+       |                         |
              |                |                         |
+-------------v----------------v-------------------------v----+
|                        SQL DATABASE                         |
|      (records, relations, external references, ranks)       |
+-------------------------------------------------------------+
```

## 1.0 Foundation Module
**Scope:** Global Grid, Typography, Colors, Shared UI (Sidebar, Header, Footer).
**Functionality:** Establishes the visual identity and structural grid for the entire site, ensuring consistent UI components and responsive design across all pages. This architectural base provides the universal navigation framework that allows users to move seamlessly between sections while maintaining a cohesive aesthetic experience.

**Files:**
```text
index.html                     <-- Website Landing Page (Root Entry)
robots.txt                     <-- Manual for well-behaved bots
sitemap.xml                    <-- Index of content for crawlers
assets/favicon.png              <-- Website Favicon Branding (Aleph + Omega)

frontend/pages/
├── about.html                 <-- About page
├── context.html               <-- Internal Landing Page (Context)
├── debate.html                <-- Internal Landing Page (Debate)
└── resources.html             <-- Internal Landing Page (Resources)

frontend/display_other/
├── sidebar.js                 <-- Universal Sticky Sidebar (Module 1.4). Provides functional
│                                   entry point to the Admin Portal (Module 7.1). See 
│                                   guide_appearance.md §1.5.1.
├── footer.js                  <-- Universal Footer
├── header.js                  <-- Universal Header (+ SEO injected)
└── search_header.js           <-- Injects search bar (search input only) into
                                   certain pages. No logo or nav links.
                                   (see guide_appearance.md §1.8, §1.8.1 & §1.8.2 for
                                    full DOM structure, CSS anatomy and end-to-end logic flow)

css/
├── elements/
│   ├── grid.css                   <-- Master logic determining structural layout alignment
│   ├── typography_colors.css      <-- Universal font scales and color palette variables
│   └── list_card_button.css       <-- Specific styles for interactive UI components
└── design_layouts/
    ├── universal/      
    │   ├── sidebar.css            <-- Styles dictating the universal sticky side navigation
    │   └── footer.css             <-- Styles dictating the universally appended footer
    └── views/
        └── index_landing.css      <-- Bespoke layout instructions for the root entry page
```

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.
**Functionality:** Manages the core data life-cycle, including database schema definition, Python-based ingestion pipelines, and dynamic frontend rendering of individual records and aggregate lists. The module leverages a client-side SQLite engine to deliver fast, interactive data exploration and robust filtering capabilities directly within the browser.

**Files:**
```text
database/
├── database.sql                           <-- The blueprint schema
└── database.sqlite                        <-- The COMPILED actual database file

frontend/core/
├── sql-wasm.wasm              <-- Downloaded library
├── sql-wasm.js                <-- Downloaded library
├── setup_db.js                <-- Fetches & inits SQLite for pages
├── sanitize_query.js          <-- Security utility to clean search input
└── json_ld_builder.js         <-- Generates Schema.org JSON metadata

backend/scripts/
└── helper_api.py                      <-- Shared logic for secure external API connection calls

frontend/pages/
├── records.html             <-- Generic row-based record list view
└── record.html                <-- Individual record deep-dive view

frontend/pages/resources/      <-- Resource List Views
├── OT Verses.html         
├── Manuscripts.html       
├── Internal witnesses.html
├── External witnesses.html
├── Objects.html           
├── Miracles.html          
├── Events.html            
├── People.html            
├── Places.html            
├── Sermons and Sayings.html
├── Sites.html             
├── Sources.html           
└── World Events.html      

frontend/display_big/
├── single_view.js             <-- Renders single record
└── list_view.js               <-- Renders standard row-based data lists

frontend/display_other/
├── pictures_display.js        <-- Picture Rendering
├── thumbnails_display.js      <-- Renders thumbnails
└── display_snippet.js         <-- Renders inline snippets

css/
├── elements/
│   ├── pictures.css               <-- Specific styles for pictures and labels
│   └── thumbnails.css             <-- Specific styles for thumbnails
└── design_layouts/views/
    ├── list_layout.css        <-- Layout for aggregate list views
    └── single_layout.css      <-- Layout for deep-dive record views

admin/frontend/edit_modules/
├── edit_record.js         <-- Core form for editing single records
├── edit_picture.js        <-- Sub-module for PNG upload and resizing
├── edit_lists.js          <-- Editor for resources lists
├── edit_links.js          <-- Unified form for Internal/External/Context links
└── edit_bulk_upload.js    <-- UI for bulk uploading CSV files to create records                [§2.5]
```

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.
**Functionality:** Provides interactive and visual-first navigation through three distinct architectural systems:
- **Recursive Ardor tree-like diagrams** for hierarchical relationship mapping.
- **Linear chronological dot-event timelines** for temporal progression.
- **Multi-layered vector-based geographic maps** for spatial context.
These systems leverage dynamic rendering to transform relational database records into engaging narratives—populating interactive metadata panels with the title, date, category, and primary verse for every historical node.

**Files:**
```text
frontend/pages/
├── maps.html                  <-- Visual Interactive Map Display
│   ├── map_jerusalem.html     <-- Jerusalem map
│   ├── map_empire.html        <-- Empire map
│   ├── map_levant.html        <-- Levant map
│   ├── map_galilee.html       <-- Galilee map
│   └── map_judea.html         <-- Judea map
├── timeline.html              <-- Visual Interactive timeline Display
└── evidence.html              <-- Visual Interactive Ardor diagram Display

frontend/display_big/
└── ardor_display.js           <-- Renders Ardor diagram

frontend/display_other/
├── timeline_display.js        <-- Renders timeline dots and linear progression loops
└── maps_display.js            <-- Renders overlapping geographic data layers

css/elements/
├── ardor_diagram.css          <-- Specific styles for Ardor diagram
├── timeline_diagram.css       <-- Specific styles for timeline diagram
└── map_diagram.css            <-- Specific styles for map diagram

admin/frontend/edit_modules/
└── edit_diagram.js        <-- Visual tool to adjust recursive 'Ador' parent_id relations
```

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).
**Functionality:** Processes and ranks external data (Wikipedia) and historical challenge queries via separate sub-modules, providing curated, high-value entry points into historical debates. It utilizes **discrete sets of weighting multipliers for Wikipedia, academic debates, and popular queries**, allowing administrators to fine-tune rankings via specialized backend pipelines and management tools to ensure the most relevant evidence is prioritized. Challenge views embed a linked response record directly into the ranked list.

**Files:**
```text
backend/pipelines/
├── pipeline_wikipedia.py              <-- Fetches, ranks, inserts Wikipedia reference data  [§4.1]
├── pipeline_popular_challenges.py     <-- Finds, analyzes and ranks popular public queries   [§4.2]
└── pipeline_academic_challenges.py    <-- Finds, analyzes and ranks academic historical debates [§4.2]

frontend/pages/debate/
├── wikipedia.html         <-- Ranked Wikipedia view                                          [§4.1]
├── popular_challenge.html <-- Ranked Challenge View with Response Inserted                   [§4.2]
└── academic_challenge.html<-- Ranked Challenge View with Response Inserted                   [§4.2]

frontend/display_big/
├── list_view_wikipedia.js                       <-- Renders row-based ranked wikipedia links [§4.1]
├── list_view_popular_challenges.js              <-- Renders ranked popular challenges        [§4.2]
├── list_view_academic_challenges.js             <-- Renders ranked academic challenges       [§4.2]
├── list_view_popular_challenges_with_response.js  <-- Popular challenges with response      [§4.2]
└── list_view_academic_challenges_with_response.js <-- Academic challenges with response     [§4.2]

admin/frontend/edit_modules/
├── edit_rank.js             <-- Form to manually override automated rankings
├── edit_wiki_weights.js     <-- Admin tool for editing wikipedia ranking multipliers          [§4.1]
├── edit_academic_weights.js <-- Admin tool for editing academic ranking multipliers           [§4.2]
├── edit_popular_weights.js  <-- Admin tool for editing popular ranking multipliers            [§4.2]
├── edit_insert_response_academic.js <-- (cross-ref from Module 5.0 Essays & Responses) Loaded & wired by dashboard router for `ranks-responses` [§4.2]
└── edit_insert_response_popular.js  <-- (cross-ref from Module 5.0 Essays & Responses) Loaded & wired by dashboard router for `ranks-responses` [§4.2]
```

> **Note:** `edit_lists.js` (from Module 2.0 Records) is also loaded by `admin.html` and wired under the `lists-resources` router branch for the "Edit Resources" sidebar link under Lists & Ranks.

---

## 5.0 Essays & Responses Module
**Scope:** Context-Essays & Historiography (§5.1), Challenge Responses (§5.2).
**Functionality:** Handles long-form editorial content as two distinct sub-modules. §5.1 covers thematic context essays and the historiography essay, with specialized typography and MLA citation rendering. §5.2 covers scholarly challenge responses, which are linked to ranked challenge lists via §4.3 Insert Responses. Both sub-modules use a split-pane markdown editor and share a bibliography system that automatically formats sources.

**Files:**
```text
frontend/pages/
└── context_essay.html         <-- Context essay single essay view                [§5.1]

frontend/pages/debate/
├── historiography.html    <-- Historiography essay                                [§5.1]
└── response.html          <-- Challenge response single view                      [§5.2]

frontend/display_big/
├── view_context_essays.js     <-- Renders context essays                          [§5.1]
├── view_historiography.js     <-- Renders historiography essay                    [§5.1]
├── response_display.js        <-- Renders challenge responses                     [§5.2]
└── list_view_responses.js     <-- Renders inserted list items (used for responses)[§5.2]

frontend/display_other/
├── sources_biblio_display.js  <-- Renders formatted MLA bibliography citations    [§5.1/§5.2]
└── mla_snippet_display.js     <-- Renders inline MLA citations                   [§5.1/§5.2]

css/design_layouts/views/
├── essay_layout.css       <-- Specific typography for long-form essays            [§5.1]
└── response_layout.css    <-- Specific layouts for debate & responses             [§5.2]

admin/frontend/edit_modules/
├── edit_historiography.js           <-- Editor for historiography essay           [§5.1]
├── edit_essay.js                    <-- Editor for contextual essays              [§5.1]
├── edit_mla_sources.js              <-- Admin tool for editing MLA sources        [§5.1]
├── edit_response.js                 <-- Editor for challenge responses            [§5.2]
├── edit_insert_response_academic.js <-- (cross-ref §4.3) Inserts responses into academic lists [§5.2]
└── edit_insert_response_popular.js  <-- (cross-ref §4.3) Inserts responses into popular lists  [§5.2]
```

---

## 6.0 News & Blog Module
**Scope:** News Feed, Blog Feed, Combined Landing Page.
**Functionality:** Manages all news and blog content, from automated ingestion pipelines through to public-facing feed pages. A combined landing page surfaces the latest snippets from both feeds and directs users to the dedicated full-feed pages. Admin tools cover the full CRUD lifecycle for blog posts, news snippets, and named news sources.

**Files:**
```text
backend/pipelines/
└── pipeline_news.py                   <-- Crawls, ranks, inserts timeline news events

frontend/pages/
├── news_and_blog.html         <-- Combined News & Blog landing page (§6.1)
├── news.html                  <-- Full News feed page (§6.2)
└── blog.html                  <-- Full Blog feed page (§6.3)

frontend/display_big/
├── list_newsitem.js           <-- Renders news items aka 'news feed'
└── list_blogpost.js           <-- Renders blogposts aka 'blog feed'

frontend/display_other/
├── news_snippet_display.js    <-- Renders inline news snippets (landing page)
└── blog_snippet_display.js    <-- Renders inline blog snippets (landing page)

admin/frontend/edit_modules/
├── edit_news_snippet.js   <-- Editor for news snippets
├── edit_news_sources.js   <-- Admin tool for editing news sources
└── edit_blogpost.js       <-- Editor for blog posts
```

---

## 7.0 System Module
**Scope:** Initial setup, Agent instructions (`.agent`), backend API management, and VPS deployment.
**Functionality:** Defines the operational backbone of the site, including AI-agent workflows, secure backend API management, and production deployment automation. It serves as the **primary active security layer**, implementing robust session handling, authentication, and rate limiting to protect the application's data and admin interfaces.

### 7.1 Admin Portal (Sub-Module)
**Functionality:** Secure administrative interface for managing the website's content. Features a JWT-over-Cookie authentication system and a modular dashboard for CRUD operations.

**Files:**
```text
admin/
├── frontend/
│   ├── admin.html                 <-- Secure entry portal for admin editing features
│   ├── dashboard_app.js           <-- Main Dashboard controller, UI router & Sidebar navigation
│   ├── admin_login.js             <-- Authentication & Session handling
│   ├── load_middleware.js         <-- JWT/Token validation middleware
│   └── logout_middleware.js       <-- Session termination
└── backend/
    ├── admin_api.py               <-- Secure backend writing to SQL
    └── auth_utils.py              <-- JWT generation and Brute Force defense

css/design_layouts/views/
├── login_view.css         <-- Bespoke layout for the secure admin login UI
└── dashboard_admin.css    <-- Bespoke layout instructions for the secure admin portal

css/elements/
└── markdown_editor.css        <-- Specific styles for the admin WYSIWYG text editors
```

### 7.2 Agent Logic & Instructional Prompts
**Functionality:** Stores AI-agent configuration, workflows, and targeted guidance for LLM crawlers to ensure correct interpretation and response behavior.

**Files:**
```text
.agent/                  <-- Agent instructions & workflows

assets/
└── ai-instructions.txt  <-- Specialized guidance for LLM crawlers

README.md                <-- Project overview
```

### 7.3 Backend API, MCP Server & VPS Config
**Functionality:** Core configuration, read-only external API, Python dependencies, web server setup, and production deployment automation.

**Files:**
```text
mcp_server.py            <-- Exposes read-only API to external agents
requirements.txt         <-- Python dependencies (FastAPI, JWT, etc)
nginx.conf               <-- Global Web server and SSL/Proxy config
.gitignore               <-- Ensures secrets (like .env) aren't committed to GitHub
LICENCE                  <-- Open Use Licencing with attribution requirement

assets/
├── favicon.png          <-- Website favicon (Aleph & Omega design)
└── *.png                <-- Raw source images, portraits, and environment shots

deployment/
├── deploy.sh            <-- Pull from GitHub and restart services
├── ssl_renew.sh         <-- Automates SSL certificate renewal
├── admin.service        <-- Systemd config for Admin API (Auto-restart)
└── mcp.service          <-- Systemd config for MCP Server (Auto-restart)

css/design_layouts/
└── pdf_export.css       <-- Print media queries for exporting essays and data cleanly
```

### 7.4 Security Protocols & JWT Management
**Functionality:** Manages credentials, secrets, and security mechanisms including environment variables, rate limiting, and authentication protocols to protect application data and admin interfaces.

**Files:**
```text
.env                     <-- Global Admin, ESV and Deepseek credentials

backend/middleware/
└── rate_limiter.py      <-- DDoS protection for API endpoints

documentation/guides/
└── guide_security.md    <-- Security protocols and auth mechanism overview
```

---

## 8.0 Setup & Testing Module
**Scope:** Browser tests, data seeders, local performance audits, Documentation.
**Functionality:** Supports the development lifecycle through automated testing, database seeding, and the maintenance of comprehensive architectural documentation. It **complements system security through passive auditing**, performing regular vulnerability scans and performance benchmarks to ensure the long-term health and stability of the platform.

### 8.1 Local Environment Initialization
**Functionality:** Provides scripts and seed data for setting up the local development environment, including database initialization and pipeline orchestration.

**Files:**
```text
build.py                   <-- Root script to trigger backend pipelines
tools/
├── db_seeder.py           <-- Logic to populate the SQLite database
├── seed_data.sql          <-- Initial data payload for first build
├── minify_admin.py        <-- Automates admin code obfuscation
├── generate_sitemap.py    <-- Dynamic XML sitemap builder
└── test_records.sql       <-- Small sample dataset for test runs
logs/                      <-- Storage for pipeline and API error logs
```

### 8.2 Core Unit & Integration Testing
**Functionality:** Automated test suites, security audits, and AI-readability verification to ensure system reliability and correctness.

**Files:**
```text
tests/
├── port_test.py               <-- Verifies all local ports are responding
├── security_audit.py          <-- Runs automated vulnerability scans
├── agent_readability_test.py  <-- Simulates AI "headless" crawl
├── browser_test_skill.md      <-- Instructions for Agents to run browser tests
└── reports/                   <-- Output directory for UI/UX audit logs
```

### 8.3 Architectural Documentation & Guides
**Functionality:** Comprehensive documentation covering architecture, style guides, data schemas, and operational procedures for developers and AI agents.

**Files:**
```text
documentation/
├── implementation_plan.md             <-- Implementation Plan
├── module_sitemap.md                  <-- Architectural blueprints and logic flows (This File)
├── vibe_coding_rules.md               <-- Foundational coding philosophies and aesthetic mandates
├── style_guide.md                     <-- UI / UX visual design guide
├── data_schema.md                     <-- Core SQLite database blueprint 'source of truth'
└── guides/
    ├── guide_appearance.md            <-- ASCI diagram of page appearance
    ├── guide_dashboard_appearance.md  <-- ASCI diagram of dashboard page appearance
    ├── guide_donations.md             <-- Reference for external support integrations
    ├── guide_function.md              <-- Detailed explanation of system logic flows
    ├── guide_security.md              <-- Security protocols and auth mechanism overview
    ├── guide_style.md                 <-- UI / UX visual design guide (style_guide.md)
    └── guide_welcoming_robots.md      <-- SEO and AI accessibility standards
```
