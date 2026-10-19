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
   * The API stores up to `OFFSET_LIMIT_X`, wider than `DRAG_LIMIT_X`. A dot saved
   * out there keeps its own start as the limit, so grabbing it does not pull it
   * back across the slot. It can still move inwards.
   *
   * @param {number} fraction - offset fraction
   * @param {number} [startFraction] - the offset where the drag began
   * @returns {number} the fraction, limited either way to `DRAG_LIMIT_X` or to the start, whichever is wider
   */
  self.clampOffsetX = function (fraction, startFraction) {
    var Offsets = window.AdminTimelineOffsets;
    var limit = Math.max(Offsets.DRAG_LIMIT_X, Math.abs(startFraction || 0));
    limit = Math.min(limit, Offsets.OFFSET_LIMIT_X);
    return Math.max(-limit, Math.min(limit, fraction));
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
