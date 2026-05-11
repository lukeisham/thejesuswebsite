// Trigger:  window.loadModule("news-sources") → dashboard_app.js calls
//           window.renderNewsSources()
// Main:    renderNewsSources() — injects the HTML, sets layout columns,
//           initialises the news articles list display, sidebar handler,
//           and crawler trigger, wires the function bar buttons, and
//           loads the initial news articles list.
// Output:  Fully functional News Articles editor in the Providence work
//          canvas. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._newsSourcesModuleState = {
  activeGroupId: null, // shared grouping key (id)
  activeArticleTitle: "", // article title from main entry
  activeArticleLink: "", // article link from main entry
  activeSourceUrl: "", // source URL from news_source sub-type
  activeKeywords: [], // keywords from news_source sub-type (array)
  activeSearchTerms: [], // search terms from news_search_term sub-type (array)
  activeLastCrawled: "", // last crawled timestamp
  newsArticlesRecords: [], // full list of news article main entries
  _allNewsArticleRecords: [], // all news_article records (all sub-types)
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._newsSourcesModuleState.activeGroupId;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderNewsSources
   Called by dashboard_app.js when the user navigates to the News Articles module.
   1. Requests wider sidebar layout (360px sidebar + 2fr main).
   2. Fetches and injects the News Articles editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the function bar action buttons.
   5. Loads the initial news articles list.
----------------------------------------------------------------------------- */
async function renderNewsSources() {
  /* -------------------------------------------------------------------------
       1. SET LAYOUT — This module has its own internal split-pane layout,
          so collapse the Providence sidebar and use the full main column.
    ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
       2. INJECT HTML — Fetch the News Articles editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/admin/frontend/dashboard_news_sources.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load News Articles editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("news-function-bar");
      const sidebar = doc.getElementById("news-sidebar");
      const listArea = doc.getElementById("news-list-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }

      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (listArea) mainHtml += listArea.outerHTML;

      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error("[dashboard_news_sources] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the News Articles editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
       3. INITIALISE SUB-MODULES
       Each sub-module exposes a function on window. We call them in dependency
       order after HTML injection so DOM elements are available.
    ------------------------------------------------------------------------- */

  // 3a. Reset module state
  _resetState();

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._newsSourcesModuleState.activeArticleTitle;

  // 3b. Initialise the sidebar handler (wires keyword chips, URL save, search terms)
  if (typeof window.initNewsSidebar === "function") {
    window.initNewsSidebar();
  }

  // 3c. Initialise the crawler trigger (wires Crawl button)
  if (typeof window.initNewsCrawler === "function") {
    window.initNewsCrawler();
  }

  // 3d. Initialise the metadata widget (slug, snippet, metadata_json)
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        const state = window._newsSourcesModuleState;
        if (state && state.activeGroupId) {
          try {
            await fetch("/api/admin/records/" + state.activeGroupId, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: recordData.slug,
                snippet: recordData.snippet,
                metadata_json: recordData.metadata_json,
                status: "draft",
              }),
            });
          } catch (err) {
            console.warn(
              "[dashboard_news_sources] Auto-save draft failed:",
              err,
            );
          }
        }
      },
      getRecordTitle: function () {
        const titleEl = document.getElementById("news-record-title");
        return titleEl ? titleEl.textContent.replace(/\u2014/, "").trim() : "";
      },
      getRecordId: function () {
        const state = window._newsSourcesModuleState;
        return state ? state.activeGroupId || "" : "";
      },
    });
  }

  // 3e. Load the initial news articles list
  if (typeof window.displayNewsSourcesList === "function") {
    await window.displayNewsSourcesList();
  }

  /* -------------------------------------------------------------------------
       4. WIRE FUNCTION BAR BUTTONS — Save Draft, Publish, Delete, Gather
    ------------------------------------------------------------------------- */
  _wireActionButtons();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _resetState
   Resets the module state to defaults.
----------------------------------------------------------------------------- */
function _resetState() {
  window._newsSourcesModuleState.activeGroupId = null;
  window._newsSourcesModuleState.activeArticleTitle = "";
  window._newsSourcesModuleState.activeArticleLink = "";
  window._newsSourcesModuleState.activeSourceUrl = "";
  window._newsSourcesModuleState.activeKeywords = [];
  window._newsSourcesModuleState.activeSearchTerms = [];
  window._newsSourcesModuleState.activeLastCrawled = "";
  window._newsSourcesModuleState.newsArticlesRecords = [];
  window._newsSourcesModuleState._allNewsArticleRecords = [];
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireActionButtons
   Binds click handlers to Save Draft, Publish, Delete, and Gather buttons
   in the function bar.
----------------------------------------------------------------------------- */
function _wireActionButtons() {
  // Save Draft — save current sidebar state (URL, keywords, metadata) as draft
  const btnSaveDraft = document.getElementById("btn-save-draft");
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", async function () {
      btnSaveDraft.disabled = true;
      btnSaveDraft.textContent = "Saving…";
      try {
        await _handleSaveDraft();
      } finally {
        btnSaveDraft.disabled = false;
        btnSaveDraft.textContent = "Save Draft";
      }
    });
  }

  // Publish — commit current source configuration to live
  const btnPublish = document.getElementById("btn-publish");
  if (btnPublish && typeof window.publishNewsSources === "function") {
    btnPublish.addEventListener("click", async function () {
      btnPublish.disabled = true;
      btnPublish.textContent = "Publishing…";
      try {
        await window.publishNewsSources();
      } finally {
        btnPublish.disabled = false;
        btnPublish.textContent = "Publish";
      }
    });
  }

  // Delete — prompt and delete the selected record and all its sub-type rows
  const btnDelete = document.getElementById("btn-delete");
  if (btnDelete) {
    btnDelete.addEventListener("click", async function () {
      const state = window._newsSourcesModuleState;
      if (!state.activeGroupId) {
        if (typeof window.surfaceError === "function") {
          window.surfaceError(
            "No article selected. Select an article to delete.",
          );
        }
        return;
      }
      const confirmed = confirm(
        'Are you sure you want to delete "' +
          state.activeArticleTitle +
          '" and all its source/search-term rows?',
      );
      if (!confirmed) return;
      btnDelete.disabled = true;
      btnDelete.textContent = "Deleting…";
      try {
        // Delete all sub-type rows first, then main entry
        const allRecords = state._allNewsArticleRecords || [];
        for (var i = 0; i < allRecords.length; i++) {
          if (
            allRecords[i].id === state.activeGroupId &&
            allRecords[i]._row_id
          ) {
            await fetch("/api/admin/records/" + allRecords[i]._row_id, {
              method: "DELETE",
            });
          }
        }
        if (typeof window.surfaceError === "function") {
          window.surfaceError('Deleted: "' + state.activeArticleTitle + '"');
        }
        if (typeof window.displayNewsSourcesList === "function") {
          await window.displayNewsSourcesList();
        }
      } catch (err) {
        console.error("[dashboard_news_sources] Delete failed:", err);
        if (typeof window.surfaceError === "function") {
          window.surfaceError("Error: Failed to delete record.");
        }
      } finally {
        btnDelete.disabled = false;
        btnDelete.textContent = "Delete";
      }
    });
  }

  // Gather — trigger the news crawler pipeline (shared gather tool)
  const btnGather = document.getElementById("btn-gather");
  if (btnGather) {
    btnGather.addEventListener("click", async function () {
      btnGather.disabled = true;
      btnGather.textContent = "Gathering…";
      try {
        if (typeof window.triggerGather === "function") {
          await window.triggerGather("news_crawl", "");
        } else if (typeof window.startNewsCrawl === "function") {
          await window.startNewsCrawl();
        }
      } finally {
        btnGather.disabled = false;
        btnGather.textContent = "Gather";
      }
    });
  }

  // Re-fetch the sources list
  if (typeof window.displayNewsSourcesList === "function") {
    // Ensure list is displayed
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleSaveDraft
   Collects current sidebar state (source URL, search keywords, metadata) and
   PUTs with status: 'draft'.
----------------------------------------------------------------------------- */
async function _handleSaveDraft() {
  const state = window._newsSourcesModuleState;
  if (!state.activeGroupId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No article selected. Select an article to save.");
    }
    return;
  }

  const groupId = state.activeGroupId;
  const allRecords = state._allNewsArticleRecords || [];

  // --- Save main entry (title & link) ---
  // Main entry is saved as-is; no editable fields in sidebar for it currently

  // --- Save source URL to source sub-type row ---
  const urlInput = document.getElementById("news-source-url-input");
  if (urlInput && urlInput.value.trim()) {
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
        await fetch("/api/admin/records/" + sourceRow._row_id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_url: urlInput.value.trim(),
            keywords: JSON.stringify(state.activeKeywords || []),
            status: "draft",
          }),
        });
      } else {
        await fetch("/api/admin/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: groupId,
            type: "news_article",
            sub_type: "news_source",
            source_url: urlInput.value.trim(),
            keywords: JSON.stringify(state.activeKeywords || []),
            status: "draft",
          }),
        });
      }
    } catch (err) {
      console.error("[dashboard_news_sources] Save source URL failed:", err);
    }
  }

  // --- Save search terms: delete existing, POST new ---
  var existingTermRowIds = [];
  for (var j = 0; j < allRecords.length; j++) {
    if (
      allRecords[j].type === "news_article" &&
      allRecords[j].sub_type === "news_search_term" &&
      allRecords[j].id === groupId &&
      allRecords[j]._row_id
    ) {
      existingTermRowIds.push(allRecords[j]._row_id);
    }
  }

  for (var k = 0; k < existingTermRowIds.length; k++) {
    try {
      await fetch("/api/admin/records/" + existingTermRowIds[k], {
        method: "DELETE",
      });
    } catch (err) {
      console.error("[dashboard_news_sources] Delete term row failed:", err);
    }
  }

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
      console.error("[dashboard_news_sources] POST term row failed:", err);
    }
  }

  if (typeof window.surfaceError === "function") {
    window.surfaceError('Draft saved: "' + state.activeArticleTitle + '"');
  }

  // Refresh the list to update cached records
  if (typeof window.displayNewsSourcesList === "function") {
    await window.displayNewsSourcesList();
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderNewsSources = renderNewsSources;
