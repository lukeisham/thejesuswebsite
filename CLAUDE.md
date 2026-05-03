# The Jesus Website — Claude Instructions

## Git Rules
- Never create branches. Always commit directly to `main`.
- Do not use `git checkout -b` or create worktrees.

## Reference Files
- **Vibe Coding Rules:** `documentation/vibe_coding_rules.md` — read this before creating or editing any code file.
- **Plan Issue Log:** `plan_issues.md` — cross-plan issue tracker. Read this before starting any plan to check for open issues that affect the plan. At the end of every plan execution, append any cross-cutting issues discovered (conflicts, gaps, missing dependencies, implementation issues) to the Issue Table.

## Skills

### `/generate_plan`
- **Skill file:** `.agent/skills/generate_plan/SKILL.md`
- **Template:** `.agent/templates/plan_template.md`
- **Trigger:** User says `/generate_plan`, "create a plan", "generate a plan", "write a plan", or "make a plan"
- **Output:** A fully populated `.md` plan file saved in the project root, named `{{plan_name}}.md`
- **What it does:** Generates a structured implementation plan from the template. Includes a purpose summary, bite-sized checkbox tasks with vibe-coding rules assigned per file type, a vibe-coding audit, an impact audit cross-referenced against `documentation/detailed_module_sitemap.md`, and a documentation update section covering all affected files in `documentation/`.
- **Reference docs used:**
  - `documentation/vibe_coding_rules.md` — guides task-level coding rules
  - `documentation/detailed_module_sitemap.md` — confirms file paths and module scope
