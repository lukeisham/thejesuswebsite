---
name: site_map.md
version: 1.0.31
purpose: A consolidated master site map of all folders and files for the codebase
dependencies: [module_sitemap.md, data_schema.md, guides/]
---

# Master Site Map

```
/                               <-- Root Directory
│   ├── .agent/                <-- Agent instructions & workflows
│   ├── .env                   <-- Global Admin, ESV and Deepseek credentials
│   ├── .gitignore             <-- Ensures secrets (like .env) aren't committed to GitHub
│   ├── LICENCE                <-- Open Use Licencing with attribution requirement
│   ├── README.md              <-- Project overview
│   ├── backend/middleware/
│   │   └── rate_limiter.py    <-- DDoS protection for API endpoints
│   ├── mcp_server.py          <-- Exposes read-only API to external agents
│   ├── nginx.conf             <-- Global Web server and SSL/Proxy config
│   └── requirements.txt       <-- Python dependencies (FastAPI, JWT, etc)
├── admin/
│   ├── backend/
│   │   ├── admin_api.py       <-- Secure backend writing to SQL
│   │   └── auth_utils.py      <-- JWT generation and Brute Force defense
│   └── frontend/
│       ├── admin.html         <-- Secure entry portal for admin editing features
│       ├── admin_login.js     <-- Authentication & Session handling
│       ├── dashboard_app.js   <-- Main Dashboard controller, UI router & Sidebar navigation
│       ├── load_middleware.js <-- JWT/Token validation middleware
│       └── logout_middleware.js <-- Session termination
├── admin/frontend/edit_modules/
│   ├── edit_academic_weights.js <-- Admin tool for editing academic ranking multipliers
│   ├── edit_blogpost.js       <-- Editor for blog posts
│   ├── edit_diagram.js        <-- Visual tool to adjust recursive 'Ador' parent_id relations
│   ├── edit_essay.js          <-- Editor for contextual essays
│   ├── edit_historiography.js <-- Editor for historiography essay
│   ├── edit_insert_response_academic.js <-- Editor for inserting responses into academic lists
│   ├── edit_insert_response_popular.js <-- Editor for inserting responses into popular lists
│   ├── edit_links.js          <-- Unified form for Internal/External/Context links
│   ├── edit_lists.js          <-- Editor for resources lists
│   ├── edit_mla_sources.js    <-- Admin tool for editing MLA sources
│   ├── edit_news_snippet.js   <-- Editor for news snippets
│   ├── edit_news_sources.js   <-- Admin tool for editing news sources
│   ├── edit_popular_weights.js <-- Admin tool for editing popular ranking multipliers
│   ├── edit_rank.js           <-- Form to manually override automated rankings
│   ├── edit_record.js         <-- Core form for editing single records
│   ├── edit_response.js       <-- Editor for challenge responses
│   └── edit_wiki_weights.js   <-- Admin tool for editing wikipedia ranking multipliers
├── assets/                    <-- Raw source images, fonts, and icons
│   ├── *.png                  <-- Raw source images, portraits, and environment shots
│   ├── ai-instructions.txt    <-- Specialized guidance for LLM crawlers
│   └── favicon.png            <-- Website favicon (Aleph & Omega design)
├── assets/favicon.png         <-- Website Favicon Branding (Aleph + Omega)
├── backend/pipelines/
│   ├── pipeline_academic_challenges.py <-- Finds, analyzes and ranks academic historical debates
│   ├── pipeline_news.py       <-- Crawls, ranks, inserts timeline news events
│   ├── pipeline_popular_challenges.py <-- Finds, analyzes and ranks popular public queries
│   └── pipeline_wikipedia.py  <-- Fetches, ranks, inserts Wikipedia reference data
├── backend/scripts/
│   └── helper_api.py          <-- Shared logic for secure external API connection calls
├── build.py                   <-- Root script to trigger backend pipelines
├── css/
│   ├── design_layouts/
│   │   ├── pdf_export.css     <-- Print media queries for exporting essays and data cleanly
│   │   ├── universal/
│   │   │   ├── footer.css     <-- Styles dictating the universally appended footer
│   │   │   └── sidebar.css    <-- Styles dictating the universal sticky side navigation
│   │   └── views/
│   │       ├── dashboard_admin.css <-- Bespoke layout instructions for the secure admin portal
│   │       ├── index_landing.css <-- Bespoke layout instructions for the root entry page
│   │       └── login_view.css <-- Bespoke layout for the secure admin login UI
│   ├── design_layouts/views/
│   │   ├── list_layout.css    <-- Layout for aggregate list views
│   │   └── single_layout.css  <-- Layout for deep-dive record views
│   └── elements/
│       ├── grid.css           <-- Master logic determining structural layout alignment
│       ├── list_card_button.css <-- Specific styles for interactive UI components
│       ├── markdown_editor.css <-- Specific styles for the admin WYSIWYG text editors
│       ├── pictures.css       <-- Specific styles for pictures and labels
│       ├── thumbnails.css     <-- Specific styles for thumbnails
│       └── typography_colors.css <-- Universal font scales and color palette variables
├── css/design_layouts/views/
│   ├── essay_layout.css       <-- Specific typography for long-form essays
│   └── response_layout.css    <-- Specific layouts for debate & responses
├── css/elements/
│   ├── ardor_diagram.css      <-- Specific styles for Ardor diagram
│   ├── map_diagram.css        <-- Specific styles for map diagram
│   └── timeline_diagram.css   <-- Specific styles for timeline diagram
├── database/
│   ├── database.sql           <-- The blueprint schema
│   └── database.sqlite        <-- The COMPILED actual database file
├── deployment/                <-- VPS Configuration Files
│   ├── admin.service          <-- Systemd config for Admin API (Auto-restart)
│   ├── deploy.sh              <-- Pull from GitHub and restart services
│   ├── mcp.service            <-- Systemd config for MCP Server (Auto-restart)
│   └── ssl_renew.sh           <-- Automates SSL certificate renewal
├── documentation/
│   ├── data_schema.md         <-- Core SQLite database blueprint 'source of truth'
│   ├── guides/
│   │   ├── guide_appearance.md <-- ASCI diagram of page appearance
│   │   ├── guide_dashboard_appearance.md <-- ASCI diagram of dashboard page appearance
│   │   ├── guide_donations.md <-- Reference for external support integrations
│   │   ├── guide_function.md  <-- Detailed explanation of system logic flows
│   │   ├── guide_security.md  <-- Security protocols and auth mechanism overview
│   │   ├── guide_style.md     <-- UI / UX visual design guide (style_guide.md)
│   │   └── guide_welcoming_robots.md <-- SEO and AI accessibility standards
│   ├── implementation_plan.md <-- Implementation Plan
│   ├── module_sitemap.md      <-- Architectural blueprints and logic flows (This File)
│   ├── style_guide.md         <-- UI / UX visual design guide
│   └── vibe_coding_rules.md   <-- foundational coding philosophies and aesthetic mandates
├── frontend/core/
│   ├── json_ld_builder.js     <-- Generates Schema.org JSON metadata
│   ├── sanitize_query.js      <-- Security utility to clean search input
│   ├── setup_db.js            <-- Fetches & inits SQLite for pages
│   ├── sql-wasm.js            <-- Downloaded library
│   └── sql-wasm.wasm          <-- Downloaded library
├── frontend/display_big/
│   ├── ardor_display.js       <-- Renders Ardor diagram
│   ├── list_blogpost.js       <-- Renders blogposts aka 'blog feed'
│   ├── list_newsitem.js       <-- Renders news items aka 'news feed'
│   ├── list_view.js           <-- Renders standard row-based data lists
│   ├── list_view_academic_challenges.js <-- Renders ranked academic challenges
│   ├── list_view_academic_challenges_with_response.js <-- Academic challenges with response
│   ├── list_view_popular_challenges.js <-- Renders ranked popular challenges
│   ├── list_view_popular_challenges_with_response.js <-- Popular challenges with response
│   ├── list_view_responses.js <-- Renders inserted list items (used for responses)
│   ├── list_view_wikipedia.js <-- Renders row-based ranked wikipedia links
│   ├── response_display.js    <-- Renders challenge responses
│   ├── single_view.js         <-- Renders single record
│   ├── view_context_essays.js <-- Renders context essays
│   └── view_historiography.js <-- Renders historiography essay
├── frontend/display_other/
│   ├── blog_snippet_display.js <-- Renders inline blog snippets
│   ├── display_snippet.js     <-- Renders inline snippets
│   ├── footer.js              <-- Universal Footer
│   ├── header.js              <-- Universal Header (+ SEO injected)
│   ├── maps_display.js        <-- Renders overlapping geographic data layers
│   ├── mla_snippet_display.js <-- Renders inline MLA citations
│   ├── news_snippet_display.js <-- Renders inline news snippets
│   ├── pictures_display.js    <-- Picture Rendering
│   ├── search_header.js       <-- Injects search bar (search input only) into
│   │   ├── (see guide_appearance.md §1.8, §1.8.1 & §1.8.2 for
│   │   │   └── full DOM structure, CSS anatomy and end-to-end logic flow)
│   │   └── certain pages. No logo or nav links.
│   ├── sidebar.js             <-- Universal Sticky Sidebar (see guide_appearance.md
│   │   └── §1.5.1 for technical anatomy mapping)
│   ├── sources_biblio_display.js <-- Renders formatted MLA bibliography citations
│   ├── thumbnails_display.js  <-- Renders thumbnails
│   └── timeline_display.js    <-- Renders timeline dots and linear progression loops
├── frontend/pages/
│   ├── about.html             <-- About page
│   ├── blog.html              <-- Blog or News Feed Pages (Blog)
│   ├── context.html           <-- Internal Landing Page (Context)
│   ├── context_essay.html     <-- Context essay single essay view
│   ├── debate.html            <-- Internal Landing Page (Debate)
│   ├── evidence.html          <-- Visual Interactive Ardor diagram Display
│   ├── maps.html              <-- Visual Interactive Map Display
│   │   ├── map_empire.html    <-- Empire map
│   │   ├── map_galilee.html   <-- Galilee map
│   │   ├── map_jerusalem.html <-- Jerusalem map
│   │   ├── map_judea.html     <-- Judea map
│   │   └── map_levant.html    <-- Levant map
│   ├── news.html              <-- Blog or News Feed Pages (News)
│   ├── news_and_blog.html     <-- Internal Landing Page: News Feed
│   ├── record.html            <-- Individual record deep-dive view
│   ├── records.html           <-- Generic row-based record list view
│   ├── resources.html         <-- Internal Landing Page (Resources)
│   └── timeline.html          <-- Visual Interactive timeline Display
├── frontend/pages/debate/
│   ├── academic_challenge.html <-- Ranked View with Response Inserted
│   ├── historiography.html    <-- Historiography essay
│   ├── popular_challenge.html <-- Ranked View with Response Inserted
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
├── logs/                      <-- Storage for pipeline and API error logs
├── robots.txt                 <-- Manual for well-behaved bots
├── sitemap.xml                <-- Index of content for crawlers
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
