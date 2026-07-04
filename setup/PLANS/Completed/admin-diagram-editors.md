# Plan: Admin Diagram Editors — Arbor & Timeline

**Module(s):** Admin
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build the two remaining visual diagram editors in the admin panel: the Arbor node/edge editor and the Timeline event editor. Each reuses the corresponding public render concept with an admin editing overlay (add/drag/edit/delete) and persists positions and relationships through the existing API. The Maps editor is already complete; this plan brings Arbor and Timeline to parity, plus the shared persistence helper they both use.

## Coding rules to keep in mind
- **HTML-1** — `<main>` wraps the editor canvas; `<div>` only as styling hooks.
- **HTML-3** — Exactly one `<h1>` (the page title in the admin top bar).
- **HTML-4** — CSS in `<head>`; editor scripts `defer`red.
- **HTML-5** — The node/event edit panels are real forms: every control has a `<label>`; errors via `aria-describedby`.
- **JS-2** — Validate edge connections (no self-edges, no duplicates) and event dates before persisting; surface errors, never fail silently.
- **JS-5** — All persistence uses `async/await` + `try/catch` against the arbor/timeline routes.
- **JS-6** — Delegate canvas/node/event pointer events; remove drag listeners when a node/event/edge is deleted; never `innerHTML` with data.
- **CSS-1 / CSS-2 / CSS-4** — Each `admin-diagrams/*.css` styles only its editor, under 150 lines, using `--admin-*` tokens and semantic class names (mirrors the existing `admin-diagrams/maps.css`).
- **SR-1** — Split each editor by concern (canvas/render, items, connections/zoom) into separate files; keep coordinate/scale math as pure exported functions; share the API-write helper via `update-record.js`.

## Tasks

### Shared persistence helper

- [x] **Create the shared record-update helper** — a small module that POSTs/PUTs updated node positions, edge data, and event positions to the API (`async/await` + `try/catch`, returns the saved row or throws). Used by both editors. File: `admin/assets/js/update-record.js`

### Arbor editor — scripts

- [x] **Create the arbor canvas module** — SVG/canvas rendering of nodes and edges with zoom/pan, plus pure screen↔diagram coordinate helpers exported for tests. File: `admin/assets/js/admin-arbor/arbor-canvas.js`
- [x] **Create the arbor nodes module** — node CRUD: search-to-add evidence as a node, drag to reposition, persist position via `update-record.js`. File: `admin/assets/js/admin-arbor/arbor-nodes.js`
- [x] **Create the arbor edges module** — click-drag edge creation between nodes with connection validation (no self-edge, no duplicate, valid `relationship_type`), persisting via the arbor route. File: `admin/assets/js/admin-arbor/arbor-edges.js`

### Timeline editor — scripts

- [x] **Create the timeline axis module** — render the time scale and era bands, with pure date↔x-position scale helpers exported for tests. File: `admin/assets/js/admin-timeline/timeline-axis.js`
- [x] **Create the timeline events module** — event markers draggable along the axis; click opens an edit panel (title, date, era); search-to-add an evidence event; persist via `update-record.js`. File: `admin/assets/js/admin-timeline/timeline-events.js`
- [x] **Create the timeline zoom module** — zoom in/out, pan, and scale controls for the editor canvas. File: `admin/assets/js/admin-timeline/timeline-zoom.js`

### Editor pages & styles

- [x] **Create the arbor editor page** — admin shell + full-height canvas, "Add Node" search-to-add in the top bar, a slide-in node-edit panel, and bottom-bar zoom controls (§13 Diagram Editors). File: `admin/diagrams/arbor.html`
- [x] **Create the arbor editor styles** — canvas area, node/edge styling, node-edit panel, and minimap, using `--admin-*` tokens. File: `admin/assets/css/admin-diagrams/arbor.css`
- [x] **Create the timeline editor page** — admin shell + horizontal timeline canvas, "Add Event" evidence-search dialog in the top bar, and an event edit panel. File: `admin/diagrams/timeline.html`
- [x] **Create the timeline editor styles** — timeline axis, draggable event markers, era bands, and the event-edit panel, using `--admin-*` tokens. File: `admin/assets/css/admin-diagrams/timeline.css`

### Automated tests

- [x] **Write arbor editor tests** — `node:test` + `node:assert` unit tests for the pure coordinate helpers in `arbor-canvas.js` and the edge-validation logic in `arbor-edges.js` (self-edge / duplicate / type checks). File: `admin/tests/admin-arbor.test.js`
- [x] **Write timeline editor tests** — unit tests for the pure date↔position scale helpers in `timeline-axis.js` (round-trip stability, era-boundary mapping). File: `admin/tests/admin-timeline.test.js`

## Files touched
- `admin/assets/js/update-record.js` — created
- `admin/assets/js/admin-arbor/arbor-canvas.js` — created
- `admin/assets/js/admin-arbor/arbor-nodes.js` — created
- `admin/assets/js/admin-arbor/arbor-edges.js` — created
- `admin/assets/js/admin-timeline/timeline-axis.js` — created
- `admin/assets/js/admin-timeline/timeline-events.js` — created
- `admin/assets/js/admin-timeline/timeline-zoom.js` — created
- `admin/diagrams/arbor.html` — created
- `admin/assets/css/admin-diagrams/arbor.css` — created
- `admin/diagrams/timeline.html` — created
- `admin/assets/css/admin-diagrams/timeline.css` — created
- `admin/tests/admin-arbor.test.js` — created
- `admin/tests/admin-timeline.test.js` — created

## Notes
- **Depends on `admin-foundation`** — both editors use the admin shell, `admin.css`, and the `auth.js` session guard.
- **Mirrors the completed Maps editor** — `admin/diagrams/maps.html` + `admin/assets/css/admin-diagrams/maps.css` + `admin/assets/js/admin-maps/*` are the reference pattern for structure, pure-helper testability, and manual-validation split. The Maps editor persists directly via the pin endpoints; Arbor/Timeline route their writes through the shared `update-record.js`.
- **API dependencies** — the `arbor` and `timeline` routes/models already exist on disk. Arbor edges map to the `arbor_edges` table (`relationship_type` ∈ root/supports/leads_to/related, `UNIQUE(source_id,target_id)`, no self-edge); the edge-validation helper enforces these client-side before persisting.
- **Testability** — only the DOM-free coordinate, scale, and validation helpers are unit-tested; the drag/click canvas wiring is validated manually via `setup/TESTS/admin_tests.md`, following the Maps precedent.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
