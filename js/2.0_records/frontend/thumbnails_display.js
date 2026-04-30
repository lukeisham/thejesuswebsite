// =============================================================================
//
//   THE JESUS WEBSITE — THUMBNAILS DISPLAY
//   File:    js/2.0_records/frontend/thumbnails_display.js
//   Version: 1.0.0
//   Purpose: Renders thumbnails for lists, cards, and responses.
//   Source:  guide_appearance.md §1.7, module_sitemap.md
//
// =============================================================================

/**
 * renderThumbnail
 * 
 * Returns the HTML string for a thumbnail image.
 * 
 * @param {string} imageUrl     - Path to the image
 * @param {string} altText      - Accessible alt text
 * @param {string} sizeModifier - Optional modifier: 'md' or 'lg'
 * @returns {string}            - HTML snippet
 */
function renderThumbnail(imageUrl, altText = "Thumbnail image", sizeModifier = "") {
    let sizeClass = "thumbnail";
    if (sizeModifier) {
        sizeClass += ` thumbnail--${sizeModifier}`;
    }
    
    if (!imageUrl) {
        // Fallback if no image is provided
        return `
        <div class="${sizeClass}" style="display: flex; align-items: center; justify-content: center; background: var(--color-border); color: var(--color-text-muted); font-size: 10px; font-family: var(--font-mono);">
            N/A
        </div>`;
    }
    
    return `
        <div class="${sizeClass}">
            <img src="${imageUrl}" alt="${altText}" loading="lazy" />
        </div>
    `;
}

/**
 * injectThumbnail
 * 
 * Injects a thumbnail into a specific container by ID.
 * 
 * @param {string} containerId 
 * @param {string} imageUrl 
 * @param {string} altText 
 * @param {string} sizeModifier 
 */
function injectThumbnail(containerId, imageUrl, altText, sizeModifier) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = renderThumbnail(imageUrl, altText, sizeModifier);
    }
}
