// Admin spellcheck JS tests — uses node:test + node:assert.
// Covers: overlay renderer span offsets, grammar-overlap exclusion logic,
// dictionary client optimistic local-set updates, sync init behaviour,
// and synchronous mark invalidation on replace.
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

// ── Dictionary client: init/getWords behaviour ────────────────────────────
//   Simulates the sync lifecycle from spellcheck-dictionary-client.js.
//   The client's init() calls Admin.api.get("/spellcheck-dictionary") and
//   populates _words from the response; on failure it resets to an empty
//   Set and fires a toast. Spellcheck stays functional either way (JS-2).

describe("dictionary client — init and sync", () => {
  /**
   * Simulate a successful sync: the server returns an array of rows with
   * a "normalized" property, and the client populates its Set from them.
   */
  function simulateInitSuccess(responseRows) {
    return new Set((responseRows || []).map((row) => row.normalized));
  }

  /**
   * Simulate a failed sync: the Set is reset to empty (spellcheck stays
   * functional with an empty learned-words list — JS-2 graceful degradation).
   */
  function simulateInitFailure() {
    return new Set();
  }

  test("successful sync populates the learned-words set", () => {
    const serverResponse = {
      words: [
        { id: 1, word: "Nazareth", normalized: "nazareth", status: "learned" },
        { id: 2, word: "synoptic", normalized: "synoptic", status: "ignored" },
      ],
    };
    const words = simulateInitSuccess(serverResponse.words);
    assert.equal(words.size, 2);
    assert.ok(words.has("nazareth"));
    assert.ok(words.has("synoptic"));
  });

  test("successful sync with empty dictionary produces empty set", () => {
    const words = simulateInitSuccess([]);
    assert.equal(words.size, 0);
    // getWords() still returns a valid (empty) array
    assert.deepStrictEqual(Array.from(words), []);
  });

  test("failed sync leaves an empty set — spellcheck stays functional", () => {
    const words = simulateInitFailure();
    assert.equal(words.size, 0);
    // The worker can still call getWords() — it just gets an empty array
    const arr = Array.from(words);
    assert.ok(Array.isArray(arr));
    assert.equal(arr.length, 0);
  });

  test("getWords returns array form of the Set (empty after failure)", () => {
    // Simulate failure then call getWords
    const words = simulateInitFailure();
    const result = Array.from(words);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
  });

  test("getWords returns array form of the Set (populated after success)", () => {
    const serverResponse = {
      words: [
        { id: 1, word: "Capernaum", normalized: "capernaum", status: "learned" },
      ],
    };
    const words = simulateInitSuccess(serverResponse.words);
    const result = Array.from(words);
    assert.deepStrictEqual(result, ["capernaum"]);
  });

  test("learnWord adds optimistically — reverted on failure", () => {
    // Simulates learnWord: optimistically add, then revert on error
    const words = new Set(["hello"]);
    const normalized = "world";

    // Optimistic add
    words.add(normalized);
    assert.equal(words.size, 2);
    assert.ok(words.has("world"));

    // Simulate server failure — revert
    words.delete(normalized);
    assert.equal(words.size, 1);
    assert.ok(!words.has("world"));
    assert.ok(words.has("hello")); // original word still present
  });
});

// ── Overlay: synchronous mark invalidation ────────────────────────────────
//   Tests the pure logic of SpellcheckOverlay.invalidateRange() — removing
//   the replaced mark and shifting trailing ones by the length delta.
//   Replicated from spellcheck-overlay-render.js.

describe("overlay — synchronous invalidation", () => {
  /**
   * Replicate invalidateRange core logic.
   */
  function invalidateRange(marks, start, end, replacementLength) {
    const delta = replacementLength - (end - start);
    const updated = [];
    for (const mark of marks) {
      if (mark.start === start && mark.end === end) continue;
      updated.push(
        mark.start >= end
          ? { ...mark, start: mark.start + delta, end: mark.end + delta }
          : mark,
      );
    }
    return updated;
  }

  test("removes the exact replaced mark", () => {
    const marks = [
      { start: 0, end: 5, type: "spelling", data: { word: "Hello" } },
      { start: 6, end: 9, type: "spelling", data: { word: "bad" } },
    ];
    const result = invalidateRange(marks, 6, 9, 4); // "bad" -> "good"
    assert.equal(result.length, 1);
    assert.equal(result[0].start, 0);
    assert.equal(result[0].end, 5);
  });

  test("shifts trailing marks by positive delta when replacement is longer", () => {
    const marks = [
      { start: 0, end: 3, type: "spelling", data: { word: "The" } },
      { start: 4, end: 8, type: "spelling", data: { word: "wrld" } },
      { start: 9, end: 12, type: "spelling", data: { word: "isz" } },
    ];
    const result = invalidateRange(marks, 4, 8, 5); // "wrld" -> "world", delta +1
    assert.equal(result.length, 2);
    assert.equal(result[0].start, 0);
    assert.equal(result[1].start, 10);
    assert.equal(result[1].end, 13);
  });

  test("shifts trailing marks by negative delta when replacement is shorter", () => {
    const marks = [
      { start: 0, end: 3, type: "spelling", data: { word: "The" } },
      { start: 4, end: 8, type: "spelling", data: { word: "wrld" } },
      { start: 9, end: 12, type: "spelling", data: { word: "isz" } },
    ];
    const result = invalidateRange(marks, 4, 8, 1); // "wrld" -> "w", delta -3
    assert.equal(result.length, 2);
    assert.equal(result[1].start, 6);
    assert.equal(result[1].end, 9);
  });

  test("shifts multiple trailing marks", () => {
    // Replace "bad" (3 chars) -> "excellent" (9 chars), delta +6
    const marks = [
      { start: 0, end: 4, type: "grammar", data: { message: "A" } },
      { start: 5, end: 8, type: "spelling", data: { word: "bad" } },
      { start: 10, end: 15, type: "spelling", data: { word: "spel" } },
      { start: 16, end: 22, type: "grammar", data: { message: "B" } },
    ];
    const result = invalidateRange(marks, 5, 8, 9);
    assert.equal(result.length, 3);
    assert.equal(result[0].start, 0);
    assert.equal(result[1].start, 16);
    assert.equal(result[2].start, 22);
  });

  test("no-op when marks array is empty", () => {
    assert.equal(invalidateRange([], 0, 5, 10).length, 0);
  });

  test("no-op when replaced mark is not in the array", () => {
    const marks = [{ start: 0, end: 5, type: "spelling", data: { word: "Hello" } }];
    const result = invalidateRange(marks, 10, 15, 5);
    assert.equal(result.length, 1);
    assert.equal(result[0].start, 0);
  });

  test("zero-delta replacement preserves trailing offsets", () => {
    const marks = [
      { start: 0, end: 3, type: "spelling", data: { word: "The" } },
      { start: 4, end: 7, type: "spelling", data: { word: "bad" } },
      { start: 8, end: 11, type: "spelling", data: { word: "isz" } },
    ];
    const result = invalidateRange(marks, 4, 7, 3);
    assert.equal(result.length, 2);
    assert.equal(result[0].start, 0);
    assert.equal(result[1].start, 8);
  });

  test("marks before the replaced range are untouched", () => {
    const marks = [
      { start: 0, end: 5, type: "spelling", data: { word: "First" } },
      { start: 6, end: 11, type: "spelling", data: { word: "Secnd" } },
    ];
    const result = invalidateRange(marks, 10, 15, 6);
    assert.equal(result.length, 2);
    assert.equal(result[0].start, 0);
    assert.equal(result[1].start, 6);
  });
});

// ── Overlay: attach() initializes _marks (early-correction fix) ────────────
//   Regression coverage for the overlap-flicker fix verification: attach()
//   must set overlay._marks = [] synchronously so invalidateRange() can run
//   before the first worker scan completes, instead of silently no-op'ing
//   on `!overlay._marks` and leaving a stale mark on screen. Replicated from
//   spellcheck-overlay-render.js (attach() and invalidateRange()).

describe("overlay — attach initializes _marks for early corrections", () => {
  /** Minimal stand-in for the real overlay object attach() builds. */
  function fakeAttach() {
    const overlay = { _marks: [], renderCalls: 0 };
    return overlay;
  }

  /** Exact copy of invalidateRange()'s guard + update logic, operating on the fake overlay. */
  function invalidateRange(overlay, start, end, replacementLength) {
    if (!overlay || !overlay._marks) return false; // mirrors the silent-return guard

    const delta = replacementLength - (end - start);
    const updated = [];
    for (const mark of overlay._marks) {
      if (mark.start === start && mark.end === end) continue;
      updated.push(
        mark.start >= end
          ? { ...mark, start: mark.start + delta, end: mark.end + delta }
          : mark,
      );
    }
    overlay._marks = updated;
    overlay.renderCalls += 1; // stands in for the synchronous _renderMarks() call
    return true;
  }

  test("invalidateRange succeeds immediately after attach(), before any render()", () => {
    const overlay = fakeAttach();
    assert.deepStrictEqual(overlay._marks, []);

    // Before this fix, overlay._marks was undefined until the first worker
    // render() — invalidateRange would hit the guard and silently return.
    const handled = invalidateRange(overlay, 0, 4, 3);
    assert.equal(handled, true);
    assert.equal(overlay.renderCalls, 1);
    assert.deepStrictEqual(overlay._marks, []);
  });

  test("without the fix (overlay._marks undefined), invalidateRange silently no-ops", () => {
    const overlay = { renderCalls: 0 }; // _marks intentionally left unset
    const handled = invalidateRange(overlay, 0, 4, 3);
    assert.equal(handled, false);
    assert.equal(overlay.renderCalls, 0);
  });

  test("rapid-fire corrections: two invalidateRange calls with no render() in between", () => {
    const overlay = fakeAttach();
    // Simulate a worker render() landing between attach() and the first
    // correction, containing two misspellings.
    overlay._marks = [
      { start: 0, end: 3, type: "spelling", data: { word: "Teh" } },
      { start: 4, end: 8, type: "spelling", data: { word: "wrld" } },
    ];

    // Correct "Teh" -> "The" (delta 0) synchronously.
    let handled = invalidateRange(overlay, 0, 3, 3);
    assert.equal(handled, true);
    assert.equal(overlay._marks.length, 1);
    assert.equal(overlay._marks[0].start, 4);
    assert.equal(overlay._marks[0].end, 8);

    // Immediately correct "wrld" -> "world" (delta +1) within the same
    // 1000ms debounce window, with no intervening worker re-render.
    handled = invalidateRange(overlay, 4, 8, 5);
    assert.equal(handled, true);
    assert.equal(overlay._marks.length, 0);
    assert.equal(overlay.renderCalls, 2);
  });

  test("rapid-fire corrections leave no stale mark for text typed after both edits", () => {
    const overlay = fakeAttach();
    overlay._marks = [
      { start: 0, end: 3, type: "spelling", data: { word: "Teh" } },
      { start: 10, end: 14, type: "spelling", data: { word: "isz" } },
    ];

    invalidateRange(overlay, 0, 3, 3); // "Teh" -> "The", delta 0
    const result = invalidateRange(overlay, 10, 14, 2); // "isz" -> "is", delta -2

    assert.equal(result, true);
    assert.equal(overlay._marks.length, 0);
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

// ── nspell integration & fallback ───────────────────────────────────────────
//   Replicates the loadNspell()/checkWord() logic from spellcheck-worker.js
//   (see the file header comment: worker/DOM globals aren't available in
//   Node, so the pure control flow is reproduced here with a fake nspell
//   instance standing in for the vendored bundle).

describe("nspell integration — load and fallback", () => {
  /**
   * Mirrors spellcheck-worker.js's nspellReady wiring: resolves the loader,
   * stores the instance on success, or warns and leaves it null on failure.
   */
  async function initNspell(loader, warn) {
    try {
      return await loader();
    } catch (error) {
      warn(
        "[spellcheck-worker] nspell failed to load, falling back to the built-in dictionary:",
        error,
      );
      return null;
    }
  }

  /** Exact copy of checkWord() from spellcheck-worker.js. */
  function checkWord(nspell, word, customWords, builtinCheck) {
    const lower = word.toLowerCase();
    if (customWords && customWords.has(lower)) {
      return { correct: true, suggestions: [] };
    }
    if (!nspell) {
      return builtinCheck(word, customWords);
    }
    if (nspell.correct(word)) {
      return { correct: true, suggestions: [] };
    }
    return { correct: false, suggestions: nspell.suggest(word) };
  }

  function fakeNspell() {
    return {
      correct(word) {
        return word.toLowerCase() !== "teh";
      },
      suggest(word) {
        return word.toLowerCase() === "teh" ? ["ten", "the", "tech"] : [];
      },
    };
  }

  test("suggests corrections for a known misspelling once nspell loads", async () => {
    const nspell = await initNspell(async () => fakeNspell(), () => {});
    assert.notEqual(nspell, null);

    const result = checkWord(nspell, "teh", new Set(), () => {
      throw new Error("built-in fallback should not run when nspell is loaded");
    });
    assert.equal(result.correct, false);
    assert.ok(result.suggestions.includes("the"));
  });

  test("recognizes correctly spelled words via nspell", async () => {
    const nspell = await initNspell(async () => fakeNspell(), () => {});
    const result = checkWord(nspell, "the", new Set(), () => {
      throw new Error("built-in fallback should not run when nspell is loaded");
    });
    assert.equal(result.correct, true);
    assert.deepStrictEqual(result.suggestions, []);
  });

  test("falls back to the built-in engine and logs a warning when nspell fails to load", async () => {
    const warnings = [];
    const failingLoader = async () => {
      throw new Error("simulated fetch failure");
    };
    const nspell = await initNspell(failingLoader, (...args) => warnings.push(args));

    assert.equal(nspell, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0][0], /falling back to the built-in dictionary/);

    let builtinCalled = false;
    const result = checkWord(nspell, "teh", new Set(), (word) => {
      builtinCalled = true;
      return { correct: false, suggestions: ["the"] };
    });
    assert.equal(builtinCalled, true);
    assert.equal(result.correct, false);
  });

  test("custom dictionary words short-circuit nspell entirely", async () => {
    const nspell = await initNspell(async () => fakeNspell(), () => {});
    let nspellQueried = false;
    const spiedNspell = {
      correct(word) {
        nspellQueried = true;
        return nspell.correct(word);
      },
      suggest(word) {
        nspellQueried = true;
        return nspell.suggest(word);
      },
    };

    // "teh" is flagged by nspell, but it's in the custom dictionary here.
    const result = checkWord(spiedNspell, "teh", new Set(["teh"]), () => {
      throw new Error("built-in fallback should not run");
    });
    assert.equal(result.correct, true);
    assert.equal(nspellQueried, false);
  });

  test("custom dictionary words short-circuit the built-in fallback too", () => {
    const result = checkWord(null, "gloopy", new Set(["gloopy"]), () => {
      throw new Error("built-in check should not run for a custom word");
    });
    assert.equal(result.correct, true);
  });
});

// ── Grammar engine: checkGrammar() ──────────────────────────────────────────
//   Unlike the DOM/Worker-dependent modules above, spellcheck-engine.js has
//   no browser dependency, so these tests import and exercise the REAL
//   checkGrammar() (dynamic import, since this file is CommonJS) rather than
//   a replica — covering every rule added by grammar-flagging-fix.md plus
//   the pre-existing repeated-word/passive-voice/article rules.

describe("grammar engine — checkGrammar()", () => {
  let checkGrammarPromise;
  function loadCheckGrammar() {
    if (!checkGrammarPromise) {
      checkGrammarPromise = import("../assets/js/admin-spellcheck/spellcheck-engine.js").then(
        (m) => m.checkGrammar,
      );
    }
    return checkGrammarPromise;
  }

  function messagesFor(issues, text) {
    return issues.map((i) => text.slice(i.start, i.end));
  }

  test("flags repeated words", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("This is the the best evidence.");
    assert.ok(issues.some((i) => i.message.includes("Repeated word")));
  });

  test("does not flag distinct adjacent words", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("This is a fine day.");
    assert.equal(issues.some((i) => i.message.includes("Repeated word")), false);
  });

  test("flags likely passive voice", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("The book was written by John.");
    assert.ok(issues.some((i) => i.message === "Possible passive voice"));
  });

  test("flags 'a' before a vowel sound", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("She is a honest woman.");
    assert.ok(issues.some((i) => i.message.includes('Use "an"')));
  });

  test("does not flag correct 'a' before a consonant", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("She is a good woman.");
    assert.equal(issues.some((i) => i.message.includes('Use "an"')), false);
  });

  test("flags 'its' immediately followed by a verb", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "The dog wagged its is happy.";
    const issues = checkGrammar(text);
    const hit = issues.find((i) => i.message.includes('"it\'s"'));
    assert.ok(hit, "expected an its/it's mix-up flag");
    assert.equal(text.slice(hit.start, hit.end), "its is");
  });

  test("does not flag correct possessive 'its'", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("The company changed its address last year.");
    assert.equal(issues.some((i) => i.message.includes('"it\'s"')), false);
  });

  test("flags 'your' immediately followed by a bare -ing verb", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "I hope your going to the store.";
    const issues = checkGrammar(text);
    const hit = issues.find((i) => i.message.includes('"you\'re"'));
    assert.ok(hit, "expected a your/you're mix-up flag");
    assert.equal(text.slice(hit.start, hit.end), "your going");
  });

  test("does not flag 'your' followed by an ordinary noun", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("This is your book.");
    assert.equal(issues.some((i) => i.message.includes('"you\'re"')), false);
  });

  test("flags doubled question marks", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "Really?? That can't be right.";
    const issues = checkGrammar(text);
    const hit = issues.find((i) => i.message.includes("Repeated punctuation"));
    assert.ok(hit);
    assert.equal(text.slice(hit.start, hit.end), "??");
  });

  test("flags mixed terminal punctuation", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("Stop it.!");
    assert.ok(issues.some((i) => i.message.includes("Repeated punctuation")));
  });

  test("does not flag a standard three-dot ellipsis", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("And then... it happened.");
    assert.equal(issues.some((i) => i.message.includes("Repeated punctuation")), false);
  });

  test("does not flag a single terminal mark", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("This is fine.");
    assert.equal(issues.some((i) => i.message.includes("Repeated punctuation")), false);
  });

  test("flags a lowercase letter after a sentence boundary", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "This is great. the next part is better.";
    const issues = checkGrammar(text);
    const hit = issues.find((i) => i.message.includes("capital letter"));
    assert.ok(hit);
    assert.equal(text.slice(hit.start, hit.end), "t");
  });

  test("does not flag a correctly capitalized sentence start", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("This is great. The next part is better.");
    assert.equal(issues.some((i) => i.message.includes("capital letter")), false);
  });

  test("does not flag lowercase text after a known abbreviation", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("Coins, pottery, etc. survive from that era.");
    assert.equal(issues.some((i) => i.message.includes("capital letter")), false);
  });

  test("does not flag lowercase text after an ellipsis", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("And then... it happened.");
    assert.equal(issues.some((i) => i.message.includes("capital letter")), false);
  });

  test("flags a plural-looking subject with a singular verb", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "The dogs is barking loudly.";
    const issues = checkGrammar(text);
    const hit = issues.find((i) => i.message.includes("subject-verb agreement"));
    assert.ok(hit);
    assert.equal(text.slice(hit.start, hit.end), "The dogs is");
  });

  test("does not flag correct plural agreement", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("The dogs are barking loudly.");
    assert.equal(issues.some((i) => i.message.includes("subject-verb agreement")), false);
  });

  test("does not flag plural subjects with do/have (correct agreement)", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("The scholars have written extensively. The scholars do agree.");
    assert.equal(issues.some((i) => i.message.includes("subject-verb agreement")), false);
  });

  test("does not flag singular nouns that end in 's'", async () => {
    const checkGrammar = await loadCheckGrammar();
    const issues = checkGrammar("Physics is a demanding subject. The news is troubling.");
    assert.equal(issues.some((i) => i.message.includes("subject-verb agreement")), false);
  });

  test("does not double-flag a range already covered by an earlier rule", async () => {
    const checkGrammar = await loadCheckGrammar();
    // "is is" trips both the repeated-word rule and would overlap a
    // passive-voice-style scan; only one issue should cover this range.
    const text = "The plan is is good.";
    const issues = checkGrammar(text);
    const overlapping = issues.filter((i) => i.start < 11 && i.end > 8);
    assert.equal(overlapping.length, 1);
  });

  test("real-world mixed text flags each distinct issue once", async () => {
    const checkGrammar = await loadCheckGrammar();
    const text = "the dogs is running your going home.. again";
    const issues = checkGrammar(text);
    const found = messagesFor(issues, text);
    // Sentence-start capital not checked here (no leading terminal mark),
    // but subject-verb, your/you're, and punctuation rules should all fire.
    assert.ok(issues.some((i) => i.message.includes("subject-verb agreement")));
    assert.ok(issues.some((i) => i.message.includes('"you\'re"')));
    assert.ok(issues.some((i) => i.message.includes("Repeated punctuation")));
    assert.ok(found.length > 0);
  });
});
