/**
 * Admin timeline node bounds module.
 *
 * Pure functions (no DOM access) for clamping and converting timeline node
 * offset values. Used by timeline-node-drag.js to constrain manual
 * repositioning within the period slot and the canvas bounds.
 *
 * The clamp limits are not defined here: they come from
 * `window.AdminTimelineOffsets` (cluster-logic-bridge/timeline-offsets-bridge.js),
 * so the editor and the API agree on the range of a stored offset. The
 * conversion functions take the scale from the caller; timeline-node-drag.js
 * passes `AdminTimelineGeometry.BASE_PX_PER_PERIOD` and `CANVAS_HEIGHT_PX`.
 *
 * Offset ranges:
 *   - offsetX: fraction of period-slot width from slot centre. A drag stops at
 *     `DRAG_LIMIT_X` so the dot stays visually inside its slot.
 *   - offsetY: fraction of canvas height from the spine, within `OFFSET_LIMIT_Y`.
 *
 * @module admin-timeline/timeline-node-bounds
 */

window.AdminTimelineNodeBounds = {};

(function () {
  var self = window.AdminTimelineNodeBounds;

  /* ── Clamping helpers ──────────────────────────────────────────────────────── */

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

  /* ── Conversion helpers ────────────────────────────────────────────────────── */

  /**
   * Convert a pixel offset relative to the period-slot centre to a fractional
   * offset (how many period slots to move).
   *
   * @param {number} pixelDelta - pixels to move (e.g., from mouse drag delta)
   * @param {number} pxPerPeriod - pixels per period slot on the current scale
   * @returns {number} fractional offset [-0.5, 0.5]
   */
  self.pixelToOffsetX = function (pixelDelta, pxPerPeriod) {
    if (!pxPerPeriod || pxPerPeriod <= 0) return 0;
    return pixelDelta / pxPerPeriod;
  };

  /**
   * Convert a fractional offsetX back to pixels relative to the period-slot centre.
   *
   * @param {number} fraction - fractional offset
   * @param {number} pxPerPeriod - pixels per period slot on the current scale
   * @returns {number} pixel offset
   */
  self.offsetXToPixel = function (fraction, pxPerPeriod) {
    if (!pxPerPeriod || pxPerPeriod <= 0) return 0;
    return fraction * pxPerPeriod;
  };

  /**
   * Convert a pixel offset relative to the spine to a fractional offset
   * (fraction of canvas height).
   *
   * @param {number} pixelDelta - pixels to move (e.g., from mouse drag delta)
   * @param {number} canvasHeight - total height of the canvas in pixels
   * @returns {number} fractional offset of canvas height
   */
  self.pixelToOffsetY = function (pixelDelta, canvasHeight) {
    if (!canvasHeight || canvasHeight <= 0) return 0;
    return pixelDelta / canvasHeight;
  };

  /**
   * Convert a fractional offsetY back to pixels relative to the spine.
   *
   * @param {number} fraction - fractional offset
   * @param {number} canvasHeight - total height of the canvas in pixels
   * @returns {number} pixel offset
   */
  self.offsetYToPixel = function (fraction, canvasHeight) {
    if (!canvasHeight || canvasHeight <= 0) return 0;
    return fraction * canvasHeight;
  };
})();
