---
name: remove_users_column
version: 1.0.0
module: 2.0 — Records
status: complete
created: 2026-05-14
---

# Plan: remove_users_column

## Purpose

> Remove the `users` column from the `records` table across the schema, database, codebase, and documentation. The `users` column (`Admin` / `Public` / `Agent`) was a legacy classification field that was never wired into any access-control logic. Actual access control is already enforced through three separate mechanisms: (1) the `type` discriminator — `system_data` records are excluded from all public/MCP queries; (2) the `status` column — `draft` records are filtered out from public endpoints; (3) the MCP server's explicit column whitelisting — every query uses a hardcoded `SELECT` list, never `SELECT *`. The `users` column was a confusing red herring that appeared to control access but did nothing. The `type` field is and always was the primary discriminator for record classification and should be the sole top-level sorting mechanism. Removing `users` simplifies the schema, eliminates dead code in three Python files and one JS file, and clears out stale documentation references in `data_schema.md`, `high_level_schema.md` (three locations), and `guide_security.md` (§10b). The MCP server's explicit column-exclusion comments also need updating since the column will no longer exist. This is a schema-only and code-cleanup plan — no UI, routing, or public-facing logic is affected.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Remove `users` column from SQLite database

- **File(s):** `database/database.sqlite`
- **Action:** Run `ALTER TABLE records DROP COLUMN users;` against the SQLite database to remove the column and all its data.
- **Vibe Rule(s):** `snake_case` fields · Explicit queries

- [x] Task complete

---

### T2 — Remove `users` fallback from `records.py` `create_record`

- **File(s):** `admin/backend/routes/records.py`
- **Action:** Remove the `if "users" not in safe_data: safe_data["users"] = "Public"` block (two lines) from the `create_record` endpoint.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · Document API quirks

- [x] Task complete

---

### T3 — Remove `users` fallback from `bulk.py` (two locations)

- **File(s):** `admin/backend/routes/bulk.py`
- **Action:** Remove the `if "users" not in insert_data: insert_data["users"] = "Public"` block from both `bulk_upload_records` and `bulk_upload_commit` functions.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · Document API quirks

- [x] Task complete

---

### T4 — Remove `payload.users` from `record_status_handler.js`

- **File(s):** `js/2.0_records/dashboard/record_status_handler.js`
- **Action:** Remove the `payload.users = "Public";` line (and its preceding comment "Section 0: Record identity defaults (always set so records appear on the public site)") from the `collectAllFormData()` function. Remove or re-scope the comment so it only refers to `payload.type = "record"`.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T5 — Update `data_schema.md` — remove `users` column entry

- **File(s):** `documentation/data_schema.md`
- **Action:** Remove the 4-line `users` column entry (column name, type, description, and the `Admin`/`Public`/`Agent` enum values) from the `records` table schema section. Bump `version` in YAML frontmatter.
  > **Markdown editing:** Use a Python script via `terminal` (not `edit_file`). Read the file, do a `str.replace()` on the exact text block, and write it back.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter on every doc

- [x] Task complete

---

### T6 — Update `high_level_schema.md` — remove `users` in 3 locations

- **File(s):** `documentation/high_level_schema.md`
- **Action:** Remove `users` from all three locations:
  1. **Layer 2 table** (§2 Base Columns) — delete the `users TEXT ...` row
  2. **Type Hierarchy ASCII diagram** (§3) — delete the `│  users                       │` line from the Base Fields box
  3. **Visual Summary table** (§5) — change `title + slug + snippet + metadata_json + users` to `title + slug + snippet + metadata_json` in both the header row and the field group name
  Bump `version` in YAML frontmatter.
  > **Markdown editing:** Use a Python script via `terminal` for all three edits. The ASCII diagram in §3 contains box-drawing characters (`│ ┌ ─ ┐ └ ┘`) that `edit_file` cannot reliably match. A single Python script that does three `str.replace()` calls on the file is the correct approach.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter on every doc

- [x] Task complete

---

### T7 — Update MCP server comments about `users` column exclusion

- **File(s):** `mcp_server.py`
- **Action:** Update the file-header purpose comment, `list_records()` docstring, `get_record()` notes, `search_records()` docstring, and the two `_LIST_RECORDS_COLUMNS` / `_GET_RECORD_COLUMNS` comment blocks to remove references to "excludes users column" — since the column will no longer exist in the database, the exclusion is moot. Replace phrasing like "excludes the `users` column" with "the `users` column was removed from the schema in Plan `remove_users_column`".
- **Vibe Rule(s):** Explicit readable logic · Document API quirks · Source-of-Truth Discipline

- [x] Task complete

---

### T8 — Update `guide_security.md` §10b — remove `users` exclusion bullet

- **File(s):** `documentation/guides/guide_security.md`
- **Action:** Replace the "**Excluded column:** `users`" bullet in §10b with a note that the column was removed from the schema. The updated text should read:
  > - **Removed column:** `users` — dropped from the schema in Plan `remove_users_column`. Was a legacy classification field never wired into access-control logic. The MCP server's explicit column lists already excluded it and remain unchanged.
  Bump `version` in YAML frontmatter.
  > **Markdown editing:** Use a Python script via `terminal` (not `edit_file`). Read the file, locate the §10b bullet block, do a `str.replace()`, and write it back.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter on every doc

- [x] Task complete

---

## Final Tasks

### T[Final] — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] N/A — No HTML files were created or modified

#### CSS
- [x] N/A — No CSS files were created or modified

#### JavaScript
- [x] One function per file (or tightly-related group for a single widget/component)
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern
  - **Note:** Only the `payload.users = "Public"` line and its associated comment were removed from `collectAllFormData()`; the file's existing structure and header comments remain unchanged.

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline
  - **Note:** Both files (`records.py`, `bulk.py`) had only the server-side fallback for `users` removed; the `"users" => "Public"` fallback was a data-anomaly workaround that is no longer needed since the column is gone.

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic
  - **Note:** The `ALTER TABLE DROP COLUMN` also required dropping 4 indexes (`idx_records_public_era`, `idx_records_public_category`, `idx_records_public_map`, `idx_records_public_type`) that referenced the `users` column.

---

### T[Final+1] — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: `users` column removed from `database/database.sqlite` via `ALTER TABLE`
- [x] **Achievement**: All Python `"users"` fallback defaults removed from `records.py` and `bulk.py`
- [x] **Achievement**: `payload.users = "Public"` removed from `record_status_handler.js`
- [x] **Achievement**: `data_schema.md` no longer references the `users` column
- [x] **Achievement**: `high_level_schema.md` cleaned in all 3 locations (Layer 2 table, Type Hierarchy diagram, Visual Summary table)
- [x] **Achievement**: `guide_security.md` §10b updated — "Excluded column" → "Removed column"
- [x] **Achievement**: MCP server comments updated to reflect the column's removal
- [x] **Necessity**: The `users` column was dead code — it was never wired into any access-control logic; real access control is handled by `type` (`system_data` exclusion), `status` (`draft`/`published`), and MCP explicit column whitelisting
- [x] **Targeted Impact**: Only the schema, backend defaults, JS defaults, documentation, and MCP comments were touched
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T[Final+2] — Version bumps and stale-reference check

> After executing all tasks above (T1–T8), verify version numbers and ensure no stale references remain anywhere in the documentation tree.

- **File(s):** `documentation/data_schema.md`, `documentation/high_level_schema.md`, `documentation/guides/guide_security.md`
- **Action:** Bump the `version` field in the YAML frontmatter of every documentation file that was edited in T5, T6, or T8. Then grep the entire `documentation/` directory for any remaining references to the `users` column and confirm nothing was missed.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Version frontmatter on every doc

- [x] **Version bumped:** `documentation/data_schema.md` — `1.0.5` → `1.0.6`
- [x] **Version bumped:** `documentation/high_level_schema.md` — `2.1.1` → `2.1.2`
- [x] **Version bumped:** `documentation/guides/guide_security.md` — `1.5.0` → `1.5.1`
- [x] **No stale references:** `grep -r "users" documentation/` — the only in-scope reference is in `guide_security.md` (the new "Removed column" note). Remaining references in `guide_dashboard_appearance.md` and `guide_function.md` are out of scope and have been logged as Issue #12.
- [x] **No stale references:** `grep -r "'users'\\|"\"users\"" . --include="*.py" --include="*.js"` — no remaining code references outside `venv/`
