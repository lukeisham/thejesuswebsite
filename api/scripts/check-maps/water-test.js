/**
 * Land and water test built from the same Natural Earth files that draw the
 * base maps (api/scripts/generate-maps/data/). A label that the generator
 * places on water is a label that the reader sees on water.
 *
 * The data is modern. A modern shoreline can differ from the AD 30 shoreline,
 * for example around the Dead Sea and the drained Lake Huleh.
 *
 * @module check-maps/water-test
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "generate-maps", "data");

/**
 * Ray-casting test of a point against one ring of [lon, lat] pairs.
 *
 * @param {number} lon
 * @param {number} lat
 * @param {Array<Array<number>>} ring
 * @returns {boolean}
 */
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Collect every polygon of a GeoJSON file as { rings, box }.
 *
 * @param {string} fileName - File in the generate-maps data folder.
 * @returns {Array<{rings: Array, box: number[]}>}
 */
function loadPolygons(fileName) {
  const collection = JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8"));
  const polygons = [];
  for (const feature of collection.features) {
    const { type, coordinates } = feature.geometry;
    const list = type === "MultiPolygon" ? coordinates : type === "Polygon" ? [coordinates] : [];
    for (const rings of list) {
      const outer = rings[0];
      const lons = outer.map((p) => p[0]);
      const lats = outer.map((p) => p[1]);
      polygons.push({
        rings,
        box: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
      });
    }
  }
  return polygons;
}

/**
 * Test whether a point is inside any polygon in the list. A point in a hole
 * is outside.
 *
 * @param {number} lon
 * @param {number} lat
 * @param {Array<{rings: Array, box: number[]}>} polygons
 * @returns {boolean}
 */
function inAnyPolygon(lon, lat, polygons) {
  for (const { rings, box } of polygons) {
    if (lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) continue;
    if (!inRing(lon, lat, rings[0])) continue;
    if (rings.slice(1).some((hole) => inRing(lon, lat, hole))) continue;
    return true;
  }
  return false;
}

/**
 * Build a water test from the committed land and lake data.
 *
 * @returns {function(number, number): boolean} isWater(lon, lat)
 */
function buildWaterTest() {
  const land = loadPolygons("coastline.geojson");
  const lakes = loadPolygons("lakes.geojson");
  return (lon, lat) => inAnyPolygon(lon, lat, lakes) || !inAnyPolygon(lon, lat, land);
}

module.exports = { buildWaterTest };
