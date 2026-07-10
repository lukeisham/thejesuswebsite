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
- [ ] JS-2 — the Responses picker/list link is the only place that resolves a challenge's `type`, and it does so from API data, never guessed or inferred; the two challenge sections never guess a type since each talks to only one endpoint.
- [ ] JS-5 — every request goes through `Admin.api.*`; no raw `fetch` in any of the six new pages or the three modified Debate pages.
- [ ] JS-6 — the challenge list/form DOM is built with `createElement`/`textContent`, no `innerHTML` of fetched data.
- [ ] SR-1 — `mergeChallenges` / `Admin.getAllChallenges` is the only new logic added to `admin/assets/js/admin.js`; no unrelated changes bundled into that file. The popular and academic trios are independent files, not a shared component with a type parameter.
- [ ] HTML-3 / HTML-5 — each new page has exactly one `<h1>` (the topbar title) and every form control has a `<label>`.
- [ ] The create/edit payloads only ever include each model's `WRITABLE_COLUMNS` (slug, challenge_title, challenge_summary, challenge_picture, challenge_url_a–d, challenge_rank_number, challenge_rank_pluses, challenge_rank_minuses, published_draft, metadata_keywords) — no stray fields, and `academic_popular` is never sent as a writable field from either section's form (it's set server-side at creation only, per which endpoint is called).

## Validation: Admin Dashboard Content Viewer
**Plan:** admin-dashboard-content-viewer.md
**Date:** 2026-07-07

### Manual checks
- [ ] `admin/index.html` no longer shows the "Site Overview" stat bullet list or the "How This Works" instructions — the Dashboard's only content below the topbar is the content viewer.
- [ ] The Dashboard table lists records from multiple entities (evidence, essays, at least one challenge kind, etc.) with correct Type and Status (Published/Draft) badges, and includes both published and draft rows — not drafts only.
- [ ] Type badges and the Type filter's options show human-readable labels ("Popular Challenge", "Blog Post"), never raw kebab-case types ("popular-challenges", "blog-posts").
- [ ] Typing in the search box filters the table by title with no page reload; clearing it restores the full list.
- [ ] The Type filter narrows to one entity at a time; the Status filter narrows to Published-only / Draft-only; both compose with the search box.
- [ ] Clicking a evidence/essays/responses/historiography/blog-posts/popular-challenges/academic-challenges record's title opens that record's own `edit-[id].html?id=<id>` page with the right id.
- [ ] Clicking a collections record's title opens `collections/index.html` (no id-specific deep link expected).
- [ ] Clicking a resources record's title opens `resources/<list_key>.html` for that record's category.
- [ ] No Wikipedia or News Articles records appear anywhere in the table, the search results, or the Type filter's options — they are excluded entirely, not merely unlinked.
- [ ] Every "Dashboard" sidebar link across the admin panel still returns to `admin/index.html`.
- [ ] Signing in still works — `admin/assets/js/auth.js`'s session check (which pings `GET /drafts`) is unaffected by this plan.

### Code-review checks
- [ ] JS-2 — the title-link mapping function has an explicit branch per known type and a safe fallback for anything unrecognised; no guessed URLs.
- [ ] JS-5 — the dashboard fetch uses `Admin.api.get`, shows a loading state before the fetch and an error state on failure.
- [ ] JS-6 — the table, filter bar, and empty/error states are built with `createElement`/`textContent`; no `innerHTML` of fetched data.
- [ ] HTML-3 — `admin/index.html` still has exactly one `<h1>` (the topbar title); new headings are `<h2>`/`<h3>`.
- [ ] CSS-1 / CSS-2 — the new filter-bar styles are a page-scoped `<style>` block using `--admin-*` tokens, matching `admin/evidence/index.html`'s pattern; no new shared CSS file.
- [ ] The viewer has no edit, publish, unpublish, or delete controls anywhere — title links are the only interactive element per row besides the filters.

## Validation: Wikipedia & Evidence Bulk Upload
**Plan:** wikipedia-and-evidence-bulk-upload.md
**Date:** 2026-07-07

### Manual checks
- [ ] `admin/wikipedia/index.html` shows a "Bulk Upload Articles" collapsible section below the rank list, with a single small, muted caption line (`Title, URL, Rank` per line · saved as draft) directly above a labeled textarea — one line, not a paragraph.
- [ ] Pasting several valid `Title, URL, Rank` lines and clicking Upload creates one Wikipedia article per line at the given `wikipedia_article_rank_number`, all appear in the rank list at the right positions without a page reload as **drafts**, and a summary reports the count added.
- [ ] A pasted Wikipedia line missing the title or the URL, or with a non-numeric rank, is skipped (not created) and counted in the summary, without blocking the other valid lines in the same paste.
- [ ] The existing single "+ Add Article" form still auto-generates the same slug from the title as before (now via the shared helper).
- [ ] `admin/evidence/index.html` shows a "Bulk Upload Evidence" collapsible section below the evidence table, with a single small, muted caption line (`Title, Primary Verse` per line · saved as draft) directly above a labeled textarea — one line, not a paragraph.
- [ ] Pasting several valid `Title, Primary Bible Verse` lines and clicking Upload creates one evidence record per line, all appear in the table without a page reload as **drafts**, each in its correct alphabetical position (not appended at the bottom), and a summary reports the count added.
- [ ] With zero evidence records in the database, `admin/evidence/index.html` still shows the filter bar, the empty-state message, and a working Bulk Upload section — no early return skips them — and a bulk upload from that empty state populates the table in place.
- [ ] A pasted Evidence line missing either the title or the verse is skipped (not created) and counted in the summary, without blocking the other valid lines in the same paste.
- [ ] Every record created by either bulk uploader shows the Draft status badge, never Published, regardless of any other default.

### Code-review checks
- [ ] SR-1 — `Admin.slugify` is defined once in `admin/assets/js/admin.js` and used by the Wikipedia single-add form and both bulk uploaders; no duplicate slugify logic remains in `admin/wikipedia/index.html`.
- [ ] JS-2 — a bulk-upload line missing a required field, or with a non-numeric Wikipedia rank, is skipped and counted, not thrown as an uncaught error; both bulk-create payloads send `published_draft: 0` explicitly.
- [ ] JS-5 — both bulk upload buttons show a saving/progress state and use `Admin.api.post`.
- [ ] JS-6 — the results summaries and list/table re-renders use `createElement`/`textContent`, no `innerHTML` of pasted data.
- [ ] HTML-1 / HTML-5 — both bulk-upload sections use `<details>`/`<summary>`; both textareas have a `<label>`.
- [ ] JS-1 — each caption is the bare format pattern (`Title, URL, Rank` / `Title, Primary Verse`) plus "saved as draft", not a sentence explaining what a slug is or how the parser works.
- [ ] No new API route, model, or database change was introduced — the uploaders call the existing `POST /wikipedia` and `POST /evidence` once per row.

## Validation: Image Upload Pipeline (Admin)
**Plan:** image-upload-pipeline.md
**Date:** 2026-07-08

### Manual checks
- [ ] `node --test admin/tests/admin-insert-image.test.js` passes.
- [ ] On `admin/evidence/new.html`, `admin/essays/new.html`, `admin/historiography/new.html`, `admin/debate/new.html`, and both Blog content textareas, click Insert Image, upload a file, enter a caption — a `[figure src="..." caption="..."]` line is inserted at the cursor in the respective textarea, not appended/prepended regardless of cursor position, and any currently-selected text is replaced rather than left behind.
- [ ] Saving each of the five forms above and viewing its public page renders the inserted figure as a bordered box with a sequential "Fig." number and the caption below it — same visual treatment on all five content types (Evidence, Blog, Essay, Historiography, Response).
- [ ] The public Evidence detail page no longer shows a separate "Pictures" section — only the Description section, with any figures appearing inline where their shortcode was placed in the text.
- [ ] On `admin/blog/new.html`, set a hero image (and alt text) — a separate field from the content-textarea Insert Image button — save, and confirm the public blog post page shows it as the full-width hero image and the page's `og:image` meta tag points to it.
- [ ] On `admin/debate/popular-challenges/new.html` and `admin/debate/academic-challenges/new.html`, the Picture URL text input is replaced by the upload widget; uploading an image and saving stores its `/uploads/...` path in `challenge_picture` and it renders on the public challenge card/detail page.
- [ ] Uploading a file larger than the configured limit, or a non-image file renamed with an image extension, shows an inline error in the widget (via a toast or field error) and does not corrupt the form state.
- [ ] A caption containing a `"` character does not break the inserted shortcode (the resulting `[figure ...]` line still parses correctly on the public page).
- [ ] All new/changed forms remain keyboard-navigable and every new control has a visible label or `aria-label`.

### Code-review checks
- [ ] JS-5 — every upload goes through `Admin.uploadImage`, which itself calls `Admin.api.post`; no raw `fetch()` added to any page script or widget.
- [ ] JS-6 — `admin-insert-image.js` builds DOM nodes via `createElement`/`textContent` for the caption prompt; no `innerHTML` of upload responses or user-typed captions.
- [ ] SR-1 — the single-image picker and the textarea inserter remain two separate files, each with one job; none of the five "Insert Image" forms duplicate the upload/insert logic inline instead of calling `AdminInsertImage`.
- [ ] CSS-1 / CSS-2 — `image-picker.css` and `insert-image.css` use `--admin-*` custom properties only, no hardcoded colors/spacing.
- [ ] HTML-2 — every `<img>` rendered by the new widgets (thumbnails, previews) has a non-empty `alt` or an explicit `alt=""` if purely decorative.
- [ ] `admin/evidence/new.html`/`edit-[id].html` use `AdminInsertImage` exactly like the other four content types — no gallery widget, no `pictures` array in the Evidence create/update payload.
- [ ] `AdminInsertImage`'s `buildShortcode` and `insertAtCursor` are pure functions with no DOM access, matching the `AdminRanking.computeSortOrders` precedent for testable widget logic.

## Validation: Auth Hardening & Smooth Sessions
**Plan:** auth-hardening-and-smooth-sessions.md
**Date:** 2026-07-08

### Manual checks
- [ ] Run the dev proxy and confirm it forwards `/api/*` with the prefix stripped (e.g. `curl -i http://localhost:4174/api/auth/me` returns the API's 401 JSON, not a static 404) — and that bare `/passkey/...` no longer proxies
- [ ] `admin/auth/register.html?setupToken=…` — registration completes end to end through `/api/passkey/register/*` (check DevTools Network: all auth calls hit `/api/...`)
- [ ] `admin/auth/login.html` — sign-in completes through `/api/passkey/login/*`; redirected to the dashboard; `sid` cookie present
- [ ] Click the sidebar **Logout** link from the dashboard — lands on `/admin/auth/login.html?signedout=1` showing "You've been signed out."
- [ ] After logout, navigate directly to `/admin/` — redirected to the login page (session really destroyed, old `sid` rejected)
- [ ] Click Logout from a **nested** page (e.g. `/admin/essays/`) — same correct behaviour, no `/admin/essays/auth/login.html` 404
- [ ] Sign back in immediately after logout — succeeds without clearing cookies or restarting anything
- [ ] Settings → Passkeys: existing credential listed (id excerpt + last-used); "Add a passkey" runs a ceremony and the new credential appears in the list
- [ ] Sign out and sign back in using the newly added passkey
- [ ] Delete a passkey when two exist — row disappears; attempt to delete the last one — inline error "Cannot delete the last credential.", nothing deleted
- [ ] With an expired/invalid session, open any admin page — redirected to the absolute login URL from any directory depth

### Code-review checks
- [ ] JS-5 — no raw `fetch` outside `passkey.js`, `auth.js`, `admin.js`, `admin-credentials.js`; every admin API URL starts with `/api`
- [ ] JS-6 — Logout uses one delegated listener in `auth.js`; no per-page HTML edits; credential list rendered with `textContent`, never `innerHTML` with API data
- [ ] SR-1 — passkey-management logic lives only in `admin-credentials.js`; nothing appended to `admin.js` beyond the redirect fix
- [ ] CSS-1 / CSS-2 — `credential-list.css` styles only the passkey list/button, uses `--admin-*` custom properties only, under 150 lines
- [ ] HTML-4 — new script loaded with `defer` on `admin/settings/index.html`

## Validation: Admin Layout, Timeline Taxonomy Restore & MLA Source Management
**Plan:** admin-layout-timeline-mla-fixes.md
**Date:** 2026-07-08

### Manual checks
- [ ] On every admin page, the topbar page title is fully visible — no text starts underneath the 220px fixed sidebar.
- [ ] Admin tables, card rows, and form grids keep a visible gap before the right viewport edge (no element flush against it).
- [ ] `admin/evidence/new.html`: Timeline Era select shows exactly — None —, Beginning, Middle, End; choosing an era repopulates the Timeline Period select with only that era's periods.
- [ ] `admin/evidence/edit-[id].html`: a saved record re-opens with its stored era and period pre-selected.
- [ ] Creating a new evidence record with era + period chosen saves without "Failed to save evidence".
- [ ] Creating one record of each other type (blog post, news article, essay, historiography, response) saves without error.
- [ ] On all five editors (evidence, essays, historiography, responses/debate, blog), the MLA Bibliography panel appears with the inline-citation hint (e.g. "(Wright 214)").
- [ ] MLA panel: search-attach an existing source, create a new one, edit it inline, detach it — each action reflected after saving and re-opening the record.
- [ ] Saved `mla_source_ids` survive a save round-trip on a non-evidence type (e.g. essay).

### Code-review checks
- [ ] SR-1 — MLA panel logic lives only in `admin-mla-sources.js`; era/period taxonomy only in `admin-timeline-taxonomy.js`; editor pages contain mount/wiring code only
- [ ] JS-5 — MLA panel uses `Admin.api.*` exclusively; no raw `fetch`
- [ ] JS-6 — MLA panel escapes all DB-sourced text (no `innerHTML` with source titles/authors); dynamic rows use event delegation
- [ ] CSS-1 / CSS-2 — `mla-sources.css` styles only the MLA panel, admin tokens only, under 150 lines; grid.css gutter uses `--space-*` tokens
- [ ] CSS-5 — topbar fix is a grid-column change, no `!important`, no added specificity
- [ ] HTML-5 — all MLA panel form controls have `<label>`s; hint text linked via `aria-describedby` where it describes a control

## Validation: Open Issues Cleanup (July 8) — Linked Evidence IDs Wiring
**Plan:** open-issues-cleanup-july8.md
**Date:** 2026-07-08

### Manual checks
- [ ] `admin/debate/new.html` — create a response, enter comma-separated evidence IDs (of records that exist) in "Linked Evidence IDs", save; reload the record via its edit page (or admin API) and confirm the links persisted.
- [ ] `admin/essays/edit-[id].html` — open an essay that already has linked evidence (create one via `new.html` first if none exist) and confirm "Linked Evidence IDs" is pre-populated with the existing IDs, not blank.
- [ ] `admin/essays/edit-[id].html` — add or remove an ID in the field, save, reload — the change persists.
- [ ] Repeat both checks above for `admin/historiography/edit-[id].html`, `admin/debate/edit-[id].html`, and `admin/blog/edit-[id].html`.

### Code-review checks
- [ ] JS-2 — `parseIdList()` in each modified file matches the existing implementation in `admin/essays/new.html` exactly (returns `undefined` for empty input, filters non-numeric entries).
- [ ] SR-1 — no unrelated changes bundled into these five files beyond the `parseIdList()` addition, the `buildPayload()` field, and (on edit pages) the `formGroup()` initial-value fix.
- [ ] Each edit page's `formGroup('Linked Evidence IDs', ...)` initial-value argument reads from `data.links_evidence`, mirroring the adjacent MLA panel's `initialSourceIds: (data.mla_sources || []).map(...)` pattern already in the same file.
- [ ] `admin/debate/new.html`'s "Linked Evidence IDs" input id (`response-evidence`) matches what `buildPayload()` reads — same check for `essay-evidence`, `historiography-evidence`, `response-evidence` (debate edit), and `blog-evidence`.

## Validation: Timeline Era & Period Refactor (Admin)
**Plan:** timeline-era-period-refactor.md
**Date:** 2026-07-09

### Manual checks
- [ ] Open `admin/evidence/new.html` — the Timeline Era `<select>` shows all eight new eras; selecting any era correctly populates the Timeline Period dropdown with only that era's periods.
- [ ] Open `admin/evidence/edit-[id].html` for an existing record — the era select shows the record's current era; changing the era correctly cascades the period dropdown.
- [ ] Open `admin/diagrams/timeline.html` — the admin timeline axis shows eight era bands with correct start positions; dragging an event into a new era zone assigns the correct era.
- [ ] Create a new evidence record with `timeline_era = "PassionWeek"` and `timeline_period = "PassionFridayDeath"` — save succeeds and the admin list table shows the correct era/period.
- [ ] In the admin evidence list, filter by era — the dropdown (or filter UI) shows the eight new era values and filtering works.

### Code-review checks
- [ ] JS-1 — `admin-timeline-taxonomy.js` `ERAS` array matches the eight new era values; `PERIODS_BY_ERA` is grouped per the plan's mapping table.
- [ ] JS-2 — `getEraForPeriod()` returns the correct new era for every period in the 38-period list.
- [ ] JS-2 — `eraForPeriod()` in `timeline-events.js` uses ordinal ranges that match the new era boundaries exactly.
- [ ] `timeline-axis.js` `eraStarts` maps each new era to the correct first-period key.
- [ ] SR-1 — no unrelated changes bundled into the four modified admin JS files.
- [ ] `admin/tests/admin-timeline.test.js` passes all tests after updating era values.
## Validation: Arbor Position Mirroring & WYSIWYG Diagram Editors (Admin)
**Plan:** arbor-timeline-wysiwyg-editors.md
**Date:** 2026-07-10

### Manual checks
- [ ] Open `admin/diagrams/arbor.html` — nodes render as public-style rounded rectangles (title + italic verse) on the parchment dot-grid canvas, not circles; drag a node, reload the page, the node stays where it was dropped (position now server-side, not localStorage).
- [ ] Open `admin/diagrams/timeline.html` — spine, 12px dots, cluster stacking, and accent era labels visually match `frontend/evidence/timeline/index.html`; dragging an event still snaps to a period and persists.
- [ ] With devtools → Application → Local Storage: legacy `arbor` position keys are migrated to the server and cleared on first editor load.

### Code-review checks
- [ ] JS-5 — all persistence in `update-record.js` goes through `Admin.api.*` with async/await + try/catch; no localStorage position store remains.
- [ ] JS-6 — node/label text set via `textContent`/`createElementNS`, never `innerHTML` with record data.
- [ ] CSS-2 — `arbor-canvas.css` and `timeline-canvas.css` reference public design tokens (`--bg-primary`, `--border`, `--accent`, `--border-strong`); no hardcoded parchment hex values.
- [ ] CSS-1 — each admin-diagrams CSS file stays under 150 lines after the restyle.
- [ ] `node --test admin/tests/*.test.js` passes, including the new timeline mirror-consistency assertions (period ordering matches frontend `TIMELINE_PERIODS`; periodToX/xToPeriod round-trip).

## Validation: Open Issues Cleanup (Admin)
**Plan:** open-issues-cleanup.md
**Date:** 2026-07-10

### Manual checks
- [ ] `admin/essays/index.html` lists a draft essay (create one via the New form, don't publish) with a Draft status badge alongside published essays.
- [ ] `admin/blog/index.html` lists a draft blog post the same way.
- [ ] Both pages redirect to login when the session is expired (401 handling unchanged).

### Code-review checks
- [ ] JS-5 — all requests go through `Admin.api.get(...)`; no raw `fetch` added.
- [ ] The dead `?published_draft=0` query fetch is fully removed from `admin/essays/index.html`.

## Validation: Maps Visual Parity Refactor (Admin)
**Plan:** maps-visual-parity-refactor.md
**Date:** 2026-07-10

### Manual checks
- [ ] `/admin/diagrams/maps.html` shows a holding pen above the canvas listing chips for evidence with `map_location` set but no pin on the selected map (drafts included).
- [ ] Dragging a chip onto the map stages a pin (dashed/staged style) at the drop point; the chip leaves the pen; nothing is POSTed yet (network tab quiet).
- [ ] Dragging an existing pin stages a move (no immediate PUT); Save button shows an unsaved-changes count.
- [ ] Clicking Save persists all staged creates/moves in one pass; partial failures are listed explicitly; button disabled while saving.
- [ ] Navigating away or switching maps with staged changes prompts a confirmation.
- [ ] Side-by-side with `/evidence/maps/<key>.html`: identical base SVG, pin size/colour/label/tooltip; only differences are pen, Save, and admin chrome.
- [ ] Hovering an admin pin no longer shifts it ~8px (hover transform fix).

### Code-review checks
- [ ] SR-1 — holding pen, staged-changes store, and pen CSS each in their own new file.
- [ ] JS-2 — batch Save surfaces per-item errors; drop targets validated.
- [ ] JS-5 — all admin fetches via `Admin.api.*`; no raw fetch.
- [ ] JS-6 — drag listeners delegated and removed on teardown.
- [ ] CSS-2 — era pin colours reference the shared `--era-*` tokens, values identical to the frontend's.
- [ ] HTML-5 — chips and Save are real labelled `<button>`s.

## Validation: Arbor Visual Parity Refactor (Admin)
**Plan:** arbor-visual-parity-refactor.md
**Date:** 2026-07-10

### Manual checks
- [ ] `/admin/diagrams/arbor.html` shows a holding pen listing chips (title + Draft/Published badge) for evidence with no `arbor_nodes` row, drafts included.
- [ ] Dragging a chip onto empty canvas creates the node at the drop point and auto-saves it (one PUT `/arbor/nodes/:id` in the network tab); the chip leaves the pen.
- [ ] Dragging a chip or node **onto another node** creates/updates the connecting edge automatically (`source_id` = the drop-target parent) using the toolbar's relationship type, and the node panel's read-only Parent row shows the new parent.
- [ ] Re-dropping a node onto a different parent re-points its existing incoming edge instead of duplicating it; `related` edges are left alone.
- [ ] "Add Edge" mode actually draws a line from mousedown-on-node to mouseup-on-node and persists it (previously dead).
- [ ] Dragging an existing node auto-saves its new position; on API failure the node reverts with an error toast.
- [ ] Moving a **published** node updates `/evidence/arbor.html` immediately; a **draft** node's placement is saved but never appears publicly.
- [ ] Publishing a placed draft evidence record from its evidence page makes it appear on the public arbor at its placed position; there are no Save or Publish buttons on the arbor editor itself.
- [ ] Side-by-side with `/evidence/arbor.html`: identical dot-grid, node size/fill/border/shadow, root and related variants, edge stroke/dash; only differences are pen, Draft badges, and admin chrome.

### Code-review checks
- [ ] SR-1 — `arbor-pen.js` and `arbor-pen.css` are each new single-purpose files.
- [ ] JS-2 — auto-save surfaces errors (toast + revert); drop hit-testing validates targets; edge auto-creation reuses `validateConnection`.
- [ ] JS-5 — all HTTP via `Admin.api.*` / `UpdateRecord`; loading + error states on auto-save and pen fetch.
- [ ] JS-6 — document-level drag listeners removed on mouseup; no `innerHTML` with evidence titles.
- [ ] CSS-1/CSS-2 — pen CSS under 150 lines; node/edge colours match the public `arbor.css` token values.
- [ ] HTML-1/HTML-5 — pen is a labelled landmark; chips are real labelled `<button>`s.
- [ ] API — `/arbor/admin/unplaced` mounted before `GET /arbor/:id`; `api/tests/arbor-nodes.test.js` covers unplaced filtering and draft visibility.
