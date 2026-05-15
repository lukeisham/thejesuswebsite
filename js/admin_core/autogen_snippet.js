// Trigger:  Called by sidebar handler event listeners when the
//           "Auto-gen Snippet" button is clicked.
//           e.g. window.triggerAutoGenSnippet(state, config)
// Main:    Fetches POST /api/admin/snippet/generate with the record's
//           title and slug, populates the configured snippet textarea
//           with the result, and surfaces success/error messages.
// Output:  Updated snippet textarea value. Error messages routed
//           through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: triggerAutoGenSnippet
   Parameters:
     state  — module state object with .activeRecordId, .activeRecordSlug,
              and .activeRecordTitle (or .title for the News variant).
     config — { prefix, snippetInputId, spinnerBtnId }
              prefix:          e.g. "wikipedia-" or "news-"
              snippetInputId:  DOM id of the snippet textarea/input
              spinnerBtnId:    DOM id of the button to disable during fetch
----------------------------------------------------------------------------- */
async function triggerAutoGenSnippet(state, config) {
    var recordId = state.activeRecordId;
    if (!recordId) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No record selected. Select a record first.");
        }
        return;
    }

    var title = state.activeRecordTitle || state.title || "";
    var slug = state.activeRecordSlug || state.activeRecordId || "";

    var btn = document.getElementById(config.spinnerBtnId);
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Generating...";
    }

    try {
        var response = await fetch("/api/admin/snippet/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": window.getCSRFToken() },
            body: JSON.stringify({ slug: slug, content: title }),
        });

        if (!response.ok) {
            var errDetail = "API responded with status " + response.status;
            try {
                var errBody = await response.json();
                if (errBody && errBody.detail) errDetail = errBody.detail;
            } catch (_) { /* ignore parse error */ }
            throw new Error(errDetail);
        }

        var data = await response.json();
        var snippet = data.snippet || "";

        var snippetInput = document.getElementById(config.snippetInputId);
        if (snippetInput) snippetInput.value = snippet;

        if (state.activeRecordSnippet !== undefined) {
            state.activeRecordSnippet = snippet;
        }

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Snippet generated successfully. Saved as draft.");
        }
    } catch (err) {
        console.error("[autogen_snippet] Generation failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Snippet generation failed. Please try again or enter manually."
            );
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Auto-gen Snippet";
        }
    }
}

window.triggerAutoGenSnippet = triggerAutoGenSnippet;
