/**
 * Essay detail page: fetch essay by slug, render journal-article format
 * with title block, abstract, keywords, body, footnotes, bibliography,
 * and schema.org/ScholarlyArticle JSON-LD.
 *
 * @module essay-detail
 */

import { getEssayBySlug } from "./api.js";
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
const $content = document.getElementById("essay-content");
const $h1 = document.getElementById("page-h1");

// Title block
const $titleBlock = document.getElementById("essay-title-block");
const $title = document.getElementById("essay-title");
const $author = document.getElementById("essay-author");
const $authorBio = document.getElementById("essay-author-bio");
const $date = document.getElementById("essay-date");
const $doi = document.getElementById("essay-doi");

// Abstract & keywords
const $abstract = document.getElementById("essay-abstract");
const $abstractBody = document.getElementById("essay-abstract-body");
const $keywords = document.getElementById("essay-keywords");
const $keywordsList = document.getElementById("essay-keywords-list");

// Body
const $body = document.getElementById("essay-body");

// Footnotes & references
const $footnotes = document.getElementById("essay-footnotes");
const $footnotesList = document.getElementById("essay-footnotes-list");
const $references = document.getElementById("essay-references");
const $referencesList = document.getElementById("essay-references-list");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /contextual-essays/{slug}
  const segment = getSegment(1);
  if (!segment) {
    showError("No essay specified.");
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

function renderTitleBlock(essay) {
  if ($title) $title.textContent = essay.title || "Untitled Essay";

  // Author
  if ($author) {
    if (essay.author) {
      $author.textContent = essay.author;
    } else {
      $author.textContent = "";
    }
  }

  // Author bio (optional — Issue #2)
  if ($authorBio) {
    if (essay.author_bio) {
      $authorBio.textContent = essay.author_bio;
      $authorBio.hidden = false;
    } else {
      $authorBio.hidden = true;
    }
  }

  // Publication date
  if ($date) {
    const dateStr = essay.published_at || essay.created_at;
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
    if (essay.doi) {
      $doi.textContent = `DOI: ${essay.doi}`;
      $doi.hidden = false;
    } else {
      $doi.hidden = true;
    }
  }
}

function renderAbstract(essay) {
  if (!essay.abstract) {
    if ($abstract) $abstract.hidden = true;
    return;
  }
  if ($abstract) $abstract.hidden = false;
  if ($abstractBody) $abstractBody.textContent = essay.abstract;
}

function renderKeywords(essay) {
  if (
    !essay.keywords ||
    !Array.isArray(essay.keywords) ||
    essay.keywords.length === 0
  ) {
    if ($keywords) $keywords.hidden = true;
    return;
  }
  if ($keywords) $keywords.hidden = false;
  if ($keywordsList) {
    $keywordsList.innerHTML = essay.keywords
      .map((kw) => renderBadge(kw))
      .join("");
  }
}

function renderBody(essay) {
  if (!$body) return;

  if (!essay.body) {
    $body.innerHTML = "";
    return;
  }

  const htmlContent = parseContentBody(essay.body, {
    mlaSources: essay.mla_sources || [],
    identifiers: essay.identifiers || [],
    citationStyle: "superscript",
  });
  $body.innerHTML = htmlContent;

  numberFigures($body);
}

function renderFootnotes(essay) {
  if (
    !essay.footnotes ||
    !Array.isArray(essay.footnotes) ||
    essay.footnotes.length === 0
  ) {
    if ($footnotes) $footnotes.hidden = true;
    return;
  }
  if ($footnotes) $footnotes.hidden = false;
  if ($footnotesList) {
    $footnotesList.innerHTML = essay.footnotes
      .map((fn) => html`<li>${fn}</li>`)
      .join("");
  }
}

function renderBibliography(essay) {
  if (
    !essay.bibliography ||
    !Array.isArray(essay.bibliography) ||
    essay.bibliography.length === 0
  ) {
    if ($references) $references.hidden = true;
    return;
  }
  if ($references) $references.hidden = false;
  if ($referencesList) {
    $referencesList.innerHTML = essay.bibliography
      .map((ref) => {
        const idAttr = ref && ref.id ? ` id="mla-${ref.id}"` : "";
        return `<li${idAttr}>${html`${ref}`}</li>`;
      })
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(essay) {
  const title = essay.title
    ? `${essay.title} — Contextual Essays — The Jesus Website`
    : "Essay — The Jesus Website";

  const description = essay.abstract
    ? truncateText(essay.abstract, 160)
    : "A contextual essay from The Jesus Website.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: essay.title,
      description: essay.abstract || essay.description || undefined,
      datePublished: essay.published_at || essay.created_at,
      dateModified: essay.updated_at || essay.published_at || essay.created_at,
      author: {
        "@type": "Person",
        name: essay.author || "Luke Isham",
      },
      ...(essay.keywords && essay.keywords.length > 0
        ? { keywords: essay.keywords.join(", ") }
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

  const { data, error } = await getEssayBySlug(slug);

  if (error) {
    if (error === "Slug is required" || error.includes("not found")) {
      showEmpty();
    } else {
      showError("Failed to load this essay.");
      showToast("Failed to load essay", "error");
    }
    return;
  }

  if (!data) {
    showEmpty();
    return;
  }

  // Update hidden h1
  if ($h1) $h1.textContent = data.title || "Essay";

  // Render all sections
  renderTitleBlock(data);
  renderAbstract(data);
  renderKeywords(data);
  renderBody(data);
  renderFootnotes(data);
  renderBibliography(data);

  // Apply SEO metadata
  applySEO(data);

  // Two-column layout flag (optional — Issue #2)
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
