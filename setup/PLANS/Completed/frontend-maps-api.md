# Plan: Maps API — Pin Endpoints, Seed & Tests

**Module(s):** API / Database
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Surface the map-pin CRUD that already exists in `api/models/map.model.js` but is not yet exposed by `api/routes/maps.js`, seed the five canonical maps, and add automated tests for the maps model and routes. This makes the maps API complete enough for the frontend and admin plans to consume.

## Coding rules to keep in mind
- **SR-1** — Keep SQL in the model and HTTP in the route; the new pin handlers are tightly related (one linear CRUD set) so they belong together in `maps.js`.
- **SR-3** — Pin queries already use `idx_map_pins_map_id` / `idx_map_pins_evidence_id`; do not add per-row lookups.
- **JS-2** — Validate inputs (require `map_id`, `x`, `y` on create), return 404 for unknown ids and 400 for missing fields; never fail silently.
- **JS-4** — JSDoc only where intent is non-obvious; the route ordering constraint (below) deserves a one-line "why" comment.
- **JS-5** — Match the existing synchronous `try/catch`-per-route style in `maps.js` (better-sqlite3 is synchronous).

## Tasks

### Database

- [x] **Seed the five canonical maps** — add `INSERT` rows for the `maps` table covering `roman-empire`, `levant`, `judea`, `galilee`, `jerusalem` (each with `map_key`, `map_name`, `description`, `image_path` pointing at `/assets/images/maps/<map_key>.webp`). No pins are seeded (pins need real `evidence` rows and are added via the admin editor). File: `database/seed.sql`

### API

- [x] **Add map-pin endpoints to the maps route** — expose the existing model functions: `POST /maps/pins` (create), `PUT /maps/pins/:id` (update), `DELETE /maps/pins/:id` (delete), and `GET /maps/pins/by-map/:mapId` (list pins for a map). Guard the three write routes with `requireAuth`. **Register every `/pins…` route ABOVE the existing `GET /:map_key` route** so the `:map_key` param route does not swallow `/pins`. File: `api/routes/maps.js`

### Tests

- [x] **Write maps API tests** — using `node:test` + `node:assert` and the in-memory DB helper, cover the model (`getAllMaps` pin counts, `getMapByKey`/`getMapById` with embedded pins, map create/update/remove, pin create/get/update/remove, `getPinsByMap`) and the route layer (pin create validation 400, unknown-id 404, write routes 401 without a session, `GET /:map_key` still resolves a seeded map and is not shadowed by `/pins`). File: `api/tests/maps.test.js`

## Files touched
- `database/seed.sql` — modified
- `api/routes/maps.js` — modified
- `api/tests/maps.test.js` — created

## Notes
- **The model is already complete** — `createPin`, `getPinById`, `updatePin`, `removePin`, `getPinsByMap`, and the map CRUD all exist in `api/models/map.model.js`. This plan only adds the missing HTTP layer, seed rows, and tests. Do **not** rewrite the model.
- **Route-ordering hazard:** Express matches in declaration order. `GET /:map_key` (already present) will capture `GET /pins/by-map/:mapId` unless the pin routes are declared first. This is the single most important correctness point of the plan.
- Auth overlap: `complete-backend-data-layer.md` separately plans to apply `requireAuth` to the *existing* map write routes (`POST/PUT/DELETE /maps`). This plan only owns `requireAuth` on the *new* pin write routes — it does not re-guard the map routes, to avoid a conflicting edit.
- **Pins reference evidence:** `map_pins.evidence_id` is `REFERENCES evidence(id) ON DELETE SET NULL`, so a pin can exist without evidence and survives evidence deletion. Seed maps only; pins come later via the admin editor.
- Map background images (`/assets/images/maps/*.webp`) are content assets supplied separately — not created by this plan.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
