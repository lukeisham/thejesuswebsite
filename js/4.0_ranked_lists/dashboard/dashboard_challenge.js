// Trigger:  window.loadModule("challenge") → dashboard_app.js calls
//           window.renderChallenge()
// Main:    renderChallenge() — injects the challenge editor HTML, sets the
//           Providence canvas layout, initialises the weighting handler, list
//           display, ranking calculator, and insert response handler, wires the
//           Academic/Popular toggle (now shows/hides dual pre-loaded containers),
//           and loads both challenge lists in parallel on init.
// Output:  Fully functional Challenge dashboard editor in the Providence work
//          canvas with independent Academic and Popular list state. Errors
//          routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._challengeModuleState = {
  mode: "academic", // 'academic' | 'popular'

  // Per-mode active record tracking — each list retains its own selection
  academicActiveRecordId: null,
  popularActiveRecordId: null,
  academicActiveRecordTitle: "",
  popularActiveRecordTitle: "",
  academicActiveRecordSlug: "",
  popularActiveRecordSlug: "",

  // Convenience getters/setters — sub-modules read/write these; they route to
  // the correct per-mode slot based on the current mode value.
  get activeRecordId() {
    return this.mode === "academic"
      ? this.academicActiveRecordId
      : this.popularActiveRecordId;
  },
  set activeRecordId(val) {
    if (this.mode === "academic") {
      this.academicActiveRecordId = val;
    } else {
      this.popularActiveRecordId = val;
    }
  },
  get activeRecordTitle() {
    return this.mode === "academic"
      ? this.academicActiveRecordTitle
      : this.popularActiveRecordTitle;
  },
  set activeRecordTitle(val) {
    if (this.mode === "academic") {
      this.academicActiveRecordTitle = val;
    } else {
      this.popularActiveRecordTitle = val;
    }
  },
  get activeRecordSlug() {
    return this.mode === "academic"
      ? this.academicActiveRecordSlug
      : this.popularActiveRecordSlug;
  },
  set activeRecordSlug(val) {
    if (this.mode === "academic") {
      this.academicActiveRecordSlug = val;
    } else {
      this.popularActiveRecordSlug = val;
    }
  },

  // Direct-access storage for sub-modules
  challenges: [],

  // Active weighting criteria for the CURRENT mode's UI
  weightingCriteria: [],

  // Per-mode weighting + search term cache (saved on toggle, restored on return)
  academicWeightingCriteria: [],
  popularWeightingCriteria: [],
  academicSearchTerms: "",
  popularSearchTerms: "",
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderChallenge
   Called by dashboard_app.js when the user navigates to the Challenge module.
   1. Sets the Providence canvas layout (full-width, no sidebar).
   2. Fetches and injects the challenge editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Loads BOTH challenge lists in parallel so each is pre-loaded.
   5. Wires the Academic/Popular toggle buttons and action bar.
----------------------------------------------------------------------------- */
async function renderChallenge() {
  /* -------------------------------------------------------------------------
       1. SET LAYOUT — We use our own internal split-pane, so collapse the
          Providence sidebar and use the full main column.
    ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the challenge editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/admin/frontend/dashboard_challenge.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load challenge editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("challenge-function-bar");
      const sidebar = doc.getElementById("challenge-sidebar");
      const listArea = doc.getElementById("challenge-list-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }
      
      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (listArea) mainHtml += listArea.outerHTML;
      
      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error("[dashboard_challenge] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Challenge editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes a function on window. We call them in dependency
       order after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

  // 3a. Initialise per-mode state (default: academic visible)
  window._challengeModuleState.mode = "academic";
  window._challengeModuleState.academicActiveRecordId = null;
  window._challengeModuleState.academicActiveRecordTitle = "";
  window._challengeModuleState.academicActiveRecordSlug = "";
  window._challengeModuleState.popularActiveRecordId = null;
  window._challengeModuleState.popularActiveRecordTitle = "";
  window._challengeModuleState.popularActiveRecordSlug = "";
  window._challengeModuleState.academicWeightingCriteria = [];
  window._challengeModuleState.popularWeightingCriteria = [];
  window._challengeModuleState.academicSearchTerms = "";
  window._challengeModuleState.popularSearchTerms = "";

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._challengeModuleState.activeRecordTitle;

  // 3b. Initialise the weighting handler (sidebar)
  if (typeof window.initChallengeWeighting === "function") {
    window.initChallengeWeighting();
  }

  // 3b2. Initialise the overview lists for the default mode (academic)
  _refreshOverviews("academic");

  // 3c. Load BOTH challenge lists in parallel so each is pre-loaded.
  //     The Popular region is hidden (aria-hidden="true") but its DOM is ready.
  if (typeof window.displayChallengeList === "function") {
    await Promise.all([
      window.displayChallengeList("academic"),
      window.displayChallengeList("popular"),
    ]);
  }

  // 3d. Initialise insert response handler
  if (typeof window.initInsertChallengeResponse === "function") {
    window.initInsertChallengeResponse();
  }

  /* -------------------------------------------------------------------------
       4. WIRE TOGGLE BUTTONS — Academic / Popular switch
       Now swaps aria-hidden on the two list regions instead of re-fetching.
       Saves/restores per-mode weighting and search term state.
    ------------------------------------------------------------------------- */
  _wireToggleButtons();

  /* -------------------------------------------------------------------------
       5. WIRE ACTION BAR BUTTONS — Refresh, Publish, Agent Search, Insert Response
    ------------------------------------------------------------------------- */
  _wireActionButtons();

  // 6. INITIALISE SHARED TOOLS — Metadata widget + footer
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        await _saveChallengeRecord(recordData);
      },
      getRecordTitle: function () {
        return window._challengeModuleState.activeRecordTitle;
      },
      getRecordId: function () {
        return window._challengeModuleState.activeRecordSlug;
      },
    });

    // Also wire manual blur save for the widget's inputs
    const container = document.getElementById('metadata-widget-container');
    if (container) {
      container.addEventListener('focusout', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          const data = window.collectMetadataWidget('metadata-widget-container');
          _saveChallengeRecord(data);
        }
      });
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _saveChallengeRecord
   Saves metadata (slug, snippet, keywords) for the active challenge record.
----------------------------------------------------------------------------- */
async function _saveChallengeRecord(data) {
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
        status: "draft"
      }),
    });

    if (!response.ok) throw new Error("Save failed");

    // Update local state
    state.activeRecordSlug = data.slug;
    
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Metadata saved for '" + state.activeRecordTitle + "'.");
    }
  } catch (err) {
    console.error("[dashboard_challenge] Metadata save failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireToggleButtons
   Binds click handlers to the Academic and Popular toggle buttons.
   Swaps aria-hidden on the two list regions (show/hide pre-loaded containers)
   instead of re-fetching data. Saves the outgoing mode's weighting criteria
   and search terms to per-mode cache, then restores the incoming mode's state
   (or loads defaults if no saved state exists).
----------------------------------------------------------------------------- */
function _wireToggleButtons() {
  const btnAcademic = document.getElementById("btn-toggle-academic");
  const btnPopular = document.getElementById("btn-toggle-popular");

  if (!btnAcademic || !btnPopular) return;

  btnAcademic.addEventListener("click", async function () {
    if (window._challengeModuleState.mode === "academic") return;

    // 1. Save outgoing popular state to per-mode cache
    _saveCurrentModeState();

    // 2. Switch mode
    window._challengeModuleState.mode = "academic";

    // 3. Show Academic region, hide Popular region
    _showListRegion("academic");
    _hideListRegion("popular");

    // 4. Update toggle button states
    btnAcademic.classList.add("btn--toggle-active");
    btnAcademic.setAttribute("aria-pressed", "true");
    btnPopular.classList.remove("btn--toggle-active");
    btnPopular.setAttribute("aria-pressed", "false");

    // 5. Restore incoming academic state (or load defaults)
    _restoreModeState("academic");

    // 6. Update search terms label
    const labelEl = document.getElementById(
      "challenge-search-terms-field-label",
    );
    if (labelEl) labelEl.textContent = "Academic";
  });

  btnPopular.addEventListener("click", async function () {
    if (window._challengeModuleState.mode === "popular") return;

    // 1. Save outgoing academic state to per-mode cache
    _saveCurrentModeState();

    // 2. Switch mode
    window._challengeModuleState.mode = "popular";

    // 3. Show Popular region, hide Academic region
    _showListRegion("popular");
    _hideListRegion("academic");

    // 4. Update toggle button states
    btnPopular.classList.add("btn--toggle-active");
    btnPopular.setAttribute("aria-pressed", "true");
    btnAcademic.classList.remove("btn--toggle-active");
    btnAcademic.setAttribute("aria-pressed", "false");

    // 5. Restore incoming popular state (or load defaults)
    _restoreModeState("popular");

    // 6. Update search terms label
    const labelEl = document.getElementById(
      "challenge-search-terms-field-label",
    );
    if (labelEl) labelEl.textContent = "Popular";
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _saveCurrentModeState
   Reads the current sidebar weighting criteria and search terms textarea value
   and saves them to the per-mode cache for the currently active mode.
----------------------------------------------------------------------------- */
function _saveCurrentModeState() {
  const mode = window._challengeModuleState.mode;

  // Save weighting criteria
  const currentCriteria = window._challengeModuleState.weightingCriteria || [];
  if (mode === "academic") {
    window._challengeModuleState.academicWeightingCriteria =
      currentCriteria.slice();
  } else {
    window._challengeModuleState.popularWeightingCriteria =
      currentCriteria.slice();
  }

  // Save search terms
  const termsInput = document.getElementById("challenge-search-terms-input");
  const termsValue = termsInput ? termsInput.value : "";
  if (mode === "academic") {
    window._challengeModuleState.academicSearchTerms = termsValue;
  } else {
    window._challengeModuleState.popularSearchTerms = termsValue;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _restoreModeState
   Restores the weighting criteria and search terms for the given mode from
   the per-mode cache. If no saved state exists, loads defaults via
   reloadChallengeWeighting.
----------------------------------------------------------------------------- */
function _restoreModeState(mode) {
  var savedCriteria;
  var savedSearchTerms;

  if (mode === "academic") {
    savedCriteria = window._challengeModuleState.academicWeightingCriteria;
    savedSearchTerms = window._challengeModuleState.academicSearchTerms;
  } else {
    savedCriteria = window._challengeModuleState.popularWeightingCriteria;
    savedSearchTerms = window._challengeModuleState.popularSearchTerms;
  }

  // Restore weighting criteria (or load defaults if empty)
  if (savedCriteria && savedCriteria.length > 0) {
    window._challengeModuleState.weightingCriteria = savedCriteria.slice();
    if (typeof window._renderWeightingListExposed === "function") {
      window._renderWeightingListExposed();
    }
  } else {
    // No saved state — load defaults
    if (typeof window.reloadChallengeWeighting === "function") {
      window.reloadChallengeWeighting(mode);
    }
  }

  // Restore search terms (or leave empty if nothing saved)
  var termsInput = document.getElementById("challenge-search-terms-input");
  if (termsInput) {
    termsInput.value = savedSearchTerms || "";
  }

  // Refresh the read-only overview lists for this mode
  _refreshOverviews(mode);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _showListRegion / _hideListRegion
   Toggle aria-hidden on the dual list regions to show/hide pre-loaded lists.
----------------------------------------------------------------------------- */
function _showListRegion(mode) {
  var regionId = mode + "-challenge-list-region";
  var region = document.getElementById(regionId);
  if (region) {
    region.setAttribute("aria-hidden", "false");
    region.classList.add("challenge-list-region--active");
  }
}

function _hideListRegion(mode) {
  var regionId = mode + "-challenge-list-region";
  var region = document.getElementById(regionId);
  if (region) {
    region.setAttribute("aria-hidden", "true");
    region.classList.remove("challenge-list-region--active");
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _refreshOverviews
   Calls the appropriate per-mode overview renderers for search terms and
   ranking weights. Used after toggle, init, and row selection.
----------------------------------------------------------------------------- */
function _refreshOverviews(mode) {
  if (mode === "academic") {
    if (typeof window.renderAcademicSearchTermsOverview === "function") {
      window.renderAcademicSearchTermsOverview();
    }
  } else {
    if (typeof window.renderPopularSearchTermsOverview === "function") {
      window.renderPopularSearchTermsOverview();
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Refresh, Publish, Agent Search, and Insert Response
   buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
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
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderChallenge = renderChallenge;
