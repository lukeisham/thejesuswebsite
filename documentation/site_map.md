---
name: site_map.md
version: 1.0.54
purpose: A consolidated master site map of all folders and files for the codebase
dependencies: [detailed_module_sitemap.md, data_schema.md, guides/]
---

# Master Site Map

```text
├── .agent/                    <-- Agent instructions & workflows
├── .env                       <-- Global Admin, ESV and Deepseek credentials
├── .gitignore                 <-- Ensures secrets (like .env) aren't committed to GitHub
├── LICENCE                    <-- Open Use Licencing with attribution requirement
├── README.md                  <-- Project overview
├── admin/backend/
│   ├── admin_api.py           <-- Central API: CRUD endpoints, agent run/logs, health, MCP proxy
│   └── auth_utils.py          <-- JWT generation, session verification, brute-force defense
├── admin/frontend/
│   ├── dashboard.html         <-- Main module grid orchestrator (3×3+1 card layout)
│   ├── dashboard_arbor.html   <-- Interactive diagram container with Refresh/Publish bar
│   ├── dashboard_blog_posts.html <-- Split-pane blog editor with Published/Drafts sidebar
│   ├── dashboard_challenge.html <-- Challenge list management container (Academic/Popular toggle)
│   ├── dashboard_challenge_response.html <-- Split-pane response editor with Academic/Popular sidebar
│   ├── dashboard_essay_historiography.html <-- Split-pane editor with Essay/Historiography toggle
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
│   └── frontpage/
│       └── *.css              <-- Public-facing foundation styles
├── css/2.0_records/dashboard/
│   ├── dashboard_records_all.css <-- High-density table, sorting aesthetics, bulk review panel
│   ├── dashboard_records_single.css <-- Multi-section form layout, sticky section navigator
│   └── metadata_widget.css   <-- Shared slug/snippet/metadata widget styles
├── css/2.0_records/frontpage/
│   └── *.css                  <-- Public-facing record display styles
├── css/3.0_visualizations/dashboard/
│   └── dashboard_arbor.css    <-- Canvas & Node aesthetics
├── css/3.0_visualizations/frontpage/
│   └── *.css                  <-- Public-facing visualization styles
├── css/4.0_ranked_lists/dashboard/
│   ├── dashboard_challenge.css <-- Toggle-driven dual-pane layout & weighting sidebar
│   └── dashboard_wikipedia.css <-- Sidebar controls & list aesthetics
├── css/4.0_ranked_lists/frontpage/
│   └── *.css                  <-- Public-facing ranked list styles
├── css/5.0_essays_responses/dashboard/
│   ├── dashboard_challenge_response.css <-- Response editor layout & typography
│   ├── dashboard_essay_historiography.css <-- Dual-state layout & toolbar
│   ├── essay_WYSIWYG_editor.css <-- Markdown input & live preview styling
│   └── response_markdown.css  <-- Markdown editor & live preview styling
├── css/5.0_essays_responses/frontpage/
│   └── *.css                  <-- Public-facing essay/response styles
├── css/6.0_news_blog/dashboard/
│   ├── blog_WYSIWYG_editor.css <-- Markdown editor canvas, toolbar, and live preview pane
│   ├── blog_posts_dashboard.css <-- Navigator sidebar & editor layout
│   └── news_sources_dashboard.css <-- Pipeline control aesthetics & keyword sidebar
├── css/6.0_news_blog/frontpage/
│   └── *.css                  <-- Public-facing news/blog styles
├── css/7.0_system/
│   ├── admin.css              <-- Login page 'providence' styling
│   └── dashboard/
│       ├── dashboard_system.css <-- Log stream & gauge aesthetics
│       └── dashboard_universal_header.css <-- Standardized header aesthetics
├── database/
│   ├── database.sql           <-- The blueprint schema
│   └── database.sqlite        <-- The COMPILED actual database file
├── deployment/
│   ├── admin.service          <-- Systemd config for Admin API
│   ├── deploy.sh              <-- Pull from GitHub and restart services
│   ├── mcp.service            <-- Systemd config for MCP Server
│   └── ssl_renew.sh           <-- Automates SSL certificate renewal
├── documentation/
│   ├── data_schema.md         <-- Core SQLite database blueprint
│   ├── guides/
│   │   ├── guide_appearance.md <-- ASCII diagram of page appearance
│   │   ├── guide_dashboard_appearance.md <-- ASCII diagram of dashboard appearance
│   │   ├── guide_donations.md <-- Reference for external integrations
│   │   ├── guide_function.md  <-- Detailed explanation of system logic
│   │   ├── guide_security.md  <-- Security protocols and auth overview
│   │   ├── guide_style.md     <-- UI / UX visual design guide
│   │   └── guide_welcoming_robots.md <-- SEO and AI accessibility standards
│   ├── implementation_plan.md <-- Implementation Plan
│   ├── master_dashboard_refactor_roadmap.md <-- Roadmap for full dashboard refactor
│   ├── module_sitemap.md      <-- Architectural blueprints (This File)
│   ├── plan_backend_infrastructure.md <-- Plan: Backend Infrastructure & Shared Scripts
│   ├── plan_dashboard_arbor.md <-- Plan: Arbor Diagram Module
│   ├── plan_dashboard_blog_posts.md <-- Plan: Blog Posts Module
│   ├── guide_dashboard_appearance.md §4.2 <-- Challenge Ranked List Module (plan replaced by guide)
│   ├── plan_dashboard_challenge_response.md <-- Plan: Challenge Response Module
│   ├── plan_dashboard_essay_historiography.md <-- Plan: Essay & Historiography Module
│   ├── plan_dashboard_login_and_shell.md <-- Plan: Admin Login & Dashboard Shell
│   ├── plan_dashboard_news_sources.md <-- Plan: News Sources Module
│   ├── plan_dashboard_records_all.md <-- Plan: All Records Module
│   ├── plan_dashboard_records_single.md <-- Plan: Single Record Module
│   ├── plan_dashboard_system.md <-- Plan: System Health Module
│   ├── plan_dashboard_wikipedia.md <-- Plan: Wikipedia Ranked List Module
│   ├── plan_issues.md         <-- Cross-plan issue tracker
│   ├── site_map.md            <-- Consolidated master site map
│   ├── style_guide.md         <-- UI / UX visual design guide
│   └── vibe_coding_rules.md   <-- Foundational coding philosophies
├── documentation/guides/
│   └── guide_security.md      <-- Security protocols and auth mechanism overview
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
│   ├── (shared navigation/UI logic)
│   └── frontpage/
│       └── *.js               <-- Public-facing foundation scripts
├── js/2.0_records/dashboard/
│   ├── bulk_csv_upload_handler.js <-- Phase 1: CSV parsing & client-side validation
│   ├── bulk_upload_review_handler.js <-- Phase 2: Ephemeral review, Save as Draft / Discard
│   ├── context_link_handler.js <-- Database relationship links
│   ├── dashboard_records_all.js <-- Module orchestration & view switching
│   ├── dashboard_records_single.js <-- Module orchestration & initialization
│   ├── data_populate_table.js <-- API integration & row hydration
│   ├── description_editor.js  <-- Dynamic paragraph array editor (description + snippet)
│   ├── display_single_record_data.js <-- Record fetching & full form hydration (all fields)
│   ├── endless_scroll.js      <-- Performance-optimized overflow handling
│   ├── external_refs_handler.js <-- Text inputs for iaa, pledius, manuscript
│   ├── map_fields_handler.js  <-- Selector for map_label + integer input for geo_id
│   ├── metadata_handler.js    <-- Snippet/Slug/Meta footer with auto-gen buttons
│   ├── metadata_widget.js     <-- Shared slug/snippet/metadata widget with Generate All
│   ├── mla_source_handler.js  <-- Structured MLA bibliography management
│   ├── parent_selector.js     <-- ULID input for parent_id with validation
│   ├── picture_handler.js     <-- Image upload, preview & thumbnail
│   ├── record_status_handler.js <-- Save Draft, Publish & Delete status management
│   ├── search_records.js      <-- Real-time client-side search (title, verse, snippet)
│   ├── snippet_generator.js   <-- Automated snippet trigger (calls API → DeepSeek)
│   ├── table_toggle_display.js <-- Sort/Filter logic; Bulk toggle isolates view
│   ├── taxonomy_selector.js   <-- Selectors for era, timeline, gospel_category fields
│   ├── url_array_editor.js    <-- Label/URL pair array editor
│   ├── verse_builder.js       <-- Structured book/chapter/verse chip UI
│   └── 🔑 Shared Tools (owned here, consumed by other dashboard modules) ──
├── js/2.0_records/frontpage/
│   └── *.js                   <-- Public-facing record display logic
├── js/3.0_visualizations/dashboard/
│   ├── dashboard_arbor.js     <-- Module orchestration & initialization
│   ├── draw_arbor_connections.js <-- SVG/Canvas logic for relationship lines
│   ├── fetch_arbor_data.js    <-- API interface for tree fetching
│   ├── handle_node_drag.js    <-- Drag-and-drop interaction logic
│   ├── render_arbor_node.js   <-- Individual node creation & styling
│   └── update_node_parent.js  <-- Parent-child re-assignment logic (auto-saves as draft)
├── js/3.0_visualizations/frontpage/
│   └── *.js                   <-- Public-facing visualization logic (render_arbor.js, etc.)
├── js/4.0_ranked_lists/dashboard/
│   ├── challenge_list_display.js <-- Data fetching & row hydration
│   ├── challenge_ranking_calculator.js <-- Real-time score/rank logic
│   ├── dashboard_challenge.js <-- Module orchestration & initialization
│   ├── dashboard_wikipedia.js <-- Module orchestration & initialization
│   ├── insert_challenge_response.js <-- Response creation & challenge linking
│   ├── wikipedia_list_display.js <-- Data fetching & row hydration
│   ├── wikipedia_ranking_calculator.js <-- Real-time ranking & multi-weight logic
│   ├── wikipedia_sidebar_handler.js <-- Sidebar: delegate to weights/search terms
│   ├── wikipedia_weights.js   <-- Wikipedia Weight editor (multi-weight)
│   └── wikipedia_search_terms.js <-- Wikipedia Search Terms editor (overview + textarea)
├── js/4.0_ranked_lists/frontpage/
│   └── *.js                   <-- Public-facing ranked list logic
├── js/5.0_essays_responses/dashboard/
│   ├── challenge_link_handler.js <-- Parent challenge association logic
│   ├── dashboard_challenge_response.js <-- Module orchestration & initialization
│   ├── dashboard_essay_historiography.js <-- Dual-state toggle orchestrator
│   ├── display_challenge_response_data.js <-- Response fetching & field population
│   ├── document_status_handler.js <-- Save/Publish/Delete state management
│   ├── essay_historiography_data_display.js <-- Content fetching & population
│   ├── markdown_editor.js     <-- Core WYSIWYG markdown editing & live HTML preview
│   ├── response_status_handler.js <-- Save/Publish/Delete status logic
│   ├── search_essays.js       <-- Sidebar search: real-time title filtering
│   ├── search_responses.js    <-- Sidebar search: real-time title filtering
│   └── 🔑 Shared Tool (owned here, consumed by Blog Posts & Challenge Response) ──
├── js/5.0_essays_responses/frontpage/
│   └── *.js                   <-- Public-facing essay/response logic
├── js/6.0_news_blog/dashboard/
│   ├── blog_post_status_handler.js <-- Save/Publish/Delete state logic
│   ├── dashboard_blog_posts.js <-- Module orchestration & initialization
│   ├── dashboard_news_sources.js <-- Module orchestration & initialization
│   ├── display_blog_posts_data.js <-- Blog post fetching & field population
│   ├── launch_news_crawler.js <-- News crawler pipeline trigger
│   ├── news_sources_handler.js <-- Data fetching & row hydration
│   └── news_sources_sidebar_handler.js <-- Sidebar: keywords, source URLs, crawler trigger
├── js/6.0_news_blog/frontpage/
│   └── *.js                   <-- Public-facing news/blog logic
├── js/7.0_system/
│   ├── admin.js               <-- Login submission & error handling
│   └── dashboard/
│       ├── agent_generation_controls.js <-- Agent generation & document management triggers
│       ├── agent_monitor.js   <-- Agent run log polling, activity table & trace reasoning
│       ├── dashboard_app.js   <-- Module router: loadModule(), _setLayoutColumns()
│       ├── dashboard_orchestrator.js <-- Main app initialization & session check
│       ├── dashboard_system.js <-- Module orchestration & initialization
│       ├── dashboard_universal_header.js <-- Header injection & logout logic
│       ├── display_dashboard_cards.js <-- Module navigation card rendering
│       ├── display_error_footer.js <-- Universal status/error log stream UI
│       ├── display_system_data.js <-- Real-time status polling & health card rendering
│       ├── load_middleware.js <-- Session page guard: verifyAdminSession()
│       ├── mcp_monitor.js     <-- MCP server status polling & error stream rendering
│       └── test_execution_logic.js <-- Test suite execution & log piping
├── js/admin_core/
│   └── error_handler.js       <-- Shared error routing API consumed by ALL dashboard modules
├── logs/                      <-- Storage for pipeline and API error logs
├── mcp_server.py              <-- Exposes read-only API to external agents
├── nginx.conf                 <-- Global Web server and SSL/Proxy config
├── requirements.txt           <-- Python dependencies (FastAPI, JWT, etc)
├── tests/
│   ├── agent_readability_test.py <-- Simulates AI "headless" crawl
│   ├── browser_test_skill.md  <-- Instructions for Agents to run browser tests
│   ├── port_test.py           <-- Verifies all local ports are responding
│   ├── reports/               <-- Output directory for UI/UX audit logs
│   └── security_audit.py      <-- Runs automated vulnerability scans
└── tools/
    ├── db_seeder.py           <-- Logic to populate the SQLite database
    ├── generate_sitemap.py    <-- Dynamic XML sitemap builder
    ├── minify_admin.py        <-- Automates admin code obfuscation
    ├── seed_data.sql          <-- Initial data payload for first build
    └── test_records.sql       <-- Small sample dataset for test runs
```
