// Re-export only — no logic here. See ARCHITECTURE/Website_guide.md, "Admin editors reuse public code through bridges".
/**
 * Admin timeline bridge.
 *
 * Publishes the six timeline modules of frontend/assets/js/ — cluster-density,
 * cluster-placement, cluster-labels, cluster-label-layout, timeline-offsets
 * and timeline-era-heading-placement — as the `window.Admin*` globals that the
 * classic admin scripts read: timeline-events.js (all six), timeline-axis.js
 * (era heading layout), timeline-node-drag.js (offsets, density) and
 * timeline-node-bounds.js (offsets). The public renderer imports the same
 * modules, so a node dropped in the editor shows at the same spot on the
 * public timeline.
 *
 * Must load before those scripts (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/timeline-bridge
 */

import { DENSITY_SPREAD, getClusterDensity } from "/assets/js/cluster-logic/cluster-density.js";
import { computeDotPositions } from "/assets/js/cluster-logic/cluster-placement.js";
import { computeLabelModes } from "/assets/js/cluster-logic/cluster-labels.js";
import { DOT_CLEARANCE_PX, layoutLabelsBesideNodes, computeLeaderLine } from "/assets/js/cluster-logic/cluster-label-layout.js";
import { offsetXToPixels, pixelsToOffsetX, offsetYToPixels, pixelsToOffsetY, boxPixelsToCrossAxisPixels, crossAxisToTopPercent, topPercentToCrossAxis, clampDragOffsetX, clampOffsetY } from "/assets/js/cluster-logic/timeline-offsets.js";
import { computeEraBandLayout } from "/assets/js/timeline/timeline-era-heading-placement.js";

window.AdminTimelineClusterDensity = {
  DENSITY_SPREAD,
  getClusterDensity,
};

window.AdminTimelineClusterPlacement = { computeDotPositions };

window.AdminTimelineClusterLabels = { computeLabelModes };

window.AdminTimelineClusterLabelLayout = {
  DOT_CLEARANCE_PX,
  layoutLabelsBesideNodes,
  computeLeaderLine,
};

window.AdminTimelineOffsets = {
  offsetXToPixels,
  pixelsToOffsetX,
  offsetYToPixels,
  pixelsToOffsetY,
  boxPixelsToCrossAxisPixels,
  crossAxisToTopPercent,
  topPercentToCrossAxis,
  clampDragOffsetX,
  clampOffsetY,
};

window.AdminTimelineEraHeadingPlacement = { computeEraBandLayout };
