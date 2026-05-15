// Trigger:  Called by sidebar handler event listeners when the
//           "Auto-gen Meta" button is clicked.
//           e.g. window.triggerAutoGenMeta(state, config)
// Main:    Fetches POST /api/admin/metadata/generate with the record's
//           title and slug, populates the configured meta textarea
//           with the JSON result, and surfaces success/error messages.
// Output:  Updated meta textarea value. Error messages routed
//           through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: triggerAutoGenMeta
   Parameters:
     state  — module state object with .activeRecordId, .activeRecordSlug,
              and .activeRecordTitle (or .title for the News variant).
     config — { prefix, metaInputId, spinnerBtnId }
              prefix:         e.g. "wikipedia-" or "news-"
              metaInputId:    DOM id of the meta textarea/input
              spinnerBtnId:   DOM id of the button to disable during fetch
----------------------------------------------------------------------------- */
async function triggerAutoGenMeta(state, config) {
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
        var response = await fetch("/api/admin/metadata/generate", {
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
        var metaJson = data.metadata_json || "";
        var metaString = typeof metaJson === "string" ? metaJson : JSON.stringify(metaJson);

        var metaInput = document.getElementById(config.metaInputId);
        if (metaInput) metaInput.value = metaString;

        if (state.activeRecordMeta !== undefined) {
            state.activeRecordMeta = metaString;
        } else if (state.activeMeta !== undefined) {
            state.activeMeta = metaString;
        }

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Metadata generated successfully. Saved as draft.");
        }
    } catch (err) {
        console.error("[autogen_meta] Generation failed:", err);
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Metadata generation failed. Please try again or enter manually."
            );
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Auto-gen Meta";
        }
    }
}

window.triggerAutoGenMeta = triggerAutoGenMeta;
