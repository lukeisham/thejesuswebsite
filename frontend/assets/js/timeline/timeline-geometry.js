/**
 * Shared timeline geometry module.
 *
 * Pure, DOM-free math for translating timeline period indices to pixel
 * positions at a fixed base scale. Zoom is a CSS transform on a wrapper
 * element (timeline-zoom.js), so these functions always return world
 * coordinates at scale 1.
 *
 * The admin editor cannot import ES modules in its classic scripts, so it
 * keeps a copy of `BASE_PX_PER_PERIOD` and `TIMELINE_CANVAS_HEIGHT_PX` in
 * admin/assets/js/admin-timeline/timeline-geometry.js (`BASE_PX_PER_PERIOD`,
 * `CANVAS_HEIGHT_PX`). api/tests/guide-timeline.test.js fails when
 * the two copies differ. A stored `timeline_offset_x` or `timeline_offset_y`
 * is converted to pixels with these two values on both sides, so a mismatch
 * shows a node at one spot in the editor and another on the public page.
 *
 * Period indices are 0-based across the periods in the order of
 * `database/schema.sql` (the `timeline_period` CHECK list), the order of
 * `TIMELINE_PERIODS` in timeline-data.js.
 *
 * Read by timeline-render.js and timeline-transform.js, and by
 * cluster-logic/timeline-offsets.js, whose pixel conversions scale by these two
 * constants.
 *
 * @module timeline/timeline-geometry
 */

/** Base pixels per period at scale 1. This is the fixed world-coordinate
 * constant — zoom is applied by the CSS transform wrapper, not by changing
 * this value. */
export const BASE_PX_PER_PERIOD = 100;

/** Height in pixels of the timeline canvas inner box. A stored
 * `timeline_offset_y` is scaled by this height; `offsetYToPixels` in
 * cluster-logic/timeline-offsets.js says how it maps to a dot position. */
export const TIMELINE_CANVAS_HEIGHT_PX = 280;

/**
 * Compute the pixel X position for a period by its canonical index
 * (horizontal mode, world coordinates at scale 1). The result is the centre of
 * the period's slot. Zoom is applied by the transform wrapper, so there is no
 * slot-width parameter.
 *
 * @param {number} periodIndex - zero-based index in the canonical period order
 * @returns {number} pixel X coordinate in world space
 */
export function periodX(periodIndex) {
  return periodIndex * BASE_PX_PER_PERIOD + BASE_PX_PER_PERIOD / 2;
}

/**
 * Compute the pixel Y position for a period by its canonical index
 * (vertical/mobile mode, world coordinates at scale 1). Mirrors `periodX`
 * for the vertical axis.
 *
 * @param {number} periodIndex - zero-based index in the canonical period order
 * @returns {number} pixel Y coordinate in world space
 */
export function periodY(periodIndex) {
  return periodIndex * BASE_PX_PER_PERIOD + BASE_PX_PER_PERIOD / 2;
}
