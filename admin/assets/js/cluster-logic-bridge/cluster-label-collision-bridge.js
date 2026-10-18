// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline cluster-label-collision bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-label-collision.js as
 * `window.AdminTimelineClusterLabelCollision`. The only reader is
 * admin-timeline/timeline-label-collision.js, which measures the label
 * elements and applies the resolved tiers. The shared constants
 * `LABEL_CLEARANCE_PCT` and `TIER_STEP_PCT` come from here so the editor and
 * the public page place labels with one value.
 *
 * Must load before timeline-label-collision.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/cluster-label-collision-bridge
 */

import {
  resolveLabelCollisions,
  tierShift,
  LABEL_GAP_PX,
  MAX_TIER,
  LABEL_CLEARANCE_PCT,
  TIER_STEP_PCT,
} from "/assets/js/cluster-logic/cluster-label-collision.js";

window.AdminTimelineClusterLabelCollision = {
  resolveLabelCollisions,
  tierShift,
  LABEL_GAP_PX,
  MAX_TIER,
  LABEL_CLEARANCE_PCT,
  TIER_STEP_PCT,
};
