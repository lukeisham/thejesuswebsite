// Trigger:  Called by dashboard_news_sources.js → window.initNewsSourcesSidebar()
//           on module initialisation, and by news_sources_handler.js →
//           window.populateNewsSourcesSidebar() when a source row is selected.
// Main:    initNewsSourcesSidebar() — wires all sidebar interactive elements
//           (source URL save, keyword add/remove, metadata save, auto-gen
//           buttons) to their handlers.
//           populateNewsSourcesSidebar(record) — fills sidebar fields with
//           the selected record's data (source URL, keywords, snippet, slug,
//           meta, timestamps).
// Output:  Interactive sidebar with keyword chip management and metadata
//          editing for the selected news source record. All modifications
//          are auto-saved as draft. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initNewsSourcesSidebar
   Wires all interactive elements in the sidebar: save URL button, add/remove
   keyword buttons, metadata save, and auto-gen snippet/slug/meta buttons.
   Called once when the module is initialised.
----------------------------------------------------------------------------- */
function initNewsSourcesSidebar() {
  // --- Source URL Save ---
  var saveUrlBtn = document.getElementById("btn-news-save-url");
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener("click", _handleSaveUrl);
  }

  // --- Search Keywords ---
  var addTermBtn = document.getElementById("btn-news-add-term");
  var addTermInput = document.getElementById("news-search-term-input");
  if (addTermBtn && addTermInput) {
    addTermBtn.addEventListener("click", _handleAddTerm);
    // Enter key in the input also adds
    addTermInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        _handleAddTerm();
      }
    });
  }

  // --- Auto-Gen Buttons ---
  var autoSnippetBtn = document.getElementById("btn-news-auto-snippet");
  if (autoSnippetBtn) {
    autoSnippetBtn.addEventListener("click", _handleAutoGenSnippet);
  }

  var autoSlugBtn = document.getElementById("btn-news-auto-slug");
  if (autoSlugBtn) {
    autoSlugBtn.addEventListener("click", _handleAutoGenSlug);
  }

  var autoMetaBtn = document.getElementById("btn-news-auto-meta");
  if (autoMetaBtn) {
    autoMetaBtn.addEventListener("click", _handleAutoGenMeta);
  }

  // --- Metadata field change listeners (auto-save on blur) ---
  var snippetInput = document.getElementById("news-sources-snippet-input");
  var slugInput = document.getElementById("news-sources-slug-input");
  var metaInput = document.getElementById("news-sources-meta-input");
  if (snippetInput) snippetInput.addEventListener("blur", _handleSaveMetadata);
  if (slugInput) slugInput.addEventListener("blur", _handleSaveMetadata);
  if (metaInput) metaInput.addEventListener("blur", _handleSaveMetadata);

  // --- Source URL input change (auto-save on blur) ---
  var urlInput = document.getElementById("news-sources-url-input");
  if (urlInput) urlInput.addEventListener("blur", _handleSaveUrl);
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: populateNewsSourcesSidebar
   Fills the sidebar fields with the selected record's data.

   Parameters:
     record (object) — the record data object from the API
----------------------------------------------------------------------------- */
function populateNewsSourcesSidebar(record) {
  var state = window._newsSourcesModuleState;
  if (!state) return;

  // --- Record title in sidebar header ---
  var titleEl = document.getElementById("news-sources-record-title");
  if (titleEl) {
    titleEl.textContent = record.title || record.slug || "Untitled Source";
  }

  // --- Source URL ---
  var urlInput = document.getElementById("news-sources-url-input");
  if (urlInput) {
    urlInput.value = state.activeSourceUrl || "";
  }

  // --- Search Keywords ---
  _renderSearchKeywords();

  // --- Metadata fields ---
  var snippetInput = document.getElementById("news-sources-snippet-input");
  if (snippetInput) {
    snippetInput.value = state.activeSnippet || "";
  }

  var slugInput = document.getElementById("news-sources-slug-input");
  if (slugInput) {
    slugInput.value = state.activeRecordSlug || "";
  }

  var metaInput = document.getElementById("news-sources-meta-input");
  if (metaInput) {
    metaInput.value = state.activeMeta || "";
  }

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

  // Update the record-slug input in the shared metadata footer
  var sharedSlugInput = document.getElementById("record-slug");
  if (sharedSlugInput) {
    sharedSlugInput.value = state.activeRecordSlug || "";
  }

  var sharedMetadataJson = document.getElementById("record-metadata-json");
  if (sharedMetadataJson) {
    sharedMetadataJson.value = record.metadata_json || "";
  }

  var sharedCreatedAt = document.getElementById("record-created-at");
  if (sharedCreatedAt) {
    sharedCreatedAt.value = record.created_at || "";
  }

  var sharedUpdatedAt = document.getElementById("record-updated-at");
  if (sharedUpdatedAt) {
    sharedUpdatedAt.value = record.updated_at || "";
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearSidebar
   Resets all sidebar fields to empty/default values.
----------------------------------------------------------------------------- */
function _clearSidebar() {
  var titleEl = document.getElementById("news-sources-record-title");
  if (titleEl) titleEl.textContent = "—";

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

  // Clear keyword chips
  var termsList = document.getElementById("news-search-terms-list");
  if (termsList) termsList.innerHTML = "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: _renderSearchKeywords
   Renders keyword chips for the currently selected record.
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
    removeBtn.textContent = "×";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("aria-label", "Remove keyword: " + term);
    removeBtn.setAttribute("title", "Remove keyword");
    removeBtn.addEventListener("click", function () {
      _handleRemoveTerm(index);
    });
    chipEl.appendChild(removeBtn);

    termsList.appendChild(chipEl);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleSaveUrl
   Saves the source URL for the active record via PUT to /api/admin/records/{id}.
   Sets the record status to draft.
----------------------------------------------------------------------------- */
async function _handleSaveUrl() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No news source selected. Please select a source first.",
      );
    }
    return;
  }

  var urlInput = document.getElementById("news-sources-url-input");
  var newUrl = urlInput ? urlInput.value.trim() : "";

  if (!newUrl) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Please enter a valid source URL.");
    }
    return;
  }

  // Build the news_sources JSON blob: {"url": "...", "name": "..."}
  var title = state.activeRecordTitle || state.activeRecordSlug || "Untitled";
  var sourceData = JSON.stringify({
    url: newUrl,
    name: title,
  });

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        news_sources: sourceData,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update module state
    state.activeSourceUrl = newUrl;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Source URL saved as draft.");
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Save URL failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to update news source '" +
          title +
          "'. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAddTerm
   Adds a new search keyword to the active record and auto-saves as draft.
----------------------------------------------------------------------------- */
async function _handleAddTerm() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No news source selected. Please select a source first.",
      );
    }
    return;
  }

  var termInput = document.getElementById("news-search-term-input");
  var newTerm = termInput ? termInput.value.trim() : "";

  if (!newTerm) return;

  // Avoid duplicates
  if (state.activeSearchKeywords.indexOf(newTerm) !== -1) {
    if (termInput) termInput.value = "";
    return;
  }

  // Add to local state
  var updatedKeywords = state.activeSearchKeywords.slice();
  updatedKeywords.push(newTerm);

  var termsJson = JSON.stringify(updatedKeywords);

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        news_search_term: termsJson,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update module state
    state.activeSearchKeywords = updatedKeywords;

    // Clear input and re-render chips
    if (termInput) termInput.value = "";
    _renderSearchKeywords();

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Keyword '" + newTerm + "' added. Saved as draft.");
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Add keyword failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search keywords. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleRemoveTerm
   Removes a search keyword at the given index and auto-saves as draft.

   Parameters:
     index (number) — index of the keyword to remove in the activeKeywords array
----------------------------------------------------------------------------- */
async function _handleRemoveTerm(index) {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) return;

  var updatedKeywords = state.activeSearchKeywords.slice();
  if (index < 0 || index >= updatedKeywords.length) return;

  var removedTerm = updatedKeywords[index];
  updatedKeywords.splice(index, 1);

  var termsJson = JSON.stringify(updatedKeywords);

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        news_search_term: termsJson,
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update module state
    state.activeSearchKeywords = updatedKeywords;

    // Re-render chips
    _renderSearchKeywords();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Keyword '" + removedTerm + "' removed. Saved as draft.",
      );
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Remove keyword failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save search keywords. Please try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleSaveMetadata
   Auto-saves snippet, slug, and meta fields as draft when the user leaves
   a metadata input field (on blur).
----------------------------------------------------------------------------- */
async function _handleSaveMetadata() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) return;

  var snippetInput = document.getElementById("news-sources-snippet-input");
  var slugInput = document.getElementById("news-sources-slug-input");
  var metaInput = document.getElementById("news-sources-meta-input");

  var newSnippet = snippetInput ? snippetInput.value : "";
  var newSlug = slugInput ? slugInput.value : "";
  var newMeta = metaInput ? metaInput.value : "";

  // Build payload — only send changed fields
  var payload = { status: "draft" };

  if (newSnippet !== state.activeSnippet) {
    payload.snippet = newSnippet;
  }
  if (newSlug !== state.activeRecordSlug) {
    payload.slug = newSlug;
  }
  if (newMeta !== state.activeMeta) {
    payload.metadata_json = newMeta;
  }

  // If nothing changed, skip the API call
  if (Object.keys(payload).length <= 1) return;

  try {
    var response = await fetch("/api/admin/records/" + state.activeRecordId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    // Update module state
    state.activeSnippet = newSnippet;
    state.activeRecordSlug = newSlug;
    state.activeMeta = newMeta;

    // Update shared metadata footer fields
    var sharedSlugInput = document.getElementById("record-slug");
    if (sharedSlugInput) sharedSlugInput.value = newSlug;

    var sharedMetadataJson = document.getElementById("record-metadata-json");
    if (sharedMetadataJson) sharedMetadataJson.value = newMeta;
  } catch (err) {
    console.error("[news_sources_sidebar] Save metadata failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save metadata for the selected record.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAutoGenSnippet
   Calls the snippet generator API for the active record and populates
   the snippet textarea with the result.
----------------------------------------------------------------------------- */
async function _handleAutoGenSnippet() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Snippet generation failed. No source selected.",
      );
    }
    return;
  }

  var btn = document.getElementById("btn-news-auto-snippet");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  try {
    var response = await fetch("/api/admin/snippet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.activeRecordSlug || state.activeRecordId,
        content: state.activeRecordTitle || "",
      }),
    });

    if (!response.ok) {
      var errDetail = "API responded with status " + response.status;
      try {
        var errBody = await response.json();
        if (errBody && errBody.detail) errDetail = errBody.detail;
      } catch (_) {
        /* ignore parse error */
      }
      throw new Error(errDetail);
    }

    var data = await response.json();
    var snippet = data.snippet || "";

    // Populate the snippet textarea
    var snippetInput = document.getElementById("news-sources-snippet-input");
    if (snippetInput) {
      snippetInput.value = snippet;
    }

    // Auto-save
    await _handleSaveMetadata();

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Snippet generated successfully. Saved as draft.");
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Auto-gen snippet failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Snippet generation failed. Please try again or enter manually.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Auto-gen Snippet";
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAutoGenSlug
   Generates a URL-friendly slug from the record title and populates
   the slug input.
----------------------------------------------------------------------------- */
function _handleAutoGenSlug() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) return;

  var title = state.activeRecordTitle || "";
  var slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  var slugInput = document.getElementById("news-sources-slug-input");
  if (slugInput) {
    slugInput.value = slug;
  }

  // Trigger auto-save
  _handleSaveMetadata();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleAutoGenMeta
   Calls the metadata generator API for the active record and populates
   the meta input.
----------------------------------------------------------------------------- */
async function _handleAutoGenMeta() {
  var state = window._newsSourcesModuleState;
  if (!state || !state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Metadata generation failed. No source selected.",
      );
    }
    return;
  }

  var btn = document.getElementById("btn-news-auto-meta");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }

  try {
    var response = await fetch("/api/admin/metadata/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.activeRecordSlug || state.activeRecordId,
        content: state.activeRecordTitle || "",
      }),
    });

    if (!response.ok) {
      var errDetail = "API responded with status " + response.status;
      try {
        var errBody = await response.json();
        if (errBody && errBody.detail) errDetail = errBody.detail;
      } catch (_) {
        /* ignore parse error */
      }
      throw new Error(errDetail);
    }

    var data = await response.json();
    var metaJson = data.metadata_json || "";

    // Populate the meta input
    var metaInput = document.getElementById("news-sources-meta-input");
    if (metaInput) {
      metaInput.value =
        typeof metaJson === "string" ? metaJson : JSON.stringify(metaJson);
    }

    // Auto-save
    await _handleSaveMetadata();

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Metadata generated successfully. Saved as draft.");
    }
  } catch (err) {
    console.error("[news_sources_sidebar] Auto-gen meta failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Metadata generation failed. Please try again or enter manually.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Auto-gen Meta";
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_news_sources.js and news_sources_handler.js
----------------------------------------------------------------------------- */
window.initNewsSourcesSidebar = initNewsSourcesSidebar;
window.populateNewsSourcesSidebar = populateNewsSourcesSidebar;
