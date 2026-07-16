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
 */

import { check, checkGrammar } from "./spellcheck-engine.js";

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

self.onmessage = function (e) {
  const { text, dictionaryWords } = e.data;
  const customWords = new Set((dictionaryWords || []).map((w) => w.toLowerCase()));

  // ── Spelling pass ────────────────────────────────────────────────────────
  const tokens = tokenizeWords(text);
  const spellingErrors = [];

  for (const token of tokens) {
    const result = check(token.word, customWords);
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
