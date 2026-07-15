/**
 * Wikipedia ranked list page: fetch ranked Wikipedia articles,
 * render each with rank number, external link + Feather icon,
 * last-revised date, and +/- counts. Infinite scroll.
 *
 * @module wikipedia
 */

import { getWikipediaArticles } from './api.js';
import { html } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';

const SENTINEL_ID = 'scroll-sentinel';
const LIST_ID = 'wikipedia-list';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list     = document.getElementById(LIST_ID);
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

  const { data, error } = await getWikipediaArticles();

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load Wikipedia articles', 'error');
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
  renderArticles(pageItems);

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

function renderArticles(items) {
  if (!$list) return;

  const existingCount = $list.querySelectorAll('.wikipedia-rank-card').length;

  items.forEach((item, index) => {
    const rank = existingCount + index + 1;

    const title = item.wikipedia_article_title || 'Untitled';
    const url = item.wikipedia_article_url || '#';
    const dateStr = item.wikipedia_article_latest_revision_date
      ? new Date(item.wikipedia_article_latest_revision_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const li = document.createElement('li');
    li.className = 'wikipedia-rank-card';
    li.setAttribute('role', 'listitem');

    li.innerHTML = html`
      <span class="wikipedia-rank-number">${rank}</span>
      <div class="wikipedia-rank-content">
        <div class="wikipedia-rank-title">
          <a href="${url}" target="_blank" rel="noopener noreferrer">
            ${title}
            <svg width="14" height="14" aria-hidden="true" style="display:inline;vertical-align:middle;">
              <use href="/assets/images/feather-sprite.svg#icon-external-link"/>
            </svg>
          </a>
        </div>
        <span class="wikipedia-rank-date">${dateStr ? `Last revised: ${dateStr}` : ''}</span>
      </div>
    `;

    $list.appendChild(li);
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

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    currentPage = 1;
    hasMore = true;
    allItems = [];
    if ($list) $list.innerHTML = '';
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  bindRetry();
  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
