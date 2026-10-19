/**
 * Check 1: does the map stretch shapes?
 *
 * The generator maps degrees straight onto pixels with no cos(latitude)
 * scaling. When the viewBox does not have the shape of the bbox on the
 * ground, one pixel covers more kilometres east-west than north-south, and
 * every coastline looks squeezed or stretched.
 *
 * @module check-maps/check-stretch
 */

const { pixelsPerKm } = require("./geo-units");

// A stretch inside this limit is not visible to a reader.
const WARN_STRETCH = 0.05;
const ERROR_STRETCH = 0.15;

/**
 * @param {string} mapKey
 * @param {{bbox: Object, viewBox: Object}} cfg - Map config from map-configs.js.
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function checkStretch(mapKey, cfg) {
  const midLat = (cfg.bbox.lat_min + cfg.bbox.lat_max) / 2;
  const scale = pixelsPerKm(cfg, midLat);
  // A value above 1 means a kilometre is wider than it is tall on screen.
  const ratio = scale.x / scale.y;
  const off = Math.abs(ratio - 1);
  if (off <= WARN_STRETCH) return [];

  const direction = ratio > 1 ? "wider" : "taller";
  return [
    {
      map: mapKey,
      check: "stretch",
      severity: off > ERROR_STRETCH ? "error" : "warn",
      message: `Shapes look ${Math.round(off * 100)}% ${direction} than on the ground (x ${scale.x.toFixed(2)} px/km, y ${scale.y.toFixed(2)} px/km at ${midLat.toFixed(1)}°N).`,
    },
  ];
}

module.exports = { checkStretch };
