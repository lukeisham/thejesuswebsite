# Maps

Places in the story of Jesus are pinned on maps, so a reader sees where events happened. An admin places each pin. The editor and the public page then draw the same pins, kept clear of each other.

**Source of truth:** `frontend/assets/js/cluster-logic/cluster-map-pins.js` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/cluster-map-pins.js`, `frontend/assets/js/maps/maps-render.js`, `admin/assets/js/admin-maps/maps-pins.js`, `admin/assets/js/cluster-logic-bridge/cluster-map-pins-bridge.js`, `admin/diagrams/maps.html`.

## Invariants

Guide test: `api/tests/guide-maps.test.js`. Its row numbers match the rows below.
The rules for how the admin editor reuses the public modules (bridges, pure modules) are in `setup/ARCHITECTURE/Website_guide.md`, under "Cross-module patterns".

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | The public `maps-render.js` and the admin `maps-pins.js` fan overlapping pins with `computePinOffsets` from `cluster-logic/cluster-map-pins.js` (the admin through `window.AdminMapsClusterPins`). The admin calls it without a zoom argument | A pin must sit where the editor shows it. The editor has no zoom, so the default spacing applies | A copy of the fan drifts: pins that overlap in one place are spread differently in the other |

## Shape

- **Pin clustering:** pins within `PROXIMITY_THRESHOLD` of each other form a cluster. `computePinOffsets` fans each cluster outward from its shared point, so every pin stays visible and clickable. The spacing scales with the public zoom.
- **Public:** `maps-render.js` imports `computePinOffsets` directly and passes the live zoom.
- **Admin:** `maps-pins.js` reads the module through `cluster-map-pins-bridge.js` as `window.AdminMapsClusterPins`. If the bridge is missing it shows pins without a fan and does not warn, so the load order in `maps.html` matters.

## Extending it

- **A change to pin spacing:** edit `cluster-map-pins.js` only. Check row 1.

## Not documented here

The proximity threshold and the base spacing are in `cluster-map-pins.js`. They change most often.
