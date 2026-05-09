// Trigger:  window.loadModule("news-sources") → dashboard_app.js calls
//           window.renderNewsSources()
// Main:    renderNewsSources() — injects the HTML, sets layout columns,
//           initialises the news sources list display, sidebar handler,
//           and crawler trigger, wires the function bar buttons, and
//           loads the initial news sources list.
// Output:  Fully functional News Sources editor in the Providence work
//          canvas. Errors routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._newsSourcesModuleState = {
  activeRecordId: null, // currently selected record ID
  activeRecordTitle: "", // currently selected record title
  activeRecordSlug: "", // currently selected record slug
  activeSourceUrl: "", // current record's news source URL
  activeSearchKeywords: [], // current record's search keywords (array)
  activeSnippet: "", // current record's snippet
  activeMeta: "", // current record's metadata JSON
  activeCreatedAt: "", // current record's created_at
  activeUpdatedAt: "", // current record's updated_at
  newsSourcesRecords: [], // full list of news source records
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._newsSourcesModuleState.activeRecordSlug;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderNewsSources
   Called by dashboard_app.js when the user navigates to the News Sources module.
   1. Requests wider sidebar layout (360px sidebar + 2fr main).
   2. Fetches and injects the News Sources editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the function bar action buttons.
   5. Loads the initial news sources list.
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
       2. INJECT HTML — Fetch the News Sources editor template and inject it
          into the Providence main column.
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/admin/frontend/dashboard_news_sources.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load News Sources editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("news-sources-function-bar");
      const sidebar = doc.getElementById("news-sources-sidebar");
      const listArea = doc.getElementById("news-sources-list-area");

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
        "Error: Unable to load the News Sources editor. Please refresh and try again.",
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
  window._recordTitle = window._newsSourcesModuleState.activeRecordTitle;

  // 3b. Initialise the sidebar handler (wires keyword chips, URL save, metadata)
  if (typeof window.initNewsSourcesSidebar === "function") {
    window.initNewsSourcesSidebar();
  }

  // 3c. Initialise the crawler trigger (wires Crawl button)
  if (typeof window.initNewsCrawler === "function") {
    window.initNewsCrawler();
  }

  // 3d. Load the initial news sources list
  if (typeof window.displayNewsSourcesList === "function") {
    await window.displayNewsSourcesList();
  }

  /* -------------------------------------------------------------------------
       4. WIRE FUNCTION BAR BUTTONS — Save Draft, Publish, Delete, Gather
    ------------------------------------------------------------------------- */
  _wireActionButtons();

  /* -------------------------------------------------------------------------
       5. INITIALISE SHARED TOOLS — Metadata widget
       The metadata_widget.js is loaded globally via dashboard.html.
    ------------------------------------------------------------------------- */
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        // News Sources has its own save-on-blur pattern — auto-save via PUT
        const state = window._newsSourcesModuleState;
        if (state && state.activeRecordId) {
          try {
            await fetch("/api/admin/records/" + state.activeRecordId, {
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
        const titleEl = document.getElementById("news-sources-record-title");
        return titleEl ? titleEl.textContent.replace(/\u2014/, "").trim() : "";
      },
      getRecordId: function () {
        const state = window._newsSourcesModuleState;
        return state ? state.activeRecordId || "" : "";
      },
    });
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _resetState
   Resets the module state to defaults.
----------------------------------------------------------------------------- */
function _resetState() {
  window._newsSourcesModuleState.activeRecordId = null;
  window._newsSourcesModuleState.activeRecordTitle = "";
  window._newsSourcesModuleState.activeRecordSlug = "";
  window._newsSourcesModuleState.activeSourceUrl = "";
  window._newsSourcesModuleState.activeSearchKeywords = [];
  window._newsSourcesModuleState.activeSnippet = "";
  window._newsSourcesModuleState.activeMeta = "";
  window._newsSourcesModuleState.activeCreatedAt = "";
  window._newsSourcesModuleState.activeUpdatedAt = "";
  window._newsSourcesModuleState.newsSourcesRecords = [];
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

  // Delete — prompt and delete the selected record
  const btnDelete = document.getElementById("btn-delete");
  if (btnDelete) {
    btnDelete.addEventListener("click", async function () {
      const state = window._newsSourcesModuleState;
      if (!state.activeRecordId) {
        if (typeof window.surfaceError === "function") {
          window.surfaceError("No record selected. Select a record to delete.");
        }
        return;
      }
      const confirmed = confirm(
        'Are you sure you want to delete "' + state.activeRecordTitle + '"?',
      );
      if (!confirmed) return;
      btnDelete.disabled = true;
      btnDelete.textContent = "Deleting…";
      try {
        const response = await fetch(
          "/api/admin/records/" + encodeURIComponent(state.activeRecordId),
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("HTTP " + response.status);
        if (typeof window.surfaceError === "function") {
          window.surfaceError('Deleted: "' + state.activeRecordTitle + '"');
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
  if (!state.activeRecordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No record selected. Select a record to save.");
    }
    return;
  }

  const payload = { status: "draft" };

  // Collect slug and snippet from metadata widget
  if (typeof window.collectMetadataWidget === "function") {
    const metaData = window.collectMetadataWidget("metadata-widget-container");
    payload.slug = metaData.slug || state.activeRecordSlug;
    payload.snippet = metaData.snippet || state.activeSnippet;
    payload.metadata_json = metaData.metadata_json || state.activeMeta;
  }

  // Collect current source URL
  const urlInput = document.getElementById("news-sources-url-input");
  if (urlInput && urlInput.value.trim()) {
    payload.news_sources = JSON.stringify({ url: urlInput.value.trim() });
  }

  // Collect search keywords from state
  if (state.activeSearchKeywords && state.activeSearchKeywords.length > 0) {
    payload.news_search_term = JSON.stringify(state.activeSearchKeywords);
  }

  try {
    const response = await fetch(
      "/api/admin/records/" + encodeURIComponent(state.activeRecordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error("HTTP " + response.status);

    if (typeof window.surfaceError === "function") {
      window.surfaceError('Draft saved: "' + state.activeRecordTitle + '"');
    }
  } catch (err) {
    console.error("[dashboard_news_sources] Save draft failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError("Error: Failed to save draft.");
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderNewsSources = renderNewsSources;
