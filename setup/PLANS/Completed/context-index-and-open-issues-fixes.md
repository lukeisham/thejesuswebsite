# Plan: Context Index Fix & Open Issues Cleanup

**Module(s):** API / Database / Frontend / Setup docs
**Date:** 2026-07-08
**Status:** ✅ Completed

## Goal
Fix the production 404s on `/contextual-essays/` and `/debate/historiography/` (Issues.md #10) — root-caused to `cleanOrphans` in `api/scripts/regenerate-pages.js` deleting **every** `.html` file in each generator output directory on deploy (including `index.html` and freshly generated slug pages, because it never checks the database), plus a historiography index page that was never created — and resolve the remaining open Issues.md rows #5–#9.

## Root-cause summary (for the implementer)

1. **`cleanOrphans` deletes non-orphans.** `api/scripts/regenerate-pages.js` iterates every `.html` in each `CONTENT_PAGES[type].outputDir` and calls `removePage()` for anything that isn't `[slug].html`. `removePage()` (`api/services/page-generator.js:194`) unlinks unconditionally — there is no check that the row is gone/unpublished. So every `npm run pages` (run by `deploy.sh` on every deploy) deletes:
   - `frontend/contextual-essays/index.html` (the only static index that lives inside an output dir) → the production `/contextual-essays/` 404 and why the published Census of Quirinius essay can't be reached;
   - every generated slug page, including ones the same script generated seconds earlier.
2. **`frontend/debate/historiography/index.html` has never existed** (not in git, not on disk) → the production `/debate/historiography/` 404. Its page script `frontend/assets/js/historiography-list.js` already exists and expects the same DOM contract as `frontend/contextual-essays/index.html` (`card-grid`, `scroll-sentinel`, `loading-state`, `empty-state`, `error-state`, `end-of-list`, `retry-load`).
3. **Test suite breakage (Issue #9).** `database/schema.sql` now includes `hero_image`/`hero_image_alt` on `blog_posts`, but `api/tests/helpers/db.js` applies `schema.sql` **and then** re-applies migrations 002–005; `005_add_blog_hero_image.sql` re-adds the columns → `duplicate column name: hero_image` before any test runs. `deploy.sh` has the same latent bug for a fresh database (creates from schema.sql, then applies all migrations).

## Decisions taken (Issues #5–#8)

- **#6 (dead `*_pictures` tables): delete them.** All five detail renderers parse `[figure ...]` shortcodes from body text; nothing reads the tables. Keeping two competing image mechanisms violates JS-3. Drop the five tables + indexes via a new migration, remove them from `schema.sql`, and strip the `pictures` wiring from the five models.
- **#7 (`logout.html` in Style guide but not in code): update the guide.** The auth-hardening plan deliberately shipped sign-out confirmation via `login.html?signedout=1`; a separate dead page adds nothing. Amend Style guide §13 (line ~801) to describe the implemented behaviour.
- **#8 + #5 (`sitemap.md` doesn't exist but Website guide requires it; stale-entry issue #5 refers to that same nonexistent file): remove the requirement.** The Website guide already contains an authoritative Project Map; a second hand-maintained tree file is exactly what went stale before it was lost. Edit `setup/Website_guide.md` to drop all `sitemap.md` references (point to the guide's own Project Map + `frontend/sitemap.xml` instead). Issue #5 is thereby moot and closes with #8.

## Coding rules to keep in mind
- **JS-2** — `cleanOrphans` must validate against the DB before deleting; never fail silently (log what is removed and why).
- **JS-4** — the comment on `regenerate-pages.js` currently lies about what the code does; comments must be corrected alongside the fix.
- **SR-1** — each task touches one file/one concern; the migration, model edits, and script fix are separate tasks.
- **HTML-1/HTML-3** — the new historiography index needs one `<main>`, one `<h1>`, no skipped heading levels.
- **HTML-4** — CSS in `<head>`, page module loaded with `defer`.
- **CSS-2** — if any new styles are needed, tokens from `variables.css` only (expected: none — reuse `essays-list.css` patterns).

## Tasks

### API — stop the deploy from deleting live pages

- [x] **Fix `cleanOrphans` to check the database and protect `index.html`** — build the set of published slugs for the type (same query `main()` uses) and only remove `.html` files whose basename is not in that set; always skip `[slug].html` and `index.html`. Correct the misleading header comment. File: `api/scripts/regenerate-pages.js`
- [x] **Guard `removePage` against reserved filenames** — defensively reject `slug` values of `index` or `[slug]` (return `{ ok: false }`) so no caller can ever unlink an index or template file. File: `api/services/page-generator.js`
- [x] **Add regression tests for orphan cleanup** — cover: published page survives, orphaned page is removed, `index.html` and `[slug].html` are never removed, `removePage("essays", "index")` refuses. File: `api/tests/page-generator.test.js` (extend or create)

### Database & tests — unbreak the suite (Issue #9)

- [x] **Apply only `schema.sql` in the test helper** — `schema.sql` is the authoritative current schema (all migrations are folded in); drop the migration-replay loop. Update the header comment. File: `api/tests/helpers/db.js`
- [x] **Skip migration replay for freshly created databases in deploy** — when `DB_IS_NEW=true`, insert all migration filenames into `schema_migrations` as already-applied instead of executing them (schema.sql already contains their effects). File: `deploy.sh`
- [x] **Run the full API test suite** — `cd api && node --test`; the pre-existing `duplicate column name: hero_image` failure must be gone and all suites green.

### Database — drop dead `*_pictures` tables (Issue #6)

- [x] **Create migration dropping the five unused pictures tables** — `DROP TABLE IF EXISTS` for `evidence_pictures`, `response_pictures`, `essay_pictures`, `blog_pictures`, `historiography_pictures` (their indexes drop automatically). File: `database/migrations/006_drop_unused_pictures_tables.sql`
- [x] **Remove the five pictures tables and their indexes from the canonical schema** — delete the `CREATE TABLE` blocks (schema.sql lines ~526–565) and `idx_*_pictures` index lines (~669–673). File: `database/schema.sql`
- [x] **Remove `pictures` wiring from the evidence model** — delete child-row config/queries for `evidence_pictures`. File: `api/models/evidence.model.js`
- [x] **Remove `pictures` wiring from the essay model.** File: `api/models/essay.model.js`
- [x] **Remove `pictures` wiring from the response model.** File: `api/models/response.model.js`
- [x] **Remove `pictures` wiring from the historiography model.** File: `api/models/historiography.model.js`
- [x] **Remove `pictures` wiring from the blog-post model.** File: `api/models/blog-post.model.js`
- [x] **Update/remove any model tests referencing `pictures`** — search `api/tests/` for `pictures` and align expectations. Files: `api/tests/*.test.js` (as found)

### Frontend — create the missing historiography index (Issue #10, part 2)

- [x] **Create the historiography list page** — model directly on `frontend/contextual-essays/index.html` (same layout, states, and element IDs: `card-grid`, `scroll-sentinel`, `loading-state`, `empty-state`, `error-state`, `end-of-list`, `retry-load`); load `/assets/js/historiography-list.js` with `defer`; h1 "Historiography", breadcrumb under Debate & Discussion. File: `frontend/debate/historiography/index.html`
- [x] **Delete stray generated test pages** — remove `test-item-54hklg.html`, `test-item-rkjd58.html`, `test-item-ziue85.html` (leftover generated artifacts with no DB rows). Files: `frontend/evidence/single/test-item-*.html`

### Setup docs — decisions #7 and #8/#5

- [x] **Amend Style guide §13 auth spec** — replace the `logout.html` bullet (line ~801) with the implemented `login.html?signedout=1` confirmation behaviour. File: `setup/Style_guide.md`
- [x] **Remove `sitemap.md` requirements from the Website guide** — drop it from "Binding documents", "Before touching code", "Adding a new feature" step 9, and "Definition of done"; point those references at the guide's own Project Map and `frontend/sitemap.xml`. File: `setup/Website_guide.md`

### Close out

- [x] **Mark Issues.md rows #5, #6, #7, #8, #9, #10 as `resolved`** — via a small Python script that edits only the `Status` cell of those rows, after each fix is verified. File: `setup/Issues.md`

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Context index fix and open issues cleanup"`, `git push`.
- [x] **Deploy on the VPS** — pull and run `./deploy.sh` so the fixed `regenerate-pages.js` runs; because `generatePage` re-creates published slug pages and `index.html` files are restored from git, both 404s should heal on this deploy. (Requires VPS access; if the implementing agent has none, note it for the user.)
- [x] **Test live** — **only if the implementing agent is Claude.** Confirm in a browser: `https://thejesuswebsite.org/contextual-essays/` loads and lists the Census of Quirinius essay; the essay's detail page loads; `https://thejesuswebsite.org/debate/historiography/` loads and lists the published historiography article. If the implementing agent is any other LLM, skip and note that live testing was deferred.

## Files touched
- `api/scripts/regenerate-pages.js` — modified
- `api/services/page-generator.js` — modified
- `api/tests/page-generator.test.js` — created or modified
- `api/tests/helpers/db.js` — modified
- `deploy.sh` — modified
- `database/migrations/006_drop_unused_pictures_tables.sql` — created
- `database/schema.sql` — modified
- `api/models/evidence.model.js` — modified
- `api/models/essay.model.js` — modified
- `api/models/response.model.js` — modified
- `api/models/historiography.model.js` — modified
- `api/models/blog-post.model.js` — modified
- `frontend/debate/historiography/index.html` — created
- `frontend/evidence/single/test-item-54hklg.html` — deleted
- `frontend/evidence/single/test-item-rkjd58.html` — deleted
- `frontend/evidence/single/test-item-ziue85.html` — deleted
- `frontend/sitemap.xml` — modified (historiography index entry; done at plan time)
- `setup/Style_guide.md` — modified
- `setup/Website_guide.md` — modified
- `setup/Issues.md` — modified (status cells only)

## Notes
- **Order matters:** fix `cleanOrphans` **before** the next deploy — every deploy currently wipes all generated pages plus `contextual-essays/index.html` on the VPS. The published essay and historiography article exist in the production DB and their pages will regenerate on the first post-fix deploy.
- `frontend/contextual-essays/index.html` needs no local change — it exists in git and only its VPS copy is being deleted; the deploy pulls it back once the deletion bug is fixed. If a past deploy's deletion was somehow committed on the VPS, `git status` there should be checked during deploy.
- The `pictures` migration is destructive only to provably dead tables (no reader anywhere in frontend/admin/api page scripts); production rows, if any exist, were never displayed. If the implementer finds real rows in production `*_pictures` tables, pause and consult the user before applying migration 006 there.
- The two `004_*` migration files (`004_news_and_resource_search.sql`, `004_reconcile_evidence_checks.sql`) share a numeric prefix — harmless with filename-based tracking, but do not reuse 004/005; the new migration is 006.
- Test coverage: the plan touches `api/` JS, and includes page-generator regression tests plus the full-suite run (mandatory per the skill's task rules).

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md` rows #3–#4) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [x]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problems this plan was created to fix — they are the plan's Goal, not new issues.
- **Resolving issues**: This plan's Goal is to fix Issues.md rows #5, #6, #7, #8, #9, and #10 — the "Close out" task updates only those rows' `Status` cells from `open` to `resolved` (via script) once each fix is verified working. Leave every other row untouched.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, the `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
