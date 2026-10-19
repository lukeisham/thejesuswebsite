/**
 * Reads the text labels that the hand-drawn pixel overlay (the Jerusalem plan)
 * puts on a map. Roads, boundaries and lakes are not read here: they come
 * from ancient-features.geo.json (see check-overlays.js).
 *
 * @module check-maps/overlay-parser
 */

/**
 * @param {string} svgText - Contents of one overlay file.
 * @returns {{texts: Array<{text: string, x: number, y: number}>}}
 */
function parseOverlay(svgText) {
  const texts = [...svgText.matchAll(/<text\b[^>]*\sx="([\d.]+)"[^>]*\sy="([\d.]+)"[^>]*>([^<]+)<\/text>/g)].map(
    (m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[3].replace(/&amp;/g, "&").trim() }),
  );
  return { texts };
}

module.exports = { parseOverlay };
