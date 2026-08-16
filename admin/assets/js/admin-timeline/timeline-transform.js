/**
 * Admin timeline transform math module.
 *
 * Parallel implementation of the frontend timeline-transform.js — same API,
 * same math, but consuming admin data structures (window.AdminTimelineGeometry)
 * instead of the frontend ES module graph.  No cross-imports between frontend
 * and admin.
 *
 * Coordinate model (matching AdminCanvasZoom):
 *   - transform-origin: 0 0 on .admin-timeline-world
 *   - A world point (wx, wy) maps to viewport coordinates as:
 *       vx = panX + wx * scale
 *       vy = panY + wy * scale
 *   - To centre world point (wx, wy) at viewport centre (vw/2, vh/2):
 *       panX = vw/2 - wx * scale
 *       panY = vh/2 - wy * scale
 *
 * @module admin-timeline/timeline-transform
 */

window.AdminTimelineTransform = {};

(function () {
  var Transform = window.AdminTimelineTransform;
  var Geom = window.AdminTimelineGeometry;

  /**
   * Return the world-pixel bounding box for an era.
   *
   * Bounds are derived from the era's first and last period indices,
   * converted to world pixels via Geom.periodToXCentered().
   *
   * "All" / "all" sentinel returns the full-timeline bounds.
   *
   * @param {string} eraKey
   * @returns {{ minX: number, maxX: number, minY: number, maxY: number }|null}
   */
  Transform.getEraWorldBounds = function (eraKey) {
    if (!Geom || !Geom.ERA_BOUNDARIES) {
      console.warn("AdminTimelineTransform: AdminTimelineGeometry not ready");
      return null;
    }

    // "All" / "all" — full timeline
    if (eraKey === "all" || eraKey === "All") {
      var lastIdx = Geom.TIMELINE_PERIODS.length - 1;
      var halfSlot = Geom.BASE_PX_PER_PERIOD / 2;
      return {
        minX: 0,
        maxX: Geom.periodToXCentered(lastIdx) + halfSlot,
        minY: 0,
        maxY: 0,
      };
    }

    var bounds = Geom.ERA_BOUNDARIES[eraKey];
    if (!bounds) {
      console.warn(
        "AdminTimelineTransform: getEraWorldBounds — unrecognised era key",
        { eraKey: eraKey },
      );
      return null;
    }

    var halfSlot = Geom.BASE_PX_PER_PERIOD / 2;
    return {
      minX: Geom.periodToXCentered(bounds.start) - halfSlot,
      maxX: Geom.periodToXCentered(bounds.end) + halfSlot,
      minY: 0,
      maxY: 0,
    };
  };

  /**
   * Compute the pan offset needed to centre an era in the viewport at the
   * given zoom scale.
   *
   * @param {string}  eraKey
   * @param {number}  viewportWidth
   * @param {number}  [scale=1.0]
   * @returns {{ panX: number, panY: number }|null}
   */
  Transform.computePanForEra = function (eraKey, viewportWidth, scale) {
    if (scale == null) scale = 1.0;

    var bounds = Transform.getEraWorldBounds(eraKey);
    if (!bounds) return null;

    var eraCentreX = (bounds.minX + bounds.maxX) / 2;
    return {
      panX: viewportWidth / 2 - eraCentreX * scale,
      panY: 0,
    };
  };

  /**
   * Clamp a pan offset so the world remains at least partially visible.
   *
   * @param {number} panX
   * @param {number} panY
   * @param {number} scale
   * @param {number} worldWidth  — total world width in base pixels (scale 1)
   * @returns {{ panX: number, panY: number }}
   */
  Transform.clampPan = function (panX, panY, scale, worldWidth) {
    var scaledWorld = worldWidth * scale;
    var minPanX = -scaledWorld * 0.9;
    var maxPanX = worldWidth * 0.1;
    return {
      panX: Math.max(minPanX, Math.min(maxPanX, panX)),
      panY: panY,
    };
  };
})();
