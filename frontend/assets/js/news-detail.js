/**
 * News article detail page: fetch news article by slug, render back link,
 * header, external link breakout, summary, keywords, and SEO.
 *
 * @module news-detail
 */

import { getNewsArticleBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { requireNode } from "./utils/template-nodes.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { renderBadge } from "./utils/templates.js";
import { showToast } from "./utils/toasts.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────
// requireNode warns for an id the template dropped; the `if ($node)` guards below
// then keep the rest of the page rendering.

const $skeleton = requireNode("skeleton-state", "news-detail");
const $error = requireNode("error-state", "news-detail");
const $content = requireNode("news-content", "news-detail");
// Content regions
const $backLink = requireNode("news-back-link", "news-detail");
const $title = requireNode("page-h1", "news-detail");
const $meta = requireNode("news-meta", "news-detail");
const $sourceLink = requireNode("news-source-link", "news-detail");
const $externalLink = requireNode("news-external-link", "news-detail");
const $sourceName = requireNode("news-source-name", "news-detail");
const $summary = requireNode("news-summary", "news-detail");
const $keywordsSection = requireNode("news-keywords", "news-detail");
const $keywordsItems = requireNode("news-keywords-items", "news-detail");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /news-and-blog/news/{slug}
  // getSegment(0) = 'news-and-blog', getSegment(1) = 'news', getSegment(2) = slug
  const segment = getSegment(2);
  if (!segment) {
    showError("No news article specified.");
    return null;
  }
  return segment;
}

// ─── State helpers ───────────────────────────────────────────────────────────

function showSkeleton() {
  if ($skeleton) $skeleton.hidden = false;
  if ($error) $error.hidden = true;
  if ($content) $content.hidden = true;
}

function hideSkeleton() {
  if ($skeleton) $skeleton.hidden = true;
}

function showError(message) {
  hideSkeleton();
  if ($error) {
    $error.hidden = false;
    const msg = $error.querySelector(".error-state__message");
    if (msg) msg.textContent = message;
  }
  if ($content) $content.hidden = true;
}

function showContent() {
  hideSkeleton();
  if ($error) $error.hidden = true;
  if ($content) $content.hidden = false;
}

// ─── Render functions ────────────────────────────────────────────────────────

function renderHeader(article) {
  if ($title) $title.textContent = article.title || "Untitled";

  if ($meta) {
    const parts = [];
    if (article.publisher) parts.push(article.publisher);
    if (article.author) parts.push(article.author);

    const dateStr = article.published_at || article.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      parts.push(
        d.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    }

    $meta.textContent = parts.join(" · ");
  }
}

function renderExternalLink(article) {
  if (!article.url) {
    if ($sourceLink) $sourceLink.hidden = true;
    return;
  }

  if ($sourceLink) $sourceLink.hidden = false;

  if ($externalLink) {
    $externalLink.href = article.url;
  }

  if ($sourceName) {
    $sourceName.textContent =
      article.publisher || article.source_name || article.url;
  }
}

function renderSummary(article) {
  if ($summary) {
    if (article.summary || article.description) {
      $summary.textContent = article.summary || article.description;
      $summary.hidden = false;
    } else {
      $summary.hidden = true;
    }
  }
}

function renderKeywords(article) {
  if (
    !article.keywords ||
    !Array.isArray(article.keywords) ||
    article.keywords.length === 0
  ) {
    if ($keywordsSection) $keywordsSection.hidden = true;
    return;
  }

  if ($keywordsSection) $keywordsSection.hidden = false;

  if ($keywordsItems) {
    $keywordsItems.innerHTML = article.keywords
      .map((kw) => renderBadge(kw))
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(article) {
  const title = article.title
    ? `${article.title} — News — The Jesus Website`
    : "News Article — The Jesus Website";

  const description =
    article.summary || article.description
      ? truncateText(article.summary || article.description, 160)
      : "A curated news article from The Jesus Website.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.summary || article.description,
      datePublished: article.published_at || article.created_at,
      dateModified:
        article.updated_at || article.published_at || article.created_at,
      url: article.url || undefined,
      author: article.author
        ? { "@type": "Person", name: article.author }
        : undefined,
      publisher: article.publisher
        ? { "@type": "Organization", name: article.publisher }
        : undefined,
    },
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "\u2026";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function init() {
  const slug = getSlugFromUrl();
  if (!slug) return;

  showSkeleton();

  const { data, error } = await getNewsArticleBySlug(slug);

  if (error) {
    // The route sends E-PERSIST-004 for a missing slug. This page has no empty
    // state, so "not found" reuses the error state, without the failure toast.
    const is404 = typeof error === "object" && error.code === "E-PERSIST-004";
    if (is404) {
      showError("News article not found.");
    } else {
      showError("Failed to load this news article.");
      showToast("Failed to load news article", "error");
    }
    return;
  }

  if (!data) {
    showError("News article not found.");
    return;
  }

  renderHeader(data);
  renderExternalLink(data);
  renderSummary(data);
  renderKeywords(data);
  applySEO(data);
  showContent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
