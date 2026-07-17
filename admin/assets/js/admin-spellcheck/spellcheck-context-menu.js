/**
 * Spellcheck context menu — single document-level `contextmenu` listener
 * (event delegation, JS-6) that shows a custom menu when the user right-clicks
 * a flagged span in an active spellcheck overlay.
 *
 * Keyboard-operable (HTML-5): Escape closes, arrow keys navigate options.
 * Dismissed on outside click (JS-6: clean removal).
 */

const SpellcheckContextMenu = {
  /** @type {HTMLElement|null} */
  _menu: null,
  /** @type {number} */
  _activeIndex: -1,
  /** @type {HTMLElement[]} */
  _items: [],

  /**
   * Initialize the document-level listener.
   * Call once per page load.
   */
  init() {
    document.addEventListener("contextmenu", this._onContextMenu.bind(this));
    document.addEventListener("click", this._onOutsideClick.bind(this));
    document.addEventListener("keydown", this._onKeyDown.bind(this));
  },

  /**
   * Handle the contextmenu event.
   *
   * The overlay (and its marks) are pointer-events:none so the textarea keeps
   * native caret placement and drag-selection. That means right-clicks land
   * on the textarea itself — so we hit-test the click coordinates against the
   * overlay's mark rects to find the flagged word under the cursor.
   * @param {MouseEvent} e
   */
  _onContextMenu(e) {
    const target = e.target;
    const overlay = target._spellcheckOverlay;
    if (!overlay) {
      // Not a spellchecked textarea — allow the default browser context menu.
      return;
    }

    const mark = this._findMarkAt(overlay, e.clientX, e.clientY);
    if (!mark) return;

    e.preventDefault();
    this._show(mark, e.clientX, e.clientY);
  },

  /**
   * Find the flagged mark span whose rendered rect contains the given
   * viewport point. Uses getClientRects() because a mark that wraps across
   * lines has multiple boxes.
   * @param {HTMLElement} overlay
   * @param {number} x - viewport (client) x
   * @param {number} y - viewport (client) y
   * @returns {HTMLElement|null}
   */
  _findMarkAt(overlay, x, y) {
    const marks = overlay.querySelectorAll(".admin-spellcheck-mark");
    for (const mark of marks) {
      if (!mark.dataset.spellcheckType) continue;
      for (const rect of mark.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return mark;
        }
      }
    }
    return null;
  },

  /**
   * Build and show the context menu at the given position.
   * @param {HTMLElement} flaggedSpan
   * @param {number} x
   * @param {number} y
   */
  _show(flaggedSpan, x, y) {
    this._remove();

    const type = flaggedSpan.dataset.spellcheckType;
    const textarea = flaggedSpan.closest("div")?._textarea;
    if (!textarea) return;

    const menu = document.createElement("div");
    menu.className = "admin-spellcheck-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Spellcheck options");

    const items = [];

    if (type === "spelling") {
      const suggestions = (flaggedSpan.dataset.spellcheckSuggestions || "")
        .split("\n")
        .filter(Boolean);

      if (suggestions.length > 0) {
        for (const suggestion of suggestions) {
          const btn = this._makeItem(suggestion, "admin-spellcheck-menu__item--suggestion", () => {
            // Replace the word in the textarea
            const start = parseInt(flaggedSpan.dataset.spellcheckStart, 10);
            const end = parseInt(flaggedSpan.dataset.spellcheckEnd, 10);
            const before = textarea.value.slice(0, start);
            const after = textarea.value.slice(end);
            textarea.value = before + suggestion + after;
            // Restore cursor position
            const newPos = start + suggestion.length;
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
            // Trigger a new scan
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            this._remove();
          });
          items.push(btn);
        }

        // Separator
        const sep = document.createElement("div");
        sep.className = "admin-spellcheck-menu__separator";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
      }
    }

    // Ignore action
    const ignoreBtn = this._makeItem("Ignore", "admin-spellcheck-menu__item--action", async () => {
      const word = flaggedSpan.dataset.spellcheckWord || textarea.value.slice(
        parseInt(flaggedSpan.dataset.spellcheckStart, 10),
        parseInt(flaggedSpan.dataset.spellcheckEnd, 10),
      );
      try {
        await SpellcheckDictionary.ignoreWord(word);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (err) {
        console.warn("Failed to ignore word:", err.message);
        if (typeof window.showToast === "function") {
          window.showToast("Failed to ignore word.", "error");
        }
      }
      this._remove();
    });
    items.push(ignoreBtn);

    // Learn action (only for spelling)
    if (type === "spelling") {
      const learnBtn = this._makeItem("Learn word", "admin-spellcheck-menu__item--action", async () => {
        const word = flaggedSpan.dataset.spellcheckWord;
        try {
          await SpellcheckDictionary.learnWord(word);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (err) {
          console.warn("Failed to learn word:", err.message);
          if (typeof window.showToast === "function") {
            window.showToast("Failed to learn word.", "error");
          }
        }
        this._remove();
      });
      items.push(learnBtn);
    }

    for (const item of items) {
      menu.appendChild(item);
    }

    // Append off-screen first so we can measure real dimensions before
    // clamping (offsetWidth/Height are 0 until the element is in the DOM).
    menu.style.visibility = "hidden";
    document.body.appendChild(menu);

    const pos = SpellcheckContextMenu._clampPosition(
      x,
      y,
      menu.offsetWidth,
      menu.offsetHeight,
      window.innerWidth,
      window.innerHeight,
    );
    menu.style.left = pos.left + "px";
    menu.style.top = pos.top + "px";
    menu.style.visibility = "";

    this._menu = menu;
    this._items = items;
    this._activeIndex = -1;

    // Focus first item for keyboard navigation
    if (items.length > 0) {
      this._activeIndex = 0;
      items[0].focus();
    }
  },

  /**
   * Pure function: clamp a menu's top-left position so it stays fully
   * within the viewport (no overflow on right/bottom, and never negative).
   * @param {number} x - desired left (cursor position)
   * @param {number} y - desired top (cursor position)
   * @param {number} menuWidth
   * @param {number} menuHeight
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @returns {{left: number, top: number}}
   */
  _clampPosition(x, y, menuWidth, menuHeight, viewportWidth, viewportHeight) {
    const margin = 8;
    let left = x;
    let top = y;

    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - margin;
    }
    if (top + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - margin;
    }
    if (left < 0) left = margin;
    if (top < 0) top = margin;

    return { left, top };
  },

  /**
   * Create a single menu item button.
   * @param {string} label
   * @param {string} extraClass
   * @param {Function} onClick
   * @returns {HTMLButtonElement}
   */
  _makeItem(label, extraClass, onClick) {
    const btn = document.createElement("button");
    btn.className = "admin-spellcheck-menu__item " + extraClass;
    btn.setAttribute("role", "menuitem");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => {
      this._activeIndex = this._items.indexOf(btn);
      btn.focus();
    });
    return btn;
  },

  /**
   * Dismiss on outside click.
   * @param {MouseEvent} e
   */
  _onOutsideClick(e) {
    if (this._menu && !this._menu.contains(e.target)) {
      this._remove();
    }
  },

  /**
   * Keyboard navigation: Escape closes, arrows move focus.
   * @param {KeyboardEvent} e
   */
  _onKeyDown(e) {
    if (!this._menu) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        this._remove();
        break;
      case "ArrowDown":
        e.preventDefault();
        this._activeIndex = Math.min(
          this._activeIndex + 1,
          this._items.length - 1,
        );
        this._items[this._activeIndex]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        this._activeIndex = Math.max(this._activeIndex - 1, 0);
        this._items[this._activeIndex]?.focus();
        break;
    }
  },

  /**
   * Remove the current menu from the DOM.
   */
  _remove() {
    if (this._menu) {
      this._menu.remove();
      this._menu = null;
      this._items = [];
      this._activeIndex = -1;
    }
  },
};
