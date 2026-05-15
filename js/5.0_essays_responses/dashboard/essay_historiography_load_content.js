// Trigger:  Called when a sidebar list item is clicked in the Essay or
//           Historiography editor.
// Main:    loadDocumentContent(recordId, title) — fetches a single document
//           from GET /api/admin/records/{id}, populates the editor fields
//           (title, markdown, slug, snippet, metadata, bibliography, context
//           links, picture), and highlights the active sidebar item — all
//           targeting unified wysiwyg-* DOM IDs.
// Output:  Editor populated with the selected document's data. Active sidebar
//           item highlighted. Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const EH_LOAD_API_BASE_URL = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: loadDocumentContent
   Fetches a single document by its record ID and populates the editor
   fields. Called when a sidebar list item is clicked.

   Parameters:
     recordId (string) — The record slug/ID to fetch.
     title    (string) — The document title (for error messages).
----------------------------------------------------------------------------- */
async function loadDocumentContent(recordId, title) {
  if (!recordId) return;

  let doc;

  try {
    const response = await fetch(
      EH_LOAD_API_BASE_URL + "/records/" + encodeURIComponent(recordId),
    );

    if (!response.ok) {
      // If the historiography singleton doesn't exist yet, auto-create it
      if (response.status === 404 && recordId === "historiography") {
        doc = await _createHistoriographyRecord();
      } else {
        throw new Error("API responded with status " + response.status);
      }
    } else {
      doc = await response.json();
    }

    // Update module state
    window._essayModuleState.activeRecordId = recordId;
    window._essayModuleState.activeRecordTitle = doc.title || title || "";
    window._essayModuleState.isDirty = false;

    // Populate title
    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) {
      titleInput.value = doc.title || "";
    }

    // Populate markdown content
    if (typeof window.setMarkdownContent === "function") {
      window.setMarkdownContent(doc.body || doc.content || "");
    }

    // Populate slug
    const slugInput = document.getElementById("record-slug");
    if (slugInput) {
      slugInput.value = doc.slug || "";
    }

    // Populate metadata display fields
    const metadataJson = document.getElementById("record-metadata-json");
    const createdAt = document.getElementById("record-created-at");
    const updatedAt = document.getElementById("record-updated-at");

    if (metadataJson) {
      metadataJson.value = doc.metadata_json
        ? typeof doc.metadata_json === "string"
          ? doc.metadata_json
          : JSON.stringify(doc.metadata_json, null, 2)
        : "";
    }
    if (createdAt) {
      createdAt.value = doc.created_at || "";
    }
    if (updatedAt) {
      updatedAt.value = doc.updated_at || "";
    }

    // Populate bibliography via shared tool
    if (typeof window.loadEditBibliography === "function") {
      try {
        window.loadEditBibliography(doc.bibliography || []);
      } catch (err) {
        console.warn(
          "[essay_historiography_load_content] Failed to load bibliography:",
          err,
        );
      }
    }

    // Populate context links via shared tool
    if (typeof window.renderEditLinks === "function") {
      try {
        window.renderEditLinks(
          "wysiwyg-context-links-container",
          doc.context_links || [],
        );
      } catch (err) {
        console.warn(
          "[essay_historiography_load_content] Failed to load context links:",
          err,
        );
      }
    }

    // Populate external references
    if (typeof window.setExternalRefValues === "function") {
      try {
        let extEntries = null;
        try {
          if (doc.metadata_json) {
            const meta = JSON.parse(doc.metadata_json);
            if (
              Array.isArray(meta.identifiers) &&
              meta.identifiers.length > 0
            ) {
              extEntries = meta.identifiers;
            }
          }
        } catch (e) {
          /* ignore parse errors */
        }
        window.setExternalRefValues({
          iaa: doc.iaa || "",
          pledius: doc.pledius || "",
          manuscript: doc.manuscript || "",
          entries: extEntries,
        });
      } catch (err) {
        console.warn(
          "[essay_historiography_load_content] Failed to set external refs:",
          err,
        );
      }
    }

    // Update picture handler with the record ID
    if (typeof window.renderEditPicture === "function") {
      try {
        window.renderEditPicture("wysiwyg-picture-container", recordId);
      } catch (err) {
        console.warn(
          "[essay_historiography_load_content] Failed to wire picture handler:",
          err,
        );
      }
    }

    // Populate the shared metadata widget
    if (typeof window.populateMetadataWidget === "function") {
      try {
        window.populateMetadataWidget("metadata-widget-container", doc);
      } catch (err) {
        console.warn(
          "[essay_historiography_load_content] Failed to populate metadata widget:",
          err,
        );
      }
    }

    // Highlight the active item in the sidebar
    _highlightActiveItem(recordId);
  } catch (err) {
    console.error(
      "[essay_historiography_load_content] Failed to load document:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load '" +
          (title || recordId) +
          "'. Please try again.",
      );
    }
    return;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _createHistoriographyRecord
   Creates the singleton historiography record with slug locked to
   "historiography". Called when the auto-load finds no existing record.
   Returns the created document object for immediate population.
----------------------------------------------------------------------------- */
async function _createHistoriographyRecord() {
  try {
    const response = await fetch(EH_LOAD_API_BASE_URL + "/records", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Historiography",
        slug: "historiography",
        type: "historiographical_essay",
        body: "",
        snippet: "",
        status: "draft",
      }),
    });

    if (!response.ok) {
      throw new Error(
        "Failed to create historiography record (HTTP " + response.status + ")",
      );
    }

    const result = await response.json();
    console.log(
      "[essay_historiography_load_content] Created historiography record:",
      result.id,
    );

    // Now fetch the full record by the newly created ID
    const fetchResponse = await fetch(
      EH_LOAD_API_BASE_URL + "/records/" + encodeURIComponent(result.id),
    );

    if (!fetchResponse.ok) {
      throw new Error("Failed to fetch newly created historiography record");
    }

    return await fetchResponse.json();
  } catch (err) {
    console.error(
      "[essay_historiography_load_content] Failed to create historiography record:",
      err,
    );
    throw err;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _highlightActiveItem
   Adds the --active class to the currently selected sidebar item and
   removes it from all others.

   Parameters:
     recordId (string) — The record ID of the active document.
----------------------------------------------------------------------------- */
function _highlightActiveItem(recordId) {
  // Remove active class from all items
  const allItems = document.querySelectorAll(
    ".wysiwyg-sidebar-list__item--active",
  );
  allItems.forEach(function (item) {
    item.classList.remove("wysiwyg-sidebar-list__item--active");
  });

  // Add active class to the matching item
  if (recordId) {
    const activeItem = document.querySelector(
      '.wysiwyg-sidebar-list__item[data-record-id="' +
        CSS.escape(recordId) +
        '"]',
    );
    if (activeItem) {
      activeItem.classList.add("wysiwyg-sidebar-list__item--active");
    }
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.loadDocumentContent = loadDocumentContent;
