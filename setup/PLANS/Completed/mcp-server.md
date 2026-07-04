# Plan: MCP Server — AI Integration Layer

**Module(s):** MCP Server
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build the project's 5th module: a Model Context Protocol server that exposes the site's published content to AI assistants as read-only tools. It wraps the existing public API endpoints — search, item/essay/blog/news lookup by slug, timeline events, and map data — so an MCP client can query the scholarly content programmatically.

## Coding rules to keep in mind
- **JS-1 / JS-3** — Clear, intention-revealing names; small focused tool modules; modern JS, no needless abstraction.
- **JS-2** — Validate every tool's input arguments; return explicit MCP error responses on bad input or upstream failure; never fail silently.
- **JS-5** — Each tool's upstream call uses `async/await` + `try/catch`; centralise the raw `fetch` to the API in one shared request helper rather than repeating it per tool.
- **JS-4** — JSDoc each tool's input schema and purpose; comments explain "why", not "what".
- **SR-1** — One tool per file under `tools/`; `server.js` only registers tools and starts the transport.
- **SR-2** — Exception (documented): the MCP SDK is a non-visual dependency, required because this module *is* the MCP protocol implementation. See Notes + Issues.md.

## Tasks

### Package & server

- [x] **Create the MCP server package manifest** — `package.json` declaring the module, `type: module`, the `@modelcontextprotocol/sdk` dependency, the API base-URL env var, and a `test` script. File: `mcp-server/package.json`
- [x] **Create the MCP server entry point** — instantiate the MCP server, register all seven tools, and connect the stdio transport; read the API base URL from the environment with a sensible default. File: `mcp-server/server.js`

### Tools (one file each)

- [x] **Create the search tool** — `searchEvidence(query, limit?)` → `GET /search`; returns ranked evidence matches. File: `mcp-server/tools/searchEvidence.js`
- [x] **Create the item lookup tool** — `getItemBySlug(slug)` → `GET /evidence/:slug`; returns the full published evidence record. File: `mcp-server/tools/getItemBySlug.js`
- [x] **Create the essay lookup tool** — `getEssayBySlug(slug)` → `GET /essays/:slug`; returns the published contextual essay. File: `mcp-server/tools/getEssayBySlug.js`
- [x] **Create the blog lookup tool** — `getBlogPostBySlug(slug)` → `GET /blog-posts/:slug`; returns the published blog post. File: `mcp-server/tools/getBlogPostBySlug.js`
- [x] **Create the news lookup tool** — `getNewsArticleBySlug(slug)` → `GET /news-articles/:slug`; returns the news article metadata + source URL. File: `mcp-server/tools/getNewsArticleBySlug.js`
- [x] **Create the timeline tool** — `getTimelineEvents(era?)` → `GET /timeline`; returns timeline events, optionally filtered by era. File: `mcp-server/tools/getTimelineEvents.js`
- [x] **Create the map data tool** — `getMapData(mapKey)` → `GET /maps/:mapKey`; returns the map plus its pins. File: `mcp-server/tools/getMapData.js`

### Automated tests

- [x] **Write MCP tool tests** — `node:test` + `node:assert` tests for each tool's pure input-validation and request-URL/params building (mock or inject the fetch helper; assert correct endpoint, query params, and error handling on bad input). File: `mcp-server/tests/tools.test.js`

## Files touched
- `mcp-server/package.json` — created
- `mcp-server/server.js` — created
- `mcp-server/tools/searchEvidence.js` — created
- `mcp-server/tools/getItemBySlug.js` — created
- `mcp-server/tools/getEssayBySlug.js` — created
- `mcp-server/tools/getBlogPostBySlug.js` — created
- `mcp-server/tools/getNewsArticleBySlug.js` — created
- `mcp-server/tools/getTimelineEvents.js` — created
- `mcp-server/tools/getMapData.js` — created
- `mcp-server/tests/tools.test.js` — created

## Notes
- **SR-2 deviation (logged to Issues.md)**: SR-2 restricts external dependencies to visual/display libraries. The MCP server necessarily depends on `@modelcontextprotocol/sdk` because the module's entire purpose is to speak the MCP protocol. This is a separate backend module, not part of the performance-critical website bundle, so it does not affect site load speed (SR-3). Flagging for explicit sign-off.
- **Read-only & published-only**: every tool returns only published content — it relies on the public API's existing `published_draft` filtering; the MCP server holds no admin/auth credentials and exposes no write tools.
- **Transport**: stdio transport for v1 (local AI-client integration). An HTTP transport can be added later without changing the tool modules.
- **API coupling**: tools call the API over HTTP via the shared request helper rather than importing `api/models` directly, keeping the MCP module decoupled from the API's internals. Confirm the exact lookup-by-slug route shapes against `api/routes/*` during implementation (e.g. `/evidence/:slug` vs `/evidence/single/:slug`); adjust the tool URLs to match.
- **Why a code-facing test task**: this plan creates `.js` under `mcp-server/`, so per the plan skill an automated test is mandatory — covered by `mcp-server/tests/tools.test.js`.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
