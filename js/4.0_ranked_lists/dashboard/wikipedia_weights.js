// Trigger:  Called by wikipedia_sidebar_handler.js → window.loadWikipediaWeights()
//           when a Wikipedia record is selected.
// Main:    loadWikipediaWeights(record) — handles the lifecycle of Wikipedia
//           ranking weights: rendering the list, adding new weights, removing
//           existing ones, and auto-saving the JSON object to the database.
// Output:  Interactive weighting list in the Wikipedia sidebar with auto-save.

"use strict";

/* -----------------------------------------------------------------------------
   DEFAULT WEIGHTS
   Initial weights if none are present in the record.
----------------------------------------------------------------------------- */
const DEFAULT_WIKIPEDIA_WEIGHTS = [
  { name: "Relevance", value: 1.0 },
  { name: "Authority", value: 1.0 },
];

/**
 * Loads and renders the weighting criteria for the selected Wikipedia record.
 * @param {Object} record - The selected Wikipedia record object.
 */
function loadWikipediaWeights(record) {
  const listEl = document.getElementById("wikipedia-weighting-list");
  if (!listEl) return;

  let weights = [];
  const rawWeight = record.wikipedia_weight;

  try {
    if (rawWeight) {
      const parsed =
        typeof rawWeight === "string" ? JSON.parse(rawWeight) : rawWeight;
      // Convert { name: value } object to [ { name, value } ] array for rendering
      weights = Object.entries(parsed).map(([name, value]) => ({
        name,
        value,
      }));
    }
  } catch (e) {
    console.warn(
      "[wikipedia_weights] Failed to parse weights, using defaults.",
      e,
    );
  }

  if (weights.length === 0) {
    weights = JSON.parse(JSON.stringify(DEFAULT_WIKIPEDIA_WEIGHTS));
  }

  // Store in module state for manipulation
  window._wikipediaModuleState.weightingCriteria = weights;

  _renderWikipediaWeightingList();
  _wireWikipediaNewWeightForm();
}

/**
 * Renders the weighting criteria list into the sidebar.
 * @private
 */
function _renderWikipediaWeightingList() {
  const listEl = document.getElementById("wikipedia-weighting-list");
  if (!listEl) return;

  const criteria = window._wikipediaModuleState.weightingCriteria || [];
  listEl.innerHTML = "";

  criteria.forEach((item, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = "wikipedia-weight-item";

    // Reorder buttons (up/down)
    const reorderEl = document.createElement("div");
    reorderEl.className = "wikipedia-weight-item__reorder";

    const btnUp = document.createElement("button");
    btnUp.className = "wikipedia-weight-item__reorder-btn";
    btnUp.textContent = "\u25B2";
    btnUp.title = "Move up";
    btnUp.addEventListener("click", () => {
      _moveWikipediaWeight(index, -1);
    });
    reorderEl.appendChild(btnUp);

    const btnDown = document.createElement("button");
    btnDown.className = "wikipedia-weight-item__reorder-btn";
    btnDown.textContent = "\u25BC";
    btnDown.title = "Move down";
    btnDown.addEventListener("click", () => {
      _moveWikipediaWeight(index, 1);
    });
    reorderEl.appendChild(btnDown);

    itemEl.appendChild(reorderEl);

    // Name
    const nameEl = document.createElement("span");
    nameEl.className = "wikipedia-weight-item__name";
    nameEl.textContent = item.name;
    itemEl.appendChild(nameEl);

    // Value input
    const valueInput = document.createElement("input");
    valueInput.className = "wikipedia-weight-item__value";
    valueInput.type = "number";
    valueInput.min = "0";
    valueInput.max = "100";
    valueInput.step = "0.01";
    valueInput.value = item.value;
    valueInput.addEventListener("change", () => {
      const val = parseFloat(valueInput.value);
      if (!isNaN(val) && val >= 0) {
        window._wikipediaModuleState.weightingCriteria[index].value = val;
        _autoSaveWikipediaWeights();
      }
    });
    itemEl.appendChild(valueInput);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "wikipedia-weight-item__remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.title = `Remove ${item.name}`;
    removeBtn.addEventListener("click", () => {
      window._wikipediaModuleState.weightingCriteria.splice(index, 1);
      _renderWikipediaWeightingList();
      _autoSaveWikipediaWeights();
    });
    itemEl.appendChild(removeBtn);

    listEl.appendChild(itemEl);
  });
}

/**
 * Moves a weighting criterion up or down in the list, re-renders, and
 * auto-saves the new order.
 * @param {number} index     — current position in the array
 * @param {number} direction — negative for up, positive for down
 * @private
 */
function _moveWikipediaWeight(index, direction) {
  const criteria = window._wikipediaModuleState.weightingCriteria;
  const newIndex = index + direction;

  if (newIndex < 0 || newIndex >= criteria.length) return;

  // Swap
  const temp = criteria[index];
  criteria[index] = criteria[newIndex];
  criteria[newIndex] = temp;

  _renderWikipediaWeightingList();
  _autoSaveWikipediaWeights();
}

/**
 * Wires up the "Add Weight" form in the sidebar.
 * @private
 */
function _wireWikipediaNewWeightForm() {
  const addBtn = document.getElementById("btn-wikipedia-add-weight");
  const nameInput = document.getElementById("wikipedia-new-weight-name");
  const valueInput = document.getElementById("wikipedia-new-weight-value");

  if (!addBtn || addBtn.dataset.wired) return;

  addBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const val = parseFloat(valueInput.value);

    if (!name) {
      if (window.surfaceError)
        window.surfaceError("Please enter a name for the weight.");
      return;
    }

    if (isNaN(val) || val < 0) {
      if (window.surfaceError)
        window.surfaceError("Please enter a valid weight value.");
      return;
    }

    window._wikipediaModuleState.weightingCriteria.push({ name, value: val });
    nameInput.value = "";
    valueInput.value = "";

    _renderWikipediaWeightingList();
    _autoSaveWikipediaWeights();
  });

  addBtn.dataset.wired = "true";
}

/**
 * Persists the current weighting criteria to the database.
 * @private
 */
async function _autoSaveWikipediaWeights() {
  const state = window._wikipediaModuleState;
  const slug = state.activeRecordSlug;
  if (!slug) return;

  const weightObj = {};
  state.weightingCriteria.forEach((item) => {
    weightObj[item.name] = item.value;
  });

  try {
    const response = await fetch(`/api/admin/records/${state.activeRecordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_weight: JSON.stringify(weightObj),
      }),
    });

    if (!response.ok) throw new Error("Save failed");

    if (window.surfaceError) {
      window.surfaceError(`Weights saved for '${state.activeRecordTitle}'.`);
    }
  } catch (err) {
    console.error("[wikipedia_weights] Auto-save failed:", err);
  }
}

// Global exposure
window.loadWikipediaWeights = loadWikipediaWeights;
