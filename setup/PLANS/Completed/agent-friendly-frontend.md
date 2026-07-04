# Plan: Agent- & Crawler-Friendly Frontend

**Module(s):** Frontend / API / Shared
**Date:** 2026-07-03
**Status:** ✅ Implemented — all tests pass (328/328)

## Goal
Make the site's public content discoverable and legible to automated agents,
crawlers, and link-unfurlers that do **not** execute JavaScript. Today every
content page is an empty shell hydrated by `fetch`, and the OG/JSON-LD metadata
is injected client-side, so non-JS agents and social preview bots see only
skeleton states. This plan adds a machine-readable API guide (`llms.txt`), a
database-driven `sitemap.xml` that lists real detail URLs, and static
`<head>` metadata + `<noscript>` fallbacks so bots get real content and a
pointer to the clean public JSON API.

## Coding rules to keep in mind
- **SR-2 / SR-3** — No non-visual dependencies and loading speed is
  non-negotiable: the sitemap generator uses only Node built-ins + the existing
  `better-sqlite3`, and the static frontend stays static (no runtime SSR added).
- **JS-2** — Robust & Predictable: the generator must skip unpublished rows and
  fail loudly if the DB or output path is missing, never emit a partial file.
- **HTML-1 / HTML-3** — Semantic markup and one `<h1>`: `<noscript>` fallbacks
  must use semantic elements and must not introduce a second `<h1>`.
- **HTML-2** — Images: any `<img>` referenced in default OG/noscript blocks needs
  a real `alt`.
- **JS-4** — Comments explain *why*: `llms.txt` and the generator header should
  state what agents are expected to consume (the JSON API) and why the static
  site alone is insufficient for them.

## Tasks

### Frontend — machine-readable discovery

- [x] **Create `llms.txt`** — document the site's purpose, the content map, and every public read-only JSON endpoint (`/evidence`, `/evidence/:slug`, `/search?q=`, `/essays`, `/timeline`, `/maps`, `/historiography`, `/blog-posts`, `/news-articles`, `/resources`, `/about`, `/wikipedia`) with example requests, so agents can consume data directly instead of scraping rendered HTML. File: `frontend/llms.txt`

### API — database-driven sitemap

- [x] **Create the sitemap generator** — a Node script that queries every published content table for its slug + `updated_at`, builds absolute `https://www.thejesuswebsite.org/...` URLs for all list and detail pages, and writes `frontend/sitemap.xml`. Uses only built-ins + `better-sqlite3` via the existing `config`. File: `api/scripts/generate-sitemap.js`
- [x] **Add an npm script for the generator** — add `"sitemap": "node scripts/generate-sitemap.js"` so it can be run on demand. File: `api/package.json`
- [x] **Wire the generator into deploy** — call the sitemap generator after migrations, before (re)starting the process, so every deploy refreshes detail URLs. File: `deploy.sh`

### Frontend — static metadata & no-JS fallback

- [x] **Add static default OG/meta to the blog detail template head** — a static `og:title`/`og:description`/`og:image`/`og:type` and canonical baseline in `<head>` so unfurlers get sensible defaults before (or without) JS; the existing `setSEO` still upgrades them per-post at runtime. File: `frontend/news-and-blog/blog/[slug].html`
- [x] **Add static default OG/meta to the remaining detail templates** — apply the same static `<head>` baseline to the essay, response, evidence, historiography, challenge, and news detail templates. Files: `frontend/contextual-essays/[slug].html`, `frontend/debate/responses/[slug].html`, `frontend/evidence/single/[slug].html`, `frontend/debate/historiography/[slug].html`, `frontend/debate/*-challenges/[slug].html`, `frontend/news-and-blog/news/[slug].html`
- [x] **Add a `<noscript>` content pointer to detail templates** — a semantic `<noscript>` block (no second `<h1>`) telling non-JS agents where the machine-readable data lives (the item's JSON endpoint and `/llms.txt`). Files: same detail templates as above.

### API — tests (mandatory for `api/` changes)

- [x] **Test the sitemap generator** — against an in-memory seeded DB, assert the output is well-formed XML, includes published detail slugs, excludes unpublished rows, and lists the section index URLs. File: `api/tests/generate-sitemap.test.js`

## Files touched
- `frontend/llms.txt` — created
- `api/scripts/generate-sitemap.js` — created
- `api/tests/generate-sitemap.test.js` — created
- `api/package.json` — modified
- `deploy.sh` — modified
- `frontend/sitemap.xml` — modified (now generated, not hand-maintained)
- `frontend/news-and-blog/blog/[slug].html` — modified
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/evidence/single/[slug].html` — modified
- `frontend/debate/historiography/[slug].html` — modified
- `frontend/debate/popular-challenges/[slug].html` — modified
- `frontend/debate/academic-challenges/[slug].html` — modified
- `frontend/news-and-blog/news/[slug].html` — modified

## Notes
- **Scope boundary — no runtime SSR in this plan.** Full server-side rendering
  or bot-prerendering (having the API serve HTML with per-request DB-injected
  meta) is a larger architectural change that conflicts with the "frontend is
  static, API is separate" decision in `Website_guide.md`. It is deliberately
  deferred and logged to `Issues.md` for an owner decision. This plan delivers
  the high-value, architecture-preserving wins first: static default meta gives
  unfurlers *something*, and `llms.txt` + the DB-driven sitemap make the real
  content fully discoverable via the JSON API.
- **The generated `sitemap.xml` replaces the hand-maintained one.** After this
  plan, editing `sitemap.xml` by hand is pointless — it is overwritten on deploy.
  The generator is the source of truth; `robots.txt` already points crawlers at
  it.
- **Detail-page URL patterns** must match the generator's output exactly — the
  generator and the `[slug].html` routes have to agree on paths (e.g.
  `/evidence/single/{slug}` vs `/evidence/{slug}`); confirm against the frontend
  router before shipping (this is an existing inconsistency worth checking — see
  `Issues.md`).
- **`llms.txt` is data, not code**, so it carries no automated test; the sitemap
  generator (in `api/`) does, per the skill rule.

## Completion workflow
After implementing all tasks:
1. Mark each task checkbox `[x]` when completed.
2. Update the **Status** line at the top to `✅ Implemented — all tests pass`.
3. Move this file to `setup/PLANS/Completed/`.
