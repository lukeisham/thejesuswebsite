# Journal article fields

Essay, response and historiography pages show an abstract box, a footnote list and, on responses, a strength indicator. Each comes from a database field. A `[fn:N]` marker in the body text links to a footnote.

**Source of truth:** `api/lib/journal-field-validation.js` and `frontend/assets/js/utils/content-markers.js` — win any disagreement with this doc.
**Spans:** `database/schema.sql`, `api/lib/journal-field-validation.js`, `api/models/relations/child-rows.js`, `api/models/essay.model.js`, `api/models/response.model.js`, `api/models/historiography.model.js`, `api/models/blog-post.model.js`, `api/routes/essays.js`, `api/routes/responses.js`, `api/routes/historiography.js`, `frontend/assets/js/utils/content-markers.js`, `frontend/assets/js/utils/markdown.js`, `frontend/assets/js/utils/excerpt.js`, `frontend/assets/js/utils/footnotes.js`, `frontend/assets/js/essay-detail.js`, `frontend/assets/js/response-detail.js`, `frontend/assets/js/historiography-detail.js`, `admin/assets/js/admin-footnotes-panel.js`, `admin/essays/edit-[id].html`, `admin/debate/edit-[id].html`, `admin/historiography/edit-[id].html`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The marker pattern lists `fn` in `content-markers.js`, `markdown.js` and `excerpt.js` | Each file keeps its own list of marker types. Markdown escapes any marker it does not know, and the excerpt builder strips only the markers it knows | The marker shows as literal `[fn:1]` text in the body, or leaks into a list-page excerpt |
| `N` in `[fn:N]` is the position of the footnote in the list, not a row id | `replaceChildren()` deletes and re-inserts footnote rows on each save, so row ids change every time. The public numbering is `sort_order + 1` | A marker points to the wrong note after a save. No error appears |
| `updateComposite` in the essay, response, historiography and blog post models rewrites each child set (breakouts, footnotes) and link set (sources, identifiers, evidence and context links) only when its key is present. An empty array clears the set | `replaceChildren()` and `replaceLinks()` delete before they insert. A save from a client that omits a key must not erase the stored rows. The behaviour tests are in each `*.model.test.js` | Breakouts, identifiers or footnotes vanish after an unrelated save |
| `getDetailBySlug` in `response.model.js` returns `challenge_title`, `challenge_slug` and `challenge_type` (the challenge's `academic_popular`), from a published challenge only | `renderChallengeReference()` in `response-detail.js` reads these three names and builds the challenge link from `challenge_type`. A draft challenge gives null fields, so no link is drawn | The challenge link is missing, or points to the wrong section or a 404 |
| `ABSTRACT_MAX_LENGTH`, `FOOTNOTE_MAX_LENGTH` and `FOOTNOTE_MAX_COUNT` in the validator equal the `maxLength` values in the admin pages and the panel | The admin stops typing at the same limit the API enforces | The admin lets an author type text that the API rejects with a 400 on save |
| `POST` and `PUT` in `essays.js`, `responses.js` and `historiography.js` call `validateJournalFields()` with the column spec for their type before the model. It checks the slug (when sent) and the type of every writable column. Optional text and integer columns accept `null`. On PUT, a slug equal to the stored slug skips the pattern, so rows saved before the pattern stay editable. The responses routes return 400 naming `challenge_id` when the effective `published_draft` is 1 and the effective `challenge_id` is `null`, mirroring the schema CHECK | Models assume valid input. `strength` is allowed only on responses. The editors send `null` to clear a field. The specs mirror the types and CHECK constraints in `schema.sql` and the model `WRITABLE_COLUMNS` | A bad value reaches SQLite and returns a generic `E-PERSIST-002` instead of a 400 that names the field. A legacy row cannot be saved, or a published response with no challenge returns a generic database error |
| The abstract and footnotes are not columns of any `*_fts` table | The FTS triggers list their columns by name. Changing them risks the corrupt-index failure that migration 033 and 042 repaired | Search results go stale or the next write fails with `SQLITE_CORRUPT_VTAB` |
| Only the first `[fn:N]` for each N carries `id="fnref-N"`, and `footnotes.js` writes a return link only when that id exists in the body | An HTML id must be unique, and a link to a missing id goes nowhere | Duplicate ids on the page, or a return arrow that does nothing |

Rows 1, 4 and 5, the challenge aliases in `getDetailBySlug` and the table checks in "Shape" are enforced by `api/tests/guide-journal-article-fields.test.js` (TEST-10). Rows 2, 3, 6 and 7 are covered by behaviour tests (`api/tests/journal-content.test.js`, `frontend/assets/js/utils/tests/content-markers.test.js`) or by prose only.

## Shape

- `abstract` (a text column) is on `context_essays`, `responses` and `historiography`. `strength` (1 to 5, or empty) is on `responses` only.
- Footnotes are rows in `essay_footnotes`, `response_footnotes` and `historiography_footnotes`. The tables are in `CHILD_TABLES` in `child-rows.js`. The models attach them to the detail read as `footnotes`.
- `content-markers.js` turns `[fn:N]` into a superscript link. The detail pages call `footnoteListHTML()` in `footnotes.js` after the body renders.
- `essay-detail.js` also renders the essay-only columns `author_bio`, `doi`, `metadata_keywords` (sent to the page as `keywords`) and `two_column` (a body layout class), plus a created and edited line from `created_at` and `updated_at`. Each optional block is hidden when its field is empty.
- The admin editors show an Abstract box, a Footnotes panel (`admin-footnotes-panel.js`) and, for responses, a Strength select. They send `abstract`, `footnotes` and `strength` with `null` or an empty list to clear a value. Every other optional text field (`doi`, `author_bio`, `metadata_keywords` and the like) is also sent as `null` when emptied, because `pickWritable` skips `undefined`.

## Extending it

Adding another field of this kind (for example a field that shows on all three page types):

1. Add a migration and update `database/schema.sql` (MIG-4).
2. Add the column to `WRITABLE_COLUMNS` in the three models.
3. Add the check to `api/lib/journal-field-validation.js`, and the same limit to the admin pages.
4. Add the input to the three admin editors and to the payload they send.
5. Render it in the three detail scripts. Add a row here and a check to the guide test if a text search can verify it.

## Not documented here

The limit values, the CSS for the blocks and the exact markup are in `api/lib/journal-field-validation.js`, `setup/STYLE_GUIDE/content-patterns.md` and `setup/STYLE_GUIDE/content_shortcodes.md`.
