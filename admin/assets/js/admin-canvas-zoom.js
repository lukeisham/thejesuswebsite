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
 * Drag-pan stability (timeline-p5-admin-drag-pan-stability.md):
 * - Pan values are rounded to a 0.5px grid in applyTransform() to kill the
 *   sub-pixel shimmer that browsers produce at fractional offsets while
 *   dragging.  Scale is deliberately left unrounded — rounding scale would
 *   corrupt the zoomIn/zoomOut clamp math, and button-driven zoom produces
 *   discrete scale jumps (not continuous sub-pixel streams like drag).
 *   Investigation confirmed: button-only zoom at step=1.25 across the full
 *   0.3→3.0 range (with pan at 0) produces no visible shimmer — the era-
 *   divider lines are counter-scaled via CSS calc() and the spine is outside
 *   the scaled world wrapper.  Only drag-pan's continuously-accumulating
 *   sub-pixel pan values needed the rounding fix.
 * - An optional `opts.panningClass` lets callers suppress the CSS transform
 *   transition during an active drag (so the canvas tracks the pointer
 *   immediately), while still animating button-driven zoom smoothly.
 *   The class is opt-in: callers that don't pass it behave exactly as before
 *   (JS-2).
 *
 * Pre-fix state (Issues.md #194): applyTransform() at the original line ~69
 * wrote raw panX/panY directly into the translate() string with no rounding;
 * onPanStart()/onPanEnd() at the original lines ~93-125 toggled viewport
 * cursor but never added/removed a CSS class on worldEl.  Both gaps are now
 * closed by this module.
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
   * @param {string}   [opts.panningClass]   — CSS class added to worldEl while
   *   a drag-pan gesture is active; removed on pan end.  Opt-in — callers that
   *   don't pass it behave exactly as before (JS-2).
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
    var panningClass = opts.panningClass || null;

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

    /**
     * Round a value to the nearest multiple of gridSize.
     * Snaps pan values to a coarse pixel grid to kill the sub-pixel shimmer
     * that browsers produce at fractional offsets while dragging.  The 0.5px
     * grid is coarse enough to eliminate shimmer, fine enough to be visually
     * imperceptible (< 0.25px worst-case offset).  Matches the frontend's
     * timeline-zoom.js roundToGrid().
     *
     * Scale itself is deliberately NOT rounded — see module doc comment.
     *
     * @param {number} value
     * @param {number} [gridSize=0.5]
     * @returns {number}
     */
    function roundToGrid(value, gridSize) {
      if (gridSize == null) gridSize = 0.5;
      return Math.round(value / gridSize) * gridSize;
    }

    function applyTransform() {
      var roundedX = roundToGrid(panX);
      var roundedY = roundToGrid(panY);
      worldEl.style.transform =
        "translate(" + roundedX + "px, " + roundedY + "px) scale(" + scale + ")";
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

      if (panningClass && worldEl) {
        worldEl.classList.add(panningClass);
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
      if (panningClass && worldEl) {
        worldEl.classList.remove(panningClass);
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
      /**
       * Programmatically set the zoom scale (clamped to [minScale, maxScale])
       * and re-apply the transform.  Fires onChange if provided.
       * @param {number} s
       */
      setScale: function (s) {
        scale = Math.max(minScale, Math.min(maxScale, s));
        applyTransform();
      },
      /**
       * Programmatically set the pan offset and re-apply the transform.
       * Fires onChange if provided.
       * @param {number} x
       * @param {number} y
       */
      setPan: function (x, y) {
        panX = x;
        panY = y;
        applyTransform();
      },
    };
  };
})();
