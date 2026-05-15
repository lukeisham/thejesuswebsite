// Trigger:  Called by dashboard_news_sources.js -> window.initNewsSidebar()
//           on module initialisation, and by news_sources_handler.js ->
//           window.populateNewsSidebar() when an article row is selected.
// Main:    initNewsSidebar() -- wires all sidebar interactive elements
//           to their handlers. Manages source URL and search terms across
//           the three sub-types sharing a common group id.
//           populateNewsSidebar(record) -- fills sidebar fields with
//           the selected article's source config and search terms.
// Output:  Interactive sidebar with source URL editing and search term
//          textarea (matching Wikipedia/Challenge pattern). All
//          modifications are auto-saved as draft. Errors routed through
//          window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsSidebar
----------------------------------------------------------------------------- */
function initNewsSidebar() {
  // --- Source URL Save ---
  var saveUrlBtn = document.getElementById("btn-news-save-url");
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener("click", _handleSaveUrl);
  }

  // --- Source URL input (auto-save on blur) ---
  var urlInput = document.getElementById("news-source-url-input");
  if (urlInput) urlInput.addEventListener("blur", _handleSaveUrl);

  // --- Search Terms textarea (auto-save) ---
  _wireSearchTermsAutoSave();

  // Sidebar starts disabled -- no record selected yet
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

  // Populate search terms textarea and overview
  _renderSearchTermsInTextarea();
  _renderSearchTermsOverview();

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

  var termsInput = document.getElementById("news-search-terms-input");
  if (termsInput) termsInput.value = "";

  var overviewList = document.getElementById("news-search-terms-overview-list");
  if (overviewList) overviewList.innerHTML = "";

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
    "news-search-terms-input",
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
   INTERNAL: _renderSearchTermsInTextarea
   Populates the search terms textarea from module state (one term per line).
----------------------------------------------------------------------------- */
function _renderSearchTermsInTextarea() {
  var state = window._newsSourcesModuleState;
  var termsInput = document.getElementById("news-search-terms-input");
  if (!termsInput) return;

  var terms = state ? state.activeSearchTerms : [];
  termsInput.value = (terms || []).join("\n");
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchTermsOverview
   Renders a read-only overview list of saved search terms.
----------------------------------------------------------------------------- */
function _renderSearchTermsOverview() {
  var listEl = document.getElementById("news-search-terms-overview-list");
  if (!listEl) return;

  var state = window._newsSourcesModuleState;
  var terms = state ? state.activeSearchTerms : [];

  listEl.innerHTML = "";

  if (!terms || terms.length === 0) {
    var emptyItem = document.createElement("li");
    emptyItem.className =
      "news-search-terms-overview-item news-search-terms-overview-item--empty";
    emptyItem.textContent = "No search terms saved.";
    listEl.appendChild(emptyItem);
    return;
  }

  terms.forEach(function (term) {
    var itemEl = document.createElement("li");
    itemEl.className = "news-search-terms-overview-item";
    itemEl.textContent = term;
    listEl.appendChild(itemEl);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireSearchTermsAutoSave
   Wires auto-save on the search terms textarea:
     - input event (debounced 1s)
     - blur event (save immediately)
     - Enter key (save immediately, no newline)
----------------------------------------------------------------------------- */
function _wireSearchTermsAutoSave() {
  var termsInput = document.getElementById("news-search-terms-input");
  if (!termsInput || termsInput.dataset.wired) return;

  var saveTimeout = null;

  function _saveNow() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    _saveSearchTerms();
  }

  termsInput.addEventListener("input", function () {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      _saveSearchTerms();
    }, 1000);
  });

  termsInput.addEventListener("blur", function () {
    _saveNow();
  });

  // Enter saves immediately (no newline insertion)
  termsInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      _saveNow();
    }
  });

  termsInput.dataset.wired = "true";
}

/* -----------------------------------------------------------------------------
   HANDLER: _saveSearchTerms
   Reads the textarea, parses terms (split by newlines or commas), and saves
   to search term sub-type rows. Re-renders the overview list on success.
----------------------------------------------------------------------------- */
async function _saveSearchTerms() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeGroupId) return;

  var groupId = state.activeGroupId;
  var allRecords = state._allNewsArticleRecords || [];

  // Parse terms from textarea
  var termsInput = document.getElementById("news-search-terms-input");
  var rawValue = termsInput ? termsInput.value.trim() : "";

  var searchTerms = rawValue
    .split(/[\n,]+/)
    .map(function (t) {
      return t.trim();
    })
    .filter(function (t) {
      return t.length > 0;
    });

  // Update module state
  state.activeSearchTerms = searchTerms;

  // Delete all existing search term rows for this group
  for (var j = 0; j < allRecords.length; j++) {
    if (
      allRecords[j].type === "news_article" &&
      allRecords[j].sub_type === "news_search_term" &&
      allRecords[j].parent_id === groupId
    ) {
      try {
        await fetch("/api/admin/records/" + allRecords[j].id, {
          method: "DELETE",
        });
      } catch (err) {
        console.error(
          "[news_sources_sidebar] Delete search term row failed:",
          err,
        );
      }
    }
  }

  // POST new search term rows (each gets its own unique id, linked by parent_id)
  for (var t = 0; t < searchTerms.length; t++) {
    try {
      await fetch("/api/admin/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: groupId,
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

  // Re-render the overview list
  _renderSearchTermsOverview();

  if (typeof window.surfaceError === "function") {
    window.surfaceError(
      "Search terms saved for '" + state.activeArticleTitle + "'.",
    );
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

  // Find existing source row (linked by parent_id)
  var sourceRow = null;
  for (var i = 0; i < allRecords.length; i++) {
    if (
      allRecords[i].type === "news_article" &&
      allRecords[i].sub_type === "news_source" &&
      allRecords[i].parent_id === groupId
    ) {
      sourceRow = allRecords[i];
      break;
    }
  }

  try {
    if (sourceRow && sourceRow.id) {
      // Update existing source row
      var response = await fetch("/api/admin/records/" + sourceRow.id, {
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
      // Create new source row (unique id auto-generated, linked by parent_id)
      var response = await fetch("/api/admin/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: groupId,
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
   FUNCTION: scheduleNewsSourcesAutoSave
   Debounced auto-save (1500ms) that collects editor data and saves
   source URL and search terms to appropriate sub-type rows.
----------------------------------------------------------------------------- */
function scheduleNewsSourcesAutoSave() {
  if (window._newsAutoSaveTimer) {
    clearTimeout(window._newsAutoSaveTimer);
  }

  window._newsAutoSaveTimer = setTimeout(async function () {
    var state = window._newsSourcesModuleState;
    if (!state || !state.activeGroupId) return;

    // Save source URL
    await _handleSaveUrl();

    // Save search terms
    await _saveSearchTerms();
  }, 1500);
}

window.initNewsSidebar = initNewsSidebar;
window.populateNewsSidebar = populateNewsSidebar;
window.scheduleNewsSourcesAutoSave = scheduleNewsSourcesAutoSave;
