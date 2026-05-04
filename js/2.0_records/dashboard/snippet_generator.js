// Trigger:  User clicks "Generate from Description" button (#btn-generate-snippet)
//           in the snippet editor section, or a consumer module calls the
//           window.generateSnippet() API directly.
// Main:    generateSnippet(recordId, description) — POSTs the description
//           content to /api/admin/snippet/generate, then populates the snippet
//           paragraph editor with the returned snippet JSON on success.
// Output:  Generated snippet string returned to caller; snippet-editor-container
//           populated via window.renderDescriptionEditor(). On failure,
//           surfaces error through window.surfaceError() and returns null.

/* This is the authoritative copy — consumed by plan_dashboard_blog_posts,
   plan_dashboard_essay_historiography, plan_dashboard_challenge_response,
   plan_dashboard_news_sources */

'use strict';

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: generateSnippet
   Calls the admin API to generate a scholarly snippet from the provided
   description content. On success, parses the returned snippet JSON into a
   paragraphs array and passes it to window.renderDescriptionEditor() for the
   "snippet-editor-container".

   Parameters:
     recordId    (string) — The record slug, sent as `slug` in the API body.
     description (string) — The raw text content to generate a snippet from.

   Returns:
     (string|null) — The generated snippet string on success; null on failure.

   Expected globals:
     window._recordTitle          — Set by the orchestrator; used in error messages.
     window.surfaceError()        — Shared error display (js/admin_core/error_handler.js).
     window.renderDescriptionEditor() — Populates the snippet paragraph editor
                                        (js/2.0_records/dashboard/description_editor.js).
----------------------------------------------------------------------------- */
async function generateSnippet(recordId, description) {

    /* -------------------------------------------------------------------------
       1. VALIDATE INPUTS
       Both recordId and description must be non-empty strings before we
       attempt the API call. Surface an error and bail if either is missing.
    ------------------------------------------------------------------------- */
    if (typeof recordId !== 'string' || !recordId.trim()) {
        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Snippet generation failed. Missing record identifier.'
            );
        }
        return null;
    }

    if (typeof description !== 'string' || !description.trim()) {
        if (typeof window.surfaceError === 'function') {
            const title = (typeof window._recordTitle !== 'undefined')
                ? window._recordTitle
                : recordId;
            window.surfaceError(
                `Error: Snippet generation failed for '${title}'. Please provide description content to generate from.`
            );
        }
        return null;
    }

    /* -------------------------------------------------------------------------
       2. RESOLVE TITLE FOR ERROR MESSAGES
       Prefer window._recordTitle (set by the orchestrator). Fall back to the
       recordId slug so error messages are always meaningful.
    ------------------------------------------------------------------------- */
    const title = (typeof window._recordTitle !== 'undefined')
        ? window._recordTitle
        : recordId;

    /* -------------------------------------------------------------------------
       3. CALL THE SNIPPET GENERATION API
       POST /api/admin/snippet/generate with {slug, content}.
       The backend delegates to backend/scripts/snippet_generator.py which
       calls DeepSeek to produce a concise 2-3 sentence scholarly summary.
    ------------------------------------------------------------------------- */
    try {
        const response = await fetch('/api/admin/snippet/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug: recordId,
                content: description
            })
        });

        if (!response.ok) {
            // Attempt to extract a detail message from the API error response
            let detail = `API responded with status ${response.status}`;
            try {
                const errBody = await response.json();
                if (errBody && errBody.detail) {
                    detail = errBody.detail;
                }
            } catch (_) {
                // Could not parse error body — use the status-based message
            }
            throw new Error(detail);
        }

        const data = await response.json();

        /* ---------------------------------------------------------------------
           4. VALIDATE RESPONSE
           The API returns {snippet, slug}. Ensure snippet is a non-empty
           string before proceeding.
        --------------------------------------------------------------------- */
        if (!data || typeof data.snippet !== 'string' || !data.snippet.trim()) {
            throw new Error('API returned an empty snippet.');
        }

        const snippetText = data.snippet;

        /* ---------------------------------------------------------------------
           5. POPULATE THE SNIPPET PARAGRAPH EDITOR
           Parse the snippet string as a JSON array of paragraph strings.
           If it is not valid JSON, wrap it as a single-element array so the
           editor can still render it.
        --------------------------------------------------------------------- */
        let paragraphs;
        try {
            paragraphs = JSON.parse(snippetText);
            if (!Array.isArray(paragraphs)) {
                // The snippet is a plain string — wrap it as one paragraph
                paragraphs = [snippetText];
            }
        } catch (_) {
            // Not valid JSON — treat the entire string as one paragraph
            paragraphs = [snippetText];
        }

        // Pass the paragraphs array to the shared description editor for the
        // snippet container so the user can review and edit individual paragraphs.
        if (typeof window.renderDescriptionEditor === 'function') {
            window.renderDescriptionEditor('snippet-editor-container', paragraphs);
        }

        return snippetText;

    } catch (err) {
        /* ---------------------------------------------------------------------
           6. FAILURE — SURFACE ERROR AND RETURN NULL
           Route the error message through the shared error handler so it
           appears in the universal Status Bar footer.
        --------------------------------------------------------------------- */
        console.error('[snippet_generator] Snippet generation failed:', err);
        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                `Error: Snippet generation failed for '${title}'. Please try again or enter manually.`
            );
        }
        return null;
    }
}

/* -----------------------------------------------------------------------------
   BUTTON WIRING: "Generate from Description"
   Automatically wires the #btn-generate-snippet button (if present in the
   DOM) to collect the current description text and pass it to generateSnippet().

   The description text is resolved by:
     1. Calling window.collectDescription() if available (returns a JSON array
        of paragraph strings from the description editor).
     2. Falling back to reading textareas inside #description-editor-container.
   The recordId is resolved from window._recordSlug or the current URL path.
----------------------------------------------------------------------------- */
function _wireGenerateButton() {
    const btn = document.getElementById('btn-generate-snippet');
    if (!btn) {
        // Button not present in this page — nothing to wire. This is normal
        // for consumer pages that include the script but don't render the
        // snippet editor section.
        return;
    }

    btn.addEventListener('click', async function () {

        /* ---------------------------------------------------------------------
           Resolve description text from the description editor
        --------------------------------------------------------------------- */
        let descriptionText = '';

        // Primary source: the shared description editor's collect function
        if (typeof window.collectDescription === 'function') {
            try {
                const paragraphs = window.collectDescription();
                if (Array.isArray(paragraphs) && paragraphs.length > 0) {
                    descriptionText = paragraphs
                        .filter(function (p) { return typeof p === 'string' && p.trim(); })
                        .join('\n\n');
                }
            } catch (_) {
                // collectDescription not yet available or threw — fall through
            }
        }

        // Fallback: read textareas directly from the description editor container
        if (!descriptionText) {
            const descContainer = document.getElementById('description-editor-container');
            if (descContainer) {
                const textareas = descContainer.querySelectorAll('textarea');
                const parts = [];
                textareas.forEach(function (ta) {
                    if (ta.value && ta.value.trim()) {
                        parts.push(ta.value.trim());
                    }
                });
                descriptionText = parts.join('\n\n');
            }
        }

        if (!descriptionText) {
            if (typeof window.surfaceError === 'function') {
                const title = (typeof window._recordTitle !== 'undefined')
                    ? window._recordTitle
                    : 'this record';
                window.surfaceError(
                    `Error: Snippet generation failed for '${title}'. Please provide description content to generate from.`
                );
            }
            return;
        }

        /* ---------------------------------------------------------------------
           Resolve recordId
        --------------------------------------------------------------------- */
        let recordId = '';

        // Check for a slug global set by the orchestrator
        if (typeof window._recordSlug !== 'undefined' && window._recordSlug) {
            recordId = window._recordSlug;
        }

        // Fallback: derive from the current URL path (e.g. /admin/records/some-slug)
        if (!recordId) {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            // Expected path: /admin/records/{slug}
            if (pathParts.length >= 3 && pathParts[0] === 'admin' && pathParts[1] === 'records') {
                recordId = pathParts[2];
            }
        }

        if (!recordId) {
            if (typeof window.surfaceError === 'function') {
                window.surfaceError(
                    'Error: Snippet generation failed. Could not determine the record identifier.'
                );
            }
            return;
        }

        /* ---------------------------------------------------------------------
           Trigger snippet generation
        --------------------------------------------------------------------- */
        btn.disabled = true;
        btn.textContent = 'Generating…';

        try {
            await generateSnippet(recordId, descriptionText);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate from Description';
        }
    });
}

/* -----------------------------------------------------------------------------
   INITIALISATION: Wire the generate button when the DOM is ready
----------------------------------------------------------------------------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _wireGenerateButton);
} else {
    // DOM already loaded — wire immediately
    _wireGenerateButton();
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — shared-tool API contract
   All consumer dashboard modules call window.generateSnippet(recordId, description).
----------------------------------------------------------------------------- */
window.generateSnippet = generateSnippet;
