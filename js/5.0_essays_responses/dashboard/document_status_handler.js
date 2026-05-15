// Trigger:  Called by dashboard_essay_historiography.js at module initialisation.
//           Wires the Save Draft, Publish, and Delete buttons in the function bar.
// Main:    initDocumentStatusHandler() — binds click handlers to status action
//           buttons. Before executing any action, checks for unsaved changes in
//           the markdown editor (dirty-state flag set by markdown_editor.js).
//           If unsaved changes exist, prompts the admin to save first.
// Output:  Save, Publish, and Delete operations performed via the admin API.
//           Errors are routed through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const DOC_STATUS_API_BASE = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initDocumentStatusHandler
   Wires click handlers to the Save Draft, Publish, and Delete buttons.
----------------------------------------------------------------------------- */
function initDocumentStatusHandler() {
  const btnSaveDraft = document.getElementById("btn-save-draft");
  const btnPublish = document.getElementById("btn-publish");
  const btnDelete = document.getElementById("btn-delete");

  if (btnSaveDraft) {
    btnSaveDraft.addEventListener("click", _handleSaveDraft);
  }

  if (btnPublish) {
    btnPublish.addEventListener("click", _handlePublish);
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", _handleDelete);
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Save Draft
   Collects all editor data and PUTs to /api/admin/records/{id} with
   status = 'draft'. Before saving, checks for unsaved changes — if none,
   saves silently proceed.
----------------------------------------------------------------------------- */
async function _handleSaveDraft() {
  // Check dirty state — if no unsaved changes, no need to save
  if (!window._essayModuleState.isDirty) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No changes to save.");
    }
    return;
  }

  const recordId = window._essayModuleState.activeRecordId;
  const title = window._essayModuleState.activeRecordTitle || "this document";

  if (!recordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No document selected. Please select a document from the sidebar first.",
      );
    }
    return;
  }

  const payload = _collectEditorData();
  payload.status = "draft";

  const btn = document.getElementById("btn-save-draft");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  try {
    const response = await fetch(
      DOC_STATUS_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(function () {
        return {};
      });
      const detail = errorBody.detail || "HTTP " + response.status;
      throw new Error(detail);
    }

    // Mark as clean
    window._essayModuleState.isDirty = false;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Draft saved: " + title);
    }

    // Refresh the sidebar list to reflect status changes
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList(
        window._essayModuleState.mode,
      );
    }
  } catch (err) {
    console.error("[document_status_handler] Save draft failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save changes to '" + title + "'. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save Draft";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Publish
   Collects all editor data and PUTs to /api/admin/records/{id} with
   status = 'published'. Requires all mandatory fields to be filled.
----------------------------------------------------------------------------- */
async function _handlePublish() {
  const recordId = window._essayModuleState.activeRecordId;
  const title = window._essayModuleState.activeRecordTitle || "this document";

  if (!recordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No document selected. Please select a document from the sidebar first.",
      );
    }
    return;
  }

  // Collect data and validate required fields
  const payload = _collectEditorData();

  if (!payload.title || !payload.title.trim()) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
    return;
  }

  if (!payload.body || !payload.body.trim()) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
    return;
  }

  payload.status = "published";

  const btn = document.getElementById("btn-publish");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Publishing…";
  }

  try {
    const response = await fetch(
      DOC_STATUS_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(function () {
        return {};
      });
      const detail = errorBody.detail || "HTTP " + response.status;
      throw new Error(detail);
    }

    // Mark as clean
    window._essayModuleState.isDirty = false;

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Published: " + title);
    }

    // Refresh the sidebar list
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList(
        window._essayModuleState.mode,
      );
    }
  } catch (err) {
    console.error("[document_status_handler] Publish failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to publish '" + title + "'. Check required fields.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Publish";
    }
  }
}

/* -----------------------------------------------------------------------------
   HANDLER: Delete
   Prompts for confirmation, then DELETEs the record. Clears the editor
   and refreshes the sidebar on success.
----------------------------------------------------------------------------- */
async function _handleDelete() {
  const recordId = window._essayModuleState.activeRecordId;
  const title = window._essayModuleState.activeRecordTitle || "this document";

  if (!recordId) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: No document selected. Please select a document from the sidebar first.",
      );
    }
    return;
  }

  // Confirmation prompt
  const confirmed = confirm(
    "Are you sure you want to delete '" + title + "'? This cannot be undone.",
  );
  if (!confirmed) return;

  const btn = document.getElementById("btn-delete");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Deleting…";
  }

  try {
    const response = await fetch(
      DOC_STATUS_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(function () {
        return {};
      });
      const detail = errorBody.detail || "HTTP " + response.status;
      throw new Error(detail);
    }

    // Clear the editor
    window._essayModuleState.activeRecordId = null;
    window._essayModuleState.activeRecordTitle = "";
    window._essayModuleState.isDirty = false;

    // Reset editor fields
    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent("");
    }

    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) titleInput.value = "";

    // Clear metadata widget
    if (typeof window.populateMetadataWidget === "function") {
      window.populateMetadataWidget("metadata-widget-container", null);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError("Deleted: " + title);
    }

    // Refresh sidebar
    if (typeof window.displayEssayHistoriographyList === "function") {
      await window.displayEssayHistoriographyList(
        window._essayModuleState.mode,
      );
    }
  } catch (err) {
    console.error("[document_status_handler] Delete failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to delete '" + title + "'. Please try again.",
      );
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _collectEditorData
   Gathers all data from the editor fields and shared tool sections into a
   single payload object for the API.

   Returns:
     (Object) — Payload with title, markdown_content, snippet, bibliography,
                context_links, and slug fields.
----------------------------------------------------------------------------- */
function _collectEditorData() {
  const titleInput = document.getElementById("wysiwyg-title-input");
  const textarea = document.getElementById("markdown-textarea");

  var mode = window._essayModuleState ? window._essayModuleState.mode : "essay";
  var typeMap = {
    essay: "context_essay",
    historiography: "historiographical_essay",
  };

  const payload = {
    title: titleInput ? titleInput.value : "",
    type: typeMap[mode] || "context_essay",
    body: textarea ? textarea.value : "",
  };

  // Collect from metadata widget
  if (typeof window.collectMetadataWidget === "function") {
    const metaData = window.collectMetadataWidget("metadata-widget-container");
    payload.slug = metaData.slug;
    payload.snippet = metaData.snippet;
    payload.metadata_json = metaData.metadata_json;
  }

  // Collect bibliography from shared tool
  if (typeof window.collectEditBibliography === "function") {
    try {
      payload.bibliography = window.collectEditBibliography();
    } catch (err) {
      console.warn(
        "[document_status_handler] Failed to collect bibliography:",
        err,
      );
      payload.bibliography = [];
    }
  }

  // Collect context links from shared tool
  if (typeof window.collectEditLinks === "function") {
    try {
      payload.context_links = window.collectEditLinks();
    } catch (err) {
      console.warn(
        "[document_status_handler] Failed to collect context links:",
        err,
      );
      payload.context_links = [];
    }
  }

  // Collect external references
  if (typeof window.collectExternalRefs === "function") {
    try {
      const refs = window.collectExternalRefs();
      payload.iaa = refs.iaa || "";
      payload.pledius = refs.pledius || "";
      payload.manuscript = refs.manuscript || "";
      // Merge custom identifier entries into metadata_json
      if (refs.entries && refs.entries.length > 0) {
        try {
          let meta = payload.metadata_json
            ? JSON.parse(payload.metadata_json)
            : {};
          meta.identifiers = refs.entries;
          payload.metadata_json = JSON.stringify(meta);
        } catch (e) {
          /* keep existing metadata_json */
        }
      }
    } catch (err) {
      console.warn(
        "[document_status_handler] Failed to collect external refs:",
        err,
      );
    }
  }

  return payload;
}

/* -----------------------------------------------------------------------------
   GLOBAL: _saveEssayDocument
   Silent save for the metadata widget's auto-save feature.
----------------------------------------------------------------------------- */
async function _saveEssayDocument() {
  const recordId = window._essayModuleState.activeRecordId;
  if (!recordId) return;

  const payload = _collectEditorData();

  try {
    const response = await fetch(
      DOC_STATUS_API_BASE + "/records/" + encodeURIComponent(recordId),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error("Silent save failed");
  } catch (err) {
    console.error("[document_status_handler] Silent save failed:", err);
  }
}

/* -----------------------------------------------------------------------------
   FUNCTION: scheduleEssayDocumentAutoSave
   Debounced auto-save (1500ms) that collects editor data and PUTs with
   status: 'draft'. Wired to input/change events on title and markdown
   textarea. Clears the isDirty flag on success.
----------------------------------------------------------------------------- */
function scheduleEssayDocumentAutoSave() {
  if (window._autoSaveTimer) {
    clearTimeout(window._autoSaveTimer);
  }

  window._autoSaveTimer = setTimeout(async function () {
    var recordId = window._essayModuleState.activeRecordId;
    if (!recordId) return;

    var payload = _collectEditorData();
    // Auto-save preserves existing status — never force draft

    try {
      var response = await fetch(
        DOC_STATUS_API_BASE + "/records/" + encodeURIComponent(recordId),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        var errorBody = await response.json().catch(function () {
          return {};
        });
        throw new Error(errorBody.detail || "HTTP " + response.status);
      }

      // Clear dirty flag on success
      window._essayModuleState.isDirty = false;
    } catch (err) {
      console.error("[document_status_handler] Auto-save failed:", err);
    }
  }, 1500);
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initDocumentStatusHandler = initDocumentStatusHandler;
window._saveEssayDocument = _saveEssayDocument;
window.scheduleEssayDocumentAutoSave = scheduleEssayDocumentAutoSave;
