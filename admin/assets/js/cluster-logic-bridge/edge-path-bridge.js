/**
 * Admin arbor edge-path bridge.
 *
 * Re-exposes the canonical frontend/assets/js/cluster-logic/edge-path.js
 * computeEdgePath() as window.AdminArborComputeEdgePath — a global classic
 * admin scripts (arbor-edges.js, arbor-edge-reroute.js) can call without
 * needing a second, hand-copied implementation (JS-3, bridge pattern).
 *
 * Must load (type="module") BEFORE arbor-edges.js.
 *
 * @module cluster-logic-bridge/edge-path-bridge
 */

import { computeEdgePath } from "/assets/js/cluster-logic/edge-path.js";

window.AdminArborComputeEdgePath = computeEdgePath;
