// Timeline data access — reads the `evidence` table as a chronological narrative.
// There is no `timeline` table: the timeline is a view over published evidence
// that carries a `timeline_period`. The narrative sequence is neither alphabetical
// nor creation order, so the canonical order is encoded here and applied in JS
// (JS-2: explicit and predictable; JS-3: simpler than a giant SQL CASE).
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");

// The eight granular eras, in narrative order.
const ERA_ORDER = [
  "PreIncarnation",
  "OldTestament",
  "EarlyLife",
  "Life",
  "GalileeMinistry",
  "JudeanMinistry",
  "PassionWeek",
  "Post-Passion",
];

// Every timeline_period in the order it occurs in the narrative. Mirrors the
// CHECK constraint in schema.sql — keep the two in sync if either changes.
const PERIOD_ORDER = [
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
];

// Unknown values sort last rather than throwing, so a future enum value the
// frontend hasn't taught this file about still renders.
const ordinalOf = (order, value) => {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
};

/**
 * Evidence that belongs on the timeline, in narrative order.
 * By default returns only published evidence. Pass `includeDrafts: true`
 * to also include draft records (admin editor use).
 * Optionally narrow to a single era via `filters.timeline_era`.
 */
function getTimelineEvents({ timeline_era, includeDrafts } = {}) {
  const conditions = ["timeline_period IS NOT NULL"];
  const params = [];

  if (!includeDrafts) {
    conditions.push("published_draft = 1");
  }

  if (timeline_era) {
    conditions.push("timeline_era = ?");
    params.push(timeline_era);
  }

  const rows = db
    .prepare(`SELECT * FROM evidence WHERE ${conditions.join(" AND ")}`)
    .all(...params);

  return rows.sort((a, b) => {
    const eraDelta =
      ordinalOf(ERA_ORDER, a.timeline_era) -
      ordinalOf(ERA_ORDER, b.timeline_era);
    if (eraDelta !== 0) return eraDelta;
    return (
      ordinalOf(PERIOD_ORDER, a.timeline_period) -
      ordinalOf(PERIOD_ORDER, b.timeline_period)
    );
  });
}

/** Convenience wrapper for a single era. */
function getByEra(era) {
  return getTimelineEvents({ timeline_era: era });
}

/**
 * Evidence that has an era assigned but no period yet — the admin
 * "holding pen" for records that need to be placed into a specific
 * period on the timeline before they appear publicly.
 */
function getUnplacedEvents() {
  const rows = db
    .prepare(
      "SELECT * FROM evidence WHERE timeline_era IS NOT NULL AND timeline_era != '' AND timeline_period IS NULL",
    )
    .all();

  return rows.sort(
    (a, b) =>
      ordinalOf(ERA_ORDER, a.timeline_era) -
      ordinalOf(ERA_ORDER, b.timeline_era),
  );
}

module.exports = {
  getTimelineEvents,
  getByEra,
  getUnplacedEvents,
  ERA_ORDER,
  PERIOD_ORDER,
};
