/**
 * News & Blog landing page: fetch mixed blog posts and news articles,
 * merge/sort by date, toggle chips (All / Blog / News), hero promotion,
 * and infinite scroll.
 *
 * @module news-and-blog
 */

import { getBlogPosts, getNewsArticles } from './api.js';
import { renderCard, renderBadge } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';

const SENTINEL_ID = 'scroll-sentinel';
const CARD_LIST_ID = 'card-list';
const HERO_ID = 'hero-promotion';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const TOGGLE_CHIPS_ID = 'toggle-chips';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 10;
const SCROLL_THRESHOLD = 300;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let activeType = 'all'; // 'all', 'blog', 'news'
let observer = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list = document.getElementById(CARD_LIST_ID);
const $hero = document.getElementById(HERO_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $end = document.getElementById(END_ID);
const $toggles = document.getElementById(TOGGLE_CHIPS_ID);
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

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchAllItems() {
  // Fetch from both endpoints in parallel via Promise.all (JS-5)
  const [blogResult, newsResult] = await Promise.all([
    getBlogPosts(),
    getNewsArticles(),
  ]);

  const items = [];

  if (blogResult.data) {
    blogResult.data.forEach((post) => {
      items.push({
        ...post,
        _type: 'blog',
        _date: post.published_at || post.created_at,
      });
    });
  }

  if (newsResult.data) {
    newsResult.data.forEach((article) => {
      items.push({
        ...article,
        _type: 'news',
        _date: article.published_at || article.created_at,
      });
    });
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b._date) - new Date(a._date));

  return { items, error: blogResult.error || newsResult.error || null };
}

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  // If first load, fetch all from API
  if (allItems.length === 0) {
    const { items, error } = await fetchAllItems();

    if (error) {
      isLoading = false;
      showState('error');
      showToast('Failed to load posts', 'error');
      return;
    }

    if (!items || items.length === 0) {
      isLoading = false;
      showState('empty');
      return;
    }

    allItems = items;

    // Render hero promotion card (first item with landing_page_display = 1)
    renderHeroPromotion();
  }

  // Filter by active type
  const filtered = activeType === 'all'
    ? allItems
    : allItems.filter((item) => item._type === activeType);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  isLoading = false;

  if (filtered.length === 0) {
    showState('empty');
    return;
  }

  if (pageItems.length === 0) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = filtered.length;
    if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
    return;
  }

  renderCards(pageItems);

  if (start + pageItems.length >= filtered.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = filtered.length;
    if ($end) $end.textContent = `All ${total} item${total !== 1 ? 's' : ''} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Hero promotion ──────────────────────────────────────────────────────────

function renderHeroPromotion() {
  const heroItem = allItems.find((item) => item.landing_page_display === 1 || item.landing_page_display === true);
  if (!heroItem || !$hero) return;

  const typeLabel = heroItem._type === 'blog' ? 'Blog' : 'News';
  const url = heroItem._type === 'blog'
    ? `/news-and-blog/blog/${encodeURIComponent(heroItem.slug || '')}`
    : `/news-and-blog/news/${encodeURIComponent(heroItem.slug || '')}`;

  $hero.innerHTML = renderCard({
    title: heroItem.title || 'Untitled',
    description: heroItem.description || heroItem.summary || '',
    url,
    badges: [typeLabel],
  });

  $hero.hidden = false;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderCards(items) {
  if (!$list) return;

  items.forEach((item) => {
    const typeLabel = item._type === 'blog' ? 'Blog' : 'News';
    const url = item._type === 'blog'
      ? `/news-and-blog/blog/${encodeURIComponent(item.slug || '')}`
      : `/news-and-blog/news/${encodeURIComponent(item.slug || '')}`;
    const date = item._date
      ? new Date(item._date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const cardHTML = renderCard({
      title: item.title || 'Untitled',
      description: item.description || item.summary || '',
      url,
      badges: [typeLabel],
    });

    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;

    // Add meta row below badges
    if (cardEl && date) {
      const metaEl = document.createElement('p');
      metaEl.className = 'news-blog-card-meta';
      metaEl.textContent = date;
      cardEl.appendChild(metaEl);
    }

    if (cardEl) {
      $list.appendChild(cardEl);
    }
  });
}

// ─── Toggle chips ────────────────────────────────────────────────────────────

function bindToggleChips() {
  if (!$toggles) return;

  delegate($toggles, '.news-blog-toggle', 'click', (_e, target) => {
    const type = target.dataset.type;
    if (!type || type === activeType) return;

    // Update active chip
    $toggles.querySelectorAll('.news-blog-toggle').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    activeType = type;

    // Reset and reload
    currentPage = 1;
    hasMore = true;
    if ($list) $list.innerHTML = '';
    if ($hero) $hero.hidden = true;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
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
    if ($hero) $hero.hidden = true;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  bindToggleChips();
  bindRetry();
  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
