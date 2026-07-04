# Plan: Maps Admin — Visual Pin Editor

**Module(s):** Admin
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build the admin visual map editor: load a map image, place and drag evidence-linked pins, edit pin labels and the linked evidence, switch between map scales, and persist everything through the maps pin API.

## Coding rules to keep in mind
- **HTML-1** — `admin/diagrams/maps.html` uses `<main>` for the editor canvas; `<div>` only as styling hooks.
- **HTML-3** — Exactly one `<h1>` (the page title in the admin top bar).
- **HTML-4** — CSS in `<head>`; editor scripts `defer`red.
- **HTML-5** — The pin-edit panel is a real form: every control has a `<label>`; errors use `aria-describedby`.
- **CSS-1 / CSS-2 / CSS-4** — `maps.css` styles only the editor; reference `--admin-*` tokens; semantic class names; under 150 lines.
- **JS-5** — All persistence goes through `async/await` + `try/catch` fetches against the maps pin API.
- **JS-6** — Delegate pin/canvas events; remove drag listeners when a pin is deleted or the map is switched; never `innerHTML` with data.
- **SR-1** — Split by concern across the three `admin-maps/` files; keep the coordinate math as pure, exported functions.

## Tasks

### Admin JS (render → pins → regions)

- [x] **Create the admin map render module** — load the selected map's background image into the editor canvas and expose pure helpers to convert between screen pixels and stored `x`/`y` image percentages (in both directions). File: `admin/assets/js/admin-maps/maps-render.js`
- [x] **Create the admin pin module** — place a pin on canvas click, drag to reposition, edit its label and linked evidence, and create/update/delete via `POST/PUT/DELETE /maps/pins`. File: `admin/assets/js/admin-maps/maps-pins.js`
- [x] **Create the admin region module** — the map-scale selector dropdown (switch between the five maps) plus region highlight/boundary helpers. File: `admin/assets/js/admin-maps/maps-regions.js`

### Admin HTML & CSS

- [x] **Create the admin maps editor page** — admin shell (sidebar + top bar) with the map canvas, an "Add Pin" action, the map-selector dropdown, and a slide-in pin-edit panel. File: `admin/diagrams/maps.html`
- [x] **Create the admin maps editor styles** — canvas container, draggable pins, and the pin-edit panel, using `--admin-*` tokens. File: `admin/assets/css/admin-diagrams/maps.css`

### Tests

- [x] **Write admin maps tests** — unit-test the pure coordinate-mapping helpers (screen↔image % conversion, round-trip stability) and the pin payload builder, using `node:test` + `node:assert` (no DOM). File: `admin/tests/maps.test.js`

## Files touched
- `admin/assets/js/admin-maps/maps-render.js` — created
- `admin/assets/js/admin-maps/maps-pins.js` — created
- `admin/assets/js/admin-maps/maps-regions.js` — created
- `admin/diagrams/maps.html` — created
- `admin/assets/css/admin-diagrams/maps.css` — created
- `admin/tests/maps.test.js` — created

## Notes
- **Testability:** the coordinate helpers in `maps-render.js` must be DOM-free, pure, and exported so `admin/tests/maps.test.js` can exercise them without a browser. The DOM-bound drag/click logic in `maps-pins.js` is validated manually (see `setup/TESTS/admin_tests.md`), following the `passkey.js` precedent.
- **Depends on `maps-api.md`** — the editor needs the pin write endpoints (`POST/PUT/DELETE /maps/pins`) and `GET /maps/pins/by-map/:mapId`.
- Admin shell not yet built: on disk, `admin/assets/css/` currently holds only the auth `login.css`/`register.css`; there is no `admin.css`, admin `variables.css`, or sidebar layout yet. This editor assumes the shared admin shell exists. If it does not, the shell must be built first — logged to Issues.md as a dependency/blocker.
- **Evidence linking:** the pin-edit panel links a pin to evidence. For v1, reuse an evidence search/select if available; otherwise accept an evidence id/slug input. `evidence_id` is nullable, so an unlinked label-only pin is valid.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
