---
name: module_sitemap.md
version: 1.7.0
purpose: visual and list taxonomy of codebase
dependencies: [site_map.md]
---

# Module Sitemap

The purpose of this codebase is to build an archival style website organising and presenting historical information about Jesus. The website is built using HTML, CSS, and JavaScript, with some PY helper scripts. The website is built using a modular architecture that is easy to build, maintain and extend. This document is the source of truth, it must be checked before and after any code creation or code refactoring. 

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
The Foundation module defines the global visual identity and structural grid of the site while establishing the core navigational framework through shared UI components like the sidebar, header, and footer. Its scope encompasses the website's landing page, essential crawler configuration files, and the primary informational pages that provide context and resources to the user, ensuring a consistent and responsive user experience across the entire multi-page application.

**Supporting Files (Non-CSS/JS):**
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
```

---

## 2.0 Records Module
The Records module manages the core data lifecycle, from SQLite schema definition and Python-based ingestion pipelines to the dynamic rendering of individual records and aggregate lists. Its scope includes the primary database files, secure external API connection utilities, and a comprehensive suite of front-end pages designed for deep-dive exploration and aggregate resource viewing.

**Supporting Files (Non-CSS/JS):**
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
The Visualizations module provides interactive, visual-first navigation through recursive Ardor diagrams, chronological timelines, and multi-layered geographic maps. Its scope covers the specialized HTML templates required for these immersive displays, transforming relational database records into spatial and temporal narratives.

**Supporting Files (Non-CSS/JS):**
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
```

---

## 4.0 Ranked Lists Module
The Ranked Lists module processes and prioritizes external Wikipedia data and historical challenges using discrete weighting multipliers to surface high-value evidence. Its scope includes the backend Python pipelines for automated ranking and the public-facing debate pages that embed challenge-response pairs directly into the user interface.

**Supporting Files (Non-CSS/JS):**
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
The Essays & Responses module handles long-form editorial content, covering thematic context essays, historiography, and scholarly challenge responses. Its scope includes specialized HTML views for in-depth reading and a shared bibliography system that automatically formats scholarly sources.

**Supporting Files (Non-CSS/JS):**
```text
frontend/pages/
└── context_essay.html         <-- Context essay single essay view

frontend/pages/debate/
├── historiography.html    <-- Historiography essay
└── response.html          <-- Challenge response single view
```

---

## 6.0 News & Blog Module
The News & Blog module manages the end-to-end lifecycle of time-sensitive content, from automated news ingestion pipelines to public-facing feed pages. Its scope encompasses the Python crawling scripts, dedicated landing pages for news and blog updates, and individual post views served through a clean URL structure.

**Supporting Files (Non-CSS/JS):**
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
The System module serves as the operational backbone of the site, encompassing AI-agent instructions, secure backend API management, and production deployment automation. Its scope includes the secure Admin Portal entry point, Python-based authentication and security utilities, global configuration files, and the infrastructure required for VPS hosting and MCP server exposure.

**Supporting Files (Non-CSS/JS):**
```text
admin/
├── frontend/
│   └── admin.html                 <-- Secure entry portal for admin features
└── backend/
    ├── admin_api.py               <-- Secure backend writing to SQL
    └── auth_utils.py              <-- JWT generation and Brute Force defense

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
└── rate_limiter.py      <-- DDoS protection for API endpoints

documentation/guides/
└── guide_security.md    <-- Security protocols and auth mechanism overview
```

---

## 8.0 Setup & Testing Module
The Setup & Testing module supports the development lifecycle through automated test suites, database seeding tools, and comprehensive architectural documentation. Its scope covers root-level build scripts, local environment initialization tools, security audit utilities, and the complete library of guides and sitemaps that define the project's logic and aesthetics.

**Supporting Files (Non-CSS/JS):**
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
├── implementation_plan.md             <-- Implementation Plan
├── module_sitemap.md                  <-- Architectural blueprints (This File)
├── site_map.md                        <-- Consolidated master site map
├── vibe_coding_rules.md               <-- Foundational coding philosophies
├── style_guide.md                     <-- UI / UX visual design guide
├── data_schema.md                     <-- Core SQLite database blueprint
└── guides/
    ├── guide_appearance.md            <-- ASCI diagram of page appearance
    ├── guide_dashboard_appearance.md  <-- ASCI diagram of dashboard appearance
    ├── guide_donations.md             <-- Reference for external integrations
    ├── guide_function.md              <-- Detailed explanation of system logic
    ├── guide_security.md              <-- Security protocols and auth overview
    ├── guide_style.md                 <-- UI / UX visual design guide
    └── guide_welcoming_robots.md      <-- SEO and AI accessibility standards
```
