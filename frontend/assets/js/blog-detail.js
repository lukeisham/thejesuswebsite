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

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $empty = document.getElementById("empty-state");
const $content = document.getElementById("blog-content");
const $h1 = document.getElementById("page-h1");

// Content regions
const $category = document.getElementById("blog-category");
const $title = document.getElementById("blog-title");
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

  // Parse body content — handle paragraphs, pull quotes, and figures
  const htmlContent = parseBlogBody(post.body);
  $body.innerHTML = htmlContent;

  // Number figures in the body
  numberFigures($body);
}

/**
 * Parse blog body into HTML. Converts double-newlines to paragraphs,
 * wraps [pullquote]...[/pullquote] in pull-quote divs, and handles
 * [figure src="..." caption="..."] blocks.
 */
function parseBlogBody(text) {
  if (typeof text !== "string") return "";

  // Process shortcodes on raw text BEFORE escaping, so the regex finds
  // un-escaped delimiters like src="..." and caption="...".
  // The shortcode content is escaped inline; surrounding prose is escaped later.

  // Convert pullquote blocks: [pullquote]...[/pullquote] → <aside class="pull-quote">...</aside>
  let processed = text.replace(
    /\[pullquote\]([\s\S]*?)\[\/pullquote\]/g,
    (_, content) =>
      `<aside class="pull-quote">${escapeHTML(content.trim())}</aside>`,
  );

  // Convert figure blocks: [figure src="..." caption="..."]
  processed = processed.replace(
    /\[figure\s+src="([^"]*)"(?:\s+caption="([^"]*)")?\]/g,
    (_, src, caption) => {
      const cap = caption
        ? `<figcaption>${escapeHTML(caption)}</figcaption>`
        : "";
      return `<figure><img src="${src}" alt="${escapeHTML(caption || "")}" loading="lazy">${cap}</figure>`;
    },
  );

  // Split by double newlines into paragraphs
  const paragraphs = processed.split(/\n\n+/).filter((p) => p.trim());

  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      // Skip if already wrapped in a block element
      if (trimmed.startsWith("<aside") || trimmed.startsWith("<figure")) {
        return trimmed;
      }
      // Escape remaining prose and convert single newlines to <br>
      return `<p>${escapeHTML(trimmed).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
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

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

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

  // Update hidden h1
  if ($h1) $h1.textContent = data.title || "Blog Post";

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
