# Performance and caching

Pages load fast and stay fresh. Static files are cached for a long time at addresses that change when
content changes, and visitors see a first-paint snapshot that live data then confirms.

**Source of truth:** `deploy/nginx.conf`, `api/middleware/security-headers.js` and `api/middleware/auth.js` — win any disagreement with this doc.
**Spans:** `deploy/nginx.conf`, `api/middleware/security-headers.js`, `api/middleware/auth.js`, `api/scripts/version-assets.js`, `api/scripts/generate-maps/index.js`, `api/scripts/embed-initial-data.js`, `frontend/assets/js/utils/lazy-load.js`, `frontend/assets/js/utils/data-revalidation.js`.

## Invariants

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

## Shape

- **Static files and HTML:** `deploy/nginx.conf`.
- **Public API reads:** `api/middleware/security-headers.js`.
- **Authenticated responses:** `api/middleware/auth.js`.
- **Edge:** a Cloudflare Cache Rule, purged by the deploy workflow (`deployment.md`).

## Extending it

- **A new page or component:** reuse the shared CSS and JS. Do not add per-page files that repeat a shared component (SR-3).
- **A new cache rule:** change `deploy/nginx.conf` or the middleware, then check the deployed response headers on the VPS. A change in `deploy/nginx.conf` also needs the symlink in `deployment.md`.
- **A performance change:** measure with Lighthouse or WebPageTest against the deployed VPS, not local. A change that does not move a measured number is not done.

## Not documented here

The exact `Cache-Control` values and the Cloudflare rule text. Read them in the files named above and in the Cloudflare dashboard.
