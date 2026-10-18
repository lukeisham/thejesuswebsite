/**
 * Admin timeline label-collision adapter.
 *
 * Measures the label elements, passes the measurements to the shared resolver
 * `resolveLabelCollisions` (frontend/assets/js/cluster-logic/cluster-label-collision.js),
 * and writes the resolved tier back to each label's `style.top` (or `style.left`
 * in vertical mode). The shared resolver is pure; this file holds the DOM work.
 *
 * Reads `window.AdminTimelineClusterLabelCollision`, which
 * cluster-logic-bridge/cluster-label-collision-bridge.js publishes. That bridge
 * must load first (admin/diagrams/timeline.html). Called by
 * timeline-events.js (`Events.renderEvents`) after all labels are attached.
 *
 * The public renderer has a similar function, `resolveLabelCollisions` in
 * frontend/assets/js/timeline/timeline-render.js. The two stay separate: the
 * public one reads the label position from its inline style, this one reads it
 * from `data-original-top`.
 *
 * @module admin-timeline/timeline-label-collision
 */

window.AdminTimelineLabelCollision = {};
const LabelCollision = window.AdminTimelineLabelCollision;

/**
 * Resolve label overlaps and move the labels to their resolved positions.
 *
 * Each label needs `data-original-top` (horizontal mode) or `data-original-left`
 * (vertical mode) and `data-tier-index`. The resolved tier is written back to
 * `data-tier-index`.
 *
 * `data-original-top` is the dot position already moved by the clearance, and
 * this function adds the clearance once more. The public renderer adds it once.
 * Admin labels therefore sit farther from their dots than public labels.
 *
 * @param {HTMLElement[]} labelEls - label elements, attached to the document
 * @param {'x'|'y'} axis - 'x' for the horizontal timeline, 'y' for vertical
 * @param {number} primaryStep - percent of the canvas height to move per tier
 * @returns {void}
 */
LabelCollision.resolve = function (labelEls, axis, primaryStep) {
  if (!labelEls || labelEls.length === 0) return;

  const bridge = window.AdminTimelineClusterLabelCollision;
  if (!bridge) {
    console.warn(
      "timeline-label-collision.js: window.AdminTimelineClusterLabelCollision is missing. Load cluster-label-collision-bridge.js before this script.",
    );
    return;
  }

  const step = primaryStep || bridge.TIER_STEP_PCT;

  // The resolver compares measured rects (screen px), so it needs the step in
  // screen px. In horizontal mode the step is a percentage of the parent
  // height: 12% is about 34px, not 12px.
  let stepPx = step;
  if (axis === "x") {
    const parent = labelEls[0].offsetParent;
    const parentH = parent ? parent.offsetHeight : 0;
    const scale = parentH > 0 ? parent.getBoundingClientRect().height / parentH : 1;
    stepPx = (step / 100) * parentH * (scale || 1);
  }

  const descriptors = [];
  for (let i = 0; i < labelEls.length; i++) {
    const el = labelEls[i];
    const rect = el.getBoundingClientRect();
    descriptors.push({
      el: el,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      tierIndex: parseInt(el.dataset.tierIndex || "0", 10),
      axis: axis,
      primaryStep: stepPx,
    });
  }

  descriptors.sort(function (a, b) {
    return a.tierIndex - b.tierIndex;
  });

  const resolved = bridge.resolveLabelCollisions(descriptors);

  // Labels are absolutely positioned. The resolver shifts a label along y in
  // horizontal mode and along x in vertical mode.
  for (let j = 0; j < resolved.length; j++) {
    const item = resolved[j];
    const el = item.el;
    if (axis === "x") {
      const dotTop = parseFloat(el.dataset.originalTop || "50%");
      if (Number.isFinite(dotTop)) {
        const isAbove = dotTop <= 50;
        const baseTop = isAbove
          ? dotTop - bridge.LABEL_CLEARANCE_PCT
          : dotTop + bridge.LABEL_CLEARANCE_PCT;
        el.style.top = baseTop + bridge.tierShift(item.tierIndex, step) + "%";
      }
    } else {
      const dotLeft = parseFloat(el.dataset.originalLeft || "50%");
      if (Number.isFinite(dotLeft)) {
        el.style.left = dotLeft + (item.tierIndex > 0 ? item.tierIndex * primaryStep : 0) + "%";
      }
    }
    el.dataset.tierIndex = String(item.tierIndex);
  }
};
