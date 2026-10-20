/**
 * Admin timeline transform maths.
 *
 * Pan and bounds maths for era jumps, kept in step by hand with
 * frontend/assets/js/timeline/timeline-transform.js: the admin scripts are
 * classic scripts and cannot import the ES module, and neither file reads the
 * other. A change to one needs the same change in the other, or an era centres
 * differently in the editor than on the public page. This copy reads
 * `window.AdminTimelineGeometry`.
 *
 * Called by timeline-nav.js (`getEraWorldBounds`, `computePanForEra`) and
 * timeline-zoom.js (`clampPan`, inside `setTransform`).
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
   * Bounds run from the left edge of the era's first period slot to the right
   * edge of its last. "All" / "all" returns the bounds of the whole timeline.
   *
   * @param {string} eraKey
   * @returns {{ minX: number, maxX: number, minY: number, maxY: number }|null}
   */
  Transform.getEraWorldBounds = function (eraKey) {
    if (!Geom || !Geom.ERA_BOUNDARIES) {
      console.warn("AdminTimelineTransform: AdminTimelineGeometry not ready");
      return null;
    }

    var halfSlot = Geom.BASE_PX_PER_PERIOD / 2;

    if (eraKey === "all" || eraKey === "All") {
      var lastIdx = Geom.TIMELINE_PERIODS.length - 1;
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
   * Clamp a pan offset so the world remains at least partially visible: the
   * world may slide left until a tenth of it shows (`0.9`), and right until a
   * tenth of its unscaled width shows (`0.1`). The right limit ignores the
   * scale, as the public clampPan does.
   *
   * @param {number} panX
   * @param {number} panY
   * @param {number} scale
   * @param {number} worldWidth  - total world width in base pixels (scale 1)
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
