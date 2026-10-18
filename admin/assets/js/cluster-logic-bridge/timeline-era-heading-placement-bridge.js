// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline era-heading-placement bridge.
 *
 * Publishes frontend/assets/js/timeline/timeline-era-heading-placement.js as
 * `window.AdminTimelineEraHeadingPlacement` for the classic admin script
 * timeline-events.js, so the editor places era headings with the public code.
 *
 * Must load before timeline-events.js (admin/diagrams/timeline.html).
 *
 * @module cluster-logic-bridge/timeline-era-heading-placement-bridge
 */

import { computeEraHeadingPositions } from "/assets/js/timeline/timeline-era-heading-placement.js";

window.AdminTimelineEraHeadingPlacement = { computeEraHeadingPositions };
