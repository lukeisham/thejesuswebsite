---
name: module_sitemap.md
version: 1.0.0
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

**Files to create Structure:**
```text
index.html                     <-- Website Landing Page (Root Entry)
robots.txt                     <-- Manual for well-behaved bots
sitemap.xml                    <-- Index of content for crawlers
favicon.ico                    <-- Website Favicon Browser branding

frontend/pages/
├── about.html                 <-- About page
├── context.html               <-- Internal Landing Page (Context)
├── debate.html                <-- Internal Landing Page (Debate)
├── resources.html             <-- Internal Landing Page (Resources)
└── news_and_blog.html         <-- Internal Landing Page: News Feed

frontend/display_other/
├── sidebar.js                 <-- Universal Sticky Sidebar
├── footer.js                  <-- Universal Footer
├── header.js                  <-- Universal Header (+ SEO injected)
└── search_header.js           <-- Injects search bar into certain pages 

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

**Files to create Structure:**
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
├── edit_lists.js          <-- Editor for resources lists
└── edit_links.js          <-- Unified form for Internal/External/Context links
```

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.
**Functionality:** Provides interactive and visual-first navigation through three distinct architectural systems:
- **Recursive Ardor tree-like diagrams** for hierarchical relationship mapping.
- **Linear chronological dot-event timelines** for temporal progression.
- **Multi-layered vector-based geographic maps** for spatial context.
These systems leverage dynamic rendering to transform relational database records into engaging, spatially and temporally aware narratives.

**Files to create Structure:**
```text
frontend/pages/
├── maps.html                  <-- Visual Interactive Map Display
│   ├── map_jerusalem.html     <-- Jerusalem map
│   ├── map_empire.html        <-- Empire map
│   ├── map_levant.html        <-- Levant map
│   ├── map_galilee.html       <-- Galilee map
│   └── map_judea.html         <-- Judea map
├── timeline.html              <-- Visual Interactive timeline Display
└── evidence.html              <-- Visual Interactive Arbor diagram Display

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
**Scope:** Ranked Wikipedia article lists, Ranked historical challenges.
**Functionality:** Processes and ranks external data (Wikipedia) and long-form internal responses (managed via the **Essays Module**) to provide curated, high-value entry points into historical debates. It utilizes **discrete sets of weighting multipliers for Wikipedia, academic debates, and popular queries**, allowing administrators to fine-tune rankings via specialized backend pipelines and management tools to ensure the most relevant evidence is prioritized.

**Files to create Structure:**
```text
backend/pipelines/
├── pipeline_wikipedia.py              <-- Fetches, ranks, inserts Wikipedia reference data
├── pipeline_popular_challenges.py     <-- Finds, analyzes and ranks popular public queries
└── pipeline_academic_challenges.py    <-- Finds, analyzes and ranks academic historical debates

frontend/pages/debate/
├── wikipedia.html         <-- Ranked Wikipedia view
├── popular_challenge.html <-- Ranked View with Response Inserted
└── academic_challenge.html<-- Ranked View with Response Inserted

frontend/display_big/
├── list_view_wikipedia.js     <-- Renders row-based ranked wikipedia links
├── list_view_popular_challenges.js <-- Renders ranked popular challenges
├── list_view_academic_challenges.js <-- Renders ranked academic challenges
├── list_view_popular_challenges_with_response.js <-- Popular challenges with response 
└── list_view_academic_challenges_with_response.js <-- Academic challenges with response 

admin/frontend/edit_modules/
├── edit_rank.js           <-- Form to manually override automated rankings
├── edit_wiki_weights.js   <-- Admin tool for editing wikipedia ranking multipliers
├── edit_academic_weights.js <-- Admin tool for editing academic ranking multipliers
└── edit_popular_weights.js <-- Admin tool for editing popular ranking multipliers
```

---

## 5.0 Essays Module
**Scope:** Context-Essay (Thematic context), Historiography, Blog/News, Responses.
**Functionality:** Handles long-form editorial content and academic responses, featuring specialized typography, citation rendering (MLA), and blog/news snippet generation. The module includes **dedicated admin tools to dynamically insert scholarly responses directly into ranked challenge list views**, while also managing a sophisticated bibliography system that automatically formats sources to ensure all historical analysis remains academically grounded.

**Files to create Structure:**
```text
backend/pipelines/
└── pipeline_news.py                   <-- Crawls, ranks, inserts timeline news events

frontend/pages/
├── context_essay.html         <-- Context essay single essay view
├── news.html                  <-- Blog or News Feed Pages (News)
└── blog.html                  <-- Blog or News Feed Pages (Blog)

frontend/pages/debate/
├── historiography.html    <-- Historiography essay
└── response.html          <-- Challenge response single view

frontend/display_big/
├── list_blogpost.js           <-- Renders blogposts aka 'blog feed'
├── list_newsitem.js           <-- Renders news items aka 'news feed'
├── view_context_essays.js     <-- Renders context essays
├── view_historiography.js     <-- Renders historiography essay
├── response_display.js        <-- Renders challenge responses
└── list_view_responses.js     <-- Renders inserted list items (used for responses)

frontend/display_other/
├── sources_biblio_display.js  <-- Renders formatted MLA bibliography citations
├── mla_snippet_display.js     <-- Renders inline MLA citations
├── news_snippet_display.js    <-- Renders inline news snippets
└── blog_snippet_display.js    <-- Renders inline blog snippets

css/design_layouts/views/
├── essay_layout.css       <-- Specific typography for long-form essays
└── response_layout.css    <-- Specific layouts for debate & responses

admin/frontend/edit_modules/
├── edit_historiography.js <-- Editor for historiography essay
├── edit_essay.js          <-- Editor for contextual essays
├── edit_response.js       <-- Editor for challenge responses
├── edit_insert_response_academic.js <-- Editor for inserting responses into academic lists
├── edit_insert_response_popular.js <-- Editor for inserting responses into popular lists
├── edit_blogpost.js       <-- Editor for blog posts
├── edit_news_snippet.js   <-- Editor for news snippets
├── edit_mla_sources.js    <-- Admin tool for editing MLA sources 
└── edit_news_sources.js   <-- Admin tool for editing news sources
```

---

## 6.0 System Module
**Scope:** Intial setup, Agent instructions (`.agent`), backend API management, and VPS deployment.
**Functionality:** Defines the operational backbone of the site, including AI-agent workflows, secure backend API management, and production deployment automation. It serves as the **primary active security layer**, implementing robust session handling, authentication, and rate limiting to protect the application's data and admin interfaces.

**Files to create Structure:**
```text
/                      <-- Root Directory
├── .agent/            <-- Agent instructions & workflows
├── .gitignore         <-- Ensures secrets (like .env) aren't committed to GitHub
├── LICENCE            <-- Open Use Licencing with attribution requirement
├── requirements.txt   <-- Python dependencies (FastAPI, JWT, etc)
├── mcp_server.py      <-- Exposes read-only API to external agents
├── nginx.conf         <-- Global Web server and SSL/Proxy config
├── .env               <-- Global Admin, ESV and Deepseek credentials
├── backend/middleware/
│   └── rate_limiter.py    <-- DDoS protection for API endpoints
└── README.md          <-- Project overview

assets/            <-- Raw source images, fonts, and icons
├── ai-instructions.txt    <-- Specialized guidance for LLM crawlers
└── *.png                  <-- Raw source images, portraits, and environment shots

deployment/        <-- VPS Configuration Files
├── deploy.sh      <-- Pull from GitHub and restart services
├── ssl_renew.sh   <-- Automates SSL certificate renewal
├── admin.service  <-- Systemd config for Admin API (Auto-restart)
└── mcp.service    <-- Systemd config for MCP Server (Auto-restart)

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

css/
├── elements/
│   └── markdown_editor.css        <-- Specific styles for the admin WYSIWYG text editors
└── design_layouts/
    ├── views/
    │   ├── login_view.css         <-- Bespoke layout for the secure admin login UI
    │   └── dashboard_admin.css    <-- Bespoke layout instructions for the secure admin portal
    └── pdf_export.css             <-- Print media queries for exporting essays and data cleanly
```

---

## 7.0 Setup & Testing Module 
**Scope:** Browser tests, data seeders, local performance audits, Documentation.
**Functionality:** Supports the development lifecycle through automated testing, database seeding, and the maintenance of comprehensive architectural documentation. It **complements system security through passive auditing**, performing regular vulnerability scans and performance benchmarks to ensure the long-term health and stability of the platform.

**Files to create Structure:**
```text
build.py               <-- Root script to trigger backend pipelines
tools/
├── db_seeder.py       <-- Logic to populate the SQLite database
├── seed_data.sql      <-- Initial data payload for first build
├── minify_admin.py    <-- Automates admin code obfuscation
├── generate_sitemap.py <-- Dynamic XML sitemap builder
└── test_records.sql   <-- Small sample dataset for test runs
logs/                  <-- Storage for pipeline and API error logs

tests/
├── port_test.py           <-- Verifies all local ports are responding
├── security_audit.py      <-- Runs automated vulnerability scans
├── agent_readability_test.py <-- Simulates AI "headless" crawl
├── browser_test_skill.md  <-- Instructions for Agents to run browser tests
└── reports/               <-- Output directory for UI/UX audit logs

documentation/
├── implementation_plan.md         <-- Implementation Plan 
├── module_sitemap.md              <-- Architectural blueprints and logic flows (This File)
├── vibe_coding_rules.md           <-- foundational coding philosophies and aesthetic mandates
├── style_guide.md                 <-- UI / UX visual design guide
├── data_schema.md                 <-- Core SQLite database blueprint 'source of truth'
└── guides/
    ├── guide_appearance.md         <-- ASCI diagram of page appearance
    ├── guide_dashboard_appearance.md  <-- ASCI diagram of dashboard page appearance
    ├── guide_donations.md          <-- Reference for external support integrations
    ├── guide_function.md           <-- Detailed explanation of system logic flows
    ├── guide_security.md           <-- Security protocols and auth mechanism overview
    ├── guide_style.md              <-- UI / UX visual design guide (style_guide.md)
    └── guide_welcoming_robots.md   <-- SEO and AI accessibility standards
```
