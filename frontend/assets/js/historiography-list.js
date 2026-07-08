/**
 * Historiography list page: fetch paginated historiography articles,
 * render period-grouped cards, infinite scroll, and sessionStorage caching.
 *
 * @module historiography-list
 */

import { getHistoriography } from './api.js';
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

const STORAGE_KEY_ITEMS = 'historiography_list_items';
const STORAGE_KEY_SCROLL = 'historiography_list_scroll';

// The 8 fixed periods, in chronological display order (JS-2: predictable).
const PERIOD_LABELS = {
  'early-church': 'Early Church (1st–5th c.)',
  medieval: 'Medieval (5th–15th c.)',
  'reformation-early-modern': 'Reformation & Early Modern (16th–18th c.)',
  'enlightenment-old-quest': 'Enlightenment & Old Quest (1778–1906)',
  'no-quest-period-of-silence': 'No Quest / Period of Silence (1906–1953)',
  'second-quest-new-quest': 'Second Quest / New Quest (1953–1970s)',
  'third-quest': 'Third Quest (1980s–1990s)',
  contemporary: 'Contemporary (21st c.)',
};

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;

// Period slug -> its `.card-grid` element, so cards from later pages land in
// the right group instead of duplicating section headers (JS-6).
const periodGrids = new Map();

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $grid     = document.getElementById(CARD_GRID_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading  = document.getElementById(LOADING_ID);
const $empty    = document.getElementById(EMPTY_ID);
const $error    = document.getElementById(ERROR_ID);
const $end      = document.getElementById(END_ID);
const $retry    = document.getElementById(RETRY_ID);

// ─── State management ────────────────────────────────────────────────────────

function showState(name) {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error, end: $end }[name];
  if (target) target.hidden = false;
  if ($sentinel) $sentinel.hidden = name !== 'none';
}

function hideAllStates() {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const { data, error } = await getHistoriography();

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load historiography articles', 'error');
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

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = data.slice(start, start + PAGE_SIZE);

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

// ─── Rendering ───────────────────────────────────────────────────────────────

/**
 * Find or create the `.card-grid` for a period, creating its wrapping
 * `<section>` and `<h3>` heading on first use (HTML-1, HTML-3).
 */
function getPeriodGrid(period) {
  const key = period || 'other';
  if (periodGrids.has(key)) return periodGrids.get(key);
  if (!$grid) return null;

  const headingId = `historiography-period-${key}`;
  const section = document.createElement('section');
  section.className = 'historiography-period';
  section.setAttribute('aria-labelledby', headingId);

  const heading = document.createElement('h3');
  heading.className = 'historiography-period__heading';
  heading.id = headingId;
  heading.textContent = PERIOD_LABELS[key] || 'Other';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.setAttribute('role', 'list');
  section.appendChild(grid);

  $grid.appendChild(section);
  periodGrids.set(key, grid);
  return grid;
}

function renderCards(items) {
  if (!$grid) return;

  items.forEach((item) => {
    const periodGrid = getPeriodGrid(item.historiography_period);
    if (!periodGrid) return;

    const date = item.published_at || item.created_at;
    const dateStr = date
      ? new Date(date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const byline = item.author
      ? `${item.author}${dateStr ? ` \u00B7 ${dateStr}` : ''}`
      : dateStr;

    const cardHTML = renderCard({
      title: item.title || 'Untitled',
      description: byline || '',
      url: `/debate/historiography/${encodeURIComponent(item.slug || '')}`,
      badges: [],
    });

    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;
    if (cardEl) {
      const typeBadge = cardEl.querySelector('.card-badges');
      if (typeBadge) {
        const histBadge = document.createElement('span');
        histBadge.className = 'badge';
        histBadge.textContent = 'Historiography';
        typeBadge.appendChild(histBadge);
      }
      periodGrid.appendChild(cardEl);
    }
  });
}

// ─── Infinite scroll ─────────────────────────────────────────────────────────

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

// ─── SessionStorage caching ──────────────────────────────────────────────────

function cacheItems() {
  try {
    sessionStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(allItems));
    sessionStorage.setItem(STORAGE_KEY_SCROLL, String(window.scrollY));
  } catch { /* quota exceeded */ }
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
      periodGrids.clear();
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

// ─── Event wiring ────────────────────────────────────────────────────────────

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    currentPage = 1;
    hasMore = true;
    allItems = [];
    clearCachedItems();
    if ($grid) $grid.innerHTML = '';
    periodGrids.clear();
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

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
