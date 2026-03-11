/**
 * save_to_slide.js
 * Function: Extracts main page content and structures it as a SlideDeckPayload for PPTX export.
 * Rules: Strict Interface, URL-Context Slicing, Lean Passthrough, No Side Effects
 */

import { htmlNodeToText } from './html_to_ascii.js';

// START getSlideHeadingLevel
/**
 * Determines the correct heading tag to use as a slide boundary,
 * based on the current page's URL path.
 *
 * URL patterns:
 *   /essay*, /response*, /blog* → use h4 (deep sectioning)
 *   all other pages              → use h3 (standard sectioning)
 *
 * @returns {'h3' | 'h4' | 'h5'}
 */
function getSlideHeadingLevel() {
    const path = window.location.pathname.toLowerCase();
    if (/\/(essay|response|blog)/.test(path)) {
        // Deeper page types: check if h4 or h5 is present
        const mainEl = document.querySelector('main') || document.body;
        if (mainEl.querySelector('h5')) return 'h5';
        if (mainEl.querySelector('h4')) return 'h4';
    }
    return 'h3';
}
// END getSlideHeadingLevel


// START getCoverTitle
/**
 * Scans the <main> (or body) to find the highest-ranked heading present on the page,
 * then returns its text content as the deck's title/cover slide text.
 *
 * Priority: h1 → h2 → h3 (stops at first match found)
 *
 * @returns {string}
 */
function getCoverTitle() {
    const mainEl = document.querySelector('main') || document.body;
    for (const level of ['h1', 'h2', 'h3']) {
        const el = mainEl.querySelector(level);
        if (el) return el.innerText.trim();
    }
    return document.title || 'Untitled Deck';
}
// END getCoverTitle


// START extractSlides
/**
 * Iterates through the children of <main> and builds an ordered array of slide objects.
 * Each slide corresponds to one section delimited by the target heading level.
 *
 * @returns {Array<{heading: string, content_blocks: string[]}>}
 */
function extractSlides() {
    const mainEl = document.querySelector('main') || document.body;
    const dividerTag = getSlideHeadingLevel();
    const slides = [];
    let currentSlide = null;

    // Walk through all top-level children of main
    const children = Array.from(mainEl.children);

    for (const child of children) {
        const tag = child.tagName.toLowerCase();

        if (tag === dividerTag) {
            // Start a new slide
            if (currentSlide) slides.push(currentSlide);
            currentSlide = {
                heading: child.innerText.trim(),
                content_blocks: [],
            };
        } else if (currentSlide) {
            // Append content to the current slide, skipping empty output
            const text = htmlNodeToText(child);
            if (text) currentSlide.content_blocks.push(text);
        }
        // Content before the first divider heading is ignored (it belongs to the cover)
    }

    // Push the last slide if open
    if (currentSlide) slides.push(currentSlide);

    return slides;
}
// END extractSlides


// START buildSlideDeckPayload
/**
 * Assembles the full SlideDeckPayload JSON object to POST to the backend.
 * @returns {{ deck_title: string, slides: Array, generated_at: string }}
 */
export function buildSlideDeckPayload() {
    return {
        deck_title: getCoverTitle(),
        slides: extractSlides(),
        generated_at: new Date().toISOString(),
    };
}
// END buildSlideDeckPayload
