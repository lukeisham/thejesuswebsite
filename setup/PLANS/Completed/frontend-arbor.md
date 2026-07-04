# Plan: Frontend Arbor Diagram

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Build the public Arbor Diagram: a node/edge graph of evidence items on a dot-grid canvas (Style Guide §9). White rounded-rect nodes show evidence title + primary verse; SVG edges connect them by relationship; a root node anchors the top; the canvas supports zoom (0.25×–3×) and pan; hovering a node shows a tooltip and clicking navigates to that evidence detail page. Rendered with custom SVG/DOM — zero external libraries, including the layout algorithm.

## Coding rules to keep in mind

- **SR-2** — Visual displays may use a library, but this plan renders with custom SVG/DOM by decision — the node-positioning layout is hand-written, no dependency added.
- **SR-3** — Compute node positions once per data load; reuse cached node/edge references during zoom and pan (transform the container, do not re-layout); throttle pan-drag handlers.
- **JS-2** — Validate the nodes/edges payload; handle a missing root and orphan nodes gracefully; show the empty state when there are no nodes.
- **JS-3** — Keep the layout pass, render pass, and interaction pass in separate small modules; no classes.
- **JS-5** — Fetch via `api.js` with `async/await` + `try/catch`; spinner before load, error toast on failure.
- **JS-6** — Delegate node hover/click from the diagram container (one listener, not one per node); cache DOM queries; build node markup via `dom.js`/`templates.js` — never `innerHTML` raw API title/verse text.
- **HTML-1** — `<main>` wraps the canvas; sr-only `<header>` holds the `<h1>`; zoom controls in a labelled `.arbor-controls` region with `aria-label`s on icon buttons.
- **HTML-3** — Exactly one sr-only `<h1>`; visible page title is `<h2>`.
- **HTML-4** — `arbor.css` in `<head>`; arbor scripts deferred at the bottom.
- **CSS-2 / CSS-1** — No new CSS; reuse the existing `arbor.css` class contract (`.arbor-node.root/.related`, `.arbor-edges`, `.arbor-tooltip`, `.arbor-controls`).

## Tasks

### HTML

- [x] **Create Arbor page HTML** — Shell: sr-only `<header>` with `<h1>`; visible `<h2>` + description; `.arbor-canvas` containing the scaled `.arbor-diagram` container and an `.arbor-edges` `<svg>` layer; `.arbor-controls` bottom bar with zoom-in / zoom-out / reset buttons (secondary style, Feather icons + `aria-label`); loading-spinner and empty-state containers; imports `arbor.css` and the three arbor scripts (deferred). File: `frontend/evidence/arbor.html`

### JS — Data

- [x] **Create arbor-data JS module** — Fetch arbor nodes (evidence) and edges from `GET /arbor` via `api.js`; export `buildGraph(nodes, edges)` returning an adjacency structure keyed by evidence id, the identified `root` node (edge `relationship_type = 'root'`), and edge records typed `supports` / `leads_to` / `related`. File: `frontend/assets/js/arbor/arbor-data.js`

### JS — Render

- [x] **Create arbor-render JS module** — Hand-written layout: place the root node at top-centre, then position children top-to-bottom and left-to-right by traversal depth/order; render `.arbor-node` elements (apply `.root` / `.related` classes by type) with `.arbor-node-title` + `.arbor-node-verse`; draw SVG `<line>`/`<path>` edges into the `.arbor-edges` layer behind nodes; render the empty state when the graph has no nodes. File: `frontend/assets/js/arbor/arbor-render.js`

### JS — Interactions

- [x] **Create arbor-interactions JS module** — Delegate node hover → `.arbor-tooltip` with full description (strengthen shadow, pointer cursor); node click → navigate to that evidence detail page; bottom-bar zoom in/out/reset applying `transform: scale()` to `.arbor-diagram` (min 0.25×, max 3×, step 0.25); pan via mouse/touch drag on `.arbor-canvas` (throttled); keep edges aligned with nodes under transform. File: `frontend/assets/js/arbor/arbor-interactions.js`

## Files touched

- `frontend/evidence/arbor.html` — created
- `frontend/assets/js/arbor/arbor-data.js` — created
- `frontend/assets/js/arbor/arbor-render.js` — created
- `frontend/assets/js/arbor/arbor-interactions.js` — created

## Notes

- **Dependency**: the `frontend-js-foundation` plan must be complete (`api.js`, `utils/dom.js`, `utils/templates.js`, `utils/toasts.js`, `main.js`, `feather-sprite.svg`).
- The dot-grid canvas background is pure CSS (`radial-gradient`, already in `arbor.css`) — no canvas API and no JS needed for the grid itself.
- Node positions are computed once in `arbor-render.js`; zoom and pan only mutate the container `transform` (SR-3) — never trigger a relayout. Because edges live in an SVG layer inside the same scaled `.arbor-diagram`, they scale with nodes automatically; the interactions module must confirm the SVG sits inside the transformed container so edges stay aligned.
- `relationship_type` values come straight from the `arbor_edges` schema enum (`root`, `supports`, `leads_to`, `related`); `supports` and `leads_to` both render as the standard white node, `related` as the dashed node, `root` as the accent-bordered node.
- The existing `arbor.css` defines every class the JS must emit — **no CSS changes**. Render output must match that contract exactly.
- No automated tests: all files are in `frontend/`. Manual checklist in `frontend_tests.md` covers this plan.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
