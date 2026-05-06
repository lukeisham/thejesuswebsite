// =============================================================================
//
//   THE JESUS WEBSITE — DASHBOARD SIDEBAR RESIZE UTILITY
//   File:    js/7.0_system/dashboard/dashboard_sidebar_resize.js
//   Version: 1.0.0
//   Purpose: Exposes window.initSidebarResize() — attaches drag-to-resize
//            behaviour to a handle element in the Providence sidebar divider
//            track. Supports mouse and touch events, configurable min/max
//            backstops, real-time --sidebar-width updates, and cookie-based
//            width persistence across sessions.
//
//   TRIGGER:  Called by dashboard_sidebar_resize_init.js after _setLayoutColumns
//             runs (or manually by any module that manages its own sidebar).
//   FUNCTION: initSidebarResize(containerEl, opts) — wires mousedown/touchstart
//             on opts.handleEl, tracks movement, clamps to opts.minWidth/
//             opts.maxWidth, sets --sidebar-width on containerEl in real time.
//             On drag end, persists the width to a cookie (opts.cookieName).
//             On init, reads the cookie and applies saved width immediately.
//   OUTPUT:   Resizable sidebar column. Cookie named opts.cookieName (default
//             "dashboard-sidebar-width") with 90-day expiry, path=/.
//
// =============================================================================

/**
 * initSidebarResize
 *
 * Enables dragging a handle to resize a sidebar column.
 * The handle must already exist in the DOM before calling this function.
 *
 * @param {HTMLElement} containerEl - The grid container element (e.g. #admin-canvas)
 * @param {Object}      opts        - Configuration options
 * @param {HTMLElement} opts.handleEl       - The drag handle element
 * @param {string}      [opts.minWidth]     - Minimum sidebar width (default '180px')
 * @param {string}      [opts.maxWidth]     - Maximum sidebar width (default '40vw')
 * @param {string}      [opts.cookieName]   - Cookie key for persistence
 *                                            (default 'dashboard-sidebar-width')
 * @param {boolean}     [opts.persist]      - Set false to disable cookie persistence
 *                                            (default true)
 */
function initSidebarResize(containerEl, opts) {
  if (!containerEl || !opts || !opts.handleEl) {
    console.warn(
      "[sidebar_resize.js] initSidebarResize: containerEl and opts.handleEl are required."
    );
    return;
  }

  var handleEl = opts.handleEl;
  var minWidth = opts.minWidth || "180px";
  var maxWidth = opts.maxWidth || "40vw";
  var cookieName =
    opts.persist !== false
      ? opts.cookieName || "dashboard-sidebar-width"
      : null;

  // --- Parse pixel values from CSS strings --------------------------------
  // Accepts values like '180px', '40vw', '280px'. Returns raw number for
  // viewport-relative units (vw) and pixel values as-is.

  function parseDimension(val, viewportDimension) {
    if (typeof val === "number") return val;
    var match = String(val).match(/^([\d.]+)(px|vw)?$/);
    if (!match) return 280;
    var num = parseFloat(match[1]);
    var unit = match[2] || "px";
    if (unit === "vw") {
      return (num / 100) * viewportDimension;
    }
    return num;
  }

  // --- Read cookie helper --------------------------------------------------

  function getCookie(name) {
    var match = document.cookie.match(
      "(?:^|;\\s*)" + encodeURIComponent(name) + "=([^;]*)"
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  // --- Write cookie helper -------------------------------------------------

  function setCookie(name, value, days) {
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie =
      encodeURIComponent(name) +
      "=" +
      encodeURIComponent(value) +
      "; expires=" +
      expires.toUTCString() +
      "; path=/";
  }

  // --- On init: restore saved width from cookie, if any --------------------

  if (cookieName) {
    var savedWidth = getCookie(cookieName);
    if (savedWidth) {
      var parsed = parseFloat(savedWidth);
      if (!isNaN(parsed) && parsed > 0) {
        containerEl.style.setProperty("--sidebar-width", savedWidth);
      }
    }
  }

  // --- Drag state ----------------------------------------------------------

  var isDragging = false;
  var startX = 0;
  var startWidth = 0;

  // --- Resize start handler ------------------------------------------------

  function onDragStart(e) {
    // Only respond to left mouse button or touch
    if (e.type === "mousedown" && e.button !== 0) return;

    isDragging = true;
    startX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;

    // Read the current computed width of the sidebar column.
    // Fall back to the CSS :root default via getComputedStyle so the JS value
    // stays in sync with what shell.css declares — no magic numbers.
    var computedWidth = getComputedStyle(containerEl)
      .getPropertyValue("--sidebar-width")
      .trim();
    startWidth = computedWidth
      ? parseFloat(computedWidth)
      : parseFloat(
          getComputedStyle(containerEl).getPropertyValue("grid-template-columns")
        ) || 280;

    // Set dragging visual state
    handleEl.classList.add("is-dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    // Attach move/end listeners globally so they track even outside the handle
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    document.addEventListener("touchmove", onDragMove, { passive: false });
    document.addEventListener("touchend", onDragEnd);

    e.preventDefault();
  }

  // --- Resize move handler -------------------------------------------------

  function onDragMove(e) {
    if (!isDragging) return;

    var clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    var deltaX = clientX - startX;

    // Clamp to backstop limits
    var vw = window.innerWidth;
    var minPx = parseDimension(minWidth, vw);
    var maxPx = parseDimension(maxWidth, vw);

    var newWidth = Math.max(minPx, Math.min(maxPx, startWidth + deltaX));
    containerEl.style.setProperty("--sidebar-width", newWidth + "px");

    e.preventDefault();
  }

  // --- Resize end handler --------------------------------------------------

  function onDragEnd(e) {
    if (!isDragging) return;

    isDragging = false;
    handleEl.classList.remove("is-dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // Remove global listeners
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.removeEventListener("touchmove", onDragMove);
    document.removeEventListener("touchend", onDragEnd);

    // Persist the final width to cookie
    if (cookieName) {
      var finalWidth = containerEl.style.getPropertyValue("--sidebar-width");
      if (finalWidth) {
        setCookie(cookieName, finalWidth.trim(), 90);
      }
    }

    e.preventDefault();
  }

  // --- Attach drag start to handle -----------------------------------------

  handleEl.addEventListener("mousedown", onDragStart);
  handleEl.addEventListener("touchstart", onDragStart, { passive: false });
}

// Expose globally so dashboard_sidebar_resize_init.js and any module can call it
window.initSidebarResize = initSidebarResize;
