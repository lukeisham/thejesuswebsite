/**
 * Blog post detail page: fetch blog post by slug, render header,
 * body, pull quotes, figures, bibliography, and SEO JSON-LD.
 *
 * @module blog-detail
 */

import { getBlogPostBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { requireNode } from "./utils/template-nodes.js";
import { setSEO } from "./seo.js";
import { html, raw } from "./utils/templates.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import { parseContentBody } from "./utils/content-markers.js";
import { formatMlaCitation } from "./utils/mla.js";
import { renderCreatedEditedLine } from "./utils/date-format.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────
// requireNode warns for an id the template dropped; the `if ($node)` guards below
// then keep the rest of the page rendering.

const $skeleton = requireNode("skeleton-state", "blog-detail");
const $error = requireNode("error-state", "blog-detail");
const $empty = requireNode("empty-state", "blog-detail");
const $content = requireNode("blog-content", "blog-detail");
const $breadcrumbs = requireNode("breadcrumbs", "blog-detail");
const $title = requireNode("page-h1", "blog-detail");
const $date = requireNode("blog-date", "blog-detail");
const $body = requireNode("blog-body", "blog-detail");

const $bibList = requireNode("blog-bibliography-list", "blog-detail");
const $bibSection = requireNode("blog-bibliography", "blog-detail");

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

function renderBreadcrumbs(post) {
  if (!$breadcrumbs) return;

  $breadcrumbs.innerHTML = html`
    <span class="breadcrumb-item"><a href="/">Home</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item"
      ><a href="/news-and-blog/">News &amp; Blog</a></span
    >
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item current">${post.blog_title}</span>
  `;
}

function renderHeader(post) {
  if ($title) $title.textContent = post.blog_title || "Untitled";

  if ($date) {
    const dateStr = post.blog_date || post.published_at || post.created_at;
    if (dateStr) {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) {
        console.warn("blog-detail renderHeader: unparseable date", dateStr);
        $date.textContent = "";
      } else {
        $date.textContent = d.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        $date.setAttribute("datetime", dateStr);
      }
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

  // useMarkdown must stay on: parseContentBody skips its own pull-quote
  // escape because renderMarkdown() has already escaped it.
  const htmlContent = parseContentBody(post.blog_content, {
    mlaSources: post.mla_sources || [],
    identifiers: post.identifiers || [],
    citationStyle: "parenthetical",
    pullQuotes: true,
    useMarkdown: true,
  });
  $body.innerHTML = htmlContent;

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
        // formatMlaCitation already escapes each field and returns trusted markup,
        // so it is inserted with raw(); wrapping it in html`` would escape it twice.
        return html`<li id="mla-${source.id}">${raw(citation)}</li>`;
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
    const is404 = typeof error === "object" && error.code === "E-PERSIST-004";
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

  try {
    renderBreadcrumbs(data);
    renderHeader(data);
    renderBody(data);
    renderBibliography(data);
    renderCreatedEditedLine(data.created_at, data.updated_at);
    applySEO(data);
    showContent();
  } catch (err) {
    console.error(`blog-detail init: failed to render "${slug}"`, err);
    showError("Failed to display this blog post.");
    showToast("Failed to display blog post", "error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
