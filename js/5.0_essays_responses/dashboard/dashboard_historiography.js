// Trigger:  window.loadModule("historiography") → dashboard_app.js calls
//           window.renderHistoriography()
// Main:    renderHistoriography() — injects the historiography editor HTML,
//           sets layout columns, auto-loads the singleton historiography
//           record (slug = "historiography"), and initialises the markdown
//           editor, document status handler, and shared tools (picture,
//           MLA, context links, metadata).
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
   3. Initialises sub-modules and shared tools.
   4. AUTO-LOADS the singleton historiography record (slug = "historiography").
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
    console.error("[dashboard_historiography] Template load failed:", err);
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

  // 3b. Initialise the markdown editor with empty content
  if (typeof window.initMarkdownEditor === "function") {
    window.initMarkdownEditor("");
  }

  // 3c. Initialise document status handler
  if (typeof window.initDocumentStatusHandler === "function") {
    window.initDocumentStatusHandler();
  }

  /* -------------------------------------------------------------------------
     4. INITIALISE SHARED TOOLS — all target unified wysiwyg-* container IDs
  ------------------------------------------------------------------------- */

  // 4a. Picture upload handler
  if (typeof window.renderEditPicture === "function") {
    window.renderEditPicture("wysiwyg-picture-container", "");
  }

  // 4b. MLA bibliography handler
  if (typeof window.renderEditBibliography === "function") {
    window.renderEditBibliography("wysiwyg-bibliography-container");
  }

  // 4c. Context links handler
  if (typeof window.renderEditLinks === "function") {
    window.renderEditLinks("wysiwyg-context-links-container", []);
  }

  // 4d. Metadata widget — slug locked to "historiography"
  if (typeof window.renderMetadataWidget === "function") {
    window.renderMetadataWidget("metadata-widget-container", {
      onAutoSaveDraft: async function (recordData) {
        if (typeof window._saveEssayDocument === "function") {
          await window._saveEssayDocument();
        }
      },
      getRecordTitle: function () {
        const titleInput = document.getElementById("wysiwyg-title-input");
        return titleInput ? titleInput.value : "";
      },
      getRecordId: function () {
        return window._essayModuleState
          ? window._essayModuleState.activeRecordId || ""
          : "";
      },
    });
  }

  /* -------------------------------------------------------------------------
     5. AUTO-LOAD SINGLETON RECORD
     The historiography module is a singleton — there is exactly one page.
     Automatically fetch and populate the record with slug "historiography"
     on mount without requiring any sidebar click.
  ------------------------------------------------------------------------- */
  if (typeof window.loadDocumentContent === "function") {
    // Small delay to let the DOM settle before loading content
    setTimeout(async function () {
      await window.loadDocumentContent("historiography", "Historiography");
    }, 200);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderHistoriography = renderHistoriography;
