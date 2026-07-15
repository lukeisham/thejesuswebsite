/**
 * News & Blog data module — owns all shared state, DOM refs, helpers,
 * and data-fetching logic. Imported by render and interactions modules.
 *
 * @module news-blog-data
 */

import { getBlogPosts, getNewsArticles } from './api.js';
import { showToast } from './utils/toasts.js';

// ─── Constants ──────────────────────────────────────────────────────────────────

export const NEWS_SENTINEL_ID = 'news-scroll-sentinel';
export const BLOG_SENTINEL_ID = 'blog-scroll-sentinel';
export const NEWS_LIST_ID = 'news-list';
export const BLOG_LIST_ID = 'blog-list';
export const HERO_ID = 'hero-promotion';
export const LOADING_ID = 'loading-state';
export const EMPTY_ID = 'empty-state';
export const ERROR_ID = 'error-state';
export const NEWS_END_ID = 'news-end-of-list';
export const BLOG_END_ID = 'blog-end-of-list';
export const TOGGLE_CHIPS_ID = 'toggle-chips';
export const RETRY_ID = 'retry-load';

export const PAGE_SIZE = 10;
export const SCROLL_THRESHOLD = 300;

// ─── Shared mutable state (JS-3: simple object, no class) ──────────────────────

export const state = {
  currentNewsPage: 1,
  hasMoreNews: true,
  currentBlogPage: 1,
  hasMoreBlog: true,
  isLoading: false,
  newsItems: [],
  blogItems: [],
  allItems: [], // combined for hero lookup
  activeType: 'all', // 'all', 'blog', 'news'
  heroItem: null,
  newsObserver: null,
  blogObserver: null,
  retryTeardown: null,
};

// ─── DOM refs (JS-6: cached queries) ──────────────────────────────────────────

export const $newsList = document.getElementById(NEWS_LIST_ID);
export const $blogList = document.getElementById(BLOG_LIST_ID);
export const $hero = document.getElementById(HERO_ID);
export const $newsSentinel = document.getElementById(NEWS_SENTINEL_ID);
export const $blogSentinel = document.getElementById(BLOG_SENTINEL_ID);
export const $loading = document.getElementById(LOADING_ID);
export const $empty = document.getElementById(EMPTY_ID);
export const $error = document.getElementById(ERROR_ID);
export const $newsEnd = document.getElementById(NEWS_END_ID);
export const $blogEnd = document.getElementById(BLOG_END_ID);
export const $newsSection = document.getElementById('news-section');
export const $blogSection = document.getElementById('blog-section');
export const $toggles = document.getElementById(TOGGLE_CHIPS_ID);
export const $retry = document.getElementById(RETRY_ID);

// ─── State management (JS-2: defensive null checks) ────────────────────────────

export function showState(name) {
  [$loading, $empty, $error].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error }[name];
  if (target) target.hidden = false;
}

export function hideAllStates() {
  [$loading, $empty, $error].forEach((el) => el && (el.hidden = true));
}

export function updateSectionVisibility() {
  const showNews = state.activeType === 'all' || state.activeType === 'news';
  const showBlog = state.activeType === 'all' || state.activeType === 'blog';

  if ($newsSection) $newsSection.hidden = !showNews;
  if ($blogSection) $blogSection.hidden = !showBlog;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and truncate plain text to a maximum length.
 * Used to create safe card excerpts from rich-content fields like blog_content.
 * (JS-2: validates input type before processing)
 */
export function stripHtmlAndTruncate(html, maxLength = 200) {
  if (!html || typeof html !== 'string') return '';
  const plain = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, '') + '\u2026';
}

// ─── Data fetching (JS-5: async/await + centralized fetch) ─────────────────────

export function buildNewsDescription(article) {
  const parts = [];
  if (article.news_article_author) parts.push(`By ${article.news_article_author}`);
  if (article.news_article_publisher) parts.push(`in ${article.news_article_publisher}`);
  return parts.length ? parts.join(' \u00b7 ') : '';
}

/**
 * Fetch blog posts and news articles in parallel, normalize field names,
 * and sort by date. Sets module-scoped state. (JS-5)
 */
export async function fetchAllItems() {
  const [blogResult, newsResult] = await Promise.all([
    getBlogPosts(),
    getNewsArticles(),
  ]);

  if (blogResult.data) {
    state.blogItems = blogResult.data.map((post) => ({
      ...post,
      title: post.blog_title,
      description: stripHtmlAndTruncate(post.blog_content, 200),
      _type: 'blog',
      _date: post.blog_date || post.created_at,
    }));
  }

  if (newsResult.data) {
    state.newsItems = newsResult.data.map((article) => ({
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
  state.allItems = [...state.newsItems, ...state.blogItems];
  state.allItems.sort((a, b) => new Date(b._date) - new Date(a._date));

  return { error: blogResult.error || newsResult.error || null };
}

/**
 * Initial load: fetch data, render hero, then delegate to render module.
 * (JS-5: try/catch via API's {data, error} pattern, loading/error states)
 */
export async function loadPage() {
  if (state.isLoading) return;
  state.isLoading = true;
  showState('loading');

  if (state.allItems.length === 0) {
    const { error } = await fetchAllItems();

    if (error) {
      state.isLoading = false;
      showState('error');
      showToast('Failed to load posts', 'error');
      return;
    }

    if (state.allItems.length === 0) {
      state.isLoading = false;
      showState('empty');
      return;
    }
  }

  state.isLoading = false;
  hideAllStates();
}
