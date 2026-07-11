/**
 * Admin maps pin context-menu module.
 *
 * Small reusable right-click popup menu.  Positions at a given screen
 * point (clamped to the viewport), renders role="menu" with supplied
 * { label, danger, onSelect } options, keyboard-navigable
 * (arrows/Enter/Esc), dismisses on click-away.
 *
 * @module admin-maps/maps-pin-menu
 */

window.AdminMapsPinMenu = {};
const PinMenu = window.AdminMapsPinMenu;

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
 * Create the menu and backdrop in the DOM.  Call once on page load.
 */
PinMenu.init = function () {
  if (menuEl) return;

  // Backdrop for click-away
  backdropEl = document.createElement("div");
  backdropEl.className = "admin-maps-pin-menu__backdrop";
  backdropEl.addEventListener("click", PinMenu.close);
  document.body.appendChild(backdropEl);

  // Menu container
  menuEl = document.createElement("div");
  menuEl.className = "admin-maps-pin-menu";
  menuEl.setAttribute("role", "menu");
  menuEl.setAttribute("aria-label", "Pin actions");

  document.body.appendChild(menuEl);

  // Keyboard navigation
  menuEl.addEventListener("keydown", PinMenu.onKeyDown);

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      menuEl &&
      menuEl.classList.contains("admin-maps-pin-menu--open")
    ) {
      PinMenu.close();
    }
  });
};

/* ── Open / Close ───────────────────────────────────────────────────────────── */

/**
 * Open the popup menu at a screen position with the given options and
 * return a Promise that resolves to the selected option's label, or
 * null if cancelled.
 *
 * @param {number} screenX
 * @param {number} screenY
 * @param {Array<{label: string, danger?: boolean, onSelect?: function}>} options
 * @returns {Promise<string|null>}
 */
PinMenu.open = function (screenX, screenY, options) {
  return new Promise(function (resolve) {
    resolvePromise = resolve;
    activeIndex = 0;

    // Clear existing items
    menuEl.innerHTML = "";

    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      var item = document.createElement("button");
      item.className = "admin-maps-pin-menu__item";
      if (opt.danger) item.classList.add("admin-maps-pin-menu__item--danger");
      item.setAttribute("role", "menuitem");
      item.type = "button";
      item.textContent = opt.label;

      item.addEventListener("click", (function (o) {
        return function (e) {
          e.stopPropagation();
          PinMenu.choose(o);
        };
      })(opt));

      menuEl.appendChild(item);
    }

    if (options.length === 0) {
      PinMenu.close();
      return;
    }

    // Clamp position to viewport
    var pos = clampMenuPosition(
      screenX, screenY, 160,
      options.length * 36 + 16,
      window.innerWidth, window.innerHeight,
    );

    menuEl.style.left = pos.left + "px";
    menuEl.style.top = pos.top + "px";
    menuEl.classList.add("admin-maps-pin-menu--open");

    if (backdropEl) {
      backdropEl.classList.add("admin-maps-pin-menu__backdrop--open");
    }

    // Focus first item
    PinMenu.updateActive();

    setTimeout(function () {
      var items = menuEl.querySelectorAll('[role="menuitem"]');
      if (items.length > 0) items[0].focus();
    }, 50);
  });
};

/**
 * Close the menu without choosing.
 */
PinMenu.close = function () {
  if (menuEl) {
    menuEl.classList.remove("admin-maps-pin-menu--open");
  }
  if (backdropEl) {
    backdropEl.classList.remove("admin-maps-pin-menu__backdrop--open");
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
PinMenu.choose = function (option) {
  if (menuEl) {
    menuEl.classList.remove("admin-maps-pin-menu--open");
  }
  if (backdropEl) {
    backdropEl.classList.remove("admin-maps-pin-menu__backdrop--open");
  }
  if (resolvePromise) {
    resolvePromise({ label: option.label, onSelect: option.onSelect });
    resolvePromise = null;
  }
};

/* ── Keyboard navigation ────────────────────────────────────────────────────── */

/**
 * Handle arrow/Enter/Esc for the menu.
 *
 * @param {KeyboardEvent} e
 */
PinMenu.onKeyDown = function (e) {
  var items = menuEl.querySelectorAll('[role="menuitem"]');
  var count = items.length;
  if (count === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % count;
    PinMenu.updateActive();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + count) % count;
    PinMenu.updateActive();
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    var activeItem = items[activeIndex];
    if (activeItem) {
      activeItem.click();
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    PinMenu.close();
  }
};

/**
 * Update which menu item is marked active and focus it.
 */
PinMenu.updateActive = function () {
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
 * Clamp a menu position to the viewport.  Exported for testing.
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
  if (left + menuWidth > viewW) { left = viewW - menuWidth - 8; }
  if (top + menuHeight > viewH) { top = viewH - menuHeight - 8; }
  if (left < 0) left = 8;
  if (top < 0) top = 8;
  return { left: left, top: top };
}

// Expose for tests
PinMenu._clampMenuPosition = clampMenuPosition;
