# Publishing pipeline

An admin saves content as a draft, then publishes it. Publishing shows the row to visitors and
writes its static page, so every URL is a real HTML file that paints stored data before the live fetch.

**Source of truth:** `api/routes/publish.js` and `api/config/content-pages.js` — win any disagreement with this doc.
**Spans:** `api/routes/drafts.js`, `api/routes/publish.js`, `api/models/drafts.model.js`, `api/services/page-generator.js`, `api/config/content-pages.js`, `api/scripts/regenerate-pages.js`, `api/scripts/embed-initial-data.js`, `api/models/evidence.model.js`, `api/models/blog-post.model.js`, `api/models/search.model.js`, `api/scripts/generate-sitemap.js`, `frontend/assets/js/utils/data-revalidation.js`, `database/schema.sql`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Every content row starts with `published_draft = 0`. Public routes return published rows only, and the model decides this (API-5) | Visitors and the MCP server read the same public routes | A public query without the filter shows an unfinished draft |
| Publishing regenerates the static page of that row. If page generation fails, the publish still succeeds and only a log line records it | A page failure must not undo the publish | A published row has no page, or an old one. Only `npm run pages` repairs it |
| `api/config/content-pages.js` lists every content type that gets a static page. A new type is added there, not in a new generator | `page-generator.js` reads the list | The new type has no `[slug]` page and no SEO `<head>` |
| There is no JS router. Each section has a `[slug].html` template, and the generator writes one real file per slug at publish and at deploy | Search engines and the first paint read the file | A slug that is only reachable by JS is missing from search results |
| Allowed values (categories, eras, timeline periods) are `CHECK (... IN (...))` constraints in `database/schema.sql`. The frontend and admin lists follow the schema | The schema is the single source of the value list | A value is added to the schema but not to a list, and nobody can choose it. Add the migration first, then the lists |
| The snapshot `SELECT` in `api/scripts/embed-initial-data.js` carries every field that the renderer reads | The page paints the snapshot before the live fetch, then `utils/data-revalidation.js` re-renders only if the live data differs | A field is missing from the snapshot, so the page shows wrong data until the live fetch arrives. Example: the timeline era pages need `timeline_offset_x` and `timeline_offset_y` (`api/tests/embed-initial-data.test.js`) |
| A blog post is registered in six places: the `MODELS` map in `api/routes/publish.js`, the type list in `api/models/drafts.model.js`, the `"blog-posts"` entry in `api/config/content-pages.js` (static page `frontend/news-and-blog/blog/[slug].html`), and the `blog_posts` entry in `api/scripts/generate-sitemap.js`. The `blog_posts_fts` entry in `api/models/search.model.js` makes site search read `blog_posts_fts`, and the `blog_posts_fts_*` triggers in `database/schema.sql` keep it in step with title, content and keywords (guide test: `api/tests/guide-publishing-pipeline.test.js`) | Publish, the dashboard draft list, the static page, the sitemap and search each read their own list | A post cannot be published, has no page, is missing from the sitemap, or never appears in search. A new indexed column must be added to the `WHEN` clause and the column lists of `blog_posts_fts_au` |
| `updateComposite` in `api/models/evidence.model.js` rewrites a junction set (MLA sources, identifiers, evidence links, context links) only when the request body holds that array. An empty array clears the set | The timeline editor saves with only the timeline fields | A save that sends no array clears no data. A client that sends an empty array by mistake erases the set (`api/tests/evidence.test.js`) |

## Shape

- **Drafts:** `api/routes/drafts.js` lists the drafts for the admin dashboard. `api/routes/publish.js` publishes, through its `MODELS` map.
- **Pages:** `api/services/page-generator.js` writes the `[slug]` files. `api/scripts/regenerate-pages.js` (`npm run pages`) writes all of them. The deploy runs it (`deployment.md`).
- **First paint:** `api/scripts/embed-initial-data.js` (`npm run embed-data`) writes the snapshot into list and visual pages at deploy.

## Extending it

A new publishable content entity touches these layers, in this order:

1. `database/migrations/NNN_*.sql` — table, junction tables, FTS and triggers if searchable, the `updated_at` trigger and `published_draft`. Update `database/schema.sql` in the same commit (MIG-4).
2. `api/models/<entity>.model.js` — prepared statements, the `pickWritable` whitelist, `generateUniqueSlug`, and the `api/models/relations/` helpers for links.
3. `api/routes/<entity>.js` — validation and error mapping only. Mount it in `api/server.js` behind `publicReadLimit`, or behind `requireAuth` if it is not public. Add it to the `MODELS` map in `api/routes/publish.js` and to `api/models/drafts.model.js`.
4. `api/config/content-pages.js` — if the entity gets static pages.
5. `admin/<entity>/` — CRUD pages that call `Admin.api.*`.
6. `frontend/<section>/` — an index page, a `[slug].html` template and a page script that imports from `api.js`.
7. `mcp-server/tools/` — only if AI agents must query it.
8. `api/tests/` — model and route tests, including the two auth tests for each write route (TEST-7).

A smaller feature follows the same chain (schema, model, route, UI) and touches only the layers it needs. No layer is skipped: no SQL in a route, no `fetch` in a page script.

## Not documented here

The columns of each table are in `database/schema.sql`. The route list is in `api/server.js`.
