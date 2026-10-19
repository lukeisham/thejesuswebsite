// Re-export only — no logic here. See ARCHITECTURE/Website_guide.md, "Admin editors reuse public code through bridges".
/**
 * Admin map-pin clustering bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-map-pins.js as
 * `window.AdminMapsClusterPins` for admin-maps/maps-pins.js. The editor has no
 * zoom, so maps-pins.js omits the zoom argument and the canonical default
 * (1.0, the "normal" spacing tier) applies.
 *
 * Must load before maps-pins.js (admin/diagrams/maps.html).
 *
 * @module cluster-logic-bridge/cluster-map-pins-bridge
 */

import {
  PROXIMITY_THRESHOLD,
  detectClusters,
  getZoomScaledSpacing,
  computeRadialOffset,
  computePinOffsets,
  computePinLabelModes,
} from "/assets/js/cluster-logic/cluster-map-pins.js";

window.AdminMapsClusterPins = {
  PROXIMITY_THRESHOLD,
  detectClusters,
  getZoomScaledSpacing,
  computeRadialOffset,
  computePinOffsets,
  computePinLabelModes,
};
