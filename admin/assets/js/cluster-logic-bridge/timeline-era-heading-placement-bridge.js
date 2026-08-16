/**
 * Admin timeline era-heading-placement bridge.
 *
 * Wraps the canonical frontend timeline-era-heading-placement.js module as a
 * window.AdminTimelineEraHeadingPlacement global for classic admin scripts —
 * the same pattern as the density/placement/labels/collision bridges.
 *
 * @module cluster-logic-bridge/timeline-era-heading-placement-bridge
 */

import { computeEraHeadingPositions } from "/assets/js/timeline/timeline-era-heading-placement.js";

window.AdminTimelineEraHeadingPlacement = {
  compute: computeEraHeadingPositions,
};
