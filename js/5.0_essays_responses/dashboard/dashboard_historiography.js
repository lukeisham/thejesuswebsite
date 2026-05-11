// Trigger:  window.loadModule("historiography") → dashboard_app.js calls
//           window.renderHistoriography()
// Main:    renderHistoriography() — injects the historiography editor HTML,
//           sets layout columns, initialises all sub-modules (data display,
//           search, markdown editor, document status handler), and coordinates
//           calls to shared tools (picture, MLA, context links, snippet,
//           metadata).
// Output:  Fully functional Historiography editor in the Providence work
//           canvas. Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._essayModuleState = {
  mode: "historiography", // fixed to 'historiography' — no toggle
  activeRecordId: null, // currently selected record ID (slug)
  activeRecordTitle: "", // currently selected record title
  isDirty: false, // true when markdown has unsaved changes
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._essayModuleState.activeRecordId;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderHistoriography
   Called by dashboard_app.js when the user navigates to this module.
   1. Sets the Providence canvas layout (sidebar 360px, main 1fr).
   2. Injects the historiography editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
----------------------------------------------------------------------------- */
async function renderHistoriography() {
  /* -------------------------------------------------------------------------
     1. SET LAYOUT
  ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns("360px", "1fr");
  }

  /* -------------------------------------------------------------------------
     2. INJECT HTML — Load the historiography-specific template.
  ------------------------------------------------------------------------- */
  try {
    const response = await fetch(
      "/admin/frontend/dashboard_historiography.html",
    );
    if (!response.ok) {
      throw new Error(
        "Failed to load historiography editor template (HTTP " +
          response.status +
          ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const functionBar = doc.getElementById("historiography-function-bar");
      const sidebar = doc.getElementById("historiography-sidebar");
      const editorArea = doc.getElementById("historiography-editor-area");

      if (sidebar) {
        window._setColumn("sidebar", sidebar.outerHTML);
      }

      let mainHtml = "";
      if (functionBar) mainHtml += functionBar.outerHTML;
      if (editorArea) mainHtml += editorArea.outerHTML;

      window._setColumn("main", mainHtml);
    }
  } catch (err) {
    console.error(
      "[dashboard_historiography] Template load failed:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Historiography editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
     3. INITIALISE SUB-MODULES (in dependency order)
  ------------------------------------------------------------------------- */

  // 3a. Set initial mode (always 'historiography')
  window._essayModuleState.mode = "historiography";

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._essayModuleState.activeRecordTitle;

  // 3b. Load the sidebar document list
  if (typeof window.displayEssayHistoriographyList === "function") {
    await window.displayEssayHistoriographyList("historiography");
  }

  // 3c. Initialise the markdown editor with empty content
  if (typeof window.initMarkdownEditor === "function") {
    window.initMarkdownEditor("");
  }

  // 3d. Initialise document status handler
  if (typeof window.initDocumentStatusHandler === "function") {
    window.initDocumentStatusHandler();
  }

  // 3e. Initialise search bar
  if (typeof window.initEssaySearch === "function") {
    window.initEssaySearch();
  }

  /* -------------------------------------------------------------------------
     4. INITIALISE SHARED TOOLS
  ------------------------------------------------------------------------- */

  // 4a. Picture upload handler
  if (typeof window.renderEditPicture === "function") {
    window.renderEditPicture("essay-picture-container", "");
  }

  // 4b. MLA bibliography handler
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("essay-bibliography-container");
  }

  // 4c. Context links handler
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("essay-context-links-container", []);
  }

  // 4d. Metadata widget
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        if (typeof window._saveEssayDocument === "function") {
          await window._saveEssayDocument();
        }
      },
      getRecordTitle: function () {
        const titleInput = document.getElementById("essay-title-input");
        return titleInput ? titleInput.value : "";
      },
      getRecordId: function () {
        return window._essayModuleState
          ? window._essayModuleState.activeRecordId || ""
          : "";
      },
    });
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderHistoriography = renderHistoriography;
