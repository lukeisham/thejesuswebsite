---
name: generate-plan
description: >
  Generate a structured implementation plan for any feature, section, or module
  of the jesuswebsite project. Trigger when the user wants to map out work before
  writing code — "create a plan", "plan out X", "how should we approach building X",
  or any similar request for upfront design and task breakdown.
---

# Generate Plan

You are helping the user plan a piece of work on the **jesuswebsite** project at
`/Users/lukeishammacbookair/Developer/thejesuswebsite`. Follow every step below in order.
Do not skip steps.

---

## Step 1 — Read the sources of truth

Read these four files so every task you write respects the project's rules and structure:

```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Style_guide.md
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Vibe_coding_rules.md
/Users/lukeishammacbookair/Developer/thejesuswebsite/database/schema.sql
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Website_guide.md
```

Keep these in mind for the rest of the plan:
- **Style guide**: UI/UX patterns, component specs, layout, print styles.
- **Vibe Coding Rules**: file structure, JS/CSS/HTML conventions, performance, accessibility.
- **Schema**: table definitions, column types, constraints, FK relationships.
- **Website guide**: overall project structure, folder layout, and philosophy.

---

## Step 2 — Write the plan and save it to PLANS/New/

Create a new `.md` file at:
```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/PLANS/New/<feature-name>.md
```

Name the file after the feature being planned (kebab-case, no spaces).

### Plan format

Use the structure defined in the plan template:
```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/plan_template.md
```

The required sections are:

1. **Header** — `# Plan: <Feature Name>`, plus module, date, and a **Status** field set to `Drafting`.
2. **Goal** — one or two sentences describing what this plan delivers and why.
3. **Coding rules to keep in mind** — list any Vibe Coding Rules that are especially relevant to this plan. Reference them by ID (e.g. `JS-5`, `CSS-2`).
4. **Tasks** — grouped by layer (Database, API, Frontend, etc.) in dependency order.
5. **Files touched** — every file that will be created or modified, with `— created` or `— modified`.
6. **Notes** — edge cases, constraints, ordering dependencies, anything non-obvious.

### Task writing rules

- Each task must be **bite-sized**: one file or one clearly scoped change per task.
- Tasks must be in **dependency order** — things that must exist before others come first.
- Task titles use an imperative verb: `Add`, `Create`, `Update`, `Extend`, `Write`.
- Reference the **actual file path** in every task, not just a description.
- Respect SR-1 (one file, one function) — never bundle unrelated changes into one task.
- **Automated tests are mandatory for code-facing plans.** If the plan touches any `.js` file in `api/`, `admin/`, or `mcp-server/`, include at least one task to create or update a corresponding test file in the project's test directory (e.g. `api/tests/` for API code). If a plan legitimately needs no automated tests, explain why in the Notes section.

---

## Step 3 — Update the ASCII sitemap

Read `sitemap.md`:
```
/Users/lukeishammacbookair/Developer/thejesuswebsite/sitemap.md
```

The `sitemap.md` is the canonical file/folder tree for the project. It is separate from
`setup/Website_guide.md`, which contains its own parallel tree with annotations for
project context. **Plans write only to `sitemap.md`** — do not modify `Website_guide.md`.

If the plan adds new **files or folders**, add them in the correct place in the ASCII tree.
Do not annotate tables, routes, or any non-filesystem content — the sitemap is a file/folder
tree only. If a file or folder already exists, leave it as-is. Only edit the sections
relevant to this plan. Preserve the existing formatting exactly.

---

## Step 4 — Create a validation checklist

Save a checklist file at:
```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/TESTS/<module-name>_tests.md
```

Where `<module-name>` matches the module (e.g. `frontend_tests.md`, `api_tests.md`).
If the file already exists, append a new section for this plan rather than overwriting it.

> **Note:** These are manual validation checks, distinct from automated `.test.js` files.
> Automated tests are handled by the plan's own implementation tasks (see Step 2).

### Checklist format

```markdown
## Validation: <Feature Name>
**Plan:** <plan filename>
**Date:** <today's date>

### Manual checks
- [ ] <What to look at in the browser / admin / terminal and what passing looks like>

### Code-review checks
- [ ] <Rule ID> — <check description>
- [ ] <Rule ID> — <check description>
- [ ] <Any additional checks specific to this feature>
```

---

## Step 5 — Validate the plan for internal consistency

Review every file you created or edited in Steps 2–4 for these plan-level issues:

**Plan structure:**
- Every task in the plan references at least one specific file path.
- Every implementation file listed in "Files touched" appears in at least one task. Config, dependency, and environment files (`package.json`, `.env`, etc.) that are implicitly updated by a task are exempt.
- Tasks are in dependency order — nothing depends on a later task.
- No task bundles unrelated changes (SR-1).

**Plan vs. coding rules:**
- The "Coding rules to keep in mind" section lists every rule that this plan's implementation would need to respect. If the plan touches frontend HTML, `HTML-1` through `HTML-5` should be considered. If it touches CSS, `CSS-1` through `CSS-6` should be considered. Only list rules that are actually relevant — don't list all of them just to be safe.
- No task describes an action that would violate a listed rule (e.g. a task saying "add inline styles" when `CSS-2` is listed).

**Sitemap consistency:**
- Every new file or folder in the plan's "Files touched" section appears in `sitemap.md`.
- No pre-existing entries were accidentally modified or removed.

**Checklist consistency:**
- The checklist covers every module the plan touches.
- Code-review checks include the rule IDs relevant to the files being created/modified (not a generic copy of every rule).

Fix any issues you find in files you just created. If you find pre-existing issues in files you did not edit, note them for Step 6 — do not fix them here.

---

## Step 6 — Log unresolved issues to Issues.md

Open `/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Issues.md` and append any
issues found in Step 5 that were **not fixed** — pre-existing problems, ambiguities you
cannot resolve in this session, or anything that needs a separate decision.

If there are no unresolved issues, skip this step.

If the `Issues.md` file doesn't have a table yet, create one with this header:

```markdown
| # | File | Issue | Rule | Plan | Date | Status |
|---|------|-------|------|------|------|--------|
```

Append one row per issue. Do not remove or edit existing rows — only add new ones.

| Column | What to put there |
|---|---|
| `#` | Auto-increment from the last row in the table |
| `File` | Path relative to the project root (e.g. `frontend/evidence/index.html`) |
| `Issue` | One-sentence description of the problem |
| `Rule` | The Vibe Coding Rule ID if applicable (e.g. `JS-6`, `CSS-2`, `HTML-1`), or `bug` / `warning` |
| `Plan` | Filename of the plan that surfaced this issue |
| `Date` | Today's date |
| `Status` | Always `open` when first added |

---

## Step 7 — Finalise the plan

> **⚠️ DO NOT SKIP THIS STEP. If you do nothing else, you MUST do this.**

Open the plan file you created in Step 2 (in `PLANS/New/`). Change the **Status**
field from `Drafting` to:

```
**Status:** ✅ Plan generated — ready for implementation
```

Do **not** check off the implementation task checkboxes (`- [ ]` → `- [x]`). Those are for
the implementer to mark as they complete each task.

### How to complete a plan

When every task in a plan is implemented:
1. Tick all remaining checkboxes (`- [ ]` → `- [x]`).
2. Change the **Status** field in the header to `✅ Completed`.
3. Move the plan file from `PLANS/New/` to `PLANS/Completed/`.

The plan stays in `PLANS/New/` until implementation is finished — do not move it early.

---

## Final output to the user

After completing all steps, tell the user:

1. The path to the plan file in `PLANS/New/`.
2. A short summary of the tasks in the plan (bullet list, one line each).
3. What was added or changed in the sitemap.
4. The path to the validation checklist file.
5. Any issues logged to `Issues.md` (number of rows added, or "none").
6. Reminder: when ready to push, use `git add -p`, `git commit -m "plan: <feature name>"`, `git push`.


