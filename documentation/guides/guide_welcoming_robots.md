---
name: guide_welcoming_robots.md
purpose: description of how to make the data (excluding backend functions) welcoming to AI
version: 1.1.0
dependencies: [data_schema.md, module_sitemap.md, url_slug_restructure.md]
---

# Guide to Making Data Welcoming to AI

This guide is the source of truth of making it easy for AI to understand and use the historical data about Jesus, the resource lists, the context essays, responses to challenges, news items and blog posts.

## 1. MCP Server & Structured Access
The `mcp_server.py` is the primary "front door" for AI agents. It bypasses the visual UI to provide raw, clean JSON data directly from the SQLite database.

- **Tools for Discovery:** It exposes specific tools like `get_record(slug)` architectures which allow an agent to retrieve the full content, bibliography, and context links of any item without "visual" noise.
- **Low-Token Context:** By stripping away CSS and repetitive navigation, the MCP server ensures that the data fits efficiently into an LLM's context window.
- **Agent Instructions:** The `.agent/` directory provides embedded logic and workflow definitions to ensure external agents understand the system's capabilities.

## 2. Optimized Frontend Scraping
For agents that crawl the public-facing website, the structure is optimized to ensure high-fidelity data extraction.

- **Semantic HTML:** Use proper tags (`<article>`, `<h1>`, `<aside>`) to help general-purpose scrapers understand the hierarchy of the content automatically.
- **Hidden Descriptive Alt-Text:** Every diagram (Maps, Timelines) should have a hidden text-based summary in the HTML that provides key data points for agents that cannot "see" SVG canvases.
- **JSON-LD Metadata:** Use `frontend/core/json_ld_builder.js` (called via `header.js`) to inject Schema.org structured data (type: `Article` or `HistoricalEvent`) into the `<head>` of every page.

## 3. Standardized Agent Navigation
Predictability is key for automated agents to explore the archive without manual guidance.

- **Context Link Standards:** Maintain a strict `snake_case` slug system for all records to ensure that agents can predict URL patterns for "Deep Dive" lookups. All public-facing URLs now use clean, human-readable path-based slugs (e.g. `/record/jesus-baptism` instead of `/frontend/pages/record.html?slug=jesus-baptism`). A URL rewriting layer (nginx + FastAPI) maps these clean slugs to the underlying filesystem paths transparently — robots see only the clean URLs in the address bar and are never exposed to the internal `/frontend/pages/` directory structure or the JavaScript that handles query parameters.
- **LLM-Friendly Overviews:** The `frontend/display_other/display_snippet.js` renders short, factual abstracts at the top of every page, giving agents an immediate summary of purpose.
- **Crawl Guidance:** The `assets/ai-instructions.txt` file provides specialized guidance for LLM crawlers regarding scraping limits and formatting preferences.

## 4. Robots, Sitemaps & Indexing
A clear indexing roadmap ensures that all archived data is discovered efficiently.

- **Robots.txt:** The `frontend/robots.txt` explicitly allows indexing of content pages while **Disallowing** the `/admin/` and `/private/` directories.
- **Dynamic Sitemaps:** The `tools/generate_sitemap.py` script builds `frontend/sitemap.xml` using the new clean slug URLs (e.g. `/records`, `/record/{slug}`, `/context`, `/context/essay?id=...`). The sitemap only lists the public-facing slugs — the underlying filesystem paths are hidden behind the rewriting layer so crawlers index the clean URLs directly.
- **Crawl Delay:** Implement gentle `Crawl-delay` directives to safeguard VPS performance during high-intensity indexing sessions.

## 5. Continuous Agent Readability Audits
To maintain "Welcoming" status, the codebase is subject to automated accessibility and readability tests.

- **Automated Verification:** Use `tests/agent_readability_test.py` to simulate a "headless" agent crawl and verify that data remains clean and structured.
- **System Documentation:** The `README.md` acts as the high-level map that agents read first to understand the project's architecture and purpose.
- **Benchmark Checks:** Regularly test the site against agent-readability benchmarks as defined in the system-wide audit guides.
