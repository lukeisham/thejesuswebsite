# Validation Checklist — arbor-edge-routing

**Plan:** `setup/PLANS/New/arbor-edge-routing.md`

## Code-level checks

### Path routing function

- [ ] `computeEdgePath()` exists in both `admin/assets/js/admin-arbor/arbor-edges.js` and `frontend/assets/js/arbor/arbor-render.js`.
- [ ] Functions are byte-identical (sync contract comment present).
- [ ] Handles vertical-aligned nodes (`|sx - tx| < 5px`) — returns straight `d` string.
- [ ] Handles orthogonal routing with `gap = 20px` and rounded corners.
- [ ] Handles `offsetIndex` — parallel edges alternate ±12px.
- [ ] Handles target-above-source case (cross-edges).

### Admin edge rendering

- [ ] `createEdgeElement()` uses `<path>` with `d` from `computeEdgePath()`, not `<line>`.
- [ ] `offsetIndex` computed correctly per `(source_id, target_id)` pair.
- [ ] `repositionEdgesForNode()` updates path `d` attribute on node drag.
- [ ] Temp line during right-drag uses dashed `<line>` (unchanged from current, cursor-tracking).

### Snap feedback

- [ ] `onEdgeDragMove()` checks `elementFromPoint` + `closest(".admin-arbor-node-group")`.
- [ ] Valid target → temp line turns green, target node gets `--connect-target` highlight.
- [ ] Leave target → temp line reverts, highlight removed.
- [ ] Fallback DOM walk for `data-node-id` if `closest` returns null.

### Frontend edge rendering

- [ ] `renderArbor()` edge loop uses `<path>` with `d` from `computeEdgePath()`, not `<line>`.
- [ ] `offsetIndex` computed per `(sourceId, targetId)` from adjacency.
- [ ] `pointer-events: none` on SVG edges layer preserved.

### CSS

- [ ] `.admin-arbor-edge` and `.arbor-edges path` have `fill: none; stroke-linejoin: round; stroke-linecap: round`.
- [ ] Snap highlight class `--connect-target` has gold outline styling.

## Behaviour checks

- [ ] **Single edge:** Source → target draws clean orthogonal path with rounded corners.
- [ ] **Two parallel edges (same source/target):** Paths offset by ±12px, run side-by-side without overlapping.
- [ ] **Three parallel edges:** Paths offset 0, +12, -12, clearly distinct.
- [ ] **Vertical-aligned nodes:** Path is a straight vertical line (no unnecessary detour).
- [ ] **Cross-edge (target above source):** Gap direction flipped, path still looks correct.
- [ ] **Right-click drag:** Temp line rubber-bands from source to cursor.
- [ ] **Hover over valid target:** Temp line turns green, target node highlights.
- [ ] **Hover over invalid target (self/source):** No highlight.
- [ ] **Release on target:** Connect menu opens, edge created, orthogonal path renders.
- [ ] **Node drag:** Connected edges smoothly follow (path `d` updated in real time).
- [ ] **Edge delete:** Right-click edge → confirm → edge removed, path disappears.
- [ ] **Frontend public page:** Edges render as orthogonal paths, no interaction (no snap/delete).

## Website guide

- [ ] `setup/Website_guide.md` "Node Cluster Logic" section has an Arbor subsection.
- [ ] Documents: edge routing algorithm, parallel offset, connection flow, parent derivation, admin vs frontend.

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (no new/removed public URLs).
