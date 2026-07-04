# Performance Report — CSS Delivery & List Pagination

**Date:** 2026-07-03
**Scope:** Two frontend performance observations from the site review, with
recommended fixes. Both are **"fine now, worth doing before the bulk data
upload"** — neither is a launch blocker, and both fixes must respect the
project's constraints: no build step, no non-visual dependencies (SR-2), and
loading speed is non-negotiable (SR-3).

---

## 1. Each page loads ~20 separate CSS files

### What's happening
Content pages link many small, single-responsibility stylesheets in `<head>`
(`variables.css`, `reset.css`, `typography.css`, then per-layout, per-component,
and per-page files). The evidence index links 18; the blog index links 20+. This
is a direct and *correct* consequence of **CSS-1** ("one file, one job,
under 150 lines") — the file count is a feature of the authoring model, not a
mistake.

### Why it's fine today
- Over **HTTP/2** (which any modern host/nginx terminates), all the stylesheets
  are multiplexed over a single connection — there's no per-file connection
  cost the way there was under HTTP/1.1.
- They're small, static, and cacheable. After the first visit they're served
  from browser cache with a `304`/`Cache-Control` hit.
- Keeping the files split keeps authoring clean and diffs small.

### When it starts to matter
- On the **first, uncached visit** (the one that decides bounce rate and Core
  Web Vitals), 20 render-blocking `<link>`s in `<head>` mean 20 request/response
  round-trips must resolve before first paint. On a slow mobile connection that
  latency adds up, even multiplexed.
- If the host ever falls back to **HTTP/1.1** (or a misconfigured proxy), the
  cost balloons.

### Recommended fix — concatenate at deploy, keep the sources split
Do **not** merge the source files (that would violate CSS-1 and hurt
maintainability). Instead, add a tiny **build-at-deploy concatenation step** that
bundles the per-page CSS chain into one file per page-type, and point the HTML at
the bundle. This keeps the authoring model intact while shipping one request.

Concretely:
1. Add `api/scripts/build-css.js` (Node built-ins only — no dependency, respects
   SR-2): for each page-type, read its ordered list of source CSS files,
   concatenate them, and write `frontend/assets/css/dist/<page-type>.css`.
   Preserve `@import`-free ordering (variables first).
2. Point each page's `<head>` at its single `dist/<page-type>.css` (the shared
   base — variables/reset/typography/layout — can be one common bundle, plus one
   page bundle, so two links instead of twenty).
3. Wire the script into `deploy.sh` (same pattern as the proposed sitemap
   generator) and add an `npm run build:css` script.
4. Keep the split source files as the edit surface; `dist/` is generated and
   git-ignored (or committed, owner's call).

**Effort:** small. **Risk:** low (pure concatenation, deterministic order).
**Alternative (zero-tooling):** if even a deploy script is unwanted, set long
`Cache-Control` / `immutable` headers on `/assets/css/` at nginx and rely on
HTTP/2 — acceptable, but doesn't help the critical first paint.

> **SR-1/CSS-1 note:** this is explicitly a *distribution* optimisation, not a
> merge of concerns. The authored files stay one-job-each; only the shipped
> artifact is combined. Document this in the CSS section of the style guide so a
> future reader doesn't "fix" the split back apart.

---

## 2. `evidence-list` fetches the full dataset and paginates client-side

### What's happening — and it's worse than a one-time full fetch
`frontend/assets/js/evidence-list.js` implements infinite scroll, but there is
**no server-side pagination**. The API (`GET /evidence`,
`evidenceModel.getAllPublished`) returns *every* published row, and the client
slices `PAGE_SIZE = 20` out of it.

The code even flags it:
```js
// The API doesn't support pagination natively — we fetch all matches and slice
// TODO: update API to support `?page=N&limit=N` for proper pagination
```

Critically, `loadPage()` calls `getEvidence(params)` **on every scroll
increment**, then slices a different window from the freshly-downloaded full
array (`api/../evidence-list.js:124` → `data.slice(start, start + PAGE_SIZE)`).
So scrolling through *N* pages re-downloads the entire dataset *N* times. With 40
items today (2 pages) that's invisible. After the planned **bulk data upload**,
with (say) 1,000 items, a full scroll becomes ~50 fetches of the entire table —
tens of MB of redundant transfer and JSON parsing, plus growing memory as
`allItems` accumulates.

The same "fetch-all-then-slice" pattern should be checked in the other list
modules (`blog-list.js`, `news-list.js`, `essays-list.js`,
`historiography-list.js`) — they share the infinite-scroll skeleton.

### Why it's fine today
Small dataset. One full fetch is a few KB; even the repeated fetches are cheap at
current volume, and `sessionStorage` caching smooths repeat visits.

### Recommended fix — real server-side pagination (do before bulk upload)
1. **API:** extend `evidenceModel.getAllPublished` and `GET /evidence` to accept
   `?page=N&limit=M` (cap `limit`, e.g. `Math.min(limit, 100)`, matching the
   existing pattern in `search.js` / `analytics.js`), and return
   `SELECT ... LIMIT ? OFFSET ?` ordered stably (`created_at DESC, id DESC`).
   Return a small envelope — `{ items, total, page, hasMore }` — or expose
   `total` via a header so the client knows when to stop.
2. **Frontend:** change `loadPage()` to request only the next page
   (`getEvidence({ ...filters, page: currentPage, limit: PAGE_SIZE })`) and
   append `data.items` — delete the client-side `data.slice(...)` and the
   full-array accumulation. `hasMore` comes from the API, not from array length.
3. **Keep** the `IntersectionObserver` sentinel and `sessionStorage` scroll
   restoration — only the data-fetch layer changes.
4. **Index:** ensure the DB has an index supporting the `ORDER BY` +
   `WHERE published_draft = 1` (and any active filter columns) so `LIMIT/OFFSET`
   stays fast at scale. For very large tables, prefer **keyset pagination**
   (`WHERE created_at < ?`) over `OFFSET` to avoid deep-offset cost — worth it
   given the bulk upload.
5. **Tests:** add an `api/tests` case asserting `?page`/`?limit` returns the
   right window, caps `limit`, and reports `hasMore` correctly (mandatory for
   `api/` changes per the plan skill).

**Effort:** moderate (one model fn, one route, one client fn, one test per list
type). **Risk:** low-moderate — the contract change is additive (default to page 1
if params absent, so nothing breaks mid-migration).

---

## Priority & sequencing

| Item | Urgency | Trigger to act |
|---|---|---|
| CSS concatenation | Low | Before a mobile-performance / Core Web Vitals push, or if the host isn't on HTTP/2 |
| Server-side pagination | **Medium** | **Before the bulk data upload** — this is the one that degrades sharply with row count, and the current code re-fetches the whole table per scroll |

Recommendation: schedule the **pagination** work as part of the bulk-upload
preparation (it's the one that turns from "fine" to "slow" the moment the data
grows), and treat **CSS concatenation** as an independent, low-risk polish item
whenever a performance pass happens. Neither requires a framework or a new
dependency — both fit the existing "Node script wired into `deploy.sh`" pattern.
