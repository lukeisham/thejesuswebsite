# Journal article fields

Essay, response and historiography pages show an abstract box, a footnote list and, on responses, a strength indicator. Each comes from a database field. A `[fn:N]` marker in the body text links to a footnote.

**Source of truth:** `api/lib/journal-field-validation.js` and `frontend/assets/js/utils/content-markers.js` — win any disagreement with this doc.
**Spans:** `database/schema.sql`, `api/lib/journal-field-validation.js`, `api/models/relations/child-rows.js`, `api/models/essay.model.js`, `api/models/response.model.js`, `api/models/historiography.model.js`, `api/routes/essays.js`, `api/routes/responses.js`, `api/routes/historiography.js`, `frontend/assets/js/utils/content-markers.js`, `frontend/assets/js/utils/markdown.js`, `frontend/assets/js/utils/excerpt.js`, `frontend/assets/js/utils/footnotes.js`, `frontend/assets/js/essay-detail.js`, `frontend/assets/js/response-detail.js`, `frontend/assets/js/historiography-detail.js`, `admin/assets/js/admin-footnotes-panel.js`, `admin/essays/edit-[id].html`, `admin/debate/edit-[id].html`, `admin/historiography/edit-[id].html`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| The marker pattern lists `fn` in `content-markers.js`, `markdown.js` and `excerpt.js` | Each file keeps its own list of marker types. Markdown escapes any marker it does not know, and the excerpt builder strips only the markers it knows | The marker shows as literal `[fn:1]` text in the body, or leaks into a list-page excerpt |
| `N` in `[fn:N]` is the position of the footnote in the list, not a row id | `replaceChildren()` deletes and re-inserts footnote rows on each save, so row ids change every time. The public numbering is `sort_order + 1` | A marker points to the wrong note after a save. No error appears |
| `updateComposite` in the three models replaces footnotes only when the `footnotes` key is present | Other child arrays are wiped when their key is absent. A save from a client that omits `footnotes` must not erase them | All footnotes vanish after an unrelated save |
| `ABSTRACT_MAX_LENGTH`, `FOOTNOTE_MAX_LENGTH` and `FOOTNOTE_MAX_COUNT` in the validator equal the `maxLength` values in the admin pages and the panel | The admin stops typing at the same limit the API enforces | The admin lets an author type text that the API rejects with a 400 on save |
| `POST` and `PUT` in `essays.js`, `responses.js` and `historiography.js` call `validateJournalFields()` before the model | Models assume valid input. `strength` is allowed only on responses | A bad value reaches the database (the CHECK stops a bad `strength`, nothing else) |
| The abstract and footnotes are not columns of any `*_fts` table | The FTS triggers list their columns by name. Changing them risks the corrupt-index failure that migration 033 and 042 repaired | Search results go stale or the next write fails with `SQLITE_CORRUPT_VTAB` |
| Only the first `[fn:N]` for each N carries `id="fnref-N"`, and `footnotes.js` writes a return link only when that id exists in the body | An HTML id must be unique, and a link to a missing id goes nowhere | Duplicate ids on the page, or a return arrow that does nothing |

Rows 1, 4 and 5 and the table checks in "Shape" are enforced by `api/tests/guide-journal-article-fields.test.js` (TEST-10). Rows 2, 3, 6 and 7 are covered by behaviour tests (`api/tests/journal-content.test.js`, `frontend/assets/js/utils/tests/content-markers.test.js`) or by prose only.

## Shape

- `abstract` (a text column) is on `context_essays`, `responses` and `historiography`. `strength` (1 to 5, or empty) is on `responses` only.
- Footnotes are rows in `essay_footnotes`, `response_footnotes` and `historiography_footnotes`. The tables are in `CHILD_TABLES` in `child-rows.js`. The models attach them to the detail read as `footnotes`.
- `content-markers.js` turns `[fn:N]` into a superscript link. The detail pages call `footnoteListHTML()` in `footnotes.js` after the body renders.
- The admin editors show an Abstract box, a Footnotes panel (`admin-footnotes-panel.js`) and, for responses, a Strength select. They send `abstract`, `footnotes` and `strength` with `null` or an empty list to clear a value.

## Extending it

Adding another field of this kind (for example a field that shows on all three page types):

1. Add a migration and update `database/schema.sql` (MIG-4).
2. Add the column to `WRITABLE_COLUMNS` in the three models.
3. Add the check to `api/lib/journal-field-validation.js`, and the same limit to the admin pages.
4. Add the input to the three admin editors and to the payload they send.
5. Render it in the three detail scripts. Add a row here and a check to the guide test if a text search can verify it.

## Not documented here

The limit values, the CSS for the blocks and the exact markup are in `api/lib/journal-field-validation.js`, `setup/STYLE_GUIDE/content-patterns.md` and `setup/STYLE_GUIDE/content_shortcodes.md`.
