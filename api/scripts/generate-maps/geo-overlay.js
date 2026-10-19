/**
 * Ancient roads, region boundaries and drained lakes, drawn from longitude
 * and latitude.
 *
 * The features live in overlays/ancient-features.geo.json. Each one names the
 * maps that show it. Projecting them here means a change to a map's bbox or
 * viewBox moves them with the base map. The map checker
 * (api/scripts/check-maps/) reads the same file, so what it judges is what
 * this module draws.
 *
 * The hand-drawn pixel overlay for the Jerusalem plan (overlays/jerusalem.svg)
 * is separate and is not covered here.
 *
 * @module generate-maps/geo-overlay
 */

const fs = require("fs");
const path = require("path");

const { projectPoint, clipLineToBBox, clipPolygonToBBox } = require("./project");

const FEATURES_PATH = path.resolve(__dirname, "overlays", "ancient-features.geo.json");

// Same colours as the base map palette in svg-builder.js (PALETTE.roadStroke,
// PALETTE.hillStroke, PALETTE.waterLight, PALETTE.waterDark).
const ROAD_STYLE = 'fill="none" stroke="#A89680" stroke-width="1.5" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round"';
const BOUNDARY_STYLE = 'fill="none" stroke="#C4B5A3" stroke-width="0.8" stroke-dasharray="2,4" stroke-linecap="round"';
const LAKE_STYLE = 'fill="#C9D4D8" fill-opacity="0.6" stroke="#9FB0B6" stroke-width="0.8"';

/**
 * Read the feature file.
 *
 * @returns {{roads: Array, boundaries: Array, lakes: Array}} Each feature has a name, a maps list, and points ([lon, lat] pairs) or polygon.
 */
function loadAncientFeatures() {
  return JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
}

function pointsAttribute(cfg, lonLatPairs) {
  return lonLatPairs
    .map(([lon, lat]) => {
      const p = projectPoint(lon, lat, cfg.bbox, cfg.viewBox, 1);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

/**
 * Build the SVG fragment of the geo-anchored features for one map.
 *
 * @param {string} mapKey
 * @param {{bbox: Object, viewBox: Object}} cfg - Map config from map-configs.js.
 * @returns {string} SVG fragment, empty when no feature names this map.
 */
function buildGeoOverlay(mapKey, cfg) {
  const features = loadAncientFeatures();
  const shown = (list) => list.filter((f) => f.maps.includes(mapKey));

  // Clip to the bbox so no coordinate lands far outside the viewBox. A road
  // that leaves and re-enters the map becomes more than one polyline.
  const polylines = (f) =>
    clipLineToBBox(f.points, cfg.bbox).map((part) => `<polyline points="${pointsAttribute(cfg, part)}"/>`);
  const lakes = shown(features.lakes)
    .map((f) => clipPolygonToBBox(f.polygon, cfg.bbox))
    .filter((ring) => ring.length >= 3)
    .map((ring) => `<polygon ${LAKE_STYLE} points="${pointsAttribute(cfg, ring)}"/>`);
  const boundaries = shown(features.boundaries).flatMap(polylines);
  const roads = shown(features.roads).flatMap(polylines);

  const groups = [];
  if (lakes.length) groups.push(`<g id="geo-lakes">${lakes.join("")}</g>`);
  if (boundaries.length) groups.push(`<g id="geo-boundaries" ${BOUNDARY_STYLE}>${boundaries.join("")}</g>`);
  if (roads.length) groups.push(`<g id="geo-roads" ${ROAD_STYLE}>${roads.join("")}</g>`);
  return groups.join("\n");
}

module.exports = { loadAncientFeatures, buildGeoOverlay };
