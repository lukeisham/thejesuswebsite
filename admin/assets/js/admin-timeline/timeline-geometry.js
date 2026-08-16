/**
 * Admin timeline geometry shim.
 *
 * Exposes the same geometry constants used by the public timeline renderer
 * (`frontend/assets/js/timeline/timeline-data.js` and
 * `frontend/assets/js/timeline/timeline-render.js`) so the admin timeline
 * editor renders dots, labels, and era markers with identical dimensions.
 *
 * All positions now use the fixed BASE_PX_PER_PERIOD (100) world coordinate.
 * Zoom is applied via the CSS transform wrapper — no variable slot width needed.
 *
 * Keep this file in sync with the public timeline modules — they must agree
 * on every value.
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

  /** Era boundaries: each era's first period in PERIOD_ORDER. */
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
   * NOTE: populated below the main object literal so the IIFE can
   * reference TIMELINE_PERIODS / ERA_STARTS / ERA_ORDER.
   */
  ERA_BOUNDARIES: null,

  /** Stagger offsets (pixels) for events sharing the same period. */
  STAGGER_OFFSETS: [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40],

  /** Fixed base pixels per period at world scale (zoom is applied by CSS transform). */
  BASE_PX_PER_PERIOD: 100,

  /**
   * Compute the pixel X position for a period by its canonical index,
   * centering the dot within its slot (matches frontend periodX).
   * Uses fixed world pixels — zoom is applied by the transform wrapper.
   *
   * @param {number} periodIndex - zero-based index in PERIOD_ORDER
   * @param {number} [basePx=100] - base pixels per period
   * @returns {number} pixel X coordinate in world space
   */
  periodToXCentered: function (periodIndex, basePx) {
    var scale = basePx || this.BASE_PX_PER_PERIOD;
    return periodIndex * scale + scale / 2;
  },
};

// Compute ERA_BOUNDARIES after the object is fully defined so the IIFE
// can reference the properties it depends on (TIMELINE_PERIODS,
// ERA_STARTS, ERA_ORDER).  Mirrors frontend timeline-data.js.
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
    bounds[era] = { start: startIdx, end: endIdx };
  }
  G.ERA_BOUNDARIES = bounds;
})();
