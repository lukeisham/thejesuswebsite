// Trigger:  window.loadModule("challenge-response") → dashboard_app.js calls
//           window.renderChallengeResponse()
// Main:    renderChallengeResponse() — injects the challenge response editor
//           HTML, sets layout columns, initialises all sub-modules (data
//           display, markdown editor, status handler), and coordinates calls
//           to shared tools (MLA, context links, metadata widget).
//           NOTE: No picture handler — challenge_response type has no picture
//           fields per schema.
// Output:  Fully functional Challenge Response editor in the Providence work
//           canvas. Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._challengeResponseModuleState = {
  activeRecordId: null, // currently selected response record ID (slug)
  activeRecordTitle: "", // currently selected response title
  isDirty: false, // true when markdown has unsaved changes
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._challengeResponseModuleState.activeRecordId;

// Bridge: markdown_editor.js writes to window._essayModuleState.isDirty.
// Point it to our module state so dirty tracking works for challenge responses.
window._essayModuleState = window._challengeResponseModuleState;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderChallengeResponse
   Called by dashboard_app.js when the user navigates to this module.
   1. Sets the Providence canvas layout (sidebar 360px, main 1fr).
   2. Injects the editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Loads the response content if navigated via _selectedRecordId.
----------------------------------------------------------------------------- */
async function renderChallengeResponse() {
  /* -------------------------------------------------------------------------
     1. SET LAYOUT — Sidebar is internal to this module, so we collapse the
        Providence sidebar and use the full main column for our split-pane.
  ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
     2. INJECT HTML — The editor template is loaded via fetch and injected
        into the Providence main column.
  ------------------------------------------------------------------------- */
  try {
    const response = await fetch(
      "/admin/frontend/dashboard_challenge_response.html",
    );
    if (!response.ok) {
      throw new Error(
        "Failed to load challenge response editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("wysiwyg-function-bar");
      const sidebar = doc.getElementById("wysiwyg-sidebar");
      const editorArea = doc.getElementById("wysiwyg-editor-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }

      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (editorArea) mainHtml += editorArea.outerHTML;

      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error("[dashboard_challenge_response] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Challenge Response editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
     3. INITIALISE SUB-MODULES (in dependency order)
     Each sub-module exposes a function on window. We call them after the
     HTML is injected so DOM elements are available.
  ------------------------------------------------------------------------- */

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._challengeResponseModuleState.activeRecordTitle;

  // 3a. Load the sidebar response list
  if (typeof window.displayChallengeResponseList === "function") {
    await window.displayChallengeResponseList();
  }

  // 3b. Initialise the markdown editor with empty content
  if (typeof window.initMarkdownEditor === "function") {
    window.initMarkdownEditor("");
  }

  // 3c. Initialise challenge response status handler
  if (typeof window.initChallengeResponseStatusHandler === "function") {
    window.initChallengeResponseStatusHandler();
  }

  /* -------------------------------------------------------------------------
     4. INITIALISE SHARED TOOLS
     NOTE: No picture handler — challenge_response type has no picture fields.
  ------------------------------------------------------------------------- */

  // 4a. MLA bibliography handler
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("wysiwyg-bibliography-container");
  }

  // 4b. Context links handler
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("wysiwyg-context-links-container", []);
  }

  // 4c. Metadata widget
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        if (typeof window._saveChallengeResponse === "function") {
          await window._saveChallengeResponse();
        }
      },
      getRecordTitle: function () {
        const titleInput = document.getElementById("wysiwyg-title-input");
        return titleInput ? titleInput.value : "";
      },
      getRecordId: function () {
        return window._challengeResponseModuleState
          ? window._challengeResponseModuleState.activeRecordId || ""
          : "";
      },
    });
  }

  /* -------------------------------------------------------------------------
     5. AUTO-LOAD — If navigated here from insert_challenge_response.js,
        the new record ID is stored in window._selectedRecordId.
  ------------------------------------------------------------------------- */
  if (
    window._selectedRecordId &&
    typeof window.loadChallengeResponseContent === "function"
  ) {
    const loadId = window._selectedRecordId;
    // Clear the bridge so it doesn't re-trigger on subsequent visits
    delete window._selectedRecordId;

    // Small delay to let the DOM settle before loading content
    setTimeout(async function () {
      await window.loadChallengeResponseContent(loadId, "");
    }, 200);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderChallengeResponse = renderChallengeResponse;
