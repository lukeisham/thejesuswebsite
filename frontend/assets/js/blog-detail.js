/**
 * Blog post detail page: fetch blog post by slug, render header,
 * body, pull quotes, figures, tags, further reading, and SEO JSON-LD.
 *
 * @module blog-detail
 */

import { getBlogPostBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { renderBadge } from "./utils/templates.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import { parseContentBody } from "./utils/content-markers.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $empty = document.getElementById("empty-state");
const $content = document.getElementById("blog-content");
// Content regions
const $category = document.getElementById("blog-category");
const $title = document.getElementById("page-h1");
const $avatar = document.getElementById("blog-avatar");
const $author = document.getElementById("blog-author");
const $date = document.getElementById("blog-date");
const $hero = document.getElementById("blog-hero");
const $body = document.getElementById("blog-body");
const $furtherReading = document.getElementById("blog-further-reading");
const $sourcesList = document.getElementById("blog-sources-list");
const $tags = document.getElementById("blog-tags");
const $tagsItems = document.getElementById("blog-tags-items");

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
  // Category badge
  if ($category && post.category) {
    $category.innerHTML = renderBadge(post.category);
  } else if ($category) {
    $category.innerHTML = "";
  }

  // Title
  if ($title) $title.textContent = post.title || "Untitled";

  // Byline row
  if ($author) $author.textContent = post.author || "";
  if ($avatar) {
    if (post.author_avatar) {
      $avatar.src = post.author_avatar;
      $avatar.alt = post.author || "Author";
    } else {
      $avatar.hidden = true;
    }
  }

  if ($date) {
    const dateStr = post.published_at || post.created_at;
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

  // Hero image
  if ($hero) {
    if (post.hero_image) {
      $hero.src = post.hero_image;
      $hero.alt = post.hero_image_alt || post.title || "";
      $hero.hidden = false;
    } else {
      $hero.hidden = true;
    }
  }
}

function renderBody(post) {
  if (!$body) return;

  if (!post.body) {
    $body.innerHTML = "";
    return;
  }

  // Parse body content — handle paragraphs, pull quotes, figures, and inline MLA citations (parenthetical for blogs)
  const htmlContent = parseContentBody(post.body, {
    mlaSources: post.mla_sources || [],
    identifiers: post.identifiers || [],
    citationStyle: "parenthetical",
    pullQuotes: true,
  });
  $body.innerHTML = htmlContent;

  // Number figures in the body
  numberFigures($body);
}

function renderFurtherReading(post) {
  if (
    !post.sources ||
    !Array.isArray(post.sources) ||
    post.sources.length === 0
  ) {
    if ($furtherReading) $furtherReading.hidden = true;
    return;
  }

  if ($furtherReading) $furtherReading.hidden = false;

  if ($sourcesList) {
    $sourcesList.innerHTML = post.sources
      .map((src) => {
        const label =
          src.title || src.label || src.citation || "Untitled source";
        if (src.url) {
          return html`<li>
            <a href="${src.url}" target="_blank" rel="noopener noreferrer"
              >${label}</a
            >
          </li>`;
        }
        return html`<li>${label}</li>`;
      })
      .join("");
  }
}

function renderTags(post) {
  if (!post.tags || !Array.isArray(post.tags) || post.tags.length === 0) {
    if ($tags) $tags.hidden = true;
    return;
  }

  if ($tags) $tags.hidden = false;

  if ($tagsItems) {
    $tagsItems.innerHTML = post.tags.map((tag) => renderBadge(tag)).join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(post) {
  const title = post.title
    ? `${post.title} — Blog — The Jesus Website`
    : "Blog Post — The Jesus Website";

  const description = post.description
    ? truncateText(post.description, 160)
    : "A blog post from The Jesus Website.";

  const ogImage = post.hero_image || undefined;

  setSEO({
    title,
    description,
    ogImage,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: post.hero_image || undefined,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      author: {
        "@type": "Person",
        name: post.author || "Luke Isham",
      },
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

  const { data, error } = await getBlogPostBySlug(slug);

  if (error) {
    if (error === "Slug is required" || error.includes("not found")) {
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
  renderFurtherReading(data);
  renderTags(data);

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
