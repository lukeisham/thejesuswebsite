// Trigger:  Called when a sidebar list item is clicked in the Challenge
//           Response editor, or when auto-loading after creation via
//           insert_challenge_response.js.
// Main:    loadChallengeResponseContent(recordId, title) — fetches a single
//           response from GET /api/admin/records/{id}, populates the editor
//           fields (title, markdown, slug, snippet, metadata, bibliography,
//           context links), and highlights the active sidebar item — all
//           targeting unified wysiwyg-* DOM IDs.
// Output:  Editor populated with the selected response's data. Active sidebar
//           item highlighted. Errors routed via window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const CR_LOAD_API_BASE = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: loadChallengeResponseContent
   Fetches a single response by its record ID and populates the editor
   fields. Called when a sidebar list item is clicked or when auto-loading
   after creation via insert_challenge_response.js.

   Parameters:
     recordId (string) — The record slug/ID to fetch.
     title    (string) — The response title (for error messages).
----------------------------------------------------------------------------- */
async function loadChallengeResponseContent(recordId, title) {
  if (!recordId) return;

  try {
    const response = await fetch(
      CR_LOAD_API_BASE + "/records/" + encodeURIComponent(recordId),
    );

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const doc = await response.json();

    // Update module state
    window._challengeResponseModuleState.activeRecordId = recordId;
    window._challengeResponseModuleState.activeRecordTitle =
      doc.title || title || "";
    window._challengeResponseModuleState.isDirty = false;

    // Populate title
    const titleInput = document.getElementById("wysiwyg-title-input");
    if (titleInput) {
      titleInput.value = doc.title || "";
    }

    // Populate markdown content (body field for challenge_response type)
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
          "[challenge_response_load_content] Failed to load bibliography:",
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
          "[challenge_response_load_content] Failed to load context links:",
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
            if (Array.isArray(meta.identifiers) && meta.identifiers.length > 0) {
              extEntries = meta.identifiers;
            }
          }
        } catch (e) { /* ignore parse errors */ }
        window.setExternalRefValues({
          iaa: doc.iaa || "",
          pledius: doc.pledius || "",
          manuscript: doc.manuscript || "",
          entries: extEntries,
        });
      } catch (err) {
        console.warn(
          "[challenge_response_load_content] Failed to set external refs:",
          err,
        );
      }
    }

    // NOTE: No picture handler — challenge_response has no picture fields

    // Populate the shared metadata widget
    if (typeof window.populateMetadataWidget === "function") {
      try {
        window.populateMetadataWidget("metadata-widget-container", doc);
      } catch (err) {
        console.warn(
          "[challenge_response_load_content] Failed to populate metadata widget:",
          err,
        );
      }
    }

    // Highlight the active item in the sidebar
    _highlightActiveItem(recordId);

    // Show the Delete button (may have been hidden from init state)
    const deleteBtn = document.getElementById("btn-delete");
    if (deleteBtn) deleteBtn.hidden = false;
  } catch (err) {
    console.error(
      "[challenge_response_load_content] Failed to load response:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load '" +
          (title || recordId) +
          "'. Please try again.",
      );
    }
  }
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _highlightActiveItem
   Adds the --active class to the currently selected sidebar item and
   removes it from all others.

   Parameters:
     recordId (string) — The record ID of the active response.
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
window.loadChallengeResponseContent = loadChallengeResponseContent;
