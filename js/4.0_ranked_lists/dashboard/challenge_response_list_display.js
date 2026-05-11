// Trigger:  Called by dashboard_challenge_response.js when the module loads,
//           and after each Save/Publish/Delete action to refresh the sidebar.
// Main:    displayChallengeResponseList() — fetches the response list from
//           GET /api/admin/responses and populates the sidebar Published/Drafts
//           lists using unified wysiwyg-* DOM IDs. Each list item is clickable,
//           loading the response content into the editor via
//           loadChallengeResponseContent(recordId, title).
// Output:  Populated sidebar response lists. Response content loaded into
//           the editor (title, markdown, bibliography, context links,
//           metadata) when a list item is clicked. Errors routed via
//           window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const CR_LIST_API_BASE = "/api/admin";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: displayChallengeResponseList
   Fetches the response list from GET /api/admin/responses and populates
   the sidebar Published and Drafts lists.
----------------------------------------------------------------------------- */
async function displayChallengeResponseList() {
  try {
    const response = await fetch(CR_LIST_API_BASE + "/responses");

    if (!response.ok) {
      throw new Error("API responded with status " + response.status);
    }

    const data = await response.json();

    // Separate into published and drafts
    const responses = Array.isArray(data)
      ? data
      : data.records || data.responses || data.results || [];

    const published = responses.filter(function (res) {
      return res.status === "published";
    });
    const drafts = responses.filter(function (res) {
      return res.status !== "published";
    });

    // Populate the sidebar lists
    _populateSidebarList("wysiwyg-published-list", published);
    _populateSidebarList("wysiwyg-drafts-list", drafts);
  } catch (err) {
    console.error(
      "[challenge_response_list_display] Failed to load response list:",
      err,
    );
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Unable to load response list. Please refresh and try again.",
      );
    }
  }
}

/* =============================================================================
   INTERNAL HELPERS
============================================================================= */

/* -----------------------------------------------------------------------------
   INTERNAL: _populateSidebarList
   Populates a sidebar <ul> element with list items for each response.

   Parameters:
     listId    (string) — The ID of the <ul> element to populate.
     responses (array)  — Array of response objects (each with slug/id and title).
----------------------------------------------------------------------------- */
function _populateSidebarList(listId, responses) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!responses || !responses.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "wysiwyg-sidebar-list__item";
    emptyItem.textContent = "No responses";
    emptyItem.style.color = "var(--color-text-muted)";
    emptyItem.style.fontStyle = "italic";
    emptyItem.style.cursor = "default";
    listEl.appendChild(emptyItem);
    return;
  }

  responses.forEach(function (res) {
    const item = document.createElement("li");
    item.className = "wysiwyg-sidebar-list__item";
    item.textContent = res.title || res.slug || res.id || "Untitled";
    item.setAttribute("data-record-id", res.slug || res.id || "");
    item.setAttribute("data-record-title", res.title || "");

    item.addEventListener("click", function () {
      const recordId = item.getAttribute("data-record-id");
      const title = item.getAttribute("data-record-title");
      if (recordId && typeof window.loadChallengeResponseContent === "function") {
        window.loadChallengeResponseContent(recordId, title);
      }
    });

    listEl.appendChild(item);
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.displayChallengeResponseList = displayChallengeResponseList;
