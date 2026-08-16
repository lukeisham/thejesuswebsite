/**
 * Admin timeline navigation module.
 *
 * Exports `jumpToEra(eraKey)` — called when a user clicks an era filter
 * chip in the admin diagram editor to both filter events AND jump the
 * viewport to centre that era at normal zoom (scale 1.0).
 *
 * Uses the AdminCanvasZoom transform model via AdminTimelineZoom.setTransform().
 * Animation is not applied (AdminCanvasZoom applies transforms immediately),
 * so no reduced-motion guard is needed.
 *
 * "All" / "all" behaves as a reset: scale=1.0, pan=(0,0).
 *
 * @module admin-timeline/timeline-nav
 */

window.AdminTimelineNav = {};

(function () {
  var Nav = window.AdminTimelineNav;

  /**
   * Jump the viewport to centre an era at normal zoom (scale 1.0).
   *
   * "All" / "all" resets to default: scale=1.0, pan=(0,0).
   *
   * If the era has no data or is unrecognised, logs a warning and bails
   * gracefully — the chip's filter action has already succeeded
   * independently.
   *
   * @param {string} eraKey — canonical era key, "all", or "All"
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

    // "All" / "all" — reset to default view
    if (eraKey === "all" || eraKey === "All") {
      window.AdminTimelineZoom.setTransform(0, 0, 1.0, eraKey);
      return;
    }

    // Validate era exists
    var bounds = window.AdminTimelineTransform.getEraWorldBounds(eraKey);
    if (!bounds) {
      console.warn(
        "AdminTimelineNav: unrecognised or empty era, bailing",
        { eraKey: eraKey },
      );
      return;
    }

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

    window.AdminTimelineZoom.setTransform(pan.panX, pan.panY, 1.0, eraKey);
  };
})();
