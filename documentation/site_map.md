---
name: site_map.md
version 1.0.71
purpose: A consolidated master site map of all folders and files for the codebase
dependencies: [detailed_module_sitemap.md, data_schema.md, guides/]
---

# Master Site Map

```text
├── .agent/                    <-- Agent instructions & workflows
├── .env                       <-- Global Admin, ESV and Deepseek credentials
├── .gitignore                 <-- Ensures secrets (like .env) aren't committed to GitHub
├── Implementation plans are stored at the **project root** as standalone `.md` files:
├── LICENCE                    <-- Open Use Licencing with attribution requirement
├── README.md                  <-- Project overview
├── Schema documentation:
│   ├── documentation/data_schema.md <-- Flat field inventory (column-level spec — includes source_url, keywords columns for news_source sub-type)
│   └── documentation/high_level_schema.md <-- Polymorphic data model (type/sub_type discriminators, layered architecture)
├── admin/backend/
│   ├── .env                   <-- Admin credentials (secret)
│   ├── auth_utils.py          <-- JWT generation, session verification, brute-force defense
│   └── routes/
│       ├── agents.py          <-- Agent run trigger + log retrieval (~200 lines)
│       ├── auth.py            <-- Login, logout, session verification (~70 lines)
│       ├── bulk.py            <-- CSV bulk upload phases 1 & 2 (~385 lines)
│       ├── diagram.py         <-- Diagram tree parent_id editor (~120 lines)
│       ├── essays.py          <-- Essay listing, historiography, snippet/metadata triggers (~140 lines)
│       ├── lists.py           <-- Resource list management (~90 lines)
│       ├── news.py            <-- Blog posts, news items, crawl trigger (~135 lines)
│       ├── records.py         <-- Record CRUD + picture upload/delete (~330 lines)
│       ├── responses.py       <-- Challenge response CRUD (~165 lines)
│       ├── shared.py          <-- Shared DB helpers, models, auth dependency, logger
│       └── system.py          <-- Config, health, MCP proxy, tests, restart (~410 lines)
├── admin/frontend/
│   ├── dashboard.html         <-- Main module grid orchestrator (3×3+1 card layout)
│   ├── dashboard_arbor.html   <-- Interactive diagram container with Refresh/Publish bar
│   ├── dashboard_blog_posts.html <-- Split-pane blog editor with Published/Drafts sidebar
│   ├── dashboard_challenge_academic.html <-- Academic-only challenge list management container
│   ├── dashboard_challenge_popular.html <-- Popular-only challenge list management container
│   ├── dashboard_challenge_response.html <-- Challenge Response WYSIWYG editor shell
│   ├── dashboard_essay.html   <-- Split-pane editor for essays (context, theological, spiritual)
│   ├── dashboard_historiography.html <-- Split-pane editor for the historiography essay
│   ├── dashboard_news_sources.html <-- News source management with keyword sidebar & crawler trigger
│   ├── dashboard_records_all.html <-- Tabular records management with bulk CSV upload
│   ├── dashboard_records_single.html <-- High-density single record editor with section navigator
│   ├── dashboard_system.html  <-- System health monitoring, agent activity, test execution
│   ├── dashboard_wikipedia.html <-- Wikipedia list management container
│   └── login.html             <-- Authentication entry point (password → JWT cookie)
├── assets/
│   ├── *.png                  <-- Raw source images and portraits
│   ├── ai-instructions.txt    <-- Specialized guidance for LLM crawlers
│   └── favicon.png            <-- Website favicon
├── backend/middleware/
│   ├── logger_setup.py        <-- Centralized logging configuration
│   └── rate_limiter.py        <-- DDoS protection for API endpoints
├── backend/pipelines/
│   ├── pipeline_academic_challenges.py <-- Finds, analyzes and ranks academic historical debates
│   ├── pipeline_news.py       <-- Crawls, ranks, inserts timeline news events
│   ├── pipeline_popular_challenges.py <-- Finds, analyzes and ranks popular public queries
│   └── pipeline_wikipedia.py  <-- Fetches, ranks, inserts Wikipedia reference data
├── backend/scripts/
│   ├── agent_client.py        <-- Shared utility: DeepSeek API client for web-search, snippets, metadata
│   ├── helper_api.py          <-- Shared logic for secure external API connection calls
│   ├── metadata_generator.py  <-- Shared utility: DeepSeek-powered SEO/Keyword extraction
│   ├── slug_generator.py      <-- Shared utility: DeepSeek-powered URL-slug generation
│   └── snippet_generator.py   <-- Shared utility: DeepSeek-powered archival abstract generation
├── build.py                   <-- Root script to trigger backend pipelines
├── css/1.0_foundation/
│   ├── dashboard/
│   │   ├── admin_components.css <-- Providence grid, dividers, column width hooks (shared dashboard shell)
│   │   └── admin_shell.css    <-- Dashboard chrome, header, canvas background
│   ├── frontend/
│   │   ├── buttons.css        <-- Public-facing button system
│   │   └── forms.css          <-- Public-facing form styles
│   └── typography.css         <-- 🔑 Canonical Design Tokens: colors, fonts, spacing, shadows, radii
├── css/2.0_records/dashboard/
│   ├── dashboard_records_all.css <-- High-density table, sorting aesthetics, bulk review panel
│   └── dashboard_records_single.css <-- Multi-section form layout, sticky section navigator
├── css/2.0_records/frontend/
│   └── *.css                  <-- Public-facing record display styles
├── css/3.0_visualizations/dashboard/
│   └── dashboard_arbor.css    <-- Canvas & Node aesthetics
├── css/3.0_visualizations/frontend/
│   ├── ardor.css              <-- Interactive SVG evidence graph
│   ├── maps.css               <-- Map display styles
│   └── timeline.css           <-- Timeline display styles
├── css/4.0_ranked_lists/dashboard/
│   ├── dashboard_challenge.css <-- Dual-pane layout & weighting sidebar (shared by Academic and Popular pages)
│   └── dashboard_wikipedia.css <-- Sidebar controls & list aesthetics
├── css/4.0_ranked_lists/frontend/
│   └── *.css                  <-- Public-facing ranked list styles
├── css/5.0_essays_responses/dashboard/
│   └── (styles migrated to css/9.0_cross_cutting/dashboard/)
├── css/5.0_essays_responses/frontend/
│   ├── essays.css             <-- Public-facing essay typography
│   └── responses.css          <-- Public-facing response typography
├── css/6.0_news_blog/dashboard/
│   └── news_sources_dashboard.css <-- Pipeline control aesthetics & keyword sidebar
├── css/6.0_news_blog/frontend/
│   ├── blog.css               <-- Public blog feed and single post styles (blog-* BEM namespace, replaces legacy essay-* cross-references)
│   └── news_blog_landing.css  <-- Side-by-side landing page layout & shared thumbnail styles
├── css/7.0_system/
│   ├── admin.css              <-- Login page 'providence' styling
│   └── dashboard/
│       ├── dashboard_system.css <-- Log stream & gauge aesthetics
│       └── dashboard_universal_header.css <-- Standardized header aesthetics
├── css/9.0_cross_cutting/dashboard/
│   ├── context_links_widget.css <-- 🔑 Shared Tool: context links table editor styles (BEM)
│   ├── external_refs_widget.css <-- 🔑 Shared Tool: unique identifiers table editor styles (BEM)
│   ├── metadata_widget.css    <-- 🔑 Shared Tool: unified slug/snippet/metadata widget styles (BEM)
│   ├── mla_widget.css         <-- 🔑 Shared Tool: MLA bibliography table editor styles (BEM)
│   ├── picture_widget.css     <-- 🔑 Shared Tool: picture preview and thumbnail styles (BEM)
│   ├── wysiwyg_dashboard_layout.css <-- Unified dashboard layout (function bar, sidebar, split-pane grid)
│   └── wysiwyg_editor.css     <-- Unified WYSIWYG editor styles (toolbar, split panes, live preview)
├── database/
│   ├── database.sql           <-- The blueprint schema (polymorphic single-table, v2.0.0)
│   └── database.sqlite        <-- The COMPILED actual database file
├── deployment/
│   ├── admin.service          <-- Systemd config for Admin API
│   ├── deploy.sh              <-- Pull from GitHub and restart services
│   ├── mcp.service            <-- Systemd config for MCP Server
│   ├── ssl_renew.sh           <-- Automates SSL certificate renewal
│   └── thejesuswebsite.service <-- Systemd config for main FastAPI server (serve_all.py)
├── documentation/
│   ├── data_schema.md         <-- Core SQLite database blueprint
│   ├── detailed_module_sitemap.md <-- Architectural blueprints (This File)
│   ├── git_vps.md             <-- VPS deployment & Git workflow reference
│   ├── guides/
│   │   ├── ... (see §8.0 for full listing)
│   │   ├── guide_appearance.md <-- ASCII diagram of page appearance
│   │   ├── guide_dashboard_appearance.md <-- ASCII diagram of dashboard appearance
│   │   ├── guide_donations.md <-- Reference for external integrations
│   │   ├── guide_function.md  <-- Detailed explanation of system logic
│   │   ├── guide_maps.md      <-- Map module layout & interaction
│   │   ├── guide_security.md  <-- Security protocols and auth overview
│   │   ├── guide_style.md     <-- UI / UX visual design guide
│   │   ├── guide_timeline.md  <-- Timeline module layout & interaction
│   │   └── guide_welcoming_robots.md <-- SEO and AI accessibility standards
│   ├── high_level_schema.md   <-- Polymorphic data model architecture
│   ├── simple_module_sitemap.md <-- Lightweight module overview
│   ├── site_map.md            <-- Consolidated master site map
│   ├── style_mockup.html      <-- Visual style mockup prototype
│   └── vibe_coding_rules.md   <-- Foundational coding philosophies
├── frontend/pages/
│   ├── about.html             <-- About page
│   ├── blog.html              <-- Full Blog feed page
│   ├── blog_post.html         <-- Individual blog post page
│   ├── context.html           <-- Internal Landing Page (Context)
│   ├── context_essay.html     <-- Context essay single essay view
│   ├── debate.html            <-- Internal Landing Page (Debate)
│   ├── evidence.html          <-- Visual Interactive Arbor Diagram Display
│   ├── maps.html              <-- Visual Interactive Map Display
│   │   ├── map_empire.html    <-- Empire map
│   │   ├── map_galilee.html   <-- Galilee map
│   │   ├── map_jerusalem.html <-- Jerusalem map
│   │   ├── map_judea.html     <-- Judea map
│   │   └── map_levant.html    <-- Levant map
│   ├── news.html              <-- Full News feed page
│   ├── news_and_blog.html     <-- Combined News & Blog landing page
│   ├── record.html            <-- Individual record deep-dive view
│   ├── records.html           <-- Generic row-based record list view
│   ├── resources.html         <-- Internal Landing Page (Resources)
│   └── timeline.html          <-- Visual Interactive Timeline Display
├── frontend/pages/debate/
│   ├── academic_challenge.html <-- Ranked Challenge View with Response Inserted
│   ├── historiography.html    <-- Historiography essay
│   ├── popular_challenge.html <-- Ranked Challenge View with Response Inserted
│   ├── response.html          <-- Challenge response single view
│   └── wikipedia.html         <-- Ranked Wikipedia view
├── frontend/pages/resources/  <-- Resource List Views
│   ├── Events.html
│   ├── External witnesses.html
│   ├── Internal witnesses.html
│   ├── Manuscripts.html
│   ├── Miracles.html
│   ├── OT Verses.html
│   ├── Objects.html
│   ├── People.html
│   ├── Places.html
│   ├── Sermons and Sayings.html
│   ├── Sites.html
│   ├── Sources.html
│   └── World Events.html
├── index.html                 <-- Website Landing Page (Root Entry)
├── js/1.0_foundation/
│   ├── (reserved for future dashboard shell scripts)
│   ├── dashboard/
│   └── frontend/
│       ├── footer.js          <-- Footer injection & print logic
│       ├── header.js          <-- SEO metadata & og:tags injection
│       ├── initializer.js     <-- Central bootstrapper on DOMContentLoaded
│       ├── search_header.js   <-- Visible search bar injection
│       └── sidebar.js         <-- Left nav tree + admin entry
├── js/2.0_records/dashboard/
│   ├── bulk_csv_upload_handler.js <-- Phase 1: CSV parsing & client-side validation
│   ├── bulk_upload_review_handler.js <-- Phase 2: Ephemeral review, Save as Draft / Discard
│   ├── dashboard_records_all.js <-- Module orchestration & view switching
│   ├── dashboard_records_single.js <-- Module orchestration & initialization
│   ├── data_populate_table.js <-- API integration & row hydration
│   ├── description_editor.js  <-- Dynamic paragraph array editor (description + snippet)
│   ├── display_single_record_data.js <-- Record fetching & full form hydration (all fields)
│   ├── endless_scroll.js      <-- Performance-optimized overflow handling
│   ├── map_fields_handler.js  <-- Selector for map_label + integer input for geo_id
│   ├── parent_selector.js     <-- ULID input for parent_id with validation
│   ├── record_status_handler.js <-- Save Draft, Publish & Delete status management
│   ├── search_records.js      <-- Real-time client-side search (title, verse, snippet)
│   ├── snippet_generator.js   <-- 🔑 Shared Tool: Automated snippet trigger (calls API → DeepSeek)
│   ├── table_toggle_display.js <-- Sort/Filter logic; Bulk toggle isolates view
│   ├── taxonomy_selector.js   <-- Selectors for era, timeline, gospel_category fields
│   └── verse_builder.js       <-- Structured book/chapter/verse chip UI
├── js/2.0_records/frontend/
│   ├── display_snippet.js     <-- JSON Array paragraph snippet renderer (handles schema JSON format)
│   ├── json_ld_builder.js     <-- Structured SEO data builder
│   ├── list_view.js           <-- Record list rendering (type/status filtered via setup_db.js)
│   ├── pictures_display.js    <-- Picture display handler
│   ├── sanitize_query.js      <-- SQL query sanitizer
│   ├── setup_db.js            <-- WASM SQLite initializer (queries type='record', status='published')
│   ├── single_view.js         <-- Full-field record rendering (all schema columns including era, timeline, map_label, gospel_category, geo_id, iaa, pledius, manuscript, page_views, url, context_links)
│   ├── sql-wasm.js            <-- SQLite WASM engine
│   ├── sql-wasm.wasm          <-- SQLite WASM binary
│   └── thumbnails_display.js  <-- Thumbnail rendering
├── js/3.0_visualizations/dashboard/
│   ├── dashboard_arbor.js     <-- Module orchestration & initialization
│   ├── draw_arbor_connections.js <-- SVG/Canvas logic for relationship lines
│   ├── fetch_arbor_data.js    <-- API interface for tree fetching
│   ├── handle_node_drag.js    <-- Drag-and-drop interaction logic
│   ├── render_arbor_node.js   <-- Individual node creation & styling
│   └── update_node_parent.js  <-- Parent-child re-assignment logic (auto-saves as draft)
├── js/3.0_visualizations/frontend/
│   ├── ardor_display.js       <-- SVG evidence diagram (static mock-up)
│   ├── maps_display.js        <-- Interactive map rendering
│   └── timeline_display.js    <-- Timeline rendering (filters type='record', status='published'; Prophecy lane removed; era-based lane assignment)
├── js/4.0_ranked_lists/dashboard/
│   ├── academic_challenge_ranking_weights.js <-- Sidebar: Academic weighting factors
│   ├── academic_challenge_search_terms.js <-- Sidebar: Academic search terms overview
│   ├── challenge_list_display.js <-- Data fetching & row hydration
│   ├── challenge_ranking_calculator.js <-- Real-time score/rank logic
│   ├── challenge_response_list_display.js <-- Sidebar response list display
│   ├── challenge_response_load_content.js <-- Single response content loader
│   ├── challenge_response_status_handler.js <-- Save/Publish/Delete handler
│   ├── challenge_weighting_handler.js <-- Weight/rank sidebar for Academic/Popular
│   ├── dashboard_challenge_academic.js <-- Academic module orchestration & initialization
│   ├── dashboard_challenge_popular.js <-- Popular module orchestration & initialization
│   ├── dashboard_challenge_response.js <-- Challenge Response module orchestrator
│   ├── dashboard_wikipedia.js <-- Module orchestration & initialization
│   ├── insert_challenge_response.js <-- Response creation & challenge linking
│   ├── popular_challenge_ranking_weights.js <-- Sidebar: Popular weighting factors
│   ├── popular_challenge_search_terms.js <-- Sidebar: Popular search terms overview
│   ├── wikipedia_list_display.js <-- Data fetching & row hydration
│   ├── wikipedia_ranking_calculator.js <-- Real-time ranking & multi-weight logic
│   ├── wikipedia_search_terms.js <-- Wikipedia Search Terms editor (overview + textarea)
│   ├── wikipedia_sidebar_handler.js <-- Sidebar: delegate to weights/search terms
│   └── wikipedia_weights.js   <-- Wikipedia Weight editor (multi-weight)
├── js/4.0_ranked_lists/frontend/
│   ├── list_view_academic_challenges.js <-- Academic challenges ranked list (live API fetch, type='challenge_academic' discriminator, sub_type grouping, weight score computation)
│   ├── list_view_academic_challenges_with_response.js <-- Academic challenges with response sub-cards (challenge_id FK linking)
│   ├── list_view_popular_challenges.js <-- Popular challenges ranked list (live API fetch, type='challenge_popular' discriminator, identical pattern to academic)
│   ├── list_view_popular_challenges_with_response.js <-- Popular challenges with response sub-cards
│   └── list_view_wikipedia.js <-- Wikipedia ranked list (live API fetch, type='wikipedia_entry' discriminator, sub_type grouping)
├── js/5.0_essays_responses/dashboard/
│   ├── dashboard_essay.js     <-- Essay-only orchestrator (fixed mode, no toggle)
│   ├── dashboard_historiography.js <-- Historiography-only orchestrator (fixed mode, no toggle)
│   ├── document_status_handler.js <-- Save/Publish/Delete state management (shared)
│   ├── essay_historiography_list_display.js <-- Sidebar list population (split from data_display)
│   ├── essay_historiography_load_content.js <-- Editor content loading (split from data_display)
│   ├── markdown_editor.js     <-- Core WYSIWYG markdown editing & live HTML preview
│   ├── search_essays.js       <-- Sidebar search: real-time title filtering (shared)
│   └── 🔑 Shared Tool (owned here, consumed by Blog Posts & elsewhere) ──
├── js/5.0_essays_responses/frontend/
│   ├── list_view_responses.js <-- Response list rendering (live API fetch, type='challenge_response' discriminator)
│   ├── mla_snippet_display.js <-- MLA citation display
│   ├── response_display.js    <-- Challenge response display (live API fetch, body field as primary markdown content, bibliography + context_links rendering, challenge_id parent link)
│   ├── sources_biblio_display.js <-- Source bibliography rendering
│   ├── view_context_essays.js <-- Context essay single-view (live API fetch, type/status filter, markdown→HTML converter, essay-* BEM rendering, TOC generation, bibliography + picture dispatch)
│   └── view_historiography.js <-- Historiography singleton (live API fetch, slug='historiography', identical render pattern to context essays)
├── js/6.0_news_blog/dashboard/
│   ├── blog_post_status_handler.js <-- Save/Publish/Delete state logic
│   ├── blog_posts_list_display.js <-- Sidebar list population (split from display_blog_posts_data)
│   ├── blog_posts_load_content.js <-- Editor content loading (split from display_blog_posts_data)
│   ├── dashboard_blog_posts.js <-- Module orchestration & initialization
│   ├── dashboard_news_sources.js <-- Module orchestration & initialization
│   ├── launch_news_crawler.js <-- News crawler pipeline trigger
│   ├── news_sources_handler.js <-- Data fetching & row hydration
│   └── news_sources_sidebar_handler.js <-- Sidebar: keywords, source URLs, crawler trigger
├── js/6.0_news_blog/frontend/
│   ├── blog_snippet_display.js <-- Blog snippet on landing page (API fetch, type/status filter)
│   ├── display_blogpost.js    <-- Single blog post display (API fetch, blog-* BEM classes, body markdown→HTML, 17 schema fields including iaa/pledius/manuscript/url/page_views)
│   ├── list_blogpost.js       <-- Full blog feed list (API fetch, type='blog_post' & status='published' filter)
│   ├── list_newsitem.js       <-- News feed list (API fetch, type='news_article' & status='published' filter, schema-prefixed columns: news_item_title, news_item_link, last_crawled)
│   └── news_snippet_display.js <-- News snippet on landing page (API fetch, top 5, schema-prefixed columns)
├── js/7.0_system/
│   ├── admin.js               <-- Login submission & error handling
│   └── dashboard/
│       ├── agent_generation_controls.js <-- Agent generation & document management triggers
│       ├── agent_monitor.js   <-- Agent run log polling, activity table & trace reasoning
│       ├── dashboard_app.js   <-- Module router: loadModule(), _setLayoutColumns()
│       ├── dashboard_orchestrator.js <-- Main app initialization & session check
│       ├── dashboard_sidebar_resize.js <-- Sidebar drag resize utility: initSidebarResize()
│       ├── dashboard_sidebar_resize_init.js <-- Init wrapper: patches _setLayoutColumns for resize
│       ├── dashboard_system.js <-- Module orchestration & initialization
│       ├── dashboard_universal_header.js <-- Header injection & logout logic
│       ├── display_dashboard_cards.js <-- Module navigation card rendering
│       ├── display_error_footer.js <-- Universal status/error log stream UI
│       ├── display_system_data.js <-- Real-time status polling & health card rendering
│       ├── field_persistence.js <-- Shared tool: sessionStorage-based field persistence
│       ├── gather_trigger.js  <-- Shared tool: Gather button trigger with polling & dedup
│       ├── load_middleware.js <-- Session page guard: verifyAdminSession()
│       ├── mcp_monitor.js     <-- MCP server status polling & error stream rendering
│       └── test_execution_logic.js <-- Test suite execution & log piping
├── js/9.0_cross_cutting/dashboard/
│   ├── context_link_handler.js <-- 🔑 Shared Tool: Editable table editor for database relationship links (slug + type)
│   ├── external_refs_handler.js <-- 🔑 Shared Tool: Two-column table editor for iaa, pledius, manuscript
│   ├── metadata_widget.js     <-- 🔑 Shared Tool: unified slug/snippet/metadata widget with Generate All
│   ├── mla_source_handler.js  <-- 🔑 Shared Tool: Three table editor (Books, Articles, Websites) for MLA bibliography
│   └── picture_handler.js     <-- 🔑 Shared Tool: Image upload, preview & thumbnail
├── js/admin_core/
│   └── error_handler.js       <-- Shared error routing API consumed by ALL dashboard modules
├── logs/                      <-- Storage for pipeline and API error logs
├── mcp_server.py              <-- Exposes read-only API to external agents
├── nginx.conf                 <-- Global Web server and SSL/Proxy config
├── requirements.txt           <-- Python dependencies (FastAPI, JWT, etc)
├── serve_all.py               <-- Main FastAPI app: combines admin API, public routes, static serving
├── tests/
│   ├── agent_readability_test.py <-- Simulates AI "headless" crawl
│   ├── browser_test_skill.md  <-- Instructions for Agents to run browser tests
│   ├── port_test.py           <-- Verifies all local ports are responding
│   ├── reports/               <-- Output directory for UI/UX audit logs
│   └── security_audit.py      <-- Runs automated vulnerability scans
└── tools/
    ├── generate_sitemap.py    <-- Dynamic XML sitemap builder
    ├── migrate_schema.py      <-- Database schema migration utility
    └── minify_admin.py        <-- Automates admin code obfuscation
```
