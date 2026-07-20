/**
 * Debate list pages: renders challenge cards for both popular and academic
 * challenge lists. Reads `data-type` attribute on <main> to determine which
 * API endpoint to call (popular or academic). Supports filter chips, infinite
 * scroll, and ranked rendering with response counts.
 *
 * @module debate
 */

import { getPopularChallenges, getAcademicChallenges } from './api.js';
import { getParams, pushState } from './utils/router.js';
import { html } from './utils/templates.js';
import { renderBadge } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';

const SENTINEL_ID = 'scroll-sentinel';
const LIST_ID = 'challenge-list';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const FILTER_CHIPS_ID = 'filter-chips';
const CLEAR_FILTERS_ID = 'clear-filters';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let activeFilters = {};
let listType = null; // 'popular' or 'academic'
let observer = null;
let clearFiltersTeardown = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list       = document.getElementById(LIST_ID);
const $sentinel   = document.getElementById(SENTINEL_ID);
const $loading    = document.getElementById(LOADING_ID);
const $empty      = document.getElementById(EMPTY_ID);
const $error      = document.getElementById(ERROR_ID);
const $end        = document.getElementById(END_ID);
const $chips      = document.getElementById(FILTER_CHIPS_ID);
const $clearFilters = document.getElementById(CLEAR_FILTERS_ID);
const $retry      = document.getElementById(RETRY_ID);

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
  const category = params.get('category');
  if (category) filters.category = category;
  return filters;
}

function syncChipUI(filters) {
  if (!$chips) return;
  const buttons = $chips.querySelectorAll('.filter-chip');
  buttons.forEach((btn) => {
    const key = btn.dataset.filter;
    const val = btn.dataset.value;
    if (key === 'all') {
      btn.classList.toggle('filter-chip--active', Object.keys(filters).length === 0);
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
  if ($list) $list.innerHTML = '';
  if ($sentinel) $sentinel.hidden = false;
  hideAllStates();
  await loadPage();
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const fetchFn = listType === 'academic' ? getAcademicChallenges : getPopularChallenges;
  const { data, error } = await fetchFn(activeFilters);

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load challenges', 'error');
    return;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    if (allItems.length === 0) {
      showState('empty');
    } else {
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} challenge${total !== 1 ? 's' : ''} loaded`;
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
    if ($end) $end.textContent = `All ${total} challenge${total !== 1 ? 's' : ''} loaded`;
    return;
  }

  allItems = [...allItems, ...pageItems];
  renderChallengeCards(pageItems);

  if (pageItems.length < PAGE_SIZE || start + pageItems.length >= data.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} challenge${total !== 1 ? 's' : ''} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderChallengeCards(items) {
  if (!$list) return;

  const existingCount = $list.querySelectorAll('.challenge-rank-card').length;

  items.forEach((item, index) => {
    const rank = existingCount + index + 1;
    const detailUrl = listType === 'academic'
      ? `/debate/academic-challenges/${encodeURIComponent(item.slug || '')}`
      : `/debate/popular-challenges/${encodeURIComponent(item.slug || '')}`;

    const card = document.createElement('div');
    card.className = 'challenge-rank-card';

    card.innerHTML = html`
      <div class="challenge-rank-header">
        <span class="challenge-rank-number">${rank}</span>
        <div class="challenge-rank-content">
          <a class="challenge-rank-title" href="${detailUrl}">${item.title || 'Untitled'}</a>
          ${item.summary ? html`<p class="challenge-rank-summary">${item.summary}</p>` : ''}
        </div>
      </div>
      <div class="challenge-rank-footer">
        <span class="challenge-rank-response-count">${item.response_count || 0} response${item.response_count !== 1 ? 's' : ''}</span>
      </div>
      ${item.category ? html`<span class="badge">${item.category}</span>` : ''}
    `;

    $list.appendChild(card);
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
  // Read the data-type attribute on <main> to determine popular vs academic
  const mainEl = document.getElementById('main-content');
  if (mainEl) {
    listType = mainEl.dataset.type || 'popular';
  } else {
    listType = 'popular';
  }

  bindFilterChips();
  bindClearFilters();
  bindRetry();

  activeFilters = parseUrlFilters();
  syncChipUI(activeFilters);

  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
