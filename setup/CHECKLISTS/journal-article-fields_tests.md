## Validation: Journal Article Fields (Abstract, Response Strength, Footnotes)
**Plan:** journal-article-fields.md
**Date:** 2026-10-18

### Manual checks

**Database**
- [ ] On a copy of the old database (schema at commit `b7e63c9`), apply `database/migrations/047_add_journal_article_fields.sql`. Run `PRAGMA table_info` on `context_essays`, `responses`, `historiography`, `essay_footnotes`, `response_footnotes` and `historiography_footnotes`. The result matches a database built from the new `database/schema.sql`.
- [ ] Apply the migration a second time with the runner logic (a file that is in `schema_migrations` is skipped). Nothing errors and no column repeats.
- [ ] Insert a `responses` row with `strength = 6` and one with `strength = 0`. Both fail on the CHECK. A row with `strength = NULL` and one with `strength = 5` succeed.
- [ ] Delete a response that has footnotes. Its `response_footnotes` rows are gone (`PRAGMA foreign_keys = ON`).
- [ ] Search still works: a search for a word in an essay body returns the essay. Edit only the `abstract` of that essay. Search still returns it, and no `SQLITE_CORRUPT_VTAB` error appears.

**API (signed-in dev login, or the route tests)**
- [ ] `PUT /essays/:id` with an abstract of 2001 characters returns 400 and `E-INPUT-022` with `context.field = "abstract"`. An abstract of 2000 characters returns 200.
- [ ] `PUT /responses/:id` with `strength: 6`, `strength: 0` and `strength: "3"` each return 400 with `context.field = "strength"`. `strength: 3` and `strength: null` return 200.
- [ ] `PUT /essays/:id` with `strength: 3` returns 400 (strength is for responses only).
- [ ] `PUT` with `footnotes` as a string, a list of 101 items, an item with blank `content`, and an item of 1001 characters each return 400 with `context.field = "footnotes"` (or the `content` field).
- [ ] `PUT` with a valid `footnotes` list, then `GET /essays/admin/:id`, returns the footnotes in the order sent. `PUT` again **without** a `footnotes` key leaves the list unchanged. `PUT` with `footnotes: []` clears it.
- [ ] `GET /essays/:slug` for a published item returns `abstract` and `footnotes`. A draft returns 404.
- [ ] Each of `POST` and `PUT` on the three routes returns 401 with no session cookie.
- [ ] The MCP tool `getEssayBySlug` returns `abstract` and `footnotes` in its JSON (no code change).

**Admin (needs passkey sign-in — Tier 3)**
- [ ] On the essay, response and historiography edit pages, an "Abstract" box shows in the Content card. It stops at 2000 characters. Saved text loads again after a reload.
- [ ] Clear a saved abstract, save, reload. The box is empty and the public page hides the abstract block (the field cleared, it did not stay).
- [ ] On the response edit page, a "Strength of response" select shows "Not rated" and 1 to 5. A saved value loads again. "Not rated" saves as no rating.
- [ ] The Footnotes panel: Add appends a numbered row with a `[fn:N]` hint; Up, Down and Remove change the order and the numbers; the renumbering hint is visible; a blank row is dropped on save.
- [ ] The "Formatting Reference" panel shows the `[fn:N]` example.
- [ ] A save error (for example a bad value forced through the console) shows the server message in a toast, not a blank screen.
- [ ] After a save in each editor, the breakouts-related and `doi` behaviour is the same as before (no new regression).

**Public pages (Tier 2 locally, then Tier 3 live)**
- [ ] Essay page with an abstract: the box shows between the byline and the keywords, with the label "Abstract". The text is plain (no HTML runs). The page `<meta name="description">` starts with the abstract.
- [ ] Essay page with two footnotes and `[fn:1]` and `[fn:2]` in the body: two superscript links `1` and `2`; clicking one scrolls to the matching numbered item in the footnote list; the list shows below the body, above the references.
- [ ] Click the ↩ link on footnote 2: the page scrolls back to the `[fn:2]` marker. If `[fn:1]` appears twice in the body, ↩ on note 1 goes to the first one, and only the first marker has `id="fnref-1"` (no duplicate ids: `document.querySelectorAll('[id="fnref-1"]').length === 1`).
- [ ] A footnote that no marker cites shows in the list with no ↩ link.
- [ ] The ↩ link has an accessible name ("Back to text") and a hit area of at least 36px. Keyboard focus shows the focus ring.
- [ ] Print preview: no ↩ arrows print.
- [ ] A body marker `[fn:9]` with only two footnotes renders nothing (no stray text, no console error).
- [ ] A body marker `[fn:1]` on an item with no footnotes renders nothing, and the footnote block stays hidden.
- [ ] Response page with `strength = 3`: five dots, three filled, with `aria-label="Strength of response: 3 of 5"` on the dot container. With no rating the row is hidden.
- [ ] Historiography page shows the abstract and footnotes the same way as an essay. It has no strength row.
- [ ] Two-column essay (`two_column = 1`, width at least 1280px): the abstract and the keywords stay single column. The footnotes stay below the columns.
- [ ] At 375px width: the abstract box and footnote list fit with no horizontal scroll.
- [ ] Dark mode: the abstract box, dots and footnotes stay readable (tokens only).
- [ ] Print preview of a response with strength 3: the abstract keeps its border and has no fill; the dots print as black circles, three solid and two outlined; the footnote links print as plain black text; the footnote list prints after the body.
- [ ] A list page that shows an essay excerpt does not show `[fn:1]` text.
- [ ] A seeded blog post with `[fn:1]` in the body shows no marker and no footnote list.

### Code-review checks
- [ ] MIG-1 — the new migration is `047_add_journal_article_fields.sql`, with no suffix and no duplicate number.
- [ ] MIG-2 / MIG-7 — no applied migration edited. The new migration drops and deletes nothing.
- [ ] MIG-3 — every create uses `IF NOT EXISTS`. The `ADD COLUMN` lines are the only non-repeatable statements, and the header says why.
- [ ] MIG-4 — `database/schema.sql` has the same columns, tables and indexes in the same commit.
- [ ] MIG-5 — the header states the need, the fix and the run command.
- [ ] MIG-6 — no FTS table or trigger is changed. The `*_fts_au` triggers still list only title, content and keywords.
- [ ] SQL-1 / SQL-4 — the footnote reads and writes go through `getChildren()` and `replaceChildren()`. The three table names are in `CHILD_TABLES`.
- [ ] SQL-10 — each footnote table has an index on its parent FK.
- [ ] SQL-3 — `abstract` and `strength` are in the `WRITABLE_COLUMNS` of the right models only. `strength` is not on the essay or historiography model.
- [ ] API-1 — no SQL in any route file. The routes call the shared validator.
- [ ] API-3 — every new failure goes through `sendValidationError()` with a registry code. `E-INPUT-038` is the only new code, and it is in `CATEGORY_1`.
- [ ] API-4 — validation runs before the model in `POST` and `PUT`.
- [ ] API-5 / TEST-7 — `requireAuth` is still on all write routes. Route tests cover 401 without a cookie and pass-through with one.
- [ ] API-6 — the new code stays inside the existing `try/catch` blocks. No raw error reaches the client.
- [ ] SR-4 — the validator exists once. The footnote panel exists once and the three editors load it.
- [ ] SR-7 — admin hints say what a control does. No developer rule shows on screen.
- [ ] JS-2 — the strength guard calls `console.warn` with the bad value.
- [ ] SR-4 — the footnote list HTML is built in one place, `frontend/assets/js/utils/footnotes.js`, and the three pages call it.
- [ ] JS-6 — footnote and abstract text enters the page through `textContent` or the `html` tag. No new local `escapeHTML()`.
- [ ] JS-7 — every exported function has `@param` and `@returns`.
- [ ] JS-3 / D-009 — new frontend code uses ES modules. The new admin file uses `window.AdminFootnotesPanel`.
- [ ] CSS-2 / CSS-5 — the only new CSS is the print block in `journal-responses.css` and the `.footnote-backref` style with its print rule in `journal-footer.css`. They use tokens and no `!important`.
- [ ] SVG-6 style rule — the dots have an accessible name (`role="img"` and `aria-label`), so colour is not the only signal.
- [ ] TEST-1 / TEST-2 / TEST-9 — `node:test` only. Smoke tests only. The content-markers test imports the real module.
- [ ] TEST-10 — `api/tests/guide-journal-article-fields.test.js` exists, runs under `npm test`, and each failure names the rule, the file and the guide. Exceptions are in a named list with reasons.
- [ ] AG-4 — the only edited expectations in old tests are the column lists in `api/tests/essay.model.test.js`, and the commit message says why.
- [ ] CORE-3 / CORE-5 — `setup/ARCHITECTURE/journal-article-fields.md` exists and is in `INDEX.md`. `node setup/scripts/check-architecture-docs.js` passes. The final reply names each file where a connection comment or guide row was added.
- [ ] CORE-4 — D-026 is written to `setup/Decisions_log.md` only after Luke said yes.
- [ ] Style guide — `content-patterns.md`, `content_shortcodes.md` and `pages-and-admin.md` match the code. No sentence still says "No database column ... stays hidden".

---
