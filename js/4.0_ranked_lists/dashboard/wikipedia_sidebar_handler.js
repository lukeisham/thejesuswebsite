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

// ---------------------------------------------------------------------------|
// Config for shared admin_core functions — Wikipedia-specific element IDs    |
// ---------------------------------------------------------------------------|
var _wpSnippetConfig = {
  snippetInputId: "wikipedia-snippet-input",
  spinnerBtnId: "btn-wikipedia-auto-snippet",
};
var _wpSlugConfig = { slugInputId: "wikipedia-slug-input" };
var _wpMetaConfig = {
  metaInputId: "wikipedia-meta-input",
  spinnerBtnId: "btn-wikipedia-auto-meta",
};
var _wpSaveMetaConfig = {
  snippetInputId: "wikipedia-snippet-input",
  slugInputId: "wikipedia-slug-input",
  metaInputId: "wikipedia-meta-input",
  stateFieldMap: {
    snippet: "activeRecordSnippet",
    slug: "activeRecordSlug",
    meta: "activeRecordMeta",
  },
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initWikipediaSidebar
   Initialises the sidebar in its empty/default state. Wires up the weight
   criterion input (auto-save on change), search terms textarea (auto-save),
   auto-gen buttons, and recalculate button. Called once on module load.
----------------------------------------------------------------------------- */
function initWikipediaSidebar() {
  _clearSidebar();

  // Wire recalculate button (unique to Wikipedia)
  var recalcBtn = document.getElementById("btn-wikipedia-recalculate-record");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", _handleRecalculateRecord);
  }

  // Wire auto-gen buttons → shared
  var autoSnippetBtn = document.getElementById("btn-wikipedia-auto-snippet");
  if (autoSnippetBtn) {
    autoSnippetBtn.addEventListener("click", function () {
      window.triggerAutoGenSnippet(
        window._wikipediaModuleState,
        _wpSnippetConfig,
      );
    });
  }

  var autoSlugBtn = document.getElementById("btn-wikipedia-auto-slug");
  if (autoSlugBtn) {
    autoSlugBtn.addEventListener("click", function () {
      window.triggerAutoGenSlug(window._wikipediaModuleState, _wpSlugConfig);
    });
  }

  var autoMetaBtn = document.getElementById("btn-wikipedia-auto-meta");
  if (autoMetaBtn) {
    autoMetaBtn.addEventListener("click", function () {
      window.triggerAutoGenMeta(window._wikipediaModuleState, _wpMetaConfig);
    });
  }

  // Wire search terms textarea auto-save (matching Challenge pattern)
  var termsInput = document.getElementById("wikipedia-search-terms-input");
  if (termsInput) {
    var saveTimeout = null;
    termsInput.addEventListener("input", function () {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(function () {
        _autoSaveSearchTerms();
      }, 1000);
    });
    termsInput.addEventListener("blur", function () {
      if (saveTimeout) clearTimeout(saveTimeout);
      _autoSaveSearchTerms();
    });
  }

  // Wire metadata field save-on-blur → shared
  var snippetInput = document.getElementById("wikipedia-snippet-input");
  if (snippetInput) {
    snippetInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._wikipediaModuleState,
        _wpSaveMetaConfig,
      );
    });
  }

  var slugInput = document.getElementById("wikipedia-slug-input");
  if (slugInput) {
    slugInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._wikipediaModuleState,
        _wpSaveMetaConfig,
      );
    });
  }

  var metaInput = document.getElementById("wikipedia-meta-input");
  if (metaInput) {
    metaInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._wikipediaModuleState,
        _wpSaveMetaConfig,
      );
    });
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

  // Section 2: Wikipedia Weight — render single criterion row
  _renderWeightCriterion();

  // Section 3: Search Terms — populate textarea from record
  _populateSearchTermsTextarea(record);

  // Section 4: Metadata
  var snippetInput = document.getElementById("wikipedia-snippet-input");
  var slugInput = document.getElementById("wikipedia-slug-input");
  var metaInput = document.getElementById("wikipedia-meta-input");
  if (snippetInput) snippetInput.value = state.activeRecordSnippet;
  if (slugInput) slugInput.value = state.activeRecordSlug;
  if (metaInput) metaInput.value = state.activeRecordMeta;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
   Resets all sidebar sections to empty/default state.
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("wikipedia-record-title");
  var slugEl = document.getElementById("wikipedia-record-slug");
  var snippetInput = document.getElementById("wikipedia-snippet-input");
  var slugInputEl = document.getElementById("wikipedia-slug-input");
  var metaInput = document.getElementById("wikipedia-meta-input");

  if (titleEl) titleEl.textContent = "\u2014";
  if (slugEl) slugEl.textContent = "\u2014";
  if (snippetInput) snippetInput.value = "";
  if (slugInputEl) slugInputEl.value = "";
  if (metaInput) metaInput.value = "";

  // Clear weighting list and search terms textarea
  var weightingList = document.getElementById("wikipedia-weighting-list");
  if (weightingList) weightingList.innerHTML = "";

  var termsInput = document.getElementById("wikipedia-search-terms-input");
  if (termsInput) termsInput.value = "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderWeightCriterion
   Renders a single weighting criterion row (matching challenge-weight-item
   style) for the Wikipedia weight multiplier. Auto-saves on change.
----------------------------------------------------------------------------- */
function _renderWeightCriterion() {
  var listEl = document.getElementById("wikipedia-weighting-list");
  if (!listEl) return;

  var state = window._wikipediaModuleState;
  var currentWeight = state.activeRecordWeight || 1.0;

  listEl.innerHTML = "";

  // Single criterion row
  var itemEl = document.createElement("div");
  itemEl.className = "wikipedia-weight-item";

  // Name label
  var nameEl = document.createElement("span");
  nameEl.className = "wikipedia-weight-item__name";
  nameEl.textContent = "Wikipedia Weight";
  itemEl.appendChild(nameEl);

  // Value input
  var valueInput = document.createElement("input");
  valueInput.className = "wikipedia-weight-item__value";
  valueInput.type = "number";
  valueInput.min = "0";
  valueInput.max = "100";
  valueInput.step = "0.01";
  valueInput.value = currentWeight;
  valueInput.setAttribute("aria-label", "Wikipedia weight multiplier");

  valueInput.addEventListener("change", function () {
    var newValue = parseFloat(valueInput.value);
    if (!isNaN(newValue) && newValue >= 0) {
      state.activeRecordWeight = newValue;
      _autoSaveWeight(newValue);
    }
  });
  itemEl.appendChild(valueInput);

  listEl.appendChild(itemEl);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSearchTermsTextarea
   Reads search terms from the selected record and displays them in the
   textarea, one term per line (matching Challenge pattern).
----------------------------------------------------------------------------- */
function _populateSearchTermsTextarea(record) {
  var termsInput = document.getElementById("wikipedia-search-terms-input");
  if (!termsInput) return;

  var rawTerms = record.wikipedia_search_term || "";
  try {
    var parsed = JSON.parse(rawTerms);
    if (Array.isArray(parsed)) {
      termsInput.value = parsed.join("\n");
    } else if (typeof parsed === "object" && parsed !== null) {
      termsInput.value = Object.values(parsed).join("\n");
    } else {
      termsInput.value = String(parsed);
    }
  } catch (e) {
    termsInput.value = rawTerms;
  }

  // Also update state for consistency
  window._wikipediaModuleState.activeRecordSearchTerms = rawTerms;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _autoSaveWeight
   Saves the Wikipedia weight multiplier to the active record via PUT.
----------------------------------------------------------------------------- */
async function _autoSaveWeight(newWeight) {
  var state = window._wikipediaModuleState;
  if (!state.activeRecordId) return;

  var weightData = JSON.stringify({ multiplier: newWeight });

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wikipedia_weight: weightData, status: "draft" }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Wikipedia weight saved for '" +
          state.activeRecordTitle +
          "'. Record set to draft.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Weight save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save Wikipedia weight for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _autoSaveSearchTerms
   Saves the current search terms textarea value to the active record via PUT.
   Matches Challenge auto-save pattern.
----------------------------------------------------------------------------- */
async function _autoSaveSearchTerms() {
  var state = window._wikipediaModuleState;
  if (!state.activeRecordId) return;

  var termsInput = document.getElementById("wikipedia-search-terms-input");
  if (!termsInput) return;

  var rawValue = termsInput.value.trim();
  // Store as JSON array — split by newlines or commas
  var termsArray = rawValue
    .split(/[\n,]+/)
    .map(function (t) {
      return t.trim();
    })
    .filter(function (t) {
      return t.length > 0;
    });

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_search_term: JSON.stringify(termsArray),
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update in-memory state
    state.activeRecordSearchTerms = JSON.stringify(termsArray);

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Wikipedia search terms saved for '" + state.activeRecordTitle + "'.",
      );
    }
  } catch (err) {
    console.error("[wikipedia_sidebar] Search term save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search terms for '" +
          state.activeRecordTitle +
          "'.",
      );
    }
  }
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
