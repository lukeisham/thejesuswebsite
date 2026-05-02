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

This plan implements the essential backend infrastructure and shared utilities required by the entire Admin Dashboard refactor. It adds the `news_search_term` column to the `records` table, establishes the `system_config` table for global site configuration, implements the automated `snippet_generator.py` and `metadata_generator.py` scripts for editorial efficiency, and expands the `admin_api.py` with the missing endpoints for News, Blog, Essays, Historiography, and Challenge Responses. This foundation is critical for ensuring that the high-level dashboard modules have a reliable and fully-functional API to interface with during their respective implementation phases.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **SQL** | `database/database.sqlite` | Add `news_search_term` column to `records` + create `system_config` table |
| **Python** | `backend/scripts/snippet_generator.py` | Shared utility: Automated abstract generation |
| **Python** | `backend/scripts/metadata_generator.py` | Shared utility: Automated SEO/Keyword generation |
| **Python** | `admin/backend/admin_api.py` | Central API: Expand with planned CRUD endpoints |

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
  > **Note:** `news_sources`, `news_items`, and `news_search_term` all live as columns on the `records` table per the data schema. The `system_config` table holds configuration that is truly global (e.g. site-wide settings), not per-record news data.
- **Vibe Rule(s):** snake_case fields · Explicit queries

- [ ] Task complete

---

### T2 — Implement Snippet Generator Script

- **File(s):** `backend/scripts/snippet_generator.py`
- **Action:** Implement the automated snippet generation logic. The script should accept a text block (Markdown/HTML) and return a concise, archival-quality summary using the project's scholarly tone.
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence

- [ ] Task complete

---

### T3 — Implement Metadata Generator Script

- **File(s):** `backend/scripts/metadata_generator.py`
- **Action:** Implement the automated metadata generation logic. The script should extract SEO keywords and a meta-description from a document's content and slug.
- **Vibe Rule(s):** Logic is explicit · Stateless and safe · Python Excellence

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

---

### T9 — Purpose Check

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
| `documentation/data_schema.md` | Yes | Document the new `system_config` table. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md" | No | Admin UI is unaffected by backend changes. |
| `documentation/guides/guide_function.md` | Yes | Document the shared generator logic and system config flow. |
| `documentation/guides/guide_security.md` | Yes | Note the new API endpoints and their auth requirements. |
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
