// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin map-pin clustering bridge.
 *
 * Re-exposes the canonical frontend/assets/js/cluster-logic/cluster-map-pins.js
 * as the window.AdminMapsClusterPins global that maps-pins.js consumes
 * (JS-3, bridge pattern — see edge-path-bridge.js).
 *
 * The admin editor has no zoom concept, so this bridge always calls the
 * canonical functions with the fixed default zoomLevel (1.0 — "normal"
 * spacing tier); there is no shape mismatch to adapt here, unlike
 * cluster-placement-bridge.js's Map/plain-object conversion.
 *
 * Must load (type="module") BEFORE maps-pins.js.
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
