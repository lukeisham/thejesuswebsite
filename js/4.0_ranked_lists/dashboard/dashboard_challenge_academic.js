// Trigger:  window.loadModule("challenge-academic") → dashboard_app.js calls
//           window.renderChallengeAcademic()
// Main:    renderChallengeAcademic() — injects the academic challenge editor
//           HTML, sets the Providence canvas layout, initialises the weighting
//           handler, list display, ranking calculator, and insert response
//           handler, wires action bar buttons, and loads the academic
//           challenge list.
// Output:  Fully functional Academic Challenge dashboard editor in the
//          Providence work canvas. Mode is hardcoded to "academic" — no toggle,
//          no state switching. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — flat, single-mode state with no toggle logic
----------------------------------------------------------------------------- */
window._challengeModuleState = {
  mode: "academic",

  // Active record tracking
  activeRecordId: null,
  activeRecordTitle: "",
  activeRecordSlug: "",

  // Challenge data storage
  challenges: [],

  // Active weighting criteria
  weightingCriteria: [],
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderChallengeAcademic
   Called by dashboard_app.js when the user navigates to the Academic
   Challenges module.
   1. Sets the Providence canvas layout (sidebar + main).
   2. Fetches and injects the academic challenge editor HTML.
   3. Initialises all sub-modules in dependency order.
   4. Wires action bar buttons.
   5. Loads the academic challenge list.
----------------------------------------------------------------------------- */
async function renderChallengeAcademic() {
  /* -------------------------------------------------------------------------
       1. SET LAYOUT — sidebar + main columns
    ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the academic challenge editor template
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch(
      "/admin/frontend/dashboard_challenge_academic.html",
    );
    if (!response.ok) {
      throw new Error(
        "Failed to load academic challenge editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const functionBar = doc.getElementById("challenge-function-bar");
    const sidebar = doc.getElementById("challenge-sidebar");
    const listArea = doc.getElementById("challenge-list-area");

    // --- Inject into Providence Canvas ---
    if (typeof window._setColumn === "function") {
      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      } else {
        console.warn(
          "[dashboard_challenge_academic.js] #challenge-sidebar not found in template.",
        );
      }

      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (listArea) mainHtml += listArea.outerHTML;

      if (mainHtml) {
        window._setColumn("main", mainHtml);
      } else {
        console.warn(
          "[dashboard_challenge_academic.js] Main content elements missing in template.",
        );
      }
    } else {
      console.error(
        "[dashboard_challenge_academic.js] window._setColumn utility missing. Injection failed.",
      );
    }
  } catch (err) {
    console.error("[dashboard_challenge_academic] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Academic Challenge editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
    ------------------------------------------------------------------------- */

  // Reset state
  window._challengeModuleState.mode = "academic";
  window._challengeModuleState.activeRecordId = null;
  window._challengeModuleState.activeRecordTitle = "";
  window._challengeModuleState.activeRecordSlug = "";
  window._challengeModuleState.weightingCriteria = [];

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._challengeModuleState.activeRecordTitle;

  // 3a. Initialise the weighting handler (sidebar)
  try {
    if (typeof window.initChallengeWeighting === "function") {
      window.initChallengeWeighting();
    }
  } catch (e) {
    console.error(
      "[dashboard_challenge_academic.js] initChallengeWeighting failed:",
      e,
    );
  }

  // 3b. Refresh overview lists for academic mode
  try {
    _refreshAcademicOverviews("academic");
  } catch (e) {
    console.error(
      "[dashboard_challenge_academic.js] _refreshAcademicOverviews failed:",
      e,
    );
  }

  /* -------------------------------------------------------------------------
       4. WIRE ACTION BAR BUTTONS
    ------------------------------------------------------------------------- */
  _wireAcademicActionButtons();

  /* -------------------------------------------------------------------------
       5. LOAD ACADEMIC CHALLENGE LIST
    ------------------------------------------------------------------------- */
  try {
    if (typeof window.displayChallengeList === "function") {
      await window.displayChallengeList("academic");
    }
  } catch (e) {
    console.error(
      "[dashboard_challenge_academic.js] displayChallengeList failed:",
      e,
    );
  }

  // 6. Initialise insert response handler
  try {
    if (typeof window.initInsertChallengeResponse === "function") {
      window.initInsertChallengeResponse();
    }
  } catch (e) {
    console.error(
      "[dashboard_challenge_academic.js] initInsertChallengeResponse failed:",
      e,
    );
  }

  // 7. INITIALISE SHARED TOOLS — Metadata widget + footer
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        await _saveAcademicChallengeRecord(recordData);
      },
      getRecordTitle: function () {
        return window._challengeModuleState.activeRecordTitle;
      },
      getRecordId: function () {
        return window._challengeModuleState.activeRecordSlug;
      },
    });

    // Also wire manual blur save for the widget's inputs
    const container = document.getElementById("metadata-widget-container");
    if (container) {
      container.addEventListener("focusout", function (e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          const data = window.collectMetadataWidget(
            "metadata-widget-container",
          );
          _saveAcademicChallengeRecord(data);
        }
      });
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _saveChallengeRecord
   Saves metadata (slug, snippet, keywords) for the active challenge record.
----------------------------------------------------------------------------- */
async function _saveAcademicChallengeRecord(data) {
  const state = window._challengeModuleState;
  if (!state.activeRecordId) return;

  // If no data provided, collect it from the widget
  if (!data) {
    data = window.collectMetadataWidget("metadata-widget-container");
  }

  try {
    const response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: data.slug,
        snippet: data.snippet,
        metadata_json: data.metadata_json,
        status: "draft",
      }),
    });

    if (!response.ok) throw new Error("Save failed");

    // Update local state
    state.activeRecordSlug = data.slug;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Metadata saved for '" + state.activeRecordTitle + "'.",
      );
    }
  } catch (err) {
    console.error("[dashboard_challenge_academic] Metadata save failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _refreshOverviews
   Calls the academic-mode overview renderers for search terms and ranking
   weights.
----------------------------------------------------------------------------- */
function _refreshAcademicOverviews(mode) {
  if (mode === "academic") {
    if (typeof window.renderAcademicSearchTermsOverview === "function") {
      window.renderAcademicSearchTermsOverview();
    }
    if (typeof window.renderAcademicRankingWeightsOverview === "function") {
      window.renderAcademicRankingWeightsOverview();
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Refresh, Publish, Agent Search, and Insert Response
   buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireAcademicActionButtons() {
  const btnRefresh = document.getElementById("btn-challenge-refresh");
  const btnPublish = document.getElementById("btn-challenge-publish");
  const btnAgentSearch = document.getElementById("btn-challenge-agent-search");
  const btnInsertResponse = document.getElementById(
    "btn-challenge-insert-response",
  );

  // Refresh — recalculate rankings
  if (btnRefresh && typeof window.refreshChallengeRankings === "function") {
    btnRefresh.addEventListener("click", async function () {
      btnRefresh.disabled = true;
      btnRefresh.textContent = "Refreshing...";
      try {
        await window.refreshChallengeRankings();
      } finally {
        btnRefresh.disabled = false;
        btnRefresh.textContent = "Refresh";
      }
    });
  }

  // Publish — commit ranked order to live site
  if (btnPublish && typeof window.publishChallengeRankings === "function") {
    btnPublish.addEventListener("click", async function () {
      btnPublish.disabled = true;
      btnPublish.textContent = "Publishing...";
      try {
        await window.publishChallengeRankings();
      } finally {
        btnPublish.disabled = false;
        btnPublish.textContent = "Publish";
      }
    });
  }

  // Agent Search — trigger pipeline for selected record
  if (btnAgentSearch && typeof window.triggerAgentSearch === "function") {
    btnAgentSearch.addEventListener("click", async function () {
      btnAgentSearch.disabled = true;
      btnAgentSearch.textContent = "Searching...";
      try {
        await window.triggerAgentSearch();
      } finally {
        btnAgentSearch.disabled = false;
        btnAgentSearch.textContent = "Agent Search";
      }
    });
  }

  // Insert Response — create new response linked to selected challenge
  if (
    btnInsertResponse &&
    typeof window.insertChallengeResponse === "function"
  ) {
    btnInsertResponse.addEventListener("click", function () {
      window.insertChallengeResponse();
    });
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.renderChallengeAcademic = renderChallengeAcademic;
