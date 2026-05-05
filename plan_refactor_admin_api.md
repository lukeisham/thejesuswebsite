---
name: plan_refactor_admin_api
version: 1.0.0
module: 7.0 — System Module
status: draft
created: 2026-05-05
---

# Plan: Refactor `admin/backend/admin_api.py` into Modular Route Files

## Purpose

> This plan splits the monolithic `admin/backend/admin_api.py` (2,090 lines, ~25 endpoint groups) into focused route modules under `admin/backend/routes/`. The goal is to improve maintainability, reduce cognitive load per file, and preserve all existing behaviour with zero API surface changes. The old file is deleted and `serve_all.py` is updated to import from the new modular structure. No new features are added; this is purely a structural refactor.

---

## Tasks

> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create `shared.py` with common dependencies

- **File(s):** `admin/backend/routes/shared.py`
- **Action:** Extract into this file: `get_db_connection()`, `get_valid_columns()`, the `verify_token` dependency, all shared Pydantic models (`LoginRequest`, `ListItem`, `DiagramTreeUpdateItem`, `DiagramTreeUpdateRequest`, `BatchUpdateItem`, `BulkReviewRecordsRequest`, `SnippetGenerateRequest`, `MetadataGenerateRequest`, `CreateResponseRequest`, `AgentRunRequest`), and imports for `FastAPI/Depends/HTTPException`, `AuthUtils`, `setup_logger`, `RateLimiterMiddleware`, the `DB_PATH` constant, and the `logger` instance. Also move the rate-limiter middleware registration here. Do NOT create the `app` instance in this file — provide a function `create_app()` in `__init__.py` that sub-routers register onto.
- **Vibe Rule(s):** Python: explicit, self-documenting logic · stateless utilities

- [ ] Task complete

---

### T2 — Create `routes/auth.py`

- **File(s):** `admin/backend/routes/auth.py`
- **Action:** Move the three auth endpoints (`/api/admin/login`, `/api/admin/logout`, `/api/admin/verify`) into a `router = APIRouter()` and attach them with `prefix=""`. Import `shared` for `verify_token`, `LoginRequest`, `get_db_connection`, `AuthUtils`, `logger`, `DB_PATH`.
- **Vibe Rule(s):** Python: readable, explicit · one responsibility per file

- [ ] Task complete

---

### T3 — Create `routes/records.py`

- **File(s):** `admin/backend/routes/records.py`
- **Action:** Move record CRUD + picture endpoints (`get_all_records`, `batch_update_records`, `get_single_record`, `create_record`, `update_record`, `delete_record`, `upload_record_picture`, `delete_record_picture`) into a `router`. Import shared dependencies from `shared.py`. Keep all validation logic, docstrings, and error handling intact.
- **Vibe Rule(s):** Python: explicit logic · document API quirks inline

- [ ] Task complete

---

### T4 — Create `routes/lists.py`

- **File(s):** `admin/backend/routes/lists.py`
- **Action:** Move list management endpoints (`get_list`, `update_list`) into a `router`. Import shared dependencies from `shared.py`.
- **Vibe Rule(s):** Python: one responsibility per file · stateless

- [ ] Task complete

---

### T5 — Create `routes/diagram.py`

- **File(s):** `admin/backend/routes/diagram.py`
- **Action:** Move diagram tree endpoints (`get_diagram_tree`, `update_diagram_tree`) into a `router`. Import shared dependencies from `shared.py`.
- **Vibe Rule(s):** Python: one responsibility per file · stateless

- [ ] Task complete

---

### T6 — Create `routes/bulk.py`

- **File(s):** `admin/backend/routes/bulk.py`
- **Action:** Move bulk upload endpoints (`bulk_upload_records`, `bulk_upload_commit`) into a `router`. Import shared dependencies from `shared.py`. Keep all CSV validation logic, enum sets, and transaction handling intact.
- **Vibe Rule(s):** Python: explicit readable validation · document data anomalies

- [ ] Task complete

---

### T7 — Create `routes/system.py`

- **File(s):** `admin/backend/routes/system.py`
- **Action:** Move system endpoints (`get_system_config`, `update_system_config`, `health_check_admin`, `mcp_health`, `run_test_suite`, `open_docs_editor`, `generate_agents`, `restart_services`) into a `router`. Import shared dependencies from `shared.py`. Keep `_do_restart()` as a nested function inside `restart_services`.
- **Vibe Rule(s):** Python: stateless pipelines · document API quirks inline

- [ ] Task complete

---

### T8 — Create `routes/essays.py`

- **File(s):** `admin/backend/routes/essays.py`
- **Action:** Move essay/historiography endpoints (`get_essays`, `get_historiography`, `trigger_snippet_generation`, `trigger_metadata_generation`) into a `router`. Import shared dependencies from `shared.py` and `backend.scripts.snippet_generator` / `backend.scripts.metadata_generator`.
- **Vibe Rule(s):** Python: one responsibility per file · stateless

- [ ] Task complete

---

### T9 — Create `routes/news.py`

- **File(s):** `admin/backend/routes/news.py`
- **Action:** Move blog/news endpoints (`get_blogposts`, `delete_blogpost`, `get_news_items`, `trigger_news_crawl`) into a `router`. Import shared dependencies from `shared.py`. Keep `_run_news_pipeline()` as a nested function inside `trigger_news_crawl`.
- **Vibe Rule(s):** Python: one responsibility per file · stateless

- [ ] Task complete

---

### T10 — Create `routes/responses.py`

- **File(s):** `admin/backend/routes/responses.py`
- **Action:** Move challenge response endpoints (`create_response`, `get_responses`, `get_single_response`) into a `router`. Import shared dependencies from `shared.py`.
- **Vibe Rule(s):** Python: one responsibility per file · stateless

- [ ] Task complete

---

### T11 — Create `routes/agents.py`

- **File(s):** `admin/backend/routes/agents.py`
- **Action:** Move agent endpoints (`trigger_agent_run`, `get_agent_logs`) into a `router`. Import shared dependencies from `shared.py` and `backend.scripts.agent_client`. Keep `_run_agent()` as a nested function inside `trigger_agent_run`.
- **Vibe Rule(s):** Python: stateless pipelines · document API quirks

- [ ] Task complete

---

### T12 — Create `routes/__init__.py`

- **File(s):** `admin/backend/routes/__init__.py`
- **Action:** Create an app factory function `create_app()` that:
  1. Creates a `FastAPI` instance with `title="The Jesus Website API - Admin"`
  2. Adds `RateLimiterMiddleware` (30 req/min) — OR, if already added in `shared.py`, import and configure it here instead
  3. Registers all routers: `auth.router`, `records.router`, `lists.router`, `diagram.router`, `bulk.router`, `system.router`, `essays.router`, `news.router`, `responses.router`, `agents.router`
  4. Includes the `/api/health` health-check endpoint directly on the app
  5. Returns the app instance

- **Vibe Rule(s):** Python: explicit, self-documenting

- [ ] Task complete

---

### T13 — Update `serve_all.py`

- **File(s):** `serve_all.py`
- **Action:** Change the import from `from admin.backend.admin_api import app as api_app` to `from admin.backend.routes import create_app` and call `api_app = create_app()`. Keep all middleware (TrustedHost, CORS) as-is. Verify the app still mounts correctly.
- **Vibe Rule(s):** Python: explicit imports · no breaking changes

- [ ] Task complete

---

### T14 — Delete `admin/backend/admin_api.py`

- **File(s):** `admin/backend/admin_api.py`
- **Action:** Delete the old monolithic file. Confirm with `git rm` or `rm`. Verify that `serve_all.py` no longer references it.
- **Vibe Rule(s):** Clean codebase · remove dead code

- [ ] Task complete

---

### T15 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline
- [ ] All docstrings preserved from original file
- [ ] No duplicated imports across route files (shared.py is the single source)

#### HTML / CSS / JS
- [ ] No HTML, CSS, or JS files were modified — this plan is Python-only

- [ ] Task complete

---

### T16 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: The 2,090-line `admin_api.py` has been split into focused route modules under `admin/backend/routes/`
- [ ] **Necessity**: Each route file has a single responsibility, making the codebase easier to navigate and maintain
- [ ] **Targeted Impact**: Only files in `admin/backend/` and `serve_all.py` were touched — zero API surface changes
- [ ] **Scope Control**: No new features, no endpoint renames, no schema changes — purely structural
- [ ] **Smoke Test**: The app starts without import errors and all existing endpoints respond at their original paths

- [ ] Task complete

---

## Documentation Update

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Replace `admin/backend/admin_api.py` entry with the new `admin/backend/routes/` directory listing all 12 files (shared.py, __init__.py, and 10 route files) |
| `documentation/simple_module_sitemap.md` | No | High-level module structure unchanged — only internal file layout changed |
| `documentation/site_map.md` | No | No new user-facing pages or files added |
| `documentation/data_schema.md` | No | No schema or query changes |
| `documentation/vibe_coding_rules.md` | No | No rules were ambiguous or changed |
| `documentation/style_mockup.html` | No | No visual changes |
| `documentation/git_vps.md` | No | No deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No UI changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard UI changes |
| `documentation/guides/guide_function.md` | Yes | Update the section describing the Admin API architecture to reference the new route modules |
| `documentation/guides/guide_security.md` | No | Auth logic unchanged — same verify_token, same JWT implementation |
| `documentation/guides/guide_style.md` | No | No CSS changes |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or robots changes |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
