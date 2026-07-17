# Plan: Blog Editor — Formatting Hints, Bibliography, Inline Pictures & Thumbnail

**Module(s):** Admin / API / Database / Frontend
**Date:** 2026-07-17
**Status:** ✅ Completed

## Goal
Fix a cluster of minor blog issues end-to-end: give the backend blog editors richer
formatting guidance, correct the (now-stale) Bibliography hint and confirm the
public bibliography renders at the end of a post when sources are attached, repair
inline-picture insertion so it works on both the *new* and *edit* screens (as essays
do), and add a dedicated thumbnail image (as news articles have) in addition to
inline pictures. Finish with a full smoke test of blog data flowing to and from the
API and frontend.

## Background (what already exists — verified)
- **Bibliography already renders on the public page.** `frontend/assets/js/blog-detail.js`
  → `renderBibliography()` populates the `#blog-bibliography` section from
  `post.mla_sources`, and `frontend/news-and-blog/blog/[slug].html` already contains the
  `<section id="blog-bibliography">…<ol id="blog-bibliography-list">`. The model
  (`api/models/blog-post.model.js`) attaches `mla_sources` in `assembleDetail()`. So the
  data path is complete; the only defect is the **admin hint text**, which wrongly says
  "Blog posts show no formal bibliography on the public site."
- **Inline `[figure]` pictures already render** via `utils/content-markers.js`. The
  `Insert Image` button is correctly wired on `edit-[id].html`
  (`AdminInsertImage.wire`) but the button on `new.html` is **never wired** — dead.
- **`edit-[id].html` double-includes `admin-insert-image.js`** (lines 13–14).
- **`new.html` lacks the Formatting Reference panel** (no `admin-shortcode-help.js`),
  and both editors carry a thin content hint ("Supports plain text and HTML").
- **`hero_image` exists on `blog_posts`** but has no admin picker and is not rendered
  on the detail page; `blog-list.js` uses it as the card thumbnail. The user wants a
  news-style dedicated thumbnail — mirror `news_article_thumbnail` with a new
  `blog_thumbnail` column and an `AdminImagePicker`, and prefer it for the list card.

## Coding rules to keep in mind
- **SR-1** — one file, one job; keep the migration, model, and each editor change scoped.
- **JS-2** — `blog_thumbnail` must go through `pickWritable` so stray body fields never reach the DB.
- **JS-5 / JS-6** — admin fetches stay on `Admin.api.*`; build picker/hint DOM with element factories and `textContent`, no `innerHTML` with data.
- **SQL-1..4** — migration is additive; `WRITABLE_COLUMNS` is the identifier whitelist.
- **HTML-2** — the thumbnail `<img>` on the list card needs an `alt` (empty `alt=""` — decorative card image; the title is the accessible label).
- **CSS-2** — any new list/thumbnail styling references tokens from `variables.css`; no hardcoded values.

## Tasks

### Database

- [x] **Add a `blog_thumbnail` column** — additive `ALTER TABLE blog_posts ADD COLUMN blog_thumbnail TEXT;`. File: `database/migrations/026_add_blog_thumbnail.sql`
- [x] **Mirror the column in the canonical schema** — add `blog_thumbnail TEXT` to the `blog_posts` definition (after `hero_image_alt`). File: `database/schema.sql`

### API

- [x] **Whitelist `blog_thumbnail`** — add `"blog_thumbnail"` to `WRITABLE_COLUMNS` so create/update persist it. File: `api/models/blog-post.model.js`
- [x] **Add/extend a blog model test** — cover create+read round-trip of `blog_thumbnail` and confirm `mla_sources` are attached in `getDetailBySlug`. File: `api/tests/blog-post.model.test.js` (created)

### Shared admin JS (hints & markers)

- [x] **Correct the blog Bibliography hint** — rewrite `HINT_TEXT.blog` to state that inline citations render as parenthetical "(Author)" and that attached sources render as a full **Bibliography at the end of the post**. File: `admin/assets/js/admin-mla-sources.js`
- [x] **Fix & expand the Formatting Reference** — correct the misleading "Blog: MLA Citation (parenthetical, no bibliography)" example, and add markdown examples (headings, bold/italic, lists, tables) that `renderMarkdown` already supports. File: `admin/assets/js/admin-shortcode-help.js`

### Admin — New Blog Post (`admin/blog/new.html`)

- [x] **Enrich the content hint** — replace "Supports plain text and HTML." with concrete guidance (markdown + `[figure]`, `[mla:N]`, `[pullquote]`; link to the Formatting Reference). File: `admin/blog/new.html`
- [x] **Mount the Formatting Reference panel** — include `admin-shortcode-help.js` and call `AdminShortcodeHelp.mountFormattingReference(...)` in the sidebar. File: `admin/blog/new.html`
- [x] **Wire the Insert Image button** — add the missing `AdminInsertImage.wire("#insert-image-btn", "#blog-content")` call so the existing button actually inserts a `[figure]`. File: `admin/blog/new.html`
- [x] **Add a Thumbnail picker** — include `admin-image-picker.js`, add a "Thumbnail" card mounting `AdminImagePicker`, and include `blog_thumbnail` in `buildPayload()`. File: `admin/blog/new.html`

### Admin — Edit Blog Post (`admin/blog/edit-[id].html`)

- [x] **Remove the duplicate script include** — delete the second `admin-insert-image.js` `<script>` line. File: `admin/blog/edit-[id].html`
- [x] **Enrich the content hint** — same richer guidance as the new screen. File: `admin/blog/edit-[id].html`
- [x] **Add a Thumbnail picker** — mount `AdminImagePicker` seeded from `data.blog_thumbnail`, and include `blog_thumbnail` in `buildPayload()`. File: `admin/blog/edit-[id].html`

### Frontend

- [x] **Prefer the thumbnail on list cards** — in `renderCards`, use `item.blog_thumbnail` for the card image, falling back to `item.hero_image`; keep the empty-placeholder branch. File: `frontend/assets/js/blog-list.js`

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push. Run `git add -p`, `git commit -m "Blog editor: formatting hints, bibliography hint, inline pictures, thumbnail"`, `git push`. Deploy runs the migration automatically via `deploy.sh`.
- [x] **Test live (Claude only)** — after deploy, smoke test the full blog path in a browser (see Notes → Smoke test). If the implementing agent is not Claude, skip and note the live test was deferred.

## Files touched
- `database/migrations/026_add_blog_thumbnail.sql` — created
- `database/schema.sql` — modified
- `api/models/blog-post.model.js` — modified
- `api/tests/blog-post.model.test.js` — created
- `admin/assets/js/admin-mla-sources.js` — modified
- `admin/assets/js/admin-shortcode-help.js` — modified
- `admin/blog/new.html` — modified
- `admin/blog/edit-[id].html` — modified
- `frontend/assets/js/blog-list.js` — modified

## Error notification

**a) Does this plan impact existing error handling?**

No. No routes, error codes, or failure modes change. `blog_thumbnail` is an optional
nullable column persisted through the existing create/update paths; an absent or
invalid value simply results in no thumbnail (graceful degradation), not an error.

**b) Should this plan add, update, or remove any error notification behaviour?**

No. Image uploads reuse the existing `Admin.uploadImage` path (already surfaces its own
failures); the frontend already tolerates a missing thumbnail via the placeholder branch.
No new `sendError`/`showErrorToast`/`handleApiError` calls are required.

## Notes
- **No sitemap change** — this plan adds no new HTML pages, so `frontend/sitemap.xml` is untouched.
- **`hero_image` left as-is** — it stays a valid fallback for the list card and is out of
  scope here; a future plan can decide whether to also surface a hero picker / render it on
  the detail page.
- **Parenthetical citations do not anchor to the bibliography** (they render as a plain
  "(Author)" span, by design for the blog style). The bibliography still lists every
  attached source at the end — this is the intended behaviour and the corrected hint should
  describe exactly that, so authors aren't surprised there's no superscript link.
- **Smoke test (to & from API + frontend):**
  1. Admin → New Blog Post: type a title (slug auto-fills), write body using markdown +
     `[pullquote]`, click **Insert Image** and confirm a `[figure …]` shortcode is inserted,
     attach ≥1 MLA source, set a **Thumbnail**, Save as Draft → redirects to edit.
  2. Confirm `POST /api/blog-posts` persisted `blog_thumbnail` and the mla link
     (`GET /api/blog-posts/admin/:id`).
  3. Edit screen: reload, confirm thumbnail + sources + body round-trip; edit and Save;
     Publish.
  4. Frontend list (`/news-and-blog/`): confirm the card shows the thumbnail.
  5. Frontend detail (`/news-and-blog/blog/{slug}`): confirm the inline figure renders,
     the parenthetical citation appears, and the **Bibliography** section lists the source
     at the end of the post.
- **Ordering:** DB migration + schema first, then model whitelist, then editors, then the
  frontend card. The frontend card fallback (`blog_thumbnail || hero_image`) means it is safe
  to deploy even before any post has a thumbnail set.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problems this plan was created to fix — those are the plan's Goal.
- **Resolving issues**: This plan does not resolve any pre-existing numbered `Issues.md` row, so no Status-cell updates are required.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
