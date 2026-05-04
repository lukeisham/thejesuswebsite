/* =============================================================================
   THE JESUS WEBSITE — METADATA HANDLER (Shared Tool)
   This is the authoritative copy — consumed by plan_dashboard_blog_posts,
   plan_dashboard_essay_historiography, plan_dashboard_challenge_response,
   plan_dashboard_challenge, plan_dashboard_wikipedia, plan_dashboard_news_sources.
   File:    js/2.0_records/dashboard/metadata_handler.js
   Version: 1.0.0
   Owner:   plan_dashboard_records_single (2.0 Records Module)
   Trigger: Consumer dashboard pages call window.renderMetadataFooter(containerId, recordId)
            to wire up the metadata footer section within a record edit form.
   Main:    renderMetadataFooter(containerId, recordId) — wires the Auto-Generate
            Slug button to POST /api/admin/metadata/generate, reads the title
            from window._recordTitle, and populates the suggested slug into the
            #record-slug input. Manages read-only display fields for
            metadata_json, created_at, and updated_at.
   Output:  Interactive metadata footer with auto-slug generation and timestamp displays.
   Consumer: All dashboard edit modules that include a metadata footer section
             (blog posts, essays, historiography, challenge responses, challenges,
              wikipedia, news sources) consume this shared tool via a <script> tag
             rather than creating local copies.
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: renderMetadataFooter
   Wires up the auto-generate slug button and manages metadata display fields.

   Parameters:
     containerId (string) — The ID of the container element that holds the
                            metadata footer form elements.
     recordId   (string) — The record identifier used as the `slug` parameter
                           when calling the metadata generator API.

   Expected DOM elements (already present in the HTML):
     #record-slug            — Editable text input for the record slug
     #btn-auto-slug          — Button that triggers slug auto-generation
     #record-metadata-json   — Read-only element displaying metadata_json
     #record-created-at      — Read-only element displaying created_at
     #record-updated-at      — Read-only element displaying updated_at

   Expected globals:
     window._recordTitle     — Set by the orchestrator; used as the `content`
                               parameter sent to the slug generator API.
     window.surfaceError()   — Shared error display (js/admin_core/error_handler.js).
----------------------------------------------------------------------------- */
function renderMetadataFooter(containerId, recordId) {

    /* -------------------------------------------------------------------------
       1. RESOLVE DOM ELEMENTS
       All form elements are expected to already exist in the HTML. Query them
       by their well-known IDs. Exit early if the container is missing.
    ------------------------------------------------------------------------- */
    const container = document.getElementById(containerId);
    if (!container) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Failed to save metadata for 'metadata footer container not found'."
            );
        }
        return;
    }

    const slugInput         = document.getElementById("record-slug");
    const btnAutoSlug       = document.getElementById("btn-auto-slug");
    const metadataJsonEl    = document.getElementById("record-metadata-json");
    const createdAtEl       = document.getElementById("record-created-at");
    const updatedAtEl       = document.getElementById("record-updated-at");

    /* -------------------------------------------------------------------------
       2. WIRE AUTO-GENERATE SLUG BUTTON
       On click, read the title from window._recordTitle, POST it to the
       metadata generator API, and populate the returned slug suggestion into
       the #record-slug input.
    ------------------------------------------------------------------------- */
    if (btnAutoSlug) {
        btnAutoSlug.addEventListener("click", async function () {

            // Resolve the title from the orchestrator global
            const title = (typeof window._recordTitle !== "undefined")
                ? window._recordTitle
                : "";

            if (!title || !title.trim()) {
                if (typeof window.surfaceError === "function") {
                    window.surfaceError(
                        "Error: Failed to save metadata for 'no title available'."
                    );
                }
                return;
            }

            try {
                const response = await fetch("/api/admin/metadata/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        slug:    recordId,
                        content: title
                    })
                });

                if (!response.ok) {
                    throw new Error(`API responded with status ${response.status}`);
                }

                const data = await response.json();

                // Populate the suggested slug into the input field
                if (slugInput && data && data.slug) {
                    slugInput.value = data.slug;
                }
            } catch (err) {
                console.error("[metadata_handler] Slug generation failed:", err);
                if (typeof window.surfaceError === "function") {
                    window.surfaceError(
                        `Error: Failed to save metadata for '${title}'.`
                    );
                }
            }
        });
    }

    /* -------------------------------------------------------------------------
       3. MANAGE READ-ONLY DISPLAY FIELDS
       These fields (metadata_json, created_at, updated_at) are read-only and
       already populated by the orchestrator or server-rendered HTML. This
       function does not overwrite their values — it only ensures they are
       discoverable and provides a helper for consumers to update them.
    ------------------------------------------------------------------------- */

    // Expose a helper on the container element so orchestrators can update
    // the read-only fields programmatically after an API save.
    container._setMetadataDisplay = function ({ metadata_json, created_at, updated_at } = {}) {
        if (metadataJsonEl && metadata_json !== undefined) {
            metadataJsonEl.textContent =
                (typeof metadata_json === "string") ? metadata_json : JSON.stringify(metadata_json, null, 2);
        }
        if (createdAtEl && created_at !== undefined) {
            createdAtEl.textContent = String(created_at);
        }
        if (updatedAtEl && updated_at !== undefined) {
            updatedAtEl.textContent = String(updated_at);
        }
    };
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
   All consumer dashboard modules call window.renderMetadataFooter().
----------------------------------------------------------------------------- */
window.renderMetadataFooter = renderMetadataFooter;
