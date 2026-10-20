/**
 * Blog list page: fetch paginated blog posts, render row-based cards
 * with title, date, excerpt, and infinite scroll. (JS-5, JS-6)
 *
 * @module blog-list
 */

import { getBlogPosts } from './api.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';
import { renderExcerpt } from './utils/excerpt.js';
import { formatDateShort } from './utils/date-format.js';

const SENTINEL_ID = 'scroll-sentinel';
const CARD_GRID_ID = 'card-grid';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

// Versioned key: excerpts are rendered via innerHTML, so a cache written in an
// older plain-text format must never be read under this key. The entry holds
// the items with the paging state; a bare array is the older format without
// paging state, and restoreFromCache() discards it.
const STORAGE_KEY_ITEMS = 'blog_list_items_v2';
const STORAGE_KEY_SCROLL = 'blog_list_scroll';

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;

// ─── DOM refs (JS-6: cached queries) ──────────────────────────────────────────

const $grid = document.getElementById(CARD_GRID_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $end = document.getElementById(END_ID);
const $retry = document.getElementById(RETRY_ID);

// ─── State management (JS-2: defensive null checks) ───────────────────────────

function showState(name) {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error, end: $end }[name];
  if (target) target.hidden = false;
  if ($sentinel) $sentinel.hidden = name !== 'none';
}

function hideAllStates() {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
}

// ─── Data fetching (JS-5: async/await, centralized fetch) ─────────────────────

// Called by loadPage inside its try/catch, so a bad record shows the error
// state instead of leaving the loading state on screen. `data` is the
// { items, totalPages } envelope the API sends when page and limit are given.
function handleLoadedPosts(data) {
  const posts = data?.items ?? [];

  if (posts.length === 0) {
    if (allItems.length === 0) {
      showState('empty');
    } else {
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      showEndOfList();
    }
    return;
  }

  // The list rows carry a prefix of blog_content, which is all renderExcerpt
  // needs for a 150-character excerpt.
  const pageItems = posts.map((post) => ({
    ...post,
    _title: post.blog_title,
    _date: post.blog_date || post.created_at,
    _excerpt: renderExcerpt(post.blog_content, 150),
  }));

  allItems = [...allItems, ...pageItems];
  renderCards(pageItems);

  hasMore = currentPage < data.totalPages;
  if (hasMore) currentPage++;
  cacheItems();

  if (!hasMore) {
    $sentinel && ($sentinel.hidden = true);
    showEndOfList();
  } else {
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

function showEndOfList() {
  showState('end');
  const total = allItems.length;
  if ($end) $end.textContent = `All ${total} post${total !== 1 ? 's' : ''} loaded`;
}

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const { data, error } = await getBlogPosts({
    page: currentPage,
    limit: PAGE_SIZE,
  });

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load blog posts', 'error');
    return;
  }

  try {
    handleLoadedPosts(data);
  } catch (err) {
    console.error('blog-list loadPage: failed to render fetched posts', err);
    showState('error');
    showToast('Failed to load blog posts', 'error');
  }
}

// ─── Rendering (JS-6: textContent for user data) ──────────────────────────────

function renderCards(items) {
  if (!$grid) return;

  items.forEach((item) => {
    const url = `/news-and-blog/blog/${encodeURIComponent(item.slug || '')}`;

    const row = document.createElement('a');
    row.className = 'news-blog-row';
    row.href = url;
    row.setAttribute('target', '_blank');
    row.setAttribute('rel', 'noopener noreferrer');

    const thumbSrc = item.blog_thumbnail || item.hero_image;
    if (thumbSrc) {
      const img = document.createElement('img');
      img.className = 'news-blog-row-thumb';
      img.src = thumbSrc;
      img.alt = '';
      img.loading = 'lazy';
      row.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'news-blog-row-thumb news-blog-row-thumb--empty';
      placeholder.setAttribute('aria-hidden', 'true');
      row.appendChild(placeholder);
    }

    const body = document.createElement('div');
    body.className = 'news-blog-row-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'news-blog-row-title';
    titleEl.textContent = item._title || 'Untitled';
    body.appendChild(titleEl);

    if (item._date) {
      const meta = document.createElement('p');
      meta.className = 'news-blog-row-meta';
      meta.textContent = formatDateShort(item._date);
      body.appendChild(meta);
    }

    if (item._excerpt) {
      const excerpt = document.createElement('p');
      excerpt.className = 'news-blog-row-excerpt';
      // Safe: item._excerpt comes from renderExcerpt(), which HTML-escapes
      // author text before adding <strong>/<em> — the only tags it can
      // emit (JS-6).
      excerpt.innerHTML = item._excerpt;
      body.appendChild(excerpt);
    }

    row.appendChild(body);
    $grid.appendChild(row);
  });
}

// ─── Infinite scroll (JS-6) ───────────────────────────────────────────────────

function initInfiniteScroll() {
  if (!$sentinel) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadPage();
        }
      });
    },
    { rootMargin: `${SCROLL_THRESHOLD}px` }
  );

  observer.observe($sentinel);
}

// ─── SessionStorage caching (JS-2: try/catch for quota) ───────────────────────

function cacheItems() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY_ITEMS,
      JSON.stringify({ items: allItems, currentPage, hasMore }),
    );
    sessionStorage.setItem(STORAGE_KEY_SCROLL, String(window.scrollY));
  } catch { /* quota exceeded — non-critical */ }
}

function clearCachedItems() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_ITEMS);
    sessionStorage.removeItem(STORAGE_KEY_SCROLL);
  } catch { /* ignore */ }
}

function restoreFromCache() {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY_ITEMS);
    if (cached) {
      const state = JSON.parse(cached);
      if (!Array.isArray(state?.items) || !Number.isInteger(state.currentPage)) {
        clearCachedItems();
        return false;
      }
      allItems = state.items;
      currentPage = state.currentPage;
      hasMore = state.hasMore === true;
      if ($grid) $grid.innerHTML = '';
      renderCards(allItems);
      if (hasMore) {
        hideAllStates();
        $sentinel && ($sentinel.hidden = false);
      } else {
        $sentinel && ($sentinel.hidden = true);
        showEndOfList();
      }
      return true;
    }
  } catch (err) {
    console.warn('blog-list restoreFromCache: discarding unreadable cache', err);
    clearCachedItems();
    allItems = [];
    currentPage = 1;
    hasMore = true;
  }
  return false;
}

function restoreScrollPosition() {
  try {
    const scrollY = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    if (scrollY) {
      requestAnimationFrame(() => window.scrollTo(0, Number(scrollY)));
    }
  } catch { /* ignore */ }
}

// ─── Event wiring (JS-6: delegation + teardown) ───────────────────────────────

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    currentPage = 1;
    hasMore = true;
    allItems = [];
    clearCachedItems();
    if ($grid) $grid.innerHTML = '';
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
  });
}

// ─── Initialisation ───────────────────────────────────────────────────────────

function init() {
  bindRetry();
  initInfiniteScroll();

  const restored = restoreFromCache();
  if (restored) {
    restoreScrollPosition();
    return;
  }

  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
