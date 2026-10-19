#!/usr/bin/env node
/**
 * Map checker — compares the generated maps with AD 30 geography.
 *
 * Usage:  node api/scripts/check-maps/index.js [output.html]
 *
 * Reads the five map configs, the overlay files and the generated SVGs in
 * frontend/assets/images/maps/. Prints the findings, then writes a review
 * sheet (default: map-review.html in the system temp folder). Exits 1 when
 * any finding has severity "error".
 *
 * Run `node api/scripts/generate-maps/index.js` first, so the SVGs match the
 * configs. Reference data is in first-century-reference.json (see the maps
 * guide in setup/ARCHITECTURE/maps.md).
 *
 * @module check-maps/index
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const { MAP_CONFIGS } = require("../generate-maps/map-configs");
const { loadReference } = require("./reference");
const { buildWaterTest } = require("./water-test");
const { parseOverlay } = require("./overlay-parser");
const { checkStretch } = require("./check-stretch");
const { checkFeatures } = require("./check-features");
const { checkOverlays, selectGeoShapes } = require("./check-overlays");
const { loadAncientFeatures } = require("../generate-maps/geo-overlay");
const { checkNames } = require("./check-names");
const { checkCollisions } = require("./check-collisions");
const { buildReviewSheet } = require("./review-sheet");

const OVERLAYS_DIR = path.resolve(__dirname, "..", "generate-maps", "overlays");
const MAPS_DIR = path.resolve(__dirname, "..", "..", "..", "frontend", "assets", "images", "maps");

/**
 * Every text that a reader sees on one map.
 *
 * @param {string} mapKey
 * @param {Object} cfg
 * @param {Object} overlay - From parseOverlay().
 * @returns {Array<{map: string, text: string}>}
 */
function visibleTexts(mapKey, cfg, overlay) {
  const texts = [
    ...cfg.labels.map((l) => l.text),
    ...(cfg.hills || []).map((h) => h.label),
    cfg.cartouche.title,
    cfg.cartouche.subtitle,
    ...(cfg.attribution ? [cfg.attribution] : []),
    ...overlay.texts.map((t) => t.text),
  ];
  return texts.map((text) => ({ map: mapKey, text: text.replace(/ /g, " ") }));
}

function main() {
  const reference = loadReference();
  const features = loadAncientFeatures();
  const isWater = buildWaterTest();
  const findings = [];
  const sheetMaps = [];
  const allTexts = [];

  for (const [mapKey, cfg] of Object.entries(MAP_CONFIGS)) {
    const overlayPath = path.join(OVERLAYS_DIR, `${mapKey}.svg`);
    const overlay = parseOverlay(fs.existsSync(overlayPath) ? fs.readFileSync(overlayPath, "utf8") : "");
    const svg = fs.readFileSync(path.join(MAPS_DIR, `${mapKey}.svg`), "utf8");
    const mapFindings = [
      ...checkStretch(mapKey, cfg),
      ...checkFeatures(mapKey, cfg, reference.features, isWater, overlay.texts),
      ...checkOverlays(mapKey, cfg, reference, selectGeoShapes(mapKey, features), isWater),
      ...checkCollisions(mapKey, svg, cfg.viewBox),
    ];
    const texts = visibleTexts(mapKey, cfg, overlay);
    allTexts.push(...texts);
    mapFindings.push(...checkNames(texts, { ...reference, nameVariants: [] }));

    findings.push(...mapFindings);
    sheetMaps.push({
      mapKey,
      title: cfg.cartouche.title,
      svg: svg.replace(/^<\?xml[^>]*>\s*/, ""),
      cfg,
      findings: mapFindings,
    });
  }

  const spellingFindings = checkNames(allTexts, { ...reference, anachronisms: [] });
  findings.push(...spellingFindings);

  for (const f of findings.filter((x) => x.severity !== "info")) {
    console.log(`[${f.severity.toUpperCase()}] ${f.map} · ${f.check} · ${f.message}`);
  }
  const count = (s) => findings.filter((f) => f.severity === s).length;
  console.log(`\n${count("error")} errors, ${count("warn")} warnings, ${count("info")} info (info is in the review sheet only).`);

  const outPath = path.resolve(process.argv[2] || path.join(os.tmpdir(), "map-review.html"));
  fs.writeFileSync(outPath, buildReviewSheet(sheetMaps, reference));
  console.log(`Review sheet: ${outPath}`);

  if (count("error") > 0) process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = { visibleTexts };
