// Trigger:  Called by dashboard_essay.js / dashboard_historiography.js when the
//           module loads, and whenever the document list needs refreshing.
// Main:    displayEssayHistoriographyList(mode) — fetches the document list
//           from GET /api/admin/essays or GET /api/admin/historiography and
//           populates the sidebar Published/Drafts lists using unified
//           wysiwyg-* DOM IDs. Each list item is clickable, loading the
//           document content via window.loadDocumentContent(recordId, title).
// Output:  Populated sidebar document lists. Errors routed via
//           window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const EH_LIST_API_BASE_URL = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayEssayHistoriographyList
   Fetches the document list for the given mode ('essay' or 'historiography')
   and populates the sidebar Published and Drafts lists.

   Parameters:
     mode (string) — 'essay' or 'historiography'
----------------------------------------------------------------------------- */
async function displayEssayHistoriographyList(mode) {
  const endpoint =
    mode === "historiography"
      ? EH_LIST_API_BASE_URL + "/historiography"
      : EH_LIST_API_BASE_URL + "/essays";

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();

    // Separate into published and drafts
    const documents = Array.isArray(data)
      ? data
      : data.records || data.essays || data.results || [];

    const published = documents.filter(function (doc) {
      return doc.status === "published";
    });
    const drafts = documents.filter(function (doc) {
      return doc.status !== "published";
    });

    // Populate the sidebar lists
    _populateSidebarList("wysiwyg-published-list", published);
    _populateSidebarList("wysiwyg-drafts-list", drafts);
  } catch (err) {
    console.error(
      "[essay_historiography_list_display] Failed to load document list:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load document list. Please refresh and try again.",
      );
    }
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSidebarList
   Populates a sidebar <ul> element with list items for each document.

   Parameters:
     listId    (string) — The ID of the <ul> element to populate.
     documents (array)  — Array of document objects.
----------------------------------------------------------------------------- */
function _populateSidebarList(listId, documents) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!documents || !documents.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "wysiwyg-sidebar-list__item";
    emptyItem.textContent = "No documents";
    emptyItem.style.color = "var(--color-text-muted)";
    emptyItem.style.fontStyle = "italic";
    emptyItem.style.cursor = "default";
    listEl.appendChild(emptyItem);
    return;
  }

  documents.forEach(function (doc) {
    const item = document.createElement("li");
    item.className = "wysiwyg-sidebar-list__item";
    item.textContent = doc.title || doc.slug || doc.id || "Untitled";
    item.setAttribute("data-record-id", doc.slug || doc.id || "");
    item.setAttribute("data-record-title", doc.title || "");

    item.addEventListener("click", function () {
      const recordId = item.getAttribute("data-record-id");
      const title = item.getAttribute("data-record-title");
      if (recordId && typeof window.loadDocumentContent === "function") {
        window.loadDocumentContent(recordId, title);
      }
    });

    listEl.appendChild(item);
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.displayEssayHistoriographyList = displayEssayHistoriographyList;
