/**
 * Timeline cluster placement module.
 *
 * Pure, DOM-free module that assigns vertical (or horizontal in vertical mode)
 * offsets to concurrent events sharing the same timeline period. All events in
 * a period always stack vertically in a tidy column centred on the spine.
 *
 * Replaces the old STAGGER_OFFSETS alternating pattern in timeline-render.js.
 *
 * @module cluster-logic/cluster-placement
 */

import {
  DENSITY_COMPACT,
  DENSITY_NORMAL,
  DENSITY_SPREAD,
  getClusterDensity,
} from "./cluster-density.js";

/**
 * Dot spacing values (pixels between adjacent dots in a stack) per density tier.
 */
const SPACING = {
  [DENSITY_COMPACT]: 12,
  [DENSITY_NORMAL]: 16,
  [DENSITY_SPREAD]: 22,
};

/**
 * Extra horizontal fan-out (pixels) applied when spread — dots still form a
 * column but spread slightly within the period slot for visual clarity.
 */
const FAN_SPREAD = 6;

/**
 * Compute dot positions for every event, keyed by period.
 *
 * Each period's events form a vertical stack centred on the spine. The stack
 * offset is computed so the column is centred: the first dot sits at the spine
 * when there's an odd number of events, or the spine bisects the gap when even.
 *
 * @param {Map<string, Array>} groupedEvents  - Map from period → events array
 * @param {number}             pxPerPeriod    - current zoom scale
 * @returns {Map<string, Array<{event: Object, yOffset: number, xFan: number}>>}
 *   Map from period → array of positioned event descriptors.
 */
export function computeDotPositions(groupedEvents, pxPerPeriod) {
  const density = getClusterDensity(null, pxPerPeriod);
  const spacing = SPACING[density];
  const useFan = density === DENSITY_SPREAD;
  const positioned = new Map();

  for (const [period, events] of groupedEvents) {
    const count = events.length;
    const positions = [];

    for (let i = 0; i < count; i++) {
      // Centre the stack: for N dots spaced S apart, the total height is (N-1)*S.
      // The middle sits at offset 0, with dots above going negative and below positive.
      const stackHeight = (count - 1) * spacing;
      const startOffset = -stackHeight / 2;
      const yOffset = startOffset + i * spacing;

      // Slight horizontal fan when spread — alternates left/right from centre
      let xFan = 0;
      if (useFan && count > 1) {
        const dir = i % 2 === 0 ? -1 : 1;
        const step = Math.floor(i / 2) + 1;
        xFan = dir * step * FAN_SPREAD;
      }

      positions.push({
        event: events[i],
        yOffset,
        xFan,
      });
    }

    positioned.set(period, positions);
  }

  return positioned;
}
