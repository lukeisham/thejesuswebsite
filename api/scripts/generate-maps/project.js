/**
 * Equirectangular projection module for the SVG map generator.
 *
 * Converts WGS84 (lon, lat) degrees into SVG viewBox coordinates given a
 * per-map bounding box. This is the simplest projection (plate carrée)
 * which works well for the scale range of our five maps.
 *
 * The core lat/lng ↔ percentage math is imported from api/lib/map-geo.js —
 * the single source of truth shared between the generator and the pin API.
 * This module adds viewBox scaling, polyline simplification (Ramer-Douglas-Peucker),
 * and a helper to project an entire GeoJSON geometry.
 *
 * @module generate-maps/project
 */

const { MAP_BBOXES, latLngToPercent } = require("../../lib/map-geo");

/**
 * Project a (lon, lat) point into SVG viewBox coordinates.
 *
 * The core lat/lng → percentage math is delegated to api/lib/map-geo.js
 * (the single source of truth).  This function scales the 0–100 percentages
 * into the caller's viewBox space.
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

  // Resolve map key from bbox (reverse-lookup in MAP_BBOXES).
  const mapKey = _findMapKey(bbox);
  if (!mapKey) {
    throw new Error("Unknown bbox — not found in MAP_BBOXES.");
  }

  // Delegate core formula to the shared lib.
  const pct = latLngToPercent(mapKey, lat, lon);

  const x = viewBox.x + (pct.x / 100) * viewBox.width;
  const y = viewBox.y + (pct.y / 100) * viewBox.height;

  return {
    x: roundTo(x, p),
    y: roundTo(y, p),
  };
}

/**
 * Find the MAP_BBOXES key whose lon/lat bounds match the given bbox
 * within a small floating-point tolerance.
 *
 * @param {Object} bbox
 * @returns {string|undefined}
 */
function _findMapKey(bbox) {
  const TOL = 1e-9;
  for (const [key, candidate] of Object.entries(MAP_BBOXES)) {
    if (
      Math.abs(candidate.lon_min - bbox.lon_min) < TOL &&
      Math.abs(candidate.lat_min - bbox.lat_min) < TOL &&
      Math.abs(candidate.lon_max - bbox.lon_max) < TOL &&
      Math.abs(candidate.lat_max - bbox.lat_max) < TOL
    ) {
      return key;
    }
  }
  return undefined;
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
      tolerance > 0
        ? simplify(geometry.coordinates, tolerance)
        : geometry.coordinates;
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
 * Project a GeoJSON geometry into an array of separate SVG "points"
 * strings — one per disjoint sub-path (each MultiLineString segment,
 * each Polygon/MultiPolygon ring) — so the caller can render each as
 * its own <polygon>/<polyline> element instead of joining unrelated
 * shapes into one, which draws stray connecting lines between them.
 *
 * @param {Object} geometry - GeoJSON geometry object.
 * @param {Object} bbox
 * @param {Object} viewBox
 * @param {number} [simplifyTolerance=0.5] - RDP tolerance (0 = no simplification).
 * @returns {Array<string>}
 */
function projectParts(geometry, bbox, viewBox, simplifyTolerance) {
  const tolerance = simplifyTolerance != null ? simplifyTolerance : 0.5;

  const toPointString = (coords) => {
    const simplified = tolerance > 0 ? simplify(coords, tolerance) : coords;
    return simplified
      .map((c) => pointString(c[0], c[1], bbox, viewBox))
      .join(" ");
  };

  if (geometry.type === "LineString") {
    return [toPointString(geometry.coordinates)];
  }

  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map(toPointString);
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(toPointString);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((poly) => poly.map(toPointString));
  }

  return [];
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
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq),
  );
  const nearX = a[0] + t * dx;
  const nearY = a[1] + t * dy;
  return Math.hypot(p[0] - nearX, p[1] - nearY);
}

// ── Bounding-box clipping (Cohen–Sutherland for lines, Sutherland–Hodgman for polygons) ──

const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

function outCode(x, y, xmin, ymin, xmax, ymax) {
  let code = INSIDE;
  if (x < xmin) code |= LEFT;
  else if (x > xmax) code |= RIGHT;
  if (y < ymin) code |= BOTTOM;
  else if (y > ymax) code |= TOP;
  return code;
}

/**
 * Cohen–Sutherland clip of a single segment against an axis-aligned bbox.
 *
 * @param {[number,number]} p0
 * @param {[number,number]} p1
 * @param {Object} bbox - { lon_min, lat_min, lon_max, lat_max }.
 * @returns {[[number,number],[number,number]]|null} Clipped segment, or null if entirely outside.
 */
function clipSegmentToBBox(p0, p1, bbox) {
  const { lon_min: xmin, lat_min: ymin, lon_max: xmax, lat_max: ymax } = bbox;
  let x0 = p0[0];
  let y0 = p0[1];
  let x1 = p1[0];
  let y1 = p1[1];
  let code0 = outCode(x0, y0, xmin, ymin, xmax, ymax);
  let code1 = outCode(x1, y1, xmin, ymin, xmax, ymax);

  while (true) {
    if (!(code0 | code1))
      return [
        [x0, y0],
        [x1, y1],
      ];
    if (code0 & code1) return null;

    const codeOut = code0 || code1;
    let x, y;
    if (codeOut & TOP) {
      x = x0 + ((x1 - x0) * (ymax - y0)) / (y1 - y0);
      y = ymax;
    } else if (codeOut & BOTTOM) {
      x = x0 + ((x1 - x0) * (ymin - y0)) / (y1 - y0);
      y = ymin;
    } else if (codeOut & RIGHT) {
      y = y0 + ((y1 - y0) * (xmax - x0)) / (x1 - x0);
      x = xmax;
    } else {
      y = y0 + ((y1 - y0) * (xmin - x0)) / (x1 - x0);
      x = xmin;
    }

    if (codeOut === code0) {
      x0 = x;
      y0 = y;
      code0 = outCode(x0, y0, xmin, ymin, xmax, ymax);
    } else {
      x1 = x;
      y1 = y;
      code1 = outCode(x1, y1, xmin, ymin, xmax, ymax);
    }
  }
}

function pointsEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Clip a polyline against a bbox. A line may exit and re-enter the box, so
 * the result is an array of disjoint clipped polylines rather than one.
 *
 * @param {Array<[number,number]>} coords
 * @param {Object} bbox
 * @returns {Array<Array<[number,number]>>}
 */
function clipLineToBBox(coords, bbox) {
  const segments = [];
  let current = null;

  for (let i = 0; i < coords.length - 1; i++) {
    const clipped = clipSegmentToBBox(coords[i], coords[i + 1], bbox);
    if (!clipped) {
      current = null;
      continue;
    }
    if (current && pointsEqual(current[current.length - 1], clipped[0])) {
      current.push(clipped[1]);
    } else {
      current = [clipped[0], clipped[1]];
      segments.push(current);
    }
  }

  return segments;
}

function intersectVertical(a, b, x) {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}

function intersectHorizontal(a, b, y) {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}

/**
 * Sutherland–Hodgman clip of a polygon ring against an axis-aligned bbox.
 * Works correctly for non-convex subject polygons since the clip window
 * (the bbox) is convex.
 *
 * @param {Array<[number,number]>} ring
 * @param {Object} bbox
 * @returns {Array<[number,number]>} Clipped ring (may be empty).
 */
function clipPolygonToBBox(ring, bbox) {
  const { lon_min: xmin, lat_min: ymin, lon_max: xmax, lat_max: ymax } = bbox;
  const edges = [
    {
      inside: (p) => p[0] >= xmin,
      intersect: (a, b) => intersectVertical(a, b, xmin),
    },
    {
      inside: (p) => p[0] <= xmax,
      intersect: (a, b) => intersectVertical(a, b, xmax),
    },
    {
      inside: (p) => p[1] >= ymin,
      intersect: (a, b) => intersectHorizontal(a, b, ymin),
    },
    {
      inside: (p) => p[1] <= ymax,
      intersect: (a, b) => intersectHorizontal(a, b, ymax),
    },
  ];

  let output = ring;
  for (const edge of edges) {
    if (output.length === 0) break;
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const prev = input[(i - 1 + input.length) % input.length];
      const currInside = edge.inside(curr);
      const prevInside = edge.inside(prev);
      if (currInside) {
        if (!prevInside) output.push(edge.intersect(prev, curr));
        output.push(curr);
      } else if (prevInside) {
        output.push(edge.intersect(prev, curr));
      }
    }
  }

  return output;
}

/**
 * Expand a bbox outward by a fraction of its own range on each side.
 * Used to give clipping a small margin so near-edge geometry isn't
 * harshly truncated right at the viewBox boundary.
 *
 * @param {Object} bbox
 * @param {number} marginFraction - e.g. 0.05 for a 5% margin.
 * @returns {Object}
 */
function expandBBox(bbox, marginFraction) {
  const xr = bbox.lon_max - bbox.lon_min;
  const yr = bbox.lat_max - bbox.lat_min;
  return {
    lon_min: bbox.lon_min - xr * marginFraction,
    lon_max: bbox.lon_max + xr * marginFraction,
    lat_min: bbox.lat_min - yr * marginFraction,
    lat_max: bbox.lat_max + yr * marginFraction,
  };
}

/**
 * Clip a GeoJSON geometry to a bbox, dispatching by geometry type.
 * Returns null if nothing survives clipping.
 *
 * @param {Object} geometry - GeoJSON geometry (LineString/MultiLineString/Polygon/MultiPolygon).
 * @param {Object} bbox
 * @returns {Object|null} Clipped geometry, or null.
 */
function clipGeometryToBBox(geometry, bbox) {
  if (!geometry) return null;

  if (geometry.type === "LineString") {
    const segments = clipLineToBBox(geometry.coordinates, bbox);
    if (segments.length === 0) return null;
    if (segments.length === 1)
      return { type: "LineString", coordinates: segments[0] };
    return { type: "MultiLineString", coordinates: segments };
  }

  if (geometry.type === "MultiLineString") {
    const segments = [];
    for (const line of geometry.coordinates) {
      segments.push(...clipLineToBBox(line, bbox));
    }
    if (segments.length === 0) return null;
    return { type: "MultiLineString", coordinates: segments };
  }

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates
      .map((ring) => clipPolygonToBBox(ring, bbox))
      .filter((ring) => ring.length >= 3);
    if (rings.length === 0) return null;
    return { type: "Polygon", coordinates: rings };
  }

  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates
      .map((poly) =>
        poly
          .map((ring) => clipPolygonToBBox(ring, bbox))
          .filter((ring) => ring.length >= 3),
      )
      .filter((poly) => poly.length > 0);
    if (polys.length === 0) return null;
    return { type: "MultiPolygon", coordinates: polys };
  }

  return null;
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
  projectParts,
  simplify,
  loadGeoJSON,
  roundTo,
  clipSegmentToBBox,
  clipLineToBBox,
  clipPolygonToBBox,
  clipGeometryToBBox,
  expandBBox,
};
