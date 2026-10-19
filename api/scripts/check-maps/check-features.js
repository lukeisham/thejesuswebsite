/**
 * Check 2: does each baked-in label and hill sit where its AD 30 place was,
 * and on the right kind of ground (water for seas, land for the rest)?
 *
 * @module check-maps/check-features
 */

const { findFeature } = require("./reference");
const { haversineKm, pxToLonLat, lonLatToPx } = require("./geo-units");

const WATER_KINDS = new Set(["sea", "lake"]);

// Label classes from map-configs.js that carry no place a reference can judge.
const SKIPPED_LABEL_CLASSES = new Set(["river-label", "valley-label"]);

/**
 * Turn a map config into the list of positioned names to check.
 *
 * @param {{labels: Array, hills?: Array}} cfg
 * @param {Array<{text: string, x: number, y: number}>} [overlayTexts] - Text drawn by an overlay file.
 * @returns {Array<{text: string, x: number, y: number, source: string}>}
 */
function collectItems(cfg, overlayTexts = []) {
  const labels = cfg.labels
    .filter((l) => !SKIPPED_LABEL_CLASSES.has(l.cls))
    .map((l) => ({ text: l.text, x: l.x, y: l.y, source: "label" }));
  const hills = (cfg.hills || []).map((h) => ({ text: h.label, x: h.cx, y: h.cy, source: "hill" }));
  const texts = overlayTexts.map((t) => ({ ...t, source: "overlay text" }));
  return [...labels, ...hills, ...texts];
}

/**
 * @param {string} mapKey
 * @param {Object} cfg - Map config from map-configs.js.
 * @param {Array} features - Reference features from loadReference().
 * @param {function(number, number): boolean} isWater - From buildWaterTest().
 * @param {Array<{text: string, x: number, y: number}>} [overlayTexts]
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function checkFeatures(mapKey, cfg, features, isWater, overlayTexts) {
  const findings = [];
  for (const item of collectItems(cfg, overlayTexts)) {
    const text = item.text.replace(/ /g, " ");
    const feature = findFeature(features, text);
    if (!feature) {
      findings.push({
        map: mapKey,
        check: "feature",
        severity: "info",
        message: `No AD 30 reference for ${item.source} "${text}".`,
      });
      continue;
    }

    const { lon, lat } = pxToLonLat(cfg, item.x, item.y);
    // A sea has no single position, so only the water test judges it.
    const km = feature.kind === "sea" ? 0 : haversineKm(lon, lat, feature.lng, feature.lat);
    if (km > feature.radiusKm) {
      const expected = lonLatToPx(cfg, feature.lng, feature.lat);
      findings.push({
        map: mapKey,
        check: "feature",
        severity: "error",
        message: `${item.source} "${text}" is ${km.toFixed(1)} km from its AD 30 position (limit ${feature.radiusKm} km). It should be near px ${Math.round(expected.x)},${Math.round(expected.y)}.`,
      });
    }

    // Natural Earth is modern data. A lake that was drained since AD 30 shows as land.
    if (feature.drainedToday) continue;
    const onWater = isWater(lon, lat);
    const wantsWater = WATER_KINDS.has(feature.kind);
    if (onWater !== wantsWater) {
      findings.push({
        map: mapKey,
        check: "feature",
        severity: "error",
        message: `${item.source} "${text}" (${feature.kind}) sits on ${onWater ? "water" : "land"} in the drawn map.`,
      });
    }
  }
  return findings;
}

module.exports = { checkFeatures };
