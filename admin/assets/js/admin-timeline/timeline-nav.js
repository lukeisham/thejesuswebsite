/**
 * Admin timeline navigation module.
 *
 * `jumpToEra(eraKey)` moves the viewport to centre an era at scale 1, or resets
 * it for "all". timeline-era-filter.js calls it when an era chip is clicked, as
 * well as filtering the dots.
 *
 * Connections: `AdminTimelineTransform` (timeline-transform.js) computes the
 * pan; `AdminTimelineZoom.setTransform` (timeline-zoom.js) applies it. If
 * either is missing the jump warns and does nothing, and the chip's filter
 * still works. AdminCanvasZoom applies a transform at once, so there is no
 * animation and no reduced-motion case.
 *
 * @module admin-timeline/timeline-nav
 */

window.AdminTimelineNav = {};

(function () {
  var Nav = window.AdminTimelineNav;

  /**
   * Centre an era in the viewport at scale 1, or reset the view for "all" /
   * "All" (scale 1, pan 0). An unrecognised era warns and leaves the view as it is.
   *
   * @param {string} eraKey - canonical era key, "all", or "All"
   * @returns {void}
   */
  Nav.jumpToEra = function (eraKey) {
    if (!eraKey) {
      console.warn("AdminTimelineNav: jumpToEra called without an era key");
      return;
    }

    if (
      !window.AdminTimelineTransform ||
      typeof window.AdminTimelineTransform.getEraWorldBounds !== "function"
    ) {
      console.warn(
        "AdminTimelineNav: AdminTimelineTransform not available, bailing",
      );
      return;
    }

    if (
      !window.AdminTimelineZoom ||
      typeof window.AdminTimelineZoom.setTransform !== "function"
    ) {
      console.warn(
        "AdminTimelineNav: AdminTimelineZoom.setTransform not available, bailing",
      );
      return;
    }

    if (eraKey === "all" || eraKey === "All") {
      window.AdminTimelineZoom.setTransform(0, 0, 1.0);
      return;
    }

    var bounds = window.AdminTimelineTransform.getEraWorldBounds(eraKey);
    if (!bounds) {
      console.warn(
        "AdminTimelineNav: unrecognised or empty era, bailing",
        { eraKey: eraKey },
      );
      return;
    }

    // The window width stands in for the canvas width the pan is measured against.
    var viewportWidth = window.innerWidth;
    var pan = window.AdminTimelineTransform.computePanForEra(
      eraKey,
      viewportWidth,
      1.0,
    );
    if (!pan) {
      console.warn(
        "AdminTimelineNav: could not compute pan for era",
        { eraKey: eraKey },
      );
      return;
    }

    window.AdminTimelineZoom.setTransform(pan.panX, pan.panY, 1.0);
  };
})();
