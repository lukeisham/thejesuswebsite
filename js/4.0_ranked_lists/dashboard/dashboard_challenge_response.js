/* =============================================================================
   THE JESUS WEBSITE — CHALLENGE RESPONSE DASHBOARD MODULE
   File:    js/4.0_ranked_lists/dashboard/dashboard_challenge_response.js
   Version: 1.0.0
   Trigger: window.loadModule("challenge-response") called from the card click
            or from insert_challenge_response.js after creating a new response.
   Main:    renderChallengeResponse() — resolves the response record ID from
            window._selectedRecordId (set by insert_challenge_response.js),
            then delegates to the full single-record editor.
   Output:  Single record editor loaded with the challenge response record.
============================================================================= */

"use strict";

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderChallengeResponse
----------------------------------------------------------------------------- */
async function renderChallengeResponse() {
  var recordId =
    window._selectedRecordId ||
    new URLSearchParams(window.location.search).get("id") ||
    null;

  if (!recordId) {
    if (typeof window._setColumn === "function") {
      window._setColumn(
        "main",
        '<div class="state-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:var(--space-3)">' +
          '<span class="state-empty__label">Challenge Response Editor</span>' +
          '<p style="font-family:var(--font-body);font-size:var(--text-sm);color:var(--color-text-secondary);max-width:360px;text-align:center">' +
          "Open a challenge then use Insert Response to create one, or select an existing response." +
          "</p>" +
          "</div>",
      );
    }
    return;
  }

  // Delegate to the single-record editor with the resolved ID
  if (typeof window.renderRecordsSingle === "function") {
    await window.renderRecordsSingle(recordId);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.renderChallengeResponse = renderChallengeResponse;
