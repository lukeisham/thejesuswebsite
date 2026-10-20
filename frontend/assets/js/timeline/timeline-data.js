/**
 * Timeline data module.
 *
 * Fetches timeline events from the API, defines the canonical period ordering
 * and era boundaries, and groups events by period.
 *
 * Used by timeline-interactions.js (fetch, group) and timeline-render.js
 * (period order, era boundaries). The admin editor cannot import this module;
 * admin/assets/js/admin-timeline/timeline-geometry.js keeps its own copy of the
 * period and era lists, so a change to either list is made in both.
 *
 * @module timeline/timeline-data
 */

import { getTimeline } from "../api.js";

/**
 * Canonical chronological order of timeline_period values as defined in schema.sql.
 * Position in this array determines horizontal placement on the timeline spine.
 * A period missing here is not drawn: `groupEventsByPeriod` drops its events.
 *
 * @type {string[]}
 */
export const TIMELINE_PERIODS = [
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

/**
 * Mapping from timeline_era values to their display labels.
 *
 * @type {Object<string, string>}
 */
export const ERA_LABELS = {
  PreIncarnation: "Pre-Incarnation",
  OldTestament: "Old Testament",
  EarlyLife: "Early Life",
  Life: "Life",
  GalileeMinistry: "Galilee Ministry",
  JudeanMinistry: "Judean Ministry",
  PassionWeek: "Passion Week",
  "Post-Passion": "Post-Passion",
};

/**
 * Era boundaries: each era's first and last period index (inclusive) in TIMELINE_PERIODS.
 * The numbers are literals, so they must be changed with TIMELINE_PERIODS. The
 * admin copy (`ERA_STARTS` in admin-timeline/timeline-geometry.js) must agree,
 * or the editor draws era bars where the public page does not.
 *
 * @type {Object<string, { start: number, end: number, label: string }>}
 */
export const ERA_BOUNDARIES = {
  PreIncarnation: { start: 0, end: 0, label: ERA_LABELS.PreIncarnation },
  OldTestament: { start: 1, end: 1, label: ERA_LABELS.OldTestament },
  EarlyLife: { start: 2, end: 5, label: ERA_LABELS.EarlyLife },
  Life: { start: 6, end: 8, label: ERA_LABELS.Life },
  GalileeMinistry: { start: 9, end: 12, label: ERA_LABELS.GalileeMinistry },
  JudeanMinistry: { start: 13, end: 17, label: ERA_LABELS.JudeanMinistry },
  PassionWeek: { start: 18, end: 33, label: ERA_LABELS.PassionWeek },
  "Post-Passion": {
    start: 34,
    end: TIMELINE_PERIODS.length - 1,
    label: ERA_LABELS["Post-Passion"],
  },
};

/**
 * Fast lookup: period name → index in TIMELINE_PERIODS.
 * @type {Object<string, number>}
 */
const PERIOD_INDEX = Object.fromEntries(TIMELINE_PERIODS.map((p, i) => [p, i]));

/**
 * Fetch all timeline events from the API.
 *
 * @returns {Promise<{data: Array|null, error: string|null}>}
 */
export async function fetchTimelineEvents() {
  return getTimeline({ published_draft: "published" });
}

/**
 * Validate that each event has the required timeline fields.
 *
 * @param {Object} event
 * @returns {boolean}
 */
function isValidTimelineEvent(event) {
  return Boolean(
    event &&
      typeof event.id === "number" &&
      typeof event.title === "string" &&
      typeof event.timeline_period === "string" &&
      PERIOD_INDEX.hasOwnProperty(event.timeline_period),
  );
}

/**
 * Group events by their timeline_period, ordered by TIMELINE_PERIODS.
 * Filters out events with invalid or missing period data.
 *
 * @param {Array} events - Raw events array from the API.
 * @returns {Map<string, Array>} Map keyed by period, each value is an array of events.
 */
export function groupEventsByPeriod(events) {
  const groups = new Map();

  if (!Array.isArray(events)) {
    console.warn("timeline-data: expected an array of events", { received: typeof events });
    return groups;
  }

  for (const event of events) {
    if (!isValidTimelineEvent(event)) {
      console.warn("timeline-data: dropping an event with missing fields or an unknown period", {
        id: event?.id,
        period: event?.timeline_period,
      });
      continue;
    }

    const period = event.timeline_period;
    if (!groups.has(period)) {
      groups.set(period, []);
    }
    groups.get(period).push(event);
  }

  // The API's row order is not the period order, so rebuild the Map in
  // TIMELINE_PERIODS order; callers iterate it in period order.
  const ordered = new Map();
  for (const period of TIMELINE_PERIODS) {
    if (groups.has(period)) {
      ordered.set(period, groups.get(period));
    }
  }

  return ordered;
}

/**
 * Get the index of a period in the canonical ordering.
 *
 * @param {string} period
 * @returns {number} -1 if not found.
 */
export function getPeriodIndex(period) {
  return PERIOD_INDEX.hasOwnProperty(period) ? PERIOD_INDEX[period] : -1;
}
