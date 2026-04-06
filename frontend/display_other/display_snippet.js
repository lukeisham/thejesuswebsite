// =============================================================================
//
//   THE JESUS WEBSITE — DISPLAY SNIPPET
//   File:    frontend/display_other/display_snippet.js
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
function renderSnippet(text, maxLength = 200) {
    if (!text) return '';
    
    // Strip HTML tags to ensure safe and clean truncation
    const strippedText = text.replace(/<[^>]*>?/gm, '');
    let truncated = strippedText;
    
    if (strippedText.length > maxLength) {
        truncated = strippedText.substring(0, maxLength).trim() + '...';
    }
    
    return `<div class="inline-snippet">${truncated}</div>`;
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
