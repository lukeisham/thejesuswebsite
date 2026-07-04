# Plan: Complete the Backend Data Layer

**Module(s):** API (+ Tests)
**Date:** 2026-06-29
**Status:** ✅ **Completed** — all tasks implemented, all tests written

## Goal
Finish the `api/` data layer so every entity in the schema can be **created, viewed, and edited** completely — not just its base row, but its related pictures, breakouts, bibliography, identifiers, and internal links — with admin writes properly authenticated and covered by automated tests.

> **Context — this is a completion plan, not a build-from-scratch.** The backend skeleton already exists and is clean: `config.js` opens the SQLite connection, `server.js` mounts every route, and there are 16 models + 21 routes following a uniform model/route split, plus working `requireAuth` and validation middleware. The stale `sitemap.md` hides this. Three consistent gaps remain against the goal:
> 1. **Auth is disabled** — every write route ships with `/* requireAuth, */` commented out, so all POST/PUT/DELETE are currently public.
> 2. **Relational data is invisible** — `getBySlug` returns only the base row. Pictures, breakouts, `*_mla_sources`, `*_identifiers`, and `*_links_*` are never read or written, so the journal/evidence detail pages and admin edit forms cannot view or set them.
> 3. **No admin read-by-id** — content routes only expose published `:slug`; the admin cannot load a draft to edit it. `mla_sources` and `about_pages` have no model/route at all.

## Coding rules to keep in mind
- **SR-1** — One file, one job. Keep the relations helpers split (owned children vs M:N junctions); keep SQL in models and HTTP in routes — never merge them.
- **SR-2** — No new dependencies. Everything here uses the existing `better-sqlite3` connection and `node:test`; no ORM, no query builder, no test framework.
- **SR-3** — Performance first. Use prepared statements, wrap composite writes in a single `db.transaction()`, and assemble detail objects without N+1 query storms (one prepared statement per child table, reused).
- **JS-2** — Robust & predictable. Whitelist writable columns (the models already do this), validate inputs, and **fail loudly**: unauthenticated writes must 401, unknown ids must 404.
- **JS-4** — JSDoc on each public model function explaining the *why* (e.g. why a composite write is transactional), not the obvious *what*.
- **JS-5** — Explicit error handling. `better-sqlite3` is synchronous, so routes use `try/catch` (not `async/await`) around model calls — match the existing route style exactly; do not introduce promises.

## Tasks

### Shared relational foundation

- [ ] **Create owned-child-row helper** — generic transactional `getChildren(table, fkColumn, parentId)` and `replaceChildren(table, fkColumn, parentId, rows, columns)` for ordered 1:N child tables (pictures, breakouts). File: `api/models/relations/child-rows.js`
- [ ] **Create junction (M:N) helper** — generic `getLinked(...)` and `replaceLinks(...)` for link tables, preserving `citation_order` / `sort_order` (bibliography, identifiers, internal evidence/context links). File: `api/models/relations/junctions.js`

### Authentication — enforce on all writes and admin reads

- [ ] **Guard content & ranked write routes** — require `../middleware/auth` and apply `requireAuth` to every POST/PUT/DELETE in: `api/routes/evidence.js`, `api/routes/responses.js`, `api/routes/essays.js`, `api/routes/blog-posts.js`, `api/routes/historiography.js`, `api/routes/popular-challenges.js`, `api/routes/academic-challenges.js`, `api/routes/wikipedia.js`, `api/routes/news-articles.js`, `api/routes/collections.js`, `api/routes/resources.js`, `api/routes/identifiers.js`.
- [ ] **Guard diagram & admin-only routes** — apply `requireAuth` to write/admin endpoints in: `api/routes/maps.js`, `api/routes/arbor.js`, `api/routes/drafts.js`, `api/routes/publish.js`, and the dashboard GETs in `api/routes/analytics.js` (leave `POST /analytics` public).

### Missing base resources

- [ ] **Create bibliography model** — CRUD for the `mla_sources` table (list, getById, create, update, remove) for managing citations. File: `api/models/mla-source.model.js`
- [ ] **Create bibliography route** — REST endpoints for `mla_sources` (auth-guarded writes) and mount it at `/sources` in `api/server.js`. File: `api/routes/sources.js`
- [ ] **Create about-page model** — CRUD for the `about_pages` table (ordered sections, publish flag). File: `api/models/about.model.js`
- [ ] **Create about-page route** — REST endpoints for `about_pages` (auth-guarded writes) and mount it at `/about` in `api/server.js`. File: `api/routes/about.js`

### Composite relational read/write — Evidence

- [ ] **Extend evidence model with composite read/write** — add `getAdminById` (any publish state), `getDetailBySlug` (assembles pictures via child-rows, plus `evidence_mla_sources`, `evidence_identifiers`, `evidence_links_evidence`, `evidence_links_context` via junctions), and wrap `create`/`update` in a transaction that replaces those related sets. File: `api/models/evidence.model.js`
- [ ] **Update evidence route for composite payloads** — add `GET /evidence/admin/:id` (full draft + relations) and accept the related arrays on POST/PUT; keep public `:slug` returning the composite detail. File: `api/routes/evidence.js`

### Composite relational read/write — Journal entities (Responses, Essays, Blog, Historiography)

- [ ] **Extend response model with breakouts/pictures/sources/links** — `getAdminById`, `getDetailBySlug` (breakouts, pictures, `response_mla_sources`, `response_identifiers`, `response_links_*`), transactional composite `create`/`update`. File: `api/models/response.model.js`
- [ ] **Update responses route for composite payloads** — admin read-by-id + accept related arrays on write. File: `api/routes/responses.js`
- [ ] **Extend essay model with breakouts/pictures/sources/links** — composite detail + transactional writes for `context_essays`. File: `api/models/essay.model.js`
- [ ] **Update essays route for composite payloads** — admin read-by-id + composite write. File: `api/routes/essays.js`
- [ ] **Extend blog-post model with breakouts/pictures/sources/links** — composite detail + transactional writes for `blog_posts`. File: `api/models/blog-post.model.js`
- [ ] **Update blog-posts route for composite payloads** — admin read-by-id + composite write. File: `api/routes/blog-posts.js`
- [ ] **Extend historiography model with breakouts/pictures/sources/links** — composite detail + transactional writes. File: `api/models/historiography.model.js`
- [ ] **Update historiography route for composite payloads** — admin read-by-id + composite write. File: `api/routes/historiography.js`

### Challenge detail (Popular & Academic)

- [ ] **Extend challenge models with counts & citations** — add `getAdminById`, a published response count for list views, and `getDetailBySlug` assembling `challenge_mla_sources` + `challenge_identifiers`. Files: `api/models/popular-challenges.model.js`, `api/models/academic-challenges.model.js`
- [ ] **Update challenge routes for detail & admin reads** — expose response count on list and the composite detail/admin read. Files: `api/routes/popular-challenges.js`, `api/routes/academic-challenges.js`

### Tests (mandatory — see Notes)

- [ ] **Create content-seeding test helper** — an in-memory DB seeded with sample evidence/journal/challenge rows + related child/junction rows, reusing the schema. File: `api/tests/helpers/seed.js`
- [ ] **Test relations helpers** — child-rows and junctions get/replace round-trips, ordering, and transactional rollback on bad input. File: `api/tests/relations.test.js`
- [ ] **Test auth enforcement** — every write route returns 401 without a session cookie and succeeds with one. File: `api/tests/auth-guard.test.js`
- [ ] **Test evidence composite CRUD** — create with pictures/sources/identifiers/links, read back via detail + admin-by-id, update replaces related sets, filters work. File: `api/tests/evidence.test.js`
- [ ] **Test journal composite CRUD** — shared coverage for responses/essays/blog/historiography breakouts, pictures, sources, links. File: `api/tests/journal-content.test.js`
- [ ] **Test sources & about CRUD** — `mla_sources` and `about_pages` create/view/edit/delete. File: `api/tests/sources-about.test.js`

## Files touched

**Created**
- `api/models/relations/child-rows.js` — created
- `api/models/relations/junctions.js` — created
- `api/models/mla-source.model.js` — created
- `api/routes/sources.js` — created
- `api/models/about.model.js` — created
- `api/routes/about.js` — created
- `api/tests/helpers/seed.js` — created
- `api/tests/relations.test.js` — created
- `api/tests/auth-guard.test.js` — created
- `api/tests/evidence.test.js` — created
- `api/tests/journal-content.test.js` — created
- `api/tests/sources-about.test.js` — created

**Modified**
- `api/server.js` — modified (mount `/sources` and `/about`)
- `api/routes/evidence.js`, `api/routes/responses.js`, `api/routes/essays.js`, `api/routes/blog-posts.js`, `api/routes/historiography.js` — modified (auth + composite + admin read)
- `api/routes/popular-challenges.js`, `api/routes/academic-challenges.js` — modified (auth + detail/counts)
- `api/routes/wikipedia.js`, `api/routes/news-articles.js`, `api/routes/collections.js`, `api/routes/resources.js`, `api/routes/identifiers.js`, `api/routes/maps.js`, `api/routes/arbor.js`, `api/routes/drafts.js`, `api/routes/publish.js`, `api/routes/analytics.js` — modified (auth)
- `api/models/evidence.model.js`, `api/models/response.model.js`, `api/models/essay.model.js`, `api/models/blog-post.model.js`, `api/models/historiography.model.js` — modified (composite read/write)
- `api/models/popular-challenges.model.js`, `api/models/academic-challenges.model.js` — modified (counts + citations)

## Notes
- **Tests are mandatory** because this plan touches `.js` files in `api/` (skill Step 2). They use only `node:test` + `node:assert` against an in-memory SQLite DB — mirror the existing pattern in `api/tests/helpers/db.js` (`:memory:`, fresh DB per suite, no real database touched). Add matching `node --test` scripts to `api/package.json` if not already covered by a glob.
- **Transactions matter for atomicity (SR-3, JS-2):** a composite create must insert the parent row *and* its children/links in one `db.transaction()` so a failure half-way never leaves orphaned child rows. `replaceChildren`/`replaceLinks` should delete-then-insert inside that same transaction.
- **Admin vs public reads:** public `getBySlug` keeps its `published_draft = 1` filter; the new `getAdminById` deliberately ignores publish state so the admin edit form can load drafts. Do not relax the public filter.
- **FTS is already handled by triggers** (`evidence_fts`, `responses_fts`, etc.) — composite writes must keep updating the base columns through the same `evidence`/`responses` rows so the triggers fire; do not write FTS tables directly.
- **`publish.js` already has a clean type→model map** and inline id validation; it only needs `requireAuth`. Consider extending its `MODELS` map to cover `resources`, `identifiers`, and `about` if those should be publishable — out of scope here unless required.
- **Dependency order:** relations helpers first (the composite model tasks import them); auth wiring is independent and can land at any point but is listed early because it is the most security-critical gap. Tests come last so they exercise the finished behaviour.
- **Schema vs. Style guide discrepancy (logged to Issues.md):** the journal-article spec (§9) references essay columns that do not exist in `schema.sql` — `two_column`, a DOI/citation field, and an author-bio field. The composite read tasks return only columns that actually exist; the missing fields need a schema decision before they can be served.
