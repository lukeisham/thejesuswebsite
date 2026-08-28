// Re-export only — no logic here. See ARCHITECTURE/node-cluster-logic.md.
/**
 * Admin timeline cluster-label-collision bridge.
 *
 * Wraps the canonical frontend cluster-label-collision.js module as a
 * window.AdminTimelineClusterLabelCollision global for classic admin scripts.
 * Handles DOM rect measurement so callers in admin/ only pass label elements
 * and receive resolved positions — the same pattern as the density/placement/
 * labels bridges.
 *
 * @module cluster-logic-bridge/cluster-label-collision-bridge
 */

import { resolveLabelCollisions } from "/assets/js/cluster-logic/cluster-label-collision.js";

window.AdminTimelineClusterLabelCollision = {
  /**
   * Resolve label collisions for admin timeline labels.
   *
   * Takes DOM label elements (now siblings of dots, not nested children),
   * measures their bounding rects, resolves overlaps via the shared module,
   * and applies the resolved positions back to the DOM.
   *
   * @param {Array} labelEls - array of label DOM elements
   * @param {'x'|'y'} axis   - primary axis for collision escalation
   * @param {number} primaryStep - pixels to shift per tier escalation
   */
  resolve: function (labelEls, axis, primaryStep) {
    if (!labelEls || labelEls.length === 0) return;

    // Build descriptors with measured rects
    var descriptors = [];
    for (var i = 0; i < labelEls.length; i++) {
      var el = labelEls[i];
      var rect = el.getBoundingClientRect();
      descriptors.push({
        el: el,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        tierIndex: parseInt(el.dataset.tierIndex || "0", 10),
        axis: axis,
        primaryStep: primaryStep || 12,
      });
    }

    // Sort by tierIndex before resolving
    descriptors.sort(function (a, b) { return a.tierIndex - b.tierIndex; });

    // Resolve collisions using the shared module
    var resolved = resolveLabelCollisions(descriptors);

    // Apply resolved positions back to the DOM.
    // Labels are absolutely positioned with left centred on the dot's x.
    // The collision module shifts the label's y position (for axis='x',
    // horizontal mode) or x position (for axis='y', vertical mode).
    for (var j = 0; j < resolved.length; j++) {
      var item = resolved[j];
      var el = item.el;
      if (axis === "x") {
        // For horizontal mode, labels are positioned with top as percentage
        // relative to the world container. The primaryStep is in percentage
        // points, and the tier escalation shifts the top value.
        var dotTopStr = el.dataset.originalTop || "50%";
        var dotTop = parseFloat(dotTopStr);
        if (Number.isFinite(dotTop)) {
          var clearance = 10; // LABEL_CLEARANCE_PCT matching frontend
          var isAbove = dotTop <= 50;
          // Reconstruct: the label's top starts at dotTop ± clearance,
          // then each tier escalation adds/subtracts primaryStep
          var baseTop = isAbove
            ? dotTop - clearance
            : dotTop + clearance;
          var shift = 0;
          if (item.tierIndex > 0) {
            var direction = item.tierIndex % 2 === 1 ? -1 : 1;
            shift = direction * primaryStep * Math.ceil(item.tierIndex / 2);
          }
          el.style.top = (baseTop + shift) + "%";
        }
      } else {
        // Vertical mode — left position (not used in admin currently)
        var dotLeftStr = el.dataset.originalLeft || "50%";
        var dotLeft = parseFloat(dotLeftStr);
        if (Number.isFinite(dotLeft)) {
          el.style.left = (dotLeft + (item.tierIndex > 0 ? item.tierIndex * primaryStep : 0)) + "%";
        }
      }
      el.dataset.tierIndex = String(item.tierIndex);
    }
  },
};
