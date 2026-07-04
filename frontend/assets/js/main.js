/**
 * Main JS entry point.
 *
 * Imports and initialises all shared modules. Each concern stays in its own
 * file (SR-1). This file contains no logic itself — only wiring.
 *
 * @module main
 */

import { initSidebar } from './sidebar.js';
import { initHamburger } from './sidebar_hamburger.js';
import { initFooter } from './footer.js';
import { showConsentBanner } from './cookies.js';
import { recordPageView } from './api.js';
import { initLazyLoad } from './utils/lazy-load.js';

// ─── Reduced-motion check ────────────────────────────────────────────────────
//
// Reads --duration-* and --ease-* from CSS custom properties rather than
// hard-coding values (CSS-2). If prefers-reduced-motion is set, we add a
// helper class that CSS rules can reference.

function checkReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    document.documentElement.classList.toggle('reduced-motion', mq.matches);
  };
  update();
  mq.addEventListener('change', update);
}

// ─── Skip-link focus behaviour ───────────────────────────────────────────────

function initSkipLink() {
  const skipLink = document.querySelector('.skip-link');
  if (!skipLink) return;

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(skipLink.getAttribute('href'));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

function init() {
  checkReducedMotion();
  initSkipLink();
  initSidebar();
  initHamburger();
  initFooter();
  showConsentBanner();
  initLazyLoad();

  // Record initial page view
  recordPageView(window.location.pathname);

  // Record page views on client-side navigation (popstate)
  window.addEventListener('popstate', () => {
    recordPageView(window.location.pathname);
    initSidebar();
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
