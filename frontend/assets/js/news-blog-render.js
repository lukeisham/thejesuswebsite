/**
 * News & Blog render module — all DOM rendering functions.
 * Imports state and DOM refs from the data module. (JS-6: safe DOM)
 *
 * @module news-blog-render
 */

import { state, PAGE_SIZE, $newsList, $blogList, $hero, $newsSentinel, $blogSentinel, $newsEnd, $blogEnd } from './news-blog-data.js';
import { renderCard } from './utils/templates.js';

// ─── Hero promotion ────────────────────────────────────────────────────────────

/**
 * Render the first item with landing_page_display = 1 into the hero slot.
 * Returns the hero item so callers can exclude it from other lists. (JS-6)
 */
export function renderHeroPromotion() {
  const hero = state.allItems.find(
    (item) => item.landing_page_display === 1 || item.landing_page_display === true,
  );
  if (!hero || !$hero) return null;

  const typeLabel = hero._type === 'blog' ? 'Blog' : 'News';
  const url =
    hero._type === 'blog'
      ? `/news-and-blog/blog/${encodeURIComponent(hero.slug || '')}`
      : `/news-and-blog/news/${encodeURIComponent(hero.slug || '')}`;

  // (JS-6) renderCard returns SafeString — safe for innerHTML
  $hero.innerHTML = renderCard({
    title: hero.title || 'Untitled',
    description: hero.description || hero.summary || '',
    url,
    badges: [typeLabel],
  });

  $hero.hidden = false;
  state.heroItem = hero;
  return hero;
}

// ─── Visibility helpers (JS-2: defensive checks) ──────────────────────────────

export function getVisibleNewsItems() {
  if (!state.heroItem || state.heroItem._type !== 'news') return state.newsItems;
  return state.newsItems.filter((item) => item.slug !== state.heroItem.slug);
}

export function getVisibleBlogItems() {
  if (!state.heroItem || state.heroItem._type !== 'blog') return state.blogItems;
  return state.blogItems.filter((item) => item.slug !== state.heroItem.slug);
}

// ─── Paginated rendering ──────────────────────────────────────────────────────

export function renderNewsPage() {
  if (!$newsList || !state.hasMoreNews) return;

  const visible = getVisibleNewsItems();
  const start = (state.currentNewsPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  if (visible.length === 0 && state.currentNewsPage === 1) return;

  if (pageItems.length === 0) {
    state.hasMoreNews = false;
    if ($newsSentinel) $newsSentinel.hidden = true;
    if ($newsEnd) {
      $newsEnd.hidden = false;
      $newsEnd.textContent = `All ${visible.length} article${visible.length !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  renderCards($newsList, pageItems);

  if (start + pageItems.length >= visible.length) {
    state.hasMoreNews = false;
    if ($newsSentinel) $newsSentinel.hidden = true;
    if ($newsEnd) {
      $newsEnd.hidden = false;
      $newsEnd.textContent = `All ${visible.length} article${visible.length !== 1 ? 's' : ''} loaded`;
    }
  } else {
    state.currentNewsPage++;
    if ($newsSentinel) $newsSentinel.hidden = false;
    if (state.newsObserver && $newsSentinel) state.newsObserver.observe($newsSentinel);
  }
}

export function renderBlogPage() {
  if (!$blogList || !state.hasMoreBlog) return;

  const visible = getVisibleBlogItems();
  const start = (state.currentBlogPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(start, start + PAGE_SIZE);

  if (visible.length === 0 && state.currentBlogPage === 1) return;

  if (pageItems.length === 0) {
    state.hasMoreBlog = false;
    if ($blogSentinel) $blogSentinel.hidden = true;
    if ($blogEnd) {
      $blogEnd.hidden = false;
      $blogEnd.textContent = `All ${visible.length} post${visible.length !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  renderCards($blogList, pageItems);

  if (start + pageItems.length >= visible.length) {
    state.hasMoreBlog = false;
    if ($blogSentinel) $blogSentinel.hidden = true;
    if ($blogEnd) {
      $blogEnd.hidden = false;
      $blogEnd.textContent = `All ${visible.length} post${visible.length !== 1 ? 's' : ''} loaded`;
    }
  } else {
    state.currentBlogPage++;
    if ($blogSentinel) $blogSentinel.hidden = false;
    if (state.blogObserver && $blogSentinel) state.blogObserver.observe($blogSentinel);
  }
}

// ─── Card rendering (JS-6: SafeString → innerHTML only after renderCard escape) ─

export function renderCards($list, items) {
  if (!$list || !items.length) return;

  items.forEach((item) => {
    const isNews = item._type === 'news';
    const url = isNews
      ? item.external_url || `/news-and-blog/news/${encodeURIComponent(item.slug || '')}`
      : `/news-and-blog/blog/${encodeURIComponent(item.slug || '')}`;
    const date = item._date
      ? new Date(item._date).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    // (JS-6) renderCard escapes all values via SafeString
    const cardHTML = renderCard({
      title: item.title || 'Untitled',
      description: item.description || item.summary || '',
      url,
      badges: [isNews ? 'News' : 'Blog'],
    });

    const temp = document.createElement('div');
    temp.innerHTML = cardHTML;
    const cardEl = temp.firstElementChild;

    if (!cardEl) return;

    // News cards: open external URL in new tab (JS-6: setAttribute, not HTML)
    if (isNews && item.external_url && cardEl.tagName === 'A') {
      cardEl.setAttribute('target', '_blank');
      cardEl.setAttribute('rel', 'noopener noreferrer');
    }

    if (isNews) {
      // Side-by-side row: thumbnail on left, title + description on right
      restructureNewsCard(cardEl, item);
    }

    // Add date meta row (JS-6: textContent, not innerHTML)
    if (date) {
      const metaEl = document.createElement('p');
      metaEl.className = 'news-blog-card-meta';
      metaEl.textContent = date;
      cardEl.appendChild(metaEl);
    }

    $list.appendChild(cardEl);
  });
}

// ─── News card side-by-side layout (HTML-2: decorative thumbnails alt="") ──────

function restructureNewsCard(cardEl, item) {
  // Build thumbnail element
  const thumb = item.thumbnail
    ? buildThumbnailImg(item.thumbnail)
    : buildEmptyThumbnail();

  // Collect title and description from cardEl (created by renderCard above)
  const titleEl = cardEl.querySelector('.card-title');
  const descEl = cardEl.querySelector('.card-description');

  // Create body wrapper for title + description
  const body = document.createElement('div');
  body.className = 'news-card-body';
  if (titleEl) body.appendChild(titleEl);
  if (descEl) body.appendChild(descEl);

  // Create row wrapper: thumbnail | body
  const row = document.createElement('div');
  row.className = 'news-card-row';
  row.appendChild(thumb);
  row.appendChild(body);

  // Prepend row to card (badges and meta stay below the row)
  cardEl.insertBefore(row, cardEl.firstChild);
}

// ─── Thumbnail builders ────────────────────────────────────────────────────────

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

// Legacy exports for backward compatibility
export function prependThumbnail(cardEl, thumbnailPath) {
  cardEl.insertBefore(buildThumbnailImg(thumbnailPath), cardEl.firstChild);
}

export function prependEmptyThumbnail(cardEl) {
  cardEl.insertBefore(buildEmptyThumbnail(), cardEl.firstChild);
}
