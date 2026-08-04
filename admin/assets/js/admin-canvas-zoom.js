/**
 * Admin shared canvas-zoom module.
 *
 * Reusable zoom/pan module for admin diagram editors.  Same transform model
 * as the frontend timeline zoom and admin arbor canvas: translate(panX,panY)
 * scale(scale) with transform-origin: 0 0, drag deltas added directly to pan
 * (no scale division), two button controls (zoom-in/zoom-out, no reset).
 *
 * Created for the admin timeline editor as first consumer; admin arbor keeps
 * its own separate zoom/pan implementation (admin/assets/js/admin-arbor/arbor-canvas.js)
 * as accepted duplication, not pending consolidation (Issues.md #171/#185) -
 * any zoom/pan bug fixed here MUST also be checked against arbor-canvas.js,
 * and vice versa.
 *
 * @module admin-canvas-zoom
 */

window.AdminCanvasZoom = {};

(function () {
  var CanvasZoom = window.AdminCanvasZoom;

  /**
   * Create a new zoom/pan controller bound to a world element inside a viewport.
   *
   * @param {Object}    opts
   * @param {HTMLElement} opts.worldEl   — the element receiving the CSS transform
   * @param {HTMLElement} opts.viewportEl — the viewport that captures drag events
   * @param {number}   [opts.minScale=0.3]   — minimum zoom scale
   * @param {number}   [opts.maxScale=3.0]   — maximum zoom scale
   * @param {number}   [opts.step=1.25]      — zoom step multiplier
   * @param {Function} [opts.onChange]       — called after every transform update
   * @returns {{ zoomIn: Function, zoomOut: Function, getScale: Function, getPan: Function }}
   */
  CanvasZoom.create = function (opts) {
    if (!opts || !opts.worldEl) {
      console.warn("AdminCanvasZoom.create: worldEl is required");
      return {
        zoomIn: function () {},
        zoomOut: function () {},
        getScale: function () { return 1; },
        getPan: function () { return { x: 0, y: 0 }; },
      };
    }

    var worldEl = opts.worldEl;
    var viewportEl = opts.viewportEl || null;
    var minScale = opts.minScale != null ? opts.minScale : 0.3;
    var maxScale = opts.maxScale != null ? opts.maxScale : 3.0;
    var step = opts.step != null ? opts.step : 1.25;
    var onChange = opts.onChange || null;

    // ── State ──────────────────────────────────────────────────────────────────

    var scale = 1.0;
    var panX = 0;
    var panY = 0;

    // ── Pan state ──────────────────────────────────────────────────────────────

    var panning = false;
    var panStartClientX = 0;
    var panStartClientY = 0;
    var panStartPanX = 0;
    var panStartPanY = 0;

    // ── Transform ──────────────────────────────────────────────────────────────

    function applyTransform() {
      worldEl.style.transform =
        "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
      if (onChange) onChange();
    }

    // ── Zoom ───────────────────────────────────────────────────────────────────

    function zoomIn() {
      var newScale = Math.min(maxScale, scale * step);
      if (newScale === scale) return;
      scale = newScale;
      applyTransform();
    }

    function zoomOut() {
      var newScale = Math.max(minScale, scale / step);
      if (newScale === scale) return;
      scale = newScale;
      applyTransform();
    }

    // ── Pan ────────────────────────────────────────────────────────────────────

    function onPanStart(clientX, clientY, target) {
      // Don't start pan if clicking on an event dot or control
      if (target && (target.closest(".admin-timeline-event") || target.closest(".admin-timeline-controls"))) {
        return;
      }

      panning = true;
      panStartClientX = clientX;
      panStartClientY = clientY;
      panStartPanX = panX;
      panStartPanY = panY;

      if (viewportEl) {
        viewportEl.style.cursor = "grabbing";
      }
    }

    function onPanMove(clientX, clientY) {
      if (!panning) return;

      panX = panStartPanX + (clientX - panStartClientX);
      panY = panStartPanY + (clientY - panStartClientY);

      applyTransform();
    }

    function onPanEnd() {
      if (!panning) return;
      panning = false;
      if (viewportEl) {
        viewportEl.style.cursor = "";
      }
    }

    // ── Mouse handlers ─────────────────────────────────────────────────────────

    function onMouseDown(e) {
      if (e.button !== 0) return;
      onPanStart(e.clientX, e.clientY, e.target);
    }

    function onMouseMove(e) {
      if (!panning) return;
      onPanMove(e.clientX, e.clientY);
    }

    function onMouseUp() {
      onPanEnd();
    }

    // ── Touch handlers ─────────────────────────────────────────────────────────

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      onPanStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }

    function onTouchMove(e) {
      if (!panning || e.touches.length !== 1) return;
      e.preventDefault();
      onPanMove(e.touches[0].clientX, e.touches[0].clientY);
    }

    function onTouchEnd() {
      onPanEnd();
    }

    // ── Wire events ────────────────────────────────────────────────────────────

    if (viewportEl) {
      viewportEl.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);

      viewportEl.addEventListener("touchstart", onTouchStart, { passive: false });
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    return {
      zoomIn: zoomIn,
      zoomOut: zoomOut,
      getScale: function () { return scale; },
      getPan: function () { return { x: panX, y: panY }; },
    };
  };
})();
