/**
 * Spellcheck controller — the main orchestrator that ties together the worker,
 * overlay, dictionary client, and context menu. Each textarea on the page can
 * be independently attached.
 *
 * Debounces input by ~1 second (SR-3: never blocks typing), sends text +
 * current dictionary words to the Web Worker, and renders the results via the
 * overlay renderer.
 *
 * Usage:
 *   await SpellcheckController.init();   // once per page load
 *   SpellcheckController.attach(document.getElementById("blog-content"));
 */

const SpellcheckController = {
  /** @type {Worker|null} */
  _worker: null,
  /** @type {Map<HTMLTextAreaElement, number>} timer IDs for debounce */
  _timers: new Map(),
  /** @type {boolean} */
  _initialized: false,

  /**
   * Initialize the spellcheck system: sync the dictionary and start the worker.
   * Must be called once per page load before attach().
   * @returns {Promise<void>}
   */
  async init() {
    if (this._initialized) return;

    // Sync the global learned/ignored dictionary from the server
    await SpellcheckDictionary.init();

    // Start the Web Worker
    this._worker = new Worker(
      "../assets/js/admin-spellcheck/spellcheck-worker.js",
      { type: "module" },
    );

    this._worker.onmessage = (e) => {
      const { spellingErrors, grammarErrors } = e.data;
      // Find which textarea this result is for (stored on the last request)
      const textarea = this._worker._pendingTextarea;
      if (textarea && textarea._spellcheckOverlay) {
        SpellcheckOverlay.render(textarea, spellingErrors, grammarErrors);
      }
    };

    // Initialize the context menu
    SpellcheckContextMenu.init();

    this._initialized = true;
  },

  /**
   * Attach spellcheck to a textarea. Sets up the overlay and input listener.
   * @param {HTMLTextAreaElement} textarea
   */
  attach(textarea) {
    if (!this._initialized) {
      console.warn(
        "SpellcheckController.init() must be called before attach().",
      );
      return;
    }

    // Set up the overlay
    SpellcheckOverlay.attach(textarea);

    // Debounced input handler
    textarea.addEventListener("input", () => {
      this._scheduleScan(textarea);
    });

    // Run an initial scan if the textarea already has content
    if (textarea.value) {
      this._scheduleScan(textarea, 0);
    }
  },

  /**
   * Schedule a spellcheck scan after a debounce delay.
   * @param {HTMLTextAreaElement} textarea
   * @param {number} [delay=1000]
   */
  _scheduleScan(textarea, delay = 1000) {
    // Clear any existing timer for this textarea
    const existing = this._timers.get(textarea);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this._timers.delete(textarea);
      this._scan(textarea);
    }, delay);

    this._timers.set(textarea, timer);
  },

  /**
   * Run a spellcheck scan now — sends text + dictionary to the worker.
   * @param {HTMLTextAreaElement} textarea
   */
  _scan(textarea) {
    if (!this._worker) return;

    const text = textarea.value;
    if (!text.trim()) {
      SpellcheckOverlay.clear(textarea);
      return;
    }

    // Store the textarea reference so the worker's onmessage knows where
    // to render results
    this._worker._pendingTextarea = textarea;

    this._worker.postMessage({
      text: text,
      dictionaryWords: SpellcheckDictionary.getWords(),
    });
  },
};
