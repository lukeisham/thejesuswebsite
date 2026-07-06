## Tests: Auth Admin Pages
**Plan:** auth-admin-pages.md
**Date:** 2026-06-24

### Manual checks
- [ ] Open `admin/auth/register.html?setupToken=test123` — page loads with a centered card, heading, button, and status area
- [ ] Click "Register Passkey" — browser prompts for Touch ID / Windows Hello / security key
- [ ] Complete the WebAuthn ceremony — page shows "Registration successful" with a link to `admin/auth/login.html`
- [ ] Click the link — navigates to login page
- [ ] Open `admin/auth/login.html` — page loads with a centered card, heading, "Sign in with Passkey" button
- [ ] Click "Sign in with Passkey" — browser prompts for authentication
- [ ] Complete the ceremony — page redirects to `admin/index.html` (which doesn't exist yet — expect a 404 from the server, but the redirect itself should fire)
- [ ] DevTools → Application → Cookies — `sid` cookie is set after successful login
- [ ] Resize both pages to 360px width — card remains centered and readable, buttons are at least 44px tall
- [ ] Resize to 1280px — card max-width is respected, doesn't stretch to fill the viewport
- [ ] Open `register.html` without `?setupToken=` — API returns 404, page shows "Registration is no longer available"

### JS / HTML / SQL checks
- [ ] No `innerHTML` with user data (JS-6) — all status messages use `textContent`
- [ ] All `<img>` tags have `alt` attributes (HTML-2) — if any exist
- [ ] One `<h1>` per page (HTML-3) — register.html and login.html each have exactly one
- [ ] CSS values reference custom properties, not hardcoded values (CSS-2) — use `--admin-*` tokens
- [ ] Scripts loaded with `defer` or at end of `<body>` (HTML-4)
- [ ] `register.html` uses `<main>` as the primary container (HTML-1)
- [ ] `login.html` uses `<main>` as the primary container (HTML-1)
- [ ] `passkey.js` isolates all WebAuthn logic — no `navigator.credentials` calls in HTML files
- [ ] `passkey.js` guards `getPublicKey()` with `instanceof AuthenticatorAttestationResponse`
- [ ] `passkey.js` uses `async/await` + `try/catch` for all fetch calls (JS-5)
- [ ] Both CSS files are under 150 lines (CSS-1)
- [ ] Error states are shown in the status area, not as `alert()` popups
- [ ] Run `cd admin && node --test tests/passkey.test.js` — all tests pass

---

## Validation: Maps (Admin)
**Plan:** maps-admin.md
**Date:** 2026-06-29

### Manual checks
- [ ] `admin/diagrams/maps.html` loads inside the admin shell (sidebar + top bar); the map-scale dropdown lists the five maps
- [ ] Selecting a map loads its background image into the canvas and renders existing pins
- [ ] "Add Pin" then clicking the map places a new pin at the clicked location
- [ ] Dragging a pin repositions it; on drop the new `x`/`y` percentage persists (PUT /maps/pins/:id)
- [ ] Editing a pin's label and linked evidence saves; deleting a pin removes it (DELETE /maps/pins/:id) and its listener
- [ ] Switching maps tears down the previous map's pin listeners (no leaks / duplicate handlers)
- [ ] A pin with no linked evidence (label only) saves successfully
- [ ] API failure shows an error in the status area / toast, not an `alert()`

### JS / HTML / SQL checks
- [ ] Run `cd admin && node --test tests/maps.test.js` — coordinate-mapping helper tests pass
- [ ] Coordinate helpers in `maps-render.js` are pure, DOM-free, and exported (testable without a browser)
- [ ] JS-5 — all pin persistence uses `async/await` + `try/catch`
- [ ] JS-6 — pin/canvas events delegated; drag listeners removed on delete / map switch; no `innerHTML` with data
- [ ] SR-1 — `maps-render.js` / `maps-pins.js` / `maps-regions.js` separated by concern
- [ ] HTML-1 — `<main>` wraps the canvas; HTML-3 — one `<h1>`; HTML-4 — scripts `defer`red
- [ ] HTML-5 — pin-edit panel controls each have a `<label>`; errors via `aria-describedby`
- [ ] CSS-1 — `admin-diagrams/maps.css` under 150 lines; CSS-2 — uses `--admin-*` tokens
- [ ] Depends on the maps pin API (maps-api.md) being live; depends on the shared admin shell existing (see Issues.md)

---

## Validation: Admin Foundation
**Plan:** admin-foundation.md
**Date:** 2026-06-29

### Manual checks
- [ ] `admin/index.html` loads inside the shell (220px sidebar + top bar); the 4 stat cards show real counts
- [ ] The recent-drafts table renders rows with a published/draft status badge and an Edit link
- [ ] Visiting any admin page while signed out redirects to `admin/auth/login.html` (401 from `/auth/me`)
- [ ] `admin/settings/index.html` loads the site-metadata form pre-filled, saves successfully, and shows a confirmation
- [ ] `admin/analytics.html` renders the date-range chips; changing the range refreshes all panels
- [ ] Sparklines render as inline SVG `<polyline>` next to the top pages (no charting library loaded)
- [ ] Sidebar active item shows the 3px left-border highlight; sidebar is always visible (no hamburger)
- [ ] Resize to 1024px — the two-panel shell holds; main content scrolls independently

### Code-review checks
- [ ] Run `cd admin && node --test tests/admin.test.js` — foundation helper tests pass
- [ ] SR-1 — `auth.js`, `admin.js`, `analytics.js` are separate; pure helpers exported for tests
- [ ] JS-5 — all loads use `async/await` + `try/catch` with loading + error states
- [ ] JS-6 — cached DOM queries, event delegation, no `innerHTML` with API data
- [ ] HTML-1 — `<nav>`/`<main>`/`<header>` shell semantics; HTML-3 — one `<h1>` per page; HTML-4 — CSS in head, scripts deferred
- [ ] HTML-5 — settings form controls each have a `<label>`; errors via `aria-describedby`
- [ ] CSS-1 — each admin sheet under 150 lines; CSS-2 — `--admin-*` tokens only; CSS-5 — single low-specificity selectors, no `!important`
- [ ] `admin.css` imports base → layout → components → pages in cascade order

---

## Validation: Admin Content Management
**Plan:** admin-content-management.md
**Date:** 2026-06-29

### Manual checks
- [ ] Each list page (drafts, evidence, collections, wikipedia, essays, debate, blog, news) loads its table from the API
- [ ] Evidence list filters by category / era / status; results update
- [ ] New + edit forms (drafts, evidence, essays, debate, blog) save via POST/PUT and show confirmation
- [ ] Evidence edit cascades timeline era → period and accepts map x/y, related links, MLA sources
- [ ] `admin/evidence/bulk.html` bulk publish/unpublish/delete works; delete shows a confirmation modal
- [ ] `admin/resources/index.html` category selector switches lists; rows reorder by drag and persist
- [ ] `admin/wikipedia/index.html` ranked list reorders by drag; new rank order persists
- [ ] `admin/news/index.html` "Add Article" opens the modal form and saves a link entry

### Code-review checks
- [ ] Run `cd admin && node --test tests/admin-ranking.test.js` — reorder/sort_order helper tests pass
- [ ] SR-1 — `admin-ranking.js` is a single drag-to-rank concern; pages reuse `admin.js` CRUD helpers, no duplicated fetch
- [ ] JS-2 — destructive bulk actions confirmed; 401 redirects; 4xx/5xx surfaced
- [ ] JS-5 / JS-6 — async/await + try/catch; delegated row/handle events; drag listeners removed on delete; no `innerHTML` with content
- [ ] HTML-1/3/4/5 — table/form semantics, one `<h1>`, deferred scripts, labelled controls
- [ ] CSS-1/CSS-2 — reuses foundation component sheets; any new page CSS under 150 lines using `--admin-*` tokens
- [ ] Resources consolidation matches the frontend `list.html` pattern (see Issues.md)

---

## Validation: Admin Diagram Editors
**Plan:** admin-diagram-editors.md
**Date:** 2026-06-29

### Manual checks
- [ ] `admin/diagrams/arbor.html` loads the canvas; "Add Node" search-to-add places an evidence node
- [ ] Dragging an arbor node repositions it and the new position persists (via update-record.js)
- [ ] Click-drag between two nodes creates an edge; self-edges and duplicate edges are rejected
- [ ] `admin/diagrams/timeline.html` loads the axis + era bands; events drag along the axis and persist
- [ ] Clicking a timeline event opens the edit panel (title, date, era) and saves
- [ ] Zoom in/out + pan work on both editors; switching away tears down drag listeners (no leaks)

### Code-review checks
- [ ] Run `cd admin && node --test tests/admin-arbor.test.js tests/admin-timeline.test.js` — pure helper tests pass
- [ ] Coordinate / scale / edge-validation helpers are pure, DOM-free, and exported
- [ ] JS-2 — edge connection + event date validation before persist; never fails silently
- [ ] JS-5 / JS-6 — async/await + try/catch via `update-record.js`; delegated canvas events; listeners removed on delete; no `innerHTML` with data
- [ ] SR-1 — each editor split into canvas/items/connections-or-zoom files; shared write helper in `update-record.js`
- [ ] HTML-1/3/4/5 — `<main>` canvas, one `<h1>`, deferred scripts, labelled edit-panel controls
- [ ] CSS-1/CSS-2/CSS-4 — `admin-diagrams/arbor.css` + `timeline.css` under 150 lines, `--admin-*` tokens, semantic classes (mirror `maps.css`)
- [ ] Arbor edge rules match the schema (`relationship_type` enum, UNIQUE source/target, no self-edge)

---

## Validation: CSS Vibe Coding Rule Compliance
**Plan:** css-vibe-compliance.md
**Date:** 2026-06-30

### Manual checks
- [ ] All admin CSS files under 150 lines: run `find admin/assets/css -name '*.css' -exec wc -l {} + | awk '$1 > 150'` → zero results
- [ ] No hardcoded hex values in admin CSS (excluding `variables.css`): run `grep -rn '#[0-9a-fA-F]{3,6}' admin/assets/css/ --include='*.css' | grep -v variables.css | grep -v print.css` → zero results (or only acceptable `#fff` in comments)
- [ ] Admin diagrams: open `arbor.html`, `timeline.html`, `maps.html` — all render identically to before the split; no styling regressions
- [ ] Admin auth: open `login.html` and `register.html` — both render identically (card centred, button full-width, status colours unchanged)
- [ ] Admin `admin.css` imports all new split diagram files in correct cascade order
- [ ] Admin `analytics.css` and existing component sheets (`buttons.css`, `tables.css`, etc.) still render correctly after token updates

### Code-review checks
- [ ] CSS-1 — All admin CSS files under 150 lines including new split files
- [ ] CSS-2 — `admin-base/variables.css` has all tokens needed (`--admin-canvas-bg`, `--admin-error-color`, `--admin-error-bg`, `--admin-error-border`, `--admin-success-color`, `--admin-success-bg`, `--admin-success-border`, `--admin-accent-text`, `--admin-selected-color`, `--admin-draft-bg`, `--admin-draft-color`)
- [ ] CSS-2 — No hardcoded `#fafbfc`, `#fff`, `#8b3d3d`, `#fdeded`, `#f0c0c0`, `#e94560`, `#c0392b`, `#e74c3c` in any admin diagram CSS
- [ ] CSS-2 — `login.css` and `register.css` use `@import` or inherit `--admin-*` tokens instead of defining their own `:root` block
- [ ] CSS-2 — `admin-components/buttons.css` uses `--admin-danger` for danger button hover, not `#c82333`
- [ ] CSS-2 — `admin-components/tables.css` uses admin tokens for draft badge, not raw hex
- [ ] CSS-3 — Mobile queries remain in the same file as the component they style (diagram canvas files carry their own responsive blocks)
- [ ] CSS-4 — New split files use kebab-case consistent with existing admin BEM conventions
- [ ] CSS-5 — No `!important` added; no ID selectors introduced
- [ ] CSS-6 — New split files have banner comment headers following the existing admin style

---

## Validation: JS Vibe Coding Rule Compliance
**Plan:** js-vibe-compliance.md
**Date:** 2026-06-30

### Manual checks
- [ ] Admin maps: open `admin/diagrams/maps.html` — map selector populates with all 5 maps, selecting a map loads its pins, pin CRUD (create/edit/delete/drag) works, error messages appear on API failure
- [ ] Admin arbor: open `admin/diagrams/arbor.html` — adding nodes via search dialog works, edge creation between nodes works
- [ ] Admin timeline: open `admin/diagrams/timeline.html` — events render, edit panel opens on click, add/search works
- [ ] Admin analytics: open `admin/analytics.html` — stats cards, page views table, and referrers table render correctly
- [ ] Console check: open DevTools on all four pages — no `var`-related syntax errors, no `fetch` double-encoding, no uncaught errors

### Code-review checks
- [ ] JS-3 — Run `grep -rn '\bvar\b' admin/assets/js --include='*.js'` → zero results
- [ ] JS-5 — Run `grep -rn 'fetch(' admin/assets/js/admin-maps --include='*.js'` → zero results (except comments)
- [ ] JS-5 — `maps-pins.js` and `maps-regions.js` use `Admin.api.get/post/put/del` only
- [ ] JS-2 — Error handling preserved: existing `catch (e) { console.error(...); showError(e.message); }` blocks still catch errors from `Admin.api`
- [ ] SR-1 — Files remain single-concern (no structural changes, only inline refactoring)

### Automated tests
- [ ] Run `cd admin && node --test tests/maps.test.js` — all tests pass
- [ ] Run `cd admin && node --test tests/admin-arbor.test.js tests/admin-timeline.test.js` — all tests pass

---

## Validation: Fix Admin Analytics Dashboard (Admin Frontend)
**Plan:** fix-admin-analytics-dashboard.md
**Date:** 2026-07-02

### Manual checks
- [ ] Open `admin/analytics.html` while signed in — the page no longer shows a "Request failed (404)" error; stat cards, page-views table, and referrers table all render
- [ ] The chip row above the content now reads "Last 7 days" / "Last 30 days" / "Last 90 days" (not "Today" / "7 Days" / "30 Days"); "Last 30 days" is active by default
- [ ] Clicking a different chip re-fetches and re-renders all three sections with data for that range
- [ ] Sparklines render next to the top 5 pages in the page-views table
- [ ] Referrers table shows non-zero visit counts and percentages when referrer data exists
- [ ] Disconnect the API (stop the server) and reload — the error state renders as plain text, not broken/escaped markup
- [ ] View source / inspect the error state element — confirm it was set via `textContent`, not string-concatenated `innerHTML`

### Code-review checks
- [ ] JS-6 — `AdminAnalytics.render`'s catch block no longer concatenates `err.message` into `innerHTML`
- [ ] JS-5 — the date-range fetch still uses `Admin.api.get` with `async/await` + `try/catch`
- [ ] Chip click handlers are delegated / cleaned up, not re-bound on every render (no listener leak)
- [ ] CSS for the new chip row reuses existing chip/badge tokens (`--admin-*`), no hardcoded colors (CSS-2)

---

## Validation: Journal Article Metadata Columns (Admin Forms)
**Plan:** journal-article-metadata-columns.md
**Date:** 2026-07-02

### Manual checks
- [ ] Open `admin/essays/edit-[id].html` for an existing essay — "Two-Column Layout" checkbox, "DOI / Citation" input, and "Author Bio" textarea all appear in the metadata card, pre-filled from existing data (or blank/unchecked if none)
- [ ] Check the box, fill DOI + bio, click Save — reload the page and confirm all three persisted
- [ ] Repeat on `admin/debate/edit-[id].html` for an existing response
- [ ] Leave all three blank/unchecked and save — no error, `two_column` stored as `0`, `doi`/`author_bio` stored as empty/NULL
- [ ] Confirm there is still no way to reach a working historiography edit form from `admin/drafts/index.html` (expected — tracked separately, not part of this plan)

### Code-review checks
- [ ] New fields use the existing `formGroup()` helper / checkbox pattern — no new one-off form-building code
- [ ] `buildPayload()` includes `two_column` as a boolean/0-1 (matching how `published_draft` is already sent), not as a string
- [ ] HTML-5 — each new field has a proper `<label>`, consistent with the existing metadata card fields

---

## Validation: Markup Corruption Cleanup (Admin)
**Plan:** markup-corruption-cleanup.md
**Date:** 2026-07-02

### Manual checks
- [ ] View source on all 17 fixed admin pages (`admin/blog/edit-[id].html`, `admin/blog/index.html`, `admin/blog/new.html`, `admin/debate/edit-[id].html`, `admin/debate/index.html`, `admin/debate/new.html`, `admin/essays/edit-[id].html`, `admin/essays/index.html`, `admin/essays/new.html`, `admin/news/index.html`, `admin/resources/external-witnesses.html`, `admin/resources/internal-witnesses.html`, `admin/resources/objects.html`, `admin/resources/ot-verses.html`, `admin/resources/parables.html`, `admin/resources/people.html`, `admin/wikipedia/index.html`) — each `<title>` reads as a single clean sentence, no visible `</title>` fragments anywhere in the tag soup
- [ ] Browser tab title on each fixed page matches its intended text exactly (spot-check against the "correct" text in the plan)
- [ ] Each fixed page's stylesheet and auth/admin scripts still load (Network tab: 200 on `admin.css`, `auth.js`, `admin.js`/`admin-ranking.js` as applicable) — confirms the `<link>`/`<script>` tag repairs didn't break the tag itself
- [ ] `admin/resources/people.html` — both `<script>` tags (auth.js, admin.js) still execute (check DevTools console for the expected admin-ranking behavior on that page)
- [ ] `admin/resources/ot-verses.html` — the affected CSS rule (`color: var(--admin-text-muted)`) still applies correctly (inspect the relevant muted-text element)

### Code-review checks
- [ ] Every fixed line has exactly one occurrence of the tag that was duplicated/spliced (grep the specific fixed file for the tag name to confirm no residual duplicate)
- [ ] No fix accidentally removed or altered adjacent, unrelated markup — diff each file against its pre-fix version and confirm the change is minimal (ideally single-line)
- [ ] Re-run the plan's detection sweep (see its Verification task) — zero hits across all `admin/*.html` files

## Validation: Historiography Admin Editor
**Plan:** historiography-admin-editor.md
**Date:** 2026-07-03

### Manual checks
- [ ] `admin/historiography/index.html` lists existing historiography items (from `GET /historiography`), with loading, empty, and error states, and a working "New" button.
- [ ] `admin/historiography/new.html` creates an item (`POST /historiography`) — including `two_column`, `doi`, `author_bio` — and redirects to its edit page.
- [ ] `admin/historiography/edit-[id].html` loads via `GET /historiography/admin/:id`, saves edits via `PUT /historiography/:id`, and the DOI / Author Bio / two-column fields round-trip correctly.
- [ ] Delete on the edit page removes the item (`DELETE /historiography/:id`) and returns to the listing.
- [ ] Publish/unpublish from the edit page flips the item and (un)generates its static `/debate/historiography/{slug}` page.
- [ ] All historiography admin requests require a session (401 when logged out) — same guard as the essays editor.
- [ ] From the drafts list, a `historiography` draft's edit link opens `admin/historiography/edit-[id].html?id=<id>` (not the essays editor), and a `responses` draft opens `admin/debate/edit-[id].html?id=<id>`.
- [ ] The admin sidebar shows a "Historiography" link that reaches the listing, and it appears consistently on the pages where the sidebar was updated.
- [ ] `setup/Style_guide.md` documents the historiography *listing* page pattern (ranked-list cards) vs. the `journal.css` detail pages.

### Code-review checks
- [ ] JS-2 — `draftEditUrl` routes `responses` → debate editor and `historiography` → historiography editor; no type points at an editor wired to a different entity's API.
- [ ] JS-5 — every request uses the shared `Admin.api` helper; loading/error states are shown around fetches.
- [ ] JS-6 — the form is built without `innerHTML`-ing user data (mirrors the essays editor).
- [ ] JS-1 / JS-3 — pages mirror `admin/essays/` structure with `essay-*`→`historiography-*` and `/essays`→`/historiography`; no divergent pattern introduced.
- [ ] HTML-3 — exactly one `<h1>` per new page; HTML-5 — every form control has a label.
- [ ] The create/edit payload sends only the historiography model's writable columns (`two_column`, `doi`, `author_bio`, etc.) — no stray fields.

## Validation: Challenge Admin Page
**Plan:** challenge-admin-page.md
**Date:** 2026-07-06

### Manual checks
- [ ] `admin/debate/popular-challenges/index.html` lists only popular challenges (Title, Rank, Status badge, Edit link); loading/empty/error states behave like the Debate Responses list.
- [ ] `admin/debate/academic-challenges/index.html` lists only academic challenges, same layout as the popular list, independently of it.
- [ ] "+ New Popular Challenge" / "+ New Academic Challenge" open each section's own `new.html`; saving posts to `POST /api/popular-challenges` or `POST /api/academic-challenges` respectively (check the Network tab) and redirects to that section's `edit-[id].html?id=<id>`.
- [ ] Publish on either edit page flips `published_draft` and generates the static page at `/debate/popular-challenges/<slug>` or `/debate/academic-challenges/<slug>` accordingly (confirm the file exists / the URL loads). Unpublish removes it.
- [ ] Delete on either edit page removes the challenge (`DELETE /api/popular-challenges/:id` or `/api/academic-challenges/:id`) and returns to that section's own list — not the other section's.
- [ ] Every challenge admin request requires a session — visiting any of the six pages while logged out redirects to `auth/login.html`.
- [ ] The admin sidebar shows both a "Popular Challenges" link and an "Academic Challenges" link on every page that has a sidebar, immediately after "Debate", each going to its own section.
- [ ] On the Debate Responses list (`admin/debate/index.html`), the Challenge column shows the linked challenge's title (not a bare `Challenge #12`) and clicking it opens the correct section's edit page (popular vs. academic) for that challenge.
- [ ] On both `admin/debate/new.html` and `edit-[id].html`, the "Challenge" field is a dropdown listing every challenge from **both** sections as `"{title} ({type})"`, and on the edit page the current challenge is pre-selected.
- [ ] Creating/editing a popular challenge never appears in the academic list (and vice versa) — the two collections stay fully separate.

### Code-review checks
- [x] JS-2 — the Responses picker/list link is the only place that resolves a challenge's `type`, and it does so from API data, never guessed or inferred; the two challenge sections never guess a type since each talks to only one endpoint.
- [x] JS-5 — every request goes through `Admin.api.*`; no raw `fetch` in any of the six new pages or the three modified Debate pages.
- [x] JS-6 — the challenge list/form DOM is built with `createElement`/`textContent`, no `innerHTML` of fetched data.
- [x] SR-1 — `mergeChallenges` / `Admin.getAllChallenges` is the only new logic added to `admin/assets/js/admin.js`; no unrelated changes bundled into that file. The popular and academic trios are independent files, not a shared component with a type parameter.
- [x] HTML-3 / HTML-5 — each new page has exactly one `<h1>` (the topbar title) and every form control has a `<label>`.
- [x] The create/edit payloads only ever include each model's `WRITABLE_COLUMNS` (slug, challenge_title, challenge_summary, challenge_picture, challenge_url_a–d, challenge_rank_number, challenge_rank_pluses, challenge_rank_minuses, published_draft, metadata_keywords) — no stray fields, and `academic_popular` is never sent as a writable field from either section's form (it's set server-side at creation only, per which endpoint is called).
