# Plan: Frontend Timeline Diagram

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Build the public Timeline view as a single continuous, horizontally-scrollable dot-style timeline with era filter chips (Style Guide §9). Events are positioned chronologically along a spine, clustered where they overlap, with hover tooltips, a click-to-open detail panel, and era markers. Rendered with custom SVG/DOM — zero external libraries.

## Coding rules to keep in mind

- **SR-2** — Visual displays may use a library, but this plan renders with custom SVG/DOM by decision — no external dependency is added.
- **SR-3** — Timeline can hold many events; render dots once, reuse cached node references, and avoid layout thrash during scroll/filter (batch DOM writes).
- **JS-2** — Validate the events payload before rendering; show the empty state ("No events in this period") when an era has no events.
- **JS-3** — Keep the period-ordering and clustering logic small and focused; no classes.
- **JS-5** — Fetch via `api.js` with `async/await` + `try/catch`; show a skeleton/spinner before data arrives and an error toast on failure.
- **JS-6** — Use event delegation for dot clicks and filter chips (one listener on the container, not one per dot); cache repeated DOM queries; never set `innerHTML` from raw API fields — build nodes via `dom.js`/`templates.js`.
- **HTML-1** — `<main>` wraps the timeline; filter chips in a `<nav>` or labelled region; `<header>` (sr-only) holds the `<h1>`.
- **HTML-3** — Exactly one sr-only `<h1>`; visible page title is `<h2>`.
- **HTML-4** — `timeline.css` in `<head>`; timeline scripts deferred at the bottom.
- **CSS-2 / CSS-1** — No new CSS; reuse the existing `timeline.css` class contract; any colour/size the JS needs already exists as a token or class.

## Tasks

### HTML

- [x] **Create Timeline page HTML** — Single-page shell: sr-only `<header>` with `<h1>`; visible `<h2>` "Timeline" + description; `.timeline-era-filters` chip container; `.timeline-container` scroll region holding `.timeline-spine`; loading-spinner and empty-state containers; `.timeline-detail-panel` template (hidden); imports `timeline.css` and the three timeline scripts (deferred). File: `frontend/evidence/timeline/index.html`

### JS — Data

- [x] **Create timeline-data JS module** — Fetch published evidence that has timeline fields from `GET /timeline` via `api.js`; export the canonical chronological `TIMELINE_PERIODS` order array and the `ERA_BOUNDARIES` (`beginning` / `middle` / `end`) map derived from the schema enum; export `groupEventsByPeriod(events)` returning events bucketed and ordered by period index. File: `frontend/assets/js/timeline/timeline-data.js`

### JS — Render

- [x] **Create timeline-render JS module** — Build the SVG/DOM timeline: compute each event's horizontal position from its period index along the spine; stagger overlapping events into vertical clusters (±8/±16 px offsets); apply `.timeline-dot.standard` / `.highlighted` classes; render `.timeline-label.above`/`.below` with title + date/location meta; draw `.timeline-era-marker` dividers and `.timeline-era-label` at each era boundary; render the empty state when no events match. File: `frontend/assets/js/timeline/timeline-render.js`

### JS — Interactions

- [x] **Create timeline-interactions JS module** — Delegate dot hover → tooltip (event name, date, category badge); dot click → populate and show `.timeline-detail-panel` (title, date, location, primary verse, "View Details" link to the evidence detail page); era filter chip toggle → add `.filtered-out` (opacity 0.3) to non-selected eras; cluster hover highlight; drag/momentum horizontal scroll; dismiss panel on outside-click or ESC. File: `frontend/assets/js/timeline/timeline-interactions.js`

## Files touched

- `frontend/evidence/timeline/index.html` — created
- `frontend/assets/js/timeline/timeline-data.js` — created
- `frontend/assets/js/timeline/timeline-render.js` — created
- `frontend/assets/js/timeline/timeline-interactions.js` — created

## Notes

- **Dependency**: the `frontend-js-foundation` plan must be complete (`api.js`, `utils/dom.js`, `utils/templates.js`, `utils/format.js`, `utils/toasts.js`, `main.js`, `feather-sprite.svg`).
- **Structure decision**: this plan implements a **single** `timeline/index.html` with era filter chips (Style Guide §9), **not** the multi-page `beginning/middle/ending.html` + `zoom-*` tree shown in `Website_guide.md`. The two source docs conflict; the single-page approach was chosen. The Website_guide tree is left unedited (per skill Step 3); the conflict is logged to `Issues.md`.
- The existing `timeline.css` already defines every class the JS must emit (`.timeline-dot`, `.timeline-spine`, `.timeline-era-marker`, `.timeline-detail-panel`, `.filtered-out`, etc.). The render module must produce DOM matching that contract exactly — **no CSS changes**.
- Chronological positioning relies on the order of the `timeline_period` enum in `schema.sql` (PreIncarnation → ReturnOfJesus). `timeline-data.js` owns that ordering as a constant so render stays presentation-only (SR-1 separation).
- `timeline_era` has only three values (`beginning`, `middle`, `end`); the visible "Birth / Ministry / Passion"-style era labels are a display mapping owned by `timeline-data.js`.
- No automated tests: all files are in `frontend/`. Manual checklist in `frontend_tests.md` covers this plan.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
