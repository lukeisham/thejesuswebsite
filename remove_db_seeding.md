---
name: remove_db_seeding
version: 1.0.0
module: 8.0 — Setup & Testing
status: draft
created: 2026-07-01
---

# Plan: Remove Database Seeding

## Purpose

> **Remove all database seeding files and every reference to them across the codebase and documentation, so the project starts from a blank database state. This eliminates `tools/db_seeder.py`, `tools/seed_data.sql`, `tools/test_records.sql`, the stale `assets/geo_index.json` reference in `guide_maps.md`, and all corresponding file-tree entries in `detailed_module_sitemap.md` and `site_map.md`.**

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Delete `tools/db_seeder.py`

- **File(s):** `tools/db_seeder.py`
- **Action:** Delete the database seeder Python script.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

### T2 — Delete `tools/seed_data.sql`

- **File(s):** `tools/seed_data.sql`
- **Action:** Delete the 15-record development seed data SQL file.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

### T3 — Delete `tools/test_records.sql`

- **File(s):** `tools/test_records.sql`
- **Action:** Delete the small-sample test dataset SQL file.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

### T4 — Update `documentation/detailed_module_sitemap.md` — remove seeder entries

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** Remove `db_seeder.py`, `seed_data.sql`, and `test_records.sql` from the §8.0 Supporting Files file tree.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] Task complete

---

### T5 — Update `documentation/site_map.md` — remove seeder entries

- **File(s):** `documentation/site_map.md`
- **Action:** Remove `db_seeder.py`, `seed_data.sql`, and `test_records.sql` from the master tools file tree.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] Task complete

---

### T6 — Update `documentation/guides/guide_maps.md` — remove `geo_index.json` reference

- **File(s):** `documentation/guides/guide_maps.md`
- **Action:** Remove the sentence "Local Mirror: `assets/geo_index.json` contains a cached mapping of common locations used in the initial seed data." from §3.3.6 and splice the surrounding text cleanly.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

## Final Tasks

### T7 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] No HTML files modified — N/A

#### CSS
- [ ] No CSS files modified — N/A

#### JavaScript
- [ ] No JavaScript files modified — N/A

#### Python
- [ ] No Python files modified — only deleted

#### SQL / Database
- [ ] No SQL schema changes — only seed data files deleted
- [ ] `snake_case` maintained in all remaining database references

---

### T8 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: All seeding files (`db_seeder.py`, `seed_data.sql`, `test_records.sql`) are deleted
- [ ] **Achievement**: The `geo_index.json` reference is removed from `guide_maps.md`
- [ ] **Achievement**: All documentation file trees (`detailed_module_sitemap.md`, `site_map.md`) no longer reference the deleted files
- [ ] **Necessity**: The project can now start from a blank database without stale seed data
- [ ] **Targeted Impact**: Only the Setup & Testing module (8.0) file inventory and `guide_maps.md` were affected
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were modified or deleted

---

### T9 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Remove deleted files from file trees. Bump the `version` in frontmatter.
  - **Bump version** on every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Remove `db_seeder.py`, `seed_data.sql`, and `test_records.sql` from §8.0 Supporting Files file tree; bump version |
| `documentation/simple_module_sitemap.md` | No | No module structure change — only individual files removed from an existing module |
| `documentation/site_map.md` | Yes | Remove `db_seeder.py`, `seed_data.sql`, and `test_records.sql` from `tools/` file tree; bump version |
| `documentation/data_schema.md` | No | Schema unchanged — only sample data deleted |
| `documentation/vibe_coding_rules.md` | No | No rule changes or shared-tool ownership changes |
| `documentation/style_mockup.html` | No | No visual changes |
| `documentation/git_vps.md` | No | No deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or UI component changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard UI changes |
| `documentation/guides/guide_function.md` | No | No new logic flows, pipelines, or JS interactions |
| `documentation/guides/guide_security.md` | No | No auth, session, or input validation changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens |
| `documentation/guides/guide_maps.md` | Yes | Remove the `assets/geo_index.json` reference from §3.3.6 Source Registry; bump version |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or AI-accessibility changes |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` and `site_map.md` file trees reflect the 3 deleted files
- [ ] **All ASCII diagrams updated:** N/A — no layout or logic-flow diagrams changed
- [ ] **Style guide updated:** N/A — no CSS changes
- [ ] **Shared-tool ownership documented:** N/A — no shared tools created or changed
- [ ] **Version numbers bumped:** `detailed_module_sitemap.md`, `site_map.md`, and `guide_maps.md` frontmatter version incremented
- [ ] **No stale references:** no document references `db_seeder.py`, `seed_data.sql`, `test_records.sql`, or `geo_index.json` seed-data linkage
