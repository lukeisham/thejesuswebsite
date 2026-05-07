---
name: {{plan_name}}
version: 1.0.0
module: {{module_number}} — {{module_name}}
status: draft
created: {{date}}
---

# Plan: {{plan_name}}

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

{{purpose_summary}}

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — {{task_1_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{e.g. "Semantic HTML5 tags · No inline styles" / "1 function per JS file · ES6+" / "snake_case fields"}}

- [ ] Task complete

---

### T2 — {{task_2_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{relevant rules}}

- [ ] Task complete

---

### T3 — {{task_3_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{relevant rules}}

- [ ] Task complete

---

<!-- Add additional T4, T5 … blocks as needed using the same pattern above -->

---

## Final Tasks

### T[Final] — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file (or tightly-related group for a single widget/component)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T[Final+1] — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: [Extract key achievement 1 from purpose summary]
- [ ] **Achievement**: [Extract key achievement 2 from purpose summary]
- [ ] **Symmetry**: Identical code verification — all duplicated logic, row-building, and event handlers are functionally identical across modes (no drift) [Include ONLY if plan involves parallel modes]
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T[Final+2] — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`, `guide_appearance.md`): Add or update ASCII box-drawing diagrams to reflect new component placement, sidebar layout changes, or work-area structure.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for any new data flow, JS lifecycle, or Python script introduced by this plan.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example in its own subsection, with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes / No | {{e.g. Add new file entries under Module X.X; update file tree diagrams}} |
| `documentation/simple_module_sitemap.md` | Yes / No | {{e.g. Reflect new module scope or high-level structure change}} |
| `documentation/site_map.md` | Yes / No | {{e.g. Add new files to master file tree; bump version}} |
| `documentation/data_schema.md` | Yes / No | {{e.g. Document new table, column, or relationship}} |
| `documentation/vibe_coding_rules.md` | Yes / No | {{e.g. Update §7 shared-tool ownership table; clarify ambiguous rule}} |
| `documentation/style_mockup.html` | Yes / No | {{e.g. Add new page layout mockup}} |
| `documentation/git_vps.md` | Yes / No | {{e.g. Note deployment, branching, or VPS config changes}} |
| `documentation/guides/guide_appearance.md` | Yes / No | {{e.g. Add/update ASCII diagram for new public page or component}} |
| `documentation/guides/guide_dashboard_appearance.md` | Yes / No | {{e.g. Add/update ASCII layout diagram; update Shared Tool Ownership table}} |
| `documentation/guides/guide_function.md` | Yes / No | {{e.g. Add/update ASCII logic-flow diagram for new pipeline or JS lifecycle}} |
| `documentation/guides/guide_security.md` | Yes / No | {{e.g. Note auth, session, rate-limiting, or input validation changes}} |
| `documentation/guides/guide_style.md` | Yes / No | {{e.g. Add new BEM namespace table with CSS variable references}} |
| `documentation/guides/guide_maps.md` | Yes / No | {{e.g. Update map display or data logic documentation}} |
| `documentation/guides/guide_timeline.md` | Yes / No | {{e.g. Update timeline display or data logic documentation}} |
| `documentation/guides/guide_donations.md` | Yes / No | {{e.g. Update donation or support integration docs}} |
| `documentation/guides/guide_welcoming_robots.md` | Yes / No | {{e.g. Update SEO, sitemap, robots.txt, or AI-accessibility docs}} |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
