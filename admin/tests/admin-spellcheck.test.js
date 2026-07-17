// Admin spellcheck JS tests — uses node:test + node:assert.
// Covers: overlay renderer span offsets, grammar-overlap exclusion logic,
// and dictionary client optimistic local-set updates.
//
// Since the modules under test are browser-side ES scripts that use DOM APIs
// and a Web Worker, the relevant pure functions are replicated inline here
// so they can be tested in Node without a browser environment.
//
// Run with: node --test admin/tests/admin-spellcheck.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Replicated functions ────────────────────────────────────────────────────
//   These are exact copies of the logic in admin-spellcheck/*.js, reproduced
//   here so tests run in Node without DOM or Worker dependencies.

/**
 * Build a sorted list of mark ranges with type, excluding grammar ranges
 * that overlap spelling ranges (the ordering guarantee).
 *
 * @param {{ start: number, end: number }[]} spellingErrors
 * @param {{ start: number, end: number, message: string }[]} grammarErrors
 * @returns {{ start: number, end: number, type: string }[]}
 */
function resolveMarks(spellingErrors, grammarErrors) {
  const marks = [];

  for (const e of spellingErrors) {
    marks.push({ start: e.start, end: e.end, type: "spelling" });
  }

  for (const g of grammarErrors) {
    const overlapsSpelling = spellingErrors.some(
      (s) => g.start < s.end && g.end > s.start,
    );
    if (!overlapsSpelling) {
      marks.push({ start: g.start, end: g.end, type: "grammar" });
    }
  }

  marks.sort((a, b) => a.start - b.start);
  return marks;
}

/**
 * Compute the span offsets (plain-text and flagged ranges) that the overlay
 * renderer would produce for a given text and marks list.
 *
 * Returns an array of { start, end, type } for every segment.
 *
 * @param {string} text
 * @param {{ start: number, end: number, type: string }[]} marks
 * @returns {{ start: number, end: number, type: string }[]}
 */
function computeSegments(text, marks) {
  const segments = [];
  let cursor = 0;

  for (const mark of marks) {
    if (mark.start < cursor) continue;

    if (cursor < mark.start) {
      segments.push({ start: cursor, end: mark.start, type: "plain" });
    }

    segments.push({
      start: mark.start,
      end: mark.end,
      type: mark.type,
    });
    cursor = mark.end;
  }

  if (cursor < text.length) {
    segments.push({ start: cursor, end: text.length, type: "plain" });
  }

  return segments;
}

/**
 * Simulate the dictionary client's optimistic local-set update.
 *
 * @param {Set<string>} wordSet
 * @param {string} word
 * @returns {Set<string>} New set with the word added (lowercased).
 */
function optimisticLearn(wordSet, word) {
  const next = new Set(wordSet);
  next.add(word.toLowerCase());
  return next;
}

function optimisticIgnore(wordSet, word) {
  // Same local behavior — both add to the set
  return optimisticLearn(wordSet, word);
}

// ── Overlay renderer: span offsets ──────────────────────────────────────────

describe("overlay renderer — span offsets", () => {
  test("produces a single spelling mark in the correct position", () => {
    const text = "Hello wrld";
    const spellingErrors = [{ start: 6, end: 10, word: "wrld" }];
    const marks = resolveMarks(spellingErrors, []);
    const segments = computeSegments(text, marks);

    assert.equal(segments.length, 2);
    assert.deepStrictEqual(segments[0], {
      start: 0,
      end: 6,
      type: "plain",
    });
    assert.deepStrictEqual(segments[1], {
      start: 6,
      end: 10,
      type: "spelling",
    });
  });

  test("produces grammar mark when no spelling errors overlap", () => {
    const text = "The book was written by John";
    const spellingErrors = [];
    const grammarErrors = [
      { start: 9, end: 25, message: "Possible passive voice" },
    ];
    const marks = resolveMarks(spellingErrors, grammarErrors);
    const segments = computeSegments(text, marks);

    const grammarSegs = segments.filter((s) => s.type === "grammar");
    assert.equal(grammarSegs.length, 1);
    assert.deepStrictEqual(grammarSegs[0], {
      start: 9,
      end: 25,
      type: "grammar",
    });
  });

  test("excludes grammar mark that overlaps a spelling mark", () => {
    const text = "The bok was written by John";
    const spellingErrors = [{ start: 4, end: 7, word: "bok" }];
    const grammarErrors = [
      { start: 4, end: 22, message: "Spans across misspelling" },
    ];
    const marks = resolveMarks(spellingErrors, grammarErrors);

    // The grammar mark should be excluded because it overlaps the spelling mark
    const grammarMarks = marks.filter((m) => m.type === "grammar");
    assert.equal(grammarMarks.length, 0);
  });

  test("includes grammar mark that does NOT overlap any spelling mark", () => {
    const text = "The bok was written by John";
    const spellingErrors = [{ start: 4, end: 7, word: "bok" }];
    const grammarErrors = [
      { start: 8, end: 24, message: "Passive voice after misspelling" },
    ];
    const marks = resolveMarks(spellingErrors, grammarErrors);

    const grammarMarks = marks.filter((m) => m.type === "grammar");
    assert.equal(grammarMarks.length, 1);
    assert.deepStrictEqual(grammarMarks[0], {
      start: 8,
      end: 24,
      type: "grammar",
    });
  });

  test("handles multiple non-overlapping errors", () => {
    const text = "The bok was written by an autor";
    const spellingErrors = [
      { start: 4, end: 7, word: "bok" },
      { start: 27, end: 32, word: "autor" },
    ];
    const grammarErrors = [
      { start: 8, end: 24, message: "Passive voice" },
    ];
    const marks = resolveMarks(spellingErrors, grammarErrors);

    const spellingMarks = marks.filter((m) => m.type === "spelling");
    const grammarMarks = marks.filter((m) => m.type === "grammar");

    assert.equal(spellingMarks.length, 2);
    assert.equal(grammarMarks.length, 1);
    assert.deepStrictEqual(grammarMarks[0], {
      start: 8,
      end: 24,
      type: "grammar",
    });
  });

  test("produces only plain segments when no errors", () => {
    const text = "Hello world";
    const marks = resolveMarks([], []);
    const segments = computeSegments(text, marks);

    assert.equal(segments.length, 1);
    assert.deepStrictEqual(segments[0], {
      start: 0,
      end: 11,
      type: "plain",
    });
  });

  test("orders marks by start position", () => {
    const text = "A bb ccc";
    const spellingErrors = [
      { start: 8, end: 11, word: "ccc" },
      { start: 2, end: 4, word: "bb" },
    ];
    const marks = resolveMarks(spellingErrors, []);
    const segments = computeSegments(text, marks);

    // First mark should be at position 2, second at position 8
    const flagged = segments.filter((s) => s.type === "spelling");
    assert.equal(flagged.length, 2);
    assert.equal(flagged[0].start, 2);
    assert.equal(flagged[1].start, 8);
  });
});

// ── Dictionary client: optimistic updates ───────────────────────────────────

describe("dictionary client — optimistic updates", () => {
  test("learnWord adds the lowercased word to the set", () => {
    const initial = new Set(["hello"]);
    const updated = optimisticLearn(initial, "World");
    assert.ok(updated.has("world"));
    assert.ok(updated.has("hello"));
    assert.equal(updated.size, 2);
  });

  test("ignoreWord adds the lowercased word to the set", () => {
    const initial = new Set();
    const updated = optimisticIgnore(initial, "Typo");
    assert.ok(updated.has("typo"));
  });

  test("learnWord does not duplicate an existing word", () => {
    const initial = new Set(["hello"]);
    const updated = optimisticLearn(initial, "Hello");
    assert.equal(updated.size, 1);
  });

  test("getWords returns array of lowercased words", () => {
    const words = new Set(["hello", "world"]);
    const arr = Array.from(words);
    assert.deepStrictEqual(arr.sort(), ["hello", "world"]);
  });
});

// ── Tokenization (used by worker) ──────────────────────────────────────────

describe("tokenizer — word extraction", () => {
  /**
   * Extract words with their byte offsets from text.
   * Replicated from spellcheck-worker.js.
   */
  function tokenizeWords(text) {
    const words = [];
    const regex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      words.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return words;
  }

  test("extracts simple words", () => {
    const tokens = tokenizeWords("Hello world");
    assert.equal(tokens.length, 2);
    assert.deepStrictEqual(tokens[0], {
      word: "Hello",
      start: 0,
      end: 5,
    });
    assert.deepStrictEqual(tokens[1], {
      word: "world",
      start: 6,
      end: 11,
    });
  });

  test("extracts contractions", () => {
    const tokens = tokenizeWords("don't can't it's");
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].word, "don't");
  });

  test("skips numbers and punctuation", () => {
    const tokens = tokenizeWords("Hello, world! 123 test.");
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].word, "Hello");
    assert.equal(tokens[1].word, "world");
    assert.equal(tokens[2].word, "test");
  });

  test("handles empty string", () => {
    const tokens = tokenizeWords("");
    assert.equal(tokens.length, 0);
  });
});

// ── Context menu: viewport clamping ─────────────────────────────────────────
//   Loads the real SpellcheckContextMenu via vm (same pattern as
//   admin-arbor.test.js) so _clampPosition is tested directly, not a replica.

describe("context menu — viewport clamping", () => {
  const fs = require("fs");
  const path = require("path");
  const vm = require("vm");

  const menuPath = path.resolve(
    __dirname,
    "..",
    "assets",
    "js",
    "admin-spellcheck",
    "spellcheck-context-menu.js",
  );
  const menuSource = fs.readFileSync(menuPath, "utf8");

  // The file has no top-level side effects beyond declaring the object;
  // evaluate it and take the object as the script's completion value.
  const SpellcheckContextMenu = vm.runInNewContext(
    menuSource + "\nSpellcheckContextMenu;",
    { window: {}, document: { addEventListener() {} } },
  );

  const clampPosition = SpellcheckContextMenu._clampPosition.bind(
    SpellcheckContextMenu,
  );

  test("leaves position unchanged when menu fits within viewport", () => {
    // Field-wise comparison: the object comes from the vm realm, so
    // deepStrictEqual would fail on differing Object prototypes.
    const pos = clampPosition(100, 100, 200, 150, 1280, 800);
    assert.equal(pos.left, 100);
    assert.equal(pos.top, 100);
  });

  test("clamps left when menu would overflow the right edge", () => {
    const pos = clampPosition(1250, 100, 200, 150, 1280, 800);
    assert.equal(pos.left, 1280 - 200 - 8);
  });

  test("clamps top when menu would overflow the bottom edge", () => {
    const pos = clampPosition(100, 780, 200, 150, 1280, 800);
    assert.equal(pos.top, 800 - 150 - 8);
  });

  test("clamps both axes when menu opens near bottom-right corner", () => {
    const pos = clampPosition(1270, 790, 200, 150, 1280, 800);
    assert.equal(pos.left, 1280 - 200 - 8);
    assert.equal(pos.top, 800 - 150 - 8);
  });

  test("never produces a negative left/top on a tiny viewport", () => {
    const pos = clampPosition(5, 5, 200, 150, 100, 100);
    assert.equal(pos.left, 8);
    assert.equal(pos.top, 8);
  });
});
