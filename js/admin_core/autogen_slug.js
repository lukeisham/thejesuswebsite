// Trigger:  Called by sidebar handler event listeners when the
//           "Auto-gen Slug" button is clicked.
//           e.g. window.triggerAutoGenSlug(state, config)
// Main:    Generates a URL-friendly slug from the record's title
//           (lowercase, strip special chars, collapse hyphens).
//           Populates the configured slug input element.
// Output:  Updated slug input value. Success message surfaced
//           through window.surfaceError().

"use strict";

/* -----------------------------------------------------------------------------
   SHARED FUNCTION: triggerAutoGenSlug
   Parameters:
     state  — module state object with .activeRecordTitle (or .title).
     config — { slugInputId }
              slugInputId: DOM id of the slug input to populate
----------------------------------------------------------------------------- */
function triggerAutoGenSlug(state, config) {
    var title = state.activeRecordTitle || state.title || "";
    if (!title) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No title available to generate slug from.");
        }
        return;
    }

    // Generate slug: lowercase, strip non-alphanumeric except hyphens,
    // collapse whitespace to hyphens, trim leading/trailing hyphens.
    var slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    var slugInput = document.getElementById(config.slugInputId);
    if (slugInput) slugInput.value = slug;

    if (state.activeRecordSlug !== undefined) {
        state.activeRecordSlug = slug;
    }

    if (typeof window.surfaceError === "function") {
        window.surfaceError("Slug auto-generated from title.");
    }
}

window.triggerAutoGenSlug = triggerAutoGenSlug;
