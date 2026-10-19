/**
 * Check 5: do the drawn labels collide, or run out of the frame?
 *
 * Works on the generated SVG, because that is what the reader sees. Text
 * width is an estimate (Georgia averages about 0.55 em per letter), so a
 * borderline hit can be a false alarm. Rotated labels are skipped.
 *
 * @module check-maps/check-collisions
 */

const AVERAGE_LETTER_EM = 0.55;
const ASCENT_EM = 0.8;
const DESCENT_EM = 0.2;
// The double frame in svg-builder.js takes about this much from each edge.
const FRAME_MARGIN_PX = 12;

function readAttr(attrs, name) {
  const match = attrs.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : undefined;
}

/**
 * Estimate the box of every unrotated <text> in a generated map.
 *
 * @param {string} svgText - A generated map SVG.
 * @returns {Array<{text: string, left: number, right: number, top: number, bottom: number}>}
 */
function estimateTextBoxes(svgText) {
  const boxes = [];
  for (const m of svgText.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const attrs = ` ${m[1]}`;
    if (readAttr(attrs, "transform")) continue;
    const text = m[2].replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
    const fontSize = Number(readAttr(attrs, "font-size"));
    const spacingEm = parseFloat(readAttr(attrs, "letter-spacing") || "0");
    const x = Number(readAttr(attrs, "x"));
    const y = Number(readAttr(attrs, "y"));
    const width = text.length * fontSize * (AVERAGE_LETTER_EM + spacingEm);
    const anchor = readAttr(attrs, "text-anchor");
    const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
    boxes.push({
      text,
      left,
      right: left + width,
      top: y - fontSize * ASCENT_EM,
      bottom: y + fontSize * DESCENT_EM,
    });
  }
  return boxes;
}

/**
 * @param {string} mapKey
 * @param {string} svgText - A generated map SVG.
 * @param {{width: number, height: number}} viewBox
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function checkCollisions(mapKey, svgText, viewBox) {
  const findings = [];
  const boxes = estimateTextBoxes(svgText);

  boxes.forEach((a, i) => {
    if (
      a.left < FRAME_MARGIN_PX ||
      a.top < FRAME_MARGIN_PX ||
      a.right > viewBox.width - FRAME_MARGIN_PX ||
      a.bottom > viewBox.height - FRAME_MARGIN_PX
    ) {
      findings.push({ map: mapKey, check: "collision", severity: "warn", message: `"${a.text}" touches or crosses the map frame.` });
    }
    for (const b of boxes.slice(i + 1)) {
      const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      if (overlaps) {
        findings.push({ map: mapKey, check: "collision", severity: "warn", message: `"${a.text}" overlaps "${b.text}".` });
      }
    }
  });
  return findings;
}

module.exports = { checkCollisions };
