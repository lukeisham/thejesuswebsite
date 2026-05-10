// Trigger:  Consumer modules call the window.generateSnippet() API directly.
// Main:    generateSnippet(recordId, description) — POSTs the description
//           content to /api/admin/snippet/generate, then populates the snippet
//           paragraph editor with the returned snippet JSON on success.
// Output:  Generated snippet string returned to caller; snippet-editor-container
//           populated via window.renderDescriptionEditor(). On failure,
//           surfaces error through window.surfaceError() and returns null.

/* This is the authoritative copy — consumed by plan_dashboard_blog_posts,
   plan_dashboard_essay_historiography, plan_dashboard_challenge_response,
   plan_dashboard_news_sources */

"use strict";

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
  if (typeof recordId !== "string" || !recordId.trim()) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Snippet generation failed. Missing record identifier.",
      );
    }
    return null;
  }

  if (typeof description !== "string" || !description.trim()) {
    if (typeof window.surfaceError === "function") {
      const title =
        typeof window._recordTitle !== "undefined"
          ? window._recordTitle
          : recordId;
      window.surfaceError(
        `Error: Snippet generation failed for '${title}'. Please provide description content to generate from.`,
      );
    }
    return null;
  }

  /* -------------------------------------------------------------------------
       2. RESOLVE TITLE FOR ERROR MESSAGES
       Prefer window._recordTitle (set by the orchestrator). Fall back to the
       recordId slug so error messages are always meaningful.
    ------------------------------------------------------------------------- */
  const title =
    typeof window._recordTitle !== "undefined" ? window._recordTitle : recordId;

  /* -------------------------------------------------------------------------
       3. CALL THE SNIPPET GENERATION API
       POST /api/admin/snippet/generate with {slug, content}.
       The backend delegates to backend/scripts/snippet_generator.py which
       calls DeepSeek to produce a concise 2-3 sentence scholarly summary.
    ------------------------------------------------------------------------- */
  try {
    const response = await fetch("/api/admin/snippet/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: recordId,
        content: description,
      }),
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
    if (!data || typeof data.snippet !== "string" || !data.snippet.trim()) {
      throw new Error("API returned an empty snippet.");
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
    if (typeof window.renderDescriptionEditor === "function") {
      window.renderDescriptionEditor("snippet-editor-container", paragraphs);
    }

    return snippetText;
  } catch (err) {
    /* ---------------------------------------------------------------------
           6. FAILURE — SURFACE ERROR AND RETURN NULL
           Route the error message through the shared error handler so it
           appears in the universal Status Bar footer.
        --------------------------------------------------------------------- */
    console.error("[snippet_generator] Snippet generation failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        `Error: Snippet generation failed for '${title}'. Please try again or enter manually.`,
      );
    }
    return null;
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE — shared-tool API contract
   All consumer dashboard modules call window.generateSnippet(recordId, description).
----------------------------------------------------------------------------- */
window.generateSnippet = generateSnippet;
