/**
 * ESV verse enhancement. Replaces the hardcoded text of any element carrying
 * a `data-esv-ref` attribute with the ESV rendering fetched via the API
 * proxy. Progressive enhancement: on any failure the hardcoded text stays.
 *
 * Imports getEsvPassage from api.js. Scans the document once, on load;
 * evidence-detail.js imports enhanceEsvVerses for verse markup it inserts later.
 * Guide: setup/ARCHITECTURE/esv-api.md.
 *
 * @module esv_verse
 */

import { getEsvPassage } from './api.js';

async function enhanceVerse(el) {
  const { data, error } = await getEsvPassage(el.dataset.esvRef);
  // An outage is the designed fallback: the authored text stays.
  if (error) return;
  if (!data?.text) {
    console.warn('esv_verse: response had no text for', el.dataset.esvRef);
    return;
  }

  // The fallback is never cleared, so a failure cannot leave a blank element.
  // Line breaks collapse because the verse sits in flowing prose.
  el.textContent = data.text.replace(/\s+/g, ' ').trim();
}

/**
 * Enhance every `[data-esv-ref]` element within `root` (defaults to the
 * whole document). Exported so pages that render verse markup dynamically
 * (after `DOMContentLoaded` has already fired) can re-trigger enhancement
 * for the elements they just inserted.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
export function enhanceEsvVerses(root = document) {
  root.querySelectorAll('[data-esv-ref]').forEach(enhanceVerse);
}

function init() {
  enhanceEsvVerses(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
