// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline era-heading-placement bridge.
 *
 * Publishes the era heading band layout from
 * frontend/assets/js/timeline/timeline-era-heading-placement.js as
 * `window.AdminTimelineEraHeadingPlacement` for the classic admin script
 * timeline-events.js, so the editor places era headings with the public code.
 * The editor is desktop only, so it does not use the vertical (mobile) layout
 * function.
 *
 * Must load before timeline-events.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/timeline-era-heading-placement-bridge
 */

import {
  computeEraBandLayout,
  ERA_BAND_LANES,
} from "/assets/js/timeline/timeline-era-heading-placement.js";

window.AdminTimelineEraHeadingPlacement = { computeEraBandLayout, ERA_BAND_LANES };
