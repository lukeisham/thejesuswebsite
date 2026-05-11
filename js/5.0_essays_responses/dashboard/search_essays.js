// Trigger:  Called by dashboard_essay.js at module initialisation.
//           Wires the sidebar search input (#wysiwyg-search-input) for
//           real-time client-side filtering of the essay document list.
// Main:    initEssaySearch() — binds a debounced input handler to the search
//           field. Filters sidebar list items by title using fuzzy matching
//           (characters must appear in order, case-insensitive). Non-matching
//           items are hidden; group headers are hidden when they contain zero
//           visible children.
// Output:  Filtered sidebar document list. On clear, all items restored.
//           On toggle switch, search input is cleared by the orchestrator.

"use strict";

/* -----------------------------------------------------------------------------
   CONSTANTS
----------------------------------------------------------------------------- */
const ESSAY_SEARCH_DEBOUNCE_MS = 150;
const GROUP_HEADER_SELECTOR = ".wysiwyg-sidebar-group__header";
const LIST_ITEM_SELECTOR = ".wysiwyg-sidebar-list__item";

/* -----------------------------------------------------------------------------
   INTERNAL STATE
----------------------------------------------------------------------------- */
let _searchDebounceTimer = null;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initEssaySearch
   Wires the search input with a debounced keyup handler for real-time
   client-side filtering of the sidebar document list.
----------------------------------------------------------------------------- */
function initEssaySearch() {
  const searchInput = document.getElementById("wysiwyg-search-input");
  if (!searchInput) {
    console.warn(
      "[search_essays] #wysiwyg-search-input not found — search disabled.",
    );
    return;
  }

  searchInput.addEventListener("input", function () {
    if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(function () {
      _filterSidebar(searchInput.value);
    }, ESSAY_SEARCH_DEBOUNCE_MS);
  });
}

/* -----------------------------------------------------------------------------
   INTERNAL: _filterSidebar
   Filters the sidebar document list items by the search term. Uses fuzzy
   matching: every character in the search term must appear in the item's
   title in order (case-insensitive). Non-matching items are hidden.
   Group headers are hidden when they contain zero visible children.

   Parameters:
     searchTerm (string) — The text to filter by.
----------------------------------------------------------------------------- */
function _filterSidebar(searchTerm) {
  // Get all list items in the sidebar
  const allItems = document.querySelectorAll(LIST_ITEM_SELECTOR);

  if (!allItems.length) return;

  const term = (searchTerm || "").trim().toLowerCase();

  allItems.forEach(function (item) {
    const title = (item.textContent || "").trim().toLowerCase();

    if (!term) {
      // No search term — show all items
      item.style.display = "";
      _markGroupVisible(item);
      return;
    }

    // Fuzzy match: all characters of the search term must appear in order
    const matches = _fuzzyMatch(title, term);

    if (matches) {
      item.style.display = "";
      _markGroupVisible(item);
    } else {
      item.style.display = "none";
    }
  });

  // After filtering, hide empty group headers
  _updateGroupHeaders();
}

/* -----------------------------------------------------------------------------
   INTERNAL: _fuzzyMatch
   Checks whether every character in `term` appears in `text` in order.
   Case-insensitive.

   Parameters:
     text (string) — The full text to search within.
     term (string) — The search term.

   Returns:
     (boolean) — True if the term fuzzy-matches the text.
----------------------------------------------------------------------------- */
function _fuzzyMatch(text, term) {
  if (!term) return true;

  let termIndex = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === term[termIndex]) {
      termIndex++;
      if (termIndex === term.length) {
        return true;
      }
    }
  }

  return false;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _markGroupVisible
   Marks the group containing the given list item as having at least one
   visible child. Stores this on the group element itself for later use.

   Parameters:
     item (HTMLElement) — A visible sidebar list item.
----------------------------------------------------------------------------- */
function _markGroupVisible(item) {
  // Walk up to find the parent .wysiwyg-sidebar-group
  let parent = item.parentElement;
  while (parent) {
    if (parent.classList.contains("wysiwyg-sidebar-group")) {
      parent._hasVisibleChildren = true;
      return;
    }
    parent = parent.parentElement;
  }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _updateGroupHeaders
   Shows or hides group headers based on whether their group has any
   visible children. Groups are identified by the .wysiwyg-sidebar-group class.
----------------------------------------------------------------------------- */
function _updateGroupHeaders() {
  const groups = document.querySelectorAll(".wysiwyg-sidebar-group");

  groups.forEach(function (group) {
    // Reset marker before checking
    group._hasVisibleChildren = false;

    // Check all list items in this group
    const items = group.querySelectorAll(LIST_ITEM_SELECTOR);
    items.forEach(function (item) {
      if (item.style.display !== "none") {
        group._hasVisibleChildren = true;
      }
    });

    // Show or hide the group header
    const header = group.querySelector(GROUP_HEADER_SELECTOR);
    if (header) {
      header.style.display = group._hasVisibleChildren ? "" : "none";
    }
  });
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.initEssaySearch = initEssaySearch;
