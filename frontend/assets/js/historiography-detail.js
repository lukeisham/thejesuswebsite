/**
 * Historiography detail page: identical flow to essay-detail.js.
 * Fetches historiography article by slug, renders journal-article format,
 * and injects schema.org/ScholarlyArticle JSON-LD with additional `about` property.
 *
 * @module historiography-detail
 */

import { getHistoriographyBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { requireNode } from "./utils/template-nodes.js";
import { setSEO } from "./seo.js";
import { html, raw } from "./utils/templates.js";
import { renderBadge } from "./utils/templates.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import { parseContentBody } from "./utils/content-markers.js";
import { footnoteListHTML } from "./utils/footnotes.js";
import { formatMlaCitation } from "./utils/mla.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────
// requireNode warns for an id the template dropped; the `if ($node)` guards below
// then keep the rest of the page rendering.

const $skeleton = requireNode("skeleton-state", "historiography-detail");
const $error = requireNode("error-state", "historiography-detail");
const $empty = requireNode("empty-state", "historiography-detail");
const $content = requireNode("historiography-content", "historiography-detail");
const $h1 = requireNode("page-h1", "historiography-detail");
const $breadcrumbs = requireNode("breadcrumbs", "historiography-detail");

// Title block
const $title = requireNode("historiography-title", "historiography-detail");
const $author = requireNode("historiography-author", "historiography-detail");
const $authorBio = requireNode("historiography-author-bio", "historiography-detail");
const $date = requireNode("historiography-date", "historiography-detail");
const $doi = requireNode("historiography-doi", "historiography-detail");

// Abstract & keywords
const $abstract = requireNode("historiography-abstract", "historiography-detail");
const $abstractBody = requireNode("historiography-abstract-body", "historiography-detail");
const $keywords = requireNode("historiography-keywords", "historiography-detail");
const $keywordsList = requireNode("historiography-keywords-list", "historiography-detail");

// Body
const $body = requireNode("historiography-body", "historiography-detail");

// Footnotes & references
const $footnotes = requireNode("historiography-footnotes", "historiography-detail");
const $footnotesList = requireNode("historiography-footnotes-list", "historiography-detail");
const $references = requireNode("historiography-references", "historiography-detail");
const $referencesList = requireNode("historiography-references-list", "historiography-detail");

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

function renderBreadcrumbs(article) {
  if (!$breadcrumbs) return;

  $breadcrumbs.innerHTML = html`
    <span class="breadcrumb-item"><a href="/">Home</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item"
      ><a href="/debate/historiography/">Historiography</a></span
    >
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item current">${article.title}</span>
  `;
}

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
    footnotes: article.footnotes || [],
    citationStyle: "superscript",
    useMarkdown: true,
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
    // Runs after renderBody(), so the helper can find the rendered fnref ids.
    $footnotesList.innerHTML = footnoteListHTML(article.footnotes, $body);
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

  // Format each raw mla_sources row through the MLA formatter
  const citations = article.bibliography.map(formatMlaCitation).filter(Boolean);

  if (citations.length === 0) {
    if ($references) $references.hidden = true;
    return;
  }

  if ($references) $references.hidden = false;
  if ($referencesList) {
    $referencesList.innerHTML = citations
      .map((citation, i) => {
        const ref = article.bibliography[i];
        return ref && ref.id
          ? html`<li id="mla-${ref.id}">${raw(citation)}</li>`
          : html`<li>${raw(citation)}</li>`;
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
    const is404 =
      error === "Slug is required" ||
      (typeof error === "object" && error.code === "E-PERSIST-004");
    if (is404) {
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

  renderBreadcrumbs(data);
  renderTitleBlock(data);
  renderAbstract(data);
  renderKeywords(data);
  renderBody(data);
  renderFootnotes(data);
  renderBibliography(data);

  applySEO(data);

  if (data.two_column && $body) {
    $body.classList.add("journal-body--two-column");
  }

  showContent();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
