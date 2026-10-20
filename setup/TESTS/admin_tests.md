## Validation: Settings Passkey Management UI
**Plan:** settings-passkey-ui-verification.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `admin/settings/index.html` in a browser via dev-proxy, sign in, and confirm the Passkeys section renders below the settings form
- [ ] Confirm "Add a Passkey" button is present and clickable
- [ ] Confirm existing passkeys are listed with credential ID excerpt and last-used date
- [ ] Confirm "Remove" button appears on each credential row (hidden if only 1 credential exists)
- [ ] Confirm adding a passkey triggers the WebAuthn ceremony and refreshes the list
- [ ] Confirm removing a passkey shows a confirm dialog and refreshes the list

### Code-review checks
- [ ] JS-5 — `admin-credentials.js` calls `Admin.api.*` only, no raw `fetch()`
- [ ] JS-6 — `admin-credentials.js` uses `textContent` for all API data, never `innerHTML`
- [ ] CSS-2 — `credential-list.css` uses only `--admin-*` custom properties
- [ ] CSS-1 — `credential-list.css` is under 150 lines (94 lines)
- [ ] HTML-4 — Settings page loads all scripts with `defer`, CSS in `<head>`

---

## Validation: Analytics Refactor — Devices Table, External Referrals, Search Terms & Bot Detection
**Plan:** analytics-refactor-devices-referrals-bots.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `admin/analytics.html` — the Devices section now shows a single table with Category/Value/Count/% columns (not 3 separate cards)
- [ ] Confirm Devices table has group-header rows "Device Type", "Browser", "OS" separating the categories
- [ ] Confirm the Referrers section is titled "External Referrers" and only shows domains outside `thejesuswebsite.org`
- [ ] Confirm a "Search Terms" section appears when search-term data exists, with a Search Term/Visits/% table
- [ ] Confirm a "Bot Traffic" section shows human vs. bot counts (or "No bot traffic detected" if none)
- [ ] Confirm all three time-range chips (7/30/90 days) still filter correctly and update every section
- [ ] Visit the site from a real external IP in production — confirm `country` is populated in analytics rows (requires GeoLite2 import)
- [ ] Visit from a search engine result — confirm `search_terms` is populated in the analytics row
- [ ] Run `cd api && node scripts/import-geoip.js` — confirm it imports ~400K rows into `geoip_blocks` without errors

### Code-review checks
- [ ] JS-2 — Bot detection and search-term parsing in `ua-parser.js` are wrapped in the route's try/catch so they never block page-view recording
- [ ] JS-6 — `analytics.js` new render functions use `textContent` for dynamic data, never `innerHTML`
- [ ] JS-5 — All new admin fetches use `Admin.api.get()`, no raw `fetch()`
- [ ] CSS-2 — New analytics CSS classes use only `--admin-*` custom properties
- [ ] CSS-1 — `analytics.css` stays under 150 lines after additions
- [ ] SR-2 — No new npm dependencies introduced

## Validation: Admin Maps Editor Script Includes Fix
**Plan:** admin-maps-editor-script-includes-fix.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `https://thejesuswebsite.org/admin/diagrams/maps.html` fresh (cleared cache / private window): map selector populates, base map renders, no `ReferenceError: Admin is not defined` in the console.
- [ ] Holding pen loads real content or a real empty state — never stuck on "Loading unplaced evidence…".
- [ ] If `window.Admin` is artificially removed, the canvas shows a visible error message, not a permanent "Loading map…".

### Code-review checks
- [ ] HTML-4 — `admin.js` and `admin-http.js` load with `defer`, before the `admin-maps/*` module scripts, matching `timeline.html`'s order.
- [ ] JS-2 — bootstrap guard fails loudly (visible error) when `Admin` is missing.
- [ ] `admin/tests/diagram-page-includes.test.js` asserts includes on all three diagram editor pages and passes under `node --test`.

## Validation: Maps Pin Content Placement
**Plan:** maps-pin-content-placement.md
**Date:** 2026-07-11

### Manual checks
- [ ] Every pin was entered via lat/lng fields (geo-anchored), and each map's pins land on the correct drawn features in the admin canvas.
- [ ] All five public map pages show pins with era colours; hover tooltips and click-through to evidence pages work.
- [ ] Bethany has no pin on the Jerusalem map — only the off-map edge arrow + km label.
- [ ] Draft-linked pins show the draft indicator in admin and are hidden on the public pages.

### Code-review checks
- [ ] JS-2 — no pin stored with out-of-bounds or null coordinates; API rejected nothing unexpectedly during placement.
- [ ] Any bug found in the frontend pin-fetch path was logged to `setup/Issues.md`, not silently patched in this content plan.

---

## Validation: Evidence Production Bug Fixes (Admin)
**Plan:** evidence-production-bug-fixes.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `admin/evidence/index.html` — the evidence list shows both published and draft items. Draft items show the draft status badge.
- [ ] Create a new draft evidence item (Save Draft) — it appears in the admin list immediately.
- [ ] Publish the draft — the status badge changes to "Published".

### Code-review checks
- [ ] JS-5 — admin list fetches from `Admin.api.get("/evidence/admin")` (the new admin endpoint), not the public `/evidence`.
- [ ] The admin list sort/filter/render logic handles items without a `thumbnail_path` field.

---

## Validation: Evidence Schema & Route Hardening (Admin)
**Plan:** evidence-schema-route-hardening.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `admin/evidence/new.html` — the form includes an "Identifier IDs" input field and a "Context Essay IDs" input field in the Map & Metadata card.
- [ ] Fill in identifier IDs (comma-separated), submit as draft — the edit form loads with those identifiers pre-populated.
- [ ] Fill in context essay IDs, submit — the edit form loads with those context links pre-populated.
- [ ] Open `admin/evidence/edit-[id].html?id=N` — both new fields appear and show existing data.

### Code-review checks
- [ ] HTML-5 — new form controls have proper `<label>` elements and `aria-describedby` error spans.
- [ ] JS-2 — `parseIdList()` handles empty input, whitespace, and non-numeric values correctly (already used for linked evidence).
- [ ] Both `new.html` and `edit-[id].html` `buildPayload()` functions include `identifier_ids` and `link_context_ids`.

---

## Validation: Evidence Pagination & Admin UX (Admin)
**Plan:** evidence-pagination-and-admin-ux.md
**Date:** 2026-07-11

### Manual checks
- [ ] Sign into the admin panel, then delete the `sid` cookie — navigate to any admin page; it should redirect to `auth/login.html` (not show a generic error).
- [ ] The login page itself does NOT redirect (no infinite loop).
- [ ] A genuine network error (stop the API server) still shows the friendly "Could not reach the server" message.

### Code-review checks
- [ ] JS-2 — `AdminHttp.request` checks `response.status === 401` before the catch block for network errors.
- [ ] JS-2 — the 401 redirect guard excludes the login page pathname to prevent loops.
- [ ] `admin/tests/admin-http.test.js` has a test for the 401 redirect behaviour.

---

## Validation: Arbor Editor — Click-and-Drag & Dot-Grid (Admin)
**Plan:** arbor-editor-click-drag.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open the authenticated arbor editor (`/diagrams/arbor.html`, local dev-bypass): the parchment **dot-grid** is visible and fills a **full-height** canvas (not a ~150px strip).
- [ ] No `Add Node` / `Add Edge` / relationship-type toolbar is present; the top bar ("Arbor Editor") remains.
- [ ] Zoom **in / out** controls are present (bottom-right, mirroring the public viewer); there is **no** `Reset` button; scroll-wheel zoom and drag-to-pan still work.
- [ ] Drag a chip from the Holding Pen onto empty canvas → a standalone node is placed and persists on reload.
- [ ] Left-click a placed node → the edit panel opens; left-drag → the node moves and its position persists; moving a node onto another does **not** create an edge.
- [ ] Right-drag from one node to another → the relationship-type menu appears; choosing a type creates the connection (correct per-type styling); the menu is operable with arrow keys / Enter / Esc.
- [ ] Drag a chip from the Holding Pen **onto an existing node** → the type menu appears and the new node attaches as a child.
- [ ] Right-click a connection line → confirm → the edge is removed and stays removed on reload.
- [ ] The browser's native context menu does **not** appear when right-dragging/right-clicking on the canvas.

### Code-review checks
- [ ] CSS-2 — the dot-grid/WYSIWYG tokens are defined as custom properties (mirroring frontend `variables.css`), not hardcoded hex in `arbor-canvas.css`.
- [ ] SR-1 — the relationship-type picker lives in its own `arbor-connect-menu.js` (+ `.css`), not merged into `arbor-edges.js`.
- [ ] JS-3 — `edgeMode`/`addingMode` toggles and the search-to-add dialog code are deleted, not left dormant.
- [ ] JS-6 — document-level `mousemove`/`mouseup` listeners added during a right-drag are removed on release; the menu is built with `textContent`.
- [ ] JS-2 — right-drag connect calls `Edges.validateConnection` before `UpdateRecord.saveEdge`, and `preventDefault`s the `contextmenu` event.
- [ ] CSS-1 — dead `.admin-arbor-toolbar*` / `.admin-arbor-edge-error` / zoom-`Reset` rules are removed; the new menu stylesheet is under 150 lines.
- [ ] `admin/tests/admin-arbor.test.js` no longer references removed functions and covers the retained pure helpers; `diagram-page-includes.test.js` still passes with `arbor-connect-menu.js` after the core scripts.

## Validation: Maps Editor — Gallery, Visual Parity Fix & Right-Click (Admin)
**Plan:** maps-editor-gallery-and-interactions.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open the authenticated maps editor (`/diagrams/maps.html`, local dev-bypass): the topbar, toolbar, buttons, and panels are fully styled (not unstyled default browser HTML) — confirms the missing `admin.css` include is fixed.
- [ ] On load, a **gallery** of map cards is shown (one per map: thumbnail, name, description, pin count) styled to match the public `/evidence/maps/` index cards.
- [ ] Clicking a card opens that map's canvas editor; the Holding Pen above the canvas is visibly styled (background, dashed border, chip styling) — not plain unstyled buttons.
- [ ] "← All Maps" in the toolbar returns to the gallery; if there are unsaved staged pins, a confirmation prompt appears before leaving.
- [ ] Drag a Holding Pen chip onto the map → a staged (dashed) pin appears; it can be **dragged** to reposition before saving.
- [ ] Right-click a Holding Pen chip → a "Place on Map" menu item appears; selecting it stages a pin at a default position and removes the chip from the pen.
- [ ] Right-click a staged (dashed) pin → "Remove from Map" appears with **no confirmation prompt**; selecting it removes the staged pin and returns its evidence chip to the pen.
- [ ] Right-click a saved pin → "Remove from Map" appears **with** a confirmation prompt; confirming deletes the pin via the API and returns its evidence to the pen on next load.
- [ ] The popup menu is operable with arrow keys / Enter / Esc, and dismisses on click-away; the browser's native context menu does not appear when right-clicking a chip or pin.
- [ ] Save persists all staged creates/moves as before; reloading the map shows the same pins in the same positions.

### Code-review checks
- [ ] CSS-2 — `maps-tokens.css` defines frontend-named custom properties with values copied from `frontend/assets/css/base/variables.css`, not hardcoded hex elsewhere.
- [ ] SR-1 — the gallery (`maps-gallery.js`/`.css`) and popup menu (`maps-pin-menu.js`/`.css`) each live in their own files, not merged into existing modules.
- [ ] JS-3 — drag handling for staged vs. saved pins is generalized (one set of handlers branching on `.id` vs. `._tempId`), not duplicated.
- [ ] JS-2 — "Remove from Map" on a saved pin confirms before deleting; on a staged pin it does not (never persisted, nothing to lose).
- [ ] JS-6 — gallery cards and menu items are built with `createElement`/`textContent`, never `innerHTML` with DB values.
- [ ] CSS-1 — each new CSS file is under 150 lines and styles exactly one component.
- [ ] `admin/tests/maps.test.js` covers `Staged.unstageCreate`, `Staged.updateStagedPosition`, and the pin-menu's pure position-clamp helper; `diagram-page-includes.test.js` still passes.

## Validation: Timeline Editor — Frontend Parity + Bottom Holding Pen
**Plan:** timeline-editor-frontend-parity-holding-pen.md
**Date:** 2026-07-11

### Manual checks
- [ ] Open `/admin/diagrams/timeline.html` — the canvas visually matches the public timeline: dot-grid background, centred 1px spine, era marker rules, frontend-style dots (12px, 18px on hover with shadow) and title + meta labels above/below dots (no slanted labels).
- [ ] An era filter chip row ("All Eras" + the eight eras) sits above the canvas; clicking a chip fades non-matching dots/labels to 30% opacity, and faded dots remain clickable/editable.
- [ ] The holding pen renders as a horizontal strip **below** the canvas (above the zoom bar), always visible; with no unplaced records it shows "No unassigned records".
- [ ] Evidence with `timeline_period` NULL appears as chips in the pen regardless of whether `timeline_era` is set.
- [ ] Dragging a chip onto the axis snaps it to a period, shows a dot immediately, removes the chip, and increments the Save button's pending count — nothing is persisted yet.
- [ ] Dragging a placed dot along the axis stages a period move (pending count increments); dragging a dot into the pen strip stages an unassignment and re-renders the chip.
- [ ] Right-click a dot → context menu with "Move to period…" (period select, stages a move) and "Move to holding pen" (stages an unassignment); the native browser menu is suppressed; menu dismisses on ESC, click-away, scroll, and zoom.
- [ ] Save persists all staged placements/moves/unassignments in one pass; reload shows the same state; a failed item stays pending and is reported via toast/console.
- [ ] Public timeline page is unchanged and still shows only published events.

### Code-review checks
- [ ] SR-1 — staged store, era filter, and context menu each live in their own JS/CSS files.
- [ ] JS-2 — staged save reports per-item failures explicitly; PATCH-null handling validated at the model layer.
- [ ] JS-5 — all persistence via `Admin.api.*` / `UpdateRecord`; no raw fetch.
- [ ] JS-6 — chips/dots/menu built with `createElement`/`textContent`, never `innerHTML` with DB values; document-level drag and dismiss listeners removed on completion.
- [ ] CSS-1 / CSS-2 — each new CSS file under 150 lines, admin tokens only, no hardcoded values that belong in variables.
- [ ] HTML-1/HTML-5 — context menu uses `role="menu"`/`role="menuitem"` and supports ESC dismiss.

---

## Validation: Arbor Editor Keyboard Accessibility
**Plan:** arbor-editor-keyboard-accessibility.md
**Date:** 2026-07-14

### Manual checks
- [ ] Open `admin/diagrams/arbor.html`, sign in with a passkey, and Tab through the canvas — confirm each node receives visible keyboard focus in DOM order
- [ ] With a node focused, press Ctrl+L — confirm link mode starts, the source node is visually marked, and a screen reader (VoiceOver) announces "Link mode: connecting from '<title>'..."
- [ ] While in link mode, press ArrowRight/ArrowDown and ArrowLeft/ArrowUp — confirm focus/highlight cycles between candidate target nodes (excluding the source) and each move is announced
- [ ] Press Enter on a chosen target — confirm the existing relationship-type connect menu opens, keyboard selection still works (arrows/Enter), and a valid choice creates the edge, re-renders it, and announces "Connected '<source>' to '<target>' as <type>."
- [ ] Press Escape at each stage of link mode (immediately after Ctrl+L, mid-cycle, and with the connect menu open) — confirm it cancels cleanly every time, restores focus to the original source node, and announces cancellation
- [ ] Attempt a duplicate or self connection via the keyboard flow — confirm the same error toast appears as the mouse flow (no new/different message)
- [ ] Focus a node with exactly one edge and press Delete/Backspace — confirm the existing confirm dialog appears and, on confirm, the edge is removed and an announcement is made
- [ ] Focus a node with multiple edges and press Delete/Backspace — confirm the new disconnect-picker menu opens, lists each edge as "<source> → <target> (<type>)", supports arrow navigation, Enter deletes the chosen edge, and Escape/click-away cancels without changes
- [ ] Focus a node with zero edges and press Delete/Backspace — confirm nothing is deleted and "No connections to remove." is announced
- [ ] With keyboard flows fully exercised, confirm the original pointer gestures still work unchanged: right-drag from a node still opens the connect menu and creates an edge; right-click on an edge still opens the delete confirm
- [ ] Run a VoiceOver pass over the whole link-mode and disconnect flows end-to-end — confirm no state change happens silently (every mode entry/exit, cycle step, and success/failure is announced)

### Code-review checks
- [ ] SR-1 — disconnect-picker menu lives in its own file (`arbor-disconnect-menu.js`), mirroring `arbor-connect-menu.js`; link-mode logic lives in `arbor-edges.js`, focus/tabindex wiring lives in `arbor-nodes.js`
- [ ] JS-1 / JS-4 — new functions (`enterLinkMode`, `cycleLinkTarget`, `confirmLinkConnection`, `exitLinkMode`, `disconnectFocusedNode`) are self-documenting with JSDoc explaining the Ctrl+L choice
- [ ] JS-2 — keyboard handlers guard against no-node-focused, no-other-nodes-on-canvas, and zero/one/many-edges cases without throwing
- [ ] JS-6 — new `document`-level keydown listeners added in `enterLinkMode` are removed in `exitLinkMode`, mirroring the existing `onEdgeDragMove`/`onEdgeDragUp` add/remove pattern; no `innerHTML` used for announce text or menu item labels
- [ ] CSS-2 / CSS-5 — new focus-visible and link-mode classes use `--admin-*` custom properties only, single classes, no IDs, no `!important`
- [ ] CSS-4 — new classes (`admin-arbor-node--link-source`, `admin-arbor-node--link-target-candidate`, `admin-arbor-disconnect-menu`) are named for role, not appearance
- [ ] Confirm the keyboard connect/disconnect paths call the exact same persistence functions as the mouse paths (`Edges.validateConnection`, `UpdateRecord.saveEdge`, `Edges.deleteEdge`) — no duplicated SQL/API logic
- [ ] Confirm `admin/tests/admin-arbor.test.js` additions cover target-cycling index math and edge-lookup counts (0/1/many) without touching DOM

---

## Validation: Admin Spelling & Grammar Widget
**Plan:** admin-spellcheck-widget.md
**Date:** 2026-07-16

### Manual checks
- [ ] Open `admin/blog/new.html`, type a misspelled word into the body field — confirm a red wavy underline appears under it within ~1s of pausing typing, without any visible typing lag
- [ ] Type a sentence with a grammar issue the retext plugins cover (e.g. a repeated word, or passive voice if `retext-passive` is included) — confirm a yellow wavy underline appears, and that if the sentence also contains a misspelled word, the spelling underline renders/resolves first
- [ ] Right-click a red-underlined word — confirm the native browser context menu is suppressed and a custom menu appears listing suggested corrections, "Ignore", and "Learn word"
- [ ] Click a suggestion — confirm the word in the textarea is replaced correctly and the underline disappears after the next scan
- [ ] Click "Ignore" on a flagged word, then retype the same word elsewhere in the same field — confirm it is not flagged again in this session
- [ ] Click "Learn word" on a flagged word, reload the page, and retype the same word — confirm it is never flagged again anywhere (persisted globally)
- [ ] Repeat the underline/context-menu check on: `admin/evidence/edit-[id].html` (description field), `admin/essays/edit-[id].html`, `admin/historiography/edit-[id].html`, and `admin/debate/edit-[id].html` (and academic/popular challenge response fields if they have independent textareas) — confirm all target fields behave identically
- [ ] Resize the browser window and scroll the textarea — confirm the overlay's wavy underlines stay aligned with the correct characters (no drift)
- [ ] Confirm the public frontend (`frontend/`) loads no spellcheck vendor scripts, worker, or CSS — check Network tab on any public page
- [ ] Confirm typing remains responsive (no dropped keystrokes/jank) in a long (multi-paragraph) content field while the checker is active

### Code-review checks
- [ ] SR-1 — worker, overlay renderer, controller, context menu, and dictionary client are each their own file under `admin/assets/js/admin-spellcheck/`
- [ ] SR-2 — the SR-2 exception text in `setup/Vibe_coding_rules.md` was actually added, and is scoped narrowly to admin-only spellcheck/NLP libraries (not a blanket carve-out)
- [ ] SR-3 — the spelling/grammar scan runs inside a Web Worker, not on the main thread; the `input` listener is debounced (~1s)
- [ ] JS-5 — dictionary learn/ignore calls go through `Admin.api.*`, no raw `fetch` in any new file
- [ ] JS-6 — context menu uses a single delegated `contextmenu`/click listener, is removed/dismissed cleanly on outside click and Escape, and never uses `innerHTML` with word/suggestion text
- [ ] SQL-1/SQL-2/SQL-3 — `spellcheck-dictionary.model.js` uses prepared statements and `?`/named parameters only
- [ ] CSS-1/CSS-2/CSS-4 — `spellcheck.css` is under 150 lines, uses only `variables.css` tokens (including for the grammar/yellow color — confirm no new hardcoded hex was introduced if an existing warning token could be reused), and class names describe role not appearance
- [ ] HTML-5 — the context menu is operable via keyboard (Escape closes it at minimum)
- [ ] Confirm `admin/tests/admin-spellcheck.test.js` and `api/tests/spellcheck-dictionary.test.js` both exist and pass (`cd api && npm test`, plus the admin test runner)

## Validation: Fix Timeline Drag-Offset Persistence & Admin Node Colouring
**Plan:** timeline-drag-offset-persistence-and-node-colour.md
**Date:** 2026-07-17

### Manual checks
- [ ] **Live drag movement (smoke test):** in the admin timeline editor at SPREAD density, hold right-click and drag a node — the dot visually follows the cursor smoothly with no horizontal drift and no vertical jump at drag start, and its label tracks with it.
- [ ] In the admin timeline editor, zoom in until dots reach SPREAD density, right-click-drag a node to a new position, click **Save Changes**, then reload the page — the node stays in its dragged position (does not snap back). This is the core regression this plan fixes.
- [ ] Confirm the network PUT to `/evidence/:id` fired on save includes `timeline_offset_x` and `timeline_offset_y` in its JSON body (DevTools Network tab).
- [ ] A `places`-category event renders as a white dot with a black ring (roundel), not a solid black dot; a `people` event renders the same roundel; an `objects` event stays muted-grey.

### Code-review checks
- [ ] JS-5 — `UpdateRecord.saveEvent` remains async/await + try/catch; the two offset fields are added with the same `undefined`-guard pattern as the existing fields and forward explicit `null`.
- [ ] SR-1 — the offset fix is confined to `saveEvent`; no unrelated changes bundled in.
- [ ] CSS-2 — the `dot-cat--place` / `dot-cat--person` colour fix uses `var(--color-white)` and `var(--color-black)` only, no literal hex.
- [ ] CSS-5 — `dot-cat--*` category overrides remain after the `era--*` rules in `admin/assets/css/admin-diagrams/timeline-dots.css` so they win the cascade.
- [ ] Style guide §8 — admin dot colouring now matches `frontend/assets/css/pages/timeline/timeline-dots.css` and `components.md` line 80.
- [ ] `admin/tests/admin-timeline-staged.test.js` includes a test asserting offset fields are forwarded, and passes.
- [ ] A drag-movement test exists (in `admin-timeline-node-bounds.test.js` or a new node-drag test file) asserting no leftward drift across successive `pointermove`s and no first-move vertical jump, and it passes.
- [ ] `updateDotPosition` anchors to a base position captured at `pointerdown` and reuses render's `left`/`top` formulas — it does not read the live `style.left` to derive the base each frame.

## Validation: Admin Passkey Manual Verification
**Plan:** admin-passkey-manual-verification.md
**Date:** 2026-07-18

### Manual checks
- [ ] Sign in at /admin/ with passkey; open admin/diagrams/timeline.html — dots/labels align with the public timeline pages for the same data
- [ ] Open admin/diagrams/arbor.html — node/edge positions match frontend/evidence/arbor.html for the same data
- [ ] Tick the corresponding items in this file and confirm to the implementing agent so Issues.md #33 can be closed

### Code-review checks
- [ ] (documentation-only plan — no code rules apply)

## Validation: Maps Editor Loading Subtitle Fix
**Plan:** maps-editor-loading-subtitle-fix.md
**Date:** 2026-07-18

### Manual checks
- [ ] Open admin/diagrams/maps.html — topbar subtitle reads "Select a map" on the gallery view (not "Loading…")
- [ ] Open a map for editing — subtitle becomes the map name
- [ ] Return to the gallery — subtitle resets to "Select a map" (no stale map name)

### Code-review checks
- [ ] JS-2 — getElementById result is null-guarded before textContent writes
- [ ] JS-6 — no repeated DOM queries added; element cached where reused
- [ ] Admin test covers initial text, map-open overwrite, and gallery reset

## Validation: News Admin Action Buttons Spacing
**Plan:** news-admin-action-buttons-spacing.md
**Date:** 2026-07-18

### Manual checks
- [ ] admin/news/ table: Edit and Delete sit side-by-side with a small gap at desktop width
- [ ] Narrow the window until the buttons stack — a visible gap remains between them (the old margin-left bug showed zero gap here)

### Code-review checks
- [ ] CSS-2 — gap uses var(--space-xs), no hardcoded px
- [ ] Pattern byte-matches admin/collections/index.html:277 (display:flex;gap:var(--space-xs);)
- [ ] deleteBtn.style.marginLeft line removed

## Validation: Arbor Connect Click-Click Gesture
**Plan:** arbor-connect-click-click.md
**Date:** 2026-07-18

### Manual checks
- [ ] Right-click node A — gold outline + "Connecting from…" toast appears
- [ ] Right-click node B — relationship-type menu appears; choosing a type creates the edge
- [ ] Escape / right-click empty canvas / right-click armed node — each cancels with feedback
- [ ] Right-click an edge — delete confirmation still works; no drag rubber-band remains anywhere
- [ ] Keyboard C-flow (C, Tab, C) still connects nodes

### Code-review checks
- [x] JS-6 — old mousedown/mousemove/mouseup drag listeners fully removed, no orphans
- [x] JS-4 — module JSDoc rewritten (no "right-drag" references remain)
- [x] JS-2 — armed state has all three cancel paths; shared state variable between pointer and keyboard flows
- [x] Admin arbor suite updated; click-click coverage passes (59/62 pass — 3 pre-existing unrelated failures tracked as Issues.md #59, not introduced by this plan)

## Validation: Arbor Edge Waypoints
**Plan:** arbor-edge-waypoints.md
**Date:** 2026-07-18

### Manual checks
- [ ] Right-click an edge — menu offers Re-route and Delete
- [ ] Re-route mode: drag a midpoint handle — it snaps to the grid; Enter commits; reload page — routing persists
- [ ] Escape during re-route reverts to the previous routing
- [ ] Public evidence/arbor.html renders the identical routed line
- [ ] Keyboard: focus edge, R enters re-route, arrows move waypoint by grid steps

### Code-review checks
- [x] SQL-3/JS-2 — waypoints in pickWritable whitelist; JSON validated on write (array, ≤20 points, numeric) and read (fallback to default routing)
- [x] computeEdgePath byte-identical between admin arbor-edges.js and frontend arbor-render.js
- [x] CSS-2 — handle styles use admin tokens; hit target ≥ 12px
- [x] Migration file NNN_add_arbor_edge_waypoints.sql + schema.sql both updated

## Validation: Timeline Dot Colors Fix
**Plan:** timeline-dot-colors-fix.md
**Date:** 2026-07-18

### Manual checks
- [ ] admin/diagrams/timeline.html (hard refresh): all eight era colors clearly distinguishable from the canvas and from each other
- [ ] Dots tagged person/place have a visible background (previously none due to --color-white bug)
- [ ] Public timeline pages checked for the same palette problem; fixed or logged per the parity task

### Code-review checks
- [ ] CSS-2 — no reference to undefined --color-white remains anywhere (grep admin + frontend CSS)
- [ ] Era tokens changed only in variables.css; timeline-dots.css references tokens only
- [ ] Contrast verified with a checker tool, not eyeballed

## Validation: Timeline Restore Left-Click Drag
**Plan:** timeline-restore-left-drag.md
**Date:** 2026-07-18

### Manual checks
- [ ] Plain left-click on a dot (no movement) — edit panel opens, node does not move
- [ ] Left-drag a dot >4px at default zoom (density "normal") — node moves and position persists after save/reload
- [ ] Right-click drag behaviour unchanged (still gated to SPREAD density)
- [ ] Moved node appears at the same position on the public timeline page

### Code-review checks
- [ ] JS-2 — pointer capture with cleanup on pointerup AND pointercancel
- [ ] JS-4 — both "Left-drag … removed" comment blocks rewritten
- [ ] Threshold logic: candidate drag below 4px falls through to Events.selectEvent()
- [ ] Admin timeline suite covers click-vs-drag disambiguation and offset staging

## Validation: Spellcheck Dictionary Load Failure
**Plan:** spellcheck-dictionary-load-failure.md
**Date:** 2026-07-18

### Manual checks
- [ ] Fresh-load several admin editor pages signed in — the "Could not load the spellcheck dictionary" toast no longer appears
- [ ] Learn a word on one page, open another — the word stays unflagged (server dictionary synced)
- [ ] Diagnosis finding (actual failure status/cause) recorded in the plan's Notes

### Code-review checks
- [ ] JS-2 — degradation contract intact: sync failure never breaks spellcheck
- [ ] JS-5 — all requests still via Admin.api.get/post
- [ ] Toast fires only on confirmed failure per the fixed policy
- [ ] API route test covers auth-gated GET; admin test covers sync success/failure paths

## Validation: Spellcheck Replace Overlap Flicker
**Plan:** spellcheck-replace-overlap-flicker.md
**Date:** 2026-07-18

### Manual checks
- [ ] Misspell a word, right-click → choose replacement — new word appears cleanly, no frame where old and new overlap
- [ ] Replace a word early in a long text — later flagged words stay correctly underlined during the re-scan gap

### Code-review checks
- [ ] JS-6 — context menu mutates the overlay only via the render module's entry points
- [ ] JS-2 — worker re-render remains authoritative (optimistic update reconciles idempotently)
- [ ] Admin test asserts synchronous mark removal and offset shifting by the length delta

## Validation: Arbor Connect-Completion Fix
**Plan:** arbor-connect-completion-fix.md
**Date:** 2026-07-18

### Manual checks
- [ ] Live arbor editor: open devtools console before load — confirm no `SyntaxError: Identifier '...' has already been declared` for `VALID_TYPES` or `dragState`
- [ ] In the live console, `window.AdminArborConnectMenu`, `window.AdminArborEdgeReroute`, `window.AdminArborEdgeMenu` are all defined (not `undefined`)
- [ ] Right-click a node — gold outline appears (not just a blue focus ring) and the "Connecting from…" info toast fires
- [ ] Right-click a second node — relationship-type menu opens at the cursor; choosing a type draws and persists the edge (survives page reload)
- [ ] Right-click the armed node again — arm cancels with a "Connection cancelled." toast
- [ ] Right-click an existing edge — the Re-route/Delete menu appears (confirms `arbor-edge-menu.js` and `arbor-edge-reroute.js` no longer clobber each other's `menuEl`/`backdropEl`/`activeIndex`/`resolvePromise`)
- [ ] Simulate a broken bootstrap (temporarily block arbor-connect-menu.js in devtools) — completing a connection shows an error toast instead of doing nothing

### Code-review checks
- [ ] Every `admin-arbor/*.js` file (except `arbor-geometry.js`) has its body wrapped in a top-level IIFE
- [ ] `grep -hoE "^(var|let|const|function) [A-Za-z_$][A-Za-z0-9_$]*" admin/assets/js/admin-arbor/*.js | awk '{print $2}' | sort | uniq -c | sort -rn` shows no count > 1 (no remaining cross-file top-level identifier collisions)
- [ ] JS-2 — no code path in the connect flow returns silently; every abort surfaces a toast or console.error
- [ ] JS-5 — completion path stays async/await with try/catch; errors route through showToast
- [ ] SR-1 — each IIFE wrap touches only its own file; no cross-file refactor bundled in
- [ ] A page-load smoke test loads all `admin-arbor/*.js` files together in one `vm` context and asserts no thrown error and every `window.AdminArborX` module is defined afterward
- [ ] Admin tests cover: missing ConnectMenu → error toast; a throwing completion path surfaces a toast instead of an unhandled rejection

## Validation: Shared Cluster Logic Modules (Admin)
**Plan:** shared-cluster-logic-module.md
**Date:** 2026-07-19

### Manual checks

- [ ] Open `https://thejesuswebsite.org/admin/diagrams/timeline.html` and log in — timeline editor canvas loads without errors, admin sidebar and zoom controls appear
- [ ] Canvas renders event dots and axis — no console errors for missing `AdminTimelineClusterDensity`, `AdminTimelineClusterPlacement`, `AdminTimelineClusterLabels`
- [ ] Click an event dot to open the edit panel — event title and era display correctly, the event's current position (cluster-computed or custom offset) matches the visual placement
- [ ] Edit the event's era and save — the event moves to the new era's zone on the timeline, clustering recomputes, labels reposition without overlap
- [ ] Drag an event to a custom position (creates `timeline_offset_x/y` override) — label follows the new position; clustering respects the override and does not re-compute placement for this event
- [ ] Save the dragged event; reload the page — custom position persists, the event renders at the saved offset
- [ ] Open zoom controls (−/Reset/+) and zoom in/out — cluster density tier changes, label display modes update (full → truncated → hidden as density compresses), dots reposition smoothly
- [ ] Filter by era using the era-filter chips (e.g. show only "Passion Week" events) — events in other eras hide, timeline axis adjusts, labels remain valid for visible events only

### Manual checks (Admin Arbor)

- [ ] Open `https://thejesuswebsite.org/admin/diagrams/arbor.html` and log in — arbor editor canvas loads, nodes appear in holding pen and on canvas
- [ ] No console errors for missing `AdminArborComputeEdgePath` or related arbor globals
- [ ] Examine existing edges on the canvas — edges follow correct orthogonal routing (down → across → up), with parallel edges offset horizontally
- [ ] Create a new edge: right-click a source node (gold outline + "Connecting from…" toast), right-click target node, select a relationship type from the menu
- [ ] The new edge renders with correct path calculation; if multiple edges exist between the same source→target, each is offset by ~12px horizontally
- [ ] Use the Re-route tool: right-click an edge, select "Re-route", place waypoints on the grid, save — edge threads through waypoints, manual routing overrides auto-offset
- [ ] Reload the admin arbor page — rerouted edge waypoints persist, edge still follows the custom path
- [ ] Verify the admin arbor rendering pixel-perfectly matches the public arbor page (same event connections, same edge positions, same offsets for parallel edges)

### Code-review checks

- [ ] **HTML-4** — Bridge script tags in `admin/diagrams/timeline.html` (lines 36–47 → new location) load before `timeline-axis.js`. Bridge tags in `admin/diagrams/arbor.html` (new line after line 36) load before `arbor-edges.js`. Script order enforces bridge-global availability before dependents run.
- [ ] **SR-1** — Four bridge modules in `admin/assets/js/cluster-logic-bridge/`: cluster-density-bridge.js, cluster-placement-bridge.js, cluster-labels-bridge.js, edge-path-bridge.js. Each is a thin adapter exposing one canonical ES module via a `window.Admin*` global.
- [ ] **JS-3** — Each bridge file is a single-purpose module (type="module") importing from canonical paths and assigning globals; no extra logic or side effects.
- [ ] **JS-2** — Bridges validate that imported functions exist before assigning to window globals (no silent undefined assignments).
- [ ] **JS-4** — Bridge modules carry a one-line comment block explaining the pattern (admin bridge, re-exposes canonical ES module as window global, precedent: admin-toasts.js).
- [ ] **SR-3** — No performance regressions: bridge modules are thin wrappers, canonical logic unchanged; admin timeline and arbor initialization time is unaffected.

### Automated test checks

- [ ] Run `cd admin && node --test tests/**/*.test.js` — all tests in `admin/tests/admin-arbor.test.js`, `admin-arbor-page-load.test.js`, `admin-arbor-reroute.test.js`, etc. pass
- [ ] No new test files added (bridge is a transparent adapter, existing tests exercise it automatically)
- [ ] Admin arbor tests specifically verify: `window.AdminArborComputeEdgePath` is callable and produces byte-identical SVG paths compared to the pre-refactor version
- [ ] Admin timeline tests verify: `window.AdminTimelineClusterDensity`, `AdminTimelineClusterPlacement`, `AdminTimelineClusterLabels` globals exist and are callable
- [ ] No console errors or warnings in the browser (DevTools) when loading admin/diagrams/timeline.html and admin/diagrams/arbor.html after the change
- [ ] Admin page-load smoke test in `admin/tests/admin-arbor-page-load.test.js` (or similar) confirms all bridge globals are defined immediately after DOMContentLoaded fires

## Validation: Map Pin Clustering (Admin)
**Plan:** maps-pin-clustering.md
**Date:** 2026-07-19

### Manual checks
- [ ] Open `admin/diagrams/maps.html`, select a map, place two pins at the same location (click twice near-identical spots, or drag one onto another) — pins fan apart visually instead of fully overlapping
- [ ] Click each fanned pin — correct pin's edit panel opens (label, evidence link, lat/lng fields match that specific pin, not a neighbor)
- [ ] Drag a fanned pin — it tracks the cursor exactly during drag (not offset by its cluster fan position); on mouseup it saves/stages the true cursor-dropped coordinate, not a fanned one
- [ ] Save a dragged pin's new position, reload the page — position persists correctly and re-fans appropriately against any remaining nearby pins
- [ ] Staged (not-yet-saved) pins in the holding pen also fan correctly alongside saved pins when dropped at an overlapping location
- [ ] Right-click a fanned pin → "Remove from Map" — removes the correct specific pin
- [ ] No console errors referencing `AdminMapsClusterPins` (or whatever global name is chosen) when loading `admin/diagrams/maps.html`

### Code-review checks
- [ ] **SR-1** — `admin/assets/js/cluster-logic-bridge/cluster-map-pins-bridge.js` only re-exposes the canonical `cluster-map-pins.js` module; no clustering logic is reimplemented in the bridge
- [ ] **HTML-4** — the bridge `<script type="module">` tag in `admin/diagrams/maps.html` loads before `admin-maps/maps-pins.js`
- [ ] **JS-3** — bridge module is a single-purpose adapter (import + `window.Admin*` assignment only)
- [ ] Confirm `Pins.onPinMouseDown`/`onPinMouseMove`/`onPinMouseUp` in `admin/assets/js/admin-maps/maps-pins.js` still read/write the true anchor `x`/`y` via `screenToPercent`/`percentToScreen` — the fan offset must never be written to the `/maps/pins` API payload
- [ ] **CSS-1** — new fan-offset transform rules added to `admin/assets/css/admin-diagrams/maps-pins.css` don't duplicate rules already defined in the public `maps-canvas.css`

## Validation: Challenge Admin Picker Fix
**Plan:** challenge-admin-picker-fix.md
**Date:** 2026-07-19

### Manual checks
- [ ] Open `admin/debate/academic-challenges/new.html`, fill in Title + Slug, upload a picture via the picker, click "Save as Draft" — no `ReferenceError: challengePicker is not defined` in the console, request succeeds, and the redirect to `edit-[id].html` happens
- [ ] Repeat the above on `admin/debate/popular-challenges/new.html`
- [ ] From the newly created record's edit page (`edit-[id].html?id=...`), confirm the uploaded picture shows in the picker on load (proves the create-side picture round-tripped)
- [ ] On an existing academic-challenge edit page, change the picture via the picker and save — reload the page and confirm the new picture persisted (regression check for Bug B: previously the picker mounted against a `null` container and silently never saved)
- [ ] Repeat the picture-change-and-persist check on a popular-challenge edit page
- [ ] On `admin/debate/academic-challenges/new.html` and `admin/debate/popular-challenges/new.html`, confirm the "Publish immediately" checkbox and its card are gone from the page, and that "Save as Draft" / "Publish" buttons still correctly set draft vs. published state (unaffected by the removal)
- [ ] On an edit page, confirm the "Publish"/"Unpublish" checkbox + button still work as before (should be untouched by this plan) — toggling reflects in the checkbox state and persists across reload

### Code-review checks
- [ ] **JS-2** — `challengePicker` is always initialized to a real `AdminImagePicker.mount(...)` result or `null` before any code path can read it; no undeclared-variable reference remains in `new.html`
- [ ] **JS-6** — in both `edit-[id].html` files, `AdminImagePicker.mount` is called only after `document.getElementById('challenge-picker')`/`picContainer` is guaranteed to exist in the DOM (mount call moved after the picture form-group is appended)
- [ ] **HTML-5** — removed checkbox block in `new.html` took its `<label for="challenge-publish">` and hint `<span>` with it; no orphaned label or dangling `for` reference remains
- [ ] **SR-1** — the academic-challenges and popular-challenges fixes were applied as separate file edits, not merged into a shared file

## Validation: Grammar Error Flagging in Admin Editor
**Plan:** grammar-flagging-fix.md
**Date:** 2026-07-20

### Manual checks

- [ ] Open an admin editor (e.g., `admin/evidence/new.html` or `admin/evidence/edit-N.html?id=N`), focus the content textarea, and type the text "the the" — within 500ms, a yellow wavy underline appears under the repeated "the" (confirms rendering pipeline works)
- [ ] Type text with an "a" before a vowel: "a apple" — a yellow wavy underline appears under "a apple" (confirms passive voice / a/an rules work)
- [ ] Right-click on a yellow underline — a context menu appears with a message explaining the grammar issue (e.g., "Repeated word: 'the'" or 'Use "an" instead of "a" before a vowel sound')
- [ ] Type text with "its" used incorrectly: "the dog wagged its' tail" — a yellow wavy underline appears
- [ ] Type text with "your" used incorrectly: "your going to the store" — a yellow wavy underline appears
- [ ] Type text with double punctuation: "What is this.." — a yellow wavy underline appears under the ".."
- [ ] Type text with uncapitalized sentence start: "the evidence shows it. the second sentence starts lowercase" — a yellow wavy underline appears under the lowercase "t" in the second sentence
- [ ] Type text with subject-verb mismatch: "the evidence suggest" — a yellow wavy underline appears (conservative rule, may not flag all cases)
- [ ] Type a sentence with both a spelling error and a grammar error: "teh the cat" — only the spelling underline appears under "teh", and the grammar underline does NOT appear under the second "the" (confirms worker filtering correctly prioritizes spelling over grammar)
- [ ] Delete the misspelled word and confirm the grammar underline on "the the" reappears in the next spellcheck pass

### Automated test checks

- [ ] Run the new grammar engine test file: `node --test admin/assets/js/admin-spellcheck/spellcheck-engine.test.js` — all test cases pass
- [ ] Test cases include:
  - Repeated words: `"the the"`, `"is is"`, etc. flag correctly; normal words like `"the cat"` do not
  - Passive voice: `"is flagged"`, `"was written by"` flag; active voice does not
  - A/an: `"a apple"`, `"an egg"` flag correctly; `"a dog"` does not
  - Its/it's: `"its' is"`, `"it's dog"` flag (intentional misuses); correct usage does not
  - Your/you're: `"your going"`, `"you're dog"` flag; correct usage does not
  - Double punctuation: `".."`, `"!!"`, `"??"`, `".!"` all flag; single punctuation does not
  - Sentence capitalization: lowercase letter immediately after sentence-ending punctuation + space flags; other lowercase does not
  - Subject-verb agreement: `"the evidence suggest"`, `"the events is"` flag (conservative); false negatives are acceptable

### Code-review checks

- [ ] **SR-2** — no new npm dependencies introduced; all grammar rules are implemented as regex patterns in `spellcheck-engine.js`
- [ ] **JS-2** — `checkGrammar()` function in `spellcheck-engine.js` explicitly checks for overlapping ranges before adding new issues (lines 436–438, 452–454) and fails loudly with descriptive messages
- [ ] **CSS-2** — `.admin-spellcheck-mark--grammar` in `spellcheck.css` uses only `text-decoration-color: var(--admin-warning)` (yellow from `#ffc107`)
- [ ] **SR-3** — all regex patterns complete in <1ms on typical text (no nested loops or expensive backtracking)
- [ ] The `overlapsAny()` function in `spellcheck-worker.js` (lines 37–42) correctly implements range overlap detection: `start < r.end && end > r.start`
- [ ] Grammar errors are only filtered if they overlap with spelling errors; multiple non-overlapping grammar errors are all returned

## Validation: Remove Redundant Published and Landing Page Toggle
**Plan:** remove-redundant-published-and-landing-page.md
**Date:** 2026-07-20

> **Scope note (owner decision during implementation):** the News admin module
> (`admin/news/index.html`) was deliberately left untouched, including both its
> "Show on Landing Page" and "Published" checkboxes — news articles have no
> Publish/Unpublish button anywhere else in the admin UI, so removing the
> modal's "Published" checkbox would have made it impossible to publish or
> unpublish a news article at all. `api/models/news-article.model.js` was
> likewise left untouched (`landing_page_display` stays in `WRITABLE_COLUMNS`,
> `getLandingPageArticles()` stays) so that surviving checkbox keeps working.
> Only `blog_posts` (admin + model + schema) was changed.

### Manual checks — Admin UI removals

- [ ] **Blog new form**: No "Show on Landing Page" checkbox is visible; form still has title, date, content, hero image, and hero image alt fields
- [ ] **Blog edit form**: No "Show on Landing Page" checkbox is visible in the sidebar; no "Published" checkbox appears in the sidebar; Publish/Unpublish button at page bottom is still present and functional
- [ ] **Blog admin list**: No "Landing" badge column appears in the admin table; status column still shows Published/Draft status
- [ ] **News modal (create/edit)**: unchanged by this plan — "Show on Landing Page" and "Published" checkboxes are still present and still functional (deliberately out of scope, see note above)
- [ ] **News admin list**: unchanged by this plan — the "Landing" badge column is still present
- [ ] **Essays edit form**: No "Published" checkbox appears in the sidebar
- [ ] **Evidence edit form**: No "Published" checkbox appears in the sidebar
- [ ] **Popular challenges edit form**: No "Published" checkbox appears in the sidebar
- [ ] **Academic challenges edit form**: No "Published" checkbox appears in the sidebar
- [ ] **Responses edit form**: No "Published" checkbox appears in the sidebar
- [ ] **Historiography edit form**: No "Published" checkbox appears in the sidebar

### Manual checks — Publish/Unpublish functionality

- [ ] **Blog post publish/unpublish**: Create or edit a blog post; the Publish/Unpublish button at the bottom of the form still toggles the post between published and draft state; no errors appear
- [ ] **Essay/Evidence/Response/Historiography/Challenge publish/unpublish**: same check as blog — the bottom Publish/Unpublish button still toggles state correctly now that the redundant sidebar checkbox is gone
- [ ] **News article publish/unpublish**: unchanged by this plan — the modal's "Published" checkbox remains the only publish control for news and must still work
- [ ] **Landing page auto-selection**: Open the public home page (https://thejesuswebsite.org); verify it displays exactly 5 most-recent published news articles and 3 most-recent published blog posts (ordered by creation date descending)
- [ ] **Mixed publish states**: Create one published and one draft blog post with the same title; verify only the published one appears on the landing page

### Code-review checks

- [ ] **SR-1** — No new files created; only form HTML removal and model/schema changes
- [ ] **SQL-1** — `landing_page_display` is retained in `database/schema.sql` for both `blog_posts` (now with a deprecation comment) and `news_articles` (unchanged, still active); no migration needed
- [ ] **JS-2** — `WRITABLE_COLUMNS` in `blog-post.model.js` no longer includes `landing_page_display`, and its unused `getLandingPagePosts()` is completely removed; `news-article.model.js` is intentionally unchanged (see scope note above)
- [ ] **HTML-1** — Removed form groups are cleanly deleted without orphaned labels or fieldsets; semantic structure is preserved
- [ ] **No breaking changes**: `getAllPublished()` remains the canonical source; frontend code requires no changes (already ignores landing_page_display)
- [ ] **Backward compat**: Existing DB rows still have landing_page_display values; they simply won't be modified by new blog admin saves (news saves are unaffected — that field is still writable there)

## Validation: Admin Editor Shared Extraction
**Plan:** admin-editor-shared-extraction.md
**Date:** 2026-07-20

### Manual checks
- [ ] Open each of the five editors (`admin/evidence/edit-[id].html`, `admin/essays/edit-[id].html`, `admin/blog/edit-[id].html`, `admin/debate/edit-[id].html`, `admin/historiography/edit-[id].html`) for an existing record and confirm the sidebar/topbar render identically to before migration, with the correct nav item marked active
- [ ] Confirm each editor's form still saves successfully (Save Changes button) and that publish/unpublish toggles correctly
- [ ] Confirm the MLA bibliography panel on each editor loads pre-existing linked sources correctly (regression check for the `mla_source_id`→`id` bug this extraction is meant to prevent recurring)
- [ ] Confirm Insert Image wiring still works on evidence, essays, blog, and historiography (debate has no content field — confirm it is skipped without error)
- [ ] Confirm delete section and Ctrl+Enter shortcut still work on each editor
- [ ] Open browser console on each editor page and confirm no new errors/warnings beyond expected `console.warn` guard logs

### Code-review checks
- [ ] SR-1 — each new shared module (`admin-editor-utils.js`, `admin-layout.js`, `admin-editor-scaffold.js`, `admin-form-builder.js`) exports one coherent namespace, not a grab-bag of unrelated functions
- [ ] SR-4 — confirm no duplicated copy of `parseIdList`/`clearErrors`/`validate`/sidebar markup/save-publish handlers remains in any of the five editor files after migration
- [ ] JS-2 — every early-return guard added in the new shared modules for an unexpected state calls `console.warn` with call-site context before returning
- [ ] JS-5 — the scaffold and utilities call only `Admin.api.*`/`AdminHttp`, never raw `fetch()`
- [ ] JS-6 — `AdminFormBuilder` and `AdminLayout` build elements via DOM factories, never `innerHTML` with server/user data
- [ ] CSS-1 — each new shared CSS file is under 150 lines; confirm it was split if the combined rules exceeded that
- [ ] CSS-2 — shared CSS references `variables.css` custom properties, no hardcoded values
- [ ] Automated tests exist and pass: `admin/tests/admin-editor-utils.test.js`, `admin/tests/admin-layout.test.js`, `admin/tests/admin-editor-scaffold.test.js`, `admin/tests/admin-form-builder.test.js`

## Validation: Grammar Mark Context Menu Message Display & Dictionary Validation
**Plan:** spellcheck-grammar-context-menu-fix.md
**Date:** 2026-07-20

### Manual checks
- [ ] Open `admin/evidence/new.html` (or any admin editor page) and confirm spellcheck is active (red wavy underlines for spelling, green for grammar)
- [ ] Type a sentence with intentional subject-verb disagreement (e.g., "The scholars is here") to trigger a grammar mark
- [ ] Right-click the green grammar mark — confirm a context menu appears with the grammar message displayed (e.g., "Subject-verb disagreement" or similar) as a label or header, above the "Ignore" button
- [ ] Confirm spelling marks still show only the misspelled word (no message), as before
- [ ] Click "Ignore" on the grammar mark — confirm the mark disappears from the editor (DOM suppression)
- [ ] Refresh the page — confirm the grammar mark reappears (grammar Ignore is session-local, not persisted)
- [ ] Click "Ignore" on a spelling mark — confirm it also disappears, and does not reappear after refresh (spelling Ignore persists to the dictionary)
- [ ] Open the browser console during any "Ignore" action and confirm no API errors are logged

### Code-review checks
- [ ] JS-1 — `spellcheck-context-menu.js` code clearly distinguishes spelling vs. grammar handling with descriptive variable/function names
- [ ] JS-2 — `_show()` reads `flagged.dataset.spellcheckMessage` defensively (null checks) before rendering
- [ ] JS-6 — grammar message is rendered via `textContent` or safe DOM methods, never `innerHTML`
- [ ] JS-5 — Ignore handlers call `Admin.api.*` (spelling) or perform local DOM operations (grammar), no raw `fetch()`
- [ ] **Grammar Ignore does NOT POST to the API** — spellcheck-dictionary-client.js `ignoreWord()` is not called for grammar marks
- [ ] Automated tests exist and pass: new grammar message display test in `admin/tests/admin-spellcheck.test.js`
- [ ] Automated tests exist and pass: new grammar Ignore suppression test in `admin/tests/admin-spellcheck.test.js`

## Validation: Editable Figure Captions in the Blog Admin Editor
**Plan:** blog-editable-figure-captions.md
**Date:** 2026-07-23

### Manual checks
- [ ] Open `/admin/blog/edit-[id].html` for an existing post that already contains at least one `[figure src="…" caption="…"]` shortcode — the sidebar "Images" card lists one row per figure, each with a thumbnail, the current caption pre-filled, and an alignment select
- [ ] A post with **no** images shows the empty state ("No images in this post yet — use Insert Image to add one."), not a blank card
- [ ] Edit a caption in the panel and blur — the `[figure]` shortcode in the content textarea updates to the new caption, and no surrounding markdown text is altered
- [ ] Change alignment on a figure that has a caption — `align="left|right"` is added/changed and the caption survives; selecting "none" removes the `align` attribute entirely
- [ ] Clear a caption to empty — the shortcode drops the `caption=` attribute rather than emitting `caption=""`
- [ ] Type a caption containing a double quote (e.g. `The "Rylands" fragment`) — the shortcode stores it escaped (`&quot;`), the panel redisplays it unescaped, and the public page renders the quote correctly
- [ ] Insert a new image via "Insert Image" — the new figure appears as a row in the panel without reloading the page
- [ ] Edit a post containing **two figures that share the same `src`** — editing the second row's caption changes only the second shortcode
- [ ] Type directly into the content textarea (add/delete a `[figure]` line by hand) — the panel re-scans within ~250 ms and matches the textarea
- [ ] "Remove image" deletes only that shortcode from the content; surrounding paragraphs are untouched
- [ ] Spellcheck underlines stay aligned with the text after a caption write-back (the programmatic write dispatches `input`)
- [ ] Save the post, reload the admin editor, and confirm the edited captions persisted; view the post on the public site and confirm `<figcaption>` and the `<img alt>` both show the new caption
- [ ] Repeat the "existing figure lists and edits" check on `/admin/blog/new.html` after inserting an image
- [ ] Regression: the Insert Image button still works in the evidence, essay, historiography, and response editors (they share `admin-insert-image.js`)
- [ ] A failed image upload shows the red error toast, not a browser `alert()`
- [ ] Browser console is clean on load of both blog editor pages (no `AdminFigureCaptions.mount` warnings)

### Code-review checks
- [ ] SR-4 — exactly one `[figure]` regex/builder exists in `admin/`; `admin-insert-image.js` calls `AdminFigureShortcodes.buildFigureShortcode()` and defines no local copy
- [ ] SR-4 — the shortcode grammar in `admin/assets/js/admin-figure-shortcodes.js` matches `frontend/assets/js/utils/content-markers.js` (attribute names/order, `&quot;` escaping, optional `align`)
- [ ] SR-1 — pure shortcode logic and the DOM panel live in separate files; neither is appended to `admin-editor-utils.js`
- [ ] SR-2 — no new dependencies added to any `package.json`
- [ ] JS-2 — `AdminFigureCaptions.mount()` `console.warn`s (naming the call site) on a missing container or unresolvable `textareaId`, and never fails silently
- [ ] JS-3 — write-back splices by `start`/`end` offsets from a fresh parse; no regex replace-by-value that could hit the wrong figure
- [ ] JS-6 — captions, `src` paths, and alt text are set via `textContent` / property assignment; no `innerHTML` with user data; panel rows use event delegation and stale listeners are not left attached after a rebuild
- [ ] CSS-1 — `admin/assets/css/admin-components/figure-captions.css` is under 150 lines and styles only this component
- [ ] CSS-2 — no hardcoded colours/spacing; all values come from admin custom properties
- [ ] CSS-3 — the panel's `@media (max-width)` rules live in the same file
- [ ] CSS-4 / CSS-5 — semantic kebab-case class names (`.afig-caption-row`, not `.afig-small-box`), single-class selectors, no IDs, no `!important`
- [ ] HTML-2 — every thumbnail `<img>` carries an `alt` attribute (empty for the decorative preview)
- [ ] HTML-4 — `admin-figure-shortcodes.js` is loaded (deferred) before `admin-insert-image.js` and `admin-figure-captions.js` on both blog pages
- [ ] HTML-5 — each caption input and alignment select has a real `<label>` (or `aria-label`), with `aria-describedby` on any hint text
- [ ] Error notification — the upload failure path uses `showToast(msg, "error")` behind a `typeof showToast === "function"` guard; no new `E-*` code was added (none needed — no API change)
- [ ] Automated tests exist and pass: `admin/tests/admin-figure-shortcodes.test.js`, `admin/tests/admin-figure-captions.test.js`
- [ ] Automated tests exist and pass: updated `admin/tests/admin-insert-image.test.js` requires the real shortcode module instead of re-implementing `buildShortcode`
- [ ] Full suites pass: `node --test admin/tests/*.test.js` and `cd api && npm test`

## Validation: Figure Captions Across Every Content Editor
**Plan:** figure-captions-all-editors.md
**Date:** 2026-07-23

### Manual checks
- [ ] Prerequisite confirmed: `admin/assets/js/admin-figure-shortcodes.js` and `admin-figure-captions.js` exist (from blog-editable-figure-captions.md) — no forked second copy anywhere
- [ ] Evidence editor (`edit-[id].html` and `new.html`): the Images card lists every `[figure]` in the description, and editing a caption rewrites the shortcode in `#ev-desc`
- [ ] Essays editor (both pages): same, against `#essay-content`
- [ ] Historiography editor (both pages): same, against `#historiography-content`
- [ ] Debate/responses `edit-[id].html`: same, against `#response-content`
- [ ] Debate/responses `new.html`: the **newly added** Insert Image button appears and works, and the Images card lists the inserted figure
- [ ] Academic challenges (both pages): same, against `#challenge-body`
- [ ] Popular challenges (both pages): same, against `#challenge-body`
- [ ] On a static-HTML page (any `new.html` or challenge page), the panel mounts without console errors — the mount container is a hand-written `<div>`, not a scaffold-built card
- [ ] Insert a new image in any editor — it appears in that page's Images card without a reload
- [ ] Public regression: an evidence detail page with figures still shows the pictures section with captions and correct `Fig. N` numbering after the `evidence-detail.js` regex de-duplication
- [ ] Public regression: a blog/essay/response/historiography/challenge body containing an inline `[figure]` renders identically to before the `content-markers.js` change
- [ ] Browser console is clean on all eleven editor pages

### Code-review checks
- [ ] SR-4 — exactly one `[figure]` grammar in `admin/` and exactly one in `frontend/`; `grep -rn "\\[figure" frontend/assets/js` shows no regex literal outside `utils/figure-shortcodes.js`
- [ ] SR-4 — all eleven pages call the shared `AdminEditorUtils.mountFigureCaptionsPanel()` helper; no page hand-rolls the card markup
- [ ] SR-1 — the shared frontend grammar lives in its own `utils/figure-shortcodes.js`, not appended to `content-markers.js`
- [ ] JS-2 — a missing mount container or unresolvable textarea id `console.warn`s naming the page and returns, never throws
- [ ] JS-3 — the exported `/g` pattern is a factory (or `matchAll` is used internally); no shared module-level `/g` literal with mutable `lastIndex`
- [ ] JS-6 — no `innerHTML` with captions or paths in any newly added markup
- [ ] HTML-4 — `admin-figure-shortcodes.js` is deferred *before* `admin-insert-image.js` and `admin-figure-captions.js` on every one of the eleven pages
- [ ] CSS — no new page-local styles added; the panel reuses `admin-components/figure-captions.css`
- [ ] Style match — challenge editor edits follow that file's existing single-quoted inline-JS idiom, not the blog editor's formatting
- [ ] `setup/Issues.md` row 103 `Status` changed `open` → `resolved`, and no other cell or row was touched
- [ ] Automated tests exist and pass: `frontend/tests/figure-shortcodes.test.js` (or the project's frontend-util test location), updated `admin/tests/admin-editor-utils.test.js`
- [ ] Full suites pass: `node --test admin/tests/*.test.js` and `cd api && npm test`


## Validation: Spellcheck & Grammar Fixes + Fuzzy Suggestions

**Plan:** spellcheck-fixes-and-fuzzy-suggestions.md
**Date:** 2026-07-24

### Manual checks
- [ ] In an admin editor, type a deliberate misspelling — confirm squiggly underline appears
- [ ] Right-click the misspelling → select a suggestion — confirm replacement is INSTANT with zero visual overlap or flicker
- [ ] Type a grammar error (e.g. repeated word "the the") — right-click → Ignore — type more text to trigger re-scan — confirm the grammar underline does NOT return
- [ ] Type a misspelling that produces fallback suggestions — confirm suggestions include phonetically similar words (e.g. "recieve" → "receive")
- [ ] Keyboard-proximity: suggestions prefer adjacent-key typos over random Levenshtein-close words

### Code-review checks
- [ ] JS-2 — suggestion replacement adds word to in-memory set; reverts on failure
- [ ] JS-2 — grammar-ignore state is local-only, no server round-trip needed
- [ ] JS-6 — overlay invalidation is synchronous in the same frame as text mutation
- [ ] SR-3 — Soundex and keyboard-proximity computation runs in the Web Worker, not the main thread
- [ ] Soundex implementation correctly handles edge cases (empty strings, non-alpha characters)


## Validation: Identifiers — Database & API (Part 1/3)

**Plan:** identifiers-p1-db-api.md
**Date:** 2026-07-24

### Manual checks
- [ ] Run migration: ALTER TABLE identifiers ADD COLUMN title, external_url — confirm columns exist
- [ ] POST /api/identifiers with title and external_url — confirm created row includes both fields
- [ ] GET /api/identifiers/admin — confirm returns all identifiers (published + unpublished) with title and external_url
- [ ] PUT /api/identifiers/:id with updated title — confirm update persists
- [ ] Existing GET /api/identifiers still returns only published identifiers

### Code-review checks
- [ ] SQL-2 — new columns added via migration, not inline in model
- [ ] JS-2 — title and external_url are in WRITABLE_COLUMNS whitelist
- [ ] SQL-1 — getAllAdmin() uses db.prepare()

## Validation: Identifiers — Admin Page (Part 2/3)

**Plan:** identifiers-p2-admin-page.md
**Date:** 2026-07-24

### Manual checks
- [ ] Navigate to /admin/identifiers/index.html — page loads with identifier list
- [ ] Click "New Identifier" — form opens with title, URL, and type-specific fields
- [ ] Create an identifier with title and external URL — row appears in table
- [ ] Edit an existing identifier — changes persist after save
- [ ] Delete an identifier — confirmation modal appears, row removed after confirm
- [ ] Admin sidebar shows "Identifiers" link — clicking navigates to the page

### Code-review checks
- [ ] JS-5 — API calls use async/await with try/catch
- [ ] JS-6 — event delegation for table row actions
- [ ] HTML-5 — form fields have associated labels
- [ ] SR-1 — admin-identifiers.js is a single file, not mixed into existing admin scripts

## Validation: Identifiers — Frontend Display (Part 3/3)

**Plan:** identifiers-p3-frontend.md
**Date:** 2026-07-24

### Manual checks
- [ ] Evidence detail page: [id:N] badge shows title label when title is set
- [ ] Evidence detail page: external URL icon appears next to identifier badge when URL is set
- [ ] Click external URL icon — opens in new browser tab
- [ ] Identifier without title: falls back to existing label (e.g., manuscript number)
- [ ] Identifier without external URL: no link icon appears
- [ ] Info-row panel shows identifiers with titles and URLs

### Code-review checks
- [ ] JS-2 — title fallback chain: title → manuscript_number → iaa_number → ...
- [ ] JS-6 — external_url is HTML-escaped before interpolation
- [ ] HTML-2 — external links have target="_blank" rel="noopener noreferrer"

## Validation: Admin Timeline Axis-Line Stability

**Plan:** admin-timeline-axis-line-stability.md
**Date:** 2026-08-16

### Manual checks
- [ ] Sign in to /admin/diagrams/timeline.html with a passkey
- [ ] At default zoom (scale=1.0), the axis line inside the timeline canvas renders at a crisp, non-blurry thickness
- [ ] Zoom in to scale=3.0 using the `+` control — the axis line's apparent thickness stays visually constant (does not grow thicker)
- [ ] Zoom out to the minimum scale — the axis line does not visually vanish or become a hairline
- [ ] Compare the axis line's thickness against the spine (`.admin-timeline-canvas::after`) at scale=3.0 — both should read as similarly crisp, constant-thickness lines

### Code-review checks
- [ ] JS-2 — no inline style on `.admin-timeline-axis-line` silently overrides its CSS-declared thickness
- [ ] CSS-2 — the counter-scaling calc references `var(--timeline-zoom-scale, 1))`, not a hardcoded fallback value
- [ ] CSS-6 — the counter-scaling rule carries an explanatory comment citing why (matching the era-divider comment style in the same file)
- [ ] TEST-8 — the new regression test uses the existing hand-built fake DOM, not a DOM library

---

## Validation: Admin JS/HTML Consistency
**Plan:** admin-js-html-consistency.md
**Date:** 2026-08-16

### Manual checks
- [ ] `https://thejesuswebsite.org/admin/index.html` dashboard still loads content, search/filter/status-select still work, and the error state still renders the same `.admin-error` markup if a request fails
- [ ] Each of the five editor pages still renders identically to before — the static `<h1>`/`<main>` addition is invisible in normal operation since JS immediately replaces/rebuilds it
- [ ] With JavaScript disabled (or by inspecting page-source directly), each of the five editor pages now has a real `<h1>` and `<main>` in the raw HTML, not just after script execution

### Code-review checks
- [ ] JS-5 — `dashboard.js`'s `DOMContentLoaded` handler is `async`, uses `await`/`try`/`catch` throughout, no remaining `.then()`/`.catch()`
- [ ] HTML-1/HTML-3 — exactly one `<h1>` and one `<main>` in each editor page's static markup, matching what the runtime JS would have created
- [ ] `spellcheck-worker.js` was not touched by this plan

## Validation: Admin News Modal Consolidation

**Plan:** admin-news-modal-consolidation.md
**Date:** 2026-08-28

**Note:** per the user's Option A decision, the news modal now visibly changes (narrower, tighter padding, softer shadow, no close button) — this is intended and approved, not a regression. Do not fail a check because the modal "looks different than before."

### Manual checks
- [ ] Sign in to `/admin/news/` with a passkey
- [ ] Click "Add Article" — the modal opens with the title, form fields, and action buttons visible; no header wrapper, no ✕ close button
- [ ] Modal width appears to be ~480px (narrower than the old 600px), padding is 24px (tighter than the old 32px), and the overlay/shadow match the shared component's — this visual change vs. the old news modal is expected
- [ ] No close button present — dismiss via clicking outside the modal (backdrop) or the Cancel button; both close it
- [ ] Form fields inside the modal render normally with proper spacing: Title, Slug, Article URL, Publisher, Author, Thumbnail picker, Date, Keywords, checkboxes, and error div
- [ ] Inspect the modal element in DevTools — confirm classes are exactly `.admin-modal-backdrop` and `.admin-modal` (no `--news` modifier)
- [ ] Confirm no `.admin-modal__header` or `.admin-modal__close` element exists anywhere in the modal
- [ ] Inspect the title element — confirm it is `<h2 class="admin-modal__title">` directly inside `.admin-modal`
- [ ] Inspect the actions container — confirm class is `.admin-modal__actions` (BEM double-underscore)
- [ ] No console errors (check DevTools Console tab)
- [ ] No 404s in Network tab for CSS files (all `/admin/assets/css/*.css` should return 200); confirm no request for a `news-modal-sizing.css` file appears at all

### Code-review checks
- [ ] CSS-1 — `news.css` no longer defines any `.admin-modal*` rule; only `.admin-landing-badge` and the updated header comment remain
- [ ] CSS-1 — `admin-components/modals.css` gained only the form-group/checkbox-group rules moved from `news.css`; no `__header`/`__close` rules were added
- [ ] CSS-2 — no hardcoded values in the shared `modals.css` that should be tokens (all use `var(--*)`)
- [ ] SR-4 — news page no longer has its own `.admin-modal-overlay` or `.admin-modal-actions` definitions; those class names are gone from `news.css` and `news/index.html`
- [ ] JS-1 — class names in `news/index.html` match the shared component naming scheme exactly (`.admin-modal-backdrop`, `.admin-modal`, `.admin-modal__title`, `.admin-modal__actions`) with no `--news` modifier and no header/close elements
- [ ] TEST-2 — `news-modal.test.js` imports correctly, the modal smoke test passes (structure, classes, dismiss behaviour), no regression

---

## Validation: Admin Typography Token Calibration

**Plan:** admin-typography-token-calibration.md
**Date:** 2026-08-28

### Manual checks

- [ ] Verify the admin panel appears visually unchanged after the token change. Sign in to `/admin/` with your passkey and inspect several pages (evidence list, diagrams, analytics).
- [ ] Open DevTools and inspect computed `font-size` for 5 sample selectors (`.admin-badge`, `.admin-arbor-pen__badge`, `.analytics-chip`, `.admin-map-card__pin-count`, `.admin-arbor-pen__empty`). Confirm the computed sizes are now: 11px, 11px, 12px, 9px, 12px respectively (exact px, not rem).
- [ ] Compare the admin UI visually before and after the token change. This is a deliberate near-no-op — the text should appear indistinguishable (≤0.75px shifts, well below perceptible). Badges, labels, and chip text should remain readable and properly proportioned. Do not treat "nothing looks different" as a failed check — that's the intended outcome.
- [ ] On the live site (`https://thejesuswebsite.org/admin/`), after deploy, perform the same DevTools inspection. Confirm the computed sizes match the new px values (9px / 11px / 12px) and render correctly.
- [ ] No errors in the browser console related to CSS or rendering.

### Code-review checks

- [ ] CSS-2 — `admin/assets/css/admin-base/variables.css` lines 86–88 define the three tokens as explicit px values, not rem.
- [ ] CSS-2 — all three token definitions (--text-2xs, --text-xs, --text-small) are accompanied by a comment explaining the 14px root assumption.
- [ ] CSS-1 — no component files (the 11 affected CSS files) were changed; they continue to reference the tokens via `var()` calls and require no modifications.
- [ ] No hardcoded font-size values appear in any of the 11 affected component files; all font-size rules rely solely on the tokens.

## Validation: Replace the bespoke spellcheck with browser spellcheck
**Plan:** replace-bespoke-spellcheck-with-browser-spellcheck.md
**Date:** 2026-10-17

### Manual checks
Sign in at `https://thejesuswebsite.org/admin/` with your passkey first. Save nothing. Clear every field you type in.

- [ ] Blog new page: type a misspelled word in the title and in the body. A red underline shows, and a right-click shows suggestions.
- [ ] Blog new page: type a nonsense word in the slug and the keywords. No underline shows.
- [ ] One edit page for each record type (blog, response, essay, evidence, historiography, academic challenge, popular challenge): the title and body show the underline. The slug and keywords do not.
- [ ] News: open Add Article. The title shows the underline. The slug, publisher and author do not. Open the thumbnail picker: alt text and caption show the underline.
- [ ] Resources (the index page and one topic page): the title, subheading and description show the underline. The URL does not.
- [ ] Identifiers: the display title, book title, source title and manuscript title show the underline. The numbers, locations and dates do not.
- [ ] Settings: the site title and site description show the underline. The OG image URL does not.
- [ ] Collections: the title and description show the underline (add and edit). The slug does not.
- [ ] Maps: the map name and description show the underline. Pin label and coordinates do not.
- [ ] Arbor: the node title shows the underline. The verse does not.
- [ ] Timeline: the event title shows the underline.
- [ ] In an essay body, use Insert Image. The caption shows the underline. In the figure captions panel, the caption shows the underline.
- [ ] Open the MLA source form. The title fields show the underline. Author, publisher and date do not.
- [ ] Open the browser console on each page above. No error mentions `SpellcheckController` or `SpellcheckDictionary`.
- [ ] Request `https://thejesuswebsite.org/admin/assets/js/admin-spellcheck/spellcheck-controller.js`. The answer is 404.
- [ ] Phase 2 only: after the migration deploys, the deploy log shows the drop migration, and the admin pages still load.

### Code-review checks
- [ ] Core Rules (touch rule) — every edited file was read whole. No comment holds history, a date, a name, or an issue, plan or phase number. No comment only restates the code.
- [ ] CORE-4 — `D-014` exists in `setup/Decisions_log.md`, and `D-001` is not edited.
- [ ] SR-2 — the `nspell` clause is gone from `setup/Vibe_coding_rules.md`.
- [ ] SR-4 — the `spellcheck` setting for built fields lives in the shared scripts (`admin-form-builder.js`, `admin-image-picker.js`, `admin-insert-image.js`, `admin-figure-captions.js`, `admin-mla-sources.js`, `admin-resources-topic.js`, `admin-identifiers.js`), not copied into each page.
- [ ] SR-7 — no new caption or hint about spellcheck appears in any editor.
- [ ] JS-6 — the two challenge edit pages no longer put `err.message` or `label` into `innerHTML`. No other touched file puts data into `innerHTML`.
- [ ] AG-1 — no file changed beyond the plan's Files touched list.
- [ ] API-3 — `git grep` finds no use of `INVALID_SPELLCHECK_STATUS` or `SPELLCHECK_MULTI_WORD`.
- [ ] TEST-7 — no auth test points at a deleted route.
- [ ] TEST-2 — new assertions exist only in modules that already had a test file.
- [ ] MIG-2 — migration `025` is unchanged.
- [ ] MIG-4 — Phase 2: `schema.sql` loses the table in the same commit as the new migration.
- [ ] MIG-7 — Phase 2: Luke confirmed the drop in chat before the push.
- [ ] HTML-5 — every field that gained `spellcheck` keeps its label and `aria-describedby`.

---

## Validation: Pure admin cluster-logic bridges
**Plan:** admin-cluster-bridges-pure.md
**Date:** 2026-10-18

### Manual checks
- [ ] Before any code change: the baseline file `setup/TESTS/baseline/cluster-bridges-before.json` exists. It holds the position of every dot, label and era heading from the live admin timeline and the live public timeline. (Passkey sign-in needed.)
- [ ] After deploy, public timeline (`https://thejesuswebsite.org/timeline`): the new capture matches the baseline exactly, and the console has no error.
- [ ] After deploy, admin timeline (`https://thejesuswebsite.org/admin/diagrams/timeline.html`): the new capture matches the baseline exactly. Dots, labels and era headings are in the same places. Drag a node and see the label move. Do not click Save.
- [ ] Admin maps (`/admin/diagrams/maps.html`): pins at one spot still fan out around the shared point.
- [ ] Admin arbor (`/admin/diagrams/arbor.html`): an edge with waypoints still draws along its waypoints.
- [ ] Hard refresh each admin page: no "missing export" or "AdminTimeline… is not defined" error in the console.
- [ ] Open all seven files in `admin/assets/js/cluster-logic-bridge/`: each holds only a header comment, imports, and one `window.Admin…` assignment.

### Code-review checks
- [ ] Touch rule, CORE-5 — every edited file is clean in full: comments give the why and the links to other files; no history, dates or issue numbers.
- [ ] CORE-3 — `setup/ARCHITECTURE/node-cluster-logic.md` says that bridges are pure, and `node setup/scripts/check-architecture-docs.js` passes.
- [ ] CORE-4 — D-025 is in `setup/Decisions_log.md` only after Luke said yes.
- [ ] AG-1 — the public renderer changes only by importing shared constants; its output is unchanged.
- [ ] AG-4 — the collision test keeps the expected values that were recorded on the old code.
- [ ] SR-4 — `loadEsmAsPlainScript` is no longer copied in two test files.
- [ ] JS-2 — the new adapter warns with its file name when the bridge global is missing.
- [ ] JS-7 — any new exported function has JSDoc.
- [ ] TEST-8 — the collision test uses a hand-built fake DOM, no jsdom.
- [ ] TEST-10 — `api/tests/guide-node-cluster-logic.test.js` has the six rows, the failure messages name rule, file, line and guide, and every exception has a reason.
- [ ] CSS and SQL rules — not touched.

