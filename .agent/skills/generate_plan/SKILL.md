---
name: generate_plan
version: 1.1.0
description: Generates a structured implementation plan .md file from plan_template.md, with a purpose summary, bite-sized checkbox tasks guided by vibe_coding_rules.md, a vibe-coding audit, an impact audit against detailed_module_sitemap.md, and a documentation update section covering all affected files in documentation/.
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
- **Impact Audit table**: one row per file in the Tasks section, cross-referenced against `detailed_module_sitemap.md`
- **Documentation Update table**: one row per document in `documentation/` whose scope overlaps with this plan's work (see Step 6)

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

### Step 5: Populate the Documentation Update Section

Scan the full `documentation/` directory and its `guides/` subfolder. For each document, decide whether the plan's scope affects it:

| Document | Affects it if… |
|----------|----------------|
| `detailed_module_sitemap.md` | Any new file is added or an existing file is moved/renamed |
| `simple_module_sitemap.md` | Module scope or high-level structure changes |
| `site_map.md` | Any new file is added (trigger `/sync_sitemap`) |
| `data_schema.md` | A new database table, column, or relationship is introduced |
| `vibe_coding_rules.md` | A rule was ambiguous or needs clarifying based on this plan |
| `style_mockup.html` | A new page layout or significant visual change is introduced |
| `guides/guide_appearance.md` | A new page or UI component is added |
| `guides/guide_function.md` | A new logic flow, data pipeline, or JS interaction is introduced |
| `guides/guide_security.md` | Auth, session handling, rate limiting, or input validation is touched |
| `guides/guide_style.md` | New CSS patterns, design tokens, or visual conventions are introduced |
| `guides/guide_maps.md` | Map-related display or data logic is changed |
| `guides/guide_timeline.md` | Timeline display or data logic is changed |

Set `Yes / No` for each row and write a one-sentence `Change Description` for every `Yes` row. Mark all `No` rows clearly so the executor knows they were considered and ruled out.

### Step 6: Write the Output File
- **Output path**: `{{plan_name}}.md` (project root directory)
- Write the fully populated plan file.

## 4. Terminal States & Outputs

`IF` file written successfully:
  - **State**: `PLAN_GENERATED`
  - **Action**: Confirm to the user with the output path (`{{plan_name}}.md` in the project root) and a brief summary of: how many tasks were generated, how many documents in the Documentation Update section are marked `Yes`. Remind the user to run `/sync_sitemap` after any plan that adds new files to the codebase.

`IF` required inputs are missing or ambiguous:
  - **State**: `AWAITING_INPUT`
  - **Action**: Ask the user the minimum questions needed to proceed. Do not generate a half-populated plan.

`IF` template file not found at `.agent/templates/plan_template.md`:
  - **State**: `TEMPLATE_MISSING`
  - **Action**: Report the error and halt. Do not attempt to reconstruct the template from memory.
