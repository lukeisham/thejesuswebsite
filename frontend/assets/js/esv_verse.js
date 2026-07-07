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

function init() {
  document.querySelectorAll('[data-esv-ref]').forEach(enhanceVerse);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
