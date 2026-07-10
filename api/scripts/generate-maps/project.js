/**
 * Equirectangular projection module for the SVG map generator.
 *
 * Converts WGS84 (lon, lat) degrees into SVG viewBox coordinates given a
 * per-map bounding box. This is the simplest projection (plate carrée)
 * which works well for the scale range of our five maps.
 *
 * Includes coordinate rounding, polyline simplification (Ramer-Douglas-Peucker),
 * and a helper to project an entire GeoJSON geometry.
 *
 * @module generate-maps/project
 */

/**
 * Project a (lon, lat) point into SVG viewBox coordinates.
 *
 * @param {number} lon - Longitude in degrees.
 * @param {number} lat - Latitude in degrees.
 * @param {Object} bbox - { lon_min, lat_min, lon_max, lat_max }.
 * @param {Object} viewBox - { x, y, width, height }.
 * @param {number} [precision=1] - Decimal places to round to.
 * @returns {{ x: number, y: number }}
 */
function projectPoint(lon, lat, bbox, viewBox, precision) {
  const p = precision != null ? precision : 1;
  const xRange = bbox.lon_max - bbox.lon_min;
  const yRange = bbox.lat_max - bbox.lat_min;

  if (xRange <= 0 || yRange <= 0) {
    throw new Error("Invalid bounding box: zero or negative range.");
  }

  const x = viewBox.x + ((lon - bbox.lon_min) / xRange) * viewBox.width;
  // Latitude is inverted: top of viewBox = lat_max
  const y = viewBox.y + ((bbox.lat_max - lat) / yRange) * viewBox.height;

  return {
    x: roundTo(x, p),
    y: roundTo(y, p),
  };
}

/**
 * Rounded coordinate string "x,y" for an SVG polyline/polygon point.
 *
 * @param {number} lon
 * @param {number} lat
 * @param {Object} bbox
 * @param {Object} viewBox
 * @param {number} [precision=1]
 * @returns {string} e.g. "120.5,340.2"
 */
function pointString(lon, lat, bbox, viewBox, precision) {
  const pt = projectPoint(lon, lat, bbox, viewBox, precision);
  return pt.x + "," + pt.y;
}

/**
 * Project an entire GeoJSON LineString or MultiLineString to an SVG
 * "points" string suitable for a <polyline> or <polygon>.
 *
 * For MultiLineString, segments are joined with a space (SVG interprets
 * this as separate sub-paths if using <path> with "M... L...", but
 * here we assemble a flat polyline string — overlapping segments
 * are acceptable for filled water bodies).
 *
 * @param {Object} geometry - GeoJSON geometry object (LineString or MultiLineString).
 * @param {Object} bbox
 * @param {Object} viewBox
 * @param {number} [simplifyTolerance=0.5] - RDP tolerance (0 = no simplification).
 * @returns {string}
 */
function projectLine(geometry, bbox, viewBox, simplifyTolerance) {
  const tolerance = simplifyTolerance != null ? simplifyTolerance : 0.5;

  if (geometry.type === "LineString") {
    const simplified =
      tolerance > 0 ? simplify(geometry.coordinates, tolerance) : geometry.coordinates;
    return simplified
      .map((c) => pointString(c[0], c[1], bbox, viewBox))
      .join(" ");
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates
      .map((line) => {
        const simplified = tolerance > 0 ? simplify(line, tolerance) : line;
        return simplified
          .map((c) => pointString(c[0], c[1], bbox, viewBox))
          .join(" ");
      })
      .join(" ");
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates
      .map((ring) => {
        const simplified = tolerance > 0 ? simplify(ring, tolerance) : ring;
        return simplified
          .map((c) => pointString(c[0], c[1], bbox, viewBox))
          .join(" ");
      })
      .join(" ");
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly) =>
        poly
          .map((ring) => {
            const simplified = tolerance > 0 ? simplify(ring, tolerance) : ring;
            return simplified
              .map((c) => pointString(c[0], c[1], bbox, viewBox))
              .join(" ");
          })
          .join(" "),
      )
      .join(" ");
  }

  return "";
}

/**
 * Ramer-Douglas-Peucker polyline simplification.
 * Reduces the number of points while preserving shape within `epsilon`.
 *
 * @param {Array<[number,number]>} points - Array of [lon, lat] or [x, y].
 * @param {number} epsilon - Maximum perpendicular distance.
 * @returns {Array<[number,number]>}
 */
function simplify(points, epsilon) {
  if (!points || points.length <= 2) return points || [];

  // Find the point with the maximum distance
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, maxIdx + 1), epsilon);
    const right = simplify(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

/**
 * Perpendicular distance from point p to the line segment a → b.
 *
 * @param {[number,number]} p
 * @param {[number,number]} a
 * @param {[number,number]} b
 * @returns {number}
 */
function perpendicularDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  const nearX = a[0] + t * dx;
  const nearY = a[1] + t * dy;
  return Math.hypot(p[0] - nearX, p[1] - nearY);
}

/**
 * Load a GeoJSON file from disk and return the parsed FeatureCollection.
 *
 * @param {string} filePath - Absolute or relative path to the .geojson file.
 * @returns {Object} Parsed GeoJSON.
 * @throws {Error} If the file is missing or invalid.
 */
function loadGeoJSON(filePath) {
  const fs = require("fs");
  if (!fs.existsSync(filePath)) {
    throw new Error(`GeoJSON file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.type !== "FeatureCollection") {
      throw new Error(
        `Expected a FeatureCollection in ${filePath}, got type "${parsed ? parsed.type : "undefined"}".`,
      );
    }
    return parsed;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
    }
    throw e;
  }
}

/**
 * Convert a number to a fixed decimal place string and trim trailing ".0".
 *
 * @param {number} n
 * @param {number} decimals
 * @returns {number}
 */
function roundTo(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

module.exports = {
  projectPoint,
  pointString,
  projectLine,
  simplify,
  loadGeoJSON,
  roundTo,
};
