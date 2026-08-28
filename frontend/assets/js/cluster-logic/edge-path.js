/**
 * Arbor edge-path module.
 *
 * Pure, DOM-free helper that computes an SVG path `d` string for an
 * orthogonal edge route with rounded corners. Shared by the public arbor
 * renderer (arbor/arbor-render.js) and the admin arbor editor (via
 * admin/assets/js/cluster-logic-bridge/edge-path-bridge.js) so both draw
 * edges identically.
 *
 * @module cluster-logic/edge-path
 */

/**
 * Vertical gap the path extends below source / above target before turning.
 */
const EDGE_PATH_GAP = 20;

/**
 * Horizontal offset per parallel edge on the same source→target pair (px).
 */
const EDGE_PARALLEL_OFFSET = 12;

/**
 * Compute an SVG path `d` string for an orthogonal edge route with rounded
 * corners.  Edges sharing the same (source, target) pair are offset
 * horizontally so they run parallel instead of overlapping.
 *
 * Anchor points:
 *   source → centre-bottom of source node
 *   target → centre-top of target node
 *
 * Route shape (no waypoints):
 *   source ↓ gap → horizontal → ↑ gap → target
 *   (flipped when target is above source)
 *
 * Route shape (with waypoints): source → straight segments through each
 * waypoint in order → target. Waypoints are user-placed bend points (the
 * re-route feature), so no automatic gap/turn is inserted between them —
 * the admin creates right angles by placing waypoints on the grid.
 * A present `waypoints` array overrides `offsetIndex` entirely: manual
 * routing already avoids overlap, so the parallel-edge offset no longer
 * applies to this edge.
 *
 * @param {number} sx  - source centre-x (diagram coords)
 * @param {number} sy  - source bottom-y
 * @param {number} tx  - target centre-x
 * @param {number} ty  - target top-y
 * @param {number} offsetIndex - 0 for first edge, 1,2,… for parallel edges (ignored if waypoints present)
 * @param {Array<{x: number, y: number}>} [waypoints] - ordered bend points from a re-route
 * @returns {string} SVG path `d` attribute
 */
export function computeEdgePath(sx, sy, tx, ty, offsetIndex, waypoints) {
  // Waypoints are the admin's manual-correction escape hatch: when present,
  // they must override the computed route entirely. A change to this function
  // that forgets to check them first silently discards admin re-routing edits.
  if (Array.isArray(waypoints) && waypoints.length > 0) {
    var d = "M " + sx + " " + sy;
    for (var w = 0; w < waypoints.length; w++) {
      d += " L " + waypoints[w].x + " " + waypoints[w].y;
    }
    d += " L " + tx + " " + ty;
    return d;
  }

  // Alternate offset direction: 0=straight, 1=+right, 2=-left, 3=+2×right, …
  var dir = offsetIndex % 2 === 0 ? -1 : 1;
  var mag = Math.ceil(offsetIndex / 2);
  var offset = dir * mag * EDGE_PARALLEL_OFFSET;

  // If nodes are vertically aligned, draw straight
  if (Math.abs(sx - tx) < 5) {
    if (offsetIndex === 0) {
      return "M " + sx + " " + sy + " L " + tx + " " + ty;
    }
    // Vertical with offset: slight dog-leg
    var midY = (sy + ty) / 2;
    return (
      "M " + sx + " " + sy +
      " L " + (sx + offset) + " " + midY +
      " L " + (tx + offset) + " " + midY +
      " L " + tx + " " + ty
    );
  }

  // Target below source: route down → across → down
  // Target above source: route up → across → up
  var gap = ty > sy ? EDGE_PATH_GAP : -EDGE_PATH_GAP;

  return (
    "M " + sx + " " + sy +
    " L " + sx + " " + (sy + gap) +
    " L " + (tx + offset) + " " + (sy + gap) +
    " L " + (tx + offset) + " " + (ty - gap) +
    " L " + tx + " " + ty
  );
}
