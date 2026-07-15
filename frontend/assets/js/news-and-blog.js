/**
 * News & Blog landing page: fetch the latest 5 news articles and 3 blog posts,
 * render each in a horizontal row with thumbnail, title, meta, and excerpt.
 * Section headings link to full endless-scroll pages.
 *
 * @module news-and-blog
 */

import { getBlogPosts, getNewsArticles } from './api.js';
import { showToast } from './utils/toasts.js';

// ─── DOM refs (JS-6: cached queries) ──────────────────────────────────────────

const $newsList = document.getElementById('news-list');
const $blogList = document.getElementById('blog-list');
const $loading = document.getElementById('loading-state');
const $error = document.getElementById('error-state');
const $retry = document.getElementById('retry-load');

// ─── State ────────────────────────────────────────────────────────────────────

function showLoading() {
  if ($loading) $loading.hidden = false;
  if ($error) $error.hidden = true;
}

function showError() {
  if ($loading) $loading.hidden = true;
  if ($error) $error.hidden = false;
}

function hideLoading() {
  if ($loading) $loading.hidden = true;
}

// ─── Data fetching (JS-5: async/await, centralized fetch) ─────────────────────

async function init() {
  showLoading();

  const [newsResult, blogResult] = await Promise.all([
    getNewsArticles(),
    getBlogPosts(),
  ]);

  if (newsResult.error || blogResult.error) {
    showError();
    showToast('Failed to load posts', 'error');
    return;
  }

  hideLoading();

  const latestNews = (newsResult.data || []).slice(0, 5);
  const latestBlog = (blogResult.data || []).slice(0, 3);

  if (latestNews.length > 0) renderNewsRows(latestNews);
  if (latestBlog.length > 0) renderBlogRows(latestBlog);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderNewsRows(articles) {
  if (!$newsList) return;

  articles.forEach((article) => {
    const row = buildRow({
      title: article.news_article_title,
      meta: buildNewsMeta(article),
      thumbnail: article.news_article_thumbnail || null,
      url: article.news_article_url,
    });
    // (JS-6: setAttribute, not innerHTML for attrs)
    if (article.news_article_url) {
      row.setAttribute('target', '_blank');
      row.setAttribute('rel', 'noopener noreferrer');
    }
    $newsList.appendChild(row);
  });
}

function renderBlogRows(posts) {
  if (!$blogList) return;

  posts.forEach((post) => {
    const row = buildRow({
      title: post.blog_title,
      meta: buildBlogMeta(post),
      excerpt: stripHtmlAndTruncate(post.blog_content, 150),
      url: `/news-and-blog/blog/${encodeURIComponent(post.slug || '')}`,
    });
    row.setAttribute('target', '_blank');
    row.setAttribute('rel', 'noopener noreferrer');
    $blogList.appendChild(row);
  });
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow({ title, meta, thumbnail, excerpt, url }) {
  const a = document.createElement('a');
  a.className = 'news-blog-row';
  a.href = url || '#';

  // Thumbnail
  if (thumbnail) {
    const img = document.createElement('img');
    img.className = 'news-blog-row-thumb';
    img.src = thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    a.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'news-blog-row-thumb news-blog-row-thumb--empty';
    placeholder.setAttribute('aria-hidden', 'true');
    a.appendChild(placeholder);
  }

  // Text body
  const body = document.createElement('div');
  body.className = 'news-blog-row-body';

  const titleEl = document.createElement('h3');
  titleEl.className = 'news-blog-row-title';
  titleEl.textContent = title || 'Untitled';
  body.appendChild(titleEl);

  if (meta) {
    const metaEl = document.createElement('p');
    metaEl.className = 'news-blog-row-meta';
    metaEl.textContent = meta;
    body.appendChild(metaEl);
  }

  if (excerpt) {
    const excerptEl = document.createElement('p');
    excerptEl.className = 'news-blog-row-excerpt';
    excerptEl.textContent = excerpt;
    body.appendChild(excerptEl);
  }

  a.appendChild(body);
  return a;
}

// ─── Meta helpers ─────────────────────────────────────────────────────────────

function buildNewsMeta(article) {
  const parts = [];
  if (article.news_article_author) parts.push(article.news_article_author);
  if (article.news_article_publisher) parts.push(article.news_article_publisher);
  if (article.news_article_date) {
    parts.push(formatDate(article.news_article_date));
  }
  return parts.join(' · ');
}

function buildBlogMeta(post) {
  const parts = [];
  if (post.blog_date) parts.push(formatDate(post.blog_date));
  else if (post.created_at) parts.push(formatDate(post.created_at));
  return parts.join(' · ');
}

// ─── Helpers (JS-2: validated input) ──────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function stripHtmlAndTruncate(html, maxLength) {
  if (!html || typeof html !== 'string') return '';
  const plain = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, '') + '\u2026';
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Retry button
if ($retry) {
  $retry.addEventListener('click', () => {
    if ($newsList) $newsList.innerHTML = '';
    if ($blogList) $blogList.innerHTML = '';
    init();
  });
}
