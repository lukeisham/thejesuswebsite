---
name: plan_issues.md
version: 1.0.0
purpose: Cross-plan issue logger — captures conflicts, gaps, missing dependencies, and implementation issues discovered during plan execution
created: 2026-05-02
---

# Plan Issue Log

> **What this is:** A running log of issues, conflicts, gaps, and unresolved questions that arise during plan implementation. Each plan's agent appends to this file at the end of execution.
>
> **What this is not:** A task tracker or to-do list. It does not replace checkboxes inside individual plans. It captures only cross-cutting or plan-level issues that need visibility across the project.

---

## Issue Table

| # | Plan | Severity | Category | Description | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `plan_dashboard_login_and_shell.md` | Medium | Documentation Drift | `documentation/dashboard_refractor.md` login ASCII diagram still shows a `Username: [_______]` field, but `guide_security.md` §3 specifies password-only authentication against `ADMIN_PASSWORD` in `.env`. The refractor doc also references `admin_login.js` while the plan uses `admin.js` — a file naming mismatch across the whole dashboard subsystem. | The plan was updated to remove the username field and document the password-only flow. `dashboard_refractor.md` needs a separate pass to realign its file names and diagrams. | RESOLVED |
| 2 | `plan_dashboard_login_and_shell.md` | Medium | Nomenclature Drift | `plan_dashboard_login_and_shell.md` and `documentation/dashboard_refractor.md` use different file names for the same components: the plan uses `dashboard_orchestrator.js`, `dashboard_universal_header.js`, `display_dashboard_cards.js`; `guide_security.md` §3 references `admin_login.js`, `dashboard_auth.js`, `load_middleware.js`, `return_to_site.js`, `logout_middleware.js`. The naming convention needs to be unified across all plans and docs. | Unresolved — file names in the plan were preserved as-is for now. A project-wide naming audit should decide the canonical names. | RESOLVED |
| 3 | `plan_backend_infrastructure.md` | Low | Implementation Issue | `news_search_term` column already existed in the live `database/database.sqlite` at the time of execution. T1's first sub-task was a no-op. No migration was needed for this column. | Schema verified — column was already present. No action required. | RESOLVED |
| 4 | `plan_backend_infrastructure.md` | Medium | Gap | `resource_lists` table was defined in `database/database.sql` but missing from the live SQLite database. This gap was discovered during schema verification. The `tools/migrate_schema.py` script created it alongside the new `system_config` and `agent_run_log` tables. | Table created via migration script. All consuming plans (records_all, arbor) will now find the table present. | RESOLVED |
| 5 | `plan_backend_infrastructure.md` | Low | Implementation Issue | The T8 `POST /api/admin/agent/run` endpoint and `agent_client.py::search_web()` both inserted `agent_run_log` rows independently, causing duplicate rows per agent run. | Fixed: `search_web()` now accepts an optional `run_id` parameter. When called from the API endpoint, the pre-inserted run_id is passed through. When called directly (standalone), it creates its own row. | RESOLVED |
| 6 | `plan_dashboard_essay_historiography.md` | Low | Implementation Issue | `admin/frontend/dashboard.html` now loads all 5 shared tools from `js/2.0_records/dashboard/` and all 5 essay/historiography module scripts at page load. Future plans (`plan_dashboard_blog_posts`, `plan_dashboard_challenge_response`) that consume the same shared tools should NOT re-add duplicate `<script>` tags. They only need to add their own module-specific scripts. The shared tools are already loaded once. | Shared tools loaded once in `dashboard.html`. Future plans should check for existing `<script>` tags before adding. | RESOLVED |
| 7 | `plan_dashboard_challenge.md` | Medium | Implementation Issue | `get_all_records` in `admin_api.py` returned only 6 columns (`id, title, slug, primary_verse, era, timeline`). The Challenge dashboard needed all record columns to filter and sort by challenge-specific fields (`academic_challenge_title`, `popular_challenge_rank`, etc.). | Changed query from explicit column list to `SELECT * FROM records` in `admin_api.py`. Consuming plans (Wikipedia, Challenge Response) that also call `GET /api/admin/records` now receive all columns — verify they handle the wider response shape. | RESOLVED |
| 8 | `plan_dashboard_challenge.md` | Low | Documentation Drift | Plan T7 specifies `insert_challenge_response.js` sends `{"challenge_id": <parent_challenge_id>, "status": "draft"}` but the actual `POST /api/admin/responses` endpoint expects `{"parent_slug": str, "title": str}`. | Used the actual API contract (`parent_slug` + `title`). The plan's documented payload shape is outdated. | RESOLVED |
| 9 | `plan_dashboard_wikipedia.md` | Low | Nomenclature Drift | The database schema (`database/database.sql`) uses `wikipedia_search_term` (singular) while the plan references `wikipedia_search_terms` (plural) throughout T5, T7, and the purpose summary. | Implementation used the actual schema column name `wikipedia_search_term`. The plan's documented plural form should be updated to the canonical singular form. | RESOLVED |

---

## Field Reference

| Field | Description |
| :--- | :--- |
| **#** | Auto-incrementing issue number |
| **Plan** | The plan file name (`plan_dashboard_login_and_shell.md`, etc.) that surfaced the issue |
| **Severity** | `Critical` — blocks implementation or breaks another plan · `High` — requires coordination with another plan's agent · `Medium` — non-blocking but should be addressed · `Low` — informational / future cleanup |
| **Category** | `Conflict` — two plans claim ownership of the same file or logic · `Gap` — missing file, dependency, or logic not covered by any plan · `Missing Dependency` — a dependency referenced by a plan but not owned by any existing plan · `Implementation Issue` — a problem discovered during execution (e.g., API shape mismatch, missing route) · `Documentation Drift` — a guide or reference doc contradicts a plan's implementation · `Nomenclature Drift` — the same file, function, or concept is referred to by different names across plans, docs, or guides (e.g., `admin.js` vs `admin_login.js`) |
| **Description** | What was discovered, plus specific file paths or plan references |
| **Resolution** | How it was resolved (or `Unresolved` if still open). Include the commit or PR reference if applicable. |
| **Status** | `Open` · `In Progress` · `Resolved` · `Won't Fix` |

---

## Agent Instructions

> **When to log:** At the end of every plan execution, the agent reviews the plan's T12 (Vibe-Coding Audit) and T13 (Purpose Check) results. If any issues were discovered during implementation that affect other plans or the project at large, the agent appends a row to the Issue Table above.

1. **Before logging**, check the existing table to avoid duplicates.
2. **Assign the next sequential `#`** (the first issue is `1`).
3. **Be specific** in the Description — include exact file paths, plan names, and the nature of the mismatch.
4. **If resolved during the same plan**, mark it `Resolved` and describe the resolution.
5. **If unresolved**, mark it `Open` so the next agent or the user can address it.
6. **Do not log** issues that are purely internal to a single plan and have no impact outside it. Those belong in the plan's own task checkboxes.

| 10 | `plan_dashboard_news_sources.md` | Low | Nomenclature Drift | Plan T5 task description references `search_keywords_handler.js` but the File Inventory and detailed_module_sitemap.md both use `news_sources_sidebar_handler.js` as the canonical filename. | Implementation used the File Inventory name (`news_sources_sidebar_handler.js`). The plan T5 title should be updated to match. | RESOLVED |
| 11 | `plan_dashboard_news_sources.md` | Low | Documentation Drift | Plan T8 references a `news_sources` TABLE for reading source URLs, but the database schema only has `news_sources` as a TEXT COLUMN on the `records` table. | Pipeline reads from `records` table WHERE `news_sources IS NOT NULL`. The plan T8 description should be updated to reference the column, not a table. | RESOLVED |
| 12 | `plan_dashboard_system.md` | Medium | Missing Dependency | `test_execution_logic.js` calls `POST /api/admin/tests/run` to trigger test suites, but this endpoint does not exist in `admin/backend/admin_api.py`. The endpoint needs to be implemented to spawn `tests/port_test.py`, `tests/security_audit.py`, and `tests/agent_readability_test.py` as subprocesses and return their output. | Implemented by plan_system_api_endpoints.md: added POST /api/admin/tests/run (spawns test scripts), POST /api/admin/services/restart (restarts systemd unit), and 501 stubs for docs/open + agents/generate. All four routes now exist in admin_api.py. | RESOLVED |
