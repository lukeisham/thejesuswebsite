/**
 * Dictionary sync client — fetches the global dictionary once per admin page
 * load and exposes learnWord / ignoreWord for persisting user decisions.
 *
 * All API calls go through Admin.api.* wrappers (JS-5: async/await, no raw fetch).
 * The local in-memory Set is updated optimistically before the server confirms
 * so the worker's next run immediately picks up the change.
 */

const SpellcheckDictionary = {
  /** @type {Set<string>} lowercased words */
  _words: new Set(),

  /**
   * Initialize by fetching the global dictionary from the server.
   * Must be called once per page load before the worker starts.
   * @returns {Promise<void>}
   */
  async init() {
    try {
      const data = await Admin.api.get("/spellcheck-dictionary");
      this._words = new Set(
        (data.words || []).map((row) => row.normalized),
      );
    } catch (err) {
      // Spellcheck stays functional with an empty local dictionary (JS-2),
      // but the failure must be surfaced rather than silently swallowed —
      // otherwise learned/ignored words silently stop being recognised.
      console.error("Spellcheck dictionary sync failed:", err.message);
      if (typeof window.showToast === "function") {
        window.showToast(
          "Could not load the spellcheck dictionary. Learned words may be flagged again.",
          "error",
        );
      }
      this._words = new Set();
    }
  },

  /**
   * Get all dictionary words as an array of lowercased strings (for the worker).
   * @returns {string[]}
   */
  getWords() {
    return Array.from(this._words);
  },

  /**
   * Learn a word permanently (persists across reloads).
   * Updates the local set optimistically.
   * @param {string} word
   * @returns {Promise<void>}
   */
  async learnWord(word) {
    const normalized = word.toLowerCase();
    this._words.add(normalized);
    try {
      await Admin.api.post("/spellcheck-dictionary", {
        word: word,
        status: "learned",
      });
    } catch (err) {
      // Revert on failure (JS-2: predictable state)
      this._words.delete(normalized);
      throw err;
    }
  },

  /**
   * Ignore a word for the current session only.
   * Adds to local set (same effect as learnWord for the checker) but the
   * server-side status is "ignored" so the admin UI can distinguish them later.
   * @param {string} word
   * @returns {Promise<void>}
   */
  async ignoreWord(word) {
    const normalized = word.toLowerCase();
    this._words.add(normalized);
    try {
      await Admin.api.post("/spellcheck-dictionary", {
        word: word,
        status: "ignored",
      });
    } catch (err) {
      this._words.delete(normalized);
      throw err;
    }
  },
};
