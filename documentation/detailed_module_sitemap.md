---
name: module_sitemap.md
version: 2.12.0
purpose: visual and list taxonomy of codebase — canonical source of truth for all files
dependencies: [site_map.md, high_level_schema.md]
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
|   (polymorphic single-table: type-discriminated records +         |
|    relations + external references + ranks + config)              |
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

> **Invisible SEO header:** Every public page includes a `<header id="invisible-header" aria-hidden="true">` anchor in the page shell. The `header.js` script reads `data-page-title`, `data-page-description`, `data-page-canonical`, and other `data-*` attributes from `<body>` and injects `<title>`, `<meta>`, Open Graph, Twitter Card, and robots tags into `<head>`.

### CSS Files
```text
css/1.0_foundation/
├── typography.css             <-- 🔑 Canonical Design Tokens: colors, fonts, spacing, shadows, radii
├── grid.css                   <-- Master grid & structural layout (page shell, breakpoints)
├── shell.css                  <-- Page shell base styles
├── sidebar.css                <-- Sidebar component styles (nav, brand, mobile overlay)
├── footer.css                 <-- Footer component styles (action buttons, legal strip)
├── landing.css                <-- Landing page layout (hero, category card grid)
├── pictures.css               <-- Framed picture display styles (record views)
├── thumbnails.css             <-- Thumbnail image styles
├── dashboard/
│   ├── admin_components.css   <-- Providence grid, dividers, column width hooks (shared dashboard shell)
│   └── admin_shell.css        <-- Dashboard chrome, header, canvas background
└── frontend/
    ├── buttons.css             <-- Public-facing button system
    └── forms.css               <-- Public-facing form styles
```

### JS Files
```text
js/1.0_foundation/
├── frontend/
│   ├── footer.js              <-- Footer injection & print logic
│   ├── header.js              <-- SEO metadata & og:tags injection
│   ├── initializer.js         <-- Central bootstrapper on DOMContentLoaded
│   ├── search_header.js       <-- Visible search bar injection
│   └── sidebar.js             <-- Left nav tree + admin entry
└── dashboard/
    (reserved for future dashboard shell scripts)
```

### Supporting Files
```text
robots.txt                     <-- Manual for well-behaved bots
sitemap.xml                    <-- Index of content for crawlers
assets/favicon.png             <-- Website Favicon Branding (Aleph + Omega)
```

---

## 2.0 Records Module
The Records module manages the core data lifecycle, from SQLite schema definition (polymorphic single-table design with `type`/`sub_type` discriminators — see `high_level_schema.md`) and Python-based ingestion pipelines to the dynamic rendering of individual records and aggregate lists. Its scope includes the primary database files, secure external API connection utilities, a comprehensive suite of front-end pages for deep-dive exploration, and the admin dashboard interfaces for single-record editing and bulk record management. This module also publishes seven shared dashboard JS tools consumed by other dashboard modules.

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
├── papaparse.min.js                  <-- Papa Parse v5.4.1 — RFC 4180 CSV parser (vendored)
├── bulk_csv_upload_handler.js        <-- Phase 1: CSV parsing & client-side validation (uses Papa Parse)
├── bulk_upload_review_handler.js     <-- Phase 2: Ephemeral review, Save as Draft / Discard
├── search_records.js                 <-- Real-time client-side search (title, verse, snippet)
├── display_single_record_data.js     <-- Record fetching & full form hydration (all fields)
├── record_status_handler.js          <-- Save Draft, Publish & Delete status management
├── taxonomy_selector.js              <-- Selectors for era, timeline, gospel_category fields
├── map_fields_handler.js             <-- Selector for map_label + integer input for geo_id
├── parent_selector.js                <-- ULID input for parent_id with validation
├── url_array_editor.js               <-- Label/URL pair array editor
├── snippet_generator.js              <-- 🔑 Shared Tool: Automated snippet trigger (calls API → DeepSeek)
│
├── description_editor.js         <-- Dynamic paragraph array editor (description + snippet)
└── verse_builder.js              <-- Structured book/chapter/verse chip UI
```

### Frontend CSS Files
```text
css/2.0_records/frontend/
└── *.css                      <-- Public-facing record display styles
```

### Frontend JS Files
```text
js/2.0_records/frontend/
├── display_snippet.js         <-- JSON Array paragraph snippet renderer (handles schema JSON format)
├── json_ld_builder.js         <-- Structured SEO data builder
├── list_view.js               <-- Record list rendering (type/status filtered via setup_db.js)
├── pictures_display.js        <-- Picture display handler
├── sanitize_query.js          <-- SQL query sanitizer
├── setup_db.js                <-- WASM SQLite initializer (queries type='record', status='published')
├── single_view.js             <-- Full-field record rendering (all schema columns including era, timeline, map_label, gospel_category, geo_id, iaa, pledius, manuscript, page_views, url, context_links)
├── sql-wasm.js                <-- SQLite WASM engine
├── sql-wasm.wasm              <-- SQLite WASM binary
└── thumbnails_display.js      <-- Thumbnail rendering
```

### Supporting Files
```text
database/
├── database.sql                           <-- The blueprint schema (polymorphic single-table, v2.0.0)
└── database.sqlite                        <-- The COMPILED actual database file

Schema documentation:
├── documentation/high_level_schema.md     <-- Polymorphic data model (type/sub_type discriminators, layered architecture)
└── documentation/data_schema.md           <-- Flat field inventory (column-level spec — includes source_url, keywords columns for news_source sub-type)

backend/scripts/
├── helper_api.py                      <-- Shared logic for secure external API connection calls
└── slug_generator.py                  <-- Shared utility: DeepSeek-powered URL-slug generation

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
css/3.0_visualizations/frontend/
├── ardor.css                  <-- Interactive SVG evidence graph
├── maps.css                   <-- Map display styles
└── timeline.css               <-- Timeline display styles
```

### Frontend JS Files
```text
js/3.0_visualizations/frontend/
├── ardor_display.js           <-- SVG evidence diagram (static mock-up)
├── maps_display.js            <-- Interactive map rendering
└── timeline_display.js        <-- Timeline rendering (filters type='record', status='published'; Prophecy lane removed; era-based lane assignment)
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
The Ranked Lists module processes and prioritizes external Wikipedia data and historical challenges using discrete weighting multipliers to surface high-value evidence. Its scope includes the backend Python pipelines for automated ranking, the public-facing debate pages, and the admin dashboard interfaces for Wikipedia list management and Challenge ranking with integrated response insertion (Version 2.6.0).

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_wikipedia.html       <-- Wikipedia list management container
├── dashboard_challenge_academic.html <-- Academic-only challenge list management container
├── dashboard_challenge_popular.html  <-- Popular-only challenge list management container
└── dashboard_challenge_response.html <-- Challenge Response WYSIWYG editor shell
```

### Dashboard CSS Files
```text
css/4.0_ranked_lists/dashboard/
├── dashboard_wikipedia.css        <-- Sidebar controls & list aesthetics
└── dashboard_challenge.css        <-- Dual-pane layout & weighting sidebar (shared by Academic and Popular pages)
```

### Dashboard JS Files
```text
js/4.0_ranked_lists/dashboard/
├── dashboard_wikipedia.js             <-- Module orchestration & initialization
├── wikipedia_list_display.js          <-- Data fetching & row hydration
├── wikipedia_sidebar_handler.js       <-- Sidebar: delegate to weights/search terms
├── wikipedia_weights.js               <-- Wikipedia Weight editor (multi-weight)
├── wikipedia_search_terms.js           <-- Wikipedia Search Terms editor (overview + textarea)
├── wikipedia_ranking_calculator.js    <-- Real-time ranking & multi-weight logic
├── dashboard_challenge_academic.js     <-- Academic module orchestration & initialization
├── dashboard_challenge_popular.js      <-- Popular module orchestration & initialization
├── challenge_list_display.js          <-- Data fetching & row hydration
├── challenge_weighting_handler.js     <-- Weight/rank sidebar for Academic/Popular
├── challenge_ranking_calculator.js    <-- Real-time score/rank logic
├── academic_challenge_search_terms.js  <-- Sidebar: Academic search terms overview
├── popular_challenge_search_terms.js   <-- Sidebar: Popular search terms overview
├── academic_challenge_ranking_weights.js <-- Sidebar: Academic weighting factors
├── popular_challenge_ranking_weights.js  <-- Sidebar: Popular weighting factors
├── dashboard_challenge_response.js    <-- Challenge Response module orchestrator
├── challenge_response_list_display.js <-- Sidebar response list display
├── challenge_response_load_content.js <-- Single response content loader
├── challenge_response_status_handler.js <-- Save/Publish/Delete handler
└── insert_challenge_response.js       <-- Response creation & challenge linking

```

### Frontend CSS Files
```text
css/4.0_ranked_lists/frontend/
└── *.css                          <-- Public-facing ranked list styles
```

### Frontend JS Files
```text
js/4.0_ranked_lists/frontend/
├── list_view_academic_challenges.js               <-- Academic challenges ranked list (live API fetch, type='challenge_academic' discriminator, sub_type grouping, weight score computation)
├── list_view_academic_challenges_with_response.js <-- Academic challenges with response sub-cards (challenge_id FK linking)
├── list_view_popular_challenges.js                <-- Popular challenges ranked list (live API fetch, type='challenge_popular' discriminator, identical pattern to academic)
├── list_view_popular_challenges_with_response.js  <-- Popular challenges with response sub-cards
└── list_view_wikipedia.js                         <-- Wikipedia ranked list (live API fetch, type='wikipedia_entry' discriminator, sub_type grouping)
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
The Essays & Responses module handles long-form editorial content, covering thematic context essays, historiography, theological essays, spiritual articles, and scholarly challenge responses. Its scope includes specialized HTML views for in-depth reading, a shared bibliography system, and the admin dashboard WYSIWYG editors for essays, historiography, and challenge response creation. This module publishes the shared `markdown_editor.js` tool consumed by Blog Posts and Challenge Response dashboards.

### Dashboard HTML Files
```text
admin/frontend/
├── dashboard_essay.html              <-- Split-pane editor for essays (context, theological, spiritual)
└── dashboard_historiography.html     <-- Split-pane editor for the historiography essay
```

### Dashboard CSS Files
```text
css/5.0_essays_responses/dashboard/
└── (styles migrated to css/9.0_cross_cutting/dashboard/)
```

### Dashboard JS Files
```text
js/5.0_essays_responses/dashboard/
├── dashboard_essay.js                      <-- Essay-only orchestrator (fixed mode, no toggle)
├── dashboard_historiography.js             <-- Historiography-only orchestrator (fixed mode, no toggle)
├── essay_historiography_list_display.js    <-- Sidebar list population (split from data_display)
├── essay_historiography_load_content.js    <-- Editor content loading (split from data_display)
├── search_essays.js                        <-- Sidebar search: real-time title filtering (shared)
├── document_status_handler.js              <-- Save/Publish/Delete state management (shared)
│
│   ── 🔑 Shared Tool (owned here, consumed by Blog Posts & elsewhere) ──
│
└── markdown_editor.js                  <-- Core WYSIWYG markdown editing & live HTML preview
```

### Frontend CSS Files
```text
css/5.0_essays_responses/frontend/
├── essays.css                        <-- Public-facing essay typography
└── responses.css                     <-- Public-facing response typography
```

### Frontend JS Files
```text
js/5.0_essays_responses/frontend/
├── view_context_essays.js            <-- Context essay single-view (live API fetch, type/status filter, markdown→HTML converter, essay-* BEM rendering, TOC generation, bibliography + picture dispatch)
├── view_historiography.js            <-- Historiography singleton (live API fetch, slug='historiography', identical render pattern to context essays)
├── response_display.js               <-- Challenge response display (live API fetch, body field as primary markdown content, bibliography + context_links rendering, challenge_id parent link)
├── list_view_responses.js            <-- Response list rendering (live API fetch, type='challenge_response' discriminator)
├── mla_snippet_display.js            <-- MLA citation display
└── sources_biblio_display.js         <-- Source bibliography rendering
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
└── news_sources_dashboard.css     <-- Pipeline control aesthetics & keyword sidebar
```

### Dashboard JS Files
```text
js/6.0_news_blog/dashboard/
├── dashboard_news_sources.js          <-- Module orchestration & initialization
├── news_sources_handler.js            <-- Data fetching & row hydration
├── launch_news_crawler.js             <-- News crawler pipeline trigger
├── news_sources_sidebar_handler.js    <-- Sidebar: keywords, source URLs, crawler trigger
├── dashboard_blog_posts.js            <-- Module orchestration & initialization
├── blog_posts_list_display.js         <-- Sidebar list population (split from display_blog_posts_data)
├── blog_posts_load_content.js         <-- Editor content loading (split from display_blog_posts_data)
└── blog_post_status_handler.js        <-- Save/Publish/Delete state logic
```

### Frontend CSS Files
```text
css/6.0_news_blog/frontend/
├── blog.css                    <-- Public blog feed and single post styles (blog-* BEM namespace, replaces legacy essay-* cross-references)
└── news_blog_landing.css       <-- Side-by-side landing page layout & shared thumbnail styles
```

### Frontend JS Files
```text
js/6.0_news_blog/frontend/
├── blog_snippet_display.js        <-- Blog snippet on landing page (API fetch, type/status filter)
├── display_blogpost.js            <-- Single blog post display (API fetch, blog-* BEM classes, body markdown→HTML, 17 schema fields including iaa/pledius/manuscript/url/page_views)
├── list_blogpost.js               <-- Full blog feed list (API fetch, type='blog_post' & status='published' filter)
├── list_newsitem.js               <-- News feed list (API fetch, type='news_article' & status='published' filter, schema-prefixed columns: news_item_title, news_item_link, last_crawled)
└── news_snippet_display.js        <-- News snippet on landing page (API fetch, top 5, schema-prefixed columns)
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
    ├── dashboard_app.js                 <-- Module router: loadModule(), _setLayoutColumns()
    ├── dashboard_sidebar_resize.js      <-- Sidebar drag resize utility: initSidebarResize()
    ├── dashboard_sidebar_resize_init.js <-- Init wrapper: patches _setLayoutColumns for resize
    ├── dashboard_universal_header.js    <-- Header injection & logout logic
    ├── display_dashboard_cards.js       <-- Module navigation card rendering
    ├── display_error_footer.js          <-- Universal status/error log stream UI
    ├── dashboard_system.js              <-- Module orchestration & initialization
    ├── display_system_data.js           <-- Real-time status polling & health card rendering
    ├── agent_monitor.js                 <-- Agent run log polling, activity table & trace reasoning
    ├── test_execution_logic.js          <-- Test suite execution & log piping
    ├── agent_generation_controls.js     <-- Agent generation & document management triggers
    ├── gather_trigger.js                <-- Shared tool: Gather button trigger with polling & dedup
    ├── field_persistence.js             <-- Shared tool: sessionStorage-based field persistence
    └── mcp_monitor.js                   <-- MCP server status polling & error stream rendering

js/admin_core/
└── error_handler.js                 <-- Shared error routing API consumed by ALL dashboard modules
```

### Backend Scripts
```text
backend/scripts/
├── snippet_generator.py          <-- Shared utility: DeepSeek-powered archival abstract generation
├── metadata_generator.py         <-- Shared utility: DeepSeek-powered SEO/Keyword extraction
├── slug_generator.py             <-- Shared utility: DeepSeek-powered URL-slug generation
└── agent_client.py               <-- Shared utility: DeepSeek API client for web-search, snippets, metadata
```

### Supporting Files
```text
admin/backend/
├── routes/
│   ├── __init__.py            <-- App factory: create_app() registers all routers
│   ├── shared.py              <-- Shared DB helpers, models, auth dependency, logger
│   ├── auth.py                <-- Login, logout, session verification (~70 lines)
│   ├── records.py             <-- Record CRUD + picture upload/delete (~330 lines)
│   ├── lists.py               <-- Resource list management (~90 lines)
│   ├── diagram.py             <-- Diagram tree parent_id editor (~120 lines)
│   ├── bulk.py                <-- CSV bulk upload phases 1 & 2 (~385 lines)
│   ├── system.py              <-- Config, health, MCP proxy, tests, restart (~410 lines)
│   ├── essays.py              <-- Essay listing, historiography, snippet/metadata triggers (~140 lines)
│   ├── news.py                <-- Blog posts, news items, crawl trigger (~135 lines)
│   ├── responses.py           <-- Challenge response CRUD (~165 lines)
│   └── agents.py              <-- Agent run trigger + log retrieval (~200 lines)
├── auth_utils.py              <-- JWT generation, session verification, brute-force defense
└── .env                       <-- Admin credentials (secret)

.agent/                  <-- Agent instructions & workflows

assets/
└── ai-instructions.txt  <-- Specialized guidance for LLM crawlers

README.md                <-- Project overview

mcp_server.py            <-- Exposes read-only API to external agents
serve_all.py             <-- Main FastAPI app: combines admin API, public routes, static serving
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
├── admin.service               <-- Systemd config for Admin API
├── mcp.service                 <-- Systemd config for MCP Server
└── thejesuswebsite.service     <-- Systemd config for main FastAPI server (serve_all.py)

.env                     <-- Global Admin, ESV and Deepseek credentials

backend/middleware/
├── rate_limiter.py      <-- DDoS protection for API endpoints
└── logger_setup.py      <-- Centralized logging configuration

documentation/
├── high_level_schema.md      <-- Polymorphic data model architecture
├── data_schema.md           <-- Core SQLite database blueprint
├── vibe_coding_rules.md     <-- Foundational coding philosophies
├── site_map.md              <-- Consolidated master site map
├── detailed_module_sitemap.md <-- Architectural blueprints (this file)
└── guides/
    ├── guide_security.md           <-- Security protocols and auth overview
    ├── guide_function.md           <-- Detailed system logic flows
    ├── guide_appearance.md         <-- Page appearance diagrams
    ├── guide_dashboard_appearance.md <-- Dashboard appearance
    └── ... (see §8.0 for full listing)
```

### MCP Server (Model Context Protocol)
```text
mcp_server.py                    <-- Read-only FastMCP server for external agent DB access

deployment/
└── mcp.service                  <-- Systemd service config (port 8001, SSE transport)

js/7.0_system/dashboard/
└── mcp_monitor.js               <-- Dashboard monitor: MCP status polling & error stream
```
> **Purpose:** Exposes the SQLite archive as a read-only resource to external AI agents (Claude, DeepSeek, etc.) via the Model Context Protocol. Runs as a standalone FastMCP server with Server-Sent Events transport, managed independently from the main web server.

---

## 8.0 Setup & Testing Module
The Setup & Testing Module supports the development lifecycle through automated test suites, database seeding tools, and comprehensive architectural documentation. Its scope covers root-level build scripts, local environment initialization tools, security audit utilities, and the complete library of guides and sitemaps that define the project's logic and aesthetics.

### Supporting Files
```text
build.py                   <-- Root script to trigger backend pipelines
tools/
├── minify_admin.py        <-- Automates admin code obfuscation
├── generate_sitemap.py    <-- Dynamic XML sitemap builder
└── migrate_schema.py      <-- Database schema migration utility

logs/                      <-- Storage for pipeline and API error logs

tests/
├── port_test.py               <-- Verifies all local ports are responding
├── security_audit.py          <-- Runs automated vulnerability scans
├── agent_readability_test.py  <-- Simulates AI "headless" crawl
├── browser_test_skill.md      <-- Instructions for Agents to run browser tests
└── reports/                   <-- Output directory for UI/UX audit logs

documentation/
├── high_level_schema.md                    <-- Polymorphic data model architecture
├── data_schema.md                          <-- Core SQLite database blueprint
├── detailed_module_sitemap.md              <-- Architectural blueprints (This File)
├── git_vps.md                              <-- VPS deployment & Git workflow reference
├── simple_module_sitemap.md                <-- Lightweight module overview
├── site_map.md                             <-- Consolidated master site map
├── style_mockup.html                       <-- Visual style mockup prototype
├── vibe_coding_rules.md                    <-- Foundational coding philosophies
└── guides/
    ├── guide_appearance.md                 <-- ASCII diagram of page appearance
    ├── guide_dashboard_appearance.md       <-- ASCII diagram of dashboard appearance
    ├── guide_donations.md                  <-- Reference for external integrations
    ├── guide_function.md                   <-- Detailed explanation of system logic
    ├── guide_maps.md                       <-- Map module layout & interaction
    ├── guide_security.md                   <-- Security protocols and auth overview
    ├── guide_style.md                      <-- UI / UX visual design guide
    ├── guide_timeline.md                   <-- Timeline module layout & interaction
    └── guide_welcoming_robots.md           <-- SEO and AI accessibility standards

Implementation plans are stored at the **project root** as standalone `.md` files:
```text
plan_backend_infrastructure.md        <-- Plan: Backend Infrastructure & Shared Scripts
plan_dashboard_login_and_shell.md     <-- Plan: Admin Login & Dashboard Shell
plan_dashboard_records_all.md         <-- Plan: All Records Module
plan_dashboard_records_single.md      <-- Plan: Single Record Module
plan_dashboard_arbor.md               <-- Plan: Arbor Diagram Module
plan_dashboard_wikipedia.md           <-- Plan: Wikipedia Ranked List Module
plan_dashboard_challenge.md           <-- Plan: Challenge Ranked List Module
plan_dashboard_challenge_response.md  <-- Plan: Challenge Response Module
plan_dashboard_essay_historiography.md <-- Plan: Essay & Historiography Module
plan_dashboard_news_sources.md        <-- Plan: News Sources Module
plan_dashboard_blog_posts.md          <-- Plan: Blog Posts Module
plan_dashboard_system.md              <-- Plan: System Health Module
plan_issues.md                        <-- Cross-plan issue tracker
plan_system_api_endpoints.md          <-- Plan: API endpoint design
```
```

---

## 9.0 Cross-Cutting Standardization
The Cross-Cutting Standardization module houses shared dashboard assets that span multiple content modules. Its scope covers unified WYSIWYG editor styles, standardized dashboard layout CSS that replaces module-specific layout files across §4.0–§6.0, and the Challenge Response dashboard module that bridges Ranked Lists (§4.0) and Essays & Responses (§5.0).

### Dashboard CSS Files
```text
css/9.0_cross_cutting/dashboard/
├── wysiwyg_editor.css             <-- Unified WYSIWYG editor styles (toolbar, split panes, live preview)
├── wysiwyg_dashboard_layout.css   <-- Unified dashboard layout (function bar, sidebar, split-pane grid)
├── metadata_widget.css            <-- 🔑 Shared Tool: unified slug/snippet/metadata widget styles (BEM)
├── picture_widget.css             <-- 🔑 Shared Tool: picture preview and thumbnail styles (BEM)
├── mla_widget.css                 <-- 🔑 Shared Tool: MLA bibliography editor styles (BEM)
└── context_links_widget.css       <-- 🔑 Shared Tool: context links editor styles (BEM)
```

### Dashboard JS Files
```text
js/9.0_cross_cutting/dashboard/
├── metadata_widget.js             <-- 🔑 Shared Tool: unified slug/snippet/metadata widget with Generate All
├── mla_source_handler.js          <-- 🔑 Shared Tool: Structured MLA bibliography management
├── external_refs_handler.js       <-- 🔑 Shared Tool: Text inputs for iaa, pledius, manuscript
├── context_link_handler.js        <-- 🔑 Shared Tool: Database relationship links
└── picture_handler.js             <-- 🔑 Shared Tool: Image upload, preview & thumbnail
```

### Frontend JS Files
```text
js/9.0_cross_cutting/frontend/
└── html_utils.js                  <-- 🔑 Shared Tool: escapeHtml, formatDateLong
```

---

## Shared-Tool Ownership Registry

> 🔑 Shared dashboard JS tools are authored in one module and consumed by others via `<script>` tag inclusion. Consumer modules MUST NOT create local copies. See `vibe_coding_rules.md` §7.

| Shared Tool | Owner Module | Consumer Modules |
|---|---|---|
| `js/9.0_cross_cutting/dashboard/picture_handler.js` | 9.0 Cross-Cutting | 5.0 Essays, 6.0 Blog Posts, 4.0 Challenge Response |
| `js/9.0_cross_cutting/dashboard/mla_source_handler.js` | 9.0 Cross-Cutting | 5.0 Essays, 6.0 Blog Posts, 4.0 Challenge Response — three editable tables (Books, Articles, Websites) |
| `js/9.0_cross_cutting/dashboard/context_link_handler.js` | 9.0 Cross-Cutting | 5.0 Essays, 6.0 Blog Posts — editable table (Slug, Type, Remove) |
| `js/9.0_cross_cutting/dashboard/external_refs_handler.js` | 9.0 Cross-Cutting | 2.0 Records, 4.0 Challenge Response, 5.0 Essays, 6.0 Blog Posts — two-column editable table (Identifier Type | Value) |
| `js/9.0_cross_cutting/dashboard/metadata_widget.js` | 9.0 Cross-Cutting | 4.0 Wikipedia, 4.0 Challenges, 5.0 Essays, 6.0 Blog Posts, 6.0 News Sources |
| `css/9.0_cross_cutting/dashboard/metadata_widget.css` | 9.0 Cross-Cutting | 4.0 Wikipedia, 4.0 Challenges, 5.0 Essays, 6.0 Blog Posts, 6.0 News Sources |
| `css/9.0_cross_cutting/dashboard/picture_widget.css` | 9.0 Cross-Cutting | 2.0 Records, 5.0 Essays, 6.0 Blog Posts, 4.0 Challenge Response |
| `css/9.0_cross_cutting/dashboard/mla_widget.css` | 9.0 Cross-Cutting | 2.0 Records, 5.0 Essays, 6.0 Blog Posts, 4.0 Challenge Response |
| `css/9.0_cross_cutting/dashboard/context_links_widget.css` | 9.0 Cross-Cutting | 2.0 Records, 5.0 Essays, 6.0 Blog Posts |
| `css/9.0_cross_cutting/dashboard/external_refs_widget.css` | 9.0 Cross-Cutting | 2.0 Records, 4.0 Challenge Response, 5.0 Essays, 6.0 Blog Posts |
| `js/2.0_records/dashboard/snippet_generator.js` | 2.0 Records | 5.0 Essays, 6.0 Blog Posts, 6.0 News Sources |
| `js/2.0_records/dashboard/description_editor.js` | 2.0 Records | 5.0 Essays, 6.0 Blog Posts |
| `js/2.0_records/dashboard/verse_builder.js` | 2.0 Records | (available for future plans) |
| `js/5.0_essays_responses/dashboard/markdown_editor.js` | 5.0 Essays & Responses | 6.0 Blog Posts |
| `js/9.0_cross_cutting/frontend/html_utils.js` | 9.0 Cross-Cutting (plan: `resolve_outstanding_issues`) | 4.0 Ranked Lists frontend, 5.0 Essays & Responses frontend, 6.0 News & Blog frontend |

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
| `POST` | `/api/admin/bulk-upload` | Phase 1: CSV bulk record ingestion (parse & validate) |
| `POST` | `/api/admin/bulk-upload/commit` | Phase 2: commit reviewed records as draft |

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
| `POST` | `/api/admin/tests/run` | Spawn test suites (port, security, agent readability) via subprocess |
| `POST` | `/api/admin/docs/open` | Stub — documentation editor (future plan) |
| `POST` | `/api/admin/agents/generate` | Stub — agent generation workflow (future plan) |
| `POST` | `/api/admin/services/restart` | Restart admin.service systemd unit |
