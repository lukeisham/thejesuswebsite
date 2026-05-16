---
name: generate_plan
version: 1.4.0
description: Generates a structured implementation plan .md file from plan_template.md, with bite-sized checkbox tasks guided by vibe_coding_rules.md, a vibe-coding audit, purpose check, a mandatory module guide update, and a push-to-GitHub step.
---

# Skill: generate_plan

## 1. Triggers

`EXECUTE_IF`:
  - `User_Command` == `"/generate_plan"`
  - OR `User_Intent` CONTAINS "create a plan"
  - OR `User_Intent` CONTAINS "generate a plan"
  - OR `User_Intent` CONTAINS "write a plan"
  - OR `User_Intent` CONTAINS "make a plan"

## 2. Pre-Execution: Gather Context

Before generating the plan, collect the following inputs from the user (ask if not already provided):

| Input | Description |
|-------|-------------|
| `plan_name` | Short slug for the plan file, e.g. `add_timeline_page` |
| `purpose_summary` | One-paragraph description of what the plan will achieve and why |
| `module_number` | The module this plan belongs to (e.g. `3.0`) |
| `module_name` | Human-readable module name (e.g. `Visualizations`) |
| `tasks` | A list of tasks — for each: title, file path(s), and what action to take |

If the user provides a rough description rather than a structured list, derive the tasks yourself by:
1. Reading `documentation/vibe_coding_rules.md` to identify applicable rules per file type.
2. Reading `documentation/detailed_module_sitemap.md` to confirm the correct file paths for the target module.

## 3. Execution Logic

### Step 1: Load the Template
- **Source**: `.agent/templates/plan_template.md`
- Read the full template into memory.

### Step 2: Populate the Template

Replace every `{{placeholder}}` with concrete values:

- `{{plan_name}}` → user-supplied or derived slug
- `{{date}}` → today's date (`YYYY-MM-DD`)
- `{{module_number}}` / `{{module_name}}` → from user input or sitemap lookup
- `{{purpose_summary}}` → the one-paragraph purpose statement
- **Tasks section**: generate one `### Tn — Title` block per task, each with:
  - `File(s)` — exact path(s) from `detailed_module_sitemap.md`
  - `Action` — a single, imperative sentence describing the work
  - `Vibe Rule(s)` — the specific rules from `vibe_coding_rules.md` that apply to that file type
  - A single `- [ ] Task complete` checkbox
- **Final Tasks**: Update `T[Final]`, `T[Final+1]`, `T[Final+2]`, and `T[Final+3]` to the correct sequential task numbers (e.g., T4, T5, T6, T7) following the generated tasks.
  - **T[Final] (Vibe-Coding Audit)**: Copy the audit checklist from the template — it is identical for every plan.
  - **T[Final+1] (Purpose Check)**: Populate the checklist by extracting concrete achievements from the `purpose_summary`. If the plan involves parallel modes or duplicated logic (e.g., "split into two containers", "Academic/Popular modes"), you MUST include the **Symmetry** check.
  - **T[Final+2] (Module Guide Update)**: Mandatory. Populate per the instructions in Step 5 below.

### Step 3: Task Sizing Rules

Each task must be bite-sized — apply these constraints:
- One task = one file created **or** one file meaningfully edited (not both unless inseparable)
- If a task touches HTML + its companion CSS, split into two tasks
- If a task touches a JS display module + its HTML anchor, split into two tasks
- A task description must fit in one imperative sentence

### Step 4: Vibe-Coding Rule Assignment

For each task, assign only the rules that apply to the file type being created or edited:

| File Type | Applicable Vibe Rules |
|-----------|-----------------------|
| `.html` | Semantic tags, no inline styles, no inline scripts, descriptive `id`/`class` hooks |
| `.css` | Grid/Flexbox hierarchy, CSS variables, section comments, no frameworks |
| `.js` | 1 function/file, 3-line header comment (trigger/function/output), vanilla ES6+, component injection |
| `.py` | Explicit readable logic, stateless/repeatable, document API quirks |
| `.sql` / `.sqlite` | `snake_case` fields, explicit queries |

### Step 5: Populate T[Final+2] — Module Guide Update

For each guide file listed in the template's T[Final+2] action bullets (`guide_dashboard_appearance.md`, `guide_frontend_appearance.md`, `guide_function.md`, `*_nomenclature.md`), write a **specific, actionable description** of what this plan changed and what the executor must update. Only reference guide files that actually exist in the module's subfolder — skip any that are absent.

The template already contains the full checklist and instructions for the executor. Your job at generation time is to replace the generic bullet points with concrete details: which diagrams changed, which API endpoints shifted, which terms were added or removed.

### Step 6: Write the Output File
- **Output path**: `{{plan_name}}.md` (project root directory)
- Write the fully populated plan file.

## 4. Terminal States & Outputs

`IF` file written successfully:
  - **State**: `PLAN_GENERATED`
  - **Action**: Confirm to the user with the output path (`{{plan_name}}.md` in the project root) and a brief summary of how many tasks were generated. Remind the user to run `/sync_sitemap` after any plan that adds new files to the codebase. Finally, cross-reference `documentation/detailed_module_sitemap.md` and `documentation/vibe_coding_rules.md` to verify that all file paths and rules are correct.

`IF` required inputs are missing or ambiguous:
  - **State**: `AWAITING_INPUT`
  - **Action**: Ask the user the minimum questions needed to proceed. Do not generate a half-populated plan.

`IF` template file not found at `.agent/templates/plan_template.md`:
  - **State**: `TEMPLATE_MISSING`
  - **Action**: Report the error and halt. Do not attempt to reconstruct the template from memory.
