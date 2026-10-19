/**
 * Distance and projection helpers for the map checker.
 *
 * The pixel-to-degree maths here must match api/lib/map-geo.js and
 * api/scripts/generate-maps/project.js: equirectangular, no cos(lat) scaling.
 * If the generator changes its projection, change these functions too, or the
 * checker will judge the maps by a different rule than the one that drew them.
 *
 * @module check-maps/geo-units
 */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LAT = 111.19;

/**
 * Great-circle distance between two points.
 *
 * @param {number} lon1
 * @param {number} lat1
 * @param {number} lon2
 * @param {number} lat2
 * @returns {number} Distance in kilometres.
 */
function haversineKm(lon1, lat1, lon2, lat2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Convert a viewBox pixel position to longitude and latitude.
 *
 * @param {{bbox: Object, viewBox: Object}} cfg - Map config from map-configs.js.
 * @param {number} x
 * @param {number} y
 * @returns {{lon: number, lat: number}}
 */
function pxToLonLat(cfg, x, y) {
  const { bbox, viewBox } = cfg;
  return {
    lon: bbox.lon_min + ((x - viewBox.x) / viewBox.width) * (bbox.lon_max - bbox.lon_min),
    lat: bbox.lat_max - ((y - viewBox.y) / viewBox.height) * (bbox.lat_max - bbox.lat_min),
  };
}

/**
 * Convert longitude and latitude to a viewBox pixel position.
 *
 * @param {{bbox: Object, viewBox: Object}} cfg - Map config from map-configs.js.
 * @param {number} lon
 * @param {number} lat
 * @returns {{x: number, y: number}}
 */
function lonLatToPx(cfg, lon, lat) {
  const { bbox, viewBox } = cfg;
  return {
    x: viewBox.x + ((lon - bbox.lon_min) / (bbox.lon_max - bbox.lon_min)) * viewBox.width,
    y: viewBox.y + ((bbox.lat_max - lat) / (bbox.lat_max - bbox.lat_min)) * viewBox.height,
  };
}

/**
 * Pixels that cover one kilometre in each direction at a given latitude.
 * The x and y values differ when the map stretches shapes.
 *
 * @param {{bbox: Object, viewBox: Object}} cfg - Map config from map-configs.js.
 * @param {number} lat - Latitude where the scale is measured.
 * @returns {{x: number, y: number}}
 */
function pixelsPerKm(cfg, lat) {
  const { bbox, viewBox } = cfg;
  const kmPerDegreeLon = KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  return {
    x: viewBox.width / ((bbox.lon_max - bbox.lon_min) * kmPerDegreeLon),
    y: viewBox.height / ((bbox.lat_max - bbox.lat_min) * KM_PER_DEGREE_LAT),
  };
}

/**
 * Shortest distance from a point to a polyline, in kilometres.
 * Works in a flat local frame around the point, which is accurate enough for
 * the distances in the checker (tens of kilometres).
 *
 * @param {{lon: number, lat: number}} point
 * @param {Array<{lon: number, lat: number}>} line - At least one vertex.
 * @returns {number} Distance in kilometres.
 */
function pointToPolylineKm(point, line) {
  const kmPerDegreeLon = KM_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180);
  const local = line.map((p) => ({
    x: (p.lon - point.lon) * kmPerDegreeLon,
    y: (p.lat - point.lat) * KM_PER_DEGREE_LAT,
  }));
  if (local.length === 1) return Math.hypot(local[0].x, local[0].y);

  let best = Infinity;
  for (let i = 0; i < local.length - 1; i++) {
    const a = local[i];
    const b = local[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  }
  return best;
}

module.exports = {
  haversineKm,
  pxToLonLat,
  lonLatToPx,
  pixelsPerKm,
  pointToPolylineKm,
};
