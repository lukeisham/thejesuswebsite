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
 * Line stability: the era-divider lines (.admin-timeline-era-divider,
 * timeline-canvas.css) live inside `.admin-timeline-world` and so get
 * inflated by the same transform's scale() — the onChange callback below
 * publishes the live scale as --timeline-zoom-scale on worldEl on every
 * update, and the CSS divides declared width by it to counter that,
 * mirroring the frontend's timeline-zoom.js/timeline-line-stability.css.
 * The property is injected here (not inside the shared AdminCanvasZoom
 * module) so that module stays DOM-class-agnostic for its other consumers.
 * The spine (`.admin-timeline-canvas::after`) deliberately does NOT get this
 * treatment — it's a pseudo-element of the viewport, not a descendant of
 * `.admin-timeline-world`, so it never inherits the scale transform and
 * already renders at a constant 2px regardless of zoom.
 *
 * Not yet done: AdminCanvasZoom (see admin-canvas-zoom.js) wires mouse/touch
 * drag-pan on `viewportEl` whenever one is supplied, same as it's supplied
 * here — so this editor already has live drag-to-pan, not button-only zoom.
 * It doesn't get the frontend's roundToGrid() sub-pixel rounding or a
 * `.admin-timeline-world--panning` transition-suppression class in this
 * pass; both would need adding state to the shared AdminCanvasZoom module,
 * which is a bigger change than this pass's line-stability scope (see
 * setup/ISSUES/Issues.md #194).
 *
 * NOW RESOLVED (timeline-p5-admin-drag-pan-stability.md): AdminCanvasZoom
 * now rounds panX/panY to a 0.5px grid and supports an opt-in `panningClass`.
 * This file passes `panningClass: "admin-timeline-world--panning"` to
 * AdminCanvasZoom.create() so the timeline editor suppresses the 150ms
 * button-zoom transition during an active drag, matching the frontend's
 * `.timeline-world--panning` behaviour.
 *
 * Rounding strategy (task 100): The frontend's roundToGrid(value, 0.5)
 * helper rounds panX/panY to the nearest 0.5px grid before applying the
 * CSS transform, which eliminates most sub-pixel shimmer at fractional
 * zoom levels while keeping the visual offset imperceptible (< 0.25px).
 * The admin editor does not currently apply this rounding because:
 *   1. AdminCanvasZoom is a shared module consumed by multiple diagram
 *      editors; adding rounding there would affect all consumers.
 *   2. Pan values come from integer mouse-delta accumulation (clientX/Y
 *      differences), so pan itself is already integral — only the scale
 *      multiplier produces fractional final values.
 *   3. Era-divider lines are counter-scaled via CSS calc() so they already
 *      adapt to fractional scale; the spine is on the viewport (not the
 *      world element) so it never sees sub-pixel transforms.
 * Recommendation: If shimmer is observed in production during drag-pan at
 * fractional scale, add roundToGrid inside the onChange callback here
 * (computing panX/panY by calling canvasZoom.getPan() and rounding before
 * re-applying the transform) rather than modifying AdminCanvasZoom.
 * Priority is low — era dividers are reliably crisp via counter-scaling,
 * and the spine is immune to the transform.
 *
 * Sub-pixel shimmer investigation (task 114): Admin zoom uses step=1.25,
 * producing scales 0.3, 0.375, 0.469, 0.586, 0.732, 0.915, 1.0, 1.25,
 * 1.563, 1.953, 2.441, 3.0. All are fractional. The era-divider width is
 * counter-scaled as max(1px, calc(1px / scale)), which at scale=0.375
 * computes to ~2.667px (fractional but above 1px floor); at scale=3.0 it
 * floors to 1px. The spine is fixed at 2px on the viewport (no zoom
 * inheritance). Pan values are integer deltas so no sub-pixel pan offset.
 * Empirically, no shimmer was observed during Tier 3 verification on
 * production at these scale steps — counter-scaling via CSS calc() and the
 * max() floor appear sufficient. Rounding to 0.5px grid is therefore
 * deferred as a nice-to-have optimization, not a current defect.
 *
 * Transition suppression (task 120): The plan's premise that admin is
 * "button-only zoom" is incorrect — AdminCanvasZoom wires mousedown/
 * mousemove/mouseup on the viewport, so admin already has live drag-pan.
 * The `.admin-timeline-world` has `transition: transform var(--duration-fast)`
 * (timeline-canvas.css line 85) which applies on every transform update,
 * including drag-pan. This means drag-pan currently has a slight transition
 * lag — not as severe as the frontend's pre-fix because admin doesn't have
 * heavy DOM content, but still present. Adding transition suppression
 * (`.admin-timeline-world--panning { transition: none }`) would require
 * exposing panning state from AdminCanvasZoom (the module already tracks
 * `panning` internally at line 61 but doesn't expose it). This is deferred
 * to a follow-up that extends AdminCanvasZoom's public API or adds a
 * callback hook for pan state changes. Not blocking: the transition is
 * var(--duration-fast) (~150ms), and user testing in Tier 3 didn't flag it
 * as problematic.
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
      panningClass: "admin-timeline-world--panning",
      onChange: function () {
        // Live-bind the scale for CSS counter-scaling of era-divider lines
        // (see module doc comment above).
        if (!worldEl) {
          console.warn("AdminTimelineZoom: worldEl missing, cannot set --timeline-zoom-scale");
          return;
        }
        worldEl.style.setProperty("--timeline-zoom-scale", String(canvasZoom.getScale()));
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
