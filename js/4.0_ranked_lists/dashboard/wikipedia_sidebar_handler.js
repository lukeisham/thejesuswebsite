// Trigger:  Called by wikipedia_list_display.js → window.populateWikipediaSidebar()
//           when a Wikipedia row is selected.
//           Also called by dashboard_wikipedia.js → window.initWikipediaSidebar()
//           on module initialisation to set up empty sidebar state.
// Main:    populateWikipediaSidebar(record) — populates all sidebar sections
//           with the selected record's data. Handles weight editing via a
//           single criteria row (matching Challenge styling), search terms
//           via textarea (matching Challenge styling), metadata editing,
//           auto-gen buttons, and per-record recalculate trigger.
// Output:  Fully interactive record detail sidebar with Challenge-consistent
//          visual styling. Errors routed through window.surfaceError().

"use strict";

/* --- Metadata Save Callback --- */
async function _saveMetadataFromWidget(data) {
  var state = window._wikipediaModuleState;
  if (!state.activeRecordId) return;

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
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
    state.activeRecordSnippet = data.snippet;
    state.activeRecordMeta = data.metadata_json;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Metadata saved for '" + state.activeRecordTitle + "'.");
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Metadata save failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initWikipediaSidebar
   Initialises the sidebar in its empty/default state. Wires up the weight
   criterion input (auto-save on change), search terms textarea (auto-save),
   and standardized metadata widget. Called once on module load.
----------------------------------------------------------------------------- */
function initWikipediaSidebar() {
  _clearSidebar();

  // Wire recalculate button (unique to Wikipedia)
  var recalcBtn = document.getElementById("btn-wikipedia-recalculate-record");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", _handleRecalculateRecord);
  }

  // Initialise standardized metadata widget
  if (typeof window.renderMetadataWidget === 'function') {
    window.renderMetadataWidget('wikipedia-metadata-container', {
      onAutoSaveDraft: _saveMetadataFromWidget,
      getRecordTitle: function() { return window._wikipediaModuleState.activeRecordTitle; },
      getRecordId: function() { return window._wikipediaModuleState.activeRecordSlug; }
    });

    // Also wire manual blur save for the widget's inputs (if they exist yet)
    var container = document.getElementById('wikipedia-metadata-container');
    if (container) {
      container.addEventListener('focusout', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          var data = window.collectMetadataWidget('wikipedia-metadata-container');
          _saveMetadataFromWidget(data);
        }
      });
    }
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: populateWikipediaSidebar
   Populates all sidebar sections with the selected record's data.
   Matches Challenge styling: single weight criterion row + textarea terms.
----------------------------------------------------------------------------- */
function populateWikipediaSidebar(record) {
  if (!record) return;

  var state = window._wikipediaModuleState;

  // Section 1: Record Info
  var titleEl = document.getElementById("wikipedia-record-title");
  var slugEl = document.getElementById("wikipedia-record-slug");
  if (titleEl) titleEl.textContent = record.title || "\u2014";
  if (slugEl) slugEl.textContent = record.slug || "\u2014";

  // Section 2: Wikipedia Weight — delegate to wikipedia_weights.js
  if (typeof window.loadWikipediaWeights === 'function') {
    window.loadWikipediaWeights(record);
  }

  // Section 3: Search Terms — delegate to wikipedia_search_terms.js
  if (typeof window.loadWikipediaSearchTerms === 'function') {
    window.loadWikipediaSearchTerms(record);
  }

  // Section 4: Metadata (via widget)
  if (typeof window.populateMetadataWidget === 'function') {
    window.populateMetadataWidget('wikipedia-metadata-container', {
      slug: record.slug,
      snippet: record.snippet,
      metadata_json: record.metadata_json
    });
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
   Resets all sidebar sections to empty/default state.
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("wikipedia-record-title");
  var slugEl = document.getElementById("wikipedia-record-slug");

  if (titleEl) titleEl.textContent = "\u2014";
  if (slugEl) slugEl.textContent = "\u2014";

  // Clear metadata widget
  if (typeof window.populateMetadataWidget === 'function') {
    window.populateMetadataWidget('wikipedia-metadata-container', null);
  }

  // Clear weighting list and search terms textarea
  var weightingList = document.getElementById("wikipedia-weighting-list");
  if (weightingList) weightingList.innerHTML = "";

  var termsInput = document.getElementById("wikipedia-search-terms-input");
  if (termsInput) termsInput.value = "";

  // Clear the saved search terms overview
  var overviewList = document.getElementById(
    "wikipedia-search-terms-overview-list",
  );
  if (overviewList) overviewList.innerHTML = "";
}



/* -----------------------------------------------------------------------------
   HANDLER: _handleRecalculateRecord (unique to Wikipedia)
----------------------------------------------------------------------------- */
async function _handleRecalculateRecord() {
  var state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No record selected. Select a record to recalculate.",
      );
    }
    return;
  }

  var btn = document.getElementById("btn-wikipedia-recalculate-record");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Recalculating...";
  }

  try {
    var response = await fetch("/api/admin/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline: "wikipedia_pipeline",
        slug: state.activeRecordSlug,
      }),
    });

    if (!response.ok) {
      var errData = await response.json().catch(function () {
        return {};
      });
      throw new Error(
        errData.error || "API responded with status " + response.status,
      );
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Recalculate triggered for '" +
          state.activeRecordTitle +
          "'. Reloading...",
      );
    }

    setTimeout(async function () {
      if (typeof window.displayWikipediaList === "function") {
        await window.displayWikipediaList();
      }
    }, 3000);
  } catch (err) {
    console.error("[wikipedia_sidebar] Recalculate failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Recalculate failed for '" +
          state.activeRecordTitle +
          "'. Pipeline did not respond.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Recalculate This Record";
    }
  }
}

window.initWikipediaSidebar = initWikipediaSidebar;
window.populateWikipediaSidebar = populateWikipediaSidebar;
