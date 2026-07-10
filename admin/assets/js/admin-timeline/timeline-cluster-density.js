/**
 * Admin timeline cluster-density module.
 *
 * Determines the visual density tier (compact / normal / spread) from the
 * current pixels-per-period scale.  Used by the cluster-placement module to
 * choose spacing and fan-out behaviour.
 *
 * @module admin-timeline/timeline-cluster-density
 */

window.AdminTimelineClusterDensity = {
  DENSITY_COMPACT: "compact",
  DENSITY_NORMAL: "normal",
  DENSITY_SPREAD: "spread",

  THRESHOLDS: {
    COMPACT_MAX: 55,
    SPREAD_MIN: 120,
  },

  getClusterDensity: function (events, pxPerPeriod) {
    if (pxPerPeriod <= this.THRESHOLDS.COMPACT_MAX) return this.DENSITY_COMPACT;
    if (pxPerPeriod >= this.THRESHOLDS.SPREAD_MIN) return this.DENSITY_SPREAD;
    return this.DENSITY_NORMAL;
  },
};
