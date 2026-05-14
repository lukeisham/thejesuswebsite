---
name: mcp_server_operational
version: 1.0.0
module: 7.0 — System Module
status: draft
created: 2026-05-14
---

# Plan: mcp_server_operational

## Purpose

> Rewrite `mcp_server.py` into a fully operational MCP server that provides external AI agents (Claude, DeepSeek, etc.) read-only access to the SQLite archive via the stdio transport. The server must expose only content-type records (`record`, `context_essay`, `historiographical_essay`, `theological_essay`, `spiritual_article`, `challenge_response`, `blog_post`, `challenge_academic`, `challenge_popular`, `wikipedia_entry`, `news_article`) from the `records` table, explicitly exclude the `users` column (SPA routing data) and `system_data` type, and provide zero access to the `system_config` and `agent_run_log` tables. The existing `--transport stdio` default is correct; the deployment systemd service must be updated to match. All existing tools (`list_records`, `get_record`, `query_encyclopedia_by_era`) must be updated with proper type/column filtering, and a new `search_records` tool should be added for keyword-based lookup across titles and snippets.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Update `list_records` tool with type filtering and column exclusion

- **File(s):** `mcp_server.py`
- **Action:** Update the `list_records()` tool to explicitly filter `WHERE type NOT IN ('system_data')` and select only public-safe columns — exclude `users`. Keep existing fields (`id`, `title`, `slug`, `era`, `timeline`) and add `type`, `status`, `created_at`. Also exclude `system_config` and `agent_run_log` tables entirely (no tools reference them).
- **Vibe Rule(s):** Explicit logic · Document API quirks inline · snake_case fields

- [ ] Task complete

---

### T2 — Update `get_record` tool with type filtering and column exclusion

- **File(s):** `mcp_server.py`
- **Action:** Update the `get_record(slug)` tool to replace `SELECT *` with an explicit column list that excludes `users`. Add a `WHERE type NOT IN ('system_data')` clause so even if a slug somehow matches a system record, it won't be returned. Ensure the returned JSON includes all public content columns (`id`, `title`, `slug`, `snippet`, `body`, `type`, `status`, `era`, `timeline`, `map_label`, `geo_id`, `gospel_category`, `picture_name`, `created_at`, `updated_at`, `bibliography`, `context_links`, `iaa`, `pledius`, `manuscript`, `url`, `page_views`, `parent_id`, `metadata_json`).
- **Vibe Rule(s):** Explicit logic · Document API quirks inline · snake_case fields

- [ ] Task complete

---

### T3 — Update `query_encyclopedia_by_era` tool with type filtering

- **File(s):** `mcp_server.py`
- **Action:** Update `query_encyclopedia_by_era(era)` to add `WHERE type NOT IN ('system_data')` to its query. Keep the existing selected columns (`title`, `slug`, `map_label`).
- **Vibe Rule(s):** Explicit logic · Document API quirks inline

- [ ] Task complete

---

### T4 — Add `search_records` tool for keyword-based lookup

- **File(s):** `mcp_server.py`
- **Action:** Add a new `@mcp.tool()` function `search_records(query: str)` that performs a `LIKE` search across `title` and `snippet` columns, filtered to exclude `system_data` type and exclude the `users` column. Return up to 20 results with fields: `id`, `title`, `slug`, `type`, `snippet` (first 200 chars), `created_at`. Use parameterised queries to prevent injection.
- **Vibe Rule(s):** Explicit logic · Document API quirks inline · snake_case fields

- [ ] Task complete

---

### T5 — Remove mock FastMCP fallback

- **File(s):** `mcp_server.py`
- **Action:** Remove the `try/except ImportError` mock-fallback wrapper for FastMCP. The server is now operational — if `mcp` is not installed, the import should fail hard with a clear error. Keep only the real `from mcp.server.fastmcp import FastMCP` import. The `--transport` argument parsing and `if __name__ == "__main__":` block remain unchanged.
- **Vibe Rule(s):** Explicit logic · Stateless and safe to run repeatedly

- [ ] Task complete

---

### T6 — Update deployment systemd service for stdio transport

- **File(s):** `deployment/mcp.service`
- **Action:** Update `ExecStart` to remove the `--transport sse` flag since `stdio` is now the default. The stdio transport doesn't bind to a port, so update the service description to reflect it communicates via stdin/stdout rather than HTTP. Remove any port/network references.
- **Vibe Rule(s):** Readability First · Explicit logic

- [ ] Task complete

---

### T7 — Update `mcp_monitor.js` dashboard widget

- **File(s):** `js/7.0_system/dashboard/mcp_monitor.js`
- **Action:** Review the dashboard MCP monitor widget. Since the server now runs on stdio (not SSE/HTTP), the monitor's polling/status logic may need updating. If it currently polls an HTTP endpoint for health, remove or disable that polling and replace it with a static status indicator noting the server runs on stdio transport. Update the 3-line header comment and bump version.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

### T8 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

#### JavaScript (mcp_monitor.js if changed)
- [ ] One function per file (or tightly-related group for a single widget/component)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks

---

### T9 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: All existing MCP tools (`list_records`, `get_record`, `query_encyclopedia_by_era`) properly filter out `system_data` type and exclude the `users` column
- [ ] **Achievement**: `system_config` and `agent_run_log` tables are not exposed through any tool
- [ ] **Achievement**: New `search_records` tool allows keyword-based lookup across public content
- [ ] **Achievement**: Server uses stdio transport by default with no SSE/HTTP dependency
- [ ] **Achievement**: Mock fallback wrapper removed — server fails hard if `mcp` package is missing
- [ ] **Achievement**: Deployment systemd service updated for stdio transport
- [ ] **Necessity**: External AI agents have safe, read-only, filtered access to the archive
- [ ] **Targeted Impact**: Only `mcp_server.py`, `deployment/mcp.service`, and potentially `mcp_monitor.js` were affected
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T10 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change. Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | MCP server subsection already added in previous plan — no file-structure changes |
| `documentation/simple_module_sitemap.md` | No | MCP server submodule already added in previous plan |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No schema changes — access policy is enforced at the application layer, not the schema |
| `documentation/vibe_coding_rules.md` | No | No rule changes needed |
| `documentation/style_mockup.html` | No | No visual changes |
| `documentation/git_vps.md` | No | No deployment workflow changes |
| `documentation/guides/guide_appearance.md` | No | MCP server has no public-facing UI |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard UI changes |
| `documentation/guides/guide_function.md` | Yes | Add an ASCII logic-flow diagram documenting the MCP server's data flow: external agent → stdio → FastMCP tool dispatch → filtered SQL queries (type/column exclusions applied at query level) → JSON response → agent |
| `documentation/guides/guide_security.md` | Yes | Add a note documenting the read-only access policy: which types/columns/tables are excluded, that queries use parameterised injection-safe SQL, and that the server provides zero write access |
| `documentation/guides/guide_style.md` | No | No CSS changes |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO changes |

- [ ] **All site-map documents updated:** No changes needed — MCP server already documented in both sitemaps
- [ ] **All ASCII diagrams updated:** `guide_function.md` updated with MCP server data-flow diagram
- [ ] **Security guide updated:** `guide_security.md` documents the read-only access policy
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
