// Trigger:  window.loadModule("essay-historiography") → dashboard_app.js calls
//           window.renderEssayHistoriography()
// Main:    renderEssayHistoriography() — injects the HTML, sets layout columns,
//           initialises all sub-modules (data display, search, markdown editor,
//           document status handler), wires the Essay/Historiography toggle, and
//           coordinates calls to shared tools (picture, MLA, context links,
//           snippet, metadata).
// Output:  Fully functional Essay & Historiography editor in the Providence
//          work canvas. Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._essayModuleState = {
  mode: "essay", // 'essay' | 'historiography'
  activeRecordId: null, // currently selected record ID (slug)
  activeRecordTitle: "", // currently selected record title
  isDirty: false, // true when markdown has unsaved changes
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._essayModuleState.activeRecordId;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderEssayHistoriography
   Called by dashboard_app.js when the user navigates to this module.
   1. Sets the Providence canvas layout (sidebar 260px, main 1fr).
   2. Injects the editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
   4. Wires the Essay/Historiography toggle buttons.
----------------------------------------------------------------------------- */
async function renderEssayHistoriography() {
  /* -------------------------------------------------------------------------
     1. SET LAYOUT — Sidebar is internal to this module, so we collapse the
        Providence sidebar and use the full main column for our split-pane.
  ------------------------------------------------------------------------- */
  if (typeof window._setLayoutColumns === "function") {
    window._setLayoutColumns(false, "1fr");
  }

  /* -------------------------------------------------------------------------
     2. INJECT HTML — The editor template is loaded via fetch and injected
        into the Providence main column.
  ------------------------------------------------------------------------- */
  try {
    const response = await fetch(
      "/admin/frontend/dashboard_essay_historiography.html",
    );
    if (!response.ok) {
      throw new Error(
        "Failed to load editor template (HTTP " + response.status + ")",
      );
    }
    const html = await response.text();

    if (typeof window._setColumn === "function") {
      window._setColumn("main", html);
    }
  } catch (err) {
    console.error(
      "[dashboard_essay_historiography] Template load failed:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Essay & Historiography editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
     3. INITIALISE SUB-MODULES (in dependency order)
     Each sub-module exposes a function on window. We call them after the
     HTML is injected so DOM elements are available.
  ------------------------------------------------------------------------- */

  // 3a. Set initial mode
  window._essayModuleState.mode = "essay";

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._essayModuleState.activeRecordTitle;

  // 3b. Load the sidebar document list for the initial mode
  if (typeof window.displayEssayHistoriographyList === "function") {
    await window.displayEssayHistoriographyList("essay");
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
     Each shared tool is included via a <script> tag in the dashboard shell
     and exposes a window.* function. We call them to wire up their
     respective sections within the injected HTML.
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

  // 4d. Metadata widget — shared unified slug/snippet/metadata UI
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

  // 4e. Metadata footer (legacy — kept for backward compatibility)
  if (typeof window.renderMetadataFooter === "function") {
    window.renderMetadataFooter("essay-metadata-container", "");
  }

  /* -------------------------------------------------------------------------
     5. WIRE TOGGLE BUTTONS — Essay / Historiography switch
  ------------------------------------------------------------------------- */
  _wireToggleButtons();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _wireToggleButtons
   Binds click handlers to the Essay and Historiography toggle buttons.
   Switches the active mode and reloads the sidebar document list.
   Clears the search input on toggle switch.
----------------------------------------------------------------------------- */
function _wireToggleButtons() {
  const btnEssay = document.getElementById("btn-toggle-essay");
  const btnHistoriography = document.getElementById(
    "btn-toggle-historiography",
  );

  if (!btnEssay || !btnHistoriography) return;

  btnEssay.addEventListener("click", async function () {
    if (window._essayModuleState.mode === "essay") return;

    // Warn about unsaved changes before switching
    if (window._essayModuleState.isDirty) {
      const proceed = confirm(
        "You have unsaved changes. Switch to Essay mode and discard changes?",
      );
      if (!proceed) return;
    }

    window._essayModuleState.mode = "essay";
    window._essayModuleState.activeRecordId = null;
    window._essayModuleState.activeRecordTitle = "";
    window._essayModuleState.isDirty = false;

    btnEssay.classList.add("btn--toggle-active");
    btnEssay.setAttribute("aria-pressed", "true");
    btnHistoriography.classList.remove("btn--toggle-active");
    btnHistoriography.setAttribute("aria-pressed", "false");

    // Clear search input
    const searchInput = document.getElementById("essay-search-input");
    if (searchInput) searchInput.value = "";

    // Clear editor
    _clearEditor();

    // Reload sidebar
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList("essay");
    }
  });

  btnHistoriography.addEventListener("click", async function () {
    if (window._essayModuleState.mode === "historiography") return;

    // Warn about unsaved changes before switching
    if (window._essayModuleState.isDirty) {
      const proceed = confirm(
        "You have unsaved changes. Switch to Historiography mode and discard changes?",
      );
      if (!proceed) return;
    }

    window._essayModuleState.mode = "historiography";
    window._essayModuleState.activeRecordId = null;
    window._essayModuleState.activeRecordTitle = "";
    window._essayModuleState.isDirty = false;

    btnHistoriography.classList.add("btn--toggle-active");
    btnHistoriography.setAttribute("aria-pressed", "true");
    btnEssay.classList.remove("btn--toggle-active");
    btnEssay.setAttribute("aria-pressed", "false");

    // Clear search input
    const searchInput = document.getElementById("essay-search-input");
    if (searchInput) searchInput.value = "";

    // Clear editor
    _clearEditor();

    // Reload sidebar
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList("historiography");
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _clearEditor
   Resets the editor area to empty state when switching modes or deselecting
   a document.
----------------------------------------------------------------------------- */
function _clearEditor() {
  const titleInput = document.getElementById("essay-title-input");
  const textarea = document.getElementById("markdown-textarea");
  const preview = document.getElementById("markdown-preview");
  const snippetInput = document.getElementById("essay-snippet-input");

  if (titleInput) titleInput.value = "";
  if (textarea) textarea.value = "";
  if (preview)
    preview.innerHTML =
      '<p class="markdown-editor-preview__placeholder">Live preview will appear here as you type...</p>';
  if (snippetInput) snippetInput.value = "";

  // Reset metadata display fields
  const slugInput = document.getElementById("record-slug");
  const metadataJson = document.getElementById("record-metadata-json");
  const createdAt = document.getElementById("record-created-at");
  const updatedAt = document.getElementById("record-updated-at");

  if (slugInput) slugInput.value = "";
  if (metadataJson) metadataJson.value = "";
  if (createdAt) createdAt.value = "";
  if (updatedAt) updatedAt.value = "";

  window._essayModuleState.isDirty = false;
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderEssayHistoriography = renderEssayHistoriography;
