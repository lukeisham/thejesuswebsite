// Trigger:  Called by dashboard_news_sources.js → window.initNewsSidebar()
//           on module initialisation, and by news_sources_handler.js →
//           window.populateNewsSidebar() when an article row is selected.
// Main:    initNewsSidebar() — wires all sidebar interactive elements
//           to their handlers. Manages source URL, keywords, and search
//           terms across the three sub-types sharing a common group id.
//           populateNewsSidebar(record) — fills sidebar fields with
//           the selected article's source config and search terms.
// Output:  Interactive sidebar with keyword chip management, search term
//          chip management, and source URL editing for the selected news
//          article. All modifications are auto-saved as draft. Errors
//          routed through window.surfaceError().

"use strict";

/* --- Keyword Chip Config --- */
var _nsKeywordChipConfig = {
  prefix: "news-",
  inputId: "news-keyword-input",
  chipListId: "news-keywords-list",
  chipClass: "news-keyword-chip",
  stateTermsKey: "activeKeywords",
  renderFn: _renderKeywords,
};

/* --- Search Term Chip Config --- */
var _nsSearchTermChipConfig = {
  prefix: "news-",
  inputId: "news-search-term-input",
  chipListId: "news-search-terms-list",
  chipClass: "news-search-term-chip",
  stateTermsKey: "activeSearchTerms",
  renderFn: _renderSearchTerms,
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsSidebar
----------------------------------------------------------------------------- */
function initNewsSidebar() {
  // --- Source URL Save ---
  var saveUrlBtn = document.getElementById("btn-news-save-url");
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener("click", _handleSaveUrl);
  }

  // --- Keywords (add button) ---
  var addKeywordBtn = document.getElementById("btn-news-add-keyword");
  var addKeywordInput = document.getElementById("news-keyword-input");
  if (addKeywordBtn) {
    addKeywordBtn.addEventListener("click", function () {
      _addChipFromInput(window._newsSourcesModuleState, _nsKeywordChipConfig);
    });
  }
  if (addKeywordInput) {
    addKeywordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        _addChipFromInput(window._newsSourcesModuleState, _nsKeywordChipConfig);
      }
    });
  }

  // --- Search Terms (add button) ---
  var addTermBtn = document.getElementById("btn-news-add-term");
  var addTermInput = document.getElementById("news-search-term-input");
  if (addTermBtn) {
    addTermBtn.addEventListener("click", function () {
      _addTermsFromInput();
    });
  }
  if (addTermInput) {
    addTermInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        _addTermsFromInput();
      }
    });
  }

  // --- Source URL input (auto-save on blur) ---
  var urlInput = document.getElementById("news-source-url-input");
  if (urlInput) urlInput.addEventListener("blur", _handleSaveUrl);

  // Sidebar starts disabled — no record selected yet
  _setSidebarDisabled(true);
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: populateNewsSidebar
   Fills sidebar fields from the module state (already populated by
   _selectNewsArticleRow in news_sources_handler.js).
----------------------------------------------------------------------------- */
function populateNewsSidebar(record) {
  var state = window._newsSourcesModuleState;
  if (!state) return;

  _setSidebarDisabled(false);

  // Article title display
  var titleEl = document.getElementById("news-record-title");
  if (titleEl) {
    titleEl.textContent = state.activeArticleTitle || "Untitled Article";
  }

  // Source URL input
  var urlInput = document.getElementById("news-source-url-input");
  if (urlInput) urlInput.value = state.activeSourceUrl || "";

  // Render keyword chips
  _renderKeywords();

  // Render search term chips
  _renderSearchTerms();

  // Populate the shared metadata widget
  if (typeof window.populateMetadataWidget === "function") {
    window.populateMetadataWidget("metadata-widget-container", record);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("news-record-title");
  if (titleEl) titleEl.textContent = "\u2014";

  var urlInput = document.getElementById("news-source-url-input");
  if (urlInput) urlInput.value = "";

  var keywordsList = document.getElementById("news-keywords-list");
  if (keywordsList) keywordsList.innerHTML = "";

  var termsList = document.getElementById("news-search-terms-list");
  if (termsList) termsList.innerHTML = "";

  // Clear the shared metadata widget
  if (typeof window.populateMetadataWidget === "function") {
    window.populateMetadataWidget("metadata-widget-container", null);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setSidebarDisabled
   Disables/enables all sidebar interactive elements and dims sidebar
   sections when no record row is selected.
   Uses a CSS class (.is-disabled) instead of inline styles so that
   the disabled state is consistently applied and removed.
----------------------------------------------------------------------------- */
function _setSidebarDisabled(disabled) {
  var ids = [
    "news-source-url-input",
    "btn-news-save-url",
    "news-keyword-input",
    "btn-news-add-keyword",
    "news-search-term-input",
    "btn-news-add-term",
  ];

  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      if (disabled) {
        el.setAttribute("disabled", "");
      } else {
        el.removeAttribute("disabled");
      }
    }
  });

  // Dim sidebar sections via CSS class
  var sectionIds = [
    "news-source-section",
    "news-keywords-section",
    "news-search-terms-section",
    "metadata-widget-container",
  ];

  sectionIds.forEach(function (id) {
    var section = document.getElementById(id);
    if (section) {
      if (disabled) {
        section.classList.add("is-disabled");
      } else {
        section.classList.remove("is-disabled");
      }
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _addTermsFromInput
   Reads the search term input, splits by commas, adds each unique term
   as an individual chip, re-renders, and saves immediately.
   Supports both single terms and comma-separated lists.
----------------------------------------------------------------------------- */
function _addTermsFromInput() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeGroupId) return;

  var inputEl = document.getElementById("news-search-term-input");
  if (!inputEl) return;

  var rawValue = inputEl.value.trim();
  if (!rawValue) return;

  // Split by commas and filter empty
  var newTerms = rawValue
    .split(",")
    .map(function (t) {
      return t.trim();
    })
    .filter(function (t) {
      return t.length > 0;
    });

  if (newTerms.length === 0) return;

  var existingTerms = state.activeSearchTerms || [];
  var added = false;

  newTerms.forEach(function (term) {
    if (existingTerms.indexOf(term) === -1) {
      existingTerms.push(term);
      added = true;
    }
  });

  if (!added) {
    inputEl.value = "";
    return; // All already exist
  }

  state.activeSearchTerms = existingTerms;
  inputEl.value = "";

  // Re-render chips
  _renderSearchTerms();

  // Save immediately (skip debounce)
  _saveKeywordsAndTerms();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _addChipFromInput
   Reads the input value, adds it to the state array, re-renders chips,
   and triggers auto-save (debounced). Used for Keywords (single-term input).
----------------------------------------------------------------------------- */
function _addChipFromInput(state, config) {
  if (!state || !state.activeGroupId) return;

  var inputEl = document.getElementById(config.inputId);
  if (!inputEl) return;

  var value = inputEl.value.trim();
  if (!value) return;

  var terms = state[config.stateTermsKey] || [];
  if (terms.indexOf(value) !== -1) {
    inputEl.value = "";
    return; // Already exists
  }

  terms.push(value);
  state[config.stateTermsKey] = terms;
  inputEl.value = "";

  // Re-render
  if (typeof config.renderFn === "function") {
    config.renderFn();
  }

  // Auto-save (debounced)
  _scheduleKeywordSave();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _removeChip
   Removes a chip at the given index, re-renders, and triggers auto-save.
----------------------------------------------------------------------------- */
function _removeChip(state, config, index) {
  var terms = state[config.stateTermsKey] || [];
  if (index < 0 || index >= terms.length) return;

  terms.splice(index, 1);
  state[config.stateTermsKey] = terms;

  if (typeof config.renderFn === "function") {
    config.renderFn();
  }

  _scheduleKeywordSave();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderKeywords
   Renders keyword chips in #news-keywords-list.
----------------------------------------------------------------------------- */
function _renderKeywords() {
  var state = window._newsSourcesModuleState;
  var listEl = document.getElementById("news-keywords-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  var keywords = state ? state.activeKeywords : [];
  if (!keywords || keywords.length === 0) return;

  keywords.forEach(function (term, index) {
    var chipEl = document.createElement("li");
    chipEl.className = "news-keyword-chip";

    var textEl = document.createElement("span");
    textEl.className = "news-keyword-chip__text";
    textEl.textContent = term;
    chipEl.appendChild(textEl);

    var removeBtn = document.createElement("button");
    removeBtn.className = "news-keyword-chip__remove";
    removeBtn.textContent = "\u00d7";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove keyword: " + term);
    removeBtn.setAttribute("title", "Remove keyword");
    removeBtn.addEventListener("click", function () {
      _removeChip(window._newsSourcesModuleState, _nsKeywordChipConfig, index);
    });
    chipEl.appendChild(removeBtn);

    listEl.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchTerms
   Renders search term chips in #news-search-terms-list.
----------------------------------------------------------------------------- */
function _renderSearchTerms() {
  var state = window._newsSourcesModuleState;
  var listEl = document.getElementById("news-search-terms-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  var terms = state ? state.activeSearchTerms : [];
  if (!terms || terms.length === 0) return;

  terms.forEach(function (term, index) {
    var chipEl = document.createElement("li");
    chipEl.className = "news-search-term-chip";

    var textEl = document.createElement("span");
    textEl.className = "news-search-term-chip__text";
    textEl.textContent = term;
    chipEl.appendChild(textEl);

    var removeBtn = document.createElement("button");
    removeBtn.className = "news-search-term-chip__remove";
    removeBtn.textContent = "\u00d7";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove search term: " + term);
    removeBtn.setAttribute("title", "Remove search term");
    removeBtn.addEventListener("click", function () {
      _removeChip(
        window._newsSourcesModuleState,
        _nsSearchTermChipConfig,
        index,
      );
    });
    chipEl.appendChild(removeBtn);

    listEl.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _scheduleKeywordSave
   Debounced save for keywords and search terms.
----------------------------------------------------------------------------- */
var _nsKeywordSaveTimer = null;
function _scheduleKeywordSave() {
  if (_nsKeywordSaveTimer) clearTimeout(_nsKeywordSaveTimer);
  _nsKeywordSaveTimer = setTimeout(_saveKeywordsAndTerms, 800);
}

/* -----------------------------------------------------------------------------
   HANDLER: _saveKeywordsAndTerms
   Saves keywords to the source row and search terms to search term rows.
----------------------------------------------------------------------------- */
async function _saveKeywordsAndTerms() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeGroupId) return;

  var groupId = state.activeGroupId;
  var allRecords = state._allNewsArticleRecords || [];

  // --- Save keywords to the source row ---
  var sourceRow = null;
  for (var i = 0; i < allRecords.length; i++) {
    if (
      allRecords[i].type === "news_article" &&
      allRecords[i].sub_type === "news_source" &&
      allRecords[i].id === groupId
    ) {
      sourceRow = allRecords[i];
      break;
    }
  }

  var keywords = state.activeKeywords || [];
  if (keywords.length > 0) {
    if (sourceRow) {
      // Update existing source row
      try {
        await fetch("/api/admin/records/" + sourceRow._row_id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: JSON.stringify(keywords),
            status: "draft",
          }),
        });
      } catch (err) {
        console.error("[news_sources_sidebar] Save keywords failed:", err);
      }
    }
  }

  // --- Save search terms: delete all existing, then POST new ones ---
  // First, collect existing search term row IDs
  var existingTermRowIds = [];
  for (var j = 0; j < allRecords.length; j++) {
    if (
      allRecords[j].type === "news_article" &&
      allRecords[j].sub_type === "news_search_term" &&
      allRecords[j].id === groupId
    ) {
      if (allRecords[j]._row_id) {
        existingTermRowIds.push(allRecords[j]._row_id);
      }
    }
  }

  // Delete all existing search term rows for this group
  for (var k = 0; k < existingTermRowIds.length; k++) {
    try {
      await fetch("/api/admin/records/" + existingTermRowIds[k], {
        method: "DELETE",
      });
    } catch (err) {
      console.error(
        "[news_sources_sidebar] Delete search term row failed:",
        err,
      );
    }
  }

  // POST new search term rows
  var searchTerms = state.activeSearchTerms || [];
  for (var t = 0; t < searchTerms.length; t++) {
    try {
      await fetch("/api/admin/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: groupId,
          type: "news_article",
          sub_type: "news_search_term",
          news_search_term: searchTerms[t],
          status: "draft",
        }),
      });
    } catch (err) {
      console.error("[news_sources_sidebar] POST search term row failed:", err);
    }
  }

  // Refresh the all-records cache
  if (typeof window.displayNewsSourcesList === "function") {
    // We'll let the user refresh manually to avoid loop
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleSaveUrl
   Saves the source URL to the source sub-type row (same group id).
   Finds or creates a source row for the active group.
----------------------------------------------------------------------------- */
async function _handleSaveUrl() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeGroupId) return;

  var urlInput = document.getElementById("news-source-url-input");
  if (!urlInput) return;

  var url = urlInput.value.trim();
  if (!url) return;

  var groupId = state.activeGroupId;
  var allRecords = state._allNewsArticleRecords || [];

  // Find existing source row
  var sourceRow = null;
  for (var i = 0; i < allRecords.length; i++) {
    if (
      allRecords[i].type === "news_article" &&
      allRecords[i].sub_type === "news_source" &&
      allRecords[i].id === groupId
    ) {
      sourceRow = allRecords[i];
      break;
    }
  }

  try {
    if (sourceRow && sourceRow._row_id) {
      // Update existing source row
      var response = await fetch("/api/admin/records/" + sourceRow._row_id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: url,
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("API responded with status " + response.status);
      }
    } else {
      // Create new source row
      var response = await fetch("/api/admin/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: groupId,
          type: "news_article",
          sub_type: "news_source",
          source_url: url,
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("API responded with status " + response.status);
      }
    }

    state.activeSourceUrl = url;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Source URL saved. Record set to draft.");
    }

    // Refresh list to update cached records
    if (typeof window.displayNewsSourcesList === "function") {
      await window.displayNewsSourcesList();
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Save URL failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to save source URL.");
    }
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: scheduleAutoSave
   Debounced auto-save (1500ms) that collects editor data and saves
   source URL, keywords, and search terms to appropriate sub-type rows.
----------------------------------------------------------------------------- */
function scheduleAutoSave() {
  if (window._newsAutoSaveTimer) {
    clearTimeout(window._newsAutoSaveTimer);
  }

  window._newsAutoSaveTimer = setTimeout(async function () {
    var state = window._newsSourcesModuleState;
    if (!state || !state.activeGroupId) return;

    // Save source URL
    await _handleSaveUrl();

    // Save keywords and search terms
    await _saveKeywordsAndTerms();
  }, 1500);
}

window.initNewsSidebar = initNewsSidebar;
window.populateNewsSidebar = populateNewsSidebar;
window.scheduleAutoSave = scheduleAutoSave;
