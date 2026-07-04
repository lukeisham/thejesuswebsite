## Validation: MCP Server
**Plan:** mcp-server.md
**Date:** 2026-06-29

### Manual checks
- [ ] `cd mcp-server && npm install` installs `@modelcontextprotocol/sdk` without errors
- [ ] Starting the server (`node server.js`) connects over stdio and lists all seven tools
- [ ] An MCP client (e.g. inspector) can call `searchEvidence` and receives ranked matches from the live API
- [ ] `getItemBySlug` / `getEssayBySlug` / `getBlogPostBySlug` / `getNewsArticleBySlug` return the correct published record for a known slug
- [ ] `getTimelineEvents` returns events (and filters by era when supplied)
- [ ] `getMapData` returns a map plus its pins for a valid `mapKey`
- [ ] A draft (unpublished) slug returns no content — only published items are exposed
- [ ] A bad/missing argument returns a clean MCP error, not a crash

### Code-review checks
- [ ] Run `cd mcp-server && node --test tests/tools.test.js` — input-validation + request-building tests pass
- [ ] SR-1 — one tool per file under `tools/`; `server.js` only registers tools + starts transport
- [ ] JS-2 — every tool validates its arguments and returns explicit errors on bad input / upstream failure
- [ ] JS-5 — upstream calls use `async/await` + `try/catch`; the raw `fetch` is centralised in one shared request helper
- [ ] JS-4 — each tool has JSDoc describing its input schema and purpose
- [ ] No write tools and no admin/auth credentials — read-only, published-only
- [ ] Tool endpoint URLs verified against `api/routes/*` (slug route shapes match)
- [ ] SR-2 deviation (MCP SDK) is the only non-visual dependency and is documented (see Issues.md)
