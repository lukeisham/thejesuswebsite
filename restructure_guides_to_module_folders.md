---
name: restructure_guides_to_module_folders.md
version: 1.0.0
module: 8.3 — Architectural Documentation & Guides
status: draft
created: 2026-07-15
---

# Plan: restructure_guides_to_module_folders

## Purpose

> Split the three monolithic guide files (`guide_appearance.md`, `guide_dashboard_appearance.md`, `guide_function.md`) in `documentation/guides/` into per-module document files stored in the corresponding module folders (`1.0 Foundation Module/` through `9.0 Cross-Cutting Standardization/`) that were recently created. Each new file will receive corrected frontmatter (name, purpose, version, dependency lists) and its section headings will be aligned with the canonical names in `documentation/simple_module_sitemap.md`. ASCII diagrams, prose descriptions, and itemized lists within each section will be left intact for later refinement. The original monolithic files will remain in place (not deleted) to preserve history until all downstream cross-references are resolved. Finally, all changes will be committed and pushed to GitHub.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Use Python scripts (via `terminal`)** for all file-reading, splitting, and editing operations that traverse monolithic files or write new files — do not rely on `edit_file` for large-scale extractions.
> 4. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

---

### T1 — Split `guide_appearance.md` into per-module `guide_frontend_appearance.md` files

- **File(s):**
  - `documentation/guides/guide_appearance.md` (source)
  - `documentation/guides/1.0 Foundation Module/guide_frontend_appearance.md`
  - `documentation/guides/2.0 Records Module/guide_frontend_appearance.md`
  - `documentation/guides/3.0 Visualizations Module/guide_frontend_appearance.md`
  - `documentation/guides/4.0 Ranked Lists Module/guide_frontend_appearance.md`
  - `documentation/guides/5.0 Essays & Responses Module/guide_frontend_appearance.md`
  - `documentation/guides/6.0 News & Blog Module/guide_frontend_appearance.md`
  - `documentation/guides/7.0 System Module/guide_frontend_appearance.md`
- **Action:** Read `guide_appearance.md` in full. For each `## X.0 Module` section (1.0 through 6.0, plus the `## 7.0 URL Slug Architecture` section), extract that section's content into the corresponding folder as `guide_frontend_appearance.md`. Apply proper YAML frontmatter to each new file. Update section headings (`### X.Y ...`) to match the canonical heading names from `documentation/simple_module_sitemap.md` (see heading mapping below). Leave all ASCII diagrams, bullet lists, prose descriptions, and tables unchanged.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md`

**Heading name alignment (guide_appearance.md → simple_module_sitemap.md):**

| Current heading | Canonical heading (from sitemap) |
|---|---|
| `### 1.1 Website Landing Page` | `### 1.1 Website Landing Page (Public)` |
| `### 1.2 Internal Landing Page` | `### 1.2 Internal Landing Page (Public)` |
| `### 2.2 Single Record Deep-Dive` | `### 2.2 Single Record Deep-Dive Layout` |
| `### 3.1 Visual Interactive Ardor diagram Display` | `### 3.1 Visual Interactive Ardor Diagram` |
| `### 4.1 Ranked Wikipedia Views` | `### 4.1 Ranked Wikipedia` |
| `### 4.2 Ranked Challenge Views` | `### 4.2 Ranked Challenges` |
| `### 5.1 Essay Layouts (Context, Theological, Spiritual) & Historiography` | `### 5.1 Essays` (add sub-headings `#### 5.1.1 Context Essays` through `#### 5.1.4 Spiritual Articles` as child context) |
| `### 5.2 Challenge Response Layouts` | `### 5.2 Challenge Responses` |
| All other headings already match the sitemap — leave as-is. |

**Notes for the agent executing this task:**
- Write a single Python script that reads the source file once, then writes each module section into its new file with the appropriate frontmatter and heading corrections.
- Each output file should have frontmatter like:
  ```yaml
  ---
  name: guide_frontend_appearance.md
  purpose: Visual ASCII representations of the public-facing pages for Module X.X
  version: 1.0.0
  dependencies: [detailed_module_sitemap.md]
  ---
  ```
- Include the original lead-in paragraph (`This document maintains visual ASCII blueprints...`) from the source file as introductory context in each module's guide.
- For `4.2 Ranked Challenges`, ensure the two sub-items `4.2.1 Academic Challenges` and `4.2.2 Popular Challenges` are represented as sub-headings if the source content contains them.
- The `7.0 System Module/guide_frontend_appearance.md` gets the `## 7.0 URL Slug Architecture` section content — rename the heading to `## 7.0 System Module` and keep the `### 7.1 Clean Slug URL Scheme` sub-heading as-is (it's not in the sitemap but is descriptive content).

- [ ] Task complete

---

### T2 — Split `guide_dashboard_appearance.md` into per-module `guide_dashboard_appearance.md` files

- **File(s):**
  - `documentation/guides/guide_dashboard_appearance.md` (source)
  - `documentation/guides/2.0 Records Module/guide_dashboard_appearance.md`
  - `documentation/guides/3.0 Visualizations Module/guide_dashboard_appearance.md`
  - `documentation/guides/4.0 Ranked Lists Module/guide_dashboard_appearance.md`
  - `documentation/guides/5.0 Essays & Responses Module/guide_dashboard_appearance.md`
  - `documentation/guides/6.0 News & Blog Module/guide_dashboard_appearance.md`
  - `documentation/guides/7.0 System Module/guide_dashboard_appearance.md`
  - `documentation/guides/9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md`
- **Action:** Read `guide_dashboard_appearance.md` in full. Extract each module section (`## 2.0 Records Module` through `## 7.0 System Module`) into the corresponding folder as `guide_dashboard_appearance.md`. Cross-cutting sections that span all modules (Shared Tool Ownership Reference, Metadata Widget Placement Convention, API Route Reference, Database Tables, `## 9.0 Unified WYSIWYG Dashboard Layout`, and the preamble sections `Module Index`, `0.1 Layout Convention`, `0.2 Field Ownership Map`) go into `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md`. Apply frontmatter. Align section-level headings where they map to sitemap entries (mostly dashboard headings describe internal editors, not sitemap public features — align the module-level `## X.0` headings only). Leave ASCII diagrams, tables, and prose unchanged.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md`

**Mapping of source sections to destination folders:**

| Source section in guide_dashboard_appearance.md | Destination |
|---|---|
| Frontmatter + `# Guide to Dashboard Appearance & Editor Layouts` + preamble intro paragraph | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| Module Index | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| §0.1 Layout Convention — Providence 2-Column Pattern | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| §0.2 Field Ownership Map | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| §2.0 Records Module | `2.0 Records Module/guide_dashboard_appearance.md` |
| §3.0 Visualizations Module | `3.0 Visualizations Module/guide_dashboard_appearance.md` |
| §4.0 Ranked Lists Module | `4.0 Ranked Lists Module/guide_dashboard_appearance.md` |
| §5.0 Essays & Responses Module | `5.0 Essays & Responses Module/guide_dashboard_appearance.md` |
| §6.0 News & Blog Module | `6.0 News & Blog Module/guide_dashboard_appearance.md` |
| §7.0 System Module | `7.0 System Module/guide_dashboard_appearance.md` |
| Shared Tool Ownership Reference | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| Metadata Widget Placement Convention | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| API Route Reference | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| Database Tables | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |
| §9.0 Unified WYSIWYG Dashboard Layout | `9.0 Cross-Cutting Standardization/guide_dashboard_appearance.md` |

**Heading alignment:** The dashboard headings reference backend editor JS files and internal UI patterns that have no equivalents in `simple_module_sitemap.md`. Only the module-level `## X.0 Module Name` headings need to match. Sub-headings within each module (e.g. `### 2.1 Backend for Master Data Index`) are accurate internal descriptions and should be kept as-is but ensure the module heading name (`###` within that section) uses the canonical module name where possible.

- [ ] Task complete

---

### T3 — Split `guide_function.md` into per-module `guide_function.md` files

- **File(s):**
  - `documentation/guides/guide_function.md` (source)
  - `documentation/guides/1.0 Foundation Module/guide_function.md`
  - `documentation/guides/2.0 Records Module/guide_function.md`
  - `documentation/guides/3.0 Visualizations Module/guide_function.md`
  - `documentation/guides/4.0 Ranked Lists Module/guide_function.md`
  - `documentation/guides/5.0 Essays & Responses Module/guide_function.md`
  - `documentation/guides/6.0 News & Blog Module/guide_function.md`
  - `documentation/guides/7.0 System Module/guide_function.md`
  - `documentation/guides/8.0 Setup & Testing Module/guide_function.md`
- **Action:** Read `guide_function.md` in full. Extract each module section (`## 1.0 Foundation Module` through `## 8.0 Setup & Testing Module`) into the corresponding folder as `guide_function.md`. Apply frontmatter. Update the `## 5.0 Essays & Responses Module` heading to match the canonical sitemap name — current heading reads `## 5.0 Essays & Responses` but should be `## 5.0 Essays & Responses Module`. Leave all ASCII logic-flow diagrams, bullet lists, prose descriptions, and pipeline diagram headings unchanged.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md`

**Notes for the agent:**
- The source file has a `## Contents` table-of-contents section between the intro and the first module — this should NOT be replicated in the per-module files. Only the intro paragraph (after `# Purpose of this document.`) should be included as shared context.
- Each module's content is already under a `## X.0 Module` heading. The internal sub-headings (e.g. `### 2.1 Search Pipeline — End-to-End Logic Flow`) describe data pipelines that have no direct sitemap equivalents — leave them as-is.
- The `dependencies` frontmatter field for each new file should reference `detailed_module_sitemap.md` plus any other guide files that are relevant to that module's data flows (e.g. `guide_dashboard_appearance.md` for the same module if it has a dashboard editor).

- [ ] Task complete

---

### T4 — Update dependency lists in all new guide files

- **File(s):** All files created in T1–T3 (every `guide_frontend_appearance.md`, `guide_dashboard_appearance.md`, and `guide_function.md` inside the `1.0 Foundation Module/` through `9.0 Cross-Cutting Standardization/` folders).
- **Action:** For each new per-module guide file, examine the content and set a meaningful `dependencies` list in the YAML frontmatter. The original monolithic files had broad dependency lists spanning the entire project. Each per-module file should only list the documents it actually depends on (e.g. `detailed_module_sitemap.md` for file-path lookups, sibling guides for the same module, or `high_level_schema.md`/`data_schema.md` if the content references database fields).
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter on every doc

**Dependency rules of thumb:**

| If the guide covers… | Likely dependencies |
|---|---|
| Frontend appearance (`guide_frontend_appearance.md`) | `detailed_module_sitemap.md`, `guide_style.md` (if referencing CSS patterns) |
| Dashboard appearance (`guide_dashboard_appearance.md`) | `detailed_module_sitemap.md`, `data_schema.md`, `high_level_schema.md` (if referencing DB fields) |
| Functionality (`guide_function.md`) | `detailed_module_sitemap.md`, `guide_dashboard_appearance.md` (for same module), `data_schema.md` (if referencing DB schema) |

Apply these guidelines per file, adjusting based on actual content. Do NOT list dependencies on other per-module files that don't exist yet — only list files that currently exist in the repo.

- [ ] Task complete

---

### T5 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### General
- [ ] All new guide files have valid YAML frontmatter with `name`, `purpose`, `version`, and `dependencies`
- [ ] All heading names match `documentation/simple_module_sitemap.md` where a direct mapping exists
- [ ] No ASCII diagrams, prose descriptions, bullet lists, or tables were modified (only headings and frontmatter were changed)
- [ ] The original monolithic files (`guide_appearance.md`, `guide_dashboard_appearance.md`, `guide_function.md`) remain unmodified in place

#### Python (for the extraction scripts)
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] Logic is explicit and self-documenting

- [ ] Task complete

---

### T6 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement:** All three monolithic guide files have been split into per-module files stored in the corresponding `X.0 Module Name/` folders
- [ ] **Achievement:** Section headings in the new files have been updated to match `simple_module_sitemap.md` where applicable
- [ ] **Achievement:** Each new file has correct frontmatter (name, purpose, version, dependencies)
- [ ] **Achievement:** ASCII diagrams, prose descriptions, and all list content remain untouched
- [ ] **Necessity:** The monolithic guides are now organized by module, making per-module documentation easier to maintain and navigate
- [ ] **Targeted Impact:** Only files in `documentation/guides/` were created or modified — no code files outside `documentation/` were touched
- [ ] **Scope Control:** No scope creep — only the three source files were read, and only new per-module guide files were created

- [ ] Task complete

---

### T7 — Push to GitHub

- **File(s):** All files created in T1–T3 (the new per-module guide files across all 9 module folders).
- **Action:** Stage all new files, commit with a descriptive message, and push to `main`. No branches.
- **Vibe Rule(s):** Git Rules — commit directly to `main`, never create branches.

**Commit message:**
```
restructure: split monolithic guides into per-module folders

- Split guide_appearance.md into guide_frontend_appearance.md per module (1.0–7.0)
- Split guide_dashboard_appearance.md into guide_dashboard_appearance.md per module (2.0–7.0, 9.0 cross-cutting)
- Split guide_function.md into guide_function.md per module (1.0–8.0)
- Updated section headings to match simple_module_sitemap.md
- Updated frontmatter dependency lists in all new files
- Original monolithic files preserved in place
```

- [ ] Committed to `main`
- [ ] Pushed to `origin main`

- [ ] Task complete
