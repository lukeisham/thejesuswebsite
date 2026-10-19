# Node cluster logic

When several events, evidence items or map pins share a spatial coordinate, they
form a **cluster**. The timeline, the arbor edges and the map pins all place dots
and labels so that nothing overlaps and every item stays linked to its anchor.
They use one canonical implementation.

**Source of truth:** `frontend/assets/js/cluster-logic/` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/*.js` (canonical), `admin/assets/js/cluster-logic-bridge/*-bridge.js` (admin re-exports), `frontend/assets/js/timeline/timeline-era-heading-placement.js`, `frontend/assets/js/timeline/timeline-render.js`, `frontend/assets/js/timeline/timeline-geometry.js`, `frontend/assets/js/arbor/arbor-render.js`, `frontend/assets/js/maps/maps-render.js`, `admin/assets/js/admin-timeline/timeline-events.js`, `admin/assets/js/admin-timeline/timeline-node-drag.js`, `admin/assets/js/admin-timeline/timeline-geometry.js`, `admin/assets/js/admin-arbor/arbor-edges.js`, `admin/assets/js/admin-maps/maps-pins.js`, `admin/diagrams/timeline.html`, `admin/diagrams/arbor.html`, `admin/diagrams/maps.html`.

## Invariants

Guide test: `api/tests/guide-node-cluster-logic.test.js`. Its row numbers match the rows below.
Bridge behaviour test: `admin/tests/cluster-logic-bridges.test.js`.

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | Cluster math lives only in `frontend/assets/js/cluster-logic/`. Each admin bridge is a pure re-export: it imports names and publishes them as one `window.Admin*` global. It holds no function, no constant and no renamed export | The public pages and the admin editors must place nodes the same way | A bridge with logic is a second copy of a rule. The editor shows positions that the public page does not |
| 2 | `timeline-render.js` and the admin `timeline-events.js` place labels with `layoutLabelsBesideNodes` and draw leader lines with `computeLeaderLine`, both from `cluster-logic/cluster-label-layout.js` (the admin editor through `window.AdminTimelineClusterLabelLayout`). The module uses no `document` or `window` | A title must sit in the editor where it sits on the public page, and the search for a free spot must be one piece of code | A copy of the search drifts: the editor shows a title in one place and the public page in another |
| 3 | `BASE_PX_PER_PERIOD` and `TIMELINE_CANVAS_HEIGHT_PX` in `timeline-geometry.js` equal `BASE_PX_PER_PERIOD` and `CANVAS_HEIGHT_PX` in the admin `timeline-geometry.js`. The limits `OFFSET_LIMIT_X` and `OFFSET_LIMIT_Y` in `cluster-logic/timeline-offsets.js` equal the clamps in `validateOffsets` in `api/models/evidence.model.js`. The admin `#timeline-axis` is `CANVAS_HEIGHT_PX` tall | A stored `timeline_offset_x` is a fraction of one period slot (`BASE_PX_PER_PERIOD`). A stored `timeline_offset_y` is a fraction of the canvas height (`CANVAS_HEIGHT_PX`). The API and the editor accept the same range | A node dragged to one spot in the editor shows at another spot on the public timeline, or the API silently clamps a value that the editor allows |
| 4 | `timeline-render.js`, `timeline-events.js` and `timeline-node-drag.js` convert offsets only through `cluster-logic/timeline-offsets.js` (the admin files through `window.AdminTimelineOffsets`). None holds a bare `280` or the formula `50 + y / 2`. A stored `timeline_offset_x` means "along the time axis" and `timeline_offset_y` means "across it" in both the horizontal and the vertical (mobile) layout | Same reason as row 3 | A copy of the mapping drifts from the shared one, or a layout swaps the two offsets |
| 5 | In each `admin/diagrams/*.html` page, a bridge `<script>` comes before every script that reads its global | Scripts run in document order | A reader throws on a missing global, or skips its work |
| 6 | A script reads only the names that its bridge exports | A reader of a name that no bridge exports gets `undefined` | A label, step or mode becomes `NaN` or `undefined` |
| 7 | Both arbor callers pass `edge.waypoints` to `computeEdgePath()`: `arbor-render.js` and `arbor-edges.js` (through the `window.AdminArborComputeEdgePath` bridge) | A present `waypoints` array replaces the computed parallel-edge offset | An edge shows one route in the editor and another route on the public page |
| 8 | The four `--timeline-heading-*` tokens are equal in `frontend/assets/css/base/variables.css` and `admin/assets/css/admin-diagrams/timeline-tokens.css`. `ERA_BAND_LANES` in `timeline-era-heading-placement.js` equals the lane count in both heading stylesheets | The era heading band is laid out in JS and sized in CSS, on both sides | A heading sits on the bar, or a third lane is cut off |
| 9 | `cluster-logic/timeline-zoom-stacks.js` uses no `document` or `window`, and no file under `admin/` uses it. `STACK_SPACING_PX` equals `--timeline-stack-spacing` in `variables.css`. The public timeline stacks nodes when zoomed out; the admin editor always shows exact dots | An admin must drag the exact dot. The stack column and the CSS box must be the same height | Stack dots and the stack button drift apart, or the editor shows stacks that cannot be dragged |

## Shape

- **Canonical:** `frontend/assets/js/cluster-logic/` holds density, placement, labels, label collision, map pins and edge path. Era-heading placement is canonical in `frontend/assets/js/timeline/timeline-era-heading-placement.js`.
- **Public consumers** import the canonical modules directly: `timeline-render.js`, `arbor-render.js`, `maps-render.js` and `timeline-era-heading-placement.js`.
- **Offset maths:** `cluster-logic/timeline-offsets.js` holds the pixel conversion, the `top` percentage mapping and the clamp limits for a stored node offset. The admin editor reads it through `timeline-offsets-bridge.js`. `timeline-node-bounds.js` takes its clamps from the same bridge.
- **Admin consumers** are classic scripts. Each canonical module has a same-named `*-bridge.js` that publishes it as a `window.Admin*` global.
- **Era heading band:** on the horizontal layout the headings sit in a band at the top of the canvas, outside the zoomed world. `computeEraBandLayout` (in `timeline-era-heading-placement.js`) assigns lanes from measured heading widths and the zoom. The public `timeline-render.js` (`renderEraBand`) and the admin `timeline-events.js` (`Events.renderEraBand`) build the band, and each keeps it in step with pan and zoom through its zoom module's `onTransformChange`. The vertical (mobile) layout keeps headings in the world and uses `computeEraHeadingPositions`.
- **Zoom stacks (public only):** zoomed out, nodes within `STACK_MERGE_PX` on screen gather in a column at their mean position, with a count button (`.timeline-stack`) over the column. From the zoom `STACK_BLEND_END` (the default zoom, 1) every node sits at its exact stored position; between `STACK_BLEND_START` and `STACK_BLEND_END` each node moves from its stack spot to its exact spot. `computeZoomStacks` works in world pixels; `timeline-render.js` (`applyZoomStacks`) moves the dots, builds the buttons and places the labels again after each zoom. A stack button zooms to its events (`fitStackView`, `timeline-interactions.js`). The vertical (mobile) layout has no zoom and no stacks.
- **Admin drag:** `timeline-node-drag.js` keeps the dot under the pointer: it divides pointer distances by the zoom scale and converts them with `window.AdminTimelineOffsets`. While a node moves it calls `Events.relayoutLabels`, which places every label again, so titles move out of each other's way and keep their leader lines. A drop stages the offsets in `timeline-staged-changes.js`, whose save button shows the count.
- **Label layout:** on the horizontal layout each title starts just right of its dot, then tries the left side, then moves up or down in steps and gets a leader line from the start of its name to the dot. Every dot is an obstacle. `layoutLabelsBesideNodes` works in pixels of the dot field (`TIMELINE_CANVAS_HEIGHT_PX` tall). The public `timeline-render.js` (`layoutHorizontalLabels`) and the admin `timeline-events.js` (`Events.relayoutLabels`) measure the labels and apply the result. The vertical (mobile) layout keeps `cluster-label-collision.js`, which also serves the mobile era headings.
- **Plain object and `Map`:** `computeDotPositions` takes and returns a `Map` (period to events). `timeline-events.js` builds and reads a `Map`.

## Extending it

- **Tuning behaviour** (spacing, thresholds, tier boundaries): edit the canonical module. Then check rows 2 and 3.
- **Changing a module's exports:** update the matching bridge in the same commit. The bridge test and guide test rows 1 and 6 name any reader that now breaks.
- **Adapter logic** (DOM measuring, data-shape conversion) goes into the canonical module or the admin caller. It never goes into a bridge.
- **New cluster-affected visual:** add a module under `cluster-logic/`. Add a bridge only if an admin classic script needs it, and load that bridge in the admin page before its reader.

## Not documented here

Spacing values per density tier, the collision tier count and the offset distance
for parallel edges are in the canonical modules. They change most often.
