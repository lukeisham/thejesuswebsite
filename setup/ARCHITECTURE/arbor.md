# Arbor

Evidence is shown as a network, so a reader sees how items connect and support each other. An admin chooses the nodes and the links between them. The editor and the public page then draw the same network.

**Source of truth:** `frontend/assets/js/cluster-logic/edge-path.js` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/edge-path.js`, `frontend/assets/js/arbor/arbor-render.js`, `admin/assets/js/admin-arbor/arbor-edges.js`, `admin/assets/js/cluster-logic-bridge/edge-path-bridge.js`, `admin/diagrams/arbor.html`.

## Invariants

Guide test: `api/tests/guide-arbor.test.js`. Its row numbers match the rows below.
The rules for how the admin editor reuses the public modules (bridges, pure modules) are in `setup/ARCHITECTURE/Website_guide.md`, under "Cross-module patterns".

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | Both arbor callers pass `edge.waypoints` to `computeEdgePath()`: `arbor-render.js` and `arbor-edges.js` (through the `window.AdminArborComputeEdgePath` bridge) | A present `waypoints` array replaces the computed parallel-edge offset | An edge shows one route in the editor and another route on the public page |

## Shape

- **Edge path:** `computeEdgePath` in `cluster-logic/edge-path.js` returns the route of one edge. With no `waypoints` it offsets parallel edges from each other. With a `waypoints` array it follows the points that the admin set.
- **Public:** `arbor-render.js` imports `computeEdgePath` directly.
- **Admin:** `arbor-edges.js` reads it through `edge-path-bridge.js`. The bridge publishes the function as `window.AdminArborComputeEdgePath`.

## Extending it

- **A change to the edge route:** edit `edge-path.js` only. Both sides then show it. Check row 1.

## Not documented here

The offset distance for parallel edges is in `edge-path.js`. It changes most often.
