# Plan: Template-Based Static Page Generation

**Module(s):** API / Frontend / Shared
**Date:** 2026-07-03
**Status:** ✅ Implemented — all tests pass (340/340)

## Goal
Turn each `[slug].html` file into a true **template**: when a content item is
published, generate a real static page at `{directory}/{slug}.html` from that
template, with the item's `<title>`, meta description, canonical URL, Open Graph
tags, and JSON-LD **baked into `<head>` at generation time**. The page body
continues to hydrate via the existing detail JS (which reads the slug from the
URL path). This gives every published item a crawlable, unfurl-ready static URL
without a build framework, and removes the need for per-slug nginx rewrites.

## Coding rules to keep in mind
- **SR-2 / SR-3** — No non-visual dependencies: the generator uses only Node
  built-ins (`fs`, `path`) plus the existing `better-sqlite3` via `config`. No
  templating library, no headless browser.
- **JS-2** — Robust & Predictable: generation must escape all interpolated DB
  values (reuse the escaping discipline from the render-bug-fix plan), skip
  unpublished rows, and fail loudly on a missing template or unwritable output
  path — never emit a half-written file.
- **JS-3** — Modern & Simple: one generator service + one CLI wrapper; no class
  hierarchy.
- **SR-1** — One job per file: the type→template mapping lives in its own shared
  config so both this generator and the sitemap generator consume one source of
  truth.
- **HTML-2 / HTML-3** — Baked `<head>` must not add a second `<h1>`; any OG image
  reference is metadata only.

## Tasks

### Shared — single source of truth for content pages

- [x] **Create the content-pages config** — a map keyed by publishable type, each entry giving `{ model, templatePath, outputDir, urlPattern, titleColumn, descriptionColumn }` for the 8 detail types (evidence, essays, responses, historiography, blog-posts, news-articles, popular-challenges, academic-challenges). This is the one place URL patterns are defined, resolving the `/evidence/single/{slug}` vs `/evidence/{slug}` ambiguity (Issue #22). File: `api/config/content-pages.js`

### API — the generator

- [x] **Create the page-generator service** — export `generatePage(type, slug)` (load the published row, render an escaped `<head>` SEO block, replace the template's `<!-- SEO -->` placeholder, write `{outputDir}/{slug}.html`) and `removePage(type, slug)` (delete the file). Reads the shared config; no HTTP concerns. File: `api/services/page-generator.js`
- [x] **Create the batch regeneration CLI** — iterate every published row of every type and (re)generate its page; used after a bulk upload or a template change. Removes orphaned generated files whose row is gone/unpublished. File: `api/scripts/regenerate-pages.js`
- [x] **Add an npm script for regeneration** — `"pages": "node scripts/regenerate-pages.js"`. File: `api/package.json`

### API — wire generation into the content lifecycle

- [x] **Generate on publish, remove on unpublish** — in the publish route's shared handler, call `generatePage(type, slug)` after a successful publish and `removePage(type, slug)` after unpublish, resolving the slug from the updated row. Failure to generate must surface (not silently succeed the publish). File: `api/routes/publish.js`

### Frontend — mark the templates

- [x] **Add the `<!-- SEO -->` placeholder to the evidence detail template** — insert the placeholder in `<head>` where `evidence-detail.js`/`seo.js` currently inject at runtime, so the generator fills it statically while JS still upgrades it live. File: `frontend/evidence/single/[slug].html`
- [x] **Add the `<!-- SEO -->` placeholder to the remaining detail templates** — same edit for essay, response, historiography, blog, news, and the two challenge templates. Files: `frontend/contextual-essays/[slug].html`, `frontend/debate/responses/[slug].html`, `frontend/debate/historiography/[slug].html`, `frontend/news-and-blog/blog/[slug].html`, `frontend/news-and-blog/news/[slug].html`, `frontend/debate/popular-challenges/[slug].html`, `frontend/debate/academic-challenges/[slug].html`

### Deploy

- [x] **Regenerate pages on deploy** — call `npm run pages` after migrations and after the sitemap step so a fresh checkout/bulk upload materialises all detail pages. File: `deploy.sh`
- [x] **Ignore generated detail pages in git** — add a pattern so generated `{slug}.html` files are not committed (the `[slug].html` templates and static `index.html` pages stay tracked); they are rebuilt on deploy. File: `.gitignore`

### API — tests (mandatory)

- [x] **Test the generator** — against a seeded in-memory DB: generates a file with the correct escaped title/description/canonical/OG/JSON-LD, refuses an unpublished slug, `removePage` deletes it, and a template missing the placeholder fails loudly. File: `api/tests/page-generator.test.js`

## Files touched
- `api/config/content-pages.js` — created
- `api/services/page-generator.js` — created
- `api/scripts/regenerate-pages.js` — created
- `api/routes/publish.js` — modified
- `api/package.json` — modified
- `api/tests/page-generator.test.js` — created
- `frontend/evidence/single/[slug].html` — modified
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/debate/historiography/[slug].html` — modified
- `frontend/news-and-blog/blog/[slug].html` — modified
- `frontend/news-and-blog/news/[slug].html` — modified
- `frontend/debate/popular-challenges/[slug].html` — modified
- `frontend/debate/academic-challenges/[slug].html` — modified
- `deploy.sh` — modified
- `.gitignore` — modified

## Notes
- **Supersedes part of `agent-friendly-frontend.md`.** That plan's "static
  default OG/meta to templates" and "`<noscript>` fallback" tasks were a
  weaker stand-in for exactly this. Once pages are generated with per-item meta
  baked in, drop those two task groups from the agent-friendly plan; keep its
  `llms.txt` and sitemap-generator tasks. The sitemap generator should be
  refactored to consume `api/config/content-pages.js` so the two generators
  never disagree on URLs. Logged to Issues.md.
- **The API process writes into `frontend/`.** On the single VPS the API and the
  static frontend share one filesystem, so this is a local `fs.writeFile`. If the
  frontend is ever hosted separately (CDN/object store), the generator's output
  target becomes a deploy artifact upload instead — noted as a future constraint.
- **v1 regenerates on publish/unpublish and via the CLI, not on every edit.**
  Editing a *published* item's title won't refresh its baked `<head>` until it is
  re-published or `npm run pages` runs. Acceptable for launch; a follow-up can
  hook the entity `update()` path. Logged to Issues.md.
- **Escaping reuse.** The `<head>` renderer must escape DB values the same way
  the frontend `templates.js` fix does; a title with `&`/`<`/`"` must not break
  the tag or the JSON-LD (`JSON.stringify` handles the latter).
- **Depends on nothing but the DB**, but pairs with `api-namespace-and-nginx-serving.md`
  (which makes `try_files` serve these generated files at extensionless URLs).

## Completion workflow
After implementing all tasks:
1. Mark each task checkbox `[x]` when completed.
2. Update the **Status** line at the top to `✅ Implemented — all tests pass`.
3. Move this file to `setup/PLANS/Completed/`.
