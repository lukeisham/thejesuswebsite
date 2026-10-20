/**
 * Admin timeline zoom module.
 *
 * Delegates zoom and pan to the shared AdminCanvasZoom module (admin-canvas-zoom.js):
 * `translate(panX, panY) scale(scale)` with `transform-origin: 0 0` on the
 * `.admin-timeline-world` wrapper, drag-to-pan on the canvas, and two zoom
 * buttons with no reset. The public timeline works the same way
 * (frontend/assets/js/timeline/timeline-zoom.js). Positions are fixed world
 * coordinates (`AdminTimelineGeometry.BASE_PX_PER_PERIOD` per period); zoom is
 * only the transform.
 *
 * Two things follow the transform:
 * - Line thickness. The spine and the era dividers sit inside the world, so
 *   `scale()` would thicken them. The `onChange` callback publishes the live
 *   scale as `--timeline-zoom-scale` on the world element, and
 *   admin/assets/css/admin-diagrams/timeline-canvas.css divides the spine's
 *   declared height and the era dividers' declared width by it. Renaming the property in one file breaks the other.
 * - The era heading band. It sits in the canvas, outside the world.
 *   `Zoom.onTransformChange` lets timeline-events.js keep it in step with the
 *   zoom and pan (`Events.syncEraBand`).
 *
 * Read by timeline-events.js, timeline-nav.js, timeline-node-drag.js and
 * timeline-era-filter.js. `Zoom.init` is called by the inline script in
 * admin/diagrams/timeline.html, after timeline-axis.js has built the world.
 * Needs `AdminCanvasZoom`, `AdminTimelineGeometry` and, in `setTransform`,
 * `AdminTimelineTransform`.
 *
 * @module admin-timeline/timeline-zoom
 */

window.AdminTimelineZoom = {};

(function () {
  var Zoom = window.AdminTimelineZoom;

  /** @type {Object|null} The AdminCanvasZoom instance. */
  var canvasZoom = null;

  /** @type {Array<function({panX: number, panY: number, scale: number}): void>} */
  var transformListeners = [];

  /**
   * Register a callback that runs after every zoom or pan.
   *
   * @param {function({panX: number, panY: number, scale: number}): void} listener
   * @returns {void}
   */
  Zoom.onTransformChange = function (listener) {
    transformListeners.push(listener);
  };

  /**
   * Create the AdminCanvasZoom instance bound to the `.admin-timeline-world`
   * element inside the viewport and wire the zoom-in / zoom-out toolbar buttons.
   *
   * @param {HTMLElement} viewportEl - the canvas viewport container
   * @returns {void}
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
      panningClass: "admin-timeline-world--panning",
      onChange: function () {
        var scale = canvasZoom.getScale();
        worldEl.style.setProperty("--timeline-zoom-scale", String(scale));

        var pan = canvasZoom.getPan();
        for (var i = 0; i < transformListeners.length; i++) {
          transformListeners[i]({ panX: pan.x, panY: pan.y, scale: scale });
        }
      },
    });

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
  };

  /**
   * Return the current zoom scale (delegates to canvasZoom).
   * Returns 1 before `init`, so a caller that runs earlier lays out at scale 1.
   *
   * @returns {number}
   */
  Zoom.getScale = function () {
    return canvasZoom ? canvasZoom.getScale() : 1;
  };

  /**
   * Return the current pan offset (delegates to canvasZoom).
   * Returns {x:0, y:0} before `init`.
   *
   * @returns {{ x: number, y: number }}
   */
  Zoom.getPan = function () {
    return canvasZoom ? canvasZoom.getPan() : { x: 0, y: 0 };
  };

  /**
   * Return the effective px-per-period at the current zoom scale:
   * `BASE_PX_PER_PERIOD` times the scale. The density tiers in
   * cluster-logic/cluster-density.js compare against it.
   *
   * @returns {number}
   */
  Zoom.effectivePxPerPeriod = function () {
    return window.AdminTimelineGeometry.BASE_PX_PER_PERIOD * Zoom.getScale();
  };

  /**
   * Programmatic transform setter, used by chip-jump navigation
   * (timeline-nav.js) to centre an era.
   *
   * Clamps pan with `AdminTimelineTransform.clampPan` so part of the world
   * stays visible, then sets scale and pan on the AdminCanvasZoom instance,
   * which runs `onChange` and so the transform listeners.
   *
   * @param {number} newPanX
   * @param {number} newPanY
   * @param {number} newScale
   * @returns {void}
   */
  Zoom.setTransform = function (newPanX, newPanY, newScale) {
    if (!canvasZoom) {
      console.warn("AdminTimelineZoom.setTransform: zoom not initialised");
      return;
    }

    if (
      !Number.isFinite(newPanX) ||
      !Number.isFinite(newPanY) ||
      !Number.isFinite(newScale)
    ) {
      console.warn("AdminTimelineZoom.setTransform: non-finite input, ignoring", {
        newPanX: newPanX,
        newPanY: newPanY,
        newScale: newScale,
      });
      return;
    }

    var geometry = window.AdminTimelineGeometry;
    var worldWidth = geometry.TIMELINE_PERIODS.length * geometry.BASE_PX_PER_PERIOD;
    var clamped = window.AdminTimelineTransform.clampPan(
      newPanX,
      newPanY,
      newScale,
      worldWidth,
    );

    canvasZoom.setScale(newScale);
    canvasZoom.setPan(clamped.panX, clamped.panY);
  };
})();
