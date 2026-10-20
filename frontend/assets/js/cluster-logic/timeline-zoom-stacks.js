/**
 * Zoom stacks for the horizontal public timeline.
 *
 * Pure, DOM-free. When the view is zoomed out, nodes that are close on screen
 * gather into a neat vertical column (a stack) at their average position along
 * the time axis, so the timeline stays readable and each stack still sits about
 * where its nodes really are. As the view zooms in, every node glides to the
 * exact spot that the admin dragged it to. In between, a blend value from 0 to 1
 * moves each node from its stack spot to its exact spot.
 *
 * All positions are world pixels at scale 1: x along the time axis, y down the
 * dot field (`TIMELINE_CANVAS_HEIGHT_PX` tall). Distances that must look the
 * same on screen at every zoom (the merge distance and the spacing inside a
 * stack) are divided by the scale. The admin editor never stacks: it needs
 * exact dots to drag.
 *
 * Called by timeline-render.js (`applyZoomStacks`). timeline-interactions.js
 * uses `fitStackView` to zoom to a stack when it is clicked.
 *
 * @module cluster-logic/timeline-zoom-stacks
 */

/** Nodes within this many screen pixels along the time axis share a stack. */
export const STACK_MERGE_PX = 44;

/** Distance between neighbouring dots in a stack column, in screen pixels. */
export const STACK_SPACING_PX = 13;

/** Zoom scale below which nodes sit in stacks. */
export const STACK_BLEND_START = 0.6;

/** Zoom scale from which every node sits at its exact position. This is the
 * default zoom (1), so the page opens with every node where the admin put it. */
export const STACK_BLEND_END = 1;

/**
 * How far a node has moved from its stack spot to its exact spot.
 *
 * @param {number} scale - current zoom scale
 * @returns {number} 0 at or below `STACK_BLEND_START`, 1 at or above `STACK_BLEND_END`
 */
export function stackBlend(scale) {
  const t = (scale - STACK_BLEND_START) / (STACK_BLEND_END - STACK_BLEND_START);
  return Math.max(0, Math.min(1, t));
}

/**
 * One stack of two or more nodes.
 *
 * @typedef {Object} Stack
 * @property {number[]} members - indexes into the input list, in column order (top to bottom)
 * @property {number} x - mean position of the members along the time axis
 * @property {number} y - centre of the column
 * @property {number} count - number of members
 * @property {number} minX - smallest exact x among the members
 * @property {number} maxX - largest exact x among the members
 */

/**
 * Work out the stacks for a zoom scale and where each node goes.
 *
 * Nodes are sorted by x. A new stack starts when a node is more than
 * `STACK_MERGE_PX` (on screen) from the first node of the current stack, so a
 * long chain of close nodes cannot grow one huge stack. A node with no
 * neighbour stays alone and always sits at its exact position.
 *
 * @param {Array<{x:number, y:number}>} nodes - exact world positions
 * @param {number} scale - current zoom scale, above 0
 * @param {number} spineY - world y of the column centre (the spine)
 * @returns {{blend:number, collapsed:boolean, stacks:Stack[], positions:Array<{x:number, y:number, stackIndex:number}>}}
 *   `positions` has one entry per node, in the order of `nodes`. `stackIndex` is
 *   the index into `stacks`, or -1 for a node that is alone. `collapsed` is true
 *   while stacks are shown as stacks (the blend is 0.5 or less).
 */
export function computeZoomStacks(nodes, scale, spineY) {
  if (!Array.isArray(nodes) || !Number.isFinite(scale) || scale <= 0) {
    console.warn("timeline-zoom-stacks: nodes or scale are missing or invalid", { scale });
    return { blend: 1, collapsed: false, stacks: [], positions: [] };
  }

  const blend = stackBlend(scale);
  const order = nodes.map((_, i) => i).sort((a, b) => nodes[a].x - nodes[b].x || a - b);

  const groups = [];
  let current = null;
  for (const i of order) {
    if (!current || (nodes[i].x - nodes[current[0]].x) * scale > STACK_MERGE_PX) {
      current = [i];
      groups.push(current);
    } else {
      current.push(i);
    }
  }

  const spacing = STACK_SPACING_PX / scale;
  const stacks = [];
  const positions = nodes.map((n) => ({ x: n.x, y: n.y, stackIndex: -1 }));

  for (const group of groups) {
    if (group.length < 2) continue;

    const members = [...group].sort((a, b) => nodes[a].y - nodes[b].y || a - b);
    const meanX = group.reduce((sum, i) => sum + nodes[i].x, 0) / group.length;
    const stackIndex = stacks.length;
    stacks.push({
      members,
      x: meanX,
      y: spineY,
      count: group.length,
      minX: Math.min(...group.map((i) => nodes[i].x)),
      maxX: Math.max(...group.map((i) => nodes[i].x)),
    });

    members.forEach((nodeIndex, rank) => {
      const stackY = spineY + (rank - (members.length - 1) / 2) * spacing;
      positions[nodeIndex] = {
        x: meanX + (nodes[nodeIndex].x - meanX) * blend,
        y: stackY + (nodes[nodeIndex].y - stackY) * blend,
        stackIndex,
      };
    });
  }

  return { blend, collapsed: blend <= 0.5, stacks, positions };
}

/**
 * The zoom scale and pan that show a stack's nodes at their exact positions.
 *
 * The scale is large enough for the nodes to fill about half the view, never
 * below `STACK_BLEND_END` (so the stack dissolves) and never outside the limits.
 * The pan puts the middle of the nodes in the middle of the view.
 *
 * @param {number} minX - smallest exact x of the stack's nodes
 * @param {number} maxX - largest exact x
 * @param {number} viewportWidth - width of the timeline view in screen pixels
 * @param {number} minScale - smallest scale the zoom allows (`SCALE_MIN` in timeline-zoom.js)
 * @param {number} maxScale - largest scale the zoom allows (`SCALE_MAX` in timeline-zoom.js)
 * @returns {{scale:number, panX:number}}
 */
export function fitStackView(minX, maxX, viewportWidth, minScale, maxScale) {
  const span = Math.max(maxX - minX, 1);
  const wanted = (viewportWidth * 0.5) / span;
  const scale = Math.max(minScale, Math.min(maxScale, Math.max(wanted, STACK_BLEND_END)));
  const centreX = (minX + maxX) / 2;
  return { scale, panX: viewportWidth / 2 - centreX * scale };
}
