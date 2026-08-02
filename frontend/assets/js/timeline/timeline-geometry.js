/**
 * Shared timeline geometry module.
 *
 * Pure, DOM-free math functions for translating timeline period indices to
 * pixel positions using a fixed base scale. Zoom is now applied entirely by
 * a CSS transform on a wrapper element (matching the arbor diagram model),
 * so these functions always return world-coordinate pixels at scale 1.
 *
 * This is the single canonical source for the centring math and stagger
 * offsets — both the public frontend (ES modules) and the admin editor
 * (plain `<script>` via the admin-timeline shim) must agree on every value.
 *
 * Period indexing and stagger logic:
 * - The database defines 8 timeline eras (PreIncarnation, OldTestament, EarlyLife,
 *   Life, GalileeMinistry, JudeanMinistry, PassionWeek, Post-Passion) and 38
 *   granular periods (EarlyLifeBirth, GalileeSermonMount, etc. — see schema.sql
 *   lines 23–39). Period indices used here are 0-based across all 38 periods in
 *   canonical order (matching schema.sql). STAGGER_OFFSETS applies to events
 *   sharing the same period: start at tier 0 (spine), then alternate ±8px, ±16px,
 *   etc. Filtering by era occurs at the data-load layer; this module assumes
 *   already-filtered periods and computes pixel geometry only.
 *
 * Keep the admin shim at `admin/assets/js/admin-timeline/timeline-geometry.js`
 * byte-identical for the positioning functions and stagger array. See that
 * file's doc comment for the sync contract.
 *
 * See also:
 * - `database/schema.sql` lines 21–39 (era and period enums)
 * - `frontend/assets/js/timeline/timeline-data.js` (period display labels)
 * - `frontend/assets/js/timeline/timeline-zoom.js` (zoom scale applied as transform)
 *
 * @module timeline/timeline-geometry
 */

/** Base pixels per period at scale 1. This is the fixed world-coordinate
 * constant — zoom is applied by the CSS transform wrapper, not by changing
 * this value. */
export const BASE_PX_PER_PERIOD = 100;

/**
 * Stagger tiers for events sharing the same period, ordered by increasing
 * distance from the spine (alternating each side). Reused as: (a) the
 * per-cluster starting tier for events in the same period, and (b) the
 * escalation ladder labels are pushed along when their bounding boxes
 * collide with an already-placed neighbour.
 *
 * @type {number[]}
 */
export const STAGGER_OFFSETS = [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40];

/**
 * Compute the pixel X position for a period by its canonical index
 * (horizontal mode, world coordinates at scale 1). Centres the dot within
 * its slot: `periodIndex * BASE_PX_PER_PERIOD + BASE_PX_PER_PERIOD / 2`.
 * Zoom is applied by the transform wrapper — do not pass a variable slotWidth.
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
