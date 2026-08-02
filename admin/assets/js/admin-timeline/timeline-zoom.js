/**
 * Admin timeline zoom module.
 *
 * Delegates to the shared AdminCanvasZoom module for zoom/pan via
 * CSS transform — the same model used by the frontend timeline and
 * admin arbor canvas: translate(panX,panY) scale(scale) with
 * transform-origin: 0 0, drag deltas added directly to pan (no scale
 * division), two-button controls only (no reset).
 *
 * This replaces the old pxPerPeriod/panOffset/scrollLeft conflation
 * entirely. There is now only one coordinate system: fixed
 * BASE_PX_PER_PERIOD world coordinates, with zoom applied as a
 * CSS transform on an `.admin-timeline-world` wrapper.
 *
 * @module admin-timeline/timeline-zoom
 */

window.AdminTimelineZoom = {};

(function () {
  var Zoom = window.AdminTimelineZoom;

  /** @type {Object|null} The AdminCanvasZoom instance. */
  var canvasZoom = null;

  /**
   * Initialise zoom/pan controls for the admin timeline editor.
   * Creates an AdminCanvasZoom instance bound to the `.admin-timeline-world`
   * element and wires the zoom-in / zoom-out toolbar buttons.
   *
   * @param {HTMLElement} viewportEl  - the canvas viewport container
   */
  Zoom.init = function (viewportEl) {
    if (!viewportEl) {
      console.warn("AdminTimelineZoom.init: viewport element not provided");
      return;
    }

    var worldEl = viewportEl.querySelector(".admin-timeline-world");
    if (!worldEl) {
      console.warn("AdminTimelineZoom.init: .admin-timeline-world not found in viewport");
      return;
    }

    canvasZoom = window.AdminCanvasZoom.create({
      worldEl: worldEl,
      viewportEl: viewportEl,
      minScale: 0.3,
      maxScale: 3.0,
      step: 1.25,
      onChange: function () {
        // Notify any listener that zoom/pan changed
      },
    });

    // Wire toolbar zoom buttons
    var zoomInBtn = document.getElementById("timeline-zoom-in");
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", function () {
        if (canvasZoom) canvasZoom.zoomIn();
      });
    }

    var zoomOutBtn = document.getElementById("timeline-zoom-out");
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", function () {
        if (canvasZoom) canvasZoom.zoomOut();
      });
    }

    // Note: no reset button — two-button controls only, matching arbor.
  };

  /**
   * Return the current zoom scale (delegates to canvasZoom).
   * Returns 1 if zoom has not been initialised.
   *
   * @returns {number}
   */
  Zoom.getScale = function () {
    return canvasZoom ? canvasZoom.getScale() : 1;
  };

  /**
   * Return the current pan offset (delegates to canvasZoom).
   * Returns {x:0, y:0} if zoom has not been initialised.
   *
   * @returns {{ x: number, y: number }}
   */
  Zoom.getPan = function () {
    return canvasZoom ? canvasZoom.getPan() : { x: 0, y: 0 };
  };

  /**
   * Return the effective px-per-period at the current zoom scale.
   * This is BASE_PX_PER_PERIOD (100) * current scale.
   * Replaces the old getPxPerPeriod() / getPanOffset() pattern.
   *
   * @returns {number}
   */
  Zoom.effectivePxPerPeriod = function () {
    return 100 * Zoom.getScale();
  };
})();
