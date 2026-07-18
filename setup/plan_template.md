# Plan: <Feature Name>

**Module(s):** <Frontend / Admin / API / Database / MCP Server / Shared>
**Date:** <YYYY-MM-DD>
**Status:** Drafting

## Goal
One or two sentences describing what this plan delivers and why.

## Coding rules to keep in mind
- **<Rule ID>** — <why it's especially relevant here>
- **<Rule ID>** — <why it's especially relevant here>

## Tasks

<!-- Add or remove groups as needed. Order by dependency. -->

### <Group — e.g. Database>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### <Group — e.g. API>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### <Group — e.g. Frontend>

- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`
- [ ] **<Verb> <thing>** — one sentence. File: `path/to/file.ext`

### Deploy & verify

<!-- Always include the push task. Include the live-test task only if this plan touches
     user-facing pages/behaviour that can be checked in a browser. Delete it otherwise. -->

- [ ] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "<feature name>"`, `git push`.
- [ ] **Test live** — **only if the implementing agent is Claude.** Open the deployed site in a browser tab and confirm the change works in production. URL: `<live URL / page>`. If the implementing agent is any other LLM (e.g. DeepSeek), skip this task and leave a note that live testing was deferred.

## Files touched
- `path/to/file.ext` — created / modified
- `path/to/file.ext` — created / modified

## Error notification

<!-- Answer both questions. Reference setup/Website_guide.md § Error Notification for the encoding architecture. -->

**a) Does this plan impact existing error handling?**

Yes / No. If yes, list which `E-*` error codes are affected and whether new codes are needed.

**b) Should this plan add, update, or remove any error notification behaviour?**

Yes / No. If yes, describe what changes — new `sendError`/`sendValidationError` calls, new `showErrorToast`/`handleApiError` usage, changes to `error-fallback.js`, etc.

## Notes
Anything that isn't obvious — edge cases, constraints, ordering dependencies.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: If this plan's Goal is to fix row(s) already logged in `setup/Issues.md` by an earlier plan, include a task that updates only the `Status` cell for those specific row(s) from `open` to `resolved` (via script) once the fix is verified working — leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.

