/**
 * Admin timeline cluster-placement bridge.
 *
 * Re-exposes the canonical frontend/assets/js/cluster-logic/cluster-placement.js
 * module as the window.AdminTimelineClusterPlacement global that
 * timeline-events.js already expects (JS-3, bridge pattern).
 *
 * Shape difference from the canonical module: the frontend version keys
 * grouped events by a `Map` (period → events[]) and returns a `Map`, while
 * the admin caller (timeline-events.js) builds a plain object (via
 * `Object.keys`) and reads the result back with `Object.keys` too. This
 * bridge converts at the boundary so admin code keeps its existing plain-
 * object contract without the canonical module having to support two data
 * shapes.
 *
 * Must load (type="module") BEFORE timeline-axis.js / timeline-events.js.
 *
 * @module cluster-logic-bridge/cluster-placement-bridge
 */

import { computeDotPositions } from "/assets/js/cluster-logic/cluster-placement.js";

window.AdminTimelineClusterPlacement = {
  SPACING: {
    compact: 12,
    normal: 16,
    spread: 22,
  },

  FAN_SPREAD: 6,

  /**
   * @param {Object<string, Array>} groupedEventsObject - plain object, period -> events[]
   * @param {number} pxPerPeriod
   * @returns {Object<string, Array<{event: Object, yOffset: number, xFan: number}>>}
   */
  computeDotPositions: function (groupedEventsObject, pxPerPeriod) {
    const groupedEventsMap = new Map(Object.entries(groupedEventsObject));
    const positionedMap = computeDotPositions(groupedEventsMap, pxPerPeriod);

    const positionedObject = {};
    for (const [period, positions] of positionedMap) {
      positionedObject[period] = positions;
    }
    return positionedObject;
  },
};
