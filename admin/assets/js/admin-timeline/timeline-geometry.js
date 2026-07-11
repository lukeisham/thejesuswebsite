/**
 * Admin timeline geometry shim.
 *
 * Exposes the same geometry constants used by the public timeline renderer
 * (`frontend/assets/js/timeline/timeline-data.js` and
 * `frontend/assets/js/timeline/timeline-render.js`) so the admin timeline
 * editor renders dots, labels, and era markers with identical dimensions.
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

  /** Stagger offsets (pixels) for events sharing the same period. */
  STAGGER_OFFSETS: [0, -8, 8, -16, 16, -24, 24, -32, 32, -40, 40],

  /** Pixels per period unit on the default scale.
   * Must match frontend's getPxPerPeriod() default (100). */
  DEFAULT_PX_PER_PERIOD: 100,

  /**
   * Compute the pixel X position for a period by its canonical index,
   * centering the dot within its slot (matches frontend periodX).
   *
   * @param {number} periodIndex - zero-based index in PERIOD_ORDER
   * @param {number} pxPerUnit   - pixels per period slot
   * @param {number} offsetX     - horizontal pan offset in pixels
   * @returns {number} pixel X coordinate
   */
  periodToXCentered: function (periodIndex, pxPerUnit, offsetX) {
    var scale = pxPerUnit || this.DEFAULT_PX_PER_PERIOD;
    var off = offsetX || 0;
    return periodIndex * scale + scale / 2 + off;
  },
};
