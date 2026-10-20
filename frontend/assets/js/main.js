/**
 * Main JS entry point.
 *
 * Imports and initialises all shared modules. Each concern stays in its own
 * file (SR-1). This file holds only wiring and the page-view consent check.
 *
 * @module main
 */

import { initSidebar } from './sidebar.js';
import { initHamburger } from './sidebar_hamburger.js';
import { initFooter } from './footer.js';
import { showConsentBanner, getConsent } from './cookies.js';
import { recordPageView } from './api.js';
import { initLazyLoad } from './utils/lazy-load.js';

// ─── Reduced-motion check ────────────────────────────────────────────────────
//
// Mirrors prefers-reduced-motion onto <html> as a class, so CSS rules can
// reference it. The class follows live changes made while the page is open.

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

// ─── Page-view recording ─────────────────────────────────────────────────────
//
// Declined visitors are not recorded. cookies.js stores the choice,
// recordPageView in api.js posts to the analytics endpoint
// (setup/ARCHITECTURE/analytics.md describes the flow).

function recordPageViewIfAllowed() {
  if (getConsent() === false) return;
  recordPageView(window.location.pathname);
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

  recordPageViewIfAllowed();

  window.addEventListener('popstate', () => {
    recordPageViewIfAllowed();
    initSidebar();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
