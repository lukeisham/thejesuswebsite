/**
 * Admin timeline node bounds module.
 *
 * Pure functions (no DOM access) for clamping and converting timeline node
 * offset values. Used by the drag handler to constrain manual repositioning
 * within the period slot and the canvas bounds.
 *
 * Offset ranges:
 *   - offsetX: fraction of period-slot width from slot centre [-0.5, 0.5],
 *     clamped to ±0.45 so the dot stays visually inside its slot.
 *   - offsetY: fraction of canvas height from the spine [-0.4, 0.4].
 *
 * @module admin-timeline/timeline-node-bounds
 */

window.AdminTimelineNodeBounds = {};

(function () {
  var self = window.AdminTimelineNodeBounds;

  /* ── Clamping helpers ──────────────────────────────────────────────────────── */

  /**
   * Clamp offsetX to the safe range [-0.45, 0.45] so the dot never visually
   * exceeds its period slot boundary.
   *
   * @param {number} fraction - offset fraction in range [-0.5, 0.5]
   * @returns {number} clamped fraction in range [-0.45, 0.45]
   */
  self.clampOffsetX = function (fraction) {
    var margin = 0.45;
    if (fraction < -margin) return -margin;
    if (fraction > margin) return margin;
    return fraction;
  };

  /**
   * Clamp offsetY to the safe range [-0.4, 0.4] so the dot never visually
   * exceed the canvas bounds.
   *
   * @param {number} fraction - offset fraction in range [-0.4, 0.4]
   * @returns {number} clamped fraction in range [-0.4, 0.4]
   */
  self.clampOffsetY = function (fraction) {
    var max = 0.4;
    if (fraction < -max) return -max;
    if (fraction > max) return max;
    return fraction;
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
