# Plan: Journal Article Metadata Columns (two_column, doi, author_bio)

**Module(s):** Database / API / Frontend / Admin
**Date:** 2026-07-02
**Status:** Done

## Goal
Close Issues.md #2: Style_guide.md §9 specifies a `two_column` layout flag, a DOI/citation line, and an author-bio field for essays, responses, and historiography pages, but `database/schema.sql` has never had matching columns on `context_essays`, `responses`, or `historiography`. Investigation for this plan found the **frontend rendering for all three fields already exists and is wired correctly** — `essay-detail.js`, `response-detail.js`, and `historiography-detail.js` all read `data.two_column`/`article.doi`/`article.author_bio` already (one comment even reads `// Two-column layout flag (optional — Issue #2)`), and the title-block HTML for all three detail pages already has the `#essay-doi`/`#essay-author-bio`-style elements, hidden until populated. The actual gaps are: the database columns don't exist, the models don't allow writing them, the two-column CSS rule itself was never written (despite `journal-body.css`'s own header comment promising it), and there's no admin UI to set them.

## Coding rules to keep in mind
- **JS-2** — model writes stay whitelisted; the migration is additive-only (no data loss on existing rows).
- **CSS-1** — `journal-body.css` is already at 143/150 lines; the two-column rule goes in a new file rather than pushing it over the limit.
- **CSS-2** — the new CSS uses `--space-2xl`/`--border` custom properties, per the existing journal partials.
- **SR-1** — the essay and response admin forms are edited as two separate tasks even though the change is identical in shape, since they're different files with independent save logic.
- **HTML-5** — the new admin fields need proper `<label>`s, consistent with the existing metadata card fields they sit alongside.

## Tasks

### Database

- [ ] **Add `two_column`, `doi`, `author_bio` columns to the three journal tables** — create `database/migrations/003_journal_article_metadata.sql` with `ALTER TABLE ... ADD COLUMN` statements for `context_essays`, `responses`, and `historiography`: `two_column INTEGER DEFAULT 0 CHECK (two_column IN (0,1))`, `doi TEXT`, `author_bio TEXT` (9 statements total). Field names match exactly what the frontend already reads — do not rename them. File: `database/migrations/003_journal_article_metadata.sql`

### API — Models

- [ ] **Whitelist the three new columns for essays** — add `two_column`, `doi`, `author_bio` to `WRITABLE_COLUMNS` in `essay.model.js`. File: `api/models/essay.model.js`
- [ ] **Whitelist the three new columns for responses** — same change. File: `api/models/response.model.js`
- [ ] **Whitelist the three new columns for historiography** — same change. File: `api/models/historiography.model.js`

### Frontend — CSS

- [ ] **Add the two-column layout rule** — create `frontend/assets/css/pages/journal-two-column.css` implementing Style_guide.md §9's spec: `.journal-article.two-column .journal-body { column-count: 2; column-gap: var(--space-2xl); column-rule: 1px solid var(--border); }` inside a `@media (min-width: 1280px)` block (off below that breakpoint, per the spec); figures and block quotes get `column-span: all` within that same rule set. The title block and abstract already live outside `.journal-body` so they stay single-column with no extra rule needed. Add `@import "./pages/journal-two-column.css";` to `frontend/assets/css/main.css` alongside the other three journal partials. Files: `frontend/assets/css/pages/journal-two-column.css`, `frontend/assets/css/main.css`

### Admin Frontend

- [ ] **Add the three fields to the essay edit form** — a "Two-Column Layout" checkbox, a "DOI / Citation" text input, and an "Author Bio" textarea in the metadata card of `admin/essays/edit-[id].html`, following the existing `formGroup()`/checkbox patterns already used for `metadata_keywords`/`published_draft`. Include the three values in `buildPayload()`. File: `admin/essays/edit-[id].html`
- [ ] **Add the same three fields to the response edit form** — identical fields and pattern in `admin/debate/edit-[id].html`'s metadata card and `buildPayload()`. File: `admin/debate/edit-[id].html`

### Tests

- [ ] **Cover the new columns for all three tables** — extend `journal-content.test.js` to assert `two_column`, `doi`, and `author_bio` round-trip through create/update for essays, responses, and historiography (model level, all three, since the admin UI in this plan only covers two of the three). File: `api/tests/journal-content.test.js`

## Files touched
- `database/migrations/003_journal_article_metadata.sql` — created
- `api/models/essay.model.js` — modified
- `api/models/response.model.js` — modified
- `api/models/historiography.model.js` — modified
- `frontend/assets/css/pages/journal-two-column.css` — created
- `frontend/assets/css/main.css` — modified
- `admin/essays/edit-[id].html` — modified
- `admin/debate/edit-[id].html` — modified
- `api/tests/journal-content.test.js` — modified

## Notes
- **No admin UI task for historiography, and this is deliberate.** While auditing this plan's scope, `admin/drafts/index.html`'s `draftEditUrl()` was found routing both `responses` and `historiography` draft-list rows to `admin/essays/edit-[id].html` — but that page is hardcoded to `/essays/...` API endpoints (`Admin.api.get('/essays/admin/' + essayId)`, `Admin.api.put('/essays/' + essayId, ...)`), with no `type` param to redirect it. Responses have their own correctly-wired editor (`admin/debate/edit-[id].html`, used directly by this plan) that the drafts list simply fails to link to. **Historiography has no dedicated admin editor at all** — there is no `admin/historiography/` directory, and the drafts-list link for it is broken in the same way. This is a separate, real bug (wrong/missing admin routing for two content types), logged to `Issues.md` as a new row rather than folded into this plan, since fixing it means adding a whole new admin editor page (or making the essays editor `type`-aware) — out of scope for "add three columns." Until that's fixed, historiography's `two_column`/`doi`/`author_bio` values can only be set via direct API calls or the MCP server, not the admin UI — the database/model/frontend-render layers built here still work correctly for it regardless.
- This is a good example of frontend-ahead-of-backend drift, same pattern as the admin analytics chip row fixed earlier this session: the rendering code and even a `// ... Issue #2` comment were already in place; only the data layer was missing.
- No new dependency; no changes to `Coding rules` beyond what's listed — this plan doesn't touch HTML semantics, accessibility, or JS event-handling patterns beyond adding form fields via the existing `formGroup()` helper.
