/**
 * Arbor connect-menu module.
 *
 * Small pop-up menu for choosing a relationship type when connecting nodes.
 * Offers root / supports / leads_to / related, positioned at a given screen
 * point, keyboard-navigable (role="menu", arrows/Enter/Esc, click-away to
 * cancel), resolving to the chosen type (or cancel) via Promise.
 *
 * @module admin-arbor/arbor-connect-menu
 */

window.AdminArborConnectMenu = {};

(function () {
  const ConnectMenu = window.AdminArborConnectMenu;

  /** Allowable relationship types. */
  var VALID_TYPES = ["root", "supports", "leads_to", "related"];

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
  ConnectMenu.init = function () {
    if (menuEl) return;

    // Backdrop for click-away
    backdropEl = document.createElement("div");
    backdropEl.className = "admin-arbor-connect-menu__backdrop";
    backdropEl.addEventListener("click", ConnectMenu.close);
    document.body.appendChild(backdropEl);

    // Menu container
    menuEl = document.createElement("div");
    menuEl.className = "admin-arbor-connect-menu";
    menuEl.setAttribute("role", "menu");
    menuEl.setAttribute("aria-label", "Choose relationship type");

    for (var i = 0; i < VALID_TYPES.length; i++) {
      var item = document.createElement("button");
      item.className = "admin-arbor-connect-menu__item";
      item.setAttribute("role", "menuitem");
      item.type = "button";
      item.setAttribute("data-type", VALID_TYPES[i]);
      item.textContent = VALID_TYPES[i].replace(/_/g, " ");
      item.addEventListener("click", (function (type) {
        return function (e) {
          e.stopPropagation();
          ConnectMenu.choose(type);
        };
      })(VALID_TYPES[i]));
      menuEl.appendChild(item);
    }

    document.body.appendChild(menuEl);

    // Keyboard navigation
    menuEl.addEventListener("keydown", ConnectMenu.onKeyDown);

    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuEl && menuEl.classList.contains("admin-arbor-connect-menu--open")) {
        ConnectMenu.close();
      }
    });
  };

  /* ── Open / Close ───────────────────────────────────────────────────────────── */

  /**
   * Open the connect menu at a screen position and return a Promise that
   * resolves to the chosen type string, or null if cancelled.
   *
   * @param {number} screenX
   * @param {number} screenY
   * @returns {Promise<string|null>}
   */
  ConnectMenu.open = function (screenX, screenY) {
    return new Promise(function (resolve) {
      resolvePromise = resolve;
      activeIndex = 0;

      // Position the menu, clamping to viewport
      var menuWidth = 140;
      var menuHeight = VALID_TYPES.length * 36 + 16;
      var viewW = window.innerWidth;
      var viewH = window.innerHeight;

      var left = screenX;
      var top = screenY;

      if (left + menuWidth > viewW) {
        left = viewW - menuWidth - 8;
      }
      if (top + menuHeight > viewH) {
        top = viewH - menuHeight - 8;
      }
      if (left < 0) left = 8;
      if (top < 0) top = 8;

      menuEl.style.left = left + "px";
      menuEl.style.top = top + "px";
      menuEl.classList.add("admin-arbor-connect-menu--open");

      if (backdropEl) {
        backdropEl.classList.add("admin-arbor-connect-menu__backdrop--open");
      }

      // Focus first item
      ConnectMenu.updateActive();

      // Focus the first item after a tick
      setTimeout(function () {
        var items = menuEl.querySelectorAll('[role="menuitem"]');
        if (items.length > 0) {
          items[0].focus();
        }
      }, 50);
    });
  };

  /**
   * Close the menu without choosing.
   */
  ConnectMenu.close = function () {
    if (menuEl) {
      menuEl.classList.remove("admin-arbor-connect-menu--open");
    }
    if (backdropEl) {
      backdropEl.classList.remove("admin-arbor-connect-menu__backdrop--open");
    }
    if (resolvePromise) {
      resolvePromise(null);
      resolvePromise = null;
    }
  };

  /**
   * Choose a type and resolve the promise.
   *
   * @param {string} type
   */
  ConnectMenu.choose = function (type) {
    if (menuEl) {
      menuEl.classList.remove("admin-arbor-connect-menu--open");
    }
    if (backdropEl) {
      backdropEl.classList.remove("admin-arbor-connect-menu__backdrop--open");
    }
    if (resolvePromise) {
      resolvePromise(type);
      resolvePromise = null;
    }
  };

  /* ── Keyboard navigation ────────────────────────────────────────────────────── */

  /**
   * Handle arrow/Enter/Esc for the menu.
   *
   * @param {KeyboardEvent} e
   */
  ConnectMenu.onKeyDown = function (e) {
    var items = menuEl.querySelectorAll('[role="menuitem"]');
    var count = items.length;
    if (count === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % count;
      ConnectMenu.updateActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + count) % count;
      ConnectMenu.updateActive();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      var activeItem = items[activeIndex];
      if (activeItem) {
        var type = activeItem.getAttribute("data-type");
        if (type) ConnectMenu.choose(type);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      ConnectMenu.close();
    }
  };

  /**
   * Update which menu item is marked active and focus it.
   */
  ConnectMenu.updateActive = function () {
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
})();
