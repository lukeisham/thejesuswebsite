---
name: module_sitemap.md
version: 2.0.0
purpose: visual and list taxonomy of codebase — canonical source of truth for all files
dependencies: [site_map.md]
---

# Module Sitemap

The purpose of this codebase is to build an archival style website organising and presenting historical information about Jesus. The website is built using HTML, CSS, and JavaScript, with Python helper scripts, backend API services, and an admin dashboard for content management. The website uses a modular architecture that is easy to build, maintain and extend. This document is the source of truth; it must be checked before and after any code creation or code refactoring.

## System Architecture: Big Picture

```text
+------------------------------------------------------------------+
|                          MCP Server                               |
|     (Read-only API for external agents, excludes Admin tools)     |
+--------------------------------+---------------------------------+
                                 |
+--------------------------------v---------------------------------+
|                      Multi-Page HTML Nav                          |
|           (Browser loads explicit .html page files)               |
+------+-------------------+-------------------+-------------------+
       |                   |                   |
+------v------+   +--------v--------+   +------v------+
|   DISPLAY   |   |  ADMIN DASHBOARD|   |   HELPERS   |
|   MODULES   |   |     MODULES     |   |   (Python)  |
|   (Views)   |   |  (CRUD + Tools) |   +------+------+
+------+------+   +--------+--------+          |
       |                    |                   |
+------v------+   +--------v--------+   +------v------+
|     CSS     |   |   ADMIN API     |   |    DATA     |
|    SYSTEM   |   |   (FastAPI)     |   |    BUILD    |
|   (Grids)   |   |   + JWT AUTH   |   |   PIPELINE  |
+------+------+   +--------+--------+   +------+------+
       |                    |                   |
       |            +-------v--------+          |
       |            |  WASM SQLite   |          |
       |            |   (sql.js)     |          |
       |            +-------+--------+          |
       |                    |                   |
+------v--------------------v-------------------v------------------+
|                         SQL DATABASE                               |
|       (records, relations, external references, ranks, config)     |
+-------------------------------------------------------------------+
```

---

## 1.0 Foundation Module
The Foundation module defines the global visual identity and structural grid of the site while establishing the core navigational framework through shared UI components like the sidebar, header, and footer. Its scope encompasses the website's landing page, essential crawler configuration files, primary informational pages, and the shared dashboard shell grid system — ensuring a consistent and responsive user experience across the entire multi-page application.

### HTML Files
```text
index.html                     <-- Website Landing Page (Root Entry)

frontend/pages/
├── about.html                 <-- About page
├── context.html               <-- Internal Landing Page (Context)
├── debate.html                <-- Internal Landing Page (Debate)
└── resources.html             <-- Internal Landing Page (Resources)
```

### CSS Files
```text
css/1.0_foundation/
├── dashboard/
│   ├── admin_components.css   <-- Providence grid, dividers, column width hooks (shared dashboard shell)
│   └── admin_shell.css        <-- Dashboard chrome, header, canvas background
└── frontpage/
    └── *.css                  <-- Public-facing foundation styles
```

### JS Files
```text
js/1.0_foundation/
├── frontpage/
│   └── *.js                   <-- Public-facing foundation scripts
└── (shared navigation/UI logic)
```

### Supporting Files
```text
robots.txt                     <-- Manual for well-behaved bots
sitemap.xml                    <-- Index of content for crawlers
assets/favicon.png             <-- Website Favicon Branding (Aleph + Omega)
```

---

## 2.0 Records Module
The Records module manages the core data lifecycle, from SQLite schema definition and Python-based ingestion pipelines to the dynamic rendering of individual records and aggregate lists. Its scope includes the primary database files, secure external API connection utilities, a comprehensive suite of front-end pages for deep-dive exploration, and the admin dashboard interfaces for single-record editing and bulk record management. This module also publishes seven shared dashboard JS tools consumed by other dashboard modules.

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_records_all.html     <-- Tabular records management with bulk CSV upload
└── dashboard_records_single.html  <-- High-density single record editor with section navigator
```

### Dashboard CSS Files
```text
css/2.0_records/dashboard/
├── dashboard_records_all.css      <-- High-density table, sorting aesthetics, bulk review panel
└── dashboard_records_single.css   <-- Multi-section form layout, sticky section navigator
```

### Dashboard JS Files
```text
js/2.0_records/dashboard/
├── dashboard_records_all.js          <-- Module orchestration & view switching
├── dashboard_records_single.js       <-- Module orchestration & initialization
├── data_populate_table.js            <-- API integration & row hydration
├── endless_scroll.js                 <-- Performance-optimized overflow handling
├── table_toggle_display.js           <-- Sort/Filter logic; Bulk toggle isolates view
├── bulk_csv_upload_handler.js        <-- Phase 1: CSV parsing & client-side validation
├── bulk_upload_review_handler.js     <-- Phase 2: Ephemeral review, Save as Draft / Discard
├── search_records.js                 <-- Real-time client-side search (title, verse, snippet)
├── display_single_record_data.js     <-- Record fetching & full form hydration (all fields)
├── record_status_handler.js          <-- Save Draft, Publish & Delete status management
├── taxonomy_selector.js              <-- Selectors for era, timeline, gospel_category fields
├── map_fields_handler.js             <-- Selector for map_label + integer input for geo_id
├── parent_selector.js                <-- ULID input for parent_id with validation
├── external_refs_handler.js          <-- Text inputs for iaa, pledius, manuscript
├── url_array_editor.js               <-- Label/URL pair array editor
│
│   ── 🔑 Shared Tools (owned here, consumed by other dashboard modules) ──
│
├── picture_handler.js            <-- Image upload, preview & thumbnail
├── mla_source_handler.js         <-- Structured MLA bibliography management
├── context_link_handler.js       <-- Database relationship links
├── snippet_generator.js          <-- Automated snippet trigger (calls API → DeepSeek)
├── metadata_handler.js           <-- Snippet/Slug/Meta footer with auto-gen buttons
├── description_editor.js         <-- Dynamic paragraph array editor (description + snippet)
└── verse_builder.js              <-- Structured book/chapter/verse chip UI
```

### Frontend CSS Files
```text
css/2.0_records/frontpage/
└── *.css                      <-- Public-facing record display styles
```

### Frontend JS Files
```text
js/2.0_records/frontpage/
└── *.js                       <-- Public-facing record display logic
```

### Supporting Files
```text
database/
├── database.sql                           <-- The blueprint schema
└── database.sqlite                        <-- The COMPILED actual database file

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
```

---

## 3.0 Visualizations Module
The Visualizations module provides interactive, visual-first navigation through recursive Arbor diagrams, chronological timelines, and multi-layered geographic maps. Its scope covers the specialized HTML templates required for these immersive displays and the admin dashboard Arbor editor for drag-and-drop tree management — transforming relational database records into spatial and temporal narratives.

### Dashboard HTML Files
```text
admin/frontend/
└── dashboard_arbor.html           <-- Interactive diagram container with Refresh/Publish bar
```

### Dashboard CSS Files
```text
css/3.0_visualizations/dashboard/
└── dashboard_arbor.css            <-- Canvas & Node aesthetics
```

### Dashboard JS Files
```text
js/3.0_visualizations/dashboard/
├── dashboard_arbor.js             <-- Module orchestration & initialization
├── fetch_arbor_data.js            <-- API interface for tree fetching
├── render_arbor_node.js           <-- Individual node creation & styling
├── draw_arbor_connections.js      <-- SVG/Canvas logic for relationship lines
├── handle_node_drag.js            <-- Drag-and-drop interaction logic
└── update_node_parent.js          <-- Parent-child re-assignment logic (auto-saves as draft)
```

### Frontend CSS Files
```text
css/3.0_visualizations/frontpage/
└── *.css                          <-- Public-facing visualization styles
```

### Frontend JS Files
```text
js/3.0_visualizations/frontpage/
└── *.js                           <-- Public-facing visualization logic (render_arbor.js, etc.)
```

### Supporting Files
```text
frontend/pages/
├── maps.html                  <-- Visual Interactive Map Display
│   ├── map_jerusalem.html     <-- Jerusalem map
│   ├── map_empire.html        <-- Empire map
│   ├── map_levant.html        <-- Levant map
│   ├── map_galilee.html       <-- Galilee map
│   └── map_judea.html         <-- Judea map
├── timeline.html              <-- Visual Interactive Timeline Display
└── evidence.html              <-- Visual Interactive Arbor Diagram Display
```

---

## 4.0 Ranked Lists Module
The Ranked Lists module processes and prioritizes external Wikipedia data and historical challenges using discrete weighting multipliers to surface high-value evidence. Its scope includes the backend Python pipelines for automated ranking, the public-facing debate pages, and the admin dashboard interfaces for Wikipedia list management and Challenge ranking with integrated response insertion.

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_wikipedia.html       <-- Wikipedia list management container
└── dashboard_challenge.html       <-- Challenge list management container (Academic/Popular toggle)
```

### Dashboard CSS Files
```text
css/4.0_ranked_lists/dashboard/
├── dashboard_wikipedia.css        <-- Sidebar controls & list aesthetics
└── dashboard_challenge.css        <-- Toggle-driven dual-pane layout & weighting sidebar
```

### Dashboard JS Files
```text
js/4.0_ranked_lists/dashboard/
├── dashboard_wikipedia.js             <-- Module orchestration & initialization
├── wikipedia_list_display.js          <-- Data fetching & row hydration
├── wikipedia_sidebar_handler.js       <-- Sidebar: weight, search terms, metadata, recalculate
├── wikipedia_ranking_calculator.js    <-- Real-time ranking & weight logic
├── dashboard_challenge.js             <-- Module orchestration & initialization
├── challenge_list_display.js          <-- Data fetching & row hydration
├── challenge_ranking_calculator.js    <-- Real-time score/rank logic
└── insert_challenge_response.js       <-- Response creation & challenge linking
```

### Frontend CSS Files
```text
css/4.0_ranked_lists/frontpage/
└── *.css                          <-- Public-facing ranked list styles
```

### Frontend JS Files
```text
js/4.0_ranked_lists/frontpage/
└── *.js                           <-- Public-facing ranked list logic
```

### Supporting Files
```text
backend/pipelines/
├── pipeline_wikipedia.py              <-- Fetches, ranks, inserts Wikipedia reference data
├── pipeline_popular_challenges.py     <-- Finds, analyzes and ranks popular public queries
└── pipeline_academic_challenges.py    <-- Finds, analyzes and ranks academic historical debates

frontend/pages/debate/
├── wikipedia.html         <-- Ranked Wikipedia view
├── popular_challenge.html <-- Ranked Challenge View with Response Inserted
└── academic_challenge.html<-- Ranked Challenge View with Response Inserted
```

---

## 5.0 Essays & Responses Module
The Essays & Responses module handles long-form editorial content, covering thematic context essays, historiography, and scholarly challenge responses. Its scope includes specialized HTML views for in-depth reading, a shared bibliography system, and the admin dashboard WYSIWYG editors for essay/historiography authoring and challenge response creation. This module publishes the shared `markdown_editor.js` tool consumed by Blog Posts and Challenge Response dashboards.

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_essay_historiography.html   <-- Split-pane editor with Essay/Historiography toggle
└── dashboard_challenge_response.html     <-- Split-pane response editor with Academic/Popular sidebar
```

### Dashboard CSS Files
```text
css/5.0_essays_responses/dashboard/
├── dashboard_essay_historiography.css    <-- Dual-state layout & toolbar
├── essay_WYSIWYG_editor.css             <-- Markdown input & live preview styling
├── dashboard_challenge_response.css     <-- Response editor layout & typography
└── response_markdown.css                <-- Markdown editor & live preview styling
```

### Dashboard JS Files
```text
js/5.0_essays_responses/dashboard/
├── dashboard_essay_historiography.js       <-- Dual-state toggle orchestrator
├── essay_historiography_data_display.js    <-- Content fetching & population
├── search_essays.js                        <-- Sidebar search: real-time title filtering
├── document_status_handler.js              <-- Save/Publish/Delete state management
├── dashboard_challenge_response.js         <-- Module orchestration & initialization
├── display_challenge_response_data.js      <-- Response fetching & field population
├── search_responses.js                     <-- Sidebar search: real-time title filtering
├── response_status_handler.js              <-- Save/Publish/Delete status logic
├── challenge_link_handler.js               <-- Parent challenge association logic
│
│   ── 🔑 Shared Tool (owned here, consumed by Blog Posts & Challenge Response) ──
│
└── markdown_editor.js                  <-- Core WYSIWYG markdown editing & live HTML preview
```

### Frontend CSS Files
```text
css/5.0_essays_responses/frontpage/
└── *.css                              <-- Public-facing essay/response styles
```

### Frontend JS Files
```text
js/5.0_essays_responses/frontpage/
└── *.js                               <-- Public-facing essay/response logic
```

### Supporting Files
```text
frontend/pages/
└── context_essay.html         <-- Context essay single essay view

frontend/pages/debate/
├── historiography.html    <-- Historiography essay
└── response.html          <-- Challenge response single view
```

---

## 6.0 News & Blog Module
The News & Blog module manages the end-to-end lifecycle of time-sensitive content, from automated news ingestion pipelines to public-facing feed pages. Its scope encompasses the Python crawling scripts, dedicated landing pages for news and blog updates, individual post views, and the admin dashboard interfaces for news source management and blog post WYSIWYG editing.

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_news_sources.html    <-- News source management with keyword sidebar & crawler trigger
└── dashboard_blog_posts.html      <-- Split-pane blog editor with Published/Drafts sidebar
```

### Dashboard CSS Files
```text
css/6.0_news_blog/dashboard/
├── news_sources_dashboard.css     <-- Pipeline control aesthetics & keyword sidebar
├── blog_posts_dashboard.css       <-- Navigator sidebar & editor layout
└── blog_WYSIWYG_editor.css        <-- Markdown editor canvas, toolbar, and live preview pane
```

### Dashboard JS Files
```text
js/6.0_news_blog/dashboard/
├── dashboard_news_sources.js          <-- Module orchestration & initialization
├── news_sources_handler.js            <-- Data fetching & row hydration
├── launch_news_crawler.js             <-- News crawler pipeline trigger
├── news_sources_sidebar_handler.js    <-- Sidebar: keywords, source URLs, crawler trigger
├── dashboard_blog_posts.js            <-- Module orchestration & initialization
├── display_blog_posts_data.js         <-- Blog post fetching & field population
└── blog_post_status_handler.js        <-- Save/Publish/Delete state logic
```

### Frontend CSS Files
```text
css/6.0_news_blog/frontpage/
└── *.css                          <-- Public-facing news/blog styles
```

### Frontend JS Files
```text
js/6.0_news_blog/frontpage/
└── *.js                           <-- Public-facing news/blog logic
```

### Supporting Files
```text
backend/pipelines/
└── pipeline_news.py                   <-- Crawls, ranks, inserts timeline news events

frontend/pages/
├── news_and_blog.html         <-- Combined News & Blog landing page
├── news.html                  <-- Full News feed page
├── blog.html                  <-- Full Blog feed page
└── blog_post.html             <-- Individual blog post page
```

---

## 7.0 System Module
The System module serves as the operational backbone of the site, encompassing AI-agent instructions, secure backend API management, the admin authentication gateway and dashboard shell, the system health monitoring dashboard, and production deployment automation. Its scope includes the secure two-page Admin Portal (login → dashboard shell with module card grid), Python-based authentication and security utilities, shared backend scripts (snippet generator, metadata generator, DeepSeek agent client), global configuration files, and the infrastructure required for VPS hosting and MCP server exposure.

### Dashboard HTML Files
```text
admin/frontend/
├── login.html                   <-- Authentication entry point (password → JWT cookie)
├── dashboard.html               <-- Main module grid orchestrator (3×3+1 card layout)
└── dashboard_system.html        <-- System health monitoring, agent activity, test execution
```

### Dashboard CSS Files
```text
css/7.0_system/
├── admin.css                                <-- Login page 'providence' styling
└── dashboard/
    ├── dashboard_universal_header.css       <-- Standardized header aesthetics
    └── dashboard_system.css                 <-- Log stream & gauge aesthetics
```

### Dashboard JS Files
```text
js/7.0_system/
├── admin.js                         <-- Login submission & error handling
└── dashboard/
    ├── dashboard_orchestrator.js        <-- Main app initialization & session check
    ├── load_middleware.js               <-- Session page guard: verifyAdminSession()
    ├── dashboard_app.js                 <-- Module router: loadModule(), _setGridColumns()
    ├── dashboard_universal_header.js    <-- Header injection & logout logic
    ├── display_dashboard_cards.js       <-- Module navigation card rendering
    ├── display_error_footer.js          <-- Universal status/error log stream UI
    ├── dashboard_system.js              <-- Module orchestration & initialization
    ├── display_system_data.js           <-- Real-time status polling & health card rendering
    ├── agent_monitor.js                 <-- Agent run log polling, activity table & trace reasoning
    ├── test_execution_logic.js          <-- Test suite execution & log piping
    ├── agent_generation_controls.js     <-- Agent generation & document management triggers
    └── mcp_monitor.js                   <-- MCP server status polling & error stream rendering

js/admin_core/
└── error_handler.js                 <-- Shared error routing API consumed by ALL dashboard modules
```

### Backend Scripts
```text
backend/scripts/
├── snippet_generator.py          <-- Shared utility: DeepSeek-powered archival abstract generation
├── metadata_generator.py         <-- Shared utility: DeepSeek-powered SEO/Keyword extraction
└── agent_client.py               <-- Shared utility: DeepSeek API client for web-search, snippets, metadata
```

### Supporting Files
```text
admin/backend/
├── admin_api.py               <-- Central API: CRUD endpoints, agent run/logs, health, MCP proxy
└── auth_utils.py              <-- JWT generation, session verification, brute-force defense

.agent/                  <-- Agent instructions & workflows

assets/
└── ai-instructions.txt  <-- Specialized guidance for LLM crawlers

README.md                <-- Project overview

mcp_server.py            <-- Exposes read-only API to external agents
requirements.txt         <-- Python dependencies (FastAPI, JWT, etc)
nginx.conf               <-- Global Web server and SSL/Proxy config
.gitignore               <-- Ensures secrets (like .env) aren't committed to GitHub
LICENCE                  <-- Open Use Licencing with attribution requirement

assets/
├── favicon.png          <-- Website favicon
└── *.png                <-- Raw source images and portraits

deployment/
├── deploy.sh            <-- Pull from GitHub and restart services
├── ssl_renew.sh         <-- Automates SSL certificate renewal
├── admin.service        <-- Systemd config for Admin API
└── mcp.service          <-- Systemd config for MCP Server

.env                     <-- Global Admin, ESV and Deepseek credentials

backend/middleware/
├── rate_limiter.py      <-- DDoS protection for API endpoints
└── logger_setup.py      <-- Centralized logging configuration

documentation/guides/
└── guide_security.md    <-- Security protocols and auth mechanism overview
```

---

## 8.0 Setup & Testing Module
The Setup & Testing Module supports the development lifecycle through automated test suites, database seeding tools, and comprehensive architectural documentation. Its scope covers root-level build scripts, local environment initialization tools, security audit utilities, and the complete library of guides and sitemaps that define the project's logic and aesthetics.

### Supporting Files
```text
build.py                   <-- Root script to trigger backend pipelines
tools/
├── db_seeder.py           <-- Logic to populate the SQLite database
├── seed_data.sql          <-- Initial data payload for first build
├── minify_admin.py        <-- Automates admin code obfuscation
├── generate_sitemap.py    <-- Dynamic XML sitemap builder
└── test_records.sql       <-- Small sample dataset for test runs

logs/                      <-- Storage for pipeline and API error logs

tests/
├── port_test.py               <-- Verifies all local ports are responding
├── security_audit.py          <-- Runs automated vulnerability scans
├── agent_readability_test.py  <-- Simulates AI "headless" crawl
├── browser_test_skill.md      <-- Instructions for Agents to run browser tests
└── reports/                   <-- Output directory for UI/UX audit logs

documentation/
├── implementation_plan.md                  <-- Implementation Plan
├── master_dashboard_refactor_roadmap.md    <-- Roadmap for full dashboard refactor
├── plan_backend_infrastructure.md          <-- Plan: Backend Infrastructure & Shared Scripts
├── plan_dashboard_login_and_shell.md       <-- Plan: Admin Login & Dashboard Shell
├── plan_dashboard_records_all.md           <-- Plan: All Records Module
├── plan_dashboard_records_single.md        <-- Plan: Single Record Module
├── plan_dashboard_arbor.md                 <-- Plan: Arbor Diagram Module
├── plan_dashboard_wikipedia.md             <-- Plan: Wikipedia Ranked List Module
├── plan_dashboard_challenge.md             <-- Plan: Challenge Ranked List Module
├── plan_dashboard_challenge_response.md    <-- Plan: Challenge Response Module
├── plan_dashboard_essay_historiography.md  <-- Plan: Essay & Historiography Module
├── plan_dashboard_news_sources.md          <-- Plan: News Sources Module
├── plan_dashboard_blog_posts.md            <-- Plan: Blog Posts Module
├── plan_dashboard_system.md                <-- Plan: System Health Module
├── plan_issues.md                          <-- Cross-plan issue tracker
├── module_sitemap.md                       <-- Architectural blueprints (This File)
├── site_map.md                             <-- Consolidated master site map
├── vibe_coding_rules.md                    <-- Foundational coding philosophies
├── style_guide.md                          <-- UI / UX visual design guide
├── data_schema.md                          <-- Core SQLite database blueprint
└── guides/
    ├── guide_appearance.md                 <-- ASCII diagram of page appearance
    ├── guide_dashboard_appearance.md       <-- ASCII diagram of dashboard appearance
    ├── guide_donations.md                  <-- Reference for external integrations
    ├── guide_function.md                   <-- Detailed explanation of system logic
    ├── guide_security.md                   <-- Security protocols and auth overview
    ├── guide_style.md                      <-- UI / UX visual design guide
    └── guide_welcoming_robots.md           <-- SEO and AI accessibility standards
```

---

## Shared-Tool Ownership Registry

> 🔑 Shared dashboard JS tools are authored in one module and consumed by others via `<script>` tag inclusion. Consumer modules MUST NOT create local copies. See `vibe_coding_rules.md` §7.

| Shared Tool | Owner Module | Consumer Modules |
|---|---|---|
| `js/2.0_records/dashboard/picture_handler.js` | 2.0 Records | 5.0 Essays, 5.0 Challenge Response, 6.0 Blog Posts |
| `js/2.0_records/dashboard/mla_source_handler.js` | 2.0 Records | 5.0 Essays, 5.0 Challenge Response, 6.0 Blog Posts |
| `js/2.0_records/dashboard/context_link_handler.js` | 2.0 Records | 5.0 Essays, 6.0 Blog Posts |
| `js/2.0_records/dashboard/snippet_generator.js` | 2.0 Records | 5.0 Essays, 5.0 Challenge Response, 6.0 Blog Posts, 6.0 News Sources |
| `js/2.0_records/dashboard/metadata_handler.js` | 2.0 Records | 4.0 Wikipedia, 4.0 Challenges, 5.0 Essays, 5.0 Challenge Response, 6.0 Blog Posts, 6.0 News Sources |
| `js/2.0_records/dashboard/description_editor.js` | 2.0 Records | 5.0 Essays, 5.0 Challenge Response, 6.0 Blog Posts |
| `js/2.0_records/dashboard/verse_builder.js` | 2.0 Records | (available for future plans) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | 5.0 Essays & Responses | 5.0 Challenge Response, 6.0 Blog Posts |

---

## API Route Registry

> Canonical reference for admin API routes. Routes are implemented in `admin/backend/admin_api.py` (plan: `plan_backend_infrastructure`).

### Authentication
| Method | Path | Purpose |
|:---|:---|:---|
| `POST` | `/api/admin/login` | Admin authentication (JWT cookie) |
| `POST` | `/api/admin/logout` | Session termination |
| `GET` | `/api/admin/verify` | Session validation |

### Records CRUD
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/records` | List all records (paginated, filterable) |
| `GET` | `/api/admin/records/{id}` | Get single record by ID |
| `POST` | `/api/admin/records` | Create new record |
| `PUT` | `/api/admin/records/{id}` | Update record fields |
| `DELETE` | `/api/admin/records/{id}` | Delete record |
| `POST` | `/api/admin/records/{id}/picture` | Upload record picture (PNG) |
| `DELETE` | `/api/admin/records/{id}/picture` | Delete record picture |
| `POST` | `/api/admin/bulk-upload` | CSV bulk record ingestion |

### Ranked Lists
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/lists/{name}` | Get ranked list entries |
| `PUT` | `/api/admin/lists/{name}` | Replace ranked list |

### Arbor Diagram
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/diagram/tree` | Get flat node list for Arbor tree |
| `PUT` | `/api/admin/diagram/tree` | Batch-update parent_id relationships |

### Essays, Historiography & Blog
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/essays` | List all essay records |
| `GET` | `/api/admin/historiography` | Get single historiography record |
| `GET` | `/api/admin/blogposts` | List all blog post records |
| `DELETE` | `/api/admin/records/{id}/blogpost` | Remove blog post content from record |

### News
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/news/items` | List all news item records |
| `POST` | `/api/admin/news/crawl` | Trigger pipeline_news.py crawler |

### Challenge Responses
| Method | Path | Purpose |
|:---|:---|:---|
| `POST` | `/api/admin/responses` | Create draft response linked to parent challenge |
| `GET` | `/api/admin/responses` | List all challenge responses |
| `GET` | `/api/admin/responses/{id}` | Get single response by ID |

### Shared Tool Triggers
| Method | Path | Purpose |
|:---|:---|:---|
| `POST` | `/api/admin/snippet/generate` | Trigger snippet_generator.py (DeepSeek) |
| `POST` | `/api/admin/metadata/generate` | Trigger metadata_generator.py (DeepSeek) |

### System & Agent
| Method | Path | Purpose |
|:---|:---|:---|
| `GET` | `/api/admin/system/config` | Read system_config key/value pairs |
| `PUT` | `/api/admin/system/config` | Upsert system_config key/value pairs |
| `GET` | `/api/admin/health_check` | System health + DeepSeek API status + VPS resources |
| `GET` | `/api/admin/mcp/health` | MCP server status (tools, errors, uptime) |
| `POST` | `/api/admin/agent/run` | Trigger DeepSeek agent pipeline |
| `GET` | `/api/admin/agent/logs` | Paginated agent run history |
