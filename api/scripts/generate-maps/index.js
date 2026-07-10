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
const { loadGeoJSON, projectLine } = require("./project");
const { buildSVG } = require("./svg-builder");

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
 * Project a single data layer (GeoJSON file → polyline string).
 *
 * @param {string} layerName - "coastline", "lakes", or "rivers".
 * @param {Object} bbox
 * @param {Object} viewBox
 * @returns {string} Points string for SVG polyline/polygon.
 */
function projectLayer(layerName, bbox, viewBox) {
  const dataPath = path.join(DATA_DIR, `${layerName}.geojson`);
  if (!fs.existsSync(dataPath)) {
    console.warn(`  [warn] GeoJSON not found: ${dataPath} — layer will be empty.`);
    return "";
  }

  const fc = loadGeoJSON(dataPath);
  let allPoints = [];

  for (const feature of fc.features) {
    if (!feature || !feature.geometry) continue;
    const pts = projectLine(feature.geometry, bbox, viewBox, 0.3);
    if (pts) {
      if (allPoints.length > 0) allPoints.push(" ");
      allPoints.push(pts);
    }
  }

  return allPoints.join(" ");
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
    for (const layer of cfg.dataLayers) {
      projected[layer] = projectLayer(layer, cfg.bbox, cfg.viewBox);
    }
  }

  // Map the data layer names to the keys the SVG builder expects
  const mapped = {
    land: projected.coastline || "",
    lakes: projected.lakes || "",
    rivers: projected.rivers || "",
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
