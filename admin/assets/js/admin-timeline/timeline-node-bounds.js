/**
 * Admin timeline node bounds module.
 *
 * Pure functions (no DOM access) that clamp a timeline node's offsets while it
 * is dragged. Called by timeline-node-drag.js.
 *
 * Both clamps delegate to `window.AdminTimelineOffsets`
 * (cluster-logic-bridge/timeline-bridge.js), so the editor and the API
 * agree on the range of a stored offset; no limit arithmetic lives here.
 *
 * - offsetX is a fraction of the period slot from its centre. A drag stops at
 *   the slot edge, so the dot stays visually inside its slot. A dot saved
 *   further out keeps its own start as the limit, so grabbing it does not pull
 *   it back across the slot; it can still move inwards.
 * - offsetY is a fraction of the canvas height from the spine, within the
 *   range the API stores.
 *
 * @module admin-timeline/timeline-node-bounds
 */

window.AdminTimelineNodeBounds = {};

(function () {
  var self = window.AdminTimelineNodeBounds;

  /**
   * Clamp offsetX so the dot never visually exceeds its period slot boundary.
   * The shared clamp (AdminTimelineOffsets.clampDragOffsetX) widens the limit
   * to the start offset when the dot was saved past the drag limit, so grabbing
   * it does not pull it back across the slot; it can still move inwards.
   *
   * @param {number} fraction - offset fraction
   * @param {number} [startFraction] - the offset where the drag began
   * @returns {number} the fraction, clamped by the shared rule
   */
  self.clampOffsetX = function (fraction, startFraction) {
    return window.AdminTimelineOffsets.clampDragOffsetX(fraction, startFraction);
  };

  /**
   * Clamp offsetY so the dot never visually exceeds the canvas bounds.
   *
   * @param {number} fraction - offset fraction
   * @returns {number} the fraction, limited to `OFFSET_LIMIT_Y` either way
   */
  self.clampOffsetY = function (fraction) {
    return window.AdminTimelineOffsets.clampOffsetY(fraction);
  };
})();
