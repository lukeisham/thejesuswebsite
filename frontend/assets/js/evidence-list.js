/**
 * Evidence list page: fetch, filter, infinite scroll, and sessionStorage caching.
 *
 * @module evidence-list
 */

import { getEvidence } from './api.js';
import { renderCard, renderBadge } from './utils/templates.js';
import { getParams, pushState } from './utils/router.js';
import { showToast } from './utils/toasts.js';
import { numberFigures } from './utils/figures.js';
import { delegate } from './utils/dom.js';

const SENTINEL_ID = 'scroll-sentinel';
const CARD_GRID_ID = 'card-grid';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const FILTER_CHIPS_ID = 'filter-chips';
const CLEAR_FILTERS_ID = 'clear-filters';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

const STORAGE_KEY_ITEMS = 'evidence_list_items';
const STORAGE_KEY_SCROLL = 'evidence_list_scroll';

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let activeFilters = {};
let observer = null;
let clearFiltersTeardown = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $grid = document.getElementById(CARD_GRID_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $end = document.getElementById(END_ID);
const $chips = document.getElementById(FILTER_CHIPS_ID);
const $clearFilters = document.getElementById(CLEAR_FILTERS_ID);
const $retry = document.getElementById(RETRY_ID);

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

// ─── Filter logic ────────────────────────────────────────────────────────────

function parseUrlFilters() {
  const params = getParams();
  const filters = {};
  for (const key of ['timeline_era', 'timeline_period', 'gospel_category', 'map_location']) {
    const val = params.get(key);
    if (val) filters[key] = val;
  }
  return filters;
}

function syncChipUI(filters) {
  if (!$chips) return;
  const buttons = $chips.querySelectorAll('.filter-chip');
  buttons.forEach((btn) => {
    const key = btn.dataset.filter;
    const val = btn.dataset.value;
    if (key === 'all') {
      const hasAny = Object.keys(filters).length > 0;
      btn.classList.toggle('filter-chip--active', !hasAny);
    } else if (filters[key] === val) {
      btn.classList.add('filter-chip--active');
    } else {
      btn.classList.remove('filter-chip--active');
    }
  });
}

function applyFilters(filters) {
  activeFilters = { ...filters };
  const qs = new URLSearchParams(filters).toString();
  pushState(window.location.pathname + (qs ? '?' + qs : ''));
  syncChipUI(filters);
  resetAndLoad();
}

async function resetAndLoad() {
  currentPage = 1;
  hasMore = true;
  allItems = [];
  if ($grid) $grid.innerHTML = '';
  if ($sentinel) $sentinel.hidden = false;
  hideAllStates();
  clearCachedItems();
  await loadPage();
  restoreScrollPosition();
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const params = { ...activeFilters };
  // The API doesn't support pagination natively — we fetch all matches and slice
  // TODO: update API to support `?page=N&limit=N` for proper pagination

  const { data, error } = await getEvidence(params);

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load evidence', 'error');
    return;
  }

  if (!data || data.length === 0) {
    if (allItems.length === 0) {
      showState('empty');
    } else {
      hasMore = false;
      $sentinel.hidden = true;
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  // Paginate manually from the full result set
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = data.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    hasMore = false;
    $sentinel.hidden = true;
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
    return;
  }

  allItems = [...allItems, ...pageItems];
  renderCards(pageItems);
  cacheItems();

  if (pageItems.length < PAGE_SIZE || start + pageItems.length >= data.length) {
    hasMore = false;
    $sentinel.hidden = true;
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel.hidden = false;
    // Re-observe sentinel (it may have been unobserved on last page)
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderCards(items) {
  if (!$grid) return;

  items.forEach((item) => {
    const cardHTML = renderEvidenceCard(item);
    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;
    if (cardEl) {
      $grid.appendChild(cardEl);
    }
  });

  // Number figures in newly rendered content
  numberFigures($grid);
}

function renderEvidenceCard(item) {
  const badges = [];
  if (item.gospel_category) badges.push(item.gospel_category);
  if (item.timeline_era) badges.push(item.timeline_era);
  if (item.map_location) badges.push(item.map_location);

  const url = `/evidence/single/${encodeURIComponent(item.slug || '')}`;

  return renderCard({
    title: item.title || 'Untitled',
    description: item.description || '',
    url,
    badges,
  });
}

// ─── Infinite scroll (IntersectionObserver) ──────────────────────────────────

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

// ─── SessionStorage caching (back-nav) ───────────────────────────────────────

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
      hasMore = false; // Assume all cached items are loaded
      $sentinel && ($sentinel.hidden = true);
      if ($grid) $grid.innerHTML = '';
      renderCards(allItems);
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
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

function bindFilterChips() {
  if (!$chips) return;

  delegate($chips, '.filter-chip', 'click', (_e, target) => {
    const filterKey = target.dataset.filter;
    if (filterKey === 'all') {
      applyFilters({});
      return;
    }

    const filterValue = target.dataset.value;
    const newFilters = { ...activeFilters };

    if (newFilters[filterKey] === filterValue) {
      // Toggle off
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = filterValue;
    }

    applyFilters(newFilters);
  });
}

function bindClearFilters() {
  if (!$clearFilters) return;
  if (clearFiltersTeardown) clearFiltersTeardown();
  clearFiltersTeardown = delegate(document.body, `#${CLEAR_FILTERS_ID}`, 'click', () => {
    applyFilters({});
  });
}

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    resetAndLoad();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  bindFilterChips();
  bindClearFilters();
  bindRetry();

  activeFilters = parseUrlFilters();
  syncChipUI(activeFilters);

  // Try restoring from cache first (back-navigation)
  const restored = restoreFromCache();
  if (restored) {
    restoreScrollPosition();
    return;
  }

  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
