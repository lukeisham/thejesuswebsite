/**
 * News & Blog landing page — thin bootstrap.
 * Imports init from the interactions module and runs it.
 *
 * @module news-and-blog
 */

import { init } from './news-blog-interactions.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
