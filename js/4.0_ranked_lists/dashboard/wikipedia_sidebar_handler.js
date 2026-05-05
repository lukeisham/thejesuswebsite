// Trigger:  Called by wikipedia_list_display.js → window.populateWikipediaSidebar()
//           when a Wikipedia row is selected.
//           Also called by dashboard_wikipedia.js → window.initWikipediaSidebar()
//           on module initialisation to set up empty sidebar state.
// Main:    populateWikipediaSidebar(record) — populates all sidebar sections
//           with the selected record's data. Handles weight editing, search
//           term chips, metadata editing, auto-gen buttons, and per-record
//           recalculate trigger. Delegates auto-gen and term-chip logic to
//           shared window.* functions in js/admin_core/.
// Output:  Fully interactive record detail sidebar. Errors routed through
//          window.surfaceError().

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
var _wpTermChipConfig = {
  prefix: "wikipedia-",
  inputId: "wikipedia-search-term-input",
  termColumn: "wikipedia_search_term",
  stateTermsKey: "activeRecordSearchTerms",
  renderFn: _renderSearchTerms,
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initWikipediaSidebar
   Initialises the sidebar in its empty/default state. Wires up the Save
   Weight button, Add Term button, auto-gen buttons, and recalculate button.
   Called once when the Wikipedia module is loaded.
----------------------------------------------------------------------------- */
function initWikipediaSidebar() {
  _clearSidebar();

  // Wire save weight button (unique to Wikipedia)
  var saveWeightBtn = document.getElementById("btn-wikipedia-save-weight");
  if (saveWeightBtn) {
    saveWeightBtn.addEventListener("click", _handleSaveWeight);
  }

  // Wire add term button → shared
  var addTermBtn = document.getElementById("btn-wikipedia-add-term");
  if (addTermBtn) {
    addTermBtn.addEventListener("click", function () {
      window.addSidebarTerm(window._wikipediaModuleState, _wpTermChipConfig);
    });
  }

  // Wire Enter key for add term input
  var addTermInput = document.getElementById("wikipedia-search-term-input");
  if (addTermInput) {
    addTermInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        window.addSidebarTerm(window._wikipediaModuleState, _wpTermChipConfig);
      }
    });
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

  // Wire recalculate button (unique to Wikipedia)
  var recalcBtn = document.getElementById("btn-wikipedia-recalculate-record");
  if (recalcBtn) {
    recalcBtn.addEventListener("click", _handleRecalculateRecord);
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
----------------------------------------------------------------------------- */
function populateWikipediaSidebar(record) {
  if (!record) return;

  var state = window._wikipediaModuleState;

  // Section 1: Record Info
  var titleEl = document.getElementById("wikipedia-record-title");
  var slugEl = document.getElementById("wikipedia-record-slug");
  if (titleEl) titleEl.textContent = record.title || "\u2014";
  if (slugEl) slugEl.textContent = record.slug || "\u2014";

  // Section 2: Weight
  var weightInput = document.getElementById("wikipedia-weight-input");
  if (weightInput) weightInput.value = state.activeRecordWeight;

  // Section 3: Search Terms
  _renderSearchTerms();

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
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("wikipedia-record-title");
  var slugEl = document.getElementById("wikipedia-record-slug");
  var weightInput = document.getElementById("wikipedia-weight-input");
  var snippetInput = document.getElementById("wikipedia-snippet-input");
  var slugInputEl = document.getElementById("wikipedia-slug-input");
  var metaInput = document.getElementById("wikipedia-meta-input");

  if (titleEl) titleEl.textContent = "\u2014";
  if (slugEl) slugEl.textContent = "\u2014";
  if (weightInput) weightInput.value = "1.00";
  if (snippetInput) snippetInput.value = "";
  if (slugInputEl) slugInputEl.value = "";
  if (metaInput) metaInput.value = "";

  var termsList = document.getElementById("wikipedia-search-terms-list");
  if (termsList) termsList.innerHTML = "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchTerms
   Renders the current record's search terms as deletable chip elements.
   Remove buttons call window.removeSidebarTerm (shared).
----------------------------------------------------------------------------- */
function _renderSearchTerms() {
  var termsList = document.getElementById("wikipedia-search-terms-list");
  if (!termsList) return;

  termsList.innerHTML = "";

  var terms = window._wikipediaModuleState.activeRecordSearchTerms;
  if (!terms || terms.length === 0) return;

  terms.forEach(function (term, index) {
    if (!term || term.trim() === "") return;

    var chipEl = document.createElement("li");
    chipEl.className = "wikipedia-search-term-chip";

    var textEl = document.createElement("span");
    textEl.className = "wikipedia-search-term-chip__text";
    textEl.textContent = term.trim();
    textEl.setAttribute("title", term.trim());
    chipEl.appendChild(textEl);

    var removeBtn = document.createElement("button");
    removeBtn.className = "wikipedia-search-term-chip__remove";
    removeBtn.textContent = "\u00d7";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove term: " + term.trim());
    removeBtn.setAttribute("title", "Remove term");
    removeBtn.addEventListener("click", function () {
      window.removeSidebarTerm(
        window._wikipediaModuleState,
        _wpTermChipConfig,
        index,
      );
    });
    chipEl.appendChild(removeBtn);

    termsList.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleSaveWeight (unique to Wikipedia)
----------------------------------------------------------------------------- */
async function _handleSaveWeight() {
  var state = window._wikipediaModuleState;
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "No record selected. Select a record to edit its weight.",
      );
    }
    return;
  }

  var weightInput = document.getElementById("wikipedia-weight-input");
  if (!weightInput) return;

  var newWeight = parseFloat(weightInput.value);
  if (isNaN(newWeight) || newWeight < 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Invalid weight value. Enter a positive number.");
    }
    return;
  }

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

    state.activeRecordWeight = newWeight;

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Weight saved for '" +
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
