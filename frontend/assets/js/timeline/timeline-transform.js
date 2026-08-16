/**
 * Timeline transform math module.
 *
 * Pure, DOM-free functions for computing pan/zoom transform parameters to
 * centre an era in the viewport.  All inputs are numbers; all outputs are
 * plain objects.  Exported for both the frontend chip-jump feature and the
 * `timeline-nav.js` module that drives it.
 *
 * Coordinate model (matching timeline-zoom.js):
 *   - transform-origin: 0 0 on .timeline-world
 *   - A world point (wx, wy) maps to viewport coordinates as:
 *       vx = panX + wx * scale
 *       vy = panY + wy * scale
 *   - To centre world point (wx, wy) at viewport centre (vw/2, vh/2):
 *       panX = vw/2 - wx * scale
 *       panY = vh/2 - wy * scale
 *
 * See also:
 *   - timeline-data.js     (ERA_BOUNDARIES, period indices)
 *   - timeline-geometry.js (periodX, periodY, BASE_PX_PER_PERIOD)
 *   - timeline-zoom.js     (setTransform consumer)
 *
 * @module timeline/timeline-transform
 */

import { ERA_BOUNDARIES, TIMELINE_PERIODS } from "./timeline-data.js";
import { BASE_PX_PER_PERIOD, periodX } from "./timeline-geometry.js";

/**
 * Return the world-pixel bounding box for an era.
 *
 * Bounds are derived from the era's first and last period indices in
 * TIMELINE_PERIODS, converted to world pixels via periodX().  The left edge
 * is the start of the first period's slot (periodX(start) - half slot width);
 * the right edge is the end of the last period's slot (periodX(end) + half
 * slot width).
 *
 * For the "all" / "All" era sentinel, returns the full-timeline bounds.
 *
 * @param {string} eraKey — one of the eight canonical era keys, or "all"/"All"
 * @returns {{ minX: number, maxX: number, minY: number, maxY: number }|null}
 *   null if the era key is unrecognised.
 */
export function getEraWorldBounds(eraKey) {
  // "All" / "all" sentinel — full timeline.
  if (eraKey === "all" || eraKey === "All") {
    const lastIdx = TIMELINE_PERIODS.length - 1;
    return {
      minX: 0,
      maxX: periodX(lastIdx) + BASE_PX_PER_PERIOD / 2,
      minY: 0,
      maxY: 0,
    };
  }

  const bounds = ERA_BOUNDARIES[eraKey];
  if (!bounds) {
    console.warn(
      "timeline-transform: getEraWorldBounds — unrecognised era key",
      { eraKey },
    );
    return null;
  }

  const halfSlot = BASE_PX_PER_PERIOD / 2;
  return {
    minX: periodX(bounds.start) - halfSlot,
    maxX: periodX(bounds.end) + halfSlot,
    minY: 0,
    maxY: 0,
  };
}

/**
 * Compute the pan offset needed to centre an era in the viewport at the given
 * zoom scale.
 *
 * The formula accounts for transform-origin: 0 0 on .timeline-world:
 *   panX = viewportWidth/2 - eraCentreX * scale
 *   panY = viewportHeight/2               (spine is at world y=0)
 *
 * @param {string}  eraKey         — canonical era key, or "all"/"All"
 * @param {number}  viewportWidth  — width of the viewport in CSS pixels
 * @param {number}  [scale=1.0]    — desired zoom scale
 * @returns {{ panX: number, panY: number }|null}
 *   null if the era key is unrecognised.
 */
export function computePanForEra(eraKey, viewportWidth, scale) {
  if (scale == null) scale = 1.0;

  const bounds = getEraWorldBounds(eraKey);
  if (!bounds) return null;

  const eraCentreX = (bounds.minX + bounds.maxX) / 2;

  // Default viewport height to a reasonable value; Y pan only matters for
  // vertical centring of the spine, and the spine is always at world y=0,
  // so panY = viewportHeight/2.  We use 0 as a default so the caller can
  // supply their own height if needed — a Y-pan of 0 simply means the
  // spine's world origin stays at viewport y=0.
  const panX = viewportWidth / 2 - eraCentreX * scale;
  const panY = 0;

  return { panX, panY };
}

/**
 * Clamp a pan offset so the world remains at least partially visible within
 * the viewport — never pan so far that the entire world is off-screen.
 *
 * The world extends horizontally from 0 to worldWidth pixels (at scale 1).
 * After clamping, at least one edge of the world will be inside or touching
 * the viewport.
 *
 * @param {number} panX        — proposed pan X
 * @param {number} panY        — proposed pan Y
 * @param {number} scale       — current zoom scale
 * @param {number} worldWidth  — total world width in base pixels (at scale 1)
 * @returns {{ panX: number, panY: number }}
 */
export function clampPan(panX, panY, scale, worldWidth) {
  // At the current scale, the world spans worldWidth * scale viewport pixels.
  // Pan must keep at least some portion visible — don't pan past the edges.
  const scaledWorld = worldWidth * scale;

  // Allow panning up to 90% past the left edge so a sliver stays visible.
  const minPanX = -scaledWorld * 0.9;
  const maxPanX = worldWidth * 0.1; // keep a sliver of the right edge

  return {
    panX: Math.max(minPanX, Math.min(maxPanX, panX)),
    panY: panY,
  };
}
