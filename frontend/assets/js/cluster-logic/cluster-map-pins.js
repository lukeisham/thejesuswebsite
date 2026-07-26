/**
 * Map-pin clustering module.
 *
 * Pure, DOM-free module that detects pins sharing identical or
 * near-identical coordinates (in percentage-space, 0-100 on x/y) and fans
 * them radially outward from their shared anchor point, so overlapping pins
 * remain distinguishable and clickable. Spacing scales with the public
 * frontend's zoom level (tighter when zoomed in, wider when zoomed out);
 * admin has no zoom concept and calls with the default zoomLevel of 1.0.
 *
 * Mirrors the timeline's cluster-density.js / cluster-placement.js /
 * cluster-labels.js pattern, but fans radially (angle + radius) instead of
 * stacking vertically, since map pins have no natural "period" axis.
 *
 * @module cluster-logic/cluster-map-pins
 */

import { computeLabelModes } from "./cluster-labels.js";

/**
 * Proximity threshold (in percentage-space units) below which two pins are
 * considered part of the same cluster. Percentage-space is a normalised
 * 0-100 square, so this is agnostic to actual map image dimensions.
 */
export const PROXIMITY_THRESHOLD = 2;

/**
 * Base radial spacing (in percentage-space units) between fanned pins at
 * zoomLevel 1.0.
 */
const BASE_RADIUS = 2.5;

/** Public frontend zoom range, mirrored from maps-interactions.js. */
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

/**
 * Group pins into clusters using simple proximity: any pin within
 * PROXIMITY_THRESHOLD percentage-units of any pin already in a cluster
 * joins that cluster (single-linkage).
 *
 * @param {Array<{x: number, y: number}>} pins
 * @param {number} [threshold=PROXIMITY_THRESHOLD]
 * @returns {Array<Array<number>>} Array of clusters, each an array of
 *   indices into the input `pins` array. Every pin belongs to exactly one
 *   cluster (clusters of size 1 are unclustered pins).
 */
export function detectClusters(pins, threshold = PROXIMITY_THRESHOLD) {
  const n = pins.length;
  const visited = new Array(n).fill(false);
  const clusters = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;

    const cluster = [i];
    visited[i] = true;

    // Single-linkage: keep expanding the cluster while any unvisited pin
    // is within threshold of any pin already in the cluster.
    let grew = true;
    while (grew) {
      grew = false;
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        for (const k of cluster) {
          if (distance(pins[j], pins[k]) <= threshold) {
            cluster.push(j);
            visited[j] = true;
            grew = true;
            break;
          }
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Euclidean distance between two percentage-space points.
 *
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {number}
 */
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compute the radial fan spacing (percentage-space radius step between
 * successive rings of a cluster) for a given zoom level.
 *
 * Inverted relative to the timeline's zoom-to-spacing relationship: at high
 * zoom (near ZOOM_MAX) pins are already visually larger on screen, so
 * spacing is tighter; at low zoom (near ZOOM_MIN) spacing is wider so
 * fanned pins stay distinguishable.
 *
 * @param {number} [zoomLevel=1.0]
 * @returns {number} Radial spacing in percentage-space units.
 */
export function getZoomScaledSpacing(zoomLevel = 1.0) {
  const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel));
  // Linear inverse: spacing halves from ZOOM_MIN to ZOOM_MAX.
  const t = (clamped - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  const MIN_FACTOR = 0.6;
  const MAX_FACTOR = 1.5;
  const factor = MAX_FACTOR - t * (MAX_FACTOR - MIN_FACTOR);
  return BASE_RADIUS * factor;
}

/**
 * Compute a radial offset (in percentage-space units) for each pin in a
 * cluster, fanning outward evenly from the shared anchor. A cluster of size
 * 1 gets a zero offset (no fan needed).
 *
 * @param {number} clusterSize - number of pins in the cluster.
 * @param {number} indexInCluster - this pin's index within the cluster (0-based).
 * @param {number} spacing - radial spacing from getZoomScaledSpacing().
 * @returns {{xOffset: number, yOffset: number}}
 */
export function computeRadialOffset(clusterSize, indexInCluster, spacing) {
  if (clusterSize <= 1) return { xOffset: 0, yOffset: 0 };

  const angleStep = (2 * Math.PI) / clusterSize;
  const angle = indexInCluster * angleStep - Math.PI / 2; // start pointing up
  return {
    xOffset: Math.cos(angle) * spacing,
    yOffset: Math.sin(angle) * spacing,
  };
}

/**
 * Compute fan offsets for a full set of pins: detects clusters, then
 * assigns each pin a radial offset around its cluster's shared anchor.
 *
 * @param {Array<{x: number, y: number}>} pins
 * @param {number} [zoomLevel=1.0]
 * @param {number} [threshold=PROXIMITY_THRESHOLD]
 * @returns {Array<{xOffset: number, yOffset: number, clusterSize: number, clusterId: number}>}
 *   One entry per input pin, in the same order.
 */
export function computePinOffsets(
  pins,
  zoomLevel = 1.0,
  threshold = PROXIMITY_THRESHOLD,
) {
  const offsets = new Array(pins.length);
  const clusters = detectClusters(pins, threshold);
  const spacing = getZoomScaledSpacing(zoomLevel);

  clusters.forEach((cluster, clusterId) => {
    cluster.forEach((pinIndex, indexInCluster) => {
      const { xOffset, yOffset } = computeRadialOffset(
        cluster.length,
        indexInCluster,
        spacing,
      );
      offsets[pinIndex] = {
        xOffset,
        yOffset,
        clusterSize: cluster.length,
        clusterId,
      };
    });
  });

  return offsets;
}

/**
 * Compute label display modes for clustered pins, delegating the actual
 * escalation rules to the timeline's computeLabelModes. Map clusters have
 * no "period" axis, so each pin is adapted into a descriptor keyed by its
 * own cluster id (all pins in the same cluster share one synthetic period,
 * so distinct clusters of the same size never get merged into one count).
 *
 * @param {Array<{clusterId: number}>} pinOffsets - from computePinOffsets.
 * @param {string} densityTier - "compact" | "normal" | "spread" (see cluster-density.js).
 * @returns {Array<{mode: string}>} One entry per input pin, in the same order.
 */
export function computePinLabelModes(pinOffsets, densityTier) {
  const descriptors = pinOffsets.map((offset, i) => ({
    event: { id: i, timeline_period: `cluster-${offset.clusterId}` },
  }));

  return computeLabelModes(descriptors, densityTier).map((m) => ({
    mode: m.mode,
  }));
}
