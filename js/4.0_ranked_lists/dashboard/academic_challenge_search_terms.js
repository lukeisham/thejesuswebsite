// Trigger:  Called by dashboard_challenge_academic.js on Academic init, and by
//           challenge_weighting_handler.js on row selection.
// Main:    renderAcademicSearchTermsOverview() — reads the active record's
//           academic_challenge_search_term from the textarea or state cache
//           and renders a read-only list of current search terms in
//           #challenge-search-terms-overview-list.
// Output:  Populated <ul> of search term <li> items in the sidebar overview
//           section. Each item shows one search term.

"use strict";

function renderAcademicSearchTermsOverview() {
  var listEl = document.getElementById("challenge-search-terms-overview-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  // Read terms from the textarea (primary source) or per-mode cache (fallback)
  var termsInput = document.getElementById("challenge-search-terms-input");
  var rawValue = "";

  if (termsInput && termsInput.value.trim()) {
    rawValue = termsInput.value.trim();
  } else {
    rawValue = window._challengeModuleState.academicSearchTerms || "";
  }

  if (!rawValue) {
    var emptyItem = document.createElement("li");
    emptyItem.className =
      "challenge-overview-item challenge-overview-item--empty";
    emptyItem.textContent = "No search terms saved.";
    listEl.appendChild(emptyItem);
    return;
  }

  // Parse terms — split by newlines or commas
  var terms = rawValue
    .split(/[\n,]+/)
    .map(function (t) {
      return t.trim();
    })
    .filter(function (t) {
      return t.length > 0;
    });

  if (terms.length === 0) {
    var emptyItem = document.createElement("li");
    emptyItem.className =
      "challenge-overview-item challenge-overview-item--empty";
    emptyItem.textContent = "No search terms saved.";
    listEl.appendChild(emptyItem);
    return;
  }

  terms.forEach(function (term) {
    var itemEl = document.createElement("li");
    itemEl.className = "challenge-overview-item";
    itemEl.textContent = term;
    listEl.appendChild(itemEl);
  });
}

window.renderAcademicSearchTermsOverview = renderAcademicSearchTermsOverview;
