// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline cluster-placement bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-placement.js as
 * `window.AdminTimelineClusterPlacement` for the classic admin script
 * timeline-events.js. The canonical function takes and returns a `Map`
 * (period -> events), so the caller builds and reads a `Map`.
 *
 * Must load before timeline-events.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/cluster-placement-bridge
 */

import { computeDotPositions } from "/assets/js/cluster-logic/cluster-placement.js";

window.AdminTimelineClusterPlacement = { computeDotPositions };
