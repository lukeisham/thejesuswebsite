// Trigger:  Called by sidebar handlers on blur of snippet/slug/meta
//           inputs, or after auto-gen functions complete.
//           e.g. window.saveSidebarMetadata(state, config)
// Main:    Reads snippet, slug, and meta values from DOM inputs,
//           compares against current state to avoid no-op saves,
//           builds a minimal diff payload, and sends PUT to the
//           records API. Sets status to draft on save.
// Output:  Updated state fields and success/error message.

"use strict";

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: saveSidebarMetadata
   Parameters:
     state  — module state object with .activeRecordId, and the state
              fields named in config.stateFieldMap.
     config — {
                snippetInputId:  DOM id of the snippet input,
                slugInputId:     DOM id of the slug input,
                metaInputId:     DOM id of the meta input,
                stateFieldMap:   { snippet: "activeRecordSnippet",
                                   slug:    "activeRecordSlug",
                                   meta:    "activeRecordMeta" }
              }
              stateFieldMap maps the three metadata fields to their
              property names on the state object. This allows the News
              sidebar to use different keys (e.g. "activeSnippet").
----------------------------------------------------------------------------- */
async function saveSidebarMetadata(state, config) {
    var recordId = state.activeRecordId;
    if (!recordId) return;

    var snippetInput = document.getElementById(config.snippetInputId);
    var slugInput = document.getElementById(config.slugInputId);
    var metaInput = document.getElementById(config.metaInputId);

    var newSnippet = snippetInput ? snippetInput.value.trim() : "";
    var newSlug = slugInput ? slugInput.value.trim() : "";
    var newMeta = metaInput ? metaInput.value.trim() : "";

    var snippetKey = config.stateFieldMap.snippet;
    var slugKey = config.stateFieldMap.slug;
    var metaKey = config.stateFieldMap.meta;

    var currentSnippet = state[snippetKey] || "";
    var currentSlug = state[slugKey] || "";
    var currentMeta = state[metaKey] || "";

    // Build payload — only send changed fields
    var payload = { status: "draft" };

    if (newSnippet !== currentSnippet) payload.snippet = newSnippet;
    if (newSlug !== currentSlug) payload.slug = newSlug;
    if (newMeta !== currentMeta) payload.metadata_json = newMeta;

    // If nothing changed, skip the API call
    if (Object.keys(payload).length <= 1) return;

    try {
        var response = await fetch("/api/admin/records/" + recordId, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("API responded with status " + response.status);
        }

        // Update module state
        state[snippetKey] = newSnippet;
        state[slugKey] = newSlug;
        state[metaKey] = newMeta;

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Metadata saved. Record set to draft.");
        }
    } catch (err) {
        console.error("[sidebar_save_metadata] Save failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Error: Failed to save metadata. Please try again.");
        }
    }
}

window.saveSidebarMetadata = saveSidebarMetadata;
