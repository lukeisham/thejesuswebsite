/**
 * Historiography detail page: identical flow to essay-detail.js.
 * Fetches historiography article by slug, renders journal-article format,
 * and injects schema.org/ScholarlyArticle JSON-LD with additional `about` property.
 *
 * @module historiography-detail
 */

import { getHistoriographyBySlug } from "./api.js";
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
const $content = document.getElementById("historiography-content");
const $h1 = document.getElementById("page-h1");

// Title block
const $title = document.getElementById("historiography-title");
const $author = document.getElementById("historiography-author");
const $authorBio = document.getElementById("historiography-author-bio");
const $date = document.getElementById("historiography-date");
const $doi = document.getElementById("historiography-doi");

// Abstract & keywords
const $abstract = document.getElementById("historiography-abstract");
const $abstractBody = document.getElementById("historiography-abstract-body");
const $keywords = document.getElementById("historiography-keywords");
const $keywordsList = document.getElementById("historiography-keywords-list");

// Body
const $body = document.getElementById("historiography-body");

// Footnotes & references
const $footnotes = document.getElementById("historiography-footnotes");
const $footnotesList = document.getElementById("historiography-footnotes-list");
const $references = document.getElementById("historiography-references");
const $referencesList = document.getElementById(
  "historiography-references-list",
);

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /debate/historiography/{slug}
  const segment = getSegment(2);
  if (!segment) {
    showError("No historiography article specified.");
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

function renderTitleBlock(article) {
  if ($title) $title.textContent = article.title || "Untitled Article";

  if ($author) {
    $author.textContent = article.author || "";
  }

  // Author bio (optional — Issue #2)
  if ($authorBio) {
    if (article.author_bio) {
      $authorBio.textContent = article.author_bio;
      $authorBio.hidden = false;
    } else {
      $authorBio.hidden = true;
    }
  }

  if ($date) {
    const dateStr = article.published_at || article.created_at;
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

  // DOI (optional — Issue #2)
  if ($doi) {
    if (article.doi) {
      $doi.textContent = `DOI: ${article.doi}`;
      $doi.hidden = false;
    } else {
      $doi.hidden = true;
    }
  }
}

function renderAbstract(article) {
  if (!article.abstract) {
    if ($abstract) $abstract.hidden = true;
    return;
  }
  if ($abstract) $abstract.hidden = false;
  if ($abstractBody) $abstractBody.textContent = article.abstract;
}

function renderKeywords(article) {
  if (
    !article.keywords ||
    !Array.isArray(article.keywords) ||
    article.keywords.length === 0
  ) {
    if ($keywords) $keywords.hidden = true;
    return;
  }
  if ($keywords) $keywords.hidden = false;
  if ($keywordsList) {
    $keywordsList.innerHTML = article.keywords
      .map((kw) => renderBadge(kw))
      .join("");
  }
}

function renderBody(article) {
  if (!$body) return;

  if (!article.body) {
    $body.innerHTML = "";
    return;
  }

  const htmlContent = parseContentBody(article.body, {
    mlaSources: article.mla_sources || [],
    identifiers: article.identifiers || [],
    citationStyle: "superscript",
  });
  $body.innerHTML = htmlContent;

  numberFigures($body);
}

function renderFootnotes(article) {
  if (
    !article.footnotes ||
    !Array.isArray(article.footnotes) ||
    article.footnotes.length === 0
  ) {
    if ($footnotes) $footnotes.hidden = true;
    return;
  }
  if ($footnotes) $footnotes.hidden = false;
  if ($footnotesList) {
    $footnotesList.innerHTML = article.footnotes
      .map((fn) => html`<li>${fn}</li>`)
      .join("");
  }
}

function renderBibliography(article) {
  if (
    !article.bibliography ||
    !Array.isArray(article.bibliography) ||
    article.bibliography.length === 0
  ) {
    if ($references) $references.hidden = true;
    return;
  }
  if ($references) $references.hidden = false;
  if ($referencesList) {
    $referencesList.innerHTML = article.bibliography
      .map((ref) => {
        const idAttr = ref && ref.id ? ` id="mla-${ref.id}"` : "";
        return `<li${idAttr}>${html`${ref}`}</li>`;
      })
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(article) {
  const title = article.title
    ? `${article.title} — Historiography — The Jesus Website`
    : "Historiography Article — The Jesus Website";

  const description = article.abstract
    ? truncateText(article.abstract, 160)
    : "A historiography article from The Jesus Website.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: article.title,
      description: article.abstract || article.description || undefined,
      about: {
        "@type": "Thing",
        name: "Historical Jesus",
      },
      datePublished: article.published_at || article.created_at,
      dateModified:
        article.updated_at || article.published_at || article.created_at,
      author: {
        "@type": "Person",
        name: article.author || "Luke Isham",
      },
      ...(article.keywords && article.keywords.length > 0
        ? { keywords: article.keywords.join(", ") }
        : {}),
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

  const { data, error } = await getHistoriographyBySlug(slug);

  if (error) {
    if (error === "Slug is required" || error.includes("not found")) {
      showEmpty();
    } else {
      showError("Failed to load this historiography article.");
      showToast("Failed to load article", "error");
    }
    return;
  }

  if (!data) {
    showEmpty();
    return;
  }

  if ($h1) $h1.textContent = data.title || "Historiography Article";

  renderTitleBlock(data);
  renderAbstract(data);
  renderKeywords(data);
  renderBody(data);
  renderFootnotes(data);
  renderBibliography(data);

  applySEO(data);

  if (data.two_column && $content) {
    $content.classList.add("two-column");
  }

  showContent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
