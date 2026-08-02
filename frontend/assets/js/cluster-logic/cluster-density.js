/**
 * Timeline cluster density module.
 *
 * Pure, DOM-free helper that determines how densely events cluster at a
 * given zoom level. Exports `getClusterDensity(events, pxPerPeriod)` —
 * the single source of truth consumed by both placement and label modules
 * so their behaviour stays in step.
 *
 * The `pxPerPeriod` parameter is now computed as `BASE_PX_PER_PERIOD * scale`
 * rather than read from a CSS custom property — the zoom is applied via a
 * transform wrapper, not by recomputing slot widths.
 *
 * @module cluster-logic/cluster-density
 */

/** Density tier constants. */
export const DENSITY_COMPACT = "compact";
export const DENSITY_NORMAL = "normal";
export const DENSITY_SPREAD = "spread";

/**
 * Pixels per period thresholds that define density tier boundaries.
 * Shared with the admin copy (keep numerically identical).
 *
 * Effective pxPerPeriod = BASE_PX_PER_PERIOD (100) × zoom scale.
 * Scale range [0.3, 3.0] maps to effective range [30, 300].
 */
export const THRESHOLDS = {
  /** pxPerPeriod <= this → compact */
  COMPACT_MAX: 55,
  /** pxPerPeriod >= this → spread */
  SPREAD_MIN: 120,
};

/**
 * Compute the cluster density tier for a set of events at a given zoom.
 *
 * The tier is determined purely by the effective pxPerPeriod — the number
 * of events per period is not a factor, because spatial constraints at low
 * pxPerPeriod always dominate.
 *
 * @param {Array}    events       - all timeline events (unused; reserved for future per-period logic)
 * @param {number}   pxPerPeriod  - effective px-per-period = BASE_PX_PER_PERIOD × zoom scale
 * @returns {string}  One of DENSITY_COMPACT, DENSITY_NORMAL, DENSITY_SPREAD.
 */
export function getClusterDensity(events, pxPerPeriod) {
  if (pxPerPeriod <= THRESHOLDS.COMPACT_MAX) return DENSITY_COMPACT;
  if (pxPerPeriod >= THRESHOLDS.SPREAD_MIN) return DENSITY_SPREAD;
  return DENSITY_NORMAL;
}
