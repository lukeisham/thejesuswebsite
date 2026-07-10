/**
 * Timeline cluster labels module.
 *
 * Pure, DOM-free module that decides whether each event label should render
 * fully, truncated with ellipsis, or hidden entirely — all based on the same
 * density tier consumed by the placement module.
 *
 * @module timeline/timeline-cluster-labels
 */

import {
  DENSITY_COMPACT,
  DENSITY_NORMAL,
  DENSITY_SPREAD,
  getClusterDensity,
} from "./timeline-cluster-density.js";

/** Label display modes. */
export const LABEL_FULL = "full";
export const LABEL_TRUNCATED = "truncated";
export const LABEL_HIDDEN = "hidden";

/**
 * Compute the label display mode for every event descriptor.
 *
 * In compact mode, labels are truncated (single-line ellipsis) when there
 * are multiple events in a period, or hidden for 4+. In normal mode,
 * labels are full. In spread mode, all labels are full.
 *
 * @param {Array<{event: Object, yOffset: number, xFan: number}>} descriptors
 *   Flattened array of positioned event descriptors from computeDotPositions.
 * @param {string} densityTier - from getClusterDensity.
 * @returns {Array<{event: Object, mode: string}>}
 *   Array of label-mode assignments, one per descriptor, in the same order.
 */
export function computeLabelModes(descriptors, densityTier) {
  return descriptors.map((desc) => {
    const periodEvents = descriptors.filter(
      (d) => d.event.timeline_period === desc.event.timeline_period,
    );
    const count = periodEvents.length;

    if (densityTier === DENSITY_COMPACT) {
      if (count >= 4) return { event: desc.event, mode: LABEL_HIDDEN };
      if (count >= 2) return { event: desc.event, mode: LABEL_TRUNCATED };
      return { event: desc.event, mode: LABEL_FULL };
    }

    return { event: desc.event, mode: LABEL_FULL };
  });
}

export { getClusterDensity };
