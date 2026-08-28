// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline cluster-density bridge.
 *
 * Re-exposes the canonical frontend/assets/js/cluster-logic/cluster-density.js
 * module as the window.AdminTimelineClusterDensity global that classic admin
 * scripts (timeline-events.js, timeline-axis.js) already expect — same shape
 * as the old admin-only copy, sourced from one implementation instead of two
 * (JS-3, bridge pattern precedent: admin-toasts.js).
 *
 * The `pxPerPeriod` parameter should now be the effective px-per-period
 * (BASE_PX_PER_PERIOD × current zoom scale), obtained from
 * AdminTimelineZoom.effectivePxPerPeriod(). This preserves the existing
 * density tier thresholds while working with the new transform-based zoom.
 *
 * Must load (type="module", still runs deferred) BEFORE any classic script
 * that reads window.AdminTimelineClusterDensity at top level.
 *
 * @module cluster-logic-bridge/cluster-density-bridge
 */

import {
  DENSITY_COMPACT,
  DENSITY_NORMAL,
  DENSITY_SPREAD,
  THRESHOLDS,
  getClusterDensity,
} from "/assets/js/cluster-logic/cluster-density.js";

window.AdminTimelineClusterDensity = {
  DENSITY_COMPACT,
  DENSITY_NORMAL,
  DENSITY_SPREAD,
  THRESHOLDS,
  getClusterDensity: function (events, pxPerPeriod) {
    return getClusterDensity(events, pxPerPeriod);
  },
};
