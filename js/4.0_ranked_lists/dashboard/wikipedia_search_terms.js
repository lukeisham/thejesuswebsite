// Trigger:  Called by wikipedia_sidebar_handler.js → window.loadWikipediaSearchTerms()
//           when a Wikipedia record is selected.
// Main:    loadWikipediaSearchTerms(record) — handles the search terms textarea
//           and read-only overview list for Wikipedia records. Auto-saves the
//           terms as a JSON array to the database.
// Output:  Interactive search terms section in the Wikipedia sidebar.

"use strict";

/**
 * Loads and renders search terms for the selected Wikipedia record.
 * @param {Object} record - The selected Wikipedia record object.
 */
function loadWikipediaSearchTerms(record) {
  const termsInput = document.getElementById("wikipedia-search-terms-input");
  if (!termsInput) return;

  const rawTerms = record.wikipedia_search_term || "";
  let termsArray = [];

  try {
    const parsed = typeof rawTerms === "string" ? JSON.parse(rawTerms) : rawTerms;
    if (Array.isArray(parsed)) {
      termsArray = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      termsArray = Object.values(parsed);
    } else {
      termsArray = rawTerms ? [String(rawTerms)] : [];
    }
  } catch (e) {
    termsArray = rawTerms ? [rawTerms] : [];
  }

  termsInput.value = termsArray.join("\n");
  
  // Store in module state
  window._wikipediaModuleState.activeRecordSearchTerms = termsArray;

  _renderWikipediaSearchTermsOverview();
  _wireWikipediaSearchTermsAutoSave();
}

/**
 * Renders the read-only overview list of search terms.
 * @private
 */
function _renderWikipediaSearchTermsOverview() {
  const listEl = document.getElementById("wikipedia-search-terms-overview-list");
  if (!listEl) return;

  const terms = window._wikipediaModuleState.activeRecordSearchTerms || [];
  listEl.innerHTML = "";

  if (terms.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "wikipedia-search-terms-overview-item wikipedia-search-terms-overview-item--empty";
    emptyItem.textContent = "No search terms saved.";
    listEl.appendChild(emptyItem);
    return;
  }

  terms.forEach(term => {
    const itemEl = document.createElement("li");
    itemEl.className = "wikipedia-search-terms-overview-item";
    itemEl.textContent = term;
    listEl.appendChild(itemEl);
  });
}

/**
 * Wires up auto-save for the search terms textarea.
 * @private
 */
function _wireWikipediaSearchTermsAutoSave() {
  const termsInput = document.getElementById("wikipedia-search-terms-input");
  if (!termsInput || termsInput.dataset.wired) return;

  let saveTimeout = null;

  termsInput.addEventListener("input", () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      _autoSaveWikipediaSearchTerms();
    }, 1000);
  });

  termsInput.addEventListener("blur", () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    _autoSaveWikipediaSearchTerms();
  });

  termsInput.dataset.wired = "true";
}

/**
 * Persists the current search terms to the database.
 * @private
 */
async function _autoSaveWikipediaSearchTerms() {
  const state = window._wikipediaModuleState;
  const slug = state.activeRecordSlug;
  if (!slug) return;

  const termsInput = document.getElementById("wikipedia-search-terms-input");
  const rawValue = termsInput ? termsInput.value.trim() : "";
  
  const termsArray = rawValue
    .split(/[\n,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  try {
    const response = await fetch(`/api/admin/records/${state.activeRecordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikipedia_search_term: JSON.stringify(termsArray),
        status: "draft"
      }),
    });

    if (!response.ok) throw new Error("Save failed");

    // Update state and overview
    state.activeRecordSearchTerms = termsArray;
    _renderWikipediaSearchTermsOverview();

    if (window.surfaceError) {
      window.surfaceError(`Search terms saved for '${state.activeRecordTitle}'.`);
    }
  } catch (err) {
    console.error("[wikipedia_search_terms] Auto-save failed:", err);
  }
}

// Global exposure
window.loadWikipediaSearchTerms = loadWikipediaSearchTerms;
