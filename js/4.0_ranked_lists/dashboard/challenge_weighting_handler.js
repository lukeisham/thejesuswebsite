// Trigger:  Called by dashboard_challenge_academic.js or dashboard_challenge_popular.js → window.initChallengeWeighting()
//           on module initialisation. Also called on toggle switch via
//           window.reloadChallengeWeighting(mode) and row selection via
//           window.loadChallengeSearchTerms(challenge).
// Main:    initChallengeWeighting() — wires the weighting sidebar: renders
//           the weighting criteria list, binds reorder and value editing,
//           initialises the new-criterion form, and wires the search terms
//           textarea for auto-save on change. Per-mode weighting criteria and
//           search terms are now cached independently so toggling preserves
//           unsaved edits.
// Output:  Interactive weighting sidebar with auto-save on every change and
//          per-mode state persistence. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   DEFAULT WEIGHTING CRITERIA
   Starting criteria for a fresh mode with no saved weights.
   Each entry: { name: string, value: number }
----------------------------------------------------------------------------- */
var DEFAULT_WEIGHTS = {
  academic: [
    { name: "Difficulty", value: 8 },
    { name: "Scholarly Interest", value: 5 },
    { name: "Historical Significance", value: 7 },
  ],
  popular: [
    { name: "Popularity", value: 3 },
    { name: "Virality", value: 5 },
    { name: "Search Volume", value: 4 },
  ],
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initChallengeWeighting
   Initialises the weighting sidebar UI and wires all interactive elements.
----------------------------------------------------------------------------- */
function initChallengeWeighting() {
  // Load default weights for the current mode
  _renderWeightingList();

  // Wire the new-criterion form
  _wireNewWeightForm();

  // Wire search terms auto-save
  _wireSearchTerms();
}

/* -----------------------------------------------------------------------------
   FUNCTION: reloadChallengeWeighting
   Called when the Academic/Popular toggle switches and no saved per-mode
   state exists (first visit to that mode). Resets the weighting list to
   defaults for the new mode.

   Parameters:
     mode (string) — 'academic' or 'popular'
----------------------------------------------------------------------------- */
function reloadChallengeWeighting(mode) {
  // Reset to defaults for this mode (only called when no cached state exists)
  window._challengeModuleState.weightingCriteria = JSON.parse(
    JSON.stringify(DEFAULT_WEIGHTS[mode] || DEFAULT_WEIGHTS.academic),
  );

  // Also seed the per-mode cache so future saves have a baseline
  if (mode === "academic") {
    window._challengeModuleState.academicWeightingCriteria = JSON.parse(
      JSON.stringify(DEFAULT_WEIGHTS.academic),
    );
  } else {
    window._challengeModuleState.popularWeightingCriteria = JSON.parse(
      JSON.stringify(DEFAULT_WEIGHTS.popular),
    );
  }

  _renderWeightingList();
}

/* -----------------------------------------------------------------------------
   FUNCTION: loadChallengeSearchTerms
   Called when a challenge row is selected. Loads the record's search terms
   into the sidebar textarea and auto-saves on change. The search terms
   are read from the record's DB column — this is always authoritative, NOT
   the per-mode cache (which only stores unsaved edits during a session).

   Parameters:
     challenge (object) — the selected record object
----------------------------------------------------------------------------- */
function loadChallengeSearchTerms(challenge) {
  const mode = window._challengeModuleState.mode;
  const searchTermCol =
    mode === "academic"
      ? "academic_challenge_search_term"
      : "popular_challenge_search_term";

  const termsInput = document.getElementById("challenge-search-terms-input");
  if (!termsInput) return;

  // Parse and display search terms from the record
  var rawTerms = challenge[searchTermCol] || "";
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

  // Refresh the search terms overview after loading
  if (window._challengeModuleState.mode === "academic") {
    if (typeof window.renderAcademicSearchTermsOverview === "function") {
      window.renderAcademicSearchTermsOverview();
    }
  } else {
    if (typeof window.renderPopularSearchTermsOverview === "function") {
      window.renderPopularSearchTermsOverview();
    }
  }

  // Store for auto-save reference
  termsInput.setAttribute("data-record-slug", challenge.slug || "");
  termsInput.setAttribute("data-search-term-col", searchTermCol);

  // Load weighting criteria from the record's weight field
  var weightCol =
    mode === "academic"
      ? "academic_challenge_weight"
      : "popular_challenge_weight";
  var weightRaw = challenge[weightCol] || "{}";

  try {
    var weights =
      typeof weightRaw === "string" ? JSON.parse(weightRaw) : weightRaw;
    if (
      weights &&
      typeof weights === "object" &&
      Object.keys(weights).length > 0
    ) {
      var criteria = [];
      var keys = Object.keys(weights);
      keys.forEach(function (key) {
        criteria.push({ name: key, value: parseFloat(weights[key]) || 0 });
      });
      window._challengeModuleState.weightingCriteria = criteria;
      _renderWeightingList();
      return;
    }
  } catch (e) {
    // Fall through to defaults
  }

  // Use defaults for this mode
  window._challengeModuleState.weightingCriteria = JSON.parse(
    JSON.stringify(DEFAULT_WEIGHTS[mode] || DEFAULT_WEIGHTS.academic),
  );
  _renderWeightingList();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderWeightingList
   Renders the current weighting criteria into #challenge-weighting-list.
   Each item shows reorder buttons (up/down), name, value input, and remove.
----------------------------------------------------------------------------- */
function _renderWeightingList() {
  var listEl = document.getElementById("challenge-weighting-list");
  if (!listEl) return;

  var criteria = window._challengeModuleState.weightingCriteria || [];
  var mode = window._challengeModuleState.mode || "academic";

  // Use defaults if empty
  if (criteria.length === 0) {
    criteria = JSON.parse(
      JSON.stringify(DEFAULT_WEIGHTS[mode] || DEFAULT_WEIGHTS.academic),
    );
    window._challengeModuleState.weightingCriteria = criteria;
  }

  listEl.innerHTML = "";

  criteria.forEach(function (item, index) {
    var itemEl = document.createElement("div");
    itemEl.className = "challenge-weight-item";
    itemEl.setAttribute("data-weight-index", String(index));

    // Reorder buttons (up/down)
    var reorderEl = document.createElement("div");
    reorderEl.className = "challenge-weight-item__reorder";

    var btnUp = document.createElement("button");
    btnUp.className = "challenge-weight-item__reorder-btn";
    btnUp.textContent = "\u25B2";
    btnUp.title = "Move up";
    btnUp.addEventListener("click", function () {
      _moveWeight(index, -1);
    });
    reorderEl.appendChild(btnUp);

    var btnDown = document.createElement("button");
    btnDown.className = "challenge-weight-item__reorder-btn";
    btnDown.textContent = "\u25BC";
    btnDown.title = "Move down";
    btnDown.addEventListener("click", function () {
      _moveWeight(index, 1);
    });
    reorderEl.appendChild(btnDown);

    itemEl.appendChild(reorderEl);

    // Name
    var nameEl = document.createElement("span");
    nameEl.className = "challenge-weight-item__name";
    nameEl.textContent = item.name;
    itemEl.appendChild(nameEl);

    // Value input
    var valueInput = document.createElement("input");
    valueInput.className = "challenge-weight-item__value";
    valueInput.type = "number";
    valueInput.min = "0";
    valueInput.max = "100";
    valueInput.step = "0.1";
    valueInput.value = item.value;
    valueInput.setAttribute("aria-label", "Weight value for " + item.name);
    valueInput.addEventListener("change", function () {
      var newValue = parseFloat(valueInput.value);
      if (!isNaN(newValue) && newValue >= 0) {
        window._challengeModuleState.weightingCriteria[index].value = newValue;
        _autoSaveWeights();
      }
    });
    itemEl.appendChild(valueInput);

    // Remove button
    var removeBtn = document.createElement("button");
    removeBtn.className = "challenge-weight-item__remove";
    removeBtn.textContent = "\u2715";
    removeBtn.title = "Remove " + item.name;
    removeBtn.addEventListener("click", function () {
      window._challengeModuleState.weightingCriteria.splice(index, 1);
      _renderWeightingList();
      _autoSaveWeights();
    });
    itemEl.appendChild(removeBtn);

    listEl.appendChild(itemEl);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _moveWeight
   Moves a weighting criterion up or down in the list, re-renders, and
   auto-saves the new order.

   Parameters:
     index (number)     — current position in the array
     direction (number) — negative for up, positive for down
----------------------------------------------------------------------------- */
function _moveWeight(index, direction) {
  var criteria = window._challengeModuleState.weightingCriteria;
  var newIndex = index + direction;

  if (newIndex < 0 || newIndex >= criteria.length) return;

  // Swap
  var temp = criteria[index];
  criteria[index] = criteria[newIndex];
  criteria[newIndex] = temp;

  _renderWeightingList();
  _autoSaveWeights();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireNewWeightForm
   Binds the "Add Weight" form to append new weighting criteria.
----------------------------------------------------------------------------- */
function _wireNewWeightForm() {
  var nameInput = document.getElementById("challenge-new-weight-name");
  var valueInput = document.getElementById("challenge-new-weight-value");
  var addBtn = document.getElementById("btn-challenge-add-weight");

  if (!addBtn) return;

  addBtn.addEventListener("click", function () {
    var name = nameInput && nameInput.value ? nameInput.value.trim() : "";
    var value =
      valueInput && valueInput.value ? parseFloat(valueInput.value) : 0;

    if (!name) {
      if (typeof window.surfaceError === "function") {
        window.surfaceError(
          "Please enter a name for the new weighting criterion.",
        );
      }
      return;
    }

    if (isNaN(value) || value < 0) {
      value = 0;
    }

    window._challengeModuleState.weightingCriteria.push({
      name: name,
      value: value,
    });

    // Clear inputs
    if (nameInput) nameInput.value = "";
    if (valueInput) valueInput.value = "";

    _renderWeightingList();
    _autoSaveWeights();
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireSearchTerms
   Binds the search terms textarea to auto-save on blur or after changes.
   Pressing Enter saves immediately — useful for comma-separated entries.
----------------------------------------------------------------------------- */
function _wireSearchTerms() {
  var termsInput = document.getElementById("challenge-search-terms-input");
  if (!termsInput || termsInput.dataset.searchTermsWired) return;

  var saveTimeout = null;

  /**
   * Saves immediately — clears debounce and persists to DB.
   * Then refreshes the appropriate overview list.
   */
  function _saveNow() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    _autoSaveSearchTerms().then(function () {
      // Refresh the overview list after saving
      var mode = window._challengeModuleState.mode;
      if (mode === "academic") {
        if (typeof window.renderAcademicSearchTermsOverview === "function") {
          window.renderAcademicSearchTermsOverview();
        }
      } else {
        if (typeof window.renderPopularSearchTermsOverview === "function") {
          window.renderPopularSearchTermsOverview();
        }
      }
    });
  }

  termsInput.addEventListener("input", function () {
    // Debounce: auto-save 1 second after the user stops typing
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      _autoSaveSearchTerms();
    }, 1000);
  });

  // Also save on blur (when the user clicks away)
  termsInput.addEventListener("blur", function () {
    _saveNow();
  });

  // Enter key saves immediately — commas separate multiple terms
  termsInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Don't insert a newline — commas are the separator
      _saveNow();
    }
  });

  termsInput.dataset.searchTermsWired = "true";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _autoSaveWeights
   Saves the current weighting criteria to the active record via PUT.
   Any weight modification auto-saves the record as draft.
----------------------------------------------------------------------------- */
async function _autoSaveWeights() {
  var slug = window._challengeModuleState.activeRecordSlug;
  if (!slug) return; // No record selected yet

  var mode = window._challengeModuleState.mode;
  var weightCol =
    mode === "academic"
      ? "academic_challenge_weight"
      : "popular_challenge_weight";

  var criteria = window._challengeModuleState.weightingCriteria;
  var weightObj = {};
  criteria.forEach(function (item) {
    weightObj[item.name] = item.value;
  });

  var payload = {};
  payload[weightCol] = JSON.stringify(weightObj);
  payload["status"] = "draft"; // Auto-save as draft

  try {
    var response = await fetch(
      "/api/admin/records/" + encodeURIComponent(slug),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Success — update status in UI
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Weighting changes saved as draft.");
    }
  } catch (err) {
    console.error("[challenge_weighting_handler] Weight save failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save weighting changes. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _autoSaveSearchTerms
   Saves the current search terms to the active record via PUT.
   Any search term modification auto-saves the record as draft.
----------------------------------------------------------------------------- */
async function _autoSaveSearchTerms() {
  var termsInput = document.getElementById("challenge-search-terms-input");
  if (!termsInput) return;

  var slug = termsInput.getAttribute("data-record-slug");
  var col = termsInput.getAttribute("data-search-term-col");

  if (!slug || !col) return;

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

  var payload = {};
  payload[col] = JSON.stringify(termsArray);
  payload["status"] = "draft"; // Auto-save as draft

  try {
    var response = await fetch(
      "/api/admin/records/" + encodeURIComponent(slug),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Success
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Search terms saved as draft.");
    }
  } catch (err) {
    console.error(
      "[challenge_weighting_handler] Search term save failed:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search terms. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: scheduleAutoSave
   Triggers the existing auto-save functions for weights and search terms.
   Called by the standardized auto-save orchestrator.
----------------------------------------------------------------------------- */
function scheduleChallengeWeightingAutoSave() {
  // Trigger the existing auto-save for weights if a record is selected
  if (
    window._challengeModuleState &&
    window._challengeModuleState.activeRecordSlug
  ) {
    _autoSaveWeights();
  }

  // Trigger the existing auto-save for search terms
  _autoSaveSearchTerms();
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initChallengeWeighting = initChallengeWeighting;
window.reloadChallengeWeighting = reloadChallengeWeighting;
window.loadChallengeSearchTerms = loadChallengeSearchTerms;
// Exposed so dashboard_challenge.js can re-render after restoring per-mode cache
window._renderWeightingListExposed = _renderWeightingList;
window.scheduleChallengeWeightingAutoSave = scheduleChallengeWeightingAutoSave;
