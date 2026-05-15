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
  _wireActionButtons();

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
  if (!state.activeRecordSlug) return;

  // If no data provided, collect it from the widget
  if (!data) {
    data = window.collectMetadataWidget("metadata-widget-container");
  }

  try {
    const response = await fetch("/api/admin/records/" + encodeURIComponent(state.activeRecordSlug), {
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
   Binds click handlers to Save Draft, Publish, Delete, Gather, Calculate,
   and Insert Response buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
  // Save Draft — collects sidebar state and PUTs with status: 'draft'
  // WITHOUT triggering a re-rank.
  const btnSaveDraft = document.getElementById("btn-save-draft");
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", async function () {
      btnSaveDraft.disabled = true;
      btnSaveDraft.textContent = "Saving…";
      try {
        await _handleSaveDraft();
      } finally {
        btnSaveDraft.disabled = false;
        btnSaveDraft.textContent = "Save Draft";
      }
    });
  }

  // Publish — commit ranked order to live site
  const btnPublish = document.getElementById("btn-publish");
  if (btnPublish && typeof window.publishChallengeRankings === "function") {
    btnPublish.addEventListener("click", async function () {
      btnPublish.disabled = true;
      btnPublish.textContent = "Publishing…";
      try {
        await window.publishChallengeRankings();
      } finally {
        btnPublish.disabled = false;
        btnPublish.textContent = "Publish";
      }
    });
  }

  // Delete — prompt and delete the selected record
  const btnDelete = document.getElementById("btn-delete");
  if (btnDelete) {
    btnDelete.addEventListener("click", async function () {
      const state = window._challengeModuleState;
      if (!state.activeRecordId) {
        if (typeof window.surfaceError === "function") {
          window.surfaceError("No record selected. Select a record to delete.");
        }
        return;
      }
      const confirmed = confirm(
        'Are you sure you want to delete "' + state.activeRecordTitle + '"?',
      );
      if (!confirmed) return;
      btnDelete.disabled = true;
      btnDelete.textContent = "Deleting…";
      try {
        const response = await fetch(
          "/api/admin/records/" + encodeURIComponent(state.activeRecordId),
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("HTTP " + response.status);
        if (typeof window.surfaceError === "function") {
          window.surfaceError('Deleted: "' + state.activeRecordTitle + '"');
        }
        if (typeof window.displayChallengeList === "function") {
          await window.displayChallengeList(state.mode);
        }
      } catch (err) {
        console.error("[dashboard_challenge_academic] Delete failed:", err);
        if (typeof window.surfaceError === "function") {
          window.surfaceError("Error: Failed to delete record.");
        }
      } finally {
        btnDelete.disabled = false;
        btnDelete.textContent = "Delete";
      }
    });
  }

  // Gather — trigger pipeline for selected record (shared gather tool)
  const btnGather = document.getElementById("btn-gather");
  if (btnGather) {
    btnGather.addEventListener("click", async function () {
      btnGather.disabled = true;
      btnGather.textContent = "Gathering…";
      try {
        if (typeof window.triggerGather === "function") {
          await window.triggerGather(
            window._challengeModuleState.mode === "academic"
              ? "academic_challenges"
              : "popular_challenges",
            window._challengeModuleState.activeRecordSlug || "",
          );
        } else if (typeof window.triggerAgentSearch === "function") {
          await window.triggerAgentSearch();
        }
      } finally {
        btnGather.disabled = false;
        btnGather.textContent = "Gather";
      }
    });
  }

  // Calculate — re-rank list using saved weights, then set ALL records to draft
  const btnCalculate = document.getElementById("btn-calculate");
  if (btnCalculate && typeof window.refreshChallengeRankings === "function") {
    btnCalculate.addEventListener("click", async function () {
      btnCalculate.disabled = true;
      btnCalculate.textContent = "Calculating…";
      try {
        await window.refreshChallengeRankings();
        // Default-to-draft: set ALL affected records to draft
        await _setAllRecordsToDraft();
      } finally {
        btnCalculate.disabled = false;
        btnCalculate.textContent = "Calculate";
      }
    });
  }

  // Insert Response — create new response linked to selected challenge
  const btnInsertResponse = document.getElementById(
    "btn-challenge-insert-response",
  );
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
   INTERNAL: _handleSaveDraft
   Collects current sidebar state (search terms, weighting criteria) and
   PUTs with status: 'draft' WITHOUT triggering a re-rank.
----------------------------------------------------------------------------- */
async function _handleSaveDraft() {
  const state = window._challengeModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No record selected. Select a record to save.");
    }
    return;
  }

  const payload = { status: "draft" };

  // Collect slug and snippet from metadata widget
  if (typeof window.collectMetadataWidget === "function") {
    const metaData = window.collectMetadataWidget("metadata-widget-container");
    payload.slug = metaData.slug || state.activeRecordSlug;
    payload.snippet = metaData.snippet || "";
    payload.metadata_json = metaData.metadata_json || "";
  }

  // Collect search terms from the textarea
  const termsInput = document.getElementById("challenge-search-terms-input");
  if (termsInput && termsInput.value.trim()) {
    const mode = state.mode;
    const searchTermCol =
      mode === "academic"
        ? "academic_challenge_search_term"
        : "popular_challenge_search_term";
    payload[searchTermCol] = JSON.stringify(
      termsInput.value
        .split(/[\n,]+/)
        .map(function (t) {
          return t.trim();
        })
        .filter(function (t) {
          return t.length > 0;
        }),
    );
  }

  try {
    const response = await fetch(
      "/api/admin/records/" + encodeURIComponent(state.activeRecordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error("HTTP " + response.status);

    if (typeof window.surfaceError === "function") {
      window.surfaceError('Draft saved: "' + state.activeRecordTitle + '"');
    }
  } catch (err) {
    console.error("[dashboard_challenge_academic] Save draft failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to save draft.");
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setAllRecordsToDraft
   After Calculate (re-rank), sets ALL affected records in the list to
   status: 'draft' — the "default to draft" rule.
----------------------------------------------------------------------------- */
async function _setAllRecordsToDraft() {
  const state = window._challengeModuleState;
  const challenges = state.challenges;
  if (!challenges || challenges.length === 0) return;

  const updates = challenges.map(function (challenge) {
    return {
      slug: challenge.slug,
      data: { status: "draft" },
    };
  });

  try {
    await fetch("/api/admin/records/batch", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.warn(
      "[dashboard_challenge_academic] Default-to-draft batch failed:",
      err,
    );
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.renderChallengeAcademic = renderChallengeAcademic;
