/**
 * Admin timeline node bounds module.
 *
 * Clamps a timeline node's offsets while it is dragged. Called by
 * timeline-node-drag.js on every pointer move and on drop.
 *
 * Both clamps delegate to `window.AdminTimelineOffsets`
 * (cluster-logic-bridge/timeline-bridge.js, which must load first; the call
 * happens at drag time and has no guard). The limits therefore come from
 * cluster-logic/timeline-offsets.js, the same module whose limits the API
 * matches in `validateOffsets` (setup/ARCHITECTURE/timeline.md, row 2); no
 * limit arithmetic lives here.
 *
 * - offsetX is a fraction of the period slot from its centre. A drag stops at
 *   `DRAG_LIMIT_X`, so the dot stays inside its slot. A dot saved further out
 *   keeps its own start as the limit, so grabbing it does not pull it back
 *   across the slot; it can still move inwards.
 * - offsetY is a fraction of the canvas height from the spine, limited to the
 *   range the API stores.
 *
 * @module admin-timeline/timeline-node-bounds
 */

window.AdminTimelineNodeBounds = {};

(function () {
  var Bounds = window.AdminTimelineNodeBounds;

  /**
   * @param {number} fraction - offset fraction
   * @param {number} [startFraction] - the offset where the drag began
   * @returns {number} the fraction, clamped by `clampDragOffsetX`
   */
  Bounds.clampOffsetX = function (fraction, startFraction) {
    return window.AdminTimelineOffsets.clampDragOffsetX(fraction, startFraction);
  };

  /**
   * @param {number} fraction - offset fraction
   * @returns {number} the fraction, limited to `OFFSET_LIMIT_Y` either way
   */
  Bounds.clampOffsetY = function (fraction) {
    return window.AdminTimelineOffsets.clampOffsetY(fraction);
  };
})();
