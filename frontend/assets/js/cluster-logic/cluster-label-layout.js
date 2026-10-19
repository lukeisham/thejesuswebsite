/**
 * Label layout for the horizontal timeline.
 *
 * Pure, DOM-free. Each node (a dot) gets a label that starts just to the right
 * of the dot. When that spot is taken, the label tries the left side, then
 * moves up or down in steps, still starting beside the dot's column, and gets a
 * leader line from the start of its name to the dot. A label never covers a
 * dot or another label while a free spot exists.
 *
 * All values are pixels in the dot field: the box that holds the dots, as wide
 * as the timeline and `TIMELINE_CANVAS_HEIGHT_PX` tall. The public renderer
 * (frontend/assets/js/timeline/timeline-render.js) and the admin editor
 * (admin/assets/js/admin-timeline/timeline-events.js, through
 * cluster-logic-bridge/cluster-label-layout-bridge.js) call the same functions,
 * so a title sits where the editor showed it. The vertical (mobile) layout has
 * its own label code.
 *
 * @module cluster-logic/cluster-label-layout
 */

/** Distance from a dot's centre to the nearest edge of a label beside it (px).
 * It covers the dot, its ring and its hover grow. */
export const DOT_CLEARANCE_PX = 7;

/** Gap between a dot and a label that sits beside it (px). */
const SIDE_GAP_PX = 4;

/** Gap kept free between two labels, and between a label and a dot (px). */
const OBSTACLE_GAP_PX = 3;

/** How far from the dot's centre a moved label starts (px). The leader line
 * covers the distance. */
const MOVED_OFFSET_PX = 16;

/** Largest number of steps a label moves up or down before the search gives up. */
export const MAX_LABEL_STEPS = 8;

/** Smallest distance a label keeps from the edge of the field (px). */
const FIELD_MARGIN_PX = 2;

/**
 * One label to place.
 *
 * @typedef {Object} LabelNode
 * @property {number} x - dot centre x in the field
 * @property {number} y - dot centre y in the field
 * @property {number} width - label width
 * @property {number} height - label height; 0 means the label is hidden and is not placed
 */

/**
 * The result for one label.
 *
 * @typedef {Object} PlacedLabel
 * @property {number} left - left edge of the label
 * @property {number} top - top edge of the label
 * @property {number} width
 * @property {number} height
 * @property {'right'|'left'} side - which side of the dot the label starts on
 * @property {boolean} leader - true when the label is not beside its dot, so a leader line is needed
 * @property {boolean} placed - false when no free spot was found and the label overlaps something
 */

/**
 * Whether two rectangles overlap, with a gap kept free around them.
 *
 * @param {{left:number, top:number, width:number, height:number}} a
 * @param {{left:number, top:number, width:number, height:number}} b
 * @param {number} gap
 * @returns {boolean}
 */
function overlaps(a, b, gap) {
  return (
    a.left < b.left + b.width + gap &&
    b.left < a.left + a.width + gap &&
    a.top < b.top + b.height + gap &&
    b.top < a.top + a.height + gap
  );
}

/**
 * Candidate spots for a label, in the order they are tried.
 *
 * @param {LabelNode} node
 * @returns {Array<{left:number, top:number, side:'right'|'left', leader:boolean}>}
 */
function candidatesFor(node) {
  const { x, y, width, height } = node;
  const midTop = y - height / 2;
  const step = height + OBSTACLE_GAP_PX;
  const right = x + DOT_CLEARANCE_PX + SIDE_GAP_PX;
  const left = x - DOT_CLEARANCE_PX - SIDE_GAP_PX - width;

  const list = [
    { left: right, top: midTop, side: "right", leader: false },
    { left, top: midTop, side: "left", leader: false },
  ];
  for (let t = 1; t <= MAX_LABEL_STEPS; t++) {
    list.push({ left: x + MOVED_OFFSET_PX, top: midTop - t * step, side: "right", leader: true });
    list.push({ left: x + MOVED_OFFSET_PX, top: midTop + t * step, side: "right", leader: true });
  }
  for (let t = 1; t <= MAX_LABEL_STEPS; t++) {
    list.push({ left: x - MOVED_OFFSET_PX - width, top: midTop - t * step, side: "left", leader: true });
    list.push({ left: x - MOVED_OFFSET_PX - width, top: midTop + t * step, side: "left", leader: true });
  }
  return list;
}

/**
 * Place a label for every node.
 *
 * Nodes are handled from left to right (then top to bottom), so the result does
 * not depend on the order of the input. Every node's dot is an obstacle, also
 * the dots of nodes whose label is hidden.
 *
 * @param {LabelNode[]} nodes
 * @param {{width:number, height:number}} field - size of the dot field
 * @returns {PlacedLabel[]} one entry per node, in the order of `nodes`
 */
export function layoutLabelsBesideNodes(nodes, field) {
  if (!Array.isArray(nodes) || !field || !(field.width > 0) || !(field.height > 0)) {
    console.warn("cluster-label-layout: nodes or field are missing or invalid");
    return [];
  }

  const dotBoxes = nodes.map((n) => ({
    left: n.x - DOT_CLEARANCE_PX,
    top: n.y - DOT_CLEARANCE_PX,
    width: DOT_CLEARANCE_PX * 2,
    height: DOT_CLEARANCE_PX * 2,
  }));

  const order = nodes
    .map((_, i) => i)
    .sort((a, b) => nodes[a].x - nodes[b].x || nodes[a].y - nodes[b].y || a - b);

  const result = new Array(nodes.length);
  const placedBoxes = [];

  for (const i of order) {
    const node = nodes[i];
    if (!(node.height > 0) || !(node.width > 0)) {
      result[i] = { left: node.x, top: node.y, width: 0, height: 0, side: "right", leader: false, placed: true };
      continue;
    }

    let chosen = null;
    for (const c of candidatesFor(node)) {
      const left = Math.max(FIELD_MARGIN_PX, Math.min(field.width - node.width - FIELD_MARGIN_PX, c.left));
      const top = Math.max(FIELD_MARGIN_PX, Math.min(field.height - node.height - FIELD_MARGIN_PX, c.top));
      const box = { left, top, width: node.width, height: node.height };

      const blocked =
        placedBoxes.some((p) => overlaps(box, p, OBSTACLE_GAP_PX)) ||
        dotBoxes.some((d, j) => j !== i && overlaps(box, d, OBSTACLE_GAP_PX)) ||
        overlaps(box, dotBoxes[i], 0);
      if (!blocked) {
        chosen = { ...box, side: c.side, leader: c.leader, placed: true };
        break;
      }
    }

    if (!chosen) {
      const first = candidatesFor(node)[0];
      chosen = {
        left: first.left,
        top: first.top,
        width: node.width,
        height: node.height,
        side: "right",
        leader: false,
        placed: false,
      };
      console.warn("cluster-label-layout: no free spot for a label; it overlaps another item", {
        x: node.x,
        y: node.y,
      });
    }

    result[i] = chosen;
    placedBoxes.push({ left: chosen.left, top: chosen.top, width: chosen.width, height: chosen.height });
  }

  return result;
}

/**
 * The leader line for a moved label: from the edge of the dot to the start of
 * the name. For a label on the right the start is its left edge; for a label on
 * the left it is the edge nearest the dot, its right edge. The line ends at the
 * middle of that edge.
 *
 * @param {{x:number, y:number}} node - dot centre
 * @param {number} radius - dot radius; the line starts on the dot's edge
 * @param {PlacedLabel} label - the placement of the label
 * @returns {{x1:number, y1:number, x2:number, y2:number}}
 */
export function computeLeaderLine(node, radius, label) {
  const x2 = label.side === "left" ? label.left + label.width : label.left;
  const y2 = label.top + label.height / 2;
  const dx = x2 - node.x;
  const dy = y2 - node.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x1: node.x + (dx / length) * radius,
    y1: node.y + (dy / length) * radius,
    x2,
    y2,
  };
}
