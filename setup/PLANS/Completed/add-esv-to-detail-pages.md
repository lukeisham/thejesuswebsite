# Plan: Add ESV Verse Enhancement to All Detail Pages

**Module(s):** Frontend
**Date:** 2026-07-22
**Status:** ✅ Completed
**Live site:** https://thejesuswebsite.org <!-- Canonical production origin. NOT thejesuswebsite.com — that is an unrelated, dead domain (see setup/Issues.md #78). -->

## Goal
Add the `esv_verse.js` script to evidence, essay, response, and blog detail page templates so ESV verse citations in body text are replaced with the live ESV API rendering — matching the behaviour already present on `about.html` and documented in `Website_guide.md` line 364.

## Coding rules to keep in mind
- **HTML-4** — scripts at bottom of `<body>` with `defer`, consistent with the existing pattern on all four pages.
- **JS-5** — `esv_verse.js` already uses `async/await` + failure-soft (progressive enhancement); no changes needed.

## Tasks

### Frontend — HTML

- [x] **Add esv_verse.js to evidence detail** — add `<script type="module" src="/assets/js/esv_verse.js" defer></script>` before the existing `main.js` script tag. File: `frontend/evidence/[slug].html`
- [x] **Add esv_verse.js to essay detail** — same change. File: `frontend/contextual-essays/[slug].html`
- [x] **Add esv_verse.js to response detail** — same change. File: `frontend/debate/responses/[slug].html`
- [x] **Add esv_verse.js to blog detail** — same change. File: `frontend/news-and-blog/blog/[slug].html`

### Deploy & verify

- [x] **Push to GitHub** — `git add -p`, `git commit -m "esv: add verse enhancement to all detail pages"`, `git push`.
- [x] **Smoke test** — verify each deployed page includes the `esv_verse.js` script tag via `curl -s https://thejesuswebsite.org/evidence/<any-slug> | grep 'esv_verse.js'` (should return a match). Repeat for essay, response, and blog detail URLs. Also confirm no console errors by checking that `esv_verse.js` itself loads: `curl -sI https://thejesuswebsite.org/assets/js/esv_verse.js | grep '200'`.

## Files touched
- `frontend/evidence/[slug].html` — modified
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/news-and-blog/blog/[slug].html` — modified

## Error notification

**a) Does this plan impact existing error handling?**

No. `esv_verse.js` is progressive enhancement — on any failure (network, missing API key, invalid reference) the hardcoded fallback text stays visible. No new error paths.

**b) Should this plan add, update, or remove any error notification behaviour?**

No.

## Notes
- `esv_verse.js` is already documented in `Website_guide.md` as being loaded on all detail pages — this plan makes the reality match the documentation.
- The ESV API proxy (`api/routes/esv.js`) is already deployed and working. No server changes needed.
- Challenge detail pages (`academic-challenges/[slug].html`, `popular-challenges/[slug].html`) are excluded — they render responses inline and don't have their own body text with ESV citations. Responses have their own detail page (`debate/responses/[slug].html`) which IS included.
- No sitemap change.
- Load order: `esv_verse.js` before `main.js` — `esv_verse.js` self-initialises on `DOMContentLoaded`, and `main.js` also listens for `DOMContentLoaded`, so order within the defer block doesn't matter, but placing it before `main.js` keeps ESV enhancement logically ahead of general page init.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
