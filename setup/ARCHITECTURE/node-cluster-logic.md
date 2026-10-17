# Node cluster logic

When multiple events, evidence items, or map pins share a spatial coordinate,
they form a **cluster**. Timeline, arbor edges, and map pins all solve the same
problem — position dots/pins and labels so nothing overlaps while every item
stays visibly connected to its anchor — through one canonical implementation.

**Source of truth:** `frontend/assets/js/cluster-logic/` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/cluster-logic/*.js` (canonical) and `admin/assets/js/cluster-logic-bridge/*-bridge.js` (admin re-export layer); consumers in `frontend/assets/js/timeline/`, `frontend/assets/js/arbor/arbor-render.js`, `frontend/assets/js/maps/`, and their `admin/` counterparts.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| All cluster math lives in `frontend/assets/js/cluster-logic/`; nothing is reimplemented under `admin/` | One source of truth means the frontend and admin cannot drift apart | A second copy under `admin/` drifts from the first, and the two editors place nodes differently |
| Each `admin/assets/js/cluster-logic-bridge/*-bridge.js` only re-exports the matching canonical module as a `window.Admin*` global — it adds no logic of its own | Classic (non-module) admin scripts need a global, not an ES import; the bridge exists solely to reshape the export, not to compute anything | A bridge quietly grows its own logic and becomes a second implementation with the extra step of pretending not to be one |
| A bridge script loads before any classic script that reads its global | Classic admin scripts read `window.Admin*` at top level, synchronously | A load-order slip makes the admin editor throw "not available" at runtime with no compile-time warning |
| `timeline_offset_x`/`timeline_offset_y` and `arbor_edges.waypoints`, when present, override computed placement/routing identically on frontend and admin | The admin's escape hatch for pathological layouts | The per-file rule lives in the comments in `cluster-placement.js` and `edge-path.js` — this row is the cross-module pointer recording that both sides honour it |

## Shape

- **`cluster-density.js`** — zoom-level (px-per-period) → density tier (compact/normal/spread).
- **`cluster-placement.js`** — same-tier events stack around the spine; spread density also fans horizontally.
- **`cluster-labels.js`** + **`cluster-label-collision.js`** — tier + cluster size → full/truncated/hidden, then collision escalation pushes overlapping labels further out.
- **`cluster-map-pins.js`** — the map-pin equivalent of density/placement for geo-coordinate clusters (fans pins radially rather than vertically, since pins have no spine).
- **`edge-path.js`** (`computeEdgePath`) — orthogonal arbor edge routing, parallel-edge offsetting, waypoint override.
- Each has a same-named `*-bridge.js` under `admin/assets/js/cluster-logic-bridge/`, whose only job is exposing it as a `window.Admin*` global for classic scripts (`timeline-events.js`, `timeline-axis.js`, `arbor-edges.js`, etc.) — see the bridge-pattern precedent noted in those files (`admin-toasts.js`).
- Frontend consumers (`frontend/assets/js/timeline/`, `arbor/arbor-render.js`, `maps/`) import the canonical modules directly and are read-only; admin editors add drag-to-override/re-route on top via the bridges.

## Extending it

- **Tuning existing behaviour** (spacing, thresholds, tier boundaries): edit the single canonical module. Nothing else needs to change — that's the point of the bridge pattern.
- **Changing a module's exported shape** (new export, renamed function): update the matching `*-bridge.js` re-export in the same commit, and grep for the `window.Admin*` global name across `admin/assets/js/` to catch every classic-script consumer.
- **New cluster-affected visual**: add a module here rather than inventing a parallel implementation elsewhere, then add its bridge if admin needs a classic-script-facing global.

## Not documented here

Exact pixel spacings per density tier, the collision-escalation tier count, and
the horizontal-offset distance for parallel edges — all in the modules
themselves, and they're the numbers most likely to get tuned.
