/**
 * ESV verse enhancement. Replaces the hardcoded text of any element carrying
 * a `data-esv-ref` attribute with the ESV rendering fetched via the API
 * proxy. Progressive enhancement: on any failure the hardcoded text stays.
 *
 * @module esv_verse
 */

import { getEsvPassage } from './api.js';

async function enhanceVerse(el) {
  const { data, error } = await getEsvPassage(el.dataset.esvRef);
  if (error || !data || !data.text) return;

  // Collapse the API's line breaks — the verse sits inside flowing prose.
  el.textContent = data.text.replace(/\s+/g, ' ').trim();
}

/**
 * Enhance every `[data-esv-ref]` element within `root` (defaults to the
 * whole document). Exported so pages that render verse markup dynamically
 * (after `DOMContentLoaded` has already fired) can re-trigger enhancement
 * for the elements they just inserted.
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
