// Wikipedia signal dictionary tests — uses node:test + node:assert.
// SIGNAL_DICTIONARY is a pure ESM module (no DOM dependency), so it's loaded
// via dynamic import() rather than replicated inline.
//
// Run with: node --test frontend/assets/js/utils/wikipedia-signals.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

// §9 row order (setup/Wikipedia algorithm v2/Wikipedia_alogrithm_refractor.md) —
// strongest positive signal first, strongest negative signal last. Grid
// gradient reading depends on this exact order; never re-sort.
const EXPECTED_KEY_ORDER = [
  "manuscripts",
  "bible_verses",
  "narrative_interp_split",
  "commentaries",
  "balanced_debate",
  "ante_nicene",
  "arch_site",
  "jewish_context",
  "ancient_historians",
  "literary_analysis",
  "primary_quotes",
  "journal_or_book",
  "maps_diagrams",
  "wiki_quality",
  "religious_art",
  "gnostic_over_emphasis",
  "confessional_balance",
  "other_religion",
  "jesus_seminar",
  "ot_nt_criticism",
  "mythicist",
  "supernatural_criticism",
  "secular_materialist",
  "referencing_quality",
  "no_bible_verse",
];

async function loadSignalsModule() {
  const modulePath = path.join(__dirname, "wikipedia-signals.js");
  return import(`file://${modulePath}`);
}

function loadKnownSignalKeys() {
  // module.exports side effect opens a real sqlite connection (api/config.js)
  // — same pattern as api/tests/import-wikipedia-scoring.test.js.
  const { KNOWN_SIGNAL_KEYS } = require(
    "../../../../api/scripts/import-wikipedia-scoring",
  );
  return KNOWN_SIGNAL_KEYS;
}

describe("SIGNAL_DICTIONARY: dictionary integrity", () => {
  test("has exactly 25 entries", async () => {
    const { SIGNAL_DICTIONARY } = await loadSignalsModule();
    assert.equal(SIGNAL_DICTIONARY.length, 25);
  });

  test("no duplicate keys", async () => {
    const { SIGNAL_DICTIONARY } = await loadSignalsModule();
    const keys = SIGNAL_DICTIONARY.map((entry) => entry.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  test("every entry has a non-empty key field", async () => {
    const { SIGNAL_DICTIONARY } = await loadSignalsModule();
    for (const entry of SIGNAL_DICTIONARY) {
      assert.equal(typeof entry.key, "string");
      assert.ok(entry.key.length > 0, `entry "${entry.name}" has an empty key`);
    }
  });

  test("row order matches §9 exactly", async () => {
    const { SIGNAL_DICTIONARY } = await loadSignalsModule();
    const keys = SIGNAL_DICTIONARY.map((entry) => entry.key);
    assert.deepEqual(keys, EXPECTED_KEY_ORDER);
  });

  test("key-parity with KNOWN_SIGNAL_KEYS (Plan 6, import-wikipedia-scoring.js)", async () => {
    const { SIGNAL_DICTIONARY } = await loadSignalsModule();
    const dictKeys = new Set(SIGNAL_DICTIONARY.map((entry) => entry.key));
    const knownKeys = loadKnownSignalKeys();

    assert.equal(dictKeys.size, 25);
    assert.equal(knownKeys.size, 25);
    assert.deepEqual(
      [...dictKeys].sort(),
      [...knownKeys].sort(),
      "SIGNAL_DICTIONARY keys and KNOWN_SIGNAL_KEYS must be identical sets — a mismatch renders a permanently empty grid cell with no error thrown",
    );
  });
});

describe("fulfilmentRatio: edge cases", () => {
  test("0 contribution -> 0 ratio", async () => {
    const { fulfilmentRatio } = await loadSignalsModule();
    assert.equal(fulfilmentRatio(0, 10), 0);
  });

  test("full contribution -> 1 ratio", async () => {
    const { fulfilmentRatio } = await loadSignalsModule();
    assert.equal(fulfilmentRatio(10, 10), 1);
  });

  test("negative contribution uses absolute value", async () => {
    const { fulfilmentRatio } = await loadSignalsModule();
    assert.equal(fulfilmentRatio(-5, -10), 0.5);
  });

  test("zero cap -> 0 ratio (no divide-by-zero)", async () => {
    const { fulfilmentRatio } = await loadSignalsModule();
    assert.equal(fulfilmentRatio(0, 0), 0);
  });
});

// Mirrors blueIntensityTier() in wikipedia.js — tier boundaries at
// 0.30 / 0.60 / 0.95. Replicated here (wikipedia.js has a DOM-dependent
// module top level, so it can't be dynamically imported in Node).
function blueIntensityTier(ratio) {
  if (ratio >= 0.95) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

describe("blueIntensityTier: four-tier boundary mapping", () => {
  const cases = [
    [0.29, 1],
    [0.3, 2],
    [0.59, 2],
    [0.6, 3],
    [0.94, 3],
    [0.95, 4],
    [1.0, 4],
  ];

  for (const [ratio, expectedTier] of cases) {
    test(`ratio ${ratio} -> tier ${expectedTier}`, () => {
      assert.equal(blueIntensityTier(ratio), expectedTier);
    });
  }
});
