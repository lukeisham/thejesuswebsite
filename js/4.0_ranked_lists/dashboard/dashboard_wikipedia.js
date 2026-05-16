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
       4. WIRE FUNCTION BAR BUTTONS — Save Draft, Publish, Delete, Gather, Calculate
    ------------------------------------------------------------------------- */
  _wireActionButtons();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Save Draft, Publish, Delete, Gather, and Calculate
   buttons in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
  // Save Draft — collects sidebar state (weights, terms, slug, snippet, metadata)
  // and PUTs with status: 'draft' WITHOUT triggering a re-rank.
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
  if (btnPublish && typeof window.publishWikipediaRankings === "function") {
    btnPublish.addEventListener("click", async function () {
      btnPublish.disabled = true;
      btnPublish.textContent = "Publishing…";
      try {
        await window.publishWikipediaRankings();
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
      const state = window._wikipediaModuleState;
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
        if (typeof window.displayWikipediaList === "function") {
          await window.displayWikipediaList();
        }
      } catch (err) {
        console.error("[dashboard_wikipedia] Delete failed:", err);
        if (typeof window.surfaceError === "function") {
          window.surfaceError("Error: Failed to delete record.");
        }
      } finally {
        btnDelete.disabled = false;
        btnDelete.textContent = "Delete";
      }
    });
  }

  // Gather — trigger pipeline for all records (shared gather tool)
  const btnGather = document.getElementById("btn-gather");
  if (btnGather) {
    btnGather.addEventListener("click", async function () {
      btnGather.disabled = true;
      btnGather.textContent = "Gathering…";
      try {
        if (typeof window.triggerGather === "function") {
          await window.triggerGather("wikipedia_pipeline", "");
        } else {
          // Fallback: call pipeline directly
          await _recalculateAllRecords();
        }
      } finally {
        btnGather.disabled = false;
        btnGather.textContent = "Gather";
      }
    });
  }

  // Calculate — re-rank list using saved weights, then set ALL records to draft
  const btnCalculate = document.getElementById("btn-calculate");
  if (btnCalculate && typeof window.refreshWikipediaRankings === "function") {
    btnCalculate.addEventListener("click", async function () {
      btnCalculate.disabled = true;
      btnCalculate.textContent = "Calculating…";
      try {
        await window.refreshWikipediaRankings();
        // Default-to-draft: set ALL affected records to draft
        await _setAllRecordsToDraft();
      } finally {
        btnCalculate.disabled = false;
        btnCalculate.textContent = "Calculate";
      }
    });
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleSaveDraft
   Collects the current sidebar state (weights, search terms, slug, snippet,
   metadata) and PUTs it with status: 'draft' WITHOUT triggering a re-rank.
----------------------------------------------------------------------------- */
async function _handleSaveDraft() {
  const state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No record selected. Select a record to save.");
    }
    return;
  }

  const payload = { status: "draft" };

  // Collect slug and snippet from metadata widget
  if (typeof window.collectMetadataWidget === "function") {
    const metaData = window.collectMetadataWidget(
      "wikipedia-metadata-container",
    );
    payload.slug = metaData.slug || state.activeRecordSlug;
    payload.snippet = metaData.snippet || state.activeRecordSnippet;
    payload.metadata_json = metaData.metadata_json || state.activeRecordMeta;
  }

  // Collect search terms from the textarea
  const termsInput = document.getElementById("wikipedia-search-terms-input");
  if (termsInput && termsInput.value.trim()) {
    payload.wikipedia_search_terms = JSON.stringify(
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
    console.error("[dashboard_wikipedia] Save draft failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to save draft.");
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _recalculateAllRecords
   Triggers pipeline_wikipedia.py for all records that have search terms.
   Calls POST /api/admin/agent/run with pipeline=wikipedia_pipeline.
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
      window.surfaceError("Wikipedia pipeline running — list will refresh automatically...");
    }

    setTimeout(async function () {
      if (typeof window.displayWikipediaList === "function") {
        await window.displayWikipediaList();
      }
    }, 10000);
  } catch (err) {
    console.error("[dashboard_wikipedia] Gather failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to trigger Wikipedia pipeline. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setAllRecordsToDraft
   After Calculate (re-rank), sets ALL affected records in the list to
   status: 'draft' — the "default to draft" rule. Even previously published
   records revert to draft after a re-rank.
----------------------------------------------------------------------------- */
async function _setAllRecordsToDraft() {
  const state = window._wikipediaModuleState;
  const records = state.wikipediaRecords;
  if (!records || records.length === 0) return;

  const updates = records.map(function (record) {
    return {
      slug: record.slug,
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
    console.warn("[dashboard_wikipedia] Default-to-draft batch failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderWikipedia = renderWikipedia;
