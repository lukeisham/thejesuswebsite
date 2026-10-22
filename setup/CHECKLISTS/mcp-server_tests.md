## Validation: MCP Streamable HTTP Transport
**Plan:** mcp-streamable-http.md
**Date:** 2026-07-08

### Manual checks
- [ ] `curl https://www.thejesuswebsite.org/mcp` returns a valid MCP response (or at minimum doesn't 404)
- [ ] `curl https://www.thejesuswebsite.org/mcp/health` returns `{"status":"ok"}` with a 200
- [ ] An MCP client (Claude Desktop, Zed) can connect to `https://www.thejesuswebsite.org/mcp` and list tools
- [ ] Calling `searchEvidence` with `{"query":"baptism"}` through the hosted endpoint returns ranked results
- [ ] The existing stdio entry point (`node server.js`) still works for local development
- [ ] The nginx rate limiter applies to `/mcp` requests (rapid-fire tool calls get 429s)

### Code-review checks
- [ ] SR-2 — No new dependencies added to `package.json`. Only Node built-in `http` module used for the server wrapper.
- [ ] JS-2 — Invalid HTTP requests to `/mcp` don't crash the server. Non-MCP requests return appropriate error responses.
- [ ] JS-3 — The HTTP wrapper is minimal (no Express, no middleware stack, just `http.createServer`).
- [ ] JS-5 — Server startup, transport connection, and health endpoint all use async/await with try/catch.
- [ ] `deploy.sh` — MCP server process management mirrors the API pattern (pm2, same restart logic).
- [ ] `nginx.conf` — `/mcp` location block is inside the existing SSL server block, reuses rate-limit zone, doesn't expose the MCP server directly.

## Validation: Timeline Era & Period Refactor (MCP Server)
**Plan:** timeline-era-period-refactor.md
**Date:** 2026-07-09

### Manual checks
- [ ] Calling `getTimelineEvents` with `{ "era": "PreIncarnation" }` returns events and appends `?timeline_era=PreIncarnation` to the API path.
- [ ] Calling `getTimelineEvents` with `{ "era": "PassionWeek" }` works, as does calling with no era param (returns full timeline).
- [ ] `cd mcp-server && npm test` passes.

### Code-review checks
- [ ] JS-2 — The tool rejects an unknown era parameter gracefully (if it validates; or passes through to the API which rejects via CHECK).
- [ ] SR-1 — No tool logic changed beyond the era parameter validation/documentation.
