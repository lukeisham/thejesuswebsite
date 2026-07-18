/**
 * Arbor edge action-menu module.
 *
 * Small reusable right-click popup for edge actions (Re-route, Delete).
 * Positions at a given screen point (clamped to the viewport), renders
 * role="menu" with supplied { label, danger } options, keyboard-navigable
 * (arrows/Enter/Esc), dismisses on click-away. Mirrors
 * admin-maps/maps-pin-menu.js.
 *
 * @module admin-arbor/arbor-edge-menu
 */

window.AdminArborEdgeMenu = {};

(function () {
  const EdgeMenu = window.AdminArborEdgeMenu;

  /** @type {HTMLElement|null} */
  var menuEl = null;

  /** @type {HTMLElement|null} */
  var backdropEl = null;

  /** @type {number}   Active item index for keyboard nav. */
  var activeIndex = 0;

  /** @type {function|null}  Resolve callback for the open Promise. */
  var resolvePromise = null;

  /* ── DOM bootstrap ──────────────────────────────────────────────────────────── */

  /**
   * Create the menu and backdrop in the DOM. Call once on page load.
   */
  EdgeMenu.init = function () {
    if (menuEl) return;

    backdropEl = document.createElement("div");
    backdropEl.className = "admin-arbor-edge-menu__backdrop";
    backdropEl.addEventListener("click", EdgeMenu.close);
    document.body.appendChild(backdropEl);

    menuEl = document.createElement("div");
    menuEl.className = "admin-arbor-edge-menu";
    menuEl.setAttribute("role", "menu");
    menuEl.setAttribute("aria-label", "Connection actions");
    document.body.appendChild(menuEl);

    menuEl.addEventListener("keydown", EdgeMenu.onKeyDown);

    document.addEventListener("keydown", function (e) {
      if (
        e.key === "Escape" &&
        menuEl &&
        menuEl.classList.contains("admin-arbor-edge-menu--open")
      ) {
        EdgeMenu.close();
      }
    });
  };

  /* ── Open / Close ───────────────────────────────────────────────────────────── */

  /**
   * Open the popup menu at a screen position with the given options and
   * return a Promise resolving to the selected option, or null if cancelled.
   *
   * @param {number} screenX
   * @param {number} screenY
   * @param {Array<{label: string, danger?: boolean}>} options
   * @returns {Promise<{label: string}|null>}
   */
  EdgeMenu.open = function (screenX, screenY, options) {
    return new Promise(function (resolve) {
      resolvePromise = resolve;
      activeIndex = 0;

      menuEl.innerHTML = "";

      for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var item = document.createElement("button");
        item.className = "admin-arbor-edge-menu__item";
        if (opt.danger) item.classList.add("admin-arbor-edge-menu__item--danger");
        item.setAttribute("role", "menuitem");
        item.type = "button";
        item.textContent = opt.label;

        item.addEventListener(
          "click",
          (function (o) {
            return function (e) {
              e.stopPropagation();
              EdgeMenu.choose(o);
            };
          })(opt),
        );

        menuEl.appendChild(item);
      }

      if (options.length === 0) {
        EdgeMenu.close();
        return;
      }

      var pos = clampMenuPosition(
        screenX,
        screenY,
        160,
        options.length * 36 + 16,
        window.innerWidth,
        window.innerHeight,
      );

      menuEl.style.left = pos.left + "px";
      menuEl.style.top = pos.top + "px";
      menuEl.classList.add("admin-arbor-edge-menu--open");

      if (backdropEl) {
        backdropEl.classList.add("admin-arbor-edge-menu__backdrop--open");
      }

      EdgeMenu.updateActive();

      setTimeout(function () {
        var items = menuEl.querySelectorAll('[role="menuitem"]');
        if (items.length > 0) items[0].focus();
      }, 50);
    });
  };

  /**
   * Close the menu without choosing.
   */
  EdgeMenu.close = function () {
    if (menuEl) {
      menuEl.classList.remove("admin-arbor-edge-menu--open");
    }
    if (backdropEl) {
      backdropEl.classList.remove("admin-arbor-edge-menu__backdrop--open");
    }
    if (resolvePromise) {
      resolvePromise(null);
      resolvePromise = null;
    }
  };

  /**
   * Choose an option and resolve the promise.
   *
   * @param {Object} option
   */
  EdgeMenu.choose = function (option) {
    if (menuEl) {
      menuEl.classList.remove("admin-arbor-edge-menu--open");
    }
    if (backdropEl) {
      backdropEl.classList.remove("admin-arbor-edge-menu__backdrop--open");
    }
    if (resolvePromise) {
      resolvePromise({ label: option.label });
      resolvePromise = null;
    }
  };

  /* ── Keyboard navigation ────────────────────────────────────────────────────── */

  /**
   * Handle arrow/Enter/Esc for the menu.
   *
   * @param {KeyboardEvent} e
   */
  EdgeMenu.onKeyDown = function (e) {
    var items = menuEl.querySelectorAll('[role="menuitem"]');
    var count = items.length;
    if (count === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % count;
      EdgeMenu.updateActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + count) % count;
      EdgeMenu.updateActive();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      var activeItem = items[activeIndex];
      if (activeItem) activeItem.click();
    } else if (e.key === "Escape") {
      e.preventDefault();
      EdgeMenu.close();
    }
  };

  /**
   * Update which menu item is marked active and focus it.
   */
  EdgeMenu.updateActive = function () {
    var items = menuEl.querySelectorAll('[role="menuitem"]');
    for (var i = 0; i < items.length; i++) {
      if (i === activeIndex) {
        items[i].setAttribute("aria-current", "true");
        items[i].focus();
      } else {
        items[i].removeAttribute("aria-current");
      }
    }
  };

  /* ── Pure helpers ───────────────────────────────────────────────────────────── */

  /**
   * Clamp a menu position to the viewport. Exported for testing.
   *
   * @param {number} screenX
   * @param {number} screenY
   * @param {number} menuWidth
   * @param {number} menuHeight
   * @param {number} viewW
   * @param {number} viewH
   * @returns {{left: number, top: number}}
   */
  function clampMenuPosition(screenX, screenY, menuWidth, menuHeight, viewW, viewH) {
    var left = screenX;
    var top = screenY;
    if (left + menuWidth > viewW) left = viewW - menuWidth - 8;
    if (top + menuHeight > viewH) top = viewH - menuHeight - 8;
    if (left < 0) left = 8;
    if (top < 0) top = 8;
    return { left: left, top: top };
  }

  // Expose for tests
  EdgeMenu._clampMenuPosition = clampMenuPosition;
})();
