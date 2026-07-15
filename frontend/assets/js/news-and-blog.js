/**
 * News & Blog landing page: fetch blog posts and news articles separately,
 * render each in its own section (News at top, Blog below), hero promotion,
 * toggle chips, and infinite scroll per section.
 *
 * @module news-and-blog
 */

import { getBlogPosts, getNewsArticles } from './api.js';
import { renderCard, renderBadge } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';

const NEWS_SENTINEL_ID = 'news-scroll-sentinel';
const BLOG_SENTINEL_ID = 'blog-scroll-sentinel';
const NEWS_LIST_ID = 'news-list';
const BLOG_LIST_ID = 'blog-list';
const HERO_ID = 'hero-promotion';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const NEWS_END_ID = 'news-end-of-list';
const BLOG_END_ID = 'blog-end-of-list';
const TOGGLE_CHIPS_ID = 'toggle-chips';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 10;
const SCROLL_THRESHOLD = 300;

// ─── State ────────────────────────────────────────────────────────────────────

let currentNewsPage = 1;
let hasMoreNews = true;
let currentBlogPage = 1;
let hasMoreBlog = true;
let isLoading = false;
let newsItems = [];
let blogItems = [];
let allItems = []; // combined for hero lookup
let activeType = 'all'; // 'all', 'blog', 'news'
let heroItem = null;
let newsObserver = null;
let blogObserver = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $newsList = document.getElementById(NEWS_LIST_ID);
const $blogList = document.getElementById(BLOG_LIST_ID);
const $hero = document.getElementById(HERO_ID);
const $newsSentinel = document.getElementById(NEWS_SENTINEL_ID);
const $blogSentinel = document.getElementById(BLOG_SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $newsEnd = document.getElementById(NEWS_END_ID);
const $blogEnd = document.getElementById(BLOG_END_ID);
const $newsSection = document.getElementById('news-section');
const $blogSection = document.getElementById('blog-section');
const $toggles = document.getElementById(TOGGLE_CHIPS_ID);
const $retry = document.getElementById(RETRY_ID);

// ─── State management ────────────────────────────────────────────────────────

function showState(name) {
  [$loading, $empty, $error].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error }[name];
  if (target) target.hidden = false;
}

function hideAllStates() {
  [$loading, $empty, $error].forEach((el) => el && (el.hidden = true));
}

function updateSectionVisibility() {
  const showNews = activeType === 'all' || activeType === 'news';
  const showBlog = activeType === 'all' || activeType === 'blog';

  if ($newsSection) $newsSection.hidden = !showNews;
  if ($blogSection) $blogSection.hidden = !showBlog;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and truncate plain text to a maximum length.
 * Used to create safe card excerpts from rich-content fields like blog_content.
 */
function stripHtmlAndTruncate(html, maxLength = 200) {
  if (!html || typeof html !== 'string') return '';
  const plain = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchAllItems() {
  const [blogResult, newsResult] = await Promise.all([
    getBlogPosts(),
    getNewsArticles(),
  ]);

  if (blogResult.data) {
    blogItems = blogResult.data.map((post) => ({
      ...post,
      title: post.blog_title,
      description: stripHtmlAndTruncate(post.blog_content, 200),
      _type: 'blog',
      _date: post.blog_date || post.created_at,
    }));
  }

  if (newsResult.data) {
    newsItems = newsResult.data.map((article) => ({
      ...article,
      title: article.news_article_title,
      description: buildNewsDescription(article),
      _type: 'news',
      _date: article.news_article_date || article.created_at,
      thumbnail: article.news_article_thumbnail || null,
      external_url: article.news_article_url || null,
    }));
  }

  // Combined for hero lookup
  allItems = [...newsItems, ...blogItems];
  allItems.sort((a, b) => new Date(b._date) - new Date(a._date));

  return { error: blogResult.error || newsResult.error || null };
}

function buildNewsDescription(article) {
  const parts = [];
  if (article.news_article_author) parts.push(`By ${article.news_article_author}`);
  if (article.news_article_publisher) parts.push(`in ${article.news_article_publisher}`);
  return parts.length ? parts.join(' · ') : '';
}

async function loadPage() {
  if (isLoading) return;
  isLoading = true;
  showState('loading');

  // If first load, fetch all from API
  if (allItems.length === 0) {
    const { error } = await fetchAllItems();

    if (error) {
      isLoading = false;
      showState('error');
      showToast('Failed to load posts', 'error');
      return;
    }

    if (allItems.length === 0) {
      isLoading = false;
      showState('empty');
      return;
    }

    // Render hero promotion card
    heroItem = renderHeroPromotion();
  }

  updateSectionVisibility();

  // Render first page of each section
  renderNewsPage();
  renderBlogPage();

  isLoading = false;
  hideAllStates();
}

// ─── News rendering ──────────────────────────────────────────────────────────

function getVisibleNewsItems() {
  if (!heroItem || heroItem._type !== 'news') return newsItems;
  return newsItems.filter((item) => item.slug !== heroItem.slug);
}

function renderNewsPage() {
  if (!$newsList || !hasMoreNews) return;

  const visible = getVisibleNewsItems();
  const start = (currentNewsPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  if (visible.length === 0 && currentNewsPage === 1) {
    return;
  }

  if (pageItems.length === 0) {
    hasMoreNews = false;
    if ($newsSentinel) $newsSentinel.hidden = true;
    if ($newsEnd) {
      $newsEnd.hidden = false;
      $newsEnd.textContent = `All ${visible.length} article${visible.length !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  renderCards($newsList, pageItems);

  if (start + pageItems.length >= visible.length) {
    hasMoreNews = false;
    if ($newsSentinel) $newsSentinel.hidden = true;
    if ($newsEnd) {
      $newsEnd.hidden = false;
      $newsEnd.textContent = `All ${visible.length} article${visible.length !== 1 ? 's' : ''} loaded`;
    }
  } else {
    currentNewsPage++;
    if ($newsSentinel) $newsSentinel.hidden = false;
    if (newsObserver && $newsSentinel) newsObserver.observe($newsSentinel);
  }
}

// ─── Blog rendering ──────────────────────────────────────────────────────────

function getVisibleBlogItems() {
  if (!heroItem || heroItem._type !== 'blog') return blogItems;
  return blogItems.filter((item) => item.slug !== heroItem.slug);
}

function renderBlogPage() {
  if (!$blogList || !hasMoreBlog) return;

  const visible = getVisibleBlogItems();
  const start = (currentBlogPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  if (visible.length === 0 && currentBlogPage === 1) {
    return;
  }

  if (pageItems.length === 0) {
    hasMoreBlog = false;
    if ($blogSentinel) $blogSentinel.hidden = true;
    if ($blogEnd) {
      $blogEnd.hidden = false;
      $blogEnd.textContent = `All ${visible.length} post${visible.length !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  renderCards($blogList, pageItems);

  if (start + pageItems.length >= visible.length) {
    hasMoreBlog = false;
    if ($blogSentinel) $blogSentinel.hidden = true;
    if ($blogEnd) {
      $blogEnd.hidden = false;
      $blogEnd.textContent = `All ${visible.length} post${visible.length !== 1 ? 's' : ''} loaded`;
    }
  } else {
    currentBlogPage++;
    if ($blogSentinel) $blogSentinel.hidden = false;
    if (blogObserver && $blogSentinel) blogObserver.observe($blogSentinel);
  }
}

// ─── Hero promotion ──────────────────────────────────────────────────────────

function renderHeroPromotion() {
  const hero = allItems.find((item) => item.landing_page_display === 1 || item.landing_page_display === true);
  if (!hero || !$hero) return null;

  const typeLabel = hero._type === 'blog' ? 'Blog' : 'News';
  const url = hero._type === 'blog'
    ? `/news-and-blog/blog/${encodeURIComponent(hero.slug || '')}`
    : `/news-and-blog/news/${encodeURIComponent(hero.slug || '')}`;

  $hero.innerHTML = renderCard({
    title: hero.title || 'Untitled',
    description: hero.description || hero.summary || '',
    url,
    badges: [typeLabel],
  });

  $hero.hidden = false;
  return hero;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderCards($list, items) {
  if (!$list || !items.length) return;

  items.forEach((item) => {
    const isNews = item._type === 'news';
    const url = isNews
      ? (item.external_url || `/news-and-blog/news/${encodeURIComponent(item.slug || '')}`)
      : `/news-and-blog/blog/${encodeURIComponent(item.slug || '')}`;
    const date = item._date
      ? new Date(item._date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    // Build base card HTML
    let cardHTML = renderCard({
      title: item.title || 'Untitled',
      description: item.description || item.summary || '',
      url,
      badges: [isNews ? 'News' : 'Blog'],
    });

    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;

    if (!cardEl) return;

    // News cards: open external URL in new tab
    if (isNews && item.external_url && cardEl.tagName === 'A') {
      cardEl.setAttribute('target', '_blank');
      cardEl.setAttribute('rel', 'noopener noreferrer');
    }

    // Thumbnail for news cards
    if (isNews && item.thumbnail) {
      prependThumbnail(cardEl, item.thumbnail);
    } else if (isNews) {
      prependEmptyThumbnail(cardEl);
    }

    // Add meta row below badges
    if (date) {
      const metaEl = document.createElement('p');
      metaEl.className = 'news-blog-card-meta';
      metaEl.textContent = date;
      cardEl.appendChild(metaEl);
    }

    $list.appendChild(cardEl);
  });
}

function prependThumbnail(cardEl, thumbnailPath) {
  const img = document.createElement('img');
  img.className = 'news-card-thumbnail';
  img.src = thumbnailPath;
  img.alt = '';
  img.loading = 'lazy';
  cardEl.insertBefore(img, cardEl.firstChild);
}

function prependEmptyThumbnail(cardEl) {
  const placeholder = document.createElement('div');
  placeholder.className = 'news-card-thumbnail news-card-thumbnail--empty';
  placeholder.setAttribute('aria-hidden', 'true');
  cardEl.insertBefore(placeholder, cardEl.firstChild);
}

// ─── Toggle chips ────────────────────────────────────────────────────────────

function bindToggleChips() {
  if (!$toggles) return;

  delegate($toggles, '.news-blog-toggle', 'click', (_e, target) => {
    const type = target.dataset.type;
    if (!type || type === activeType) return;

    $toggles.querySelectorAll('.news-blog-toggle').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    activeType = type;
    updateSectionVisibility();
  });
}

// ─── Infinite scroll ─────────────────────────────────────────────────────────

function initInfiniteScroll() {
  if ($newsSentinel) {
    newsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMoreNews && !isLoading) {
            renderNewsPage();
          }
        });
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` }
    );
    newsObserver.observe($newsSentinel);
  }

  if ($blogSentinel) {
    blogObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMoreBlog && !isLoading) {
            renderBlogPage();
          }
        });
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` }
    );
    blogObserver.observe($blogSentinel);
  }
}

// ─── Event wiring ────────────────────────────────────────────────────────────

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    currentNewsPage = 1;
    hasMoreNews = true;
    currentBlogPage = 1;
    hasMoreBlog = true;
    allItems = [];
    newsItems = [];
    blogItems = [];
    heroItem = null;
    if ($newsList) $newsList.innerHTML = '';
    if ($blogList) $blogList.innerHTML = '';
    if ($hero) $hero.hidden = true;
    if ($newsEnd) $newsEnd.hidden = true;
    if ($blogEnd) $blogEnd.hidden = true;
    hideAllStates();
    if ($newsSentinel) $newsSentinel.hidden = false;
    if ($blogSentinel) $blogSentinel.hidden = false;
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
