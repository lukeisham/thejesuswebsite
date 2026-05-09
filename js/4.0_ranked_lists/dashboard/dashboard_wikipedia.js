// Trigger:  window.loadModule("wikipedia") → dashboard_app.js calls
//           window.renderWikipedia()
// Main:    renderWikipedia() — injects the Wikipedia editor HTML, requests
//           a wider sidebar via _setLayoutColumns(), initialises the list
//           display, sidebar handler, and ranking calculator, wires the
//           function bar buttons, and loads the initial Wikipedia ranked list.
// Output:  Fully functional Wikipedia dashboard editor in the Providence work
//          canvas. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._wikipediaModuleState = {
  activeRecordId: null, // currently selected record ID
  activeRecordTitle: "", // currently selected record title
  activeRecordSlug: "", // currently selected record slug
  activeRecordWeight: 1.0, // current record's wikipedia_weight multiplier
  activeRecordSearchTerms: [], // current record's search terms (array)
  activeRecordSnippet: "", // current record's snippet
  activeRecordMeta: "", // current record's metadata JSON
  wikipediaRecords: [], // full list of Wikipedia-ranked records
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderWikipedia
   Called by dashboard_app.js when the user navigates to the Wikipedia module.
   1. Requests wider sidebar layout (360px sidebar + 2fr main).
   2. Fetches and injects the Wikipedia editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the function bar action buttons.
   5. Loads the initial Wikipedia ranked list.
----------------------------------------------------------------------------- */
async function renderWikipedia() {
  /* -------------------------------------------------------------------------
       1. SET LAYOUT — This module has its own internal split-pane layout,
          so collapse the Providence sidebar and use the full main column.
    ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the Wikipedia editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/admin/frontend/dashboard_wikipedia.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load Wikipedia editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("wikipedia-function-bar");
      const sidebar = doc.getElementById("wikipedia-sidebar");
      const listArea = doc.getElementById("wikipedia-list-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }
      
      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (listArea) mainHtml += listArea.outerHTML;
      
      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error("[dashboard_wikipedia] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Wikipedia editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes a function on window. We call them in dependency
       order after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

  // 3a. Reset module state
  window._wikipediaModuleState.activeRecordId = null;
  window._wikipediaModuleState.activeRecordTitle = "";
  window._wikipediaModuleState.activeRecordSlug = "";
  window._wikipediaModuleState.activeRecordWeight = 1.0;
  window._wikipediaModuleState.activeRecordSearchTerms = [];
  window._wikipediaModuleState.activeRecordSnippet = "";
  window._wikipediaModuleState.activeRecordMeta = "";

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._wikipediaModuleState.activeRecordTitle;

  // 3b. Initialise the sidebar handler (populate empty sidebar)
  if (typeof window.initWikipediaSidebar === "function") {
    window.initWikipediaSidebar();
  }

  // 3c. Load the initial Wikipedia ranked list
  if (typeof window.displayWikipediaList === "function") {
    await window.displayWikipediaList();
  }

  /* -------------------------------------------------------------------------
       4. WIRE FUNCTION BAR BUTTONS — Refresh, Publish, Recalculate All
    ------------------------------------------------------------------------- */
  _wireActionButtons();

  /* -------------------------------------------------------------------------
       5. INITIALISE SHARED TOOLS — Metadata footer
       The metadata_handler.js is loaded globally via dashboard.html.
    ------------------------------------------------------------------------- */
  if (typeof window.renderMetadataFooter === "function") {
    window.renderMetadataFooter("wikipedia-metadata-container", "");
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Refresh, Publish, and Recalculate All buttons
   in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
  const btnRefresh = document.getElementById("btn-wikipedia-refresh");
  const btnPublish = document.getElementById("btn-wikipedia-publish");
  const btnRecalculateAll = document.getElementById(
    "btn-wikipedia-recalculate-all",
  );

  // Refresh — recalculate rankings with current weights
  if (btnRefresh && typeof window.refreshWikipediaRankings === "function") {
    btnRefresh.addEventListener("click", async function () {
      btnRefresh.disabled = true;
      btnRefresh.textContent = "Refreshing...";
      try {
        await window.refreshWikipediaRankings();
      } finally {
        btnRefresh.disabled = false;
        btnRefresh.textContent = "Refresh";
      }
    });
  }

  // Publish — commit ranked order to live site
  if (btnPublish && typeof window.publishWikipediaRankings === "function") {
    btnPublish.addEventListener("click", async function () {
      btnPublish.disabled = true;
      btnPublish.textContent = "Publishing...";
      try {
        await window.publishWikipediaRankings();
      } finally {
        btnPublish.disabled = false;
        btnPublish.textContent = "Publish";
      }
    });
  }

  // Recalculate All — trigger pipeline for all records
  if (btnRecalculateAll) {
    btnRecalculateAll.addEventListener("click", async function () {
      btnRecalculateAll.disabled = true;
      btnRecalculateAll.textContent = "Recalculating...";
      try {
        await _recalculateAllRecords();
      } finally {
        btnRecalculateAll.disabled = false;
        btnRecalculateAll.textContent = "Recalculate All";
      }
    });
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _recalculateAllRecords
   Triggers pipeline_wikipedia.py for all records that have search terms.
   Calls POST /api/admin/agent/run with action=wikipedia_pipeline.
----------------------------------------------------------------------------- */
async function _recalculateAllRecords() {
  try {
    const response = await fetch("/api/admin/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline: "wikipedia_pipeline",
        slug: "",
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(function () {
        return {};
      });
      throw new Error(
        errData.error || "Agent run failed with status " + response.status,
      );
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Wikipedia pipeline started. Reloading list...");
    }

    // Reload the list after a short delay for the pipeline to process
    setTimeout(async function () {
      if (typeof window.displayWikipediaList === "function") {
        await window.displayWikipediaList();
      }
    }, 3000);
  } catch (err) {
    console.error("[dashboard_wikipedia] Recalculate all failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to trigger Wikipedia pipeline. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderWikipedia = renderWikipedia;
