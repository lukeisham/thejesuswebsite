/**
 * Admin timeline node bounds module.
 *
 * Pure functions (no DOM access) that clamp a timeline node's offsets while it
 * is dragged. Called by timeline-node-drag.js.
 *
 * The limits are not defined here: they come from `window.AdminTimelineOffsets`
 * (cluster-logic-bridge/timeline-offsets-bridge.js), so the editor and the API
 * agree on the range of a stored offset.
 *
 * - offsetX is a fraction of the period slot from its centre. A drag stops at
 *   `DRAG_LIMIT_X`, so the dot stays visually inside its slot.
 * - offsetY is a fraction of the canvas height from the spine, within
 *   `OFFSET_LIMIT_Y`.
 *
 * @module admin-timeline/timeline-node-bounds
 */

window.AdminTimelineNodeBounds = {};

(function () {
  var self = window.AdminTimelineNodeBounds;

  /**
   * Clamp offsetX so the dot never visually exceeds its period slot boundary.
   *
   * @param {number} fraction - offset fraction
   * @returns {number} the fraction, limited to `DRAG_LIMIT_X` either way
   */
  self.clampOffsetX = function (fraction) {
    return window.AdminTimelineOffsets.clampDragOffsetX(fraction);
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
