# Maps

Places in the story of Jesus are pinned on maps, so a reader sees where events happened. An admin places each pin. The editor and the public page then draw the same pins, kept clear of each other.

**Source of truth:** `frontend/assets/js/cluster-logic/cluster-map-pins.js` — wins any disagreement with this doc.
**Spans:** `api/scripts/check-maps/index.js`, `api/scripts/generate-maps/geo-overlay.js`, `frontend/assets/js/cluster-logic/cluster-map-pins.js`, `frontend/assets/js/cluster-logic/cluster-labels.js`, `frontend/assets/js/cluster-logic/cluster-density.js`, `frontend/assets/js/maps/maps-render.js`, `admin/assets/js/admin-maps/maps-pins.js`, `admin/assets/js/admin-era-utils.js`, `admin/assets/js/cluster-logic-bridge/cluster-map-pins-bridge.js`, `admin/diagrams/maps.html`.

## Invariants

Guide test: `api/tests/guide-maps.test.js`. Its row numbers match the rows below.
The rules for how the admin editor reuses the public modules (bridges, pure modules) are in `setup/ARCHITECTURE/Website_guide.md`, under "Cross-module patterns".

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | The public `maps-render.js` and the admin `maps-pins.js` fan overlapping pins with `computePinOffsets` from `cluster-logic/cluster-map-pins.js` (the admin through `window.AdminMapsClusterPins`). The admin calls it without a zoom argument | A pin must sit where the editor shows it. The editor has no zoom, so the default spacing applies | A copy of the fan drifts: pins that overlap in one place are spread differently in the other |
| 2 | The map generator and the checker both load roads, boundaries and lakes through `loadAncientFeatures()` in `api/scripts/generate-maps/geo-overlay.js`, which reads `api/scripts/generate-maps/overlays/ancient-features.geo.json` | The checker must judge the shapes that the generator draws | A second copy of the data drifts: the checker passes while the map shows something else |

## Shape

- **Pin clustering:** pins within `PROXIMITY_THRESHOLD` of each other form a cluster. `computePinOffsets` fans each cluster outward from its shared point, so every pin stays visible and clickable. The spacing scales with the public zoom.
- **Shared with the timeline:** `cluster-map-pins.js` imports `cluster-labels.js`, which imports `cluster-density.js`. Both are also the timeline's label logic (`timeline.md`), so a change to either moves the map pin labels as well as the timeline labels.
- **Public:** `maps-render.js` imports `computePinOffsets` directly and passes the live zoom.
- **Admin:** `maps-pins.js` reads the module through `cluster-map-pins-bridge.js` as `window.AdminMapsClusterPins`. If the bridge is missing it shows pins without a fan and does not warn, so the load order in `maps.html` matters.
- **Era class:** `maps-pins.js` and `maps-holding-pen.js` build `era--<kebab>` with `AdminEraUtils.eraToKebab`, the conversion that the admin timeline editor also uses (`timeline.md`, row 12). `maps.html` loads `admin-era-utils.js` before them.

## Checking the maps against AD 30

`api/scripts/check-maps/index.js` compares the generated maps with first-century geography. Run `node api/scripts/generate-maps/index.js` first, so the SVGs match the configs.

It reads the map configs and the feature file in `api/scripts/generate-maps/`, the generated SVGs in `frontend/assets/images/maps/`, and the reference data in `api/scripts/check-maps/first-century-reference.json`. The reference data is entered by hand and is approximate. Audit a failure against the cited source before you change a map.

It prints the findings and writes a review sheet. The sheet shows each map with the reference places, tolerance rings and reference roads drawn on top, so a reader can see where artwork and reference disagree.

```
map-configs.js ──┐
features.geo.json ┼─> check-maps/index.js ─> findings (stdout) + review sheet (HTML)
generated SVGs ───┤
reference JSON ───┘
```

| Check | Question it answers |
|---|---|
| `stretch` | Does the viewBox have the shape of the bbox on the ground? |
| `feature` | Does each label and hill sit at its AD 30 place, on water or land as it should? |
| `road`, `boundary`, `lake` | Does each drawn road, boundary and lake match the reference, and does a road run through the sea? |
| `name` | Is a name from after AD 30 on the map, or is one place spelled two ways? |
| `collision` | Do two labels overlap, or does a label touch the frame? |

The base land and lake data is modern Natural Earth data. A lake that was drained since AD 30 shows as land, so the `feature` check skips the water test for a reference feature that is marked `drainedToday`.

## Extending it

- **A change to pin spacing:** edit `cluster-map-pins.js` only. Check row 1.
- **A new place, road or boundary in the reference:** add it to `first-century-reference.json` with its source. The checker needs no code change.
- **A new road, boundary or lake on a map:** add it to `ancient-features.geo.json` in lon/lat, with the maps that show it, then run the generator. Check row 2. A map SVG changes, so add a migration that bumps `maps.image_path` (`?v=`).

## Not documented here

The proximity threshold and the base spacing are in `cluster-map-pins.js`. They change most often.
