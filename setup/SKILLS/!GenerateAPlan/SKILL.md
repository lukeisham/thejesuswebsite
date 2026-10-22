---
name: generate-plan
description: >
  Generate a structured implementation plan for any feature, section, or module
  of the jesuswebsite project. Trigger when the user wants to map out work before
  writing code — "create a plan", "plan out X", "how should we approach building X",
  or any similar request for upfront design and task breakdown.
---

# Generate Plan

You turn a request for new work into a plan file that another agent can implement without
reading this skill. Follow every step in order. Do not skip steps. All paths are relative to
the project root.

The plan's content and wording live in `setup/plan_template.md`. This skill holds the
procedure: what to read, what to decide, and what to check. When the two seem to differ, the
template wins for plan content.

---

## Step 0 — Check the scope

1. If the request is ambiguous (which page, which records, what "done" looks like), ask Luke
   one or two short questions before you read anything else. Do not guess the scope.
2. List `setup/PLANS/New/`. If a plan for the same feature exists, tell Luke and ask whether
   to extend it or write a new one.

---

## Step 1 — Read the sources of truth

### 1.1 Always read

| File | Why |
| :-- | :-- |
| `setup/Vibe_coding_rules.md` | Every task must respect it. Read the Checklist and the Core Rules with extra care, and TEST-10, which decides the guide tests. |
| `setup/ARCHITECTURE/Website_guide.md` | Project map and cross-module patterns. |
| `setup/ARCHITECTURE/INDEX.md` | Lists the subsystem guides. |
| `database/schema.sql` | Tables, columns, constraints and foreign keys. |
| `setup/Decisions_log.md` | A plan must not undo a logged decision. Search it for every file and rule the plan touches (CORE-4). |
| `setup/plan_template.md` | The plan's structure and its fixed text. |

### 1.2 Read when the plan touches them

- **Subsystem guides.** For each subsystem in `setup/ARCHITECTURE/INDEX.md` that the plan
  touches, read its guide. If the plan spans several, read them all.
- **Style guide.** Read `setup/STYLE_GUIDE/INDEX.md`, then only the section files it names for
  this kind of change. A new page type or a site-wide visual change reads all of them. A
  backend-only plan needs only the index.

### 1.3 Read the code that the plan changes

For each file that the plan will modify, open it. Confirm that every function, route, table,
column and CSS class that a task names exists, with the name and signature you will write
(AG-5). For each file that the plan will create, open its closest sibling and note the
conventions it must match (SR-8). A task that names something you did not see in the code is
a defect.

---

## Step 2 — Write the plan

### 2.1 File

Copy `setup/plan_template.md` to `setup/PLANS/New/<feature-name>.md`. Use kebab-case.

### 2.2 Sections

Fill every section of the template, in its order:

1. **Purpose statement** — the first paragraph under the title: what the plan delivers and
   why, in 40 words or fewer (CORE-6, DOC-1). Other sections call it the plan's *goal*.
2. **Header fields** — module, date, **Status** `Drafting`, and **Live site**. Take the live
   origin from the codebase (`api/config/load-env.js`, `frontend/assets/js/utils/site-meta.js`:
   `https://thejesuswebsite.org`), never from the wording of the request or a bug report.
3. **Coding rules to keep in mind** — the rule IDs that this plan's work could break.
4. **Tasks** — grouped by layer in dependency order. See 2.3 and 2.4.
5. **Files touched** — every file created or modified, marked `created` or `modified`.
6. **Per-file rule check** — one row per file in Files touched. See 2.5.
7. **Guide tests** — see 2.6.
8. **Error notification** — answer both questions. The error architecture is in
   `setup/ARCHITECTURE/error-notification.md`.
9. **Notes** — edge cases, constraints and ordering dependencies.
10. **Completion Protocol** — keep the template's text. Add the issue-resolving task from
    Step 6.2 if it applies.

### 2.3 Task writing rules

- One file or one clearly scoped change per task (SR-1). Never bundle unrelated changes.
- Dependency order: nothing depends on a later task.
- Start each title with an imperative verb: `Add`, `Create`, `Update`, `Extend`, `Write`.
- Name the actual file path in every task.
- **Automated tests.** If the plan touches a `.js` file in `api/`, `admin/` or `mcp-server/`,
  add at least one task that creates or updates its test file. If no test is needed, say why
  in Notes.
- **New HTML page.** Add a task that registers it with the sitemap generator,
  `api/scripts/generate-sitemap.js` (a static page goes in `SECTION_PAGES`). Never edit
  `frontend/sitemap.xml` by hand: `deploy.sh` regenerates it from that script.
- **Core Rules pass group.** After the implementation groups, add one task for each file
  marked `modified` in the Per-file rule check. Use the template's task text.
- **Guides and guide tests group.** Beside the Core Rules pass, add one task for each guide
  that the plan edits and one for each guide test file that it adds or updates. Leave the
  group out if the Guide tests section says "None".
- **Close out group.** Just before Deploy & verify, add the issue-resolving task from Step
  6.2, if any.

### 2.4 Deploy & verify group (always last)

Copy the group from the template. Choose the tiers with the template's two routing questions,
and keep only the tasks and playbook blocks for those tiers. Do not paraphrase the playbooks.

- **Tier 1 is in every plan**, whatever other tiers apply.
- **Tier 2** is the local Claude Browser pane. It cannot sign in.
- **Tier 3** is the user's real Chrome. Use it for anything that needs production data or a
  login, and for every `/admin/` page. If a Tier 3 task touches `/admin/`, say in the task
  text that Luke must sign in with a passkey mid-test, so the implementer asks first.
- Only Tier 3 may be deferred, and only when Luke is unavailable.

### 2.5 Per-file rule check

| Kind of file | What its row needs |
| :-- | :-- |
| Modified file | The rule IDs that the change can break, plus Touch rule + CORE-5 steps 1–4, and a task in the Core Rules pass group. |
| Modified doc (guide, style guide, README) | The above, plus its purpose statement brought to 40 words or fewer (CORE-6). |
| Created file | The rule IDs that apply. It meets the Core Rules from the first commit. |

Never add a file to the plan only to clean it (Touch rule).

### 2.6 Guide tests

Answer the template's three questions (TEST-10):

1. Which guide rows does the plan add or edit? If none, write "None" with the reason, and stop.
2. Which of those rows can a text search check (a banned pattern, or a value that two files
   must share)? Each gets a task to add or update `api/tests/guide-<guide-name>.test.js`, and
   the guide task names the test next to the rows.
3. Which rows stay prose (meaning or behaviour)?

Never plan an exception or a wider pattern only to make a red test pass (AG-4).

---

## Step 3 — Check the sitemap

If the plan adds a new HTML page, confirm that Step 2 has a task to register it in
`api/scripts/generate-sitemap.js`. Do not edit `frontend/sitemap.xml`.

---

## Step 4 — Create a validation checklist

Save it at `setup/CHECKLISTS/<module-name>_tests.md` (for example `frontend_tests.md` or
`api_tests.md`). If the file exists, append a section. Never overwrite it. These are manual
checks. Automated tests are tasks in the plan.

```markdown
## Validation: <Feature Name>
**Plan:** <plan filename>
**Date:** <today's date>

### Manual checks
- [ ] <What to look at in the browser / admin / terminal and what passing looks like>

### Code-review checks
- [ ] <Rule ID> — <check description>
- [ ] Touch rule + CORE-5 — `<modified file>`: comments give the why and the links, the guide matches the file
- [ ] TEST-10 — `<guide test file>`: fails with the rule, file, line and guide path; exceptions are named with a reason
```

Write one Touch rule + CORE-5 line for each `modified` file, and one TEST-10 line for each
guide test file. Leave out the TEST-10 line if the plan has no guide test.

---

## Step 5 — Check the plan

Check every file you wrote in Steps 2–4. Fix what you find in those files. Note problems in
other files for Step 6. Do not fix them.

| Area | Check |
| :-- | :-- |
| Purpose | The first paragraph under the title is 40 words or fewer and states the intent, not the how. |
| Live site | The header has the field, and every URL in the plan uses `https://thejesuswebsite.org`. |
| Tasks | Every task names a file path. Every file in Files touched has a task, except config files changed as a side effect (`package.json`, `.env`). The order respects dependencies. No task bundles unrelated changes. |
| Code names | Every function, route, table, column and class that a task names was seen in Step 1.3. |
| Decisions | No task undoes an entry in the decisions log. |
| Per-file rule check | One row per file in Files touched, and no others. Every `modified` row has a Core Rules pass task. No file is in the plan only to clean it. |
| Guide tests | All three questions are answered. Every checkable row has a guide test task, and a guide task that names the test. |
| Tier 1 | Present. It runs `cd api && npm test` when the plan touches `api/` or a guide test. Every command it names is real: in a `package.json` script, or `node --test <area>/tests/<module>.test.js`. |
| Tiers 2–3 | Nothing browser-visible stops at Tier 1. Nothing that needs production data or a login stops at Tier 2. Every playbook block has a matching tier task, and every tier task has its playbook. A Tier 3 task on `/admin/` says so. |
| Rules | The rules list holds only relevant rules. No task breaks a listed rule. |
| Errors | If error handling is affected, each file that produces or shows errors has a task that names `sendError`, `sendValidationError` or `showToast(..., "error")`. A new failure mode has a task to add its `E-*` code to `api/lib/error-codes.js`. |
| Sitemap | Each new HTML page has a `generate-sitemap.js` task. |
| Checklist | It covers every module the plan touches, with rule IDs for the actual files, not a copy of every rule. |

---

## Step 6 — The issue log

`setup/ISSUES/issues.md` is the active log. Older rows sit in archives named
`setup/ISSUES/Issues_<first>_to_<last>.md`. A row's number tells you which archive holds it.
An archived row can still be `open`.

### 6.1 Log new problems

Append one row for each problem found in Step 5 that you did not fix: a pre-existing defect,
an ambiguity you could not resolve, or anything that needs a separate decision. Never log the
problem that the plan exists to fix. That is its goal. If you found nothing, skip this.

| Column | Content |
| :-- | :-- |
| `#` | One past the highest `#` in `issues.md` |
| `File` | Path from the project root |
| `Issue` | One sentence |
| `Rule` | The rule ID, or `bug` / `warning` |
| `Plan` | The plan's filename |
| `Date` | Today's date |
| `Status` | `open` |

Only add rows. Never remove or edit an existing row.

### 6.2 Resolve existing rows

If the plan's goal is to fix rows that are already logged, do not add new rows for them. Find
each row in `issues.md` or in its archive. Add a Close out task that changes only that row's
`Status` cell to `resolved`, in the file that holds it, once the fix is verified.

---

## Step 7 — Finalise the plan

> **⚠️ DO NOT SKIP THIS STEP.**

1. Change the plan's **Status** from `Drafting` to `✅ Plan generated — ready for implementation`.
2. Leave every task checkbox unticked. They belong to the implementer.
3. Confirm the plan ends with the template's **Completion Protocol** section.

---

## Final output to the user

Tell Luke:

1. The path of the plan file.
2. The tasks, one line each.
3. Any new HTML page and its sitemap task, or "no new pages".
4. The path of the validation checklist.
5. The issue-log rows added, by file and title, or "none".
6. The verification tiers the plan carries and why, for example "Tiers 1 and 3: the admin
   editor cannot be checked without a login."
7. Whether the plan resolves existing issue rows, and which.
8. How many files are `modified` (each with a Core Rules pass task) and how many are `created`.
9. The guide tests the plan adds or updates, or "none" with the reason.
