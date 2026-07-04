/**
 * Timeline data module.
 *
 * Fetches timeline events from the API, defines the canonical period ordering
 * and era boundaries, and groups events by period.
 *
 * @module timeline/timeline-data
 */

import { getTimeline } from "../api.js";

/**
 * Canonical chronological order of timeline_period values as defined in schema.sql.
 * Position in this array determines horizontal placement on the timeline spine.
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
  beginning: "Birth & Early Life",
  middle: "Ministry",
  end: "Passion & Resurrection",
};

/**
 * Era boundaries: each era's first and last period index (inclusive) in TIMELINE_PERIODS.
 * Derived from TIMELINE_PERIODS order and the era each period belongs to.
 *
 * @type {Object<string, { start: number, end: number, label: string }>}
 */
export const ERA_BOUNDARIES = {
  beginning: { start: 0, end: 5, label: ERA_LABELS.beginning },
  middle: { start: 6, end: 17, label: ERA_LABELS.middle },
  end: { start: 18, end: TIMELINE_PERIODS.length - 1, label: ERA_LABELS.end },
};

/**
 * Fast lookup: period name → index in TIMELINE_PERIODS.
 * @type {Object<string, number>}
 */
const PERIOD_INDEX = Object.fromEntries(TIMELINE_PERIODS.map((p, i) => [p, i]));

/**
 * Determine which era a period belongs to.
 *
 * @param {string} period
 * @returns {string|null} The era key or null.
 */
export function getEraForPeriod(period) {
  const idx = PERIOD_INDEX[period];
  if (idx === undefined) return null;

  for (const [era, bounds] of Object.entries(ERA_BOUNDARIES)) {
    if (idx >= bounds.start && idx <= bounds.end) return era;
  }
  return null;
}

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
  return (
    event &&
    typeof event.id === "number" &&
    typeof event.title === "string" &&
    typeof event.timeline_period === "string" &&
    PERIOD_INDEX.hasOwnProperty(event.timeline_period)
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

  if (!Array.isArray(events)) return groups;

  for (const event of events) {
    if (!isValidTimelineEvent(event)) continue;

    const period = event.timeline_period;
    if (!groups.has(period)) {
      groups.set(period, []);
    }
    groups.get(period).push(event);
  }

  // Ensure period ordering within the map (insertion order is preserved in JS Maps,
  // but we want the canonical order, so we rebuild)
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

/**
 * Filter events to only those within a given era's period boundaries.
 *
 * @param {Array} events
 * @param {string} era - 'beginning', 'middle', or 'end'
 * @returns {Array}
 */
export function filterEventsByEra(events, era) {
  if (!Array.isArray(events) || !era) return events;
  const bounds = ERA_BOUNDARIES[era];
  if (!bounds) return events;
  const eraPeriods = TIMELINE_PERIODS.slice(bounds.start, bounds.end + 1);
  const eraPeriodSet = new Set(eraPeriods);
  return events.filter((e) => eraPeriodSet.has(e.timeline_period));
}
