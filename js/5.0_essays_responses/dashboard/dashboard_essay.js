// Trigger:  window.loadModule("essay") → dashboard_app.js calls
//           window.renderEssay()
// Main:    renderEssay() — injects the essay editor HTML, sets layout columns,
//           initialises all sub-modules (data display, search, markdown editor,
//           document status handler), and coordinates calls to shared tools
//           (picture, MLA, context links, snippet, metadata).
// Output:  Fully functional Essay editor in the Providence work canvas.
//           Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   MODULE STATE — tracked globally so sub-modules can reference active state
----------------------------------------------------------------------------- */
window._essayModuleState = {
  mode: "essay", // fixed to 'essay' — no toggle
  activeRecordId: null, // currently selected record ID (slug)
  activeRecordTitle: "", // currently selected record title
  isDirty: false, // true when markdown has unsaved changes
};

// Set _recordSlug for shared tool compatibility
window._recordSlug = window._essayModuleState.activeRecordId;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderEssay
   Called by dashboard_app.js when the user navigates to this module.
   1. Sets the Providence canvas layout (sidebar 360px, main 1fr).
   2. Injects the essay editor HTML into the main column.
   3. Initialises all sub-modules in dependency order.
----------------------------------------------------------------------------- */
async function renderEssay() {
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
    const response = await fetch("/admin/frontend/dashboard_essay.html");
    if (!response.ok) {
      throw new Error(
        "Failed to load essay editor template (HTTP " + response.status + ")",
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
    console.error("[dashboard_essay] Template load failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load the Essays editor. Please refresh and try again.",
      );
    }
    return;
  }

  /* -------------------------------------------------------------------------
     3. INITIALISE SUB-MODULES (in dependency order)
     Each sub-module exposes a function on window. We call them after the
     HTML is injected so DOM elements are available.
  ------------------------------------------------------------------------- */

  // 3a. Set initial mode (always 'essay')
  window._essayModuleState.mode = "essay";

  // Set _recordTitle for shared tool compatibility
  window._recordTitle = window._essayModuleState.activeRecordTitle;

  // 3b. Load the sidebar document list
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

  // 3f. Wire "+ New Context Essay" button
  _wireNewEssayButton();

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

  // 4c2. External references handler (iaa, pledius, manuscript)
  if (typeof window.renderExternalRefs === "function") {
    window.renderExternalRefs("wysiwyg-external-refs-container");
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
}

/* -----------------------------------------------------------------------------
   INTERNAL: _generateUntitledTitle
   Scans sidebar lists for existing "Untitled N" titles and returns the
   next available number.
----------------------------------------------------------------------------- */
function _generateUntitledTitle() {
  let maxN = 0;

  const items = document.querySelectorAll(
    "#wysiwyg-published-list .wysiwyg-sidebar-list__item, #wysiwyg-drafts-list .wysiwyg-sidebar-list__item",
  );

  items.forEach(function (item) {
    const title = item.getAttribute("data-record-title") || "";
    const match = title.match(/^Untitled (\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxN) {
        maxN = n;
      }
    }
  });

  return "Untitled " + (maxN + 1);
}

/* -----------------------------------------------------------------------------
   INTERNAL: _handleNewEssay
   Creates a new draft context essay via POST /api/admin/records.
----------------------------------------------------------------------------- */
async function _handleNewEssay() {
  const btn = document.getElementById("btn-new-essay");
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = "Creating...";

  const newTitle = _generateUntitledTitle();

  try {
    const response = await fetch("/api/admin/records", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        type: "context_essay",
        body: "",
        snippet: "",
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();
    const newId = result.id;

    if (!newId) {
      throw new Error("No ID returned from server");
    }

    // Update module state
    window._essayModuleState.activeRecordId = newId;
    window._essayModuleState.activeRecordTitle = newTitle;
    window._essayModuleState.isDirty = false;

    // Clear editor fields
    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) titleInput.value = newTitle;

    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent("");
    }

    // Re-initialise shared tools
    if (typeof window.renderEditPicture === "function") {
      window.renderEditPicture("wysiwyg-picture-container", newId);
    }
    if (typeof window.renderEditLinks === "function") {
      window.renderEditLinks("wysiwyg-context-links-container", []);
    }
    if (typeof window.loadEditBibliography === "function") {
      window.loadEditBibliography(null);
    }
    // Reset external refs
    if (typeof window.setExternalRefValues === "function") {
      window.setExternalRefValues({ iaa: "", pledius: "", manuscript: "", entries: null });
    }

    // Refresh sidebar
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList("essay");

      setTimeout(function () {
        const newItem = document.querySelector(
          '.wysiwyg-sidebar-list__item[data-record-id="' +
            CSS.escape(newId) +
            '"]',
        );
        if (newItem) {
          newItem.classList.add("wysiwyg-sidebar-list__item--active");
        }
      }, 100);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError("New draft created: " + newTitle);
    }
  } catch (err) {
    console.error("[dashboard_essay] New essay failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to create new essay. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "+ New Context Essay";
    }
  }
}

function _wireNewEssayButton() {
  const btn = document.getElementById("btn-new-essay");
  if (!btn) return;

  btn.addEventListener("click", _handleNewEssay);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — Called by dashboard_app.js when routing to this module
----------------------------------------------------------------------------- */
window.renderEssay = renderEssay;
