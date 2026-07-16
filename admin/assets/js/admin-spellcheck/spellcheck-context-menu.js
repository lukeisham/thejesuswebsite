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
   * @param {MouseEvent} e
   */
  _onContextMenu(e) {
    const target = e.target;
    if (
      !target.classList.contains("admin-spellcheck-mark") ||
      !target.dataset.spellcheckType
    ) {
      // Not a flagged span — allow the default browser context menu.
      return;
    }

    e.preventDefault();
    this._show(target, e.clientX, e.clientY);
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
        }
        this._remove();
      });
      items.push(learnBtn);
    }

    for (const item of items) {
      menu.appendChild(item);
    }

    // Position the menu, keeping it within the viewport
    menu.style.left = Math.min(x, window.innerWidth - 290) + "px";
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 10) + "px";

    document.body.appendChild(menu);
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
