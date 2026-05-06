// =============================================================================
//
//   THE JESUS WEBSITE — DASHBOARD SIDEBAR RESIZE INIT
//   File:    js/7.0_system/dashboard/dashboard_sidebar_resize_init.js
//   Version: 1.0.0
//   Purpose: Wraps the existing window._setLayoutColumns() and
//            window._clearColumns() functions (defined in dashboard_app.js)
//            to automatically initialise or tear down the sidebar drag resize
//            handle — without modifying the original source files.
//
//   TRIGGER:  Loaded after dashboard_app.js and dashboard_sidebar_resize.js.
//             On script execution, saves references to the originals and
//             replaces them with wrapped versions.
//   FUNCTION: Wrapped _setLayoutColumns calls the original, then checks
//             canvasEl.classList.contains('no-sidebar'). If the sidebar is
//             visible, calls initSidebarResize() on the canvas. If hidden,
//             disables the drag handle via pointer-events: none.
//             Wrapped _clearColumns calls the original, then cleans up the
//             handle's dragging state and restores pointer-events.
//   OUTPUT:   Auto-wired drag handle that follows the Providence lifecycle.
//
// =============================================================================

(function () {
  "use strict";

  // --- Guard: originals must exist -----------------------------------------
  if (typeof window._setLayoutColumns !== "function") {
    console.warn(
      "[sidebar_resize_init] window._setLayoutColumns not found — skipping init wrapper."
    );
    return;
  }
  if (typeof window.initSidebarResize !== "function") {
    console.warn(
      "[sidebar_resize_init] window.initSidebarResize not found — skipping init wrapper."
    );
    return;
  }

  // --- Save references to originals ----------------------------------------

  var origSetLayoutColumns = window._setLayoutColumns;
  var origClearColumns = window._clearColumns;

  // --- Wrapped _setLayoutColumns -------------------------------------------

  window._setLayoutColumns = function wrappedSetLayoutColumns() {
    // 1. Call the original — it handles all the grid logic
    origSetLayoutColumns.apply(this, arguments);

    // 2. Detect sidebar visibility via the class the original always sets
    var canvasEl = document.getElementById("admin-canvas");
    if (!canvasEl) return;

    var handleEl = document.getElementById("providence-drag-handle");
    if (!handleEl) return;

    var isNoSidebar = canvasEl.classList.contains("no-sidebar");

    if (isNoSidebar) {
      // Sidebar collapsed — disable the drag handle
      handleEl.style.pointerEvents = "none";
      handleEl.classList.remove("is-dragging");
    } else {
      // Sidebar visible — enable and initialise the drag handle
      handleEl.style.pointerEvents = "auto";
      window.initSidebarResize(canvasEl, {
        handleEl: handleEl,
        minWidth: "180px",
        maxWidth: "40vw",
      });
    }
  };

  // --- Wrapped _clearColumns -----------------------------------------------

  if (typeof origClearColumns === "function") {
    window._clearColumns = function wrappedClearColumns() {
      // 1. Call the original
      origClearColumns.apply(this, arguments);

      // 2. Clean up drag handle state
      var handleEl = document.getElementById("providence-drag-handle");
      if (handleEl) {
        handleEl.classList.remove("is-dragging");
        handleEl.style.pointerEvents = "";
      }
    };
  }
})();
