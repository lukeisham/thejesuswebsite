/**
 * Shared timeline geometry module.
 *
 * Pure, DOM-free math functions for translating timeline period indices to
 * pixel positions. This is the single canonical source for the centring math
 * and stagger offsets — both the public frontend (ES modules) and the admin
 * editor (plain `<script>` via the admin-timeline shim) must agree on every
 * value defined here.
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
 *
 * @module timeline/timeline-geometry
 */

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
 * (horizontal mode). Centres the dot within its slot: the dot lands at
 * `periodIndex * slotWidth + slotWidth / 2`, so it sits in the middle of
 * its period column rather than at the left edge.
 *
 * @param {number} periodIndex - zero-based index in the canonical period order
 * @param {number} slotWidth   - pixels per period slot
 * @returns {number} pixel X coordinate
 */
export function periodX(periodIndex, slotWidth) {
  return periodIndex * slotWidth + slotWidth / 2;
}

/**
 * Compute the pixel Y position for a period by its canonical index
 * (vertical/mobile mode). Mirrors `periodX` for the vertical axis.
 *
 * @param {number} periodIndex - zero-based index in the canonical period order
 * @param {number} slotHeight  - pixels per period slot
 * @returns {number} pixel Y coordinate
 */
export function periodY(periodIndex, slotHeight) {
  return periodIndex * slotHeight + slotHeight / 2;
}
