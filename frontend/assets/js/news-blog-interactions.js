/**
 * News & Blog interactions module — event binding, infinite scroll,
 * toggle chips, retry, and bootstrapping. No rendering or data-fetching
 * lives here — imports from data and render modules.
 *
 * @module news-blog-interactions
 */

import {
  state,
  SCROLL_THRESHOLD,
  TOGGLE_CHIPS_ID,
  RETRY_ID,
  $newsSentinel,
  $blogSentinel,
  $toggles,
  $retry,
  $newsList,
  $blogList,
  $hero,
  $newsEnd,
  $blogEnd,
  loadPage,
  hideAllStates,
  updateSectionVisibility,
} from './news-blog-data.js';

import {
  renderHeroPromotion,
  renderNewsPage,
  renderBlogPage,
} from './news-blog-render.js';

import { delegate } from './utils/dom.js';

// ─── Orchestration ─────────────────────────────────────────────────────────────

/**
 * Full page load cycle: fetch data, render hero, show sections, render cards.
 * Called on initial load and on retry. (JS-5)
 */
async function orchestratePageLoad() {
  await loadPage();

  // After data is loaded, render hero and first page of each section
  renderHeroPromotion();
  updateSectionVisibility();
  renderNewsPage();
  renderBlogPage();
}

// ─── Toggle chips (JS-6: event delegation) ────────────────────────────────────

export function bindToggleChips() {
  if (!$toggles) return;

  delegate($toggles, '.news-blog-toggle', 'click', (_e, target) => {
    const type = target.dataset.type;
    if (!type || type === state.activeType) return;

    $toggles.querySelectorAll('.news-blog-toggle').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    state.activeType = type;
    updateSectionVisibility();
  });
}

// ─── Infinite scroll (JS-6: IntersectionObserver) ─────────────────────────────

export function initInfiniteScroll() {
  if ($newsSentinel) {
    state.newsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && state.hasMoreNews && !state.isLoading) {
            renderNewsPage();
          }
        });
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` },
    );
    state.newsObserver.observe($newsSentinel);
  }

  if ($blogSentinel) {
    state.blogObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && state.hasMoreBlog && !state.isLoading) {
            renderBlogPage();
          }
        });
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` },
    );
    state.blogObserver.observe($blogSentinel);
  }
}

// ─── Retry (JS-6: delegate, teardown on re-bind) ──────────────────────────────

export function bindRetry() {
  if (!$retry) return;
  if (state.retryTeardown) state.retryTeardown();

  state.retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    // Reset all state
    state.currentNewsPage = 1;
    state.hasMoreNews = true;
    state.currentBlogPage = 1;
    state.hasMoreBlog = true;
    state.allItems = [];
    state.newsItems = [];
    state.blogItems = [];
    state.heroItem = null;

    // Clear DOM (JS-6: empty string only, no user data)
    if ($newsList) $newsList.innerHTML = '';
    if ($blogList) $blogList.innerHTML = '';
    if ($hero) $hero.hidden = true;
    if ($newsEnd) $newsEnd.hidden = true;
    if ($blogEnd) $blogEnd.hidden = true;
    hideAllStates();
    if ($newsSentinel) $newsSentinel.hidden = false;
    if ($blogSentinel) $blogSentinel.hidden = false;

    orchestratePageLoad();
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────

export function init() {
  bindToggleChips();
  bindRetry();
  initInfiniteScroll();
  orchestratePageLoad();
}
