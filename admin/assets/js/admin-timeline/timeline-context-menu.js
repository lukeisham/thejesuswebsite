/**
 * Admin timeline context-menu module.
 *
 * Delegated right-click menu on the timeline canvas for event dots.
 * Offers "Move to period…" (submenu with all TIMELINE_PERIODS) and
 * "Move to holding pen".  Modelled on maps-pin-menu.js — positions at a
 * screen point, keyboard-navigable (arrows / Enter / Esc), dismisses on
 * click-away via backdrop.
 *
 * @module admin-timeline/timeline-context-menu
 */

window.AdminTimelineContextMenu = {};
const ContextMenu = window.AdminTimelineContextMenu;

/** @type {HTMLElement|null} */
var menuEl = null;

/** @type {HTMLElement|null} */
var backdropEl = null;

/** @type {number}  Active item index for keyboard nav (top-level menu). */
var activeIndex = 0;

/** @type {number}  Active submenu item index (-1 when submenu is closed). */
var activeSubIndex = -1;

/** @type {number|null}  The event id the menu was opened for. */
var currentEventId = null;

/* ── DOM bootstrap ──────────────────────────────────────────────────────────── */

/**
 * Create the menu DOM and wire the delegated contextmenu listener.
 * Call once on page load.
 */
ContextMenu.init = function () {
  if (menuEl) return;

  // Backdrop for click-away
  backdropEl = document.createElement("div");
  backdropEl.className = "admin-timeline-context-menu__backdrop";
  backdropEl.addEventListener("click", ContextMenu.close);
  document.body.appendChild(backdropEl);

  // Menu container
  menuEl = document.createElement("div");
  menuEl.className = "admin-timeline-context-menu";
  menuEl.setAttribute("role", "menu");
  menuEl.setAttribute("aria-label", "Event actions");
  document.body.appendChild(menuEl);

  // Keyboard navigation inside the menu
  menuEl.addEventListener("keydown", ContextMenu._onKeyDown);

  // Global Escape to close
  document.addEventListener("keydown", function (e) {
    if (
      e.key === "Escape" &&
      menuEl &&
      menuEl.classList.contains("admin-timeline-context-menu--open")
    ) {
      ContextMenu.close();
    }
  });

  // Delegated contextmenu on the timeline canvas
  var canvas = document.getElementById("timeline-canvas");
  if (canvas) {
    canvas.addEventListener("contextmenu", function (e) {
      var dot = e.target.closest(".admin-timeline-event");
      if (!dot) return;
      e.preventDefault();
      var eventId = parseInt(dot.dataset.eventId, 10);
      if (!isNaN(eventId)) {
        ContextMenu.show(e.clientX, e.clientY, eventId);
      }
    });
  }
};

/* ── Open / Close ───────────────────────────────────────────────────────────── */

/**
 * Open the context menu at a screen position for the given event.
 *
 * @param {number} screenX
 * @param {number} screenY
 * @param {number} eventId
 */
ContextMenu.show = function (screenX, screenY, eventId) {
  currentEventId = eventId;
  activeIndex = 0;
  activeSubIndex = -1;

  menuEl.innerHTML = "";

  /* ── "Move to period…" item ─────────────────────────────────────────── */
  var periodItem = document.createElement("button");
  periodItem.className = "admin-timeline-context-menu__item";
  periodItem.setAttribute("role", "menuitem");
  periodItem.type = "button";
  periodItem.textContent = "Move to period…";
  periodItem.addEventListener("click", function (e) {
    e.stopPropagation();
    ContextMenu._showPeriodSubmenu();
  });
  menuEl.appendChild(periodItem);

  /* ── "Move to holding pen" item ─────────────────────────────────────── */
  var penItem = document.createElement("button");
  penItem.className =
    "admin-timeline-context-menu__item admin-timeline-context-menu__item--danger";
  penItem.setAttribute("role", "menuitem");
  penItem.type = "button";
  penItem.textContent = "Move to holding pen";
  penItem.addEventListener("click", function (e) {
    e.stopPropagation();
    ContextMenu._onMoveToPen(currentEventId);
    ContextMenu.close();
  });
  menuEl.appendChild(penItem);

  // Clamp position to viewport
  var pos = _clampMenuPosition(
    screenX,
    screenY,
    220,
    120,
    window.innerWidth,
    window.innerHeight,
  );
  menuEl.style.left = pos.left + "px";
  menuEl.style.top = pos.top + "px";
  menuEl.classList.add("admin-timeline-context-menu--open");

  if (backdropEl) {
    backdropEl.classList.add("admin-timeline-context-menu__backdrop--open");
  }

  ContextMenu._updateActive();

  setTimeout(function () {
    var items = menuEl.querySelectorAll(':scope > [role="menuitem"]');
    if (items.length > 0) items[0].focus();
  }, 50);
};

/**
 * Close the menu and backdrop.  Cleans up any open submenu and state.
 */
ContextMenu.close = function () {
  if (menuEl) {
    menuEl.classList.remove("admin-timeline-context-menu--open");
    menuEl.innerHTML = "";
  }
  if (backdropEl) {
    backdropEl.classList.remove("admin-timeline-context-menu__backdrop--open");
  }
  currentEventId = null;
  activeSubIndex = -1;
};

/* ── Private: submenu ───────────────────────────────────────────────────────── */

/**
 * Open the period submenu (all TIMELINE_PERIODS as menu items).
 */
ContextMenu._showPeriodSubmenu = function () {
  // Remove any existing submenu
  var existing = menuEl.querySelector(".admin-timeline-context-menu__submenu");
  if (existing) existing.remove();

  var periods = window.AdminTimelineGeometry
    ? window.AdminTimelineGeometry.TIMELINE_PERIODS
    : [];
  if (periods.length === 0) return;

  var submenu = document.createElement("div");
  submenu.className = "admin-timeline-context-menu__submenu";
  submenu.setAttribute("role", "menu");
  submenu.setAttribute("aria-label", "Choose period");

  for (var i = 0; i < periods.length; i++) {
    var period = periods[i];
    var periodLabel = period.replace(/([a-z])([A-Z])/g, "$1 $2");

    var subItem = document.createElement("button");
    subItem.className = "admin-timeline-context-menu__item";
    subItem.setAttribute("role", "menuitem");
    subItem.type = "button";
    subItem.textContent = periodLabel;

    subItem.addEventListener("click", (function (p) {
      return function (e) {
        e.stopPropagation();
        ContextMenu._onPeriodChosen(p, currentEventId);
        ContextMenu.close();
      };
    })(period));

    submenu.appendChild(subItem);
  }

  menuEl.appendChild(submenu);
  activeSubIndex = 0;

  setTimeout(function () {
    var subItems = submenu.querySelectorAll('[role="menuitem"]');
    if (subItems.length > 0) subItems[0].focus();
  }, 50);

  ContextMenu._updateActive();
};

/* ── Private: action handlers ───────────────────────────────────────────────── */

/**
 * Handle "Move to period…" selection — stage a move and re-render.
 *
 * @param {string} period
 * @param {number} eventId
 */
ContextMenu._onPeriodChosen = function (period, eventId) {
  // Determine the era for the new period
  var era = null;
  if (window.AdminTimelineEvents && window.AdminTimelineEvents.eraForPeriod) {
    era = window.AdminTimelineEvents.eraForPeriod(period);
  }

  // Stage the move
  if (window.AdminTimelineStaged && window.AdminTimelineStaged.stageMove) {
    window.AdminTimelineStaged.stageMove(eventId, period, era);
  }

  // Update local state immediately (optimistic)
  if (window.AdminTimelineEvents) {
    var ev = window.AdminTimelineEvents.getEventById(eventId);
    if (ev) {
      ev.timeline_period = period;
      if (era) ev.timeline_era = era;
    }
    window.AdminTimelineEvents.renderEvents();
  }
};

/**
 * Handle "Move to holding pen" — stage an unassign, remove from the events
 * array, refresh the pen, and re-render.
 *
 * @param {number} eventId
 */
ContextMenu._onMoveToPen = function (eventId) {
  if (window.AdminTimelineStaged && window.AdminTimelineStaged.stageUnassign) {
    window.AdminTimelineStaged.stageUnassign(eventId);
  }

  // Remove from the events array
  if (window.AdminTimelineEvents) {
    if (window.AdminTimelineEvents.removeEventById) {
      window.AdminTimelineEvents.removeEventById(eventId);
    } else {
      // Fallback: re-render will happen after reload
    }
    window.AdminTimelineEvents.renderEvents();
  }

  // Refresh the holding pen so the chip appears
  if (window.AdminTimelineHoldingPen && window.AdminTimelineHoldingPen.refresh) {
    window.AdminTimelineHoldingPen.refresh();
  }
};

/* ── Keyboard navigation ────────────────────────────────────────────────────── */

/**
 * Arrow / Enter / Escape handling for the menu, including submenu navigation.
 *
 * @param {KeyboardEvent} e
 */
ContextMenu._onKeyDown = function (e) {
  var items = menuEl.querySelectorAll(':scope > [role="menuitem"]');
  var subItems = menuEl.querySelectorAll(
    '.admin-timeline-context-menu__submenu [role="menuitem"]',
  );
  var inSubmenu = subItems.length > 0;

  if (inSubmenu) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSubIndex = (activeSubIndex + 1) % subItems.length;
      ContextMenu._updateActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSubIndex =
        (activeSubIndex - 1 + subItems.length) % subItems.length;
      ContextMenu._updateActive();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      // Close submenu, return focus to parent
      var sub = menuEl.querySelector(
        ".admin-timeline-context-menu__submenu",
      );
      if (sub) sub.remove();
      activeSubIndex = -1;
      ContextMenu._updateActive();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeSubIndex >= 0 && activeSubIndex < subItems.length) {
        subItems[activeSubIndex].click();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Close submenu only, not the whole menu
      var sub2 = menuEl.querySelector(
        ".admin-timeline-context-menu__submenu",
      );
      if (sub2) sub2.remove();
      activeSubIndex = -1;
      ContextMenu._updateActive();
    }
  } else {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      ContextMenu._updateActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      ContextMenu._updateActive();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      // Try opening submenu on "Move to period…" item
      if (activeIndex === 0 && items.length > 0) {
        ContextMenu._showPeriodSubmenu();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        items[activeIndex].click();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      ContextMenu.close();
    }
  }
};

/**
 * Sync aria-current and focus to the active index (and active sub-index).
 */
ContextMenu._updateActive = function () {
  var items = menuEl.querySelectorAll(':scope > [role="menuitem"]');
  for (var i = 0; i < items.length; i++) {
    if (i === activeIndex) {
      items[i].setAttribute("aria-current", "true");
      items[i].focus();
    } else {
      items[i].removeAttribute("aria-current");
    }
  }

  var subItems = menuEl.querySelectorAll(
    '.admin-timeline-context-menu__submenu [role="menuitem"]',
  );
  for (var j = 0; j < subItems.length; j++) {
    if (j === activeSubIndex) {
      subItems[j].setAttribute("aria-current", "true");
      subItems[j].focus();
    } else {
      subItems[j].removeAttribute("aria-current");
    }
  }
};

/* ── Pure helpers ───────────────────────────────────────────────────────────── */

/**
 * Clamp a menu position to the viewport.
 *
 * @param {number} screenX
 * @param {number} screenY
 * @param {number} menuWidth
 * @param {number} menuHeight
 * @param {number} viewW
 * @param {number} viewH
 * @returns {{left: number, top: number}}
 */
function _clampMenuPosition(screenX, screenY, menuWidth, menuHeight, viewW, viewH) {
  var left = screenX;
  var top = screenY;
  if (left + menuWidth > viewW) left = viewW - menuWidth - 8;
  if (top + menuHeight > viewH) top = viewH - menuHeight - 8;
  if (left < 0) left = 8;
  if (top < 0) top = 8;
  return { left: left, top: top };
}
