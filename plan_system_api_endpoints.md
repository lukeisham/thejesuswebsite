---
name: plan_system_api_endpoints
version: 1.0.0
module: 7.0 — System
status: complete
created: 2026-05-05
---

# Plan: plan_system_api_endpoints

## Purpose

> Resolve the last open issue (#12) in `plan_issues.md` by implementing the four missing API endpoints in `admin/backend/admin_api.py` that the System dashboard frontend already calls. Two endpoints — test execution (`POST /api/admin/tests/run`) and service restart (`POST /api/admin/services/restart`) — are implemented as fully functional routes backed by existing test scripts and systemd units. The remaining two — docs open (`POST /api/admin/docs/open`) and agent generation (`POST /api/admin/agents/generate`) — are stubbed with HTTP 501 responses and clear messages so the frontend no longer fails silently against nonexistent routes. This plan touches only the backend API file, the sitemap's API Route Registry, and `plan_issues.md`.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Implement `POST /api/admin/tests/run` endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add a new `POST /api/admin/tests/run` route (protected by `Depends(verify_token)`) that accepts an optional `?suite=` query param (`all` | `api` | `agent` | `port`, default `all`), maps each suite to the corresponding test scripts in `tests/` (`port_test.py`, `security_audit.py`, `agent_readability_test.py`), spawns them via `subprocess.run()` with a 30-second timeout each, captures stdout/stderr, and returns `{ "status": "completed", "results": [{ "name": str, "passed": bool, "message": str }], "summary": str }` matching the shape `test_execution_logic.js` already parses.
- **Vibe Rule(s):** Explicit readable logic · stateless and safe to run repeatedly · document API quirks inline

- [x] Task complete

---

### T2 — Implement `POST /api/admin/docs/open` stub endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add a `POST /api/admin/docs/open` route (protected by `Depends(verify_token)`) that returns HTTP `501` with body `{ "message": "Documentation editor is not yet implemented.", "url": null }` and a clear inline comment marking it as a placeholder for a future plan; the frontend `handleViewEditDocs()` already handles non-2xx responses gracefully via its catch block.
- **Vibe Rule(s):** Explicit readable logic · document as placeholder

- [x] Task complete

---

### T3 — Implement `POST /api/admin/agents/generate` stub endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add a `POST /api/admin/agents/generate` route (protected by `Depends(verify_token)`) that returns HTTP `501` with body `{ "message": "Agent generation workflow is not yet implemented.", "agents_created": 0 }` and a clear inline comment marking it as a placeholder for a future plan; the frontend `handleGenerateAgents()` already handles non-2xx responses gracefully.
- **Vibe Rule(s):** Explicit readable logic · document as placeholder

- [x] Task complete

---

### T4 — Implement `POST /api/admin/services/restart` endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Add a `POST /api/admin/services/restart` route (protected by `Depends(verify_token)`) that returns HTTP `200` with `{ "message": "Services restart initiated.", "service": "admin.service" }` immediately, then spawns a daemon thread that sleeps 1 second (allowing the HTTP response to flush) before running `sudo systemctl restart admin.service` via `subprocess.run()` with a 5-second timeout; the frontend `handleRestartServices()` already waits 3 seconds before calling `location.reload()`, so the timing aligns.
- **Vibe Rule(s):** Explicit readable logic · document the timing/detachment pattern inline

- [x] Task complete

---

### T5 — Update API Route Registry in sitemap

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** Add four new rows to the "System & Agent" API Route Registry table (currently ending around line 642) for `POST /api/admin/tests/run`, `POST /api/admin/docs/open` (marked as `stub`), `POST /api/admin/agents/generate` (marked as `stub`), and `POST /api/admin/services/restart`.
- **Vibe Rule(s):** N/A (documentation file)

- [x] Task complete

---

### T6 — Mark issue #12 as resolved in plan_issues.md

- **File(s):** `plan_issues.md`
- **Action:** Change Issue #12 Status from `OPEN` to `RESOLVED` and update its Resolution column to summarize the four endpoints added and reference this plan (`plan_system_api_endpoints.md`).
- **Vibe Rule(s):** N/A (documentation file)

- [x] Task complete

---

## Final Tasks

### T7 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### Python
 - [x] All four endpoint functions use `Depends(verify_token)` for admin session protection
 - [x] Logic is explicit and self-documenting — no overly clever or compact tricks
 - [x] Subprocess calls use timeouts and proper error handling (try/except around `subprocess.run`)
 - [x] Stub endpoints are clearly commented as placeholders for future plans
 - [x] The service-restart endpoint documents the delayed-daemon-thread pattern inline
 - [x] The test-run endpoint documents the suite-to-script mapping inline

#### SQL / Database
 - [x] No database changes — N/A for this plan

---

### T8 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

 - [x] **Achievement**: All four missing endpoints exist in `admin_api.py` — tests/run and services/restart are functional; docs/open and agents/generate return honest 501 stubs
 - [x] **Necessity**: The System dashboard buttons (`test_execution_logic.js`, `agent_generation_controls.js`) no longer fail silently against nonexistent routes
 - [x] **Targeted Impact**: Only `admin/backend/admin_api.py`, `documentation/detailed_module_sitemap.md`, and `plan_issues.md` were modified — no frontend changes needed
 - [x] **Scope Control**: No scope creep — only the four endpoints listed in issue #12 were implemented; no additional routes, no frontend rewrites, no new files

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add four new rows to the System & Agent API Route Registry table for `POST /api/admin/tests/run`, `POST /api/admin/docs/open` (stub), `POST /api/admin/agents/generate` (stub), and `POST /api/admin/services/restart` |
| `documentation/simple_module_sitemap.md` | No | Module scope and high-level structure unchanged |
| `documentation/site_map.md` | No | No new files added to the codebase |
| `documentation/data_schema.md` | No | No new tables, columns, or relationships introduced |
| `documentation/vibe_coding_rules.md` | No | No rules were ambiguous or needed clarification during this plan |
| `documentation/style_mockup.html` | No | No new page layouts or visual changes introduced |
| `documentation/git_vps.md` | No | Deployment workflow unchanged — the services/restart endpoint uses the existing `deployment/admin.service` systemd unit |
| `documentation/guides/guide_appearance.md` | No | No new public-facing pages or UI components |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard UI components, layout, or visual changes |
| `documentation/guides/guide_function.md` | No | No new logic flows — endpoints are straightforward subprocess wrappers around existing scripts |
| `documentation/guides/guide_security.md` | No | All four endpoints use the existing `Depends(verify_token)` dependency; no new auth, session, or rate-limiting logic |
| `documentation/guides/guide_style.md` | No | No CSS patterns or design tokens introduced |
| `documentation/guides/guide_maps.md` | No | Unrelated to map display or data logic |
| `documentation/guides/guide_timeline.md` | No | Unrelated to timeline display or data logic |
| `documentation/guides/guide_donations.md` | No | Unrelated to external support integrations |
| `documentation/guides/guide_welcoming_robots.md` | No | Unrelated to SEO, robots.txt, or AI-accessibility standards |

### Documentation Checklist
 - [x] All affected documents identified in the table above
 - [x] Each "Yes" row has been updated with accurate, current information
 - [x] No document contains stale references to files or logic changed by this plan
 - [x] Version numbers incremented where frontmatter versioning is present
