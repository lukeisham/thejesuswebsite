/**
 * Cluster label collision resolution module.
 *
 * Pure, DOM-free helper that resolves label overlapping after initial placement.
 * Takes an array of label descriptors (each with its initial position, bounding
 * dimensions, tier index, and axis) and returns resolved positions after
 * escalating colliding labels through higher tiers.
 *
 * Algorithm:
 * 1. Sort labels by their tierIndex ascending.
 * 2. For each label, check if its bounding rect overlaps any already-placed label.
 * 3. If overlapping, escalate to the next tier (max tier = 10) and alternate
 *    the push direction so labels fan out to both sides.
 * 4. Side never flips — a label above the spine stays above, below stays below.
 *
 * This is the shared canonical implementation consumed by both the public
 * frontend timeline (via ES module import) and the admin editor (via the
 * cluster-label-collision-bridge.js global wrapper).
 *
 * @module cluster-logic/cluster-label-collision
 */

/** Minimum pixel gap enforced between adjacent label bounding boxes. */
export const LABEL_GAP_PX = 8;

/** Maximum escalation tier — labels stop fanning out beyond this. */
export const MAX_TIER = 10;

/**
 * Descriptor for a single label to be collision-resolved.
 *
 * @typedef {Object} LabelDescriptor
 * @property {number} x       - centre x of the label (pixels, in world coordinates)
 * @property {number} y       - centre y of the label
 * @property {number} width   - label width in pixels
 * @property {number} height  - label height in pixels
 * @property {number} tierIndex - starting tier (0 = closest to spine)
 * @property {'x'|'y'} axis    - primary axis for collision escalation
 * @property {number} primaryStep - pixels to shift per tier escalation
 */

/**
 * Check whether two rectangles overlap with a gap allowance.
 *
 * @param {{x:number, y:number, w:number, h:number}} a
 * @param {{x:number, y:number, w:number, h:number}} b
 * @returns {boolean}
 */
function rectsOverlap(a, b) {
  if (!a || !b) return false;
  const gap = LABEL_GAP_PX;
  const aLeft = a.x - a.w / 2;
  const aRight = a.x + a.w / 2;
  const aTop = a.y - a.h / 2;
  const aBottom = a.y + a.h / 2;
  const bLeft = b.x - b.w / 2;
  const bRight = b.x + b.w / 2;
  const bTop = b.y - b.h / 2;
  const bBottom = b.y + b.h / 2;

  return (
    aRight + gap > bLeft &&
    bRight + gap > aLeft &&
    aBottom + gap > bTop &&
    bBottom + gap > aTop
  );
}

/**
 * Resolve label collisions by escalating overlapping labels through tiers.
 * Labels are sorted by tierIndex, then each is tested against already-placed
 * labels. On collision, the label is pushed to the next tier (alternating
 * direction), up to MAX_TIER. Side never flips.
 *
 * This is DOM-free: callers pass pre-measured label dimensions and apply the
 * returned positions themselves.
 *
 * @param {LabelDescriptor[]} descriptors - array of label descriptors with
 *   initial positions and sizes
 * @returns {Array} same descriptors with updated `tierIndex` and `x`/`y` values
 *   reflecting the resolved position after collision escalation
 */
export function resolveLabelCollisions(descriptors) {
  if (!descriptors || descriptors.length === 0) return [];

  // Work on a sorted copy so we don't mutate the caller's array order
  const items = descriptors
    .map((d) => ({ ...d }))
    .sort((a, b) => a.tierIndex - b.tierIndex);

  const axis = items[0].axis;
  const placed = [];

  for (const item of items) {
    // Save origin so net shift is always relative to starting position
    const origX = item.x;
    const origY = item.y;
    let tier = item.tierIndex;
    let rect = { x: item.x, y: item.y, w: item.width, h: item.height };
    let collides = false;

    do {
      collides = false;
      for (const pr of placed) {
        if (rectsOverlap(rect, pr)) {
          collides = true;
          tier++;
          if (tier > MAX_TIER) {
            tier = MAX_TIER;
            break;
          }
          // A label's above/below side was fixed by its starting position and
          // must never flip once escalation begins — flip-flopping reads as
          // jitter to the eye, and it fails silently: no error, just a
          // visually unstable page under certain data. Alternating the push
          // direction fans labels out to both sides.
          // Tier 1: negative, Tier 2: positive, Tier 3: negative, etc.
          const direction = tier % 2 === 1 ? -1 : 1;
          const netShift = direction * item.primaryStep * Math.ceil(tier / 2);
          // axis='x' (horizontal): shift along y (labels fan out vertically)
          // axis='y' (vertical): shift along x (labels fan out horizontally)
          if (axis === "x") {
            item.y = origY + netShift;
          } else {
            item.x = origX + netShift;
          }
          rect = { x: item.x, y: item.y, w: item.width, h: item.height };
          break;
        }
      }
    } while (collides && tier < MAX_TIER);

    item.tierIndex = tier;
    placed.push(rect);
  }

  return items;
}
