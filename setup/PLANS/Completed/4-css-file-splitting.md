# Plan: CSS File Splitting (CSS-1 compliance)

**Module(s):** Frontend
**Date:** 2026-07-11
**Status:** ✅ Completed

## Goal
Split the seven public-site CSS files that exceed the CSS-1 150-line cap into focused per-component files, restoring "one file, one job" across `frontend/assets/css/`, and resolve Issues.md row #23.

> Note: this plan replaces the originally proposed "port historiography fixes to essays/blog" plan — verification showed Issues #12/#14/#15 are already implemented (`getAllAdmin()` in both models, field names corrected, `frontend/assets/js/utils/mla.js` formatter wired in) and marked resolved.

## Coding rules to keep in mind
- **CSS-1** — the rule being enforced: each resulting file styles exactly one component/layout/page, under 150 lines.
- **CSS-3** — when extracting a component's rules, its `@media` blocks move with it into the same new file.
- **CSS-2 / CSS-4 / CSS-5** — pure move-refactor: do not rewrite selectors, values, or names while splitting; behaviour must be byte-identical in aggregate.
- **HTML-4** — new `<link>` tags go in `<head>`, in the same order the rules previously appeared, to preserve the cascade.
- **SR-3** — each split adds a stylesheet request; keep splits to natural component seams (don't over-fragment).

## Tasks

### Split oversized files (largest first)

- [x] **Split `timeline.css` (458 lines)** — extract cohesive sections (e.g. axis/track, event dots & labels, era navigation, zoom/detail panel, mobile-vertical mode) into new files under `frontend/assets/css/pages/timeline/`, leaving a base `timeline.css` under 150 lines. File: `frontend/assets/css/pages/timeline.css`
- [x] **Update timeline page `<link>` tags** — add the new stylesheets, preserving original rule order, to `frontend/evidence/timeline/index.html`, the 9 era pages, and their 9 `zoom-*` pages. Files: `frontend/evidence/timeline/**/*.html`
- [x] **Split `maps.css` (290 lines)** — extract map-canvas, legend/controls, and detail-panel sections into new files under `frontend/assets/css/pages/maps/`, leaving `maps.css` under 150 lines. File: `frontend/assets/css/pages/maps.css`
- [x] **Update maps page `<link>` tags** — add the new stylesheets to `frontend/evidence/maps/index.html`, `[map_key].html`, the 5 named map pages, and the 5 `zoom-*` pages. Files: `frontend/evidence/maps/**/*.html`
- [x] **Split `search.css` (218 lines)** — extract the results-list and search-controls sections into separate component files. File: `frontend/assets/css/components/search.css`
- [x] **Split `arbor.css` (182 lines)** — extract the node/edge styles from the panel/controls styles. File: `frontend/assets/css/pages/arbor.css`
- [x] **Split `navigation.css` (164 lines)** — extract the mobile-drawer section into its own file if it forms a clean seam; otherwise trim to a compliant split by component. File: `frontend/assets/css/layout/navigation.css`
- [x] **Split `evidence.css` (162 lines)** — extract the list-card grid from the detail-page styles. File: `frontend/assets/css/pages/evidence.css`
- [x] **Split `filters.css` (156 lines)** — extract the filter-chip styles from the filter-panel styles. File: `frontend/assets/css/components/filters.css`
- [x] **Update remaining page `<link>` tags** — every page that linked search/arbor/navigation/evidence/filters CSS gets the corresponding new links in cascade-preserving order (navigation.css is linked site-wide). Files: affected `frontend/**/*.html` pages

### Verify

- [x] **Confirm every CSS file is under 150 lines** — run a line-count sweep over `frontend/assets/css/**/*.css`; no file ≥150 lines remains. Files: `frontend/assets/css/**/*.css`
- [x] **Visual spot-check locally** — serve the site locally and compare timeline, maps, search, arbor, evidence list, and navigation (desktop + mobile widths) against production for visual parity. Files: pages above

### Close out

- [x] **Mark Issues.md row #23 resolved** — once the split is verified, update only the `Status` cell of row #23 from `open` to `resolved`, via a small Python script (never manual edit). File: `setup/Issues.md`

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "CSS file splitting (CSS-1 compliance)"`, `git push`.
- [x] **Test live** — **only if the implementing agent is Claude.** After auto-deploy, open `https://thejesuswebsite.org/evidence/timeline/`, `/evidence/maps/`, `/evidence/search.html`, and `/evidence/arbor.html` and confirm styling is intact on desktop and mobile widths (Cloudflare caches assets `immutable` — hard-refresh or check with cache-busting query if styles look stale). If the implementing agent is any other LLM (e.g. DeepSeek), skip this task and leave a note that live testing was deferred. ⚠️ **Deferred** — implementing agent is DeepSeek; live testing must be performed manually after push.

## Files touched
- `frontend/assets/css/pages/timeline.css` — modified (shrunk); new files created under `frontend/assets/css/pages/timeline/`
- `frontend/assets/css/pages/maps.css` — modified (shrunk); new files created under `frontend/assets/css/pages/maps/`
- `frontend/assets/css/components/search.css` — modified; sibling component file(s) created
- `frontend/assets/css/pages/arbor.css` — modified; sibling file(s) created
- `frontend/assets/css/layout/navigation.css` — modified; sibling file(s) created
- `frontend/assets/css/pages/evidence.css` — modified; sibling file(s) created
- `frontend/assets/css/components/filters.css` — modified; sibling file(s) created
- `frontend/evidence/timeline/**/*.html`, `frontend/evidence/maps/**/*.html`, and all pages linking the split stylesheets — modified (`<link>` tags)
- `setup/Issues.md` — modified (row #23 → resolved)

## Notes
- Exact new-file names are the implementer's call at the natural seams found in each file; the constraint is CSS-1 (single job, <150 lines) and an unchanged cascade.
- `Cloudflare/nginx serve `/assets/` with `Cache-Control: public, immutable` (1y)` — new CSS filenames sidestep staleness for the new files, but the shrunk originals keep their names; expect edge-cache staleness on those until TTL/purge. This is cosmetic-risk only if link order is preserved.
- No automated tests: this plan touches no `.js` files in `api/`, `admin/`, or `mcp-server/`; correctness is visual parity, covered by the manual checklist (`setup/TESTS/frontend_tests.md`).
- No new HTML pages — `frontend/sitemap.xml` unchanged.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md` rows #3/#4) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan**. Do **not** log the problem this plan was created to fix.
- **Resolving issues**: This plan fixes Issues.md row #23 — update only that row's `Status` cell from `open` to `resolved` (via script) once verified; leave every other row untouched.
- **Plan lifecycle**: Once every task is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — code changes, the `setup/Issues.md` update, and this plan file's own edits/move all go in the same push as "Deploy & verify". Nothing is considered done until it's pushed.
