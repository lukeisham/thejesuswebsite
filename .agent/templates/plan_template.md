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

### T[Final+2] — Module Guide Update

> Refactor the per-module guide files in `documentation/guides/{{module_number}} {{module_name}}/` to match all changes made by this plan.
> This is a **mandatory task** — the module guides must stay in sync with the source code.

- **File(s):** All guide files in `documentation/guides/{{module_number}} {{module_name}}/`.
- **Action:** For each guide file present in the module subfolder, cross-reference it against the source code and update to reflect this plan's changes (skip any that don't exist for this module):
  - **`guide_dashboard_appearance.md`** (if present): Update or add ASCII diagrams for any changed dashboard layouts, component structures, or file inventories. Verify all diagrams match the current HTML templates.
  - **`guide_frontend_appearance.md`** (if present): Update or add ASCII diagrams for any changed public page layouts. Verify all diagrams match the current HTML templates.
  - **`guide_function.md`** (if present): Update or add lifecycle/flow diagrams and the technical description paragraphs to reflect any changed bootstrapping logic, event wiring, API endpoints, or data flow.
  - **`*_nomenclature.md`** (if present): Add any new terms (CSS classes, IDs, JS functions, tokens, concepts) introduced by this plan. Remove any terms that no longer exist. Update definitions that changed.
  - **Version bump**: Increment `version` in every modified guide's YAML frontmatter.

  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [ ] All ASCII diagrams in module guides match current source code
- [ ] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [ ] Nomenclature file covers all terms used in module source files
- [ ] Version numbers bumped on all modified guide files
- [ ] No stale references to files or logic changed by this plan

---

### T[Final+3] — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
