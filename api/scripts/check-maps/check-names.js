/**
 * Check 4: are the names right for AD 30, and spelled one way?
 *
 * The same text scan can run on pin labels once pins are loaded.
 *
 * @module check-maps/check-names
 */

const { normaliseName } = require("./reference");

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find names that did not exist in AD 30.
 *
 * @param {Array<{map: string, text: string}>} items - Every text that a reader sees.
 * @param {Array<{term: string, since: number, note: string}>} anachronisms - From loadReference().
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function findAnachronisms(items, anachronisms) {
  const findings = [];
  for (const item of items) {
    const text = normaliseName(item.text);
    for (const entry of anachronisms) {
      const pattern = new RegExp(`\\b${escapeRegExp(normaliseName(entry.term))}\\b`);
      if (!pattern.test(text)) continue;
      findings.push({
        map: item.map,
        check: "name",
        severity: "error",
        message: `"${item.text}" uses "${entry.term}", which dates from AD ${entry.since}. ${entry.note}`,
      });
    }
  }
  return findings;
}

/**
 * Find one place that the maps spell two ways, for example Judea and Judaea.
 *
 * @param {Array<{map: string, text: string}>} items - Every text that a reader sees.
 * @param {Array<Array<string>>} nameVariants - Groups of spellings from loadReference().
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function findSpellingSplits(items, nameVariants) {
  const findings = [];
  for (const group of nameVariants) {
    const seen = new Map();
    for (const item of items) {
      const text = normaliseName(item.text);
      for (const spelling of group) {
        if (!new RegExp(`\\b${escapeRegExp(normaliseName(spelling))}\\b`).test(text)) continue;
        if (!seen.has(spelling)) seen.set(spelling, new Set());
        seen.get(spelling).add(item.map);
      }
    }
    if (seen.size < 2) continue;
    const detail = [...seen].map(([spelling, maps]) => `${spelling} (${[...maps].join(", ")})`).join(" and ");
    findings.push({ map: "all", check: "name", severity: "warn", message: `Two spellings of one name: ${detail}.` });
  }
  return findings;
}

/**
 * @param {Array<{map: string, text: string}>} items
 * @param {{anachronisms: Array, nameVariants: Array}} reference - From loadReference().
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function checkNames(items, reference) {
  return [
    ...findAnachronisms(items, reference.anachronisms),
    ...findSpellingSplits(items, reference.nameVariants),
  ];
}

module.exports = { checkNames };
