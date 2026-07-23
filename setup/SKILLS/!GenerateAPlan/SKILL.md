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

Always read these three files so every task you write respects the project's rules and structure:

```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Vibe_coding_rules.md
/Users/lukeishammacbookair/Developer/thejesuswebsite/database/schema.sql
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/Website_guide.md
```

The style guide is split by section under `setup/STYLE_GUIDE/`. Always read the
index first, then only the section files relevant to the plan — don't open all
of them for a narrow change:

```
/Users/lukeishammacbookair/Developer/thejesuswebsite/setup/STYLE_GUIDE/INDEX.md
```

INDEX.md maps each file to the §-numbers it covers and when to read it
(foundations, animation, components, content-patterns, pages-and-admin,
history). Pick the files that match what this plan touches — e.g. a new page
template needs `content-patterns.md` and probably `components.md`; a purely
backend/API plan may need none beyond the index. If the plan is broad (a new
page type, a site-wide visual change), read all of them.

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

1. **Header** — `# Plan: <Feature Name>`, plus module, date, a **Status** field set to `Drafting`, and a **Live site** field giving the canonical production origin. Source that origin from the codebase (`README.md`, `api/config/load-env.js`, `frontend/assets/js/utils/site-meta.js` — currently `https://thejesuswebsite.org`), **never** from the wording of the user's request or a bug report: a plan was once written entirely against `thejesuswebsite.com`, an unrelated dead domain, wasting the whole diagnostic pass (see `setup/Issues.md` #78).
2. **Goal** — one or two sentences describing what this plan delivers and why.
3. **Coding rules to keep in mind** — list any Vibe Coding Rules that are especially relevant to this plan. Reference them by ID (e.g. `JS-5`, `CSS-2`).
4. **Tasks** — grouped by layer (Database, API, Frontend, etc.) in dependency order, ending with a **Deploy & verify** group carrying the three-tier verification ladder (see below).
5. **Files touched** — every file that will be created or modified, with `— created` or `— modified`.
6. **Error notification** — answer two questions: **(a)** does this plan impact existing error handling (changes to a route, model, or frontend component that produces or displays errors)? If yes, list which `E-*` error codes are affected and whether new codes are needed. **(b)** Should the plan add, update, or remove any error notification behaviour (new error toast calls, new `sendError`/`sendValidationError` usage, changes to `error-fallback.js`, etc.)? Reference `setup/Website_guide.md` § Error Notification for the encoding architecture.
7. **Notes** — edge cases, constraints, ordering dependencies, anything non-obvious.
8. **Completion Protocol** — always present, copied/adapted from `plan_template.md`'s own Completion Protocol section (see below). Every plan carries this verbatim so an implementing agent that only reads the plan file — not this skill — still knows how to finish it correctly.

### Completion Protocol section (required in every plan)

Every plan must end with a `## Completion Protocol` section, addressed to *any* implementing agent (not just Claude), covering:

- **Markdown edits happen via a Python script, never manual find/replace.** State plainly that hand-edited markdown/HTML is a known source of corruption in this codebase (cite `setup/Issues.md` if it has relevant rows) and that whoever implements this plan should write a small script to parse-and-rewrite rather than hand-edit checkboxes, status fields, or `Issues.md` rows.
- **Tick checkboxes as tasks complete** (`- [ ]` → `- [x]`).
- **Mark related Issues.md rows resolved, if applicable** — only if this plan's Goal is to fix issue(s) already logged in `setup/Issues.md` by an earlier plan. Add a corresponding task earlier in the Tasks list (a "Close out" group just before "Deploy & verify" is the natural home) that updates only the `Status` cell for those specific row(s) from `open` to `resolved`, once the fix is verified. Do not add this if the plan doesn't resolve any existing Issues.md rows.
- **Shipped-artifact audit before completion** — before flipping Status to Completed, verify every file listed in **Files touched** actually exists with the *planned content*, not a stub or placeholder (e.g. `ls` created directories and open key files; a vendored library directory containing only a README is a failed audit). If any planned artifact is missing or smaller than specced, the plan stays in `PLANS/New/` with a note describing the gap. (History: a dictionary upgrade was once marked done with only a README shipped.)
- **Plan lifecycle**: once every task is checked *and the shipped-artifact audit passes*, flip the header's **Status** to `✅ Completed` and move the file from `PLANS/New/` to `PLANS/Completed/`.
- **Push everything to GitHub as the final step** — code changes, any `Issues.md` update, and the plan file's own edits/move, all in the same push described in "Deploy & verify".

### Deploy & verify group (always last)

Every plan ends with a **Deploy & verify** group containing a **Push to GitHub** task plus verification, which is a **three-tier ladder**. Copy the group and the matching playbook blocks from `plan_template.md` verbatim.

| Tier | Task | Tool | Include when |
|---|---|---|---|
| **1** | Smoke test | Bash — test suite, `curl`, run the script | **Always. Every plan, no exceptions.** |
| **2** | Browser check | `mcp__Claude_Browser__*` on the local dev server, run *before* the push | Browser-visible **and** provable without real data or a login |
| **3** | Chrome check | `mcp__claude-in-chrome__*` + the user's passkey sign-in, against the live site | Needs **real production data**, **or** touches `/admin/` UI/UX, **or** anything behind auth |

**Route with two questions:** (1) Is any of it observable in a browser? No → Tier 1 only. (2) Does seeing it work correctly need production data or a logged-in session? Yes → Tier 3, no → Tier 2.

Rules:

- **Tiers are cumulative, not alternatives.** A Tier 3 plan still carries Tier 1. Everything that can be smoke-tested is smoke-tested — never delete Tier 1 because a higher tier applies.
- **Tier 3 supersedes Tier 2 for the same page**, but a plan touching both public and admin surfaces carries both, each scoped to its own pages.
- **Copy only the playbook blocks the plan uses.** `plan_template.md` holds `### Tier 2 playbook` and `### Tier 3 playbook`; include the ones matching this plan's tiers and delete the rest. Do not paraphrase them — they exist verbatim so an agent that reads only the plan file gets the full procedure.
- **The two browser tool families are NOT interchangeable.** `mcp__Claude_Browser__*` (the sandboxed pane) cannot authenticate — it has no access to a passkey registered in real Chrome. Any `/admin/` or logged-in page is `mcp__claude-in-chrome__*`, always. (— `Issues.md` #99)
- **If a Tier 3 task touches `/admin/`, say so in the task text** — that the page needs passkey auth and the user must sign in mid-test — so the implementing agent pauses to ask *before* opening the browser rather than discovering the redirect mid-test.
- **Tier 3 is the only tier that may be deferred.** If the user is unavailable, leave it unchecked and annotated; the plan stays in `PLANS/New/`. Tiers 1–2 need nobody's help and have no excuse. (History: issues recurred repeatedly when fixes were marked complete with live testing deferred.)
- **Non-Claude agents** (e.g. DeepSeek in Zed) can't run Tiers 2–3: leave the box unchecked with "Deferred to Claude in Chrome: <reason>" and do not move the plan to `PLANS/Completed/`.

### Task writing rules

- Each task must be **bite-sized**: one file or one clearly scoped change per task.
- Tasks must be in **dependency order** — things that must exist before others come first.
- Task titles use an imperative verb: `Add`, `Create`, `Update`, `Extend`, `Write`.
- Reference the **actual file path** in every task, not just a description.
- Respect SR-1 (one file, one function) — never bundle unrelated changes into one task.
- **Automated tests are mandatory for code-facing plans.** If the plan touches any `.js` file in `api/`, `admin/`, or `mcp-server/`, include at least one task to create or update a corresponding test file in the project's test directory (e.g. `api/tests/` for API code). If a plan legitimately needs no automated tests, explain why in the Notes section.

---

## Step 3 — Update `frontend/sitemap.xml`

Read `sitemap.xml`:
```
/Users/lukeishammacbookair/Developer/thejesuswebsite/frontend/sitemap.xml
```

`frontend/sitemap.xml` is the XML sitemap that tells search engines which pages exist.
If the plan adds new **HTML pages** (e.g. a new evidence detail page, a new list page),
add their `<url>` entries in the correct place. Preserve the existing formatting exactly.
Do **not** modify `setup/Website_guide.md`.

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
- The header's **Live site** field is present and matches the codebase's canonical origin (`https://thejesuswebsite.org`), and every URL in the plan's tasks (live tests, curl checks, example pages) uses that origin — no `.com`, no URLs copied unverified from the user's report.
- Every task in the plan references at least one specific file path.
- Every implementation file listed in "Files touched" appears in at least one task. Config, dependency, and environment files (`package.json`, `.env`, etc.) that are implicitly updated by a task are exempt.
- Tasks are in dependency order — nothing depends on a later task.
- No task bundles unrelated changes (SR-1).

**Verification tiers:**
- A **Tier 1 — Smoke test** task is present. No exceptions, whatever other tiers apply.
- The chosen tier matches the routing questions: nothing browser-visible is stuck at Tier 1; nothing depending on real production data or a login is left at Tier 2.
- Every playbook block in the plan corresponds to a tier task that exists (no orphan Tier 3 playbook on a Tier 1+2 plan, and no tier task missing its playbook).
- Any Tier 3 task touching `/admin/` says so in its task text.

**Plan vs. coding rules:**
- The "Coding rules to keep in mind" section lists every rule that this plan's implementation would need to respect. If the plan touches frontend HTML, `HTML-1` through `HTML-5` should be considered. If it touches CSS, `CSS-1` through `CSS-6` should be considered. Only list rules that are actually relevant — don't list all of them just to be safe.
- No task describes an action that would violate a listed rule (e.g. a task saying "add inline styles" when `CSS-2` is listed).

**Error notification consistency:**
- If the plan's "Error notification" section says error handling is impacted, verify every file listed in "Files touched" that produces or displays errors has a corresponding task referencing `sendError`, `sendValidationError`, `showErrorToast`, `handleApiError`, or `displayError` — whichever helper is appropriate for that layer.
- If the plan adds a new error scenario (new validation failure, new boundary condition), check whether `api/lib/error-codes.js` needs a new `E-*` code. If it does, the plan's Tasks list must include a task to add it.
- If the plan changes how an existing error is surfaced to the user (e.g. switching from `alert()` to error toast, or from raw `res.status(500).json()` to `sendError`), the plan must say so in "Error notification" and the Tasks list must reflect it.

**Sitemap consistency:**
- Every new HTML page in the plan's "Files touched" section has a corresponding `<url>` entry added to `frontend/sitemap.xml`.
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

**Scope:** only log issues **discovered while generating this plan** (or later, during its
implementation). Do **not** log the problem the plan was created to fix in the first place —
that is the plan's Goal, not a new issue.

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

**If this plan instead *fixes* row(s) already logged in `Issues.md` by an earlier plan**, don't add new rows for them — add a task to this plan's Tasks list (and its Completion Protocol section, see Step 7) that marks those specific rows' `Status` as `resolved` once the fix is verified. Never edit a row's `Issue`/`File`/`Rule` text, only its `Status`.

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

Confirm the plan's `## Completion Protocol` section is present and filled in (see Step 2) —
this is what tells whoever implements the plan, including a non-Claude agent who never reads
this skill file, exactly how to finish and close it out.

### How to complete a plan

This is what the plan's own Completion Protocol section instructs; it's restated here for
reference:
1. Update markdown (checkboxes, Status fields, `Issues.md` rows) via a small Python script,
   never manual find/replace — hand edits are how this codebase got stray/duplicated tags in
   its markup in the first place.
2. Tick all remaining checkboxes (`- [ ]` → `- [x]`).
3. If the plan fixes row(s) already logged in `Issues.md`, mark only those rows' `Status` as
   `resolved`.
4. Change the **Status** field in the header to `✅ Completed`.
5. Move the plan file from `PLANS/New/` to `PLANS/Completed/`.
6. Push everything — code, any `Issues.md` update, and the plan file's own edits/move — to
   GitHub as the final step.

The plan stays in `PLANS/New/` until implementation is finished — do not move it early.

---

## Final output to the user

After completing all steps, tell the user:

1. The path to the plan file in `PLANS/New/`.
2. A short summary of the tasks in the plan (bullet list, one line each).
3. What was added or changed in the sitemap.
4. The path to the validation checklist file.
5. Any issues logged to `Issues.md` (number of rows added, or "none").
6. Confirm the plan ends with a **Deploy & verify** group, and state **which verification tiers it carries and why** — e.g. "Tiers 1+3: the admin editor UI can't be checked without a login." Tier 1 is present in every plan without exception.
7. Confirm the plan includes a **Completion Protocol** section, and — if it fixes existing `Issues.md` row(s) — a task to mark those rows `resolved`.



