# Plan: Challenge Admin Page

**Module(s):** Admin
**Date:** 2026-07-06
**Status:** ✅ Plan generated — ready for implementation

## Goal
Give the admin panel working CRUD interfaces for `challenges` — today the full `/popular-challenges` and `/academic-challenges` API and their models exist and are already wired into `publish.js` and the drafts aggregator, but there is no admin page to list, create, edit, publish, or delete a challenge. Popular and Academic challenges are separate content collections with separate responses (mirroring the public frontend's already-separate `popular-challenges.html`/`academic-challenges.html` pages and output directories), so this plan builds **two independent page sets** — identical in logic/markup, pointed at different endpoints and directories — rather than one combined page with a type switch. As a companion fix, replace the free-text "Challenge ID" number box in the Debate Responses admin form with a real picker (which does span both kinds, since a single `responses` row can reference either), and make the Responses list show a linked challenge title instead of a bare `Challenge #12`.

## Coding rules to keep in mind
- **SR-1** — one file, one job: each challenge kind gets its own list/create/edit trio (six files total), mirroring `admin/debate/`'s existing index/new/edit split. The cross-type lookup helper is one function added to the existing shared `admin.js`, not a new module.
- **JS-1 / JS-3** — mirror the existing `admin/debate/new.html` / `edit-[id].html` pattern exactly (same form-card structure, same validation helpers) rather than inventing a new admin form convention. The academic-challenges trio is a straight clone of the popular-challenges trio with the endpoint/directory swapped — no shared abstraction, matching how `admin/essays/`, `admin/debate/`, `admin/blog/` are already independent near-duplicates of each other.
- **JS-2** — the Responses picker/list link (the one place both kinds meet) must carry an explicit `type` (`popular` or `academic`) resolved from API data, never guessed or inferred from an id range.
- **JS-5** — all API calls go through `Admin.api.*` (throwing style, auto-redirect on 401), matching every other admin page.
- **JS-6** — build the DOM with `createElement`/`textContent`, never `innerHTML` with fetched data (matches `admin/debate/edit-[id].html`).
- **HTML-1 / HTML-3 / HTML-5** — one `<main>`, exactly one `<h1>` (the topbar title) per new page, every input has a `<label>`.
- **CSS-2** — reuse existing admin tokens/classes (`admin-form-grid`, `admin-input`, `admin-select`, `admin-btn--*`, `admin-badge`); no new CSS file needed since every class already exists in `admin/assets/css/admin-components/`.

## Tasks

### API / shared helper

- [x] **Add a cross-type lookup helper** — add `mergeChallenges(popularItems, academicItems)` (pure function: tags each item with `type: 'popular'`/`'academic'` and concatenates) plus `Admin.getAllChallenges()` (calls `Admin.api.get('/popular-challenges')` and `Admin.api.get('/academic-challenges')`, unwraps their `items` arrays, and returns `mergeChallenges(...)`). This is used only where a Response needs to reference a challenge of either kind — the two challenge admin sections below never call it, since each only ever deals with its own kind. File: `admin/assets/js/admin.js`

### Admin UI — Popular Challenges section

- [x] **Create the popular-challenges list page** — `admin/debate/popular-challenges/index.html`, cloned from the `admin/debate/index.html` shell. Calls `GET /popular-challenges`, renders a table (Title, Rank, Status badge, Edit link), "+ New Popular Challenge" button in the topbar linking to `new.html`. Loading/empty/error states match the existing Debate Responses list. File: `admin/debate/popular-challenges/index.html`
- [x] **Create the popular-challenge new form** — `admin/debate/popular-challenges/new.html`, cloned from `admin/debate/new.html`'s form-card layout. Fields: Title, Slug (auto-generated from title, editable), Summary (textarea), Picture URL, Source URL A–D, Rank Number, Keywords, "Publish immediately" checkbox. POSTs to `/popular-challenges`, then redirects to `edit-[id].html?id=<id>`. File: `admin/debate/popular-challenges/new.html`
- [x] **Create the popular-challenge edit form** — `admin/debate/popular-challenges/edit-[id].html`, cloned from `admin/debate/edit-[id].html`. Reads `?id=`, loads via `GET /popular-challenges/admin/:id`, same fields as `new.html`, Save/Publish/Unpublish/Delete using `Admin.publishItem('popular-challenges', id)` / `Admin.unpublishItem('popular-challenges', id)` / `Admin.api.del('/popular-challenges/' + id)`. File: `admin/debate/popular-challenges/edit-[id].html`

### Admin UI — Academic Challenges section

- [x] **Create the academic-challenges list page** — `admin/debate/academic-challenges/index.html`, identical structure to the popular-challenges list page but calling `GET /academic-challenges` and linking to its own `new.html`. File: `admin/debate/academic-challenges/index.html`
- [x] **Create the academic-challenge new form** — `admin/debate/academic-challenges/new.html`, identical fields to the popular-challenge new form, POSTs to `/academic-challenges`, redirects to `edit-[id].html?id=<id>`. File: `admin/debate/academic-challenges/new.html`
- [x] **Create the academic-challenge edit form** — `admin/debate/academic-challenges/edit-[id].html`, identical to the popular-challenge edit form but against `/academic-challenges/admin/:id`, `Admin.publishItem('academic-challenges', id)` / `Admin.unpublishItem('academic-challenges', id)` / `Admin.api.del('/academic-challenges/' + id)`. File: `admin/debate/academic-challenges/edit-[id].html`

### Admin UI — wire up navigation and the Responses form

- [x] **Add "Popular Challenges" and "Academic Challenges" sidebar links to every admin page** — insert two new links (`<span class="admin-sidebar__icon">📢</span> Popular Challenges` → `{relative-path}debate/popular-challenges/index.html`, and `<span class="admin-sidebar__icon">🎓</span> Academic Challenges` → `{relative-path}debate/academic-challenges/index.html`) immediately after the existing "Debate" link, in all 39 admin HTML files that contain `admin-sidebar__nav` (mechanical, identical insertion per file — see `setup/Issues.md` #27 for the known tradeoff of the sidebar being duplicated per file rather than templated). Files: every `*.html` under `admin/` matching `grep -l "admin-sidebar__nav"` (39 files, including the six new challenge pages themselves).
- [x] **Show a real challenge title (not a bare id) on the Responses list** — in the responses table, replace the plain `Challenge #12` text with a link to `popular-challenges/edit-[id].html?id=<id>` or `academic-challenges/edit-[id].html?id=<id>` (whichever kind it resolves to) showing the challenge's title, resolved via `Admin.getAllChallenges()` (fetched once, looked up by id). File: `admin/debate/index.html`
- [x] **Replace the free-text Challenge ID field with a picker (new form)** — swap the `<input type="text" id="response-challenge">` for a `<select>` populated from `Admin.getAllChallenges()`, option label `"{challenge_title} ({type})"`, option value the challenge id. File: `admin/debate/new.html`
- [x] **Replace the free-text Challenge ID field with a picker (edit form)** — same swap as above, pre-selecting the option matching `data.challenge_id`. File: `admin/debate/edit-[id].html`

### Tests

- [x] **Unit test the cross-type lookup helper** — add a test block to `admin/tests/admin.test.js` replicating `mergeChallenges` (per the file's existing convention of mirroring pure browser-JS logic in Node) and asserting: popular items get `type: 'popular'`, academic items get `type: 'academic'`, the merged array preserves both lists' contents, and an empty pair of lists returns `[]`. File: `admin/tests/admin.test.js`

### Deploy & verify

- [ ] **Push to GitHub** — `git add -p`, `git commit -m "Add challenge admin page"`, `git push`.
- [x] **Test live** — **deferred** (implementing agent is not Claude). Sign in to `/admin/`, open the new "Popular Challenges" and "Academic Challenges" sidebar links, create one item in each, publish one, confirm its static page renders at `/debate/popular-challenges/<slug>` (or `/debate/academic-challenges/<slug>`), then open a Debate Response and confirm the Challenge picker lists both new challenges and the Responses list shows the linked title pointing at the correct section. If the implementing agent is any other LLM, skip this task and note that live testing was deferred.

## Files touched
- `admin/assets/js/admin.js` — modified (add `mergeChallenges` + `Admin.getAllChallenges`)
- `admin/debate/popular-challenges/index.html` — created
- `admin/debate/popular-challenges/new.html` — created
- `admin/debate/popular-challenges/edit-[id].html` — created
- `admin/debate/academic-challenges/index.html` — created
- `admin/debate/academic-challenges/new.html` — created
- `admin/debate/academic-challenges/edit-[id].html` — created
- `admin/debate/index.html` — modified (linked challenge title column)
- `admin/debate/new.html` — modified (challenge picker)
- `admin/debate/edit-[id].html` — modified (challenge picker)
- 39 admin `*.html` files — modified (add "Popular Challenges" + "Academic Challenges" sidebar links) — includes the six newly-created challenge pages themselves, `admin/debate/index.html`, `admin/debate/new.html`, and `admin/debate/edit-[id].html` already listed above
- `admin/tests/admin.test.js` — modified (cross-type lookup helper tests)
- `sitemap.md` — modified (new `admin/debate/popular-challenges/` and `admin/debate/academic-challenges/` entries)
- `setup/TESTS/admin_tests.md` — modified (new validation section)

## Notes
- No database or API changes are needed at all — `challenges` table, both models (`popular-challenges.model.js` / `academic-challenges.model.js`), both route files, and the `publish.js` MODELS map already fully support this feature. This plan is admin-UI-only.
- Popular and Academic challenges get fully separate admin sections (own directory, own sidebar link, own list/new/edit trio) even though the underlying `challenges` table and every field are identical — this mirrors the public frontend split and keeps each kind's content and responses conceptually and operationally separate, per explicit direction. The two trios are near-duplicate files by design (same pattern as `admin/essays/` vs `admin/debate/` vs `admin/blog/`), not a shared component — consistent with this codebase's "one file per page, no templating" convention.
- The `challenges` table has no `created_at`/`updated_at` columns (unlike `responses`), so neither list page has a "Created" column — this matches what the API actually returns, not an oversight.
- The one place the two kinds still meet is Debate Responses: a `responses` row's `challenge_id` can point at either a popular or an academic challenge, so the Response picker and the Responses list's linked-title column are the only places that use the cross-type `Admin.getAllChallenges()` helper. Everywhere else (the two challenge sections themselves), each page only ever talks to its own single endpoint.
- `academic_popular` (the kind) is immutable after creation by design: the two kinds are exposed as genuinely separate public API resources with independently-scoped slugs (`generateUniqueSlug` in each model scopes uniqueness to its own `academic_popular` value), so moving a row between kinds would require re-deriving its slug uniqueness and would change its public URL. If a challenge is miscategorised, delete it from one section and recreate it in the other.
- The sidebar icons ("📢" for Popular, "🎓" for Academic) are placeholder choices; swap for anything more fitting during implementation — they have no functional effect.
- `Admin.getAllChallenges()` issues two GET requests, only when a Response is loaded/edited/listed. This is acceptable at the project's current scale (a few dozen challenges) — if it ever matters, a follow-up could add a genuine combined lookup endpoint, but that's out of scope here per the "don't design for hypothetical future requirements" rule.

---

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
