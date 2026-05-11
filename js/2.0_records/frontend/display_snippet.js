// =============================================================================
//
//   THE JESUS WEBSITE — DISPLAY SNIPPET
//   File:    js/2.0_records/frontend/display_snippet.js
//   Version: 1.0.0
//   Purpose: Renders truncated text snippets for lists, cards, and previews.
//   Source:  module_sitemap.md
//
// =============================================================================

/**
 * renderSnippet
 *
 * Returns the HTML string for a truncated inline snippet.
 *
 * @param {string} text         - The full text to abbreviate
 * @param {number} maxLength    - Optional max character length before truncation
 * @returns {string}            - HTML snippet
 */
function renderSnippet(text, maxLength) {
  if (!text) return "";

  var maxChars = maxLength || 200;
  var plainText = "";

  // Attempt JSON parse — handle array-of-paragraph-strings format
  try {
    var parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      plainText = parsed.join(" ");
    } else if (typeof parsed === "string") {
      plainText = parsed;
    } else {
      plainText = String(parsed);
    }
  } catch (e) {
    // Not valid JSON — treat as plain text
    plainText = text;
  }

  // Strip HTML tags to ensure safe and clean truncation
  var strippedText = plainText.replace(/<[^>]*>?/gm, "");
  var truncated = strippedText;

  if (strippedText.length > maxChars) {
    truncated = strippedText.substring(0, maxChars).trim() + "...";
  }

  return '<div class="inline-snippet">' + truncated + "</div>";
}

/**
 * injectSnippet
 *
 * Injects a snippet into a specific container by ID.
 *
 * @param {string} containerId
 * @param {string} text
 * @param {number} maxLength
 */
function injectSnippet(containerId, text, maxLength) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = renderSnippet(text, maxLength);
  }
}
