// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline cluster-density bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/cluster-density.js as
 * `window.AdminTimelineClusterDensity` for the classic admin scripts
 * timeline-events.js and timeline-node-drag.js. Callers pass the effective
 * px-per-period, `BASE_PX_PER_PERIOD` × the zoom scale from
 * `AdminTimelineZoom.effectivePxPerPeriod()`, so the tiers match the public page.
 *
 * Must load before the scripts that read the global (admin/diagrams/timeline.html).
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
  getClusterDensity,
};
