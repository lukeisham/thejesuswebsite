/**
 * Spellcheck Web Worker — runs spelling and grammar checks off the main thread
 * so typing responsiveness is never blocked (SR-3).
 *
 * Receives:  { text, dictionaryWords }
 * Posts back: { spellingErrors: [{start, end, word, suggestions}], grammarErrors: [{start, end, message}] }
 *
 * The spelling pass runs first. Grammar checks only run against text substrings
 * not already covered by a spelling-flagged range, implementing the ordering
 * guarantee described in the plan.
 *
 * Spelling uses the vendored nspell + Hunspell dictionary-en (~170k
 * recognized word forms) when available, falling back to the built-in
 * ~5,000-word `check()` from spellcheck-engine.js if the vendor bundle or
 * dictionary files fail to load (JS-2: never fail silently — a warning is
 * logged either way).
 */

import { check, checkGrammar } from "./spellcheck-engine.js";
import Nspell from "../vendor/spellcheck/nspell.js";

const DICTIONARY_AFF_URL = new URL(
  "../vendor/spellcheck/dictionary-en.aff",
  import.meta.url,
);
const DICTIONARY_DIC_URL = new URL(
  "../vendor/spellcheck/dictionary-en.dic",
  import.meta.url,
);

/** @type {import("nspell")|null} resolved once init completes; null means "use the fallback" */
let nspellInstance = null;

/**
 * Fetch the Hunspell affix/dictionary files and construct an nspell instance.
 * @returns {Promise<import("nspell")>}
 */
async function loadNspell() {
  const [affResponse, dicResponse] = await Promise.all([
    fetch(DICTIONARY_AFF_URL),
    fetch(DICTIONARY_DIC_URL),
  ]);
  if (!affResponse.ok || !dicResponse.ok) {
    throw new Error(
      `Dictionary fetch failed: aff=${affResponse.status} dic=${dicResponse.status}`,
    );
  }
  const [aff, dic] = await Promise.all([
    affResponse.text(),
    dicResponse.text(),
  ]);
  return Nspell(aff, dic);
}

/** Resolves once nspell has either loaded or failed (leaving the fallback in place). */
const nspellReady = loadNspell()
  .then((instance) => {
    nspellInstance = instance;
  })
  .catch((error) => {
    console.warn(
      "[spellcheck-worker] nspell failed to load, falling back to the built-in dictionary:",
      error,
    );
  });

/**
 * Check a single word's spelling using nspell when it's loaded, or the
 * built-in engine otherwise. Custom (learned/ignored) words always
 * short-circuit both.
 * @param {import("nspell")|null} nspell
 * @param {string} word
 * @param {Set<string>} customWords
 * @returns {{ correct: boolean, suggestions: string[] }}
 */
function checkWord(nspell, word, customWords) {
  const lower = word.toLowerCase();
  if (customWords && customWords.has(lower)) {
    return { correct: true, suggestions: [] };
  }
  if (!nspell) {
    return check(word, customWords);
  }
  if (nspell.correct(word)) {
    return { correct: true, suggestions: [] };
  }
  return { correct: false, suggestions: nspell.suggest(word) };
}

/**
 * Extract individual words with their byte offsets from text.
 * @param {string} text
 * @returns {{ word: string, start: number, end: number }[]}
 */
function tokenizeWords(text) {
  const words = [];
  const regex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.push({ word: match[0], start: match.index, end: match.index + match[0].length });
  }
  return words;
}

/**
 * Check if a range overlaps with any range in the given list.
 * @param {number} start
 * @param {number} end
 * @param {{ start: number, end: number }[]} ranges
 * @returns {boolean}
 */
function overlapsAny(start, end, ranges) {
  for (const r of ranges) {
    if (start < r.end && end > r.start) return true;
  }
  return false;
}

self.onmessage = async function (e) {
  const { text, dictionaryWords } = e.data;
  const customWords = new Set((dictionaryWords || []).map((w) => w.toLowerCase()));

  // Wait for nspell to finish loading (or fail) before the first scan so
  // early keystrokes aren't checked against a dictionary that's about to
  // become available a moment later.
  await nspellReady;

  // ── Spelling pass ────────────────────────────────────────────────────────
  const tokens = tokenizeWords(text);
  const spellingErrors = [];

  for (const token of tokens) {
    const result = checkWord(nspellInstance, token.word, customWords);
    if (!result.correct) {
      spellingErrors.push({
        start: token.start,
        end: token.end,
        word: token.word,
        suggestions: result.suggestions,
      });
    }
  }

  // ── Grammar pass (skip substrings already flagged by spelling) ───────────
  const allGrammar = checkGrammar(text);
  const grammarErrors = allGrammar.filter(
    (g) => !overlapsAny(g.start, g.end, spellingErrors),
  );

  self.postMessage({ spellingErrors, grammarErrors });
};
