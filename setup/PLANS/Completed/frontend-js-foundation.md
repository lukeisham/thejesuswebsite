# Plan: Frontend JS Foundation

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Create every shared JavaScript file and static asset that all public pages depend on — utilities, API helpers, navigation, footer, SEO, analytics, and the Feather icon sprite. No HTML pages; this layer must exist before any page plan can proceed.

## Coding rules to keep in mind

- **SR-1** — One file per function: each util file exports exactly one concern (debounce, storage, routing, etc.).
- **SR-2** — No external dependencies except for the Feather SVG sprite (a static file, not a runtime dependency).
- **SR-3** — All fetch calls centralised in `api.js`; no raw `fetch()` elsewhere.
- **JS-1** — Intention-revealing names; no comments that restate what the code does.
- **JS-2** — Every public function validates its inputs and returns early on invalid args; never fail silently.
- **JS-3** — Functions stay small and focused; no unnecessary classes or layers.
- **JS-5** — `async/await` + `try/catch` throughout; loading and error states shown before and after every fetch.
- **JS-6** — Event delegation for dynamic elements; `innerHTML` never receives user data; repeated DOM queries cached.
- **CSS-2** — `main.js` reads `--duration-*` and `--ease-*` from CSS custom properties rather than hard-coding values.

## Tasks

### Static assets

- [x] **Download Feather icon set and build SVG sprite** — Compile the icons used across the site into a single sprite file; reference via `<use href="/assets/images/feather-sprite.svg#icon-name">`. File: `frontend/assets/images/feather-sprite.svg`
- [x] **Create SVG favicon** — Minimal SVG favicon using the site accent color (`--accent: #5C4033`). File: `frontend/assets/images/favicon.svg`
- [x] **Create Apple touch icon** — 180×180 PNG icon on `--bg-primary` background, no rounded corners. File: `frontend/assets/images/apple-touch-icon.png`
- [x] **Create PWA web manifest** — `display: browser`, `theme_color: #F8F5F0`, `background_color: #F8F5F0`, icons list. File: `frontend/assets/images/site.webmanifest`
- [x] **Create favicon.ico** — 32×32 `.ico` file at the root, converted from `favicon.svg`. File: `frontend/favicon.ico`
- [x] **Create robots.txt** — Allow all crawlers; point to `/sitemap.xml`. File: `frontend/robots.txt`
- [x] **Create sitemap.xml** — Static XML listing all public routes; updated manually when pages are added. File: `frontend/sitemap.xml`

### Utility JS (no dependencies between these files)

- [x] **Create debounce utility** — Export `debounce(fn, wait)` and `throttle(fn, wait)`; no external deps. File: `frontend/assets/js/utils/debounce.js`
- [x] **Create storage utility** — Export `get(key)`, `set(key, value)`, `remove(key)` wrapping `localStorage` with JSON serialisation and error handling. File: `frontend/assets/js/utils/storage.js`
- [x] **Create DOM utility** — Export `createElement(tag, attrs, children)`, `delegate(root, selector, event, handler)`, and `batchWrite(fn)` (requestAnimationFrame wrapper). Never use `innerHTML` with external data. File: `frontend/assets/js/utils/dom.js`
- [x] **Create format utility** — Export `formatDate(iso)` (long-form, localised), `formatSlug(str)`, `truncate(str, n)`, and `formatVerse(ref)`. File: `frontend/assets/js/utils/format.js`
- [x] **Create router utility** — Export `getParams()` (parse current URL search params), `pushState(path)`, and `getSegment(n)` (nth path segment). File: `frontend/assets/js/utils/router.js`
- [x] **Create state utility** — Export a tiny pub/sub store: `subscribe(key, fn)`, `publish(key, data)`, `getState(key)`, `setState(key, data)`. File: `frontend/assets/js/utils/state.js`
- [x] **Create templates utility** — Export a tagged template function `html\`...\`` that escapes interpolated values; export `renderCard(data)` and `renderBadge(label)` helpers used across list pages. File: `frontend/assets/js/utils/templates.js`
- [x] **Create analytics utility** — Export `recordPageView(path)` which POSTs to `POST /analytics`; fire on every page load and on client-side navigation. File: `frontend/assets/js/utils/analytics.js`
- [x] **Create lazy-load utility** — Export `initLazyLoad()` using `IntersectionObserver` to swap `data-src` → `src` on images and trigger callbacks for heavy sections. File: `frontend/assets/js/utils/lazy-load.js`
- [x] **Create toasts utility** — Export `showToast(message, variant)` (variants: `success`, `error`, `warning`, `info`); manage queue, stacking, auto-dismiss (4 s success/info, 7 s warning/error), and manual ✕ dismiss. File: `frontend/assets/js/utils/toasts.js`

### Core shared JS

- [x] **Create API fetch helper** — Centralise all raw `fetch()` calls; export typed helpers `getEvidence(params)`, `getEssays(params)`, `getEvidenceBySlug(slug)`, etc., each using `async/await` + `try/catch` and returning `{ data, error }`. File: `frontend/assets/js/api.js`
- [x] **Create SEO helper** — Export `setSEO({ title, description, ogImage, jsonLd })` to update `<title>`, `<meta>`, OG tags, and inject JSON-LD `<script>` blocks. Called on every page load and client-side navigation. File: `frontend/assets/js/seo.js`
- [x] **Create cookies helper** — Export `showConsentBanner()`, `getConsent()`, `setConsent(bool)`, `deleteCookie(name)`; persist preference in `localStorage` via the storage util. File: `frontend/assets/js/cookies.js`
- [x] **Create sidebar active-highlight script** — On `DOMContentLoaded`, match current path to a nav item and apply the active class (3 px accent left-border + surface-alt background). File: `frontend/assets/js/sidebar.js`
- [x] **Create sidebar hamburger script** — Export `initHamburger()`; toggle off-canvas sidebar on click, trap focus while open, close on backdrop click or ESC. Default state: closed on `index.html`, open elsewhere. File: `frontend/assets/js/sidebar_hamburger.js`
- [x] **Create footer script** — Export handlers for "Print", "Copy Contents", and "Copy URL" buttons; Print triggers `window.print()`, Copy Contents uses `document.body.innerText` stripped of nav/footer, Copy URL copies `location.href`. File: `frontend/assets/js/footer.js`
- [x] **Create main JS entry point** — Import and initialise: sidebar, sidebar_hamburger, footer, cookies, analytics, lazy-load, toasts; wire `prefers-reduced-motion` check; wire skip-link focus behaviour. File: `frontend/assets/js/main.js`

## Files touched

- `frontend/assets/images/feather-sprite.svg` — created
- `frontend/assets/images/favicon.svg` — created
- `frontend/assets/images/apple-touch-icon.png` — created
- `frontend/assets/images/site.webmanifest` — created
- `frontend/favicon.ico` — created
- `frontend/robots.txt` — created
- `frontend/sitemap.xml` — created
- `frontend/assets/js/utils/debounce.js` — created
- `frontend/assets/js/utils/storage.js` — created
- `frontend/assets/js/utils/dom.js` — created
- `frontend/assets/js/utils/format.js` — created
- `frontend/assets/js/utils/router.js` — created
- `frontend/assets/js/utils/state.js` — created
- `frontend/assets/js/utils/templates.js` — created
- `frontend/assets/js/utils/analytics.js` — created
- `frontend/assets/js/utils/lazy-load.js` — created
- `frontend/assets/js/utils/toasts.js` — created
- `frontend/assets/js/api.js` — created
- `frontend/assets/js/seo.js` — created
- `frontend/assets/js/cookies.js` — created
- `frontend/assets/js/sidebar.js` — created
- `frontend/assets/js/sidebar_hamburger.js` — created
- `frontend/assets/js/footer.js` — created
- `frontend/assets/js/main.js` — created

## Notes

- No automated tests required: all files are in `frontend/`, not `api/`, `admin/`, or `mcp-server/`. Manual validation checklist covers this plan.
- `api.js` must cover every API route the frontend pages need. Stub any endpoint not yet wired in the API with a TODO comment so pages that call it degrade gracefully.
- The Feather sprite must be generated before any page that references icons is built; all subsequent plans depend on this file.
- `templates.js` uses tagged template literals to escape values — **never** use `innerHTML` directly with data from the API (JS-6). The `html\`...\`` tag is the only safe path for inserting API content into the DOM.
- `main.js` imports all init functions but does not contain logic itself — each concern stays in its own file (SR-1).
- The `site.webmanifest` path referenced in HTML `<link>` tags must match `frontend/assets/images/site.webmanifest`.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
