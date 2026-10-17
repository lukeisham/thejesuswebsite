# Node cluster logic

When several events, evidence items or map pins share a spatial coordinate, they
form a **cluster**. The timeline, the arbor edges and the map pins all place dots
and labels so that nothing overlaps and every item stays linked to its anchor.
They use one canonical implementation.

**Source of truth:** `frontend/assets/js/cluster-logic/` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/*.js` (canonical), `admin/assets/js/cluster-logic-bridge/*-bridge.js` (admin wrappers), `frontend/assets/js/timeline/timeline-era-heading-placement.js`, `frontend/assets/js/timeline/timeline-render.js`, `frontend/assets/js/arbor/arbor-render.js`, `frontend/assets/js/maps/maps-render.js`, `admin/assets/js/admin-timeline/timeline-events.js`, `admin/assets/js/admin-timeline/timeline-node-drag.js`, `admin/assets/js/admin-arbor/arbor-edges.js`, `admin/assets/js/admin-maps/maps-pins.js`, `admin/diagrams/timeline.html`, `admin/diagrams/arbor.html`, `admin/diagrams/maps.html`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Cluster math lives only in `frontend/assets/js/cluster-logic/`. Admin scripts reach it through a bridge | The public pages and the admin editors must place nodes the same way | A copy under `admin/` drifts. The editor shows positions that the public page does not |
| A constant that a bridge or an admin script repeats equals the canonical value: `LABEL_CLEARANCE_PCT` in `timeline-render.js` and `clearance` in `cluster-label-collision-bridge.js` | The bridge rebuilds label positions from the clearance after collision resolution | Admin labels sit at a different distance from their dots than public labels. No error appears |
| `timeline_offset_x` and `timeline_offset_y` convert to pixels with the same two scales on both sides: the world scale (`BASE_PX_PER_PERIOD` in `timeline-geometry.js`) and the canvas height. `timeline-events.js` and `timeline-node-drag.js` repeat both as literals | A stored offset is a fraction of the canvas. The editor and the public page must read it the same way | A node dragged to one spot in the editor shows at another spot on the public timeline |
| Both arbor callers pass `edge.waypoints` to `computeEdgePath()`: `arbor-render.js` and `arbor-edges.js` (through the `window.AdminArborComputeEdgePath` bridge) | A present `waypoints` array replaces the computed parallel-edge offset | An edge shows one route in the editor and another route on the public page |
| In each `admin/diagrams/*.html` page, a bridge `<script>` comes before the classic script that reads its `window.Admin*` global | Scripts run in document order | `timeline-events.js` throws on a missing global. It guards `AdminTimelineClusterLabelCollision`, so a late collision bridge silently turns label collision resolution off |

## Shape

- **Canonical:** `frontend/assets/js/cluster-logic/` holds density, placement, labels, label collision, map pins and edge path. Era-heading placement is canonical in `frontend/assets/js/timeline/timeline-era-heading-placement.js`.
- **Public consumers** import the canonical modules directly: `timeline-render.js`, `arbor-render.js`, `maps-render.js` and `timeline-era-heading-placement.js`.
- **Admin consumers** are classic scripts. Each canonical module has a same-named `*-bridge.js` that publishes it as a `window.Admin*` global.
- **Bridges that do more than re-export:** `cluster-placement-bridge.js` converts `Map` to plain object, `cluster-label-collision-bridge.js` measures and writes DOM positions, and `cluster-map-pins-bridge.js` fixes the zoom level. A bridge stays an adapter and holds no placement rules.

## Extending it

- **Tuning behaviour** (spacing, thresholds, tier boundaries): edit the canonical module. Then check the repeated constants in the second Invariants row.
- **Changing a module's exports:** update the matching bridge in the same commit. Search `admin/assets/js/` for the `window.Admin*` name to find every classic-script reader.
- **New cluster-affected visual:** add a module under `cluster-logic/`. Add a bridge only if an admin classic script needs it, and load that bridge in the admin page before its reader.

## Not documented here

Spacing values per density tier, the collision tier count and the offset distance
for parallel edges are in the canonical modules. They change most often.
