# Plan: Hide Sidebar in Print and Copy Views

**Module(s):** Frontend
**Date:** 2026-07-22
**Status:** ✅ Plan generated — ready for implementation
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). -->

## Goal
Ensure the sidebar, its backdrop, and the hamburger toggle button are never visible in print output or Copy Contents text, regardless of whether the sidebar was open or closed at the time the user triggered the action.

## Coding rules to keep in mind
- **CSS-1** — the fix stays in the existing `print.css`; no new file.
- **CSS-2** — no hardcoded values needed; just selector additions.
- **CSS-5** — avoid `!important`; the selectors being added to the existing `display: none` block already work correctly at that specificity level.

## Tasks

### Frontend — CSS

- [ ] **Extend print.css hide list** — in `frontend/assets/css/base/print.css`, add `.sidebar-backdrop` and `#sidebar-toggle` to the existing `display: none` block (alongside `.sidebar` which is already there). The `.sidebar--open` class is covered already by `.sidebar` being in the list — the class selector `.sidebar` matches the element regardless of additional classes — so no `.sidebar--open` entry is needed. File: `frontend/assets/css/base/print.css`

### Frontend — Copy Contents

- [ ] **Check Copy Contents for sidebar text** — the Copy Contents footer button (`frontend/assets/js/footer.js`) extracts visible text from `<main>`. If the sidebar's text leaks into the copied output because it sits in normal document flow (mobile) or the extraction logic catches it, add `.sidebar` to the exclusion selector. Verify by inspecting the current `getStrippedBodyText()` logic. File: `frontend/assets/js/footer.js` (read-only check; may not need changes)

### Deploy & verify

- [ ] **Push to GitHub** — `git add -p`, `git commit -m "print: hide sidebar backdrop and toggle in print view"`, `git push`.
- [ ] **Smoke test** — verify `print.css` contains `.sidebar-backdrop` and `#sidebar-toggle` in the `display: none` block. Confirm the deployed CSS file on the VPS matches via `curl -s https://thejesuswebsite.org/assets/css/base/print.css | grep -c 'sidebar-backdrop'` (should return ≥1).
- [ ] **Close out issue #98** — update `setup/Issues.md` row 98 `Status` from `open` to `resolved` using a Python script (never hand-edit markdown).

### Close out

- [ ] **Mark issue #98 resolved** — update `setup/Issues.md` row 98 `Status` from `open` to `resolved` using a Python script.

## Files touched
- `frontend/assets/css/base/print.css` — modified
- `setup/Issues.md` — modified (row 98 status update)

## Error notification

**a) Does this plan impact existing error handling?**

No.

**b) Should this plan add, update, or remove any error notification behaviour?**

No.

## Notes
- The `.sidebar` class selector already hides the sidebar in print, including when `.sidebar--open` is present — CSS class selectors match regardless of additional classes. The missing pieces were `.sidebar-backdrop` (the overlay behind the sidebar) and `#sidebar-toggle` (the hamburger button).
- Works "in some places like individual blog post" because blog detail pages use a different template (generated) where the sidebar may not have been expanded at test time — the bug is page-agnostic; the fix applies universally.
- No sitemap change.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: If this plan's Goal is to fix row(s) already logged in `setup/Issues.md` by an earlier plan, include a task that updates only the `Status` cell for those specific row(s) from `open` to `resolved` (via script) once the fix is verified working — leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
