// Wikipedia quality grid tests — uses node:test + node:assert.
// wikipedia.js has a DOM-dependent module top level (document.getElementById
// calls at import time), so its logic is replicated here rather than
// imported directly — same convention as arbor-data.test.js and
// announce.test.js.
//
// Run with: node --test frontend/assets/js/wikipedia.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// §9 row order — mirrors SIGNAL_DICTIONARY in utils/wikipedia-signals.js.
const SIGNAL_DICTIONARY = [
  { key: "manuscripts", name: "Named manuscripts", capMagnitude: 8, polarity: "positive" },
  { key: "bible_verses", name: "Bible verses cited", capMagnitude: 12, polarity: "positive" },
  { key: "data_interp_split", name: "Data/interpretation section split", capMagnitude: 10, polarity: "positive" },
  { key: "commentaries", name: "Commentary citations", capMagnitude: 6, polarity: "positive" },
  { key: "balanced_debate", name: "Balanced debate", capMagnitude: 12, polarity: "positive" },
  { key: "ante_nicene", name: "Ante-Nicene authors", capMagnitude: 6, polarity: "positive" },
  { key: "arch_site", name: "Archaeological site/artefact", capMagnitude: 8, polarity: "positive" },
  { key: "jewish_context", name: "Jewish context terms", capMagnitude: 6, polarity: "positive" },
  { key: "ancient_historians", name: "Non-Christian ancient historians", capMagnitude: 6, polarity: "positive" },
  { key: "literary_analysis", name: "Literary analysis", capMagnitude: 6, polarity: "positive" },
  { key: "primary_quotes", name: "Primary-source quotes", capMagnitude: 4, polarity: "positive" },
  { key: "journal_or_book", name: "Journal/book citations", capMagnitude: 4, polarity: "positive" },
  { key: "maps_diagrams", name: "Maps and diagrams", capMagnitude: 2, polarity: "positive" },
  { key: "wiki_quality", name: "Wikipedia Good/Featured Article", capMagnitude: 1, polarity: "positive" },
  { key: "religious_art", name: "Religious art", capMagnitude: 1, polarity: "positive" },
  { key: "gnostic_over_emphasis", name: "Gnostic over-emphasis", capMagnitude: 4, polarity: "negative" },
  { key: "confessional_balance", name: "Confessional balance", capMagnitude: 3, polarity: "negative" },
  { key: "other_religion", name: "Other-religion sources", capMagnitude: 3, polarity: "negative" },
  { key: "jesus_seminar", name: "Jesus Seminar citations", capMagnitude: 14, polarity: "negative" },
  { key: "ot_nt_criticism", name: "OT-NT continuity criticism", capMagnitude: 6, polarity: "negative" },
  { key: "mythicist", name: "Mythicist citations", capMagnitude: 16, polarity: "negative" },
  { key: "supernatural_criticism", name: "Supernatural-worldview criticism", capMagnitude: 8, polarity: "negative" },
  { key: "secular_materialist", name: "Secular-materialist presuppositions", capMagnitude: 8, polarity: "negative" },
  { key: "referencing_quality", name: "Wikipedia referencing", capMagnitude: 9, polarity: "negative" },
  { key: "no_bible_verse", name: "No Bible verse cited", capMagnitude: 10, polarity: "negative" },
];

function fulfilmentRatio(contribution, cap) {
  if (!cap) return 0;
  const ratio = Math.abs(contribution) / Math.abs(cap);
  return Math.min(Math.max(ratio, 0), 1);
}

// Mirrors buildAgentData() in wikipedia.js.
function buildAgentData(title, signalRows) {
  const rowsByKey = new Map((signalRows || []).map((row) => [row.signal_key, row]));

  const signals = SIGNAL_DICTIONARY.map((entry) => {
    const row = rowsByKey.get(entry.key);
    const contribution = row ? row.contribution : 0;
    const cap = row ? row.cap : 0;
    const fired = contribution !== 0;
    return {
      key: entry.key,
      name: entry.name,
      polarity: entry.polarity,
      cap,
      contribution,
      fulfilment: fired ? fulfilmentRatio(contribution, cap) : 0,
      fired,
    };
  });

  const netScore = signals.reduce((sum, signal) => sum + signal.contribution, 0);
  const maxPossible = signals.reduce((sum, signal) => sum + Math.max(signal.cap, 0), 0);

  return { article: title, net_score: netScore, max_possible: maxPossible, signals };
}

// Mirrors scoreBand() in wikipedia.js.
function scoreBand(netScore) {
  if (netScore >= 50) return "green";
  if (netScore >= 25) return "yellow";
  return "red";
}

// Mirrors blueIntensityTier() in wikipedia.js.
function blueIntensityTier(ratio) {
  if (ratio >= 0.95) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

// Mirrors buildCellMarkup()'s classification logic in wikipedia.js.
function classifyCell(row) {
  const contribution = row ? row.contribution : 0;
  const cap = row ? row.cap : 0;
  if (contribution === 0) return "empty";
  if (contribution < 0) return "negative";
  return `blue-${blueIntensityTier(fulfilmentRatio(contribution, cap))}`;
}

// Mirrors buildClipboardText() in wikipedia.js.
function padSignalName(name, width) {
  return name.length >= width ? name : name + " ".repeat(width - name.length);
}

function buildClipboardText(agentData) {
  const scored = agentData.signals.filter((signal) => signal.contribution !== 0);
  const unscored = agentData.signals.filter((signal) => signal.contribution === 0);

  const nameWidth = scored.reduce((max, signal) => Math.max(max, signal.name.length), 0);
  const scoredLines = scored.map((signal) => {
    const sign = signal.contribution > 0 ? "+" : "";
    return `${padSignalName(signal.name, nameWidth)}  ${sign}${signal.contribution}`;
  });

  return [
    `${agentData.article} — reliability score ${agentData.net_score}`,
    "",
    "Scored signals:",
    ...scoredLines,
    "",
    "Not scored:",
    ...unscored.map((signal) => signal.name),
    "",
    `Net score: ${agentData.net_score} of a possible ${agentData.max_possible}`,
    "",
    "Source: thejesuswebsite.org/debate/wikipedia",
  ].join("\n");
}

// ── Fixtures ─────────────────────────────────────────────────────────────

function makeRows(overrides) {
  // Only a handful of signals fire; the rest are absent from the DB row set,
  // which buildAgentData() must treat as unfired (contribution 0, fired false).
  const base = {
    manuscripts: { contribution: 6, cap: 8 },
    bible_verses: { contribution: 12, cap: 12 },
    mythicist: { contribution: -8, cap: -16 },
    referencing_quality: { contribution: -9, cap: -9 },
  };
  const merged = { ...base, ...overrides };
  return Object.entries(merged).map(([signal_key, v]) => ({ signal_key, ...v }));
}

// ── Score band boundaries ───────────────────────────────────────────────

describe("scoreBand: boundary values", () => {
  test("24 -> red", () => assert.equal(scoreBand(24), "red"));
  test("25 -> yellow", () => assert.equal(scoreBand(25), "yellow"));
  test("49 -> yellow", () => assert.equal(scoreBand(49), "yellow"));
  test("50 -> green", () => assert.equal(scoreBand(50), "green"));
});

// ── Agent-JSON invariants ───────────────────────────────────────────────

describe("buildAgentData: invariants", () => {
  test("emits exactly 25 signals in §9 order", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    assert.equal(agentData.signals.length, 25);
    assert.deepEqual(
      agentData.signals.map((s) => s.key),
      SIGNAL_DICTIONARY.map((e) => e.key),
    );
  });

  test("sum of all 25 contributions equals net_score", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const sum = agentData.signals.reduce((total, s) => total + s.contribution, 0);
    assert.equal(sum, agentData.net_score);
  });

  test("unfired signals have contribution 0, fulfilment 0, fired false", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const unfired = agentData.signals.filter((s) => !["manuscripts", "bible_verses", "mythicist", "referencing_quality"].includes(s.key));
    assert.ok(unfired.length > 0);
    for (const signal of unfired) {
      assert.equal(signal.contribution, 0);
      assert.equal(signal.fulfilment, 0);
      assert.equal(signal.fired, false);
    }
  });

  test("missing DB rows entirely still produce 25 signals summing to 0", () => {
    const agentData = buildAgentData("Untouched Article", []);
    assert.equal(agentData.signals.length, 25);
    assert.equal(agentData.net_score, 0);
    assert.ok(agentData.signals.every((s) => s.fired === false));
  });
});

// ── Grid cell rendering ──────────────────────────────────────────────────

describe("grid cell classification", () => {
  test("25 cells always rendered, regardless of how many rows fired", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    assert.equal(agentData.signals.length, 25);
  });

  test("contribution 0 -> empty cell", () => {
    assert.equal(classifyCell({ signal_key: "arch_site", contribution: 0, cap: 8 }), "empty");
  });

  test("no row at all -> empty cell", () => {
    assert.equal(classifyCell(undefined), "empty");
  });

  test("positive contribution -> blue tier by fulfilment ratio", () => {
    assert.equal(classifyCell({ contribution: 4, cap: 8 }), "blue-2"); // ratio 0.5
    assert.equal(classifyCell({ contribution: 8, cap: 8 }), "blue-4"); // ratio 1.0
  });

  test("negative contribution -> negative class regardless of magnitude", () => {
    assert.equal(classifyCell({ contribution: -2, cap: -16 }), "negative");
    assert.equal(classifyCell({ contribution: -16, cap: -16 }), "negative");
  });

  test("cell count never exceeds 25", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    assert.ok(agentData.signals.length <= 25);
  });
});

// ── Copy-text format (§6) ────────────────────────────────────────────────

describe("buildClipboardText: §6 format", () => {
  test("scored signals section lists only non-zero contributions in §9 order", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const text = buildClipboardText(agentData);
    const scoredSection = text.split("Scored signals:\n")[1].split("\n\nNot scored:")[0];
    const listedNames = scoredSection.split("\n").map((line) => line.trim().split(/\s{2,}/)[0]);

    assert.deepEqual(listedNames, ["Named manuscripts", "Bible verses cited", "Mythicist citations", "Wikipedia referencing"]);
  });

  test("not-scored section lists unfired signal names", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const text = buildClipboardText(agentData);
    assert.ok(text.includes("Not scored:"));
    assert.ok(text.includes("Balanced debate"));
    assert.ok(!text.split("Not scored:")[1].includes("Named manuscripts"));
  });

  test("net score line includes theoretical max", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const text = buildClipboardText(agentData);
    assert.ok(text.includes(`Net score: ${agentData.net_score} of a possible ${agentData.max_possible}`));
  });

  test("source line matches live site origin", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const text = buildClipboardText(agentData);
    assert.ok(text.trim().endsWith("Source: thejesuswebsite.org/debate/wikipedia"));
  });

  test("header line includes article title and net score", () => {
    const agentData = buildAgentData("Test Article", makeRows());
    const text = buildClipboardText(agentData);
    assert.ok(text.startsWith(`Test Article — reliability score ${agentData.net_score}`));
  });
});
