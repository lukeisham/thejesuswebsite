// Trigger:  Called by dashboard_news_sources.js → window.initNewsSourcesSidebar()
//           on module initialisation, and by news_sources_handler.js →
//           window.populateNewsSourcesSidebar() when a source row is selected.
// Main:    initNewsSourcesSidebar() — wires all sidebar interactive elements
//           to their handlers. Delegates auto-gen and term-chip logic to
//           shared window.* functions in js/admin_core/.
//           populateNewsSourcesSidebar(record) — fills sidebar fields with
//           the selected record's data.
// Output:  Interactive sidebar with keyword chip management and metadata
//          editing for the selected news source record. All modifications
//          are auto-saved as draft. Errors routed through window.surfaceError().

"use strict";

// ---------------------------------------------------------------------------|
// Config for shared admin_core functions — News Sources-specific element IDs |
// ---------------------------------------------------------------------------|
var _nsSnippetConfig = {
  snippetInputId: "news-sources-snippet-input",
  spinnerBtnId: "btn-news-auto-snippet",
};
var _nsSlugConfig = { slugInputId: "news-sources-slug-input" };
var _nsMetaConfig = {
  metaInputId: "news-sources-meta-input",
  spinnerBtnId: "btn-news-auto-meta",
};
var _nsSaveMetaConfig = {
  snippetInputId: "news-sources-snippet-input",
  slugInputId: "news-sources-slug-input",
  metaInputId: "news-sources-meta-input",
  stateFieldMap: {
    snippet: "activeSnippet",
    slug: "activeRecordSlug",
    meta: "activeMeta",
  },
};
var _nsTermChipConfig = {
  prefix: "news-",
  inputId: "news-search-term-input",
  termColumn: "news_search_term",
  stateTermsKey: "activeSearchKeywords",
  renderFn: _renderSearchKeywords,
};

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsSourcesSidebar
----------------------------------------------------------------------------- */
function initNewsSourcesSidebar() {
  // --- Source URL Save ---
  var saveUrlBtn = document.getElementById("btn-news-save-url");
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener("click", _handleSaveUrl);
  }

  // --- Search Keywords (add button → shared) ---
  var addTermBtn = document.getElementById("btn-news-add-term");
  var addTermInput = document.getElementById("news-search-term-input");
  if (addTermBtn) {
    addTermBtn.addEventListener("click", function () {
      window.addSidebarTerm(window._newsSourcesModuleState, _nsTermChipConfig);
    });
  }
  if (addTermInput) {
    addTermInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        window.addSidebarTerm(
          window._newsSourcesModuleState,
          _nsTermChipConfig,
        );
      }
    });
  }

  // --- Auto-Gen Buttons → shared ---
  var autoSnippetBtn = document.getElementById("btn-news-auto-snippet");
  if (autoSnippetBtn) {
    autoSnippetBtn.addEventListener("click", function () {
      window.triggerAutoGenSnippet(
        window._newsSourcesModuleState,
        _nsSnippetConfig,
      );
    });
  }

  var autoSlugBtn = document.getElementById("btn-news-auto-slug");
  if (autoSlugBtn) {
    autoSlugBtn.addEventListener("click", function () {
      window.triggerAutoGenSlug(window._newsSourcesModuleState, _nsSlugConfig);
    });
  }

  var autoMetaBtn = document.getElementById("btn-news-auto-meta");
  if (autoMetaBtn) {
    autoMetaBtn.addEventListener("click", function () {
      window.triggerAutoGenMeta(window._newsSourcesModuleState, _nsMetaConfig);
    });
  }

  // --- Metadata field save-on-blur → shared ---
  var snippetInput = document.getElementById("news-sources-snippet-input");
  var slugInput = document.getElementById("news-sources-slug-input");
  var metaInput = document.getElementById("news-sources-meta-input");
  if (snippetInput) {
    snippetInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._newsSourcesModuleState,
        _nsSaveMetaConfig,
      );
    });
  }
  if (slugInput) {
    slugInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._newsSourcesModuleState,
        _nsSaveMetaConfig,
      );
    });
  }
  if (metaInput) {
    metaInput.addEventListener("blur", function () {
      window.saveSidebarMetadata(
        window._newsSourcesModuleState,
        _nsSaveMetaConfig,
      );
    });
  }

  // --- Source URL input (auto-save on blur) ---
  var urlInput = document.getElementById("news-sources-url-input");
  if (urlInput) urlInput.addEventListener("blur", _handleSaveUrl);

  // Sidebar starts disabled — no record selected yet
  _setSidebarDisabled(true);
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: populateNewsSourcesSidebar
----------------------------------------------------------------------------- */
function populateNewsSourcesSidebar(record) {
  var state = window._newsSourcesModuleState;
  if (!state) return;

  _setSidebarDisabled(false);

  var titleEl = document.getElementById("news-sources-record-title");
  if (titleEl) {
    titleEl.textContent = record.title || record.slug || "Untitled Source";
  }

  var urlInput = document.getElementById("news-sources-url-input");
  if (urlInput) urlInput.value = state.activeSourceUrl || "";

  _renderSearchKeywords();

  var snippetInput = document.getElementById("news-sources-snippet-input");
  if (snippetInput) snippetInput.value = state.activeSnippet || "";

  var slugInput = document.getElementById("news-sources-slug-input");
  if (slugInput) slugInput.value = state.activeRecordSlug || "";

  var metaInput = document.getElementById("news-sources-meta-input");
  if (metaInput) metaInput.value = state.activeMeta || "";

  // --- Shared tool: update metadata footer display ---
  var metadataFooter = document.getElementById("news-sources-metadata-footer");
  if (
    metadataFooter &&
    typeof metadataFooter._setMetadataDisplay === "function"
  ) {
    metadataFooter._setMetadataDisplay({
      metadata_json: record.metadata_json || "",
      created_at: record.created_at || "",
      updated_at: record.updated_at || "",
    });
  }

  // Populate the shared metadata widget
  if (typeof window.populateMetadataWidget === "function") {
    window.populateMetadataWidget("metadata-widget-container", record);
  }

  var sharedSlugInput = document.getElementById("record-slug");
  if (sharedSlugInput) sharedSlugInput.value = state.activeRecordSlug || "";

  var sharedMetadataJson = document.getElementById("record-metadata-json");
  if (sharedMetadataJson) sharedMetadataJson.value = record.metadata_json || "";

  var sharedCreatedAt = document.getElementById("record-created-at");
  if (sharedCreatedAt) sharedCreatedAt.value = record.created_at || "";

  var sharedUpdatedAt = document.getElementById("record-updated-at");
  if (sharedUpdatedAt) sharedUpdatedAt.value = record.updated_at || "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("news-sources-record-title");
  if (titleEl) titleEl.textContent = "\u2014";

  var urlInput = document.getElementById("news-sources-url-input");
  if (urlInput) urlInput.value = "";

  var snippetInput = document.getElementById("news-sources-snippet-input");
  if (snippetInput) snippetInput.value = "";

  var slugInput = document.getElementById("news-sources-slug-input");
  if (slugInput) slugInput.value = "";

  var metaInput = document.getElementById("news-sources-meta-input");
  if (metaInput) metaInput.value = "";

  var sharedSlugInput = document.getElementById("record-slug");
  if (sharedSlugInput) sharedSlugInput.value = "";

  var sharedMetadataJson = document.getElementById("record-metadata-json");
  if (sharedMetadataJson) sharedMetadataJson.value = "";

  var sharedCreatedAt = document.getElementById("record-created-at");
  if (sharedCreatedAt) sharedCreatedAt.value = "";

  var sharedUpdatedAt = document.getElementById("record-updated-at");
  if (sharedUpdatedAt) sharedUpdatedAt.value = "";

  var termsList = document.getElementById("news-search-terms-list");
  if (termsList) termsList.innerHTML = "";

  // Clear the shared metadata widget
  if (typeof window.populateMetadataWidget === "function") {
    window.populateMetadataWidget("metadata-widget-container", null);
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _setSidebarDisabled
   Disables/enables all sidebar interactive elements and dims the sidebar
   sections when no record row is selected. Called on init (disabled state)
   and when populateNewsSourcesSidebar activates a record (enabled state).
----------------------------------------------------------------------------- */
function _setSidebarDisabled(disabled) {
  var ids = [
    "news-sources-url-input",
    "btn-news-save-url",
    "news-search-term-input",
    "btn-news-add-term",
    "news-sources-snippet-input",
    "btn-news-auto-snippet",
    "news-sources-slug-input",
    "btn-news-auto-slug",
    "news-sources-meta-input",
    "btn-news-auto-meta",
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

  // Dim sidebar sections via inline style (opacity for visual feedback)
  var sectionIds = [
    "news-sources-url-section",
    "news-sources-search-terms",
    "metadata-widget-container",
  ];

  sectionIds.forEach(function (id) {
    var section = document.getElementById(id);
    if (section) {
      section.style.opacity = disabled ? "0.45" : "";
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchKeywords
   Remove buttons call window.removeSidebarTerm (shared).
----------------------------------------------------------------------------- */
function _renderSearchKeywords() {
  var state = window._newsSourcesModuleState;
  var termsList = document.getElementById("news-search-terms-list");
  if (!termsList) return;

  termsList.innerHTML = "";

  var keywords = state ? state.activeSearchKeywords : [];
  if (!keywords || keywords.length === 0) return;

  keywords.forEach(function (term, index) {
    var chipEl = document.createElement("li");
    chipEl.className = "news-sources-search-term-chip";

    var textEl = document.createElement("span");
    textEl.className = "news-sources-search-term-chip__text";
    textEl.textContent = term;
    chipEl.appendChild(textEl);

    var removeBtn = document.createElement("button");
    removeBtn.className = "news-sources-search-term-chip__remove";
    removeBtn.textContent = "\u00d7";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove keyword: " + term);
    removeBtn.setAttribute("title", "Remove keyword");
    removeBtn.addEventListener("click", function () {
      window.removeSidebarTerm(
        window._newsSourcesModuleState,
        _nsTermChipConfig,
        index,
      );
    });
    chipEl.appendChild(removeBtn);

    termsList.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   HANDLER: _handleSaveUrl (unique to News)
----------------------------------------------------------------------------- */
async function _handleSaveUrl() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) return;

  var urlInput = document.getElementById("news-sources-url-input");
  if (!urlInput) return;

  var rawUrl = urlInput.value.trim();
  if (!rawUrl) return;

  let url, name;
  try {
    var parsed = JSON.parse(rawUrl);
    url = parsed.url || rawUrl;
    name = parsed.name || "";
  } catch (e) {
    // Input is a plain URL string, not JSON
    url = rawUrl;
    name = "";
  }

  try {
    var payload = {
      news_sources: JSON.stringify({ url: url, name: name }),
      status: "draft",
    };

    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    state.activeSourceUrl = urlInput.value;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Source URL saved. Record set to draft.");
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Save URL failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to save source URL.");
    }
  }
}

window.initNewsSourcesSidebar = initNewsSourcesSidebar;
window.populateNewsSourcesSidebar = populateNewsSourcesSidebar;
