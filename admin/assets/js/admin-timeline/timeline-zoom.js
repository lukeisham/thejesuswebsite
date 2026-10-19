/**
 * Admin timeline zoom module.
 *
 * Delegates zoom and pan to the shared AdminCanvasZoom module (admin-canvas-zoom.js):
 * `translate(panX, panY) scale(scale)` with `transform-origin: 0 0` on the
 * `.admin-timeline-world` wrapper, drag-to-pan on the canvas, and two zoom
 * buttons with no reset. The frontend timeline works the same way
 * (frontend/assets/js/timeline/timeline-zoom.js). Positions are fixed world
 * coordinates (`AdminTimelineGeometry.BASE_PX_PER_PERIOD` per period); zoom is
 * only the transform.
 *
 * Two things follow the transform:
 * - Line thickness. The era dividers sit inside the world, so `scale()` would
 *   thicken them. The `onChange` callback below publishes the live scale as
 *   `--timeline-zoom-scale` on the world element, and timeline-canvas.css
 *   divides the declared width by it. The spine belongs to the canvas, not the
 *   world, so it needs no correction.
 * - The era heading band. It sits in the canvas, outside the world.
 *   `Zoom.onTransformChange` lets timeline-events.js keep it in step with the
 *   zoom and pan (`Events.syncEraBand`).
 *
 * Read by timeline-events.js, timeline-nav.js, timeline-node-drag.js and
 * timeline-era-filter.js. Set up by the inline script in
 * admin/diagrams/timeline.html.
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
      panningClass: "admin-timeline-world--panning",
      onChange: function () {
        // Live-bind the scale for the CSS counter-scaling of era-divider lines.
        if (!worldEl) {
          console.warn("AdminTimelineZoom: worldEl missing, cannot set --timeline-zoom-scale");
          return;
        }
        var scale = canvasZoom.getScale();
        worldEl.style.setProperty("--timeline-zoom-scale", String(scale));

        var pan = canvasZoom.getPan();
        for (var i = 0; i < transformListeners.length; i++) {
          transformListeners[i]({ panX: pan.x, panY: pan.y, scale: scale });
        }
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
   * Return the effective px-per-period at the current zoom scale:
   * `BASE_PX_PER_PERIOD` times the scale. Density tiers compare against it.
   *
   * @returns {number}
   */
  Zoom.effectivePxPerPeriod = function () {
    return window.AdminTimelineGeometry.BASE_PX_PER_PERIOD * Zoom.getScale();
  };

  /**
   * Programmatic transform setter — used by chip-jump navigation
   * (timeline-nav.js) to centre an era at normal zoom.
   *
   * Clamps pan via AdminTimelineTransform.clampPan() so the world stays
   * at least partially visible, delegates to canvasZoom.setScale() /
   * setPan(), and fires `timeline:transformed` on .admin-timeline-world.
   *
   * @param {number} newPanX
   * @param {number} newPanY
   * @param {number} newScale
   * @param {string} [eraKey] — era key for the custom event detail
   */
  Zoom.setTransform = function (newPanX, newPanY, newScale, eraKey) {
    if (!canvasZoom) {
      console.warn("AdminTimelineZoom.setTransform: zoom not initialised");
      return;
    }

    // Guard: ensure all inputs are finite numbers
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

    var worldWidth = 3800; // 38 periods * 100px
    if (
      window.AdminTimelineTransform &&
      typeof window.AdminTimelineTransform.clampPan === "function"
    ) {
      var clamped = window.AdminTimelineTransform.clampPan(
        newPanX,
        newPanY,
        newScale,
        worldWidth,
      );
      newPanX = clamped.panX;
      newPanY = clamped.panY;
    }

    canvasZoom.setScale(newScale);
    canvasZoom.setPan(newPanX, newPanY);

    // Fire custom event
    var worldEl = document.querySelector(".admin-timeline-world");
    if (worldEl) {
      var detail = { panX: newPanX, panY: newPanY, scale: newScale };
      if (eraKey) detail.era = eraKey;
      worldEl.dispatchEvent(
        new CustomEvent("timeline:transformed", {
          bubbles: false,
          detail: detail,
        }),
      );
    }
  };
})();
