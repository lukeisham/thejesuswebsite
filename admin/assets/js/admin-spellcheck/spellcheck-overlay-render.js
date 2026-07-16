/**
 * Spellcheck overlay renderer — builds and maintains a transparent overlay
 * `<div>` positioned absolutely over a `<textarea>`, with wavy-underline
 * `<span>` marks at the correct character offsets for spelling/grammar errors.
 *
 * The textarea remains the real accessible input; the overlay is decorative
 * (pointer-events: none on text content).
 */

const SpellcheckOverlay = {
  /**
   * Attach the overlay to a textarea. Sets up resize/scroll/input sync.
   * @param {HTMLTextAreaElement} textarea
   * @returns {HTMLElement} The overlay element (appended as a sibling).
   */
  attach(textarea) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.width = "100%";
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    const overlay = document.createElement("div");
    overlay.className = "admin-spellcheck-overlay";
    overlay.setAttribute("aria-hidden", "true");
    wrapper.appendChild(overlay);

    // Store references for later updates
    textarea._spellcheckWrapper = wrapper;
    textarea._spellcheckOverlay = overlay;
    overlay._textarea = textarea;

    // Sync overlay dimensions whenever the textarea might have changed
    const sync = () => SpellcheckOverlay._syncStyle(textarea, overlay);
    textarea.addEventListener("input", sync);
    textarea.addEventListener("scroll", () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    });
    window.addEventListener("resize", sync);

    // Initial sync
    sync();

    return overlay;
  },

  /**
   * Copy textarea computed styles to the overlay so text aligns perfectly.
   * @param {HTMLTextAreaElement} textarea
   * @param {HTMLElement} overlay
   */
  _syncStyle(textarea, overlay) {
    const cs = getComputedStyle(textarea);
    overlay.style.fontFamily = cs.fontFamily;
    overlay.style.fontSize = cs.fontSize;
    overlay.style.lineHeight = cs.lineHeight;
    overlay.style.padding = cs.padding;
    overlay.style.border = cs.border;
    overlay.style.width = cs.width;
    overlay.style.height = cs.height;
    overlay.style.boxSizing = cs.boxSizing;
    overlay.style.letterSpacing = cs.letterSpacing;
    overlay.style.wordSpacing = cs.wordSpacing;
    overlay.style.textIndent = cs.textIndent;
    overlay.style.tabSize = cs.tabSize;
  },

  /**
   * Render spelling and grammar error marks on the overlay.
   * @param {HTMLTextAreaElement} textarea
   * @param {{ start: number, end: number, word?: string, suggestions?: string[] }[]} spellingErrors
   * @param {{ start: number, end: number, message: string }[]} grammarErrors
   */
  render(textarea, spellingErrors, grammarErrors) {
    const overlay = textarea._spellcheckOverlay;
    if (!overlay) return;

    const text = textarea.value;

    // Build sorted list of all marked ranges with type info
    const marks = [];
    for (const e of spellingErrors) {
      marks.push({ start: e.start, end: e.end, type: "spelling", data: e });
    }
    for (const e of grammarErrors) {
      // Skip ranges already covered by spelling (ordering guarantee)
      const overlapsSpelling = spellingErrors.some(
        (s) => e.start < s.end && e.end > s.start,
      );
      if (!overlapsSpelling) {
        marks.push({ start: e.start, end: e.end, type: "grammar", data: e });
      }
    }
    marks.sort((a, b) => a.start - b.start);

    // Build overlay HTML using DOM (JS-6: no innerHTML with user text)
    overlay.textContent = "";

    let cursor = 0;
    for (const mark of marks) {
      if (mark.start < cursor) continue; // skip overlapping (shouldn't happen after sort+filter)

      // Plain text before this mark
      if (cursor < mark.start) {
        const plain = document.createElement("span");
        plain.className = "admin-spellcheck-plain";
        plain.textContent = text.slice(cursor, mark.start);
        overlay.appendChild(plain);
      }

      // Flagged span
      const flagged = document.createElement("span");
      flagged.className =
        "admin-spellcheck-mark admin-spellcheck-mark--" + mark.type;
      flagged.textContent = text.slice(mark.start, mark.end);
      flagged.dataset.spellcheckType = mark.type;
      if (mark.type === "spelling") {
        flagged.dataset.spellcheckWord = mark.data.word || "";
        flagged.dataset.spellcheckSuggestions = (mark.data.suggestions || []).join("\n");
        flagged.dataset.spellcheckStart = mark.start;
        flagged.dataset.spellcheckEnd = mark.end;
      } else {
        flagged.dataset.spellcheckMessage = mark.data.message || "";
        flagged.dataset.spellcheckStart = mark.start;
        flagged.dataset.spellcheckEnd = mark.end;
      }
      overlay.appendChild(flagged);

      cursor = mark.end;
    }

    // Remaining plain text after last mark
    if (cursor < text.length) {
      const plain = document.createElement("span");
      plain.className = "admin-spellcheck-plain";
      plain.textContent = text.slice(cursor);
      overlay.appendChild(plain);
    }
  },

  /**
   * Clear all marks from the overlay.
   * @param {HTMLTextAreaElement} textarea
   */
  clear(textarea) {
    const overlay = textarea._spellcheckOverlay;
    if (overlay) overlay.textContent = "";
  },
};
