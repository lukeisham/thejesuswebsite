// Trigger:  Called by dashboard_challenge_academic.js on Academic init, and by
//           challenge_weighting_handler.js when weighting criteria change.
// Main:    renderAcademicRankingWeightsOverview() — reads the academic
//           weighting criteria from the per-mode state cache and renders a
//           read-only list of criterion name/value pairs in
//           #challenge-ranking-weights-overview-list.
// Output:  Populated <ul> of weight <li> items in the sidebar overview
//           section. Each item shows "Name: Value".

"use strict";

function renderAcademicRankingWeightsOverview() {
  var listEl = document.getElementById(
    "challenge-ranking-weights-overview-list",
  );
  if (!listEl) return;

  listEl.innerHTML = "";

  // Read from the per-mode cache (restored on toggle) or current state
  var criteria = window._challengeModuleState.academicWeightingCriteria || [];

  // Fall back to current state if cache is empty
  if (criteria.length === 0) {
    criteria = window._challengeModuleState.weightingCriteria || [];
  }

  if (criteria.length === 0) {
    var emptyItem = document.createElement("li");
    emptyItem.className =
      "challenge-overview-item challenge-overview-item--empty";
    emptyItem.textContent = "No ranking weights configured.";
    listEl.appendChild(emptyItem);
    return;
  }

  criteria.forEach(function (item) {
    var itemEl = document.createElement("li");
    itemEl.className = "challenge-overview-item";

    var nameEl = document.createElement("span");
    nameEl.className = "challenge-overview-item__name";
    nameEl.textContent = item.name;
    itemEl.appendChild(nameEl);

    var valueEl = document.createElement("span");
    valueEl.className = "challenge-overview-item__value";
    valueEl.textContent = String(item.value);
    itemEl.appendChild(valueEl);

    listEl.appendChild(itemEl);
  });
}

window.renderAcademicRankingWeightsOverview =
  renderAcademicRankingWeightsOverview;
