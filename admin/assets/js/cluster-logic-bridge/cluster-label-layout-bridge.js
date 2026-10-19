// Re-export only — no logic here. See ARCHITECTURE/Website_guide.md, "Admin editors reuse public code through bridges".
/**
 * Admin timeline label-layout bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-label-layout.js as
 * `window.AdminTimelineClusterLabelLayout` for the classic admin script
 * timeline-events.js, so the editor places titles and draws their leader lines
 * with the code that the public timeline uses.
 *
 * Must load before timeline-events.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/cluster-label-layout-bridge
 */

import {
  DOT_CLEARANCE_PX,
  MAX_LABEL_STEPS,
  layoutLabelsBesideNodes,
  computeLeaderLine,
} from "/assets/js/cluster-logic/cluster-label-layout.js";

window.AdminTimelineClusterLabelLayout = {
  DOT_CLEARANCE_PX,
  MAX_LABEL_STEPS,
  layoutLabelsBesideNodes,
  computeLeaderLine,
};
