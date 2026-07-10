#!/usr/bin/env node
/**
 * Map SVG generator — orchestrator entry point.
 *
 * Usage:  node api/scripts/generate-maps/index.js [map_key]
 *
 *   - With map_key: generates only that map.
 *   - Without arguments: generates all five canonical maps.
 *
 * Output written to frontend/assets/images/maps/<map_key>.svg
 *
 * @module generate-maps/index
 */

const fs = require("fs");
const path = require("path");

const { getConfig, MAP_CONFIGS } = require("./map-configs");
const { loadGeoJSON, projectParts, clipGeometryToBBox, expandBBox } = require("./project");
const { buildSVG } = require("./svg-builder");

// Margin (as a fraction of the bbox range) added before clipping, so
// geometry just outside the map's bbox isn't harshly truncated at the
// viewBox edge.
const CLIP_MARGIN_FRACTION = 0.05;

// Shapes whose projected bounding box spans fewer than this many pixels in
// both dimensions are invisible at render size (e.g. minor Aegean islets on
// the Roman Empire overview) — dropping them keeps the SVG lean without any
// visible change.
const MIN_SHAPE_PIXEL_SPAN = 1.5;

const DATA_DIR = path.resolve(__dirname, "data");
const OVERLAYS_DIR = path.resolve(__dirname, "overlays");
const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "frontend",
  "assets",
  "images",
  "maps",
);

/**
 * Compute the pixel bounding-box span (max of width, height) of a
 * projected "x,y x,y ..." points string.
 *
 * @param {string} pointsStr
 * @returns {number}
 */
function pixelSpan(pointsStr) {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const pair of pointsStr.split(" ")) {
    const [x, y] = pair.split(",").map(Number);
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return Math.max(xMax - xMin, yMax - yMin);
}

/**
 * Project a single data layer (GeoJSON file → array of polyline/polygon
 * point strings, one per disjoint shape).
 *
 * Each feature's geometry is clipped to the map's bbox (plus a small
 * margin) before simplification/projection, so the output SVG contains
 * no far-off-canvas coordinates. Shapes are kept separate (rather than
 * concatenated into one string) so unrelated landmasses/rivers don't get
 * drawn as if connected by a stray line.
 *
 * @param {string} layerName - "coastline", "lakes", or "rivers".
 * @param {Object} bbox
 * @param {Object} viewBox
 * @param {number} simplifyTolerance - RDP tolerance in degrees.
 * @returns {Array<string>} Points strings, one per shape.
 */
function projectLayer(layerName, bbox, viewBox, simplifyTolerance) {
  const dataPath = path.join(DATA_DIR, `${layerName}.geojson`);
  if (!fs.existsSync(dataPath)) {
    console.warn(`  [warn] GeoJSON not found: ${dataPath} — layer will be empty.`);
    return [];
  }

  const fc = loadGeoJSON(dataPath);
  const clipBBox = expandBBox(bbox, CLIP_MARGIN_FRACTION);
  const parts = [];

  for (const feature of fc.features) {
    if (!feature || !feature.geometry) continue;
    const clipped = clipGeometryToBBox(feature.geometry, clipBBox);
    if (!clipped) continue;
    for (const pts of projectParts(clipped, bbox, viewBox, simplifyTolerance)) {
      if (pts && pixelSpan(pts) >= MIN_SHAPE_PIXEL_SPAN) parts.push(pts);
    }
  }

  return parts;
}

/**
 * Load a hand-drawn overlay SVG fragment for a map key.
 *
 * @param {string} mapKey
 * @returns {string} Inner SVG content, or empty string if no overlay exists.
 */
function loadOverlay(mapKey) {
  const overlayPath = path.join(OVERLAYS_DIR, `${mapKey}.svg`);
  if (!fs.existsSync(overlayPath)) return "";
  return fs.readFileSync(overlayPath, "utf8").trim();
}

/**
 * Generate a single map SVG.
 *
 * @param {string} mapKey
 */
function generateMap(mapKey) {
  console.log(`Generating ${mapKey}...`);
  const cfg = getConfig(mapKey);

  // Project data layers
  const projected = {};
  if (cfg.dataLayers) {
    const tolerance = cfg.simplifyTolerance != null ? cfg.simplifyTolerance : 0.01;
    for (const layer of cfg.dataLayers) {
      projected[layer] = projectLayer(layer, cfg.bbox, cfg.viewBox, tolerance);
    }
  }

  // Map the data layer names to the keys the SVG builder expects
  const mapped = {
    land: projected.coastline || [],
    lakes: projected.lakes || [],
    rivers: projected.rivers || [],
  };

  // Load hand-drawn overlay
  const overlaySVG = loadOverlay(mapKey);

  // Build SVG
  const svg = buildSVG(cfg, mapped, overlaySVG);

  // Write output
  const outPath = path.join(OUTPUT_DIR, `${mapKey}.svg`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, svg, "utf8");

  const sizeKB = (Buffer.byteLength(svg, "utf8") / 1024).toFixed(1);
  console.log(`  -> ${outPath} (${sizeKB} KB)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0) {
  const mapKey = args[0];
  if (!MAP_CONFIGS[mapKey]) {
    console.error(`Unknown map key: "${mapKey}".`);
    console.error(`Valid keys: ${Object.keys(MAP_CONFIGS).join(", ")}`);
    process.exit(1);
  }
  generateMap(mapKey);
} else {
  console.log("Generating all five canonical map SVGs...\n");
  const keys = Object.keys(MAP_CONFIGS);
  for (const key of keys) {
    generateMap(key);
  }
  console.log("\nDone.");
}
