/**
 * Timeline offset maths.
 *
 * A node's stored position is two fractions, `timeline_offset_x` and
 * `timeline_offset_y`, set by dragging in the admin timeline editor:
 *
 * - `timeline_offset_x` moves the node along the time axis, as a fraction of
 *   one period slot (`BASE_PX_PER_PERIOD` pixels), from the slot centre.
 * - `timeline_offset_y` moves the node across the axis, as a fraction of the
 *   canvas height (`TIMELINE_CANVAS_HEIGHT_PX` pixels), from the spine. The
 *   renderers place the dot at `top: 50% + (offset_y x TIMELINE_CANVAS_HEIGHT_PX / 2)%`
 *   of the inner box (the pixel value divided by 2, read as a percentage), so
 *   the unit is not a true share of the height; it is the mapping that stored
 *   values already use.
 *
 * The public renderer (frontend/assets/js/timeline/timeline-render.js) and the
 * admin editor (admin/assets/js/admin-timeline/timeline-events.js and
 * timeline-node-drag.js, through cluster-logic-bridge/timeline-bridge.js)
 * must convert with these functions, or a node dropped at one spot in the
 * editor shows at another spot on the public page. Changing the mapping moves
 * every stored node.
 *
 * `crossAxisToVerticalLeftPx` is the exception to the admin bridge: only the
 * public vertical (mobile) layout calls it, and the editor has no vertical
 * layout, so timeline-bridge.js does not publish it.
 *
 * `api/models/evidence.model.js` clamps the stored values to the same limits
 * (`validateOffsets`); api/tests/guide-timeline.test.js fails when the
 * two sets of numbers differ.
 *
 * @module cluster-logic/timeline-offsets
 */

import {
  BASE_PX_PER_PERIOD,
  TIMELINE_CANVAS_HEIGHT_PX,
} from "../timeline/timeline-geometry.js";

/** Largest absolute `timeline_offset_x` the API stores. */
export const OFFSET_LIMIT_X = 0.5;

/** Largest absolute `timeline_offset_y` the API stores. */
export const OFFSET_LIMIT_Y = 0.4;

/** Largest absolute `timeline_offset_x` the editor lets a drag reach, so a dot
 * stays inside its own period slot (a stored value may be wider). */
export const DRAG_LIMIT_X = 0.45;

/**
 * Pixels along the time axis, from the slot centre, for a stored x offset.
 *
 * @param {number} offsetX - `timeline_offset_x`, a fraction of one period slot
 * @returns {number} pixels at world scale 1
 */
export function offsetXToPixels(offsetX) {
  return offsetX * BASE_PX_PER_PERIOD;
}

/**
 * Stored x offset for a pixel distance along the time axis from the slot centre.
 *
 * @param {number} pixels - distance at world scale 1
 * @returns {number} `timeline_offset_x`
 */
export function pixelsToOffsetX(pixels) {
  return pixels / BASE_PX_PER_PERIOD;
}

/**
 * Pixels across the axis, from the spine, for a stored y offset. The renderers
 * call this value `yOffset` (horizontal layout) or `xOffset` (vertical layout).
 *
 * @param {number} offsetY - `timeline_offset_y`, a fraction of the canvas height
 * @returns {number} pixels at world scale 1
 */
export function offsetYToPixels(offsetY) {
  return offsetY * TIMELINE_CANVAS_HEIGHT_PX;
}

/**
 * Stored y offset for a pixel distance across the axis from the spine.
 *
 * @param {number} pixels - distance at world scale 1
 * @returns {number} `timeline_offset_y`
 */
export function pixelsToOffsetY(pixels) {
  return pixels / TIMELINE_CANVAS_HEIGHT_PX;
}

/**
 * Cross-axis pixels for a distance measured on screen inside the dot field.
 * A dot at `crossAxisToTopPercent(c)` moves `c / 2` percent of the field height
 * for `c` cross-axis pixels, so a pointer that moves `boxPixels` must change the
 * value by `boxPixels x 200 / field height`. The editor's drag uses this to keep
 * the dot under the pointer.
 *
 * @param {number} boxPixels - distance in world pixels (screen distance divided by the zoom scale)
 * @returns {number} cross-axis pixels, the unit of `offsetYToPixels`
 */
export function boxPixelsToCrossAxisPixels(boxPixels) {
  return (boxPixels * 200) / TIMELINE_CANVAS_HEIGHT_PX;
}

/**
 * CSS `top` percentage of the inner box for a dot that sits `crossAxisPixels`
 * from the spine. The spine is at 50%. This is the mapping that stored
 * `timeline_offset_y` values already use (see the module comment).
 *
 * @param {number} crossAxisPixels - result of `offsetYToPixels`, or a cluster offset
 * @returns {number} percentage, for `top: ${value}%`
 */
export function crossAxisToTopPercent(crossAxisPixels) {
  return 50 + crossAxisPixels / 2;
}

/**
 * Cross-axis pixels for a dot shown at `topPercent`: the inverse of
 * `crossAxisToTopPercent`. `timeline-node-drag.js` reads a dot's current `top`
 * with this, so a drag starts from the spot the dot is drawn at.
 *
 * @param {number} topPercent - the dot's CSS `top`, as a percentage of the inner box
 * @returns {number} cross-axis pixels, the unit of `offsetYToPixels`
 */
export function topPercentToCrossAxis(topPercent) {
  return (topPercent - 50) * 2;
}

/**
 * Pixels right of the spine for a dot on the vertical (mobile) layout. The
 * vertical layout keeps the same axes as the horizontal one, so the stored
 * cross-axis offset moves the dot sideways, at half scale to fit a phone. The
 * half is the same `/ 2` that `crossAxisToTopPercent` applies. Called by
 * `buildVerticalLayout` in timeline/timeline-render.js.
 *
 * @param {number} crossAxisPixels - result of `offsetYToPixels`, or a cluster offset
 * @returns {number} pixels, for `left: calc(50% + ${value}px)`
 */
export function crossAxisToVerticalLeftPx(crossAxisPixels) {
  return crossAxisPixels / 2;
}

/**
 * Clamp an x offset to what a drag may reach.
 *
 * The limit is `DRAG_LIMIT_X`, or the absolute start offset if that is larger,
 * never more than `OFFSET_LIMIT_X`. A dot saved past the drag limit keeps its
 * start as the limit, so grabbing it does not pull it back across the slot; it
 * can still move inwards.
 *
 * @param {number} offsetX - the offset the drag proposes
 * @param {number} [startOffsetX] - the stored offset where the drag began
 * @returns {number} a value in [-limit, limit], where limit is `DRAG_LIMIT_X` or
 *   the absolute start, whichever is larger, capped at `OFFSET_LIMIT_X`
 */
export function clampDragOffsetX(offsetX, startOffsetX) {
  const limit = Math.min(
    OFFSET_LIMIT_X,
    Math.max(DRAG_LIMIT_X, Math.abs(startOffsetX || 0)),
  );
  return Math.max(-limit, Math.min(limit, offsetX));
}

/**
 * Clamp a y offset to the stored range.
 *
 * @param {number} offsetY
 * @returns {number} a value in [-OFFSET_LIMIT_Y, OFFSET_LIMIT_Y]
 */
export function clampOffsetY(offsetY) {
  return Math.max(-OFFSET_LIMIT_Y, Math.min(OFFSET_LIMIT_Y, offsetY));
}
