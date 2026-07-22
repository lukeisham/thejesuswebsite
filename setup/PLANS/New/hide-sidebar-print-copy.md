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
- [ ] **Test live** — requires Claude in Chrome (browser-based UI verification). Open `https://thejesuswebsite.org/about.html`, expand the hamburger menu, then trigger Print Preview (Cmd+P) and confirm the sidebar is not visible in the print output. Repeat for `https://thejesuswebsite.org/evidence/<any-slug>`. Also test Copy Contents on both pages with the sidebar open — confirm no sidebar navigation text appears in the copied output. If the implementing agent is not Claude, defer to Claude in Chrome.

### Live testing playbook

1. **Use the canonical origin from the header's `Live site:` field** (`https://thejesuswebsite.org`). Never test against `thejesuswebsite.com` or any URL taken from a bug report without checking it against the header first.
2. **Curl before browser.** Confirm the origin responds before opening any browser tool: `curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://thejesuswebsite.org/<page>` must return `200` (or an expected redirect). If it doesn't, stop and diagnose DNS/deploy — do NOT launch the browser at a dead URL; a hung connection can time out for minutes and leave the browser pane in a bad state.
3. **Curl-first triage.** Check what curl alone can prove before reaching for the browser: response headers (`cf-cache-status`, `last-modified`, `cache-control`), JSON endpoints (`/api/...`, `/assets/data/*.json`), and asset freshness (fetch the deployed JS/CSS file and `diff` it against the local copy). The browser is only needed to confirm client-side rendering and console/network errors.
4. **Browser sequence (Claude Code Browser pane):** call `preview_start` with `{url: "https://thejesuswebsite.org/<page>"}` exactly once, note the `tabId` it returns, and pass that `tabId` explicitly to every subsequent `navigate` / `read_page` / `javascript_tool` / `read_console_messages` call. Never call `navigate` before a successful `preview_start`. If `preview_start` times out, fix the URL/connectivity first, then call `preview_start` again fresh — don't try to salvage the half-initialized pane with `navigate`.
5. **Verify via DOM, not screenshots.** Prove the change with `read_page` (accessibility tree) or a `javascript_tool` query (e.g. `document.querySelector('.some-class')?.textContent`, `getBoundingClientRect()`, computed styles) plus `read_console_messages` for errors. Screenshots are optional supporting evidence only — they can render blank right after a JS-driven scroll and must never be the sole proof that something works.
6. **Cloudflare staleness:** a check run within ~60s of the deploy can hit a stale edge cache (HTML `max-age=60`; the deploy workflow purges, but propagation isn't instant). If a live check looks stale right after a push, wait ~30–60s and re-check `cf-cache-status` before concluding the deploy failed.

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
