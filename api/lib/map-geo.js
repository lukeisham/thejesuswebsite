/**
 * Shared geographic helpers for the map system.
 *
 * Exports per-map bounding boxes and lat/lng ↔ percentage conversion
 * so the SVG generator (api/scripts/generate-maps/) and the pin API
 * (api/models/map.model.js) share one source of truth for projection
 * maths.  The formula matches `api/scripts/generate-maps/project.js`
 * exactly: equirectangular (plate carrée), WGS84 degrees → viewBox
 * percentage.
 *
 * Every function is pure and synchronous — no database, no HTTP, no
 * side effects.
 *
 * @module lib/map-geo
 */

/**
 * Per-map bounding boxes in WGS84 degrees.
 * Extracted from api/scripts/generate-maps/map-configs.js so the
 * generator and the API can never drift.  Kept here as the canonical
 * definition; map-configs.js imports from this module.
 *
 * Each entry keyed by map_key.
 * @type {Object<string, {lon_min: number, lat_min: number, lon_max: number, lat_max: number}>}
 */
const MAP_BBOXES = {
  "roman-empire": { lon_min: -10, lat_min: 25, lon_max: 45, lat_max: 52 },
  levant: { lon_min: 32, lat_min: 29, lon_max: 38, lat_max: 37 },
  judea: { lon_min: 34.2, lat_min: 30.9, lon_max: 35.8, lat_max: 32.6 },
  galilee: { lon_min: 34.9, lat_min: 32.2, lon_max: 36.0, lat_max: 33.5 },
  jerusalem: {
    lon_min: 35.216,
    lat_min: 31.7625,
    lon_max: 35.248,
    lat_max: 31.7895,
  },
};

/**
 * Convert a WGS84 (lon, lat) point into 0–100 viewBox percentages
 * for a given map's bbox.  The returned percentages represent where
 * the point lands within the SVG viewBox, matching the projection
 * used by the map generator.
 *
 * Equirectangular formula:
 *   x% = ((lon - lon_min) / (lon_max - lon_min)) * 100
 *   y% = ((lat_max - lat) / (lat_max - lat_min)) * 100
 *
 * @param {string} mapKey - One of the five canonical map keys.
 * @param {number} lat - Latitude in WGS84 degrees.
 * @param {number} lng - Longitude in WGS84 degrees.
 * @returns {{ x: number, y: number }} Percentages in 0–100 range.
 * @throws {Error} If mapKey is unknown or coords are invalid.
 */
function latLngToPercent(mapKey, lat, lng) {
  const bbox = MAP_BBOXES[mapKey];
  if (!bbox) {
    throw new Error(`Unknown map_key "${mapKey}".`);
  }
  _validateCoord(lat, -90, 90, "lat");
  _validateCoord(lng, -180, 180, "lng");

  const xRange = bbox.lon_max - bbox.lon_min;
  const yRange = bbox.lat_max - bbox.lat_min;

  if (xRange <= 0 || yRange <= 0) {
    throw new Error(`Invalid bbox for "${mapKey}": zero or negative range.`);
  }

  const x = ((lng - bbox.lon_min) / xRange) * 100;
  // Latitude is inverted: top of viewBox = lat_max
  const y = ((bbox.lat_max - lat) / yRange) * 100;

  return { x: roundTo(x, 2), y: roundTo(y, 2) };
}

/**
 * Convert 0–100 viewBox percentages back to WGS84 (lon, lat).
 * This is the inverse of latLngToPercent — useful for display-only
 * hints in the admin panel when a pin is dragged.
 *
 * @param {string} mapKey
 * @param {number} x - ViewBox x percentage (0–100).
 * @param {number} y - ViewBox y percentage (0–100).
 * @returns {{ lat: number, lng: number }}
 * @throws {Error} If mapKey is unknown or percentages are invalid.
 */
function percentToLatLng(mapKey, x, y) {
  const bbox = MAP_BBOXES[mapKey];
  if (!bbox) {
    throw new Error(`Unknown map_key "${mapKey}".`);
  }
  _validatePercent(x, "x");
  _validatePercent(y, "y");

  const xRange = bbox.lon_max - bbox.lon_min;
  const yRange = bbox.lat_max - bbox.lat_min;

  const lng = bbox.lon_min + (x / 100) * xRange;
  const lat = bbox.lat_max - (y / 100) * yRange;

  return { lat: roundTo(lat, 5), lng: roundTo(lng, 5) };
}

/**
 * Check whether a (lat, lng) point falls within a map's bounding box.
 * Accepts a small epsilon (1e-6°) so borderline points aren't
 * spuriously rejected by floating-point rounding.
 *
 * @param {string} mapKey
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
function isInBounds(mapKey, lat, lng) {
  const bbox = MAP_BBOXES[mapKey];
  if (!bbox) return false;

  const EPSILON = 1e-6;
  return (
    lng >= bbox.lon_min - EPSILON &&
    lng <= bbox.lon_max + EPSILON &&
    lat >= bbox.lat_min - EPSILON &&
    lat <= bbox.lat_max + EPSILON
  );
}

/**
 * Get the bbox for a given map key.
 *
 * @param {string} mapKey
 * @returns {Object|undefined}
 */
function getBBox(mapKey) {
  return MAP_BBOXES[mapKey];
}

/**
 * List all known map keys.
 *
 * @returns {string[]}
 */
function getMapKeys() {
  return Object.keys(MAP_BBOXES);
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _validateCoord(value, min, max, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number, got "${value}".`);
  }
  if (value < min || value > max) {
    throw new Error(
      `${label} must be between ${min} and ${max}, got ${value}.`,
    );
  }
}

function _validatePercent(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number, got "${value}".`);
  }
  // Percentages may legitimately fall slightly outside 0–100 when a pin
  // is near the bbox edge, so we use a generous range here.
  if (value < -10 || value > 110) {
    throw new Error(`${label} must be between 0 and 100, got ${value}.`);
  }
}

function roundTo(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

module.exports = {
  MAP_BBOXES,
  latLngToPercent,
  percentToLatLng,
  isInBounds,
  getBBox,
  getMapKeys,
};
