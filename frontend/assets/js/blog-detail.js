/**
 * Blog post detail page: fetch blog post by slug, render header,
 * body, pull quotes, figures, bibliography, and SEO JSON-LD.
 *
 * @module blog-detail
 */

import { getBlogPostBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import { parseContentBody } from "./utils/content-markers.js";
import { formatMlaCitation } from "./utils/mla.js";
import { renderMarkdown } from "./utils/markdown.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $empty = document.getElementById("empty-state");
const $content = document.getElementById("blog-content");
// Content regions
const $title = document.getElementById("page-h1");
const $date = document.getElementById("blog-date");
const $body = document.getElementById("blog-body");

const $bibList = document.getElementById("blog-bibliography-list");
const $bibSection = document.getElementById("blog-bibliography");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /news-and-blog/blog/{slug}
  // getSegment(0) = 'news-and-blog', getSegment(1) = 'blog', getSegment(2) = slug
  const segment = getSegment(2);
  if (!segment) {
    showError("No blog post specified.");
    return null;
  }
  return segment;
}

// ─── State helpers ───────────────────────────────────────────────────────────

function showSkeleton() {
  if ($skeleton) $skeleton.hidden = false;
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = true;
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
  if ($empty) $empty.hidden = true;
  if ($content) $content.hidden = true;
}

function showEmpty() {
  hideSkeleton();
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = false;
  if ($content) $content.hidden = true;
}

function showContent() {
  hideSkeleton();
  if ($error) $error.hidden = true;
  if ($empty) $empty.hidden = true;
  if ($content) $content.hidden = false;
}

// ─── Render functions ────────────────────────────────────────────────────────

function renderHeader(post) {
  // Title
  if ($title) $title.textContent = post.blog_title || "Untitled";

  // Date
  if ($date) {
    const dateStr = post.blog_date || post.published_at || post.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      $date.textContent = d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      $date.setAttribute("datetime", dateStr);
    } else {
      $date.textContent = "";
    }
  }
}

function renderBody(post) {
  if (!$body) return;

  if (!post.blog_content) {
    $body.innerHTML = "";
    return;
  }

  // Step 1: Parse markdown (headings, bold, italic, lists, tables) into HTML
  const markdownHtml = renderMarkdown(post.blog_content);

  // Step 2: Parse shortcode markers ([figure], [mla:N], [pullquote]) on top
  const htmlContent = parseContentBody(markdownHtml, {
    mlaSources: post.mla_sources || [],
    identifiers: post.identifiers || [],
    citationStyle: "parenthetical",
    pullQuotes: true,
  });
  $body.innerHTML = htmlContent;

  // Number figures in the body
  numberFigures($body);
}

/**
 * Render the bibliography list from mla_sources using formatMlaCitation.
 * Mirrors essay-detail.js / historiography-detail.js pattern.
 */
function renderBibliography(post) {
  if (
    !post.mla_sources ||
    !Array.isArray(post.mla_sources) ||
    post.mla_sources.length === 0
  ) {
    if ($bibSection) $bibSection.hidden = true;
    return;
  }

  if ($bibSection) $bibSection.hidden = false;

  if ($bibList) {
    $bibList.innerHTML = post.mla_sources
      .map(function (source) {
        const citation = formatMlaCitation(source);
        if (!citation) return "";
        return html`<li id="mla-${source.id}">${citation}</li>`;
      })
      .filter(Boolean)
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(post) {
  const title = post.blog_title
    ? `${post.blog_title} — Blog — The Jesus Website`
    : "Blog Post — The Jesus Website";

  const description = post.metadata_keywords
    ? truncateText(post.metadata_keywords, 160)
    : "A blog post from The Jesus Website.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.blog_title,
      description: post.metadata_keywords || undefined,
      datePublished: post.blog_date || post.published_at || post.created_at,
      dateModified: post.updated_at || post.blog_date || post.published_at || post.created_at,
    },
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function truncateText(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "\u2026";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function init() {
  const slug = getSlugFromUrl();
  if (!slug) return;

  showSkeleton();

  const { data, error } = await getBlogPostBySlug(slug);

  if (error) {
    const is404 =
      error === "Slug is required" ||
      (typeof error === "object" && error.code === "E-PERSIST-004");
    if (is404) {
      showEmpty();
    } else {
      showError("Failed to load this blog post.");
      showToast("Failed to load blog post", "error");
    }
    return;
  }

  if (!data) {
    showEmpty();
    return;
  }

  // Render all sections
  renderHeader(data);
  renderBody(data);
  renderBibliography(data);

    // Apply SEO metadata
  applySEO(data);

  // Show content
  showContent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
