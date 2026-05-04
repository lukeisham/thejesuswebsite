---
name: site_map.md
version: 1.0.49
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
├── admin/
│   ├── backend/
│   │   ├── admin_api.py       <-- Secure backend writing to SQL
│   │   └── auth_utils.py      <-- JWT generation and Brute Force defense
│   └── frontend/
│       ├── admin.html         <-- Login-only entry portal for admin authentication
│       └── dashboard.html     <-- Post-login dashboard shell with module tab bar
├── assets/
│   ├── *.png                  <-- Raw source images and portraits
│   ├── ai-instructions.txt    <-- Specialized guidance for LLM crawlers
│   └── favicon.png            <-- Website favicon
├── assets/favicon.png         <-- Website Favicon Branding (Aleph + Omega)
├── backend/middleware/
│   └── rate_limiter.py        <-- DDoS protection for API endpoints
├── backend/pipelines/
│   ├── pipeline_academic_challenges.py <-- Finds, analyzes and ranks academic historical debates
│   ├── pipeline_news.py       <-- Crawls, ranks, inserts timeline news events
│   ├── pipeline_popular_challenges.py <-- Finds, analyzes and ranks popular public queries
│   └── pipeline_wikipedia.py  <-- Fetches, ranks, inserts Wikipedia reference data
├── backend/scripts/
│   ├── agent_client.py       <-- Shared DeepSeek API client for AI-powered pipelines
│   ├── helper_api.py          <-- Shared logic for secure external API connection calls
│   ├── metadata_generator.py  <-- DeepSeek-powered SEO/Keyword extraction
│   └── snippet_generator.py   <-- DeepSeek-powered archival abstract generation
├── build.py                   <-- Root script to trigger backend pipelines
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
│   │   ├── guide_appearance.md <-- ASCI diagram of page appearance
│   │   ├── guide_dashboard_appearance.md <-- ASCI diagram of dashboard appearance
│   │   ├── guide_donations.md <-- Reference for external integrations
│   │   ├── guide_function.md  <-- Detailed explanation of system logic
│   │   ├── guide_security.md  <-- Security protocols and auth overview
│   │   ├── guide_style.md     <-- UI / UX visual design guide
│   │   └── guide_welcoming_robots.md <-- SEO and AI accessibility standards
│   ├── implementation_plan.md <-- Implementation Plan
│   ├── master_dashboard_refactor_roadmap.md <-- Roadmap for full dashboard refactor
│   ├── module_sitemap.md      <-- Architectural blueprints (This File)
│   ├── plan_dashboard_arbor.md <-- Plan: Arbor Diagram Module
│   ├── plan_dashboard_blog_posts.md <-- Plan: Blog Posts Module
│   ├── plan_dashboard_challenge.md <-- Plan: Challenge Ranked List Module
│   ├── plan_dashboard_challenge_response.md <-- Plan: Challenge Response Module
│   ├── plan_dashboard_essay_historiography.md <-- Plan: Essay & Historiography Module
│   ├── plan_dashboard_login_shell.md <-- Plan: Admin Login & Dashboard Shell
│   ├── plan_dashboard_news_sources.md <-- Plan: News Sources Module
│   ├── plan_dashboard_records_all.md <-- Plan: All Records Module
│   ├── plan_dashboard_records_single.md <-- Plan: Single Record Module
│   ├── plan_dashboard_system.md <-- Plan: System Health Module
│   ├── plan_dashboard_wikipedia.md <-- Plan: Wikipedia Ranked List Module
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
│   ├── evidence.html          <-- Visual Interactive Ardor diagram Display
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
│   └── timeline.html          <-- Visual Interactive timeline Display
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
├── logs/                      <-- Storage for pipeline and API error logs
├── mcp_server.py              <-- Exposes read-only API to external agents
├── nginx.conf                 <-- Global Web server and SSL/Proxy config
├── requirements.txt           <-- Python dependencies (FastAPI, JWT, etc)
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
