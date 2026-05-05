// Trigger:  Called by sidebar handlers when the user clicks Add/Remove
//           on a search term chip.
//           e.g. window.addSidebarTerm(state, config)
//                window.removeSidebarTerm(state, config, index)
// Main:    Manages a JSON array of search terms in the record via
//           PUT /api/admin/records/{id}. On add, appends the term from
//           the input; on remove, splices by index. Both write the
//           updated array to the configured database column and call
//           config.renderFn() to refresh the chip UI.
// Output:  Updated record in the database. Chip list re-rendered via
//           the module-specific render callback. Success/error messages
//           surfaced through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: addSidebarTerm
   Parameters:
     state  — module state object with .activeRecordId and the field
              named in config.stateTermsKey (e.g. "activeRecordSearchTerms"
              or "activeSearchKeywords").
     config — {
                prefix:         e.g. "wikipedia-" or "news-",
                inputId:        DOM id of the term input,
                termColumn:     DB column name for the search terms,
                stateTermsKey:  key on state holding the terms array,
                renderFn:       function to re-render chip list after save
              }
----------------------------------------------------------------------------- */
async function addSidebarTerm(state, config) {
    var recordId = state.activeRecordId;
    if (!recordId) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No record selected. Select a record first.");
        }
        return;
    }

    var termInput = document.getElementById(config.inputId);
    if (!termInput) return;

    var newTerm = termInput.value.trim();
    if (!newTerm) return;

    var terms = state[config.stateTermsKey] || [];
    if (terms.indexOf(newTerm) !== -1) {
        termInput.value = "";
        return;
    }

    terms.push(newTerm);
    var termsJson = JSON.stringify(terms);

    try {
        var payload = {};
        payload[config.termColumn] = termsJson;
        payload.status = "draft";

        var response = await fetch("/api/admin/records/" + recordId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("API responded with status " + response.status);
        }

        state[config.stateTermsKey] = terms;
        termInput.value = "";

        if (typeof config.renderFn === "function") {
            config.renderFn();
        }

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Keyword '" + newTerm + "' added. Saved as draft.");
        }
    } catch (err) {
        console.error("[sidebar_term_chips] Add term failed:", err);
        // Revert local state on failure
        terms.pop();
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Error: Failed to save search keywords. Please try again.");
        }
    }
}

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: removeSidebarTerm
   Parameters:
     state  — module state object with .activeRecordId and the field
              named in config.stateTermsKey.
     config — same shape as addSidebarTerm above.
     index  — the index of the term to remove from the array.
----------------------------------------------------------------------------- */
async function removeSidebarTerm(state, config, index) {
    var recordId = state.activeRecordId;
    if (!recordId) return;

    var terms = (state[config.stateTermsKey] || []).slice();
    if (index < 0 || index >= terms.length) return;

    var removedTerm = terms[index];
    terms.splice(index, 1);

    var termsJson = JSON.stringify(terms);

    try {
        var payload = {};
        payload[config.termColumn] = termsJson;
        payload.status = "draft";

        var response = await fetch("/api/admin/records/" + recordId, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("API responded with status " + response.status);
        }

        state[config.stateTermsKey] = terms;

        if (typeof config.renderFn === "function") {
            config.renderFn();
        }

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Keyword '" + removedTerm + "' removed. Saved as draft.");
        }
    } catch (err) {
        console.error("[sidebar_term_chips] Remove term failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Error: Failed to save search keywords. Please try again.");
        }
    }
}

window.addSidebarTerm = addSidebarTerm;
window.removeSidebarTerm = removeSidebarTerm;
