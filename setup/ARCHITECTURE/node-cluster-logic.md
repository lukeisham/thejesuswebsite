# Node cluster logic

When several events, evidence items or map pins share a spatial coordinate, they
form a **cluster**. The timeline, the arbor edges and the map pins all place dots
and labels so that nothing overlaps and every item stays linked to its anchor.
They use one canonical implementation.

**Source of truth:** `frontend/assets/js/cluster-logic/` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/*.js` (canonical), `admin/assets/js/cluster-logic-bridge/*-bridge.js` (admin re-exports), `admin/assets/js/admin-timeline/timeline-label-collision.js` (admin label adapter), `frontend/assets/js/timeline/timeline-era-heading-placement.js`, `frontend/assets/js/timeline/timeline-render.js`, `frontend/assets/js/timeline/timeline-geometry.js`, `frontend/assets/js/arbor/arbor-render.js`, `frontend/assets/js/maps/maps-render.js`, `admin/assets/js/admin-timeline/timeline-events.js`, `admin/assets/js/admin-timeline/timeline-node-drag.js`, `admin/assets/js/admin-timeline/timeline-geometry.js`, `admin/assets/js/admin-arbor/arbor-edges.js`, `admin/assets/js/admin-maps/maps-pins.js`, `admin/diagrams/timeline.html`, `admin/diagrams/arbor.html`, `admin/diagrams/maps.html`.

## Invariants

Guide test: `api/tests/guide-node-cluster-logic.test.js`. Its row numbers match the rows below.
Bridge behaviour test: `admin/tests/cluster-logic-bridges.test.js`.

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | Cluster math lives only in `frontend/assets/js/cluster-logic/`. Each admin bridge is a pure re-export: it imports names and publishes them as one `window.Admin*` global. It holds no function, no constant and no renamed export | The public pages and the admin editors must place nodes the same way | A bridge with logic is a second copy of a rule. The editor shows positions that the public page does not |
| 2 | `LABEL_CLEARANCE_PCT` and `TIER_STEP_PCT` are defined once, in `cluster-label-collision.js`. The public renderer imports them. The admin adapter and `timeline-node-drag.js` read them through the collision bridge | Label distance from the dot and the step per tier must match on both sides | Admin labels sit at a different distance from their dots than public labels. No error appears |
| 3 | `BASE_PX_PER_PERIOD` and `TIMELINE_CANVAS_HEIGHT_PX` in `timeline-geometry.js` equal `BASE_PX_PER_PERIOD` and `CANVAS_HEIGHT_PX` in the admin `timeline-geometry.js` | A stored `timeline_offset_x` is a fraction of one period slot (`BASE_PX_PER_PERIOD`). A stored `timeline_offset_y` is a fraction of the canvas height (`CANVAS_HEIGHT_PX`) | A node dragged to one spot in the editor shows at another spot on the public timeline |
| 4 | `timeline-render.js`, `timeline-events.js` and `timeline-node-drag.js` convert offsets with those two constants. None holds a bare `280` | Same reason as row 3 | A copy of the canvas height drifts from the geometry value |
| 5 | In each `admin/diagrams/*.html` page, a bridge `<script>` comes before every script that reads its global | Scripts run in document order | A reader throws on a missing global, or skips its work |
| 6 | A script reads only the names that its bridge exports | A reader of a name that no bridge exports gets `undefined` | A label, step or mode becomes `NaN` or `undefined` |
| 7 | Both arbor callers pass `edge.waypoints` to `computeEdgePath()`: `arbor-render.js` and `arbor-edges.js` (through the `window.AdminArborComputeEdgePath` bridge) | A present `waypoints` array replaces the computed parallel-edge offset | An edge shows one route in the editor and another route on the public page |

## Shape

- **Canonical:** `frontend/assets/js/cluster-logic/` holds density, placement, labels, label collision, map pins and edge path. Era-heading placement is canonical in `frontend/assets/js/timeline/timeline-era-heading-placement.js`.
- **Public consumers** import the canonical modules directly: `timeline-render.js`, `arbor-render.js`, `maps-render.js` and `timeline-era-heading-placement.js`.
- **Admin consumers** are classic scripts. Each canonical module has a same-named `*-bridge.js` that publishes it as a `window.Admin*` global.
- **Admin label adapter:** `admin/assets/js/admin-timeline/timeline-label-collision.js` measures the label elements, calls `resolveLabelCollisions` through the collision bridge, and writes the resolved tier to each label. `timeline-events.js` calls it after it attaches all labels.
- **Plain object and `Map`:** `computeDotPositions` takes and returns a `Map` (period to events). `timeline-events.js` builds and reads a `Map`.

## Extending it

- **Tuning behaviour** (spacing, thresholds, tier boundaries): edit the canonical module. Then check rows 2 and 3.
- **Changing a module's exports:** update the matching bridge in the same commit. The bridge test and guide test rows 1 and 6 name any reader that now breaks.
- **Adapter logic** (DOM measuring, data-shape conversion) goes into the canonical module or the admin caller. It never goes into a bridge.
- **New cluster-affected visual:** add a module under `cluster-logic/`. Add a bridge only if an admin classic script needs it, and load that bridge in the admin page before its reader.

## Not documented here

Spacing values per density tier, the collision tier count and the offset distance
for parallel edges are in the canonical modules. They change most often.
