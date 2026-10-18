// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin arbor edge-path bridge.
 *
 * Publishes `computeEdgePath` from frontend/assets/js/cluster-logic/edge-path.js
 * as `window.AdminArborComputeEdgePath` for admin-arbor/arbor-edges.js. Both
 * that file and the public arbor-render.js pass `edge.waypoints`, so an edge
 * takes the same route in the editor and on the public page.
 *
 * Must load before arbor-edges.js (admin/diagrams/arbor.html).
 *
 * @module cluster-logic-bridge/edge-path-bridge
 */

import { computeEdgePath } from "/assets/js/cluster-logic/edge-path.js";

window.AdminArborComputeEdgePath = computeEdgePath;
