// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline offset-maths bridge.
 *
 * Publishes frontend/assets/js/cluster-logic/timeline-offsets.js as
 * `window.AdminTimelineOffsets` for the classic admin scripts timeline-events.js,
 * timeline-node-drag.js and timeline-node-bounds.js. The public renderer imports
 * the same module, so a node dropped in the editor shows at the same spot on the
 * public timeline.
 *
 * Must load before those scripts (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/timeline-offsets-bridge
 */

import {
  OFFSET_LIMIT_X,
  OFFSET_LIMIT_Y,
  DRAG_LIMIT_X,
  offsetXToPixels,
  pixelsToOffsetX,
  offsetYToPixels,
  pixelsToOffsetY,
  crossAxisToTopPercent,
  clampDragOffsetX,
  clampOffsetY,
} from "/assets/js/cluster-logic/timeline-offsets.js";

window.AdminTimelineOffsets = {
  OFFSET_LIMIT_X,
  OFFSET_LIMIT_Y,
  DRAG_LIMIT_X,
  offsetXToPixels,
  pixelsToOffsetX,
  offsetYToPixels,
  pixelsToOffsetY,
  crossAxisToTopPercent,
  clampDragOffsetX,
  clampOffsetY,
};
