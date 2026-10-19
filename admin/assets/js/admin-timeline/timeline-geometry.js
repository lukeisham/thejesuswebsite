/**
 * Admin timeline geometry shim.
 *
 * Classic-script copy of the geometry in the public timeline modules
 * (frontend/assets/js/timeline/timeline-data.js and timeline-geometry.js), so
 * the editor draws dots, labels and era markers with the same dimensions.
 * The admin pages cannot import ES modules in their classic scripts, so the
 * values are repeated here. api/tests/guide-timeline.test.js fails
 * when `BASE_PX_PER_PERIOD` or `CANVAS_HEIGHT_PX` differs from the frontend
 * value. A stored `timeline_offset_x` or `timeline_offset_y` is converted to
 * pixels with these two values, so a mismatch shows a node at one spot in the
 * editor and another on the public page.
 *
 * Read by timeline-axis.js, timeline-era-filter.js, timeline-events.js,
 * timeline-node-drag.js and timeline-transform.js.
 * Positions are fixed world coordinates; zoom is a CSS transform wrapper.
 *
 * @module admin-timeline/timeline-geometry
 */
window.AdminTimelineGeometry = {
  /** Canonical chronological order of timeline_period values. */
  TIMELINE_PERIODS: [
    "PreIncarnation",
    "OldTestament",
    "EarlyLifeUnborn",
    "EarlyLifeBirth",
    "EarlyLifeInfancy",
    "EarlyLifeChildhood",
    "LifeTradie",
    "LifeBaptism",
    "LifeTemptation",
    "GalileeCallingTwelve",
    "GalileeSermonMount",
    "GalileeMiraclesSea",
    "GalileeTransfiguration",
    "JudeanOutsideJudea",
    "JudeanMissionSeventy",
    "JudeanTeachingTemple",
    "JudeanRaisingLazarus",
    "JudeanFinalJourney",
    "PassionPalmSunday",
    "PassionMondayCleansing",
    "PassionTuesdayTeaching",
    "PassionWednesdaySilent",
    "PassionMaundyThursday",
    "PassionMaundyLastSupper",
    "PassionMaundyGethsemane",
    "PassionMaundyBetrayal",
    "PassionFridaySanhedrin",
    "PassionFridayCivilTrials",
    "PassionFridayCrucifixionBegins",
    "PassionFridayDarkness",
    "PassionFridayDeath",
    "PassionFridayBurial",
    "PassionSaturdayWatch",
    "PassionSundayResurrection",
    "PostResurrectionAppearances",
    "Ascension",
    "OurResponse",
    "ReturnOfJesus",
  ],

  /** Canonical chronological order of timeline_era values. */
  ERA_ORDER: [
    "PreIncarnation",
    "OldTestament",
    "EarlyLife",
    "Life",
    "GalileeMinistry",
    "JudeanMinistry",
    "PassionWeek",
    "Post-Passion",
  ],

  /** Era display labels. */
  ERA_LABELS: {
    PreIncarnation: "Pre-Incarnation",
    OldTestament: "Old Testament",
    EarlyLife: "Early Life",
    Life: "Life",
    GalileeMinistry: "Galilee Ministry",
    JudeanMinistry: "Judean Ministry",
    PassionWeek: "Passion Week",
    "Post-Passion": "Post-Passion",
  },

  /** Era boundaries: each era's first period in TIMELINE_PERIODS. */
  ERA_STARTS: {
    PreIncarnation: "PreIncarnation",
    OldTestament: "OldTestament",
    EarlyLife: "EarlyLifeUnborn",
    Life: "LifeTradie",
    GalileeMinistry: "GalileeCallingTwelve",
    JudeanMinistry: "JudeanOutsideJudea",
    PassionWeek: "PassionPalmSunday",
    "Post-Passion": "PostResurrectionAppearances",
  },

  /**
   * Era boundaries as period indices: each era's first and last period
   * index (inclusive) in TIMELINE_PERIODS.  Derived from ERA_STARTS by
   * looking up each start period's index and using the next era's start
   * minus 1 as the end (or array length - 1 for the final era).
   * Mirrors frontend timeline-data.js ERA_BOUNDARIES.
   *
   * Filled in below the object literal, because it reads TIMELINE_PERIODS,
   * ERA_STARTS and ERA_ORDER.
   */
  ERA_BOUNDARIES: null,

  /** Stagger offsets (pixels). No admin script reads this array; dot spacing
   * comes from cluster-logic/cluster-placement.js. */
  STAGGER_OFFSETS: [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40],

  /** Fixed base pixels per period at world scale (zoom is applied by CSS transform). */
  BASE_PX_PER_PERIOD: 100,

  /** Height in pixels of the canvas inner box. A stored `timeline_offset_y` is
   * a fraction of this height. */
  CANVAS_HEIGHT_PX: 280,

  /**
   * Compute the pixel X position for a period by its canonical index,
   * centering the dot within its slot (matches frontend periodX).
   * Uses fixed world pixels — zoom is applied by the transform wrapper.
   *
   * @param {number} periodIndex - zero-based index in TIMELINE_PERIODS
   * @param {number} [basePx] - base pixels per period; defaults to BASE_PX_PER_PERIOD
   * @returns {number} pixel X coordinate in world space
   */
  periodToXCentered: function (periodIndex, basePx) {
    var scale = basePx || this.BASE_PX_PER_PERIOD;
    return periodIndex * scale + scale / 2;
  },
};

// ERA_BOUNDARIES is computed here, after the object exists, because it reads
// TIMELINE_PERIODS, ERA_STARTS and ERA_ORDER. Mirrors frontend timeline-data.js.
(function () {
  var G = window.AdminTimelineGeometry;
  var periods = G.TIMELINE_PERIODS;
  var starts = G.ERA_STARTS;
  var order = G.ERA_ORDER;
  var bounds = {};
  for (var i = 0; i < order.length; i++) {
    var era = order[i];
    var startPeriod = starts[era];
    var startIdx = periods.indexOf(startPeriod);
    if (startIdx === -1) continue;
    var endIdx;
    if (i < order.length - 1) {
      var nextStartPeriod = starts[order[i + 1]];
      endIdx = periods.indexOf(nextStartPeriod) - 1;
    } else {
      endIdx = periods.length - 1;
    }
    bounds[era] = { start: startIdx, end: endIdx, label: G.ERA_LABELS[era] };
  }
  G.ERA_BOUNDARIES = bounds;
})();
