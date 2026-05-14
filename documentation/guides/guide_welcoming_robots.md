---
name: guide_welcoming_robots.md
purpose: description of how to make the data (excluding backend functions) welcoming to AI
version: 1.2.0
dependencies: [data_schema.md, module_sitemap.md, url_slug_restructure.md]
---

# Guide to Making Data Welcoming to AI

This guide is the source of truth of making it easy for AI to understand and use the historical data about Jesus, the resource lists, the context essays, responses to challenges, news items and blog posts.

## 1. MCP Server & Structured Access
The `mcp_server.py` is the primary "front door" for AI agents. It bypasses the visual UI to provide raw, clean JSON data directly from the SQLite database.

- **Tools for Discovery:** It exposes specific tools like `get_record(slug)` architectures which allow an agent to retrieve the full content, bibliography, and context links of any item without "visual" noise.
- **Low-Token Context:** By stripping away CSS and repetitive navigation, the MCP server ensures that the data fits efficiently into an LLM's context window.
- **Agent Instructions:** The `.agent/` directory provides embedded logic and workflow definitions to ensure external agents understand the system's capabilities.

### 1a. Connecting an MCP Client

The MCP server runs as a systemd service (`deployment/mcp.service`) on the VPS, but external AI agents don't connect to it over the network — they spawn it as a local subprocess via **stdio transport**. The agent's MCP client (Claude Desktop, a DeepSeek client, or any MCP host) must be configured with the command that launches `mcp_server.py`.

**Discovery mechanism:** Once the client spawns the server, the MCP protocol's `tools/list` capability announces all available tools (`list_records`, `get_record`, `query_encyclopedia_by_era`, `search_records`) and their input schemas to the agent automatically. No manual tool registration is needed.

**Client configuration (Claude Desktop example):**

Place an entry like the following in your MCP client's config file:

- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Other clients:** Consult their documentation for the config path and format.

```json
{
  "mcpServers": {
    "the-jesus-website": {
      "command": "/var/www/thejesuswebsite/venv/bin/python",
      "args": ["/var/www/thejesuswebsite/mcp_server.py"]
    }
  }
}
```

For local development (run from the project root so `database/database.sqlite` resolves):

```json
{
  "mcpServers": {
    "the-jesus-website": {
      "command": "python",
      "args": ["mcp_server.py"]
    }
  }
}
```

A reference config file is available at `deployment/mcp_client_config.json` — copy it to your client's config directory and adjust paths.

> **Note on security:** The MCP server provides read-only access to public archive data only (see `documentation/guides/guide_security.md` §10 for the full access policy). No authentication key is required because the server enforces type/column filtering at the query layer and provides zero write access.

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
