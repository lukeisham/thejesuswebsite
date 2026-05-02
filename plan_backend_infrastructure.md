---
name: plan_backend_infrastructure
version: 1.0.0
module: 7.0 — System (Backend)
status: draft
created: 2026-05-02
---

# Plan: plan_backend_infrastructure

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the essential backend infrastructure and shared utilities required by the entire Admin Dashboard refactor. It adds the `news_search_term` column to the `records` table, establishes the `system_config` and `agent_run_log` tables, implements the automated `snippet_generator.py`, `metadata_generator.py`, and DeepSeek-powered `agent_client.py` scripts for editorial efficiency and web-search article discovery, and expands the `admin_api.py` with the missing endpoints for News, Blog, Essays, Historiography, Challenge Responses, and Agent run/log management. This foundation is critical for ensuring that the high-level dashboard modules have a reliable and fully-functional API to interface with during their respective implementation phases.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **SQL** | `database/database.sqlite` | Add `news_search_term` column to `records` + create `system_config` and `agent_run_log` tables |
| **Python** | `backend/scripts/snippet_generator.py` | Shared utility: DeepSeek-powered archival abstract generation |
| **Python** | `backend/scripts/metadata_generator.py` | Shared utility: DeepSeek-powered SEO/Keyword extraction |
| **Python** | `backend/scripts/agent_client.py` | Shared utility: DeepSeek API client for web-search article discovery, snippet generation, and metadata generation |
| **Python** | `admin/backend/admin_api.py` | Central API: Expand with planned CRUD endpoints + agent run/log routes |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `database/database.sqlite` | `plan_backend_infrastructure` (this plan) | T1 modifies the live database schema; all other plans depend on the resulting schema being correct before their tasks begin |
| `database/database.sql` | `plan_backend_infrastructure` (this plan) | T1 must keep `database.sql` in sync with any schema changes applied to `database.sqlite` |
| `admin/backend/auth_utils.py` | `plan_dashboard_login_shell` | T4–T9 API endpoints must call auth helpers for session verification on every protected route |
| `documentation/data_schema.md` | (source of truth) | T1 schema changes must match the field definitions in `data_schema.md`; any drift must be resolved before marking T1 complete |
| `.env` (`DEEPSEEK_API_KEY`) | (existing project secret) | T2 agent_client.py reads this env var for DeepSeek API authentication |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Implement System Configuration Table & News Search Field

- **File(s):** `database/database.sqlite`
- **Action:**
  1. Add `news_search_term` (TEXT, JSON Blob) column to the `records` table — stores per-record search keywords used by the news crawler.
  2. Create the `system_config` table with `key` (TEXT PK) and `value` (TEXT) columns. Leave empty — populated at runtime for global configuration not tied to any single record.
  3. Create the `agent_run_log` table to track every DeepSeek agent pipeline execution:
     - `id` (INTEGER PK AUTOINCREMENT)
     - `pipeline` (TEXT NOT NULL) — e.g. `'academic_challenges'`, `'popular_challenges'`
     - `record_slug` (TEXT) — the slug of the record being processed (NULL for batch runs)
     - `status` (TEXT NOT NULL) — `'running'`, `'completed'`, `'failed'`
     - `trace_reasoning` (TEXT) — the agent's chain-of-thought reasoning log
     - `articles_found` (INTEGER DEFAULT 0) — count of articles discovered
     - `tokens_used` (INTEGER DEFAULT 0) — total tokens consumed
     - `error_message` (TEXT) — NULL unless status is `'failed'`
     - `started_at` (TEXT NOT NULL) — ISO-8601 timestamp
     - `completed_at` (TEXT) — ISO-8601 timestamp, NULL while running
  > **Note:** `news_sources`, `news_items`, and `news_search_term` all live as columns on the `records` table per the data schema. The `system_config` table holds configuration that is truly global (e.g. site-wide settings), not per-record news data. The `agent_run_log` table stores traceable execution history for every agent pipeline trigger.
- **Vibe Rule(s):** snake_case fields · Explicit queries

- [ ] Task complete

---

### T2 — Implement Snippet Generator Script

- **File(s):** `backend/scripts/snippet_generator.py`
- **Action:** Implement the automated snippet generation logic using the DeepSeek API via `agent_client.py`. The script must:
  1. Accept a text block (Markdown/HTML) and the record `slug`.
  2. Call `agent_client.generate_snippet(content: str, slug: str) -> str` which sends a structured prompt to the DeepSeek Chat Completions API requesting a concise, archival-quality summary (2–3 sentences) in the project's scholarly tone.
  3. Log the generation to `agent_run_log` with `pipeline = 'snippet_generation'` and `record_slug` set, recording `trace_reasoning` and `tokens_used`.
  4. Return the generated snippet string (the JS frontend then saves it to the record).
- **Dependencies:** `backend/scripts/agent_client.py`, `.env` (`DEEPSEEK_API_KEY`), `database/database.sqlite` (`agent_run_log` table)
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence · API quirks documented inline

- [ ] Task complete

---

### T2a — Implement DeepSeek Agent Client Script

- **File(s):** `backend/scripts/agent_client.py`
- **Action:** Implement the shared DeepSeek API client used by all agent-powered scripts (challenge pipelines, snippet generator, metadata generator). The client must:
  1. Read `DEEPSEEK_API_KEY` from `.env`.
  2. Provide three public functions:
     - `search_web(search_terms, record_slug, pipeline)` — Web-search enabled DeepSeek call for article discovery with relevance scores. Logs chain-of-thought reasoning and token usage to agent_run_log. Returns dict with articles, trace_reasoning, tokens_used.
     - `generate_snippet(content, slug)` — Non-search DeepSeek call requesting a 2-3 sentence archival-quality summary in scholarly tone. Logs to agent_run_log with pipeline = snippet_generation. Returns string.
     - `generate_metadata(content, slug)` — Non-search DeepSeek call requesting 5-10 SEO keywords and a meta-description (max 160 chars). Logs to agent_run_log with pipeline = metadata_generation. Returns dict with keywords and meta_description.
  3. All three functions write a row to agent_run_log with status running at the start, then update to completed or failed on finish, recording trace_reasoning and tokens_used.
  4. On any exception (timeout, auth failure, malformed response), update the log row to failed with the error message and re-raise.
- **Dependencies:** `.env` (`DEEPSEEK_API_KEY`), `database/database.sqlite` (`agent_run_log` table), `backend/scripts/helper_api.py` (for HTTP patterns)
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence · API quirks documented inline

- [ ] Task complete

---

### T3 — Implement Metadata Generator Script

- **File(s):** `backend/scripts/metadata_generator.py`
- **Action:** Implement the automated metadata generation logic using the DeepSeek API via `agent_client.py`. The script must:
  1. Accept a document's Markdown/HTML content and its slug.
  2. Call `agent_client.generate_metadata(content, slug)` which sends a structured prompt to the DeepSeek Chat Completions API requesting 5-10 SEO keywords and a meta-description (1-2 sentences, max 160 chars) derived from the content.
  3. Log the generation to agent_run_log with pipeline = metadata_generation and record_slug set, recording trace_reasoning and tokens_used.
  4. Return a dict with keywords (comma-separated string) and meta_description (string). The JS frontend then saves both to the record.
- **Dependencies:** `backend/scripts/agent_client.py`, `.env` (`DEEPSEEK_API_KEY`), `database/database.sqlite` (`agent_run_log` table)
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence · API quirks documented inline

- [ ] Task complete

---

### T4 — Expand API: System Config Endpoints

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement GET/PUT endpoints for the `system_config` table to allow the dashboard to manage global site configuration. **Note:** News-related data (`news_sources`, `news_items`, `news_search_term`) lives on the `records` table — these endpoints are for configuration not tied to any single record. **Append new routes to the end of the file — do not restructure or reformat existing routes.**
- **Vibe Rule(s):** 1 function per JS file (N/A Python) · Explicit logic · Auth protected

- [ ] Task complete

---

### T5 — Expand API: Essay & Historiography Endpoints

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement CRUD endpoints for the Essays table and the unique Historiography record. **Append new routes to the end of the file — do not restructure or reformat existing routes.**
- **Vibe Rule(s):** Auth protected · Explicit logic · SQLi safe

- [ ] Task complete

---

### T6 — Expand API: Blog & News Endpoints

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement CRUD endpoints for Blog Posts and News Items. **Append new routes to the end of the file — do not restructure or reformat existing routes.**
- **Vibe Rule(s):** Auth protected · Explicit logic · SQLi safe

- [ ] Task complete

---

### T7 — Expand API: Challenge Response Endpoints

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement the logic to create draft responses and link them to parent challenges. **Append new routes to the end of the file — do not restructure or reformat existing routes.**
- **Vibe Rule(s):** Auth protected · Explicit logic · Relational integrity

- [ ] Task complete

---

### T8 — Expand API: Agent Run Endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement `POST /api/admin/agent/run` — triggers a DeepSeek agent pipeline for a specific record. Accepts JSON body: `{"pipeline": "academic_challenges" | "popular_challenges", "slug": str}`. The endpoint must:
  1. Verify admin session via `auth_utils.py`.
  2. Look up the record's search terms (`academic_challenge_search_term` or `popular_challenge_search_term` depending on pipeline).
  3. Spawn the agent run asynchronously (return 202 Accepted immediately with the `agent_run_log.id`; the agent runs in a background thread via `threading.Thread` targeting the appropriate pipeline's single-record function).
  4. Return `{"run_id": int, "status": "running"}`.
- **Vibe Rule(s):** Auth protected · Explicit logic · SQLi safe · Non-blocking

- [ ] Task complete

---

### T9 — Expand API: Agent Logs Endpoint

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Implement `GET /api/admin/agent/logs` — returns paginated agent run history for the System dashboard monitor. Query params: `?limit=50&offset=0&pipeline=academic_challenges`. Returns array of `agent_run_log` rows ordered by `started_at DESC`. Each row includes all columns: `id`, `pipeline`, `record_slug`, `status`, `trace_reasoning`, `articles_found`, `tokens_used`, `error_message`, `started_at`, `completed_at`.
- **Vibe Rule(s):** Auth protected · Explicit logic · SQLi safe

- [ ] Task complete

---

## Final Tasks

### T10 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T11 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new backend scripts and API endpoints. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new backend files. |
| `documentation/data_schema.md` | Yes | Document the new `system_config` and `agent_run_log` tables. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md" | No | Admin UI is unaffected by backend changes. |
| `documentation/guides/guide_function.md` | Yes | Document the shared generator logic, system config flow, and DeepSeek agent client integration. |
| `documentation/guides/guide_security.md` | Yes | Note the new API endpoints (CRUD + agent run/log) and their auth requirements. |
| `documentation/guides/guide_style.md` | No | CSS is unaffected. |
| `documentation/guides/guide_maps.md" | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO logic is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
