// Shared timeline_era / timeline_period taxonomy for admin evidence forms.
// Mirrors frontend/assets/js/timeline/timeline-data.js's ERA_BOUNDARIES exactly
// (JS-1) — that file is the display-mapping source of truth; keep both in sync
// if the schema's CHECK lists ever change.

(function () {
  var ERAS = [
    { value: "beginning", label: "Beginning" },
    { value: "middle", label: "Middle" },
    { value: "end", label: "End" },
  ];

  // Period value -> { era, label }. Order within each era matches
  // TIMELINE_PERIODS in timeline-data.js.
  var PERIODS_BY_ERA = {
    beginning: [
      { value: "PreIncarnation", label: "Pre-Incarnation" },
      { value: "OldTestament", label: "Old Testament" },
      { value: "EarlyLifeUnborn", label: "Early Life — Unborn" },
      { value: "EarlyLifeBirth", label: "Early Life — Birth" },
      { value: "EarlyLifeInfancy", label: "Early Life — Infancy" },
      { value: "EarlyLifeChildhood", label: "Early Life — Childhood" },
    ],
    middle: [
      { value: "LifeTradie", label: "Life — Tradesman" },
      { value: "LifeBaptism", label: "Life — Baptism" },
      { value: "LifeTemptation", label: "Life — Temptation" },
      { value: "GalileeCallingTwelve", label: "Galilee — Calling the Twelve" },
      { value: "GalileeSermonMount", label: "Galilee — Sermon on the Mount" },
      { value: "GalileeMiraclesSea", label: "Galilee — Miracles at Sea" },
      { value: "GalileeTransfiguration", label: "Galilee — Transfiguration" },
      { value: "JudeanOutsideJudea", label: "Judea — Outside Judea" },
      { value: "JudeanMissionSeventy", label: "Judea — Mission of Seventy" },
      { value: "JudeanTeachingTemple", label: "Judea — Teaching at the Temple" },
      { value: "JudeanRaisingLazarus", label: "Judea — Raising Lazarus" },
      { value: "JudeanFinalJourney", label: "Judea — Final Journey" },
    ],
    end: [
      { value: "PassionPalmSunday", label: "Passion — Palm Sunday" },
      { value: "PassionMondayCleansing", label: "Passion — Monday Cleansing" },
      { value: "PassionTuesdayTeaching", label: "Passion — Tuesday Teaching" },
      { value: "PassionWednesdaySilent", label: "Passion — Wednesday (Silent)" },
      { value: "PassionMaundyThursday", label: "Passion — Maundy Thursday" },
      { value: "PassionMaundyLastSupper", label: "Passion — Last Supper" },
      { value: "PassionMaundyGethsemane", label: "Passion — Gethsemane" },
      { value: "PassionMaundyBetrayal", label: "Passion — Betrayal" },
      { value: "PassionFridaySanhedrin", label: "Passion — Sanhedrin Trial" },
      { value: "PassionFridayCivilTrials", label: "Passion — Civil Trials" },
      {
        value: "PassionFridayCrucifixionBegins",
        label: "Passion — Crucifixion Begins",
      },
      { value: "PassionFridayDarkness", label: "Passion — Darkness" },
      { value: "PassionFridayDeath", label: "Passion — Death" },
      { value: "PassionFridayBurial", label: "Passion — Burial" },
      { value: "PassionSaturdayWatch", label: "Passion — Saturday Watch" },
      { value: "PassionSundayResurrection", label: "Passion — Resurrection" },
      {
        value: "PostResurrectionAppearances",
        label: "Post-Resurrection Appearances",
      },
      { value: "Ascension", label: "Ascension" },
      { value: "OurResponse", label: "Our Response" },
      { value: "ReturnOfJesus", label: "Return of Jesus" },
    ],
  };

  var ERA_BY_PERIOD = {};
  Object.keys(PERIODS_BY_ERA).forEach(function (era) {
    PERIODS_BY_ERA[era].forEach(function (period) {
      ERA_BY_PERIOD[period.value] = era;
    });
  });

  /**
   * @param {string} period - a timeline_period value
   * @returns {string|null} the era it belongs to, or null if unknown
   */
  function getEraForPeriod(period) {
    return ERA_BY_PERIOD.hasOwnProperty(period) ? ERA_BY_PERIOD[period] : null;
  }

  /**
   * @param {string} era - 'beginning', 'middle', or 'end'
   * @returns {Array<{value: string, label: string}>} periods in that era
   */
  function getPeriodsForEra(era) {
    return PERIODS_BY_ERA.hasOwnProperty(era) ? PERIODS_BY_ERA[era] : [];
  }

  window.Admin = window.Admin || {};
  window.Admin.timelineTaxonomy = {
    ERAS: ERAS,
    PERIODS_BY_ERA: PERIODS_BY_ERA,
    getEraForPeriod: getEraForPeriod,
    getPeriodsForEra: getPeriodsForEra,
  };
})();
