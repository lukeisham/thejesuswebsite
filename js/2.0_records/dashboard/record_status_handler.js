// Trigger:  Called by dashboard_records_single.js orchestrator when the user
//           clicks Save Draft, Publish, or Delete buttons.
// Main:    handleSaveDraft(), handlePublish(), handleDelete() — perform the
//           respective API calls, collect all form data, and manage status.
// Output:  API call executed; form status updated; error messages surfaced.

"use strict";

/* =============================================================================
   THE JESUS WEBSITE — RECORD STATUS HANDLER
   File:    js/2.0_records/dashboard/record_status_handler.js
   Version: 1.2.0
   Module:  2.0 — Records
   Purpose: Implements Save Draft, Publish, and Delete operations for the
            single-record editor. Any field modification auto-saves with
            status='draft'. Only the explicit "Publish" button sets
            status='published'. "Delete" removes the record entirely.
            updated_at is auto-set server-side.
============================================================================= */

/* -----------------------------------------------------------------------------
   PUBLIC: collectAllFormData
   Gathers every field from all 7 form sections into a single payload object
   ready for PUT /api/admin/records/{id}.
----------------------------------------------------------------------------- */
function collectAllFormData() {
  const payload = {};

  // Section 1: Core Identifiers
  // Only include id if it has a value (backend auto-generates for new records)
  const rawId = _getValue("record-id");
  if (rawId) {
    payload.id = rawId;
  }
  payload.title = _getValue("record-title");
  payload.slug = _getValue("record-slug");

  // Section 2: Images
  payload.picture_name = _getValue("record-picture-name");

  // Section 3: Description
  if (typeof window.collectDescription === "function") {
    const description = window.collectDescription(
      "description-editor-container",
    );
    payload.description = JSON.stringify(description);
  }
  if (typeof window.collectDescription === "function") {
    const snippet = window.collectDescription("snippet-editor-container");
    payload.snippet = JSON.stringify(snippet);
  }

  // Section 4: Taxonomy
  if (typeof window.collectTaxonomy === "function") {
    const taxonomy = window.collectTaxonomy();
    payload.era = taxonomy.era || "";
    payload.timeline = taxonomy.timeline || "";
    payload.gospel_category = taxonomy.gospel_category || "";
  }

  // Map fields
  if (typeof window.collectMapFields === "function") {
    const mapFields = window.collectMapFields();
    payload.map_label = mapFields.map_label || "";
    payload.geo_id = mapFields.geo_id || null;
  }

  // Section 5: Verses
  if (typeof window.collectVerses === "function") {
    payload.primary_verse = JSON.stringify(
      window.collectVerses("primary-verse-container"),
    );
    payload.secondary_verse = JSON.stringify(
      window.collectVerses("secondary-verse-container"),
    );
  }

  // Section 6: External References
  if (typeof window.collectEditBibliography === "function") {
    payload.bibliography = JSON.stringify(window.collectEditBibliography());
  }

  if (typeof window.collectEditLinks === "function") {
    payload.context_links = JSON.stringify(window.collectEditLinks());
  }

  payload.parent_id = _getValue("record-parent-id") || null;

  if (typeof window.collectExternalRefs === "function") {
    const refs = window.collectExternalRefs();
    payload.iaa = refs.iaa || "";
    payload.pledius = refs.pledius || "";
    payload.manuscript = refs.manuscript || "";
  }

  if (typeof window.collectUrlArray === "function") {
    payload.url = JSON.stringify(window.collectUrlArray());
  }

  // Section 7: Metadata
  const metadataJson = _getValue("record-metadata-json");
  if (metadataJson) {
    try {
      payload.metadata_json = JSON.stringify(JSON.parse(metadataJson));
    } catch (e) {
      payload.metadata_json = metadataJson;
    }
  }

  payload.status = _getStatusValue();

  return payload;
}

/* -----------------------------------------------------------------------------
   PUBLIC: handleSaveDraft
   Collects all form data, sets status to 'draft'.
   If the record has an ID → PUT (update existing).
   If no ID yet → POST (create new), then updates the form with the new ID.
----------------------------------------------------------------------------- */
async function handleSaveDraft() {
  const recordId = _getValue("record-id");
  const title = _getRecordTitle();

  const payload = collectAllFormData();
  payload.status = "draft";

  try {
    if (recordId) {
      // --- UPDATE existing record ---
      const response = await fetch(`/api/admin/records/${recordId}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } else {
      // --- CREATE new record ---
      const response = await fetch("/api/admin/records", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      // Write the newly-assigned ID back into the form so subsequent
      // saves use PUT (update) instead of POST (create).
      if (result.id) {
        _setFieldValue("record-id", result.id);
        window._recordSlug = result.id;

        // Re-initialise picture handler with the new ID so uploads work
        if (typeof window.renderEditPicture === "function") {
          window.renderEditPicture("picture-preview-container", result.id);
        }
      }
    }

    // Update status radio
    const draftRadio = document.getElementById("record-status-draft");
    if (draftRadio) draftRadio.checked = true;

    // Update the updated_at display
    _refreshUpdatedAt();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(`Draft saved: "${title}"`);
    }

    // Show Delete button now that the record exists
    const deleteBtn = document.getElementById("btn-delete");
    if (deleteBtn) deleteBtn.hidden = false;

    return true;
  } catch (err) {
    console.error("[record_status_handler] Save draft failed:", err);
    _surfaceError(`Error: Failed to set record '${title}' to Draft.`);
    return false;
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: handlePublish
   Collects all form data, sets status to 'published'.
   If the record has an ID → PUT (update existing).
   If no ID yet → POST (create new), then updates the form with the new ID.
----------------------------------------------------------------------------- */
async function handlePublish() {
  const recordId = _getValue("record-id");
  const title = _getRecordTitle();

  const payload = collectAllFormData();
  payload.status = "published";

  try {
    if (recordId) {
      // --- UPDATE existing record ---
      const response = await fetch(`/api/admin/records/${recordId}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } else {
      // --- CREATE new record ---
      const response = await fetch("/api/admin/records", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.id) {
        _setFieldValue("record-id", result.id);
        window._recordSlug = result.id;

        if (typeof window.renderEditPicture === "function") {
          window.renderEditPicture("picture-preview-container", result.id);
        }
      }
    }

    // Update status radio
    const publishedRadio = document.getElementById("record-status-published");
    if (publishedRadio) publishedRadio.checked = true;

    // Update the updated_at display
    _refreshUpdatedAt();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(`Published: "${title}"`);
    }

    // Show Delete button now that the record exists
    const deleteBtn = document.getElementById("btn-delete");
    if (deleteBtn) deleteBtn.hidden = false;

    return true;
  } catch (err) {
    console.error("[record_status_handler] Publish failed:", err);
    _surfaceError(
      `Error: Failed to publish record '${title}'. Check required fields.`,
    );
    return false;
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: handleDelete
   Prompts for confirmation, then DELETEs the record from the API.
----------------------------------------------------------------------------- */
async function handleDelete() {
  const recordId = _getValue("record-id");
  const title = _getRecordTitle();

  if (!recordId) {
    _surfaceError("Error: Cannot delete — no record ID found.");
    return false;
  }

  const confirmed = confirm(
    `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
  );

  if (!confirmed) {
    return false;
  }

  try {
    const response = await fetch(`/api/admin/records/${recordId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (typeof window.surfaceError === "function") {
      window.surfaceError(`Deleted: "${title}"`);
    }

    // Navigate back to All Records after deletion
    if (typeof window.loadModule === "function") {
      window.loadModule("records-all");
    }

    return true;
  } catch (err) {
    console.error("[record_status_handler] Delete failed:", err);
    _surfaceError(
      `Error: Failed to delete record '${title}'. Please try again.`,
    );
    return false;
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: handleAutoSave
   Called on any field change. Saves with status='draft' automatically.
   Debounced to avoid flooding the API on rapid typing.
----------------------------------------------------------------------------- */
let _autoSaveTimeout = null;
function scheduleAutoSave() {
  if (_autoSaveTimeout) {
    clearTimeout(_autoSaveTimeout);
  }
  _autoSaveTimeout = setTimeout(async () => {
    const recordId = _getValue("record-id");
    if (!recordId) return;

    const payload = collectAllFormData();
    payload.status = "draft";

    try {
      await fetch(`/api/admin/records/${recordId}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      _refreshUpdatedAt();
    } catch (err) {
      console.warn("[record_status_handler] Auto-save failed:", err);
    }
  }, 1500); // 1.5 second debounce
}

/* -----------------------------------------------------------------------------
   INTERNAL: Get a form field's value
----------------------------------------------------------------------------- */
function _getValue(elementId) {
  const el = document.getElementById(elementId);
  return el ? el.value : "";
}

/* -----------------------------------------------------------------------------
   INTERNAL: Set a form field's value
----------------------------------------------------------------------------- */
function _setFieldValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) {
    el.value = value || "";
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Get the current status from radio buttons
----------------------------------------------------------------------------- */
function _getStatusValue() {
  const draftRadio = document.getElementById("record-status-draft");
  const publishedRadio = document.getElementById("record-status-published");

  if (publishedRadio && publishedRadio.checked) return "published";
  if (draftRadio && draftRadio.checked) return "draft";
  return "draft";
}

/* -----------------------------------------------------------------------------
   INTERNAL: Get the record title for error messages
----------------------------------------------------------------------------- */
function _getRecordTitle() {
  if (typeof window._recordTitle === "string" && window._recordTitle) {
    return window._recordTitle;
  }
  return _getValue("record-title") || "this record";
}

/* -----------------------------------------------------------------------------
   INTERNAL: Refresh the updated_at display to current time
----------------------------------------------------------------------------- */
function _refreshUpdatedAt() {
  const el = document.getElementById("record-updated-at");
  if (el) {
    el.value = new Date().toISOString();
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: Surface an error through the shared error handler
----------------------------------------------------------------------------- */
function _surfaceError(message) {
  if (typeof window.surfaceError === "function") {
    window.surfaceError(message);
  } else {
    console.error("[record_status_handler]", message);
  }
}

/* -----------------------------------------------------------------------------
   PUBLIC: Wire save/draft/publish/delete buttons
   Attaches click handlers to the function bar buttons.
----------------------------------------------------------------------------- */
function wireStatusButtons() {
  const btnDraft = document.getElementById("btn-save-draft");
  const btnPublish = document.getElementById("btn-publish");
  const btnDelete = document.getElementById("btn-delete");

  if (btnDraft) {
    btnDraft.addEventListener("click", handleSaveDraft);
  }
  if (btnPublish) {
    btnPublish.addEventListener("click", handlePublish);
  }
  if (btnDelete) {
    btnDelete.addEventListener("click", handleDelete);

    // Hide Delete button for new records (no record-id yet)
    const recordId = _getValue("record-id");
    if (!recordId) {
      btnDelete.hidden = true;
    }
  }

  // Wire auto-save on form field changes
  _wireAutoSave();

  // Keyboard shortcut: Cmd+S / Ctrl+S → Save Draft
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSaveDraft();
    }
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: Wire auto-save listeners on all editable form fields
----------------------------------------------------------------------------- */
function _wireAutoSave() {
  // Select all form inputs, textareas, and selects within the record form
  const formElements = document.querySelectorAll(
    "#providence-col-main input:not([readonly]), #providence-col-main textarea, #providence-col-main select",
  );

  formElements.forEach((el) => {
    el.addEventListener("input", scheduleAutoSave);
    el.addEventListener("change", scheduleAutoSave);
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.collectAllFormData = collectAllFormData;
window.handleSaveDraft = handleSaveDraft;
window.handlePublish = handlePublish;
window.handleDelete = handleDelete;
window.scheduleAutoSave = scheduleAutoSave;
window.wireStatusButtons = wireStatusButtons;
