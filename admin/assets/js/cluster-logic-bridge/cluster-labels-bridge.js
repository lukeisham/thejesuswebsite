/**
 * Admin timeline cluster-labels bridge.
 *
 * Re-exposes the canonical frontend/assets/js/cluster-logic/cluster-labels.js
 * module as the window.AdminTimelineClusterLabels global that
 * timeline-events.js already expects (JS-3, bridge pattern). Descriptor and
 * return array shapes match the canonical module exactly, so no conversion
 * is needed here (unlike cluster-placement-bridge.js).
 *
 * Must load (type="module") BEFORE timeline-axis.js / timeline-events.js.
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
  computeLabelModes: function (descriptors, densityTier) {
    return computeLabelModes(descriptors, densityTier);
  },
};
