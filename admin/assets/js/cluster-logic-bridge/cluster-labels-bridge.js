// Re-export only — no logic here. See ARCHITECTURE/Website_guide.md, "Admin editors reuse public code through bridges".
/**
 * Admin timeline cluster-labels bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-labels.js as
 * `window.AdminTimelineClusterLabels` for the classic admin script
 * timeline-events.js.
 *
 * Must load before timeline-events.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/cluster-labels-bridge
 */

import {
  LABEL_FULL,
  LABEL_TRUNCATED,
  LABEL_HIDDEN,
  computeLabelModes,
} from "/assets/js/cluster-logic/cluster-labels.js";

window.AdminTimelineClusterLabels = {
  LABEL_FULL,
  LABEL_TRUNCATED,
  LABEL_HIDDEN,
  computeLabelModes,
};
