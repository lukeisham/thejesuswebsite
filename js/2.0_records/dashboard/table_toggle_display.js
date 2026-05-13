// Trigger:  Called by the orchestrator after HTML injection to wire click
//           handlers on the 6 sort/filter toggle buttons.
// Main:    initTableToggles() — wires each toggle button to re-fetch records
//           with the corresponding sort order. The "Bulk" toggle isolates the
//           view to show only the ephemeral bulk review panel. Title toggle
//           supports ascending/descending on repeated clicks.
// Output:  Active toggle highlighted. Records re-fetched with correct sort
//           parameter. Bulk panel shown/hidden appropriately.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — TABLE TOGGLE DISPLAY LOGIC
   File:    js/2.0_records/dashboard/table_toggle_display.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Manages the 6 sort/filter toggle buttons in the function bar.
            Each toggle re-fetches records with the appropriate API sort param.
            The "Bulk" toggle is special: it isolates the view to show only
            the ephemeral bulk review panel without fetching from the API.
============================================================================= */

/* -----------------------------------------------------------------------------
   STATE — track active toggle and sort direction for Title toggle
----------------------------------------------------------------------------- */
let _activeToggle = null;
let _titleSortAsc = true; // Toggleable direction for Title sort

/* -----------------------------------------------------------------------------
   SORT KEY MAPPING — toggle data-sort → API sort parameter
   The "bulk" key does not map to an API sort — it triggers the bulk panel.
   Only keys listed here are valid column names in the database.
----------------------------------------------------------------------------- */
const SORT_KEYS = {
  created_at: "created_at",
  id: "id",
  primary_verse: "primary_verse",
  title: "title",
  bulk: null, // Special handling — no API call
};

/* -----------------------------------------------------------------------------
   PUBLIC: initTableToggles
   Wires click handlers to all .toggle-btn buttons in the function bar.
----------------------------------------------------------------------------- */
function initTableToggles() {
  const toggleButtons = document.querySelectorAll(".toggle-btn");
  if (!toggleButtons.length) return;

  // Find the initially active sort toggle (created_at by default)
  toggleButtons.forEach(function (btn) {
    if (
      btn.hasAttribute("data-sort") &&
      btn.classList.contains("toggle-btn--active")
    ) {
      _activeToggle = btn;
    }
  });

  // If no sort toggle is active, default to created_at
  if (!_activeToggle) {
    const defaultBtn = document.getElementById("toggle-created-at");
    if (defaultBtn) {
      defaultBtn.classList.add("toggle-btn--active");
      defaultBtn.setAttribute("aria-pressed", "true");
      _activeToggle = defaultBtn;
    }
  }

  // Wire each toggle
  toggleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const sortKey = btn.getAttribute("data-sort");
      if (!sortKey) return;

      // Handle "Bulk" toggle separately
      if (sortKey === "bulk") {
        _handleBulkToggle(btn);
        return;
      }

      // Handle Title toggle — support ascending/descending
      if (sortKey === "title" && _activeToggle === btn) {
        _titleSortAsc = !_titleSortAsc;
      } else {
        _titleSortAsc = true;
      }

      // Ensure bulk panel is hidden when switching to a data toggle
      if (
        typeof window.isBulkPanelVisible === "function" &&
        window.isBulkPanelVisible()
      ) {
        // Discard unsaved bulk data when navigating away
        if (typeof window.discardBulkReview === "function") {
          window.discardBulkReview();
        }
        if (typeof window.hideBulkReviewPanel === "function") {
          window.hideBulkReviewPanel();
        }
      }

      // Update active toggle UI
      _setActiveToggle(btn);

      // Notify orchestrator of the new sort
      if (typeof window.setActiveSort === "function") {
        window.setActiveSort(sortKey);
      }

      // Clear search input when toggle changes
      _clearSearch();

      // Get current status filter and fetch with it
      var statusFilter =
        typeof window.getActiveStatus === "function"
          ? window.getActiveStatus()
          : "all";

      // Fetched records with the new sort order
      if (typeof window.fetchRecordsBatch === "function") {
        window
          .fetchRecordsBatch(sortKey, 0, statusFilter)
          .catch(function (err) {
            console.error("[table_toggle_display] Fetch failed:", err);
            if (typeof window.surfaceError === "function") {
              window.surfaceError(
                "Error: Failed to re-sort records. Please try again.",
              );
            }
            if (typeof window.updateRecordsAllStatusBar === "function") {
              window.updateRecordsAllStatusBar(
                "Error: Failed to re-sort records. Please try again.",
                "is-error",
              );
            }
          });
      }
    });
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleBulkToggle
   Shows the bulk review panel. If no ephemeral data exists, shows empty state.
----------------------------------------------------------------------------- */
function _handleBulkToggle(btn) {
  _setActiveToggle(btn);

  // Clear search since it's disabled in bulk mode
  _clearSearch();

  // Show the bulk review panel
  if (typeof window.showBulkReviewPanel === "function") {
    window.showBulkReviewPanel();
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setActiveToggle
   Updates the UI to mark the given sort button as the active toggle.
   Only operates on buttons with a data-sort attribute (sort toggles),
   so status filter toggles (data-status) keep their active state.
----------------------------------------------------------------------------- */
function _setActiveToggle(activeBtn) {
  const allButtons = document.querySelectorAll(".toggle-btn[data-sort]");
  allButtons.forEach(function (btn) {
    btn.classList.remove("toggle-btn--active");
    btn.setAttribute("aria-pressed", "false");
  });

  activeBtn.classList.add("toggle-btn--active");
  activeBtn.setAttribute("aria-pressed", "true");
  _activeToggle = activeBtn;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSearch
   Clears the search input field and resets any active search filter.
----------------------------------------------------------------------------- */
function _clearSearch() {
  const searchInput = document.getElementById("records-all-search-input");
  if (searchInput) {
    searchInput.value = "";
    // Trigger the input event so search_records.js can react
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const clearBtn = document.getElementById("records-all-search-clear");
  if (clearBtn) {
    clearBtn.hidden = true;
  }

  const statusEl = document.getElementById("records-all-search-status");
  if (statusEl) {
    statusEl.textContent = "";
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initTableToggles = initTableToggles;
