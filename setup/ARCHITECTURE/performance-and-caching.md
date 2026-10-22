# Performance and caching

Pages load fast and stay fresh. Static files are cached for a long time at addresses that change when
content changes, and visitors see a first-paint snapshot that live data then confirms.

**Source of truth:** `deploy/nginx.conf`, `api/middleware/security-headers.js` and `api/middleware/auth.js` — win any disagreement with this doc.
**Spans:** `deploy/nginx.conf`, `api/middleware/security-headers.js`, `api/middleware/auth.js`, `api/scripts/version-assets.js`, `api/scripts/generate-maps/index.js`, `api/scripts/embed-initial-data.js`, `frontend/assets/js/utils/lazy-load.js`, `frontend/assets/js/utils/data-revalidation.js`, `api/scripts/run-lighthouse.js`, `.github/workflows/performance-check.yml`.

## 1. Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Versioned JS and CSS (`/assets/js/`, `/assets/css/`) are cached immutable for a year, and their URLs change at every deploy | `api/scripts/version-assets.js` stamps the URLs (`deployment.md`) | A deploy that skips the stamp serves old code from the browser cache for a year |
| Other `/assets/` files, such as images, are cached immutable for a year at stable URLs. A replaced image gets a new filename | The URL is the cache key | The old image stays in browsers and at the edge |
| `/assets/images/maps/` is the exception: it revalidates and uses `?v=`. After `api/scripts/generate-maps/` rewrites an SVG, a new migration bumps `?v=` on `maps.image_path` | The map files keep their filenames | Returning browsers keep the old map artwork |
| HTML is `max-age=60` (D-013). A Cloudflare Cache Rule honours that value for everything except `/api/*` and `/admin/*`. Each deploy purges the edge | The origin header is the edge-cache contract with Cloudflare (see the comment in `deploy/nginx.conf`) | The edge keeps HTML longer than 60 seconds, or does not cache it at all |
| `/admin/` always revalidates, and authenticated API responses are `no-store` | Admin pages and private data must never come from a cache | An editor sees an old admin page, or a shared cache holds private data |
| Every `Cache-Control` value is read where it is set: `deploy/nginx.conf` for static files and HTML, `api/middleware/security-headers.js` for public `/api/` reads, `api/middleware/auth.js` for authenticated responses | This doc states the shape of the policy, not the values | A value copied into a doc or a second file drifts |
| List and visual pages carry an embedded snapshot, and `utils/data-revalidation.js` re-renders only if the live data differs | The first paint needs no fetch | A change to the renderer that skips the snapshot makes the page flash or jump (`publishing-pipeline.md`) |
| ES modules stay `defer`red at the bottom of `<body>` (HTML-4). Images use native `loading="lazy"` or `data-src`, which `utils/lazy-load.js` swaps in (`image-display.md`) | A blocking script or an eager image delays the first paint | The page loads slower and no test fails |

## 2. Performance budget

Every page type must load inside these limits on a mobile connection. They are Google's "good" marks. Measure the deployed site with Lighthouse (mobile preset) or WebPageTest, never a local copy. The check reads this table, so the numbers live here and nowhere else.

| Key | Metric | Limit |
| :-- | :--- | :--- |
| `score` | Lighthouse performance score (0 to 100) | at least 90 |
| `lcp` | Largest Contentful Paint, in milliseconds | at most 2500 |
| `cls` | Cumulative Layout Shift | at most 0.1 |
| `tbt` | Total Blocking Time, in milliseconds | at most 200 |

WebPageTest gives no performance score, so a WebPageTest result is checked against `lcp`, `cls` and `tbt` only.

### 2.1 Pages covered

One representative page stands for each page type, and each page is checked against the whole table above. The list of addresses is `PAGES` in `api/scripts/run-lighthouse.js`. This table must match it. Admin pages are not covered.

| Name | Address | Page type |
| :-- | :--- | :--- |
| `home` | `/` | Home page |
| `list` | `/news-and-blog/news/` | List page |
| `detail` | `/contextual-essays/census-of-quirinius` | Detail page |
| `evidence` | `/evidence/the-logos` | Evidence page |
| `timeline` | `/evidence/timeline/` | Timeline |
| `arbor` | `/evidence/arbor.html` | Arbor diagram |
| `maps` | `/evidence/maps/galilee.html` | Maps |
| `debate` | `/debate/` | Debate |
| `resources` | `/resources/` | Resources |

A page that returns an error status fails the check, so a removed page cannot pass quietly. Pick a new representative page and update both lists when a page is removed.

### 2.2 Running the check

The check is opt-in. `npm test` never runs it, and no deploy step calls it. The guide test is `api/tests/perf/guide-performance-and-caching.test.js` (TEST-10). It fails and names the metric, the value and the limit when a saved result breaks the table. The helper that reads this table is covered by `api/tests/performance-budget.test.js`, which does run in `npm test`.

| Step | Command or action |
| :-- | :--- |
| Measure with Lighthouse | `cd api && npm run perf:lighthouse` saves one report per page in `api/perf-results/` |
| Measure with WebPageTest | Save its JSON result as `api/perf-results/webpagetest-<name>-<date>.json`, with the page name from section 2.1 |
| Check the newest result for each page and tool | `cd api && npm run test:perf` |
| Run both on GitHub | Actions tab, "Performance check", Run workflow. GitHub emails a failed run |
| Ask in chat | When Luke asks for a performance test, the agent runs `gh workflow run performance-check.yml`, watches the run with `gh run watch`, and reports the result in chat. The workflow runs on GitHub, so its file must be on `main` first. Luke also gets the GitHub email if the run fails |

## 3. Shape

- **Static files and HTML:** `deploy/nginx.conf`.
- **Public API reads:** `api/middleware/security-headers.js`.
- **Authenticated responses:** `api/middleware/auth.js`.
- **Edge:** a Cloudflare Cache Rule, purged by the deploy workflow (`deployment.md`).
- **Measurement:**

```
run-lighthouse.js (PAGES) ─> perf-results/lighthouse-<name>-*.json ─┐
WebPageTest JSON ──────────> perf-results/webpagetest-<name>-*.json ┼─> test:perf ─> pass, or fail naming page and metric
Budget table in this guide ─────────────────────────────────────────┘
```

  `performance-check.yml` runs the Lighthouse script and then `test:perf` on GitHub. It starts only by hand.

## 4. Extending it

- **A new page or component:** reuse the shared CSS and JS. Do not add per-page files that repeat a shared component (SR-3).
- **A new cache rule:** change `deploy/nginx.conf` or the middleware, then check the deployed response headers on the VPS. A change in `deploy/nginx.conf` also needs the symlink in `deployment.md`.
- **A performance change:** measure the deployed VPS, not local, with Lighthouse or WebPageTest (section 2). A change that does not move a measured number is not done.
- **A new limit or a new metric:** edit the table in section 2, and add the reader for the metric in `api/tests/helpers/performance-budget.js`.

## 5. Not documented here

The exact `Cache-Control` values and the Cloudflare rule text. Read them in the files named above and in the Cloudflare dashboard.
