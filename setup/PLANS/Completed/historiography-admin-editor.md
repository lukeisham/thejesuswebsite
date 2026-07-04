# Plan: Historiography Admin Editor

**Module(s):** Admin / Docs
**Date:** 2026-07-03
**Status:** ✅ Completed

## Goal
Give historiography content a working admin CMS surface. The `/historiography`
API (list, `GET /admin/:id`, create, update, delete) and the public detail/list
pages already exist, but there is **no** `admin/historiography/` directory, so
historiography items cannot be created or edited anywhere in the admin — and the
drafts list routes them (and responses) to the wrong editor. This plan builds
the three-page historiography editor by mirroring the existing essays editor,
fixes the drafts routing, and documents the historiography listing pattern.
Resolves Issues #25, #13, and #11.

## Coding rules to keep in mind
- **JS-2** — Robust & predictable. `draftEditUrl` must route each draft type to
  an editor actually wired to that type's API; no type may silently hit the
  wrong endpoint (the current bug). The editor's payload builder must send only
  the historiography model's writable columns.
- **JS-5** — Async/await + centralised fetch. Reuse the existing `Admin.api`
  helper for every request; show loading and error states before/after fetch.
- **JS-6** — Safe DOM handling. Build the form with DOM APIs / the admin
  helpers as the essays editor does; never `innerHTML` user data.
- **JS-1 / JS-3** — Mirror the essays editor's structure and naming closely
  (swap `essay-*` ids for `historiography-*`, `/essays` for `/historiography`);
  do not invent a new pattern.
- **HTML-1 / HTML-3 / HTML-5** — Semantic structure, exactly one `<h1>`, and
  labelled form controls, matching the essays editor pages.

## Tasks

### Admin — historiography editor pages

- [x] **Create the historiography listing page** — mirror `admin/essays/index.html`:
  fetch `GET /historiography`, render the rows in a table, link each to its
  edit page, with loading/empty/error states and a "New" button. File:
  `admin/historiography/index.html`
- [x] **Create the new-historiography page** — mirror `admin/essays/new.html`:
  a create form that `POST`s to `/historiography` (including the journal
  metadata fields `two_column`, `doi`, `author_bio`) and redirects to the edit
  page on success. File: `admin/historiography/new.html`
- [x] **Create the historiography edit page** — mirror `admin/essays/edit-[id].html`:
  load via `GET /historiography/admin/:id`, save via `PUT /historiography/:id`,
  delete via `DELETE /historiography/:id`, publish/unpublish via
  `/publish/historiography/:id`, and expose the `two_column` checkbox, `DOI /
  Citation`, and `Author Bio` fields. File: `admin/historiography/edit-[id].html`
- [x] **Add a Historiography entry to the admin sidebar** — insert an
  `admin-sidebar__link` to `historiography/index.html` next to the existing
  Essays/Debate links, in the shared sidebar block. Note: this block is
  statically duplicated across every admin page (see Notes / Issue logged), so
  the entry must be added to each admin HTML file that renders the sidebar for
  navigation to stay consistent. File: `admin/index.html` (and the other admin
  pages carrying the duplicated sidebar)

### Admin — drafts routing (Issue #13)

- [x] **Route response and historiography drafts to their real editors** — in
  `draftEditUrl`, send `responses` to `../debate/edit-[id].html?id=` (the
  existing, `/responses`-wired editor) and `historiography` to
  `../historiography/edit-[id].html?id=` (created above); stop routing either to
  the essays editor. File: `admin/drafts/index.html`

### Docs (Issue #11)

- [x] **Document the historiography listing page pattern** — in the
  historiography section of the style guide, note that the *listing* page
  (`frontend/debate/historiography.html`) uses the ranked-list card pattern
  (as `popular-challenges.html` / `academic-challenges.html` do), while
  *detail* pages use `journal.css`. File: `setup/Style_guide.md`

## Files touched
- `admin/historiography/index.html` — created
- `admin/historiography/new.html` — created
- `admin/historiography/edit-[id].html` — created
- `admin/index.html` — modified (sidebar entry; and the other admin pages sharing the duplicated sidebar block)
- `admin/drafts/index.html` — modified
- `setup/Style_guide.md` — modified

## Notes
- **The backend is done.** `api/routes/historiography.js` already exposes
  `GET /`, `GET /admin/:id` (auth), `GET /:slug`, `POST /`, `PUT /:id`,
  `DELETE /:id`; `api/models/historiography.model.js` has `getById`/`getBySlug`
  and a `WRITABLE_COLUMNS` list that includes `two_column`/`doi`/`author_bio`;
  and `historiography` is registered in `api/config/content-pages.js`, so
  publishing already (re)generates the static `[slug].html`. This plan is
  purely the missing admin UI plus wiring — no API or model changes.
- **Mirror, don't reinvent.** Each editor page should be a close copy of its
  `admin/essays/` counterpart with `essay-*` ids → `historiography-*`,
  `/essays` → `/historiography`, and titles/labels updated. The essays editor
  already handles the exact same journal-metadata fields, so the two-column /
  DOI / author-bio UI is a direct port.
- **Supersedes the stop-gap.** `prelaunch-bug-fixes.md` contained a *stop-gap*
  historiography-routing task (point at a listing, since no editor existed).
  This plan builds the real editor and wires drafts to it, so it replaces that
  stop-gap; drop or mark that task obsolete when implementing whichever lands
  second. The `responses` half of the routing fix is the same in both.
- **Automated tests:** the new files are admin HTML pages with inline glue
  scripts (no standalone `.js` module is created or modified), and the
  code-facing logic they call — the `/historiography` routes and model — is
  already fully covered by `api/tests`. No existing admin editor page
  (`essays`, `debate`, `blog`) has a dedicated automated test; these mirror that
  pattern. Coverage is via the manual validation checklist instead (skill Step 2
  exemption: no applicable automated-test target).
- **Sidebar duplication.** The admin sidebar is copied verbatim into ~36 admin
  HTML pages rather than injected once. Adding the Historiography link cleanly
  means editing all of them; the underlying duplication is a pre-existing
  maintainability problem logged separately to Issues.md and is out of scope for
  this plan (which only adds the one new entry).
- **Ordering:** the three editor pages must exist before the drafts-routing task
  points at `../historiography/edit-[id].html`.

---

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [x]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
