// Trigger:  Called by dashboard_app.js as window.renderRecordsAll() when the
//           user navigates to the All Records module (card click or tab select).
// Main:    renderRecordsAll() — sets full-width layout, fetches the HTML template,
//           injects dependent scripts and CSS, initialises sort toggles, search,
//           endless scroll, CSV upload handler, and bulk review handler. Manages
//           view switching between the main records table and the isolated bulk
//           review panel.
// Output:  Fully interactive All Records dashboard rendered in the Providence
//           main work area with live data, sort/filter controls, search, and
//           bulk CSV upload workflow.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — ALL RECORDS DASHBOARD ORCHESTRATOR
   File:    js/2.0_records/dashboard/dashboard_records_all.js
   Version: 1.0.0
   Module:  2.0 — Records
   Purpose: Initialises the All Records dashboard module and manages the full
            view lifecycle: HTML injection, dependent script injection, toggle
            coordination, search integration, endless scroll, and the two-phase
            bulk CSV upload workflow (parse → ephemeral review → commit).
            Coordinates all sub-modules via their window.* API contracts.
============================================================================= */

/* -----------------------------------------------------------------------------
   DEPENDENCY TRACKING — scripts injected dynamically at module load
----------------------------------------------------------------------------- */
const RECORDS_ALL_SCRIPTS = [
  "../../js/2.0_records/dashboard/data_populate_table.js",
  "../../js/2.0_records/dashboard/endless_scroll.js",
  "../../js/2.0_records/dashboard/table_toggle_display.js",
  "../../js/2.0_records/dashboard/search_records.js",
  "../../js/2.0_records/dashboard/papaparse.min.js",
  "../../js/2.0_records/dashboard/bulk_csv_upload_handler.js",
  "../../js/2.0_records/dashboard/bulk_upload_review_handler.js",
];

/* Track the active sort mode so we can return to it after bulk commit */
let _activeSort = "created_at";

/* Track whether the bulk panel is currently visible */
let _activeStatus = "all";
let _bulkPanelVisible = false;

/* -----------------------------------------------------------------------------
   MAIN: renderRecordsAll
   Entry point called by dashboard_app.js loadModule('records-all').
----------------------------------------------------------------------------- */
async function renderRecordsAll() {
  // --- 1. Layout: full-width canvas, no sidebar ---
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns(false, "1fr");
  }

  // --- 2. Show loading state ---
  if (typeof window._setColumn === "function") {
    window._setColumn(
      "main",
      '<div class="state-loading"><span class="state-loading__label">Loading All Records…</span></div>',
    );
  }

  // --- 3. Fetch and inject HTML template ---
  try {
    const htmlResponse = await fetch(
      "../../admin/frontend/dashboard_records_all.html",
    );
    if (!htmlResponse.ok) {
      throw new Error("Failed to load HTML template: " + htmlResponse.status);
    }
    const html = await htmlResponse.text();

    if (typeof window._setColumn === "function") {
      window._setColumn("main", html);
    }
  } catch (err) {
    console.error("[dashboard_records_all] HTML load failed:", err);
    if (typeof window._setColumn === "function") {
      window._setColumn(
        "main",
        '<div class="state-error"><span class="state-error__label">Error loading the All Records dashboard.</span><p>Please refresh the page and try again.</p></div>',
      );
    }
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to load the All Records dashboard interface.",
      );
    }
    return;
  }

  // --- 4. Inject CSS ---
  _injectStylesheet(
    "../../css/2.0_records/dashboard/dashboard_records_all.css",
  );

  // --- 5. Inject all dependent JS scripts ---
  await _injectScripts(RECORDS_ALL_SCRIPTS);

  // --- 6. Wire "+ New Record" button ---
  _wireNewRecordButton();

  // --- 7. Initialise toggles ---
  if (typeof window.initTableToggles === "function") {
    window.initTableToggles();
  } else {
    _wireTogglesFallback();
  }

  // --- 7a. Initialise status filter toggles ---
  _wireStatusToggles();

  // --- 8. Initialise search ---
  if (typeof window.initRecordsSearch === "function") {
    window.initRecordsSearch();
  }

  // --- 8. Initialise endless scroll ---
  if (typeof window.initEndlessScroll === "function") {
    window.initEndlessScroll();
  }

  // --- 9. Initialise CSV upload handler ---
  if (typeof window.initBulkCsvUpload === "function") {
    window.initBulkCsvUpload();
  }

  // --- 10. Initialise bulk review handler ---
  if (typeof window.initBulkReview === "function") {
    window.initBulkReview();
  }

  // --- 11. Fetch initial batch of records ---
  if (typeof window.fetchRecordsBatch === "function") {
    window.fetchRecordsBatch(_activeSort, 0);
  }

  // --- 12. Surface ready state ---
  if (typeof window.surfaceError === "function") {
    window.surfaceError("All Records dashboard ready.");
  }

  _updateStatusBar("System running normally.", "");
}

/* -----------------------------------------------------------------------------
   PUBLIC: setActiveSort
   Called by table_toggle_display.js when a toggle is clicked.
   Updates the tracked sort mode and triggers a re-fetch of records.
----------------------------------------------------------------------------- */
function setActiveSort(sortKey) {
  _activeSort = sortKey;
}

/* -----------------------------------------------------------------------------
   PUBLIC: getActiveSort
   Returns the currently active sort key.
----------------------------------------------------------------------------- */
function getActiveSort() {
  return _activeSort;
}

/* -----------------------------------------------------------------------------
   PUBLIC: showBulkReviewPanel
   Hides the main records table and reveals the bulk review panel.
   Called by table_toggle_display.js when "Bulk" toggle is selected.
----------------------------------------------------------------------------- */
function getActiveStatus() {
  return _activeStatus;
}

function showBulkReviewPanel() {
  _bulkPanelVisible = true;

  const tableContainer = document.getElementById("records-all-table-container");
  const bulkPanel = document.getElementById("bulk-review-panel");
  const searchBar = document.getElementById("records-all-search-bar");

  if (tableContainer) tableContainer.hidden = true;
  if (bulkPanel) bulkPanel.hidden = false;

  // Disable search in bulk mode
  if (searchBar) {
    const searchInput = document.getElementById("records-all-search-input");
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.placeholder = "Search unavailable in Bulk Review mode";
      searchInput.classList.add("records-all__search-input--disabled");
    }
  }

  // Disable endless scroll while bulk panel is visible
  if (typeof window.pauseEndlessScroll === "function") {
    window.pauseEndlessScroll();
  }

  // Render bulk review if data exists
  if (typeof window.renderBulkReview === "function") {
    window.renderBulkReview();
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: hideBulkReviewPanel
   Hides the bulk review panel and restores the main records table.
   Called after bulk commit, discard, or when switching away from Bulk toggle.
----------------------------------------------------------------------------- */
function hideBulkReviewPanel() {
  _bulkPanelVisible = false;

  const tableContainer = document.getElementById("records-all-table-container");
  const bulkPanel = document.getElementById("bulk-review-panel");
  const searchBar = document.getElementById("records-all-search-bar");

  if (tableContainer) tableContainer.hidden = false;
  if (bulkPanel) bulkPanel.hidden = true;

  // Re-enable search
  if (searchBar) {
    const searchInput = document.getElementById("records-all-search-input");
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.placeholder =
        "Search records by title, verse, or keyword... (Cmd+K)";
      searchInput.classList.remove("records-all__search-input--disabled");
    }
  }

  // Re-enable endless scroll
  if (typeof window.resumeEndlessScroll === "function") {
    window.resumeEndlessScroll();
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: isBulkPanelVisible
   Returns whether the bulk review panel is currently shown.
----------------------------------------------------------------------------- */
function isBulkPanelVisible() {
  return _bulkPanelVisible;
}

/* -----------------------------------------------------------------------------
   PUBLIC: updateStatusBar
   Updates the module-scoped status bar with a message and optional CSS class.
   Messages are also routed through surfaceError for the global footer.
----------------------------------------------------------------------------- */
function _updateStatusBar(message, cssClass) {
  const statusBar = document.getElementById("records-all-status-bar");
  if (statusBar) {
    statusBar.textContent = message;
    statusBar.className = "records-all__status-bar";
    if (cssClass) {
      statusBar.classList.add(cssClass);
    }
  }

  // Also route to global error footer
  if (typeof window.surfaceError === "function") {
    window.surfaceError(message);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _injectScripts — inject multiple JS scripts sequentially
----------------------------------------------------------------------------- */
function _wireStatusToggles() {
  var statusBtns = document.querySelectorAll("[data-status]");
  statusBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var status = btn.getAttribute("data-status");
      if (status === _activeStatus) return;

      // Update active state
      statusBtns.forEach(function (b) {
        b.classList.remove("toggle-btn--active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("toggle-btn--active");
      btn.setAttribute("aria-pressed", "true");

      _activeStatus = status;

      // Re-fetch records with new status filter
      var sortKey =
        typeof window.getActiveSort === "function"
          ? window.getActiveSort()
          : "created_at";
      if (typeof window.fetchRecordsBatch === "function") {
        window.fetchRecordsBatch(sortKey, 0, status);
      }
    });
  });
}

function _injectScripts(scriptPaths) {
  var failedScripts = [];
  return Promise.all(
    scriptPaths.map(function (src) {
      return new Promise(function (resolve) {
        var existing = document.querySelector('script[src="' + src + '"]');
        if (existing) {
          resolve();
          return;
        }

        var script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = function () {
          resolve();
        };
        script.onerror = function () {
          var name = src.split("/").pop().replace(".js", "");
          failedScripts.push(name);
          console.warn("[dashboard_records_all] Failed to load script:", src);
          resolve();
        };
        document.head.appendChild(script);
      });
    }),
  ).then(function () {
    if (failedScripts.length > 0) {
      var msg = "Warning: Failed to load module(s): " + failedScripts.join(", ") + ". Some features may be unavailable.";
      _updateStatusBar(msg, "is-warn");
      if (typeof window.surfaceError === "function") {
        window.surfaceError(msg);
      }
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _injectStylesheet — fetch CSS fresh and inject into a <style> tag
----------------------------------------------------------------------------- */
function _injectStylesheet(href) {
  const styleId = "records-all-dynamic-styles";

  fetch(href, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) {
        console.warn(
          "[dashboard_records_all] Failed to load CSS:",
          href,
          res.status,
        );
        return;
      }
      return res.text();
    })
    .then(function (css) {
      if (!css) return;
      var el = document.getElementById(styleId);
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      el.textContent = css;
    })
    .catch(function (err) {
      console.warn("[dashboard_records_all] CSS fetch failed:", href, err);
    });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireNewRecordButton — navigate to blank single-record editor
----------------------------------------------------------------------------- */
function _wireNewRecordButton() {
  const btn = document.getElementById("btn-new-record");
  if (!btn) return;

  btn.addEventListener("click", function () {
    // Clear any preselected record ID so the single-record module
    // renders in "create" mode with all fields blank.
    if (typeof window.setRecordId === "function") {
      window.setRecordId(null);
    }
    if (typeof window.loadModule === "function") {
      window.loadModule("records-single");
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireTogglesFallback — basic toggle wiring if initTableToggles
   hasn't loaded yet (shouldn't happen, but safe fallback)
----------------------------------------------------------------------------- */
function _wireTogglesFallback() {
  const toggleButtons = document.querySelectorAll(".toggle-btn");
  toggleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const sortKey = btn.getAttribute("data-sort");
      if (sortKey === "bulk") {
        if (typeof window.showBulkReviewPanel === "function") {
          window.showBulkReviewPanel();
        }
        return;
      }
      if (typeof window.setActiveSort === "function") {
        window.setActiveSort(sortKey);
      }
      if (typeof window.fetchRecordsBatch === "function") {
        window.fetchRecordsBatch(sortKey, 0);
      }
    });
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
   renderRecordsAll is the canonical entry point registered in
   dashboard_app.js MODULE_RENDERERS as 'records-all'.
----------------------------------------------------------------------------- */
window.renderRecordsAll = renderRecordsAll;
window.setActiveSort = setActiveSort;
window.getActiveSort = getActiveSort;
window.showBulkReviewPanel = showBulkReviewPanel;
window.hideBulkReviewPanel = hideBulkReviewPanel;
window.isBulkPanelVisible = isBulkPanelVisible;
window.updateRecordsAllStatusBar = _updateStatusBar;
