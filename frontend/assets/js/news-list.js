/**
 * News list page: fetch paginated news articles, render cards with side-by-side
 * thumbnails, external links, author/publisher display, and infinite scroll.
 *
 * @module news-list
 */

import { getNewsArticles } from './api.js';
import { renderCard } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';

const SENTINEL_ID = 'scroll-sentinel';
const CARD_GRID_ID = 'card-grid';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

const STORAGE_KEY_ITEMS = 'news_list_items';
const STORAGE_KEY_SCROLL = 'news_list_scroll';

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;

// ─── DOM refs (JS-6: cached queries, never re-queried) ────────────────────────

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

// ─── Helpers (JS-2: validates input before processing) ────────────────────────

function buildNewsDescription(article) {
  const parts = [];
  if (article.news_article_author) parts.push(`By ${article.news_article_author}`);
  if (article.news_article_publisher) parts.push(`in ${article.news_article_publisher}`);
  return parts.length ? parts.join(' \u00b7 ') : '';
}

// ─── Data fetching (JS-5: async/await + centralized fetch via api.js) ──────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const { data, error } = await getNewsArticles();

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load news articles', 'error');
    return;
  }

  if (!data || data.length === 0) {
    if (allItems.length === 0) {
      showState('empty');
    } else {
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  // Normalise raw DB column names to the shape expected by renderCard
  const normalized = data.map((article) => ({
    ...article,
    title: article.news_article_title,
    description: buildNewsDescription(article),
    _date: article.news_article_date || article.created_at,
    thumbnail: article.news_article_thumbnail || null,
    external_url: article.news_article_url || null,
  }));

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = normalized.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
    return;
  }

  allItems = [...allItems, ...pageItems];
  renderCards(pageItems);
  cacheItems();

  if (pageItems.length < PAGE_SIZE || start + pageItems.length >= data.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Rendering (JS-6: textContent for user data, SafeString via renderCard) ───

function renderCards(items) {
  if (!$grid) return;

  items.forEach((item) => {
    const date = item._date
      ? new Date(item._date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const url = item.external_url || `/news-and-blog/news/${encodeURIComponent(item.slug || '')}`;

    // (JS-6) renderCard uses SafeString — all values are escaped
    const cardHTML = renderCard({
      title: item.title || 'Untitled',
      description: item.description || '',
      url,
      badges: ['News'],
    });

    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;

    if (!cardEl) return;

    // News cards: open external URL in new tab (JS-6: setAttribute, not HTML)
    if (item.external_url && cardEl.tagName === 'A') {
      cardEl.setAttribute('target', '_blank');
      cardEl.setAttribute('rel', 'noopener noreferrer');
    }

    // Side-by-side row: thumbnail on left, title + description on right
    restructureNewsCard(cardEl, item);

    // Date meta (JS-6: textContent, not innerHTML)
    if (date) {
      const meta = document.createElement('p');
      meta.className = 'news-blog-card-meta';
      meta.textContent = date;
      cardEl.appendChild(meta);
    }

    $grid.appendChild(cardEl);
  });
}

// ─── News card side-by-side layout (HTML-2: thumbnail alt="") ──────────────────

function restructureNewsCard(cardEl, item) {
  const thumb = item.thumbnail
    ? buildThumbnailImg(item.thumbnail)
    : buildEmptyThumbnail();

  const titleEl = cardEl.querySelector('.card-title');
  const descEl = cardEl.querySelector('.card-description');

  const body = document.createElement('div');
  body.className = 'news-card-body';
  if (titleEl) body.appendChild(titleEl);
  if (descEl) body.appendChild(descEl);

  const row = document.createElement('div');
  row.className = 'news-card-row';
  row.appendChild(thumb);
  row.appendChild(body);

  cardEl.insertBefore(row, cardEl.firstChild);
}

function buildThumbnailImg(path) {
  const img = document.createElement('img');
  img.className = 'news-card-thumbnail';
  img.src = path;
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

function buildEmptyThumbnail() {
  const placeholder = document.createElement('div');
  placeholder.className = 'news-card-thumbnail news-card-thumbnail--empty';
  placeholder.setAttribute('aria-hidden', 'true');
  return placeholder;
}

// ─── Infinite scroll (JS-6: IntersectionObserver) ─────────────────────────────

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

// ─── SessionStorage caching (JS-2: try/catch for quota errors) ────────────────

function cacheItems() {
  try {
    sessionStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(allItems));
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
      allItems = JSON.parse(cached);
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      if ($grid) $grid.innerHTML = '';
      renderCards(allItems);
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
      return true;
    }
  } catch { /* ignore */ }
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
