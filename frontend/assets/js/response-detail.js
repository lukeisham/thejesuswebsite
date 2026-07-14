/**
 * Response detail page: fetch response by slug, render journal-article format
 * with title block, "In response to:" challenge reference, strength indicator,
 * body, footnotes, and bibliography.
 *
 * @module response-detail
 */

import { getResponseBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { renderBadge } from "./utils/templates.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import { parseContentBody } from "./utils/content-markers.js";
import { formatMlaCitation } from "./utils/mla.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $empty = document.getElementById("empty-state");
const $content = document.getElementById("response-content");
const $h1 = document.getElementById("page-h1");

// Title block
const $title = document.getElementById("response-title");
const $author = document.getElementById("response-author");
const $authorBio = document.getElementById("response-author-bio");
const $date = document.getElementById("response-date");
const $doi = document.getElementById("response-doi");

// Abstract & keywords
const $abstract = document.getElementById("response-abstract");
const $abstractBody = document.getElementById("response-abstract-body");
const $keywords = document.getElementById("response-keywords");
const $keywordsList = document.getElementById("response-keywords-list");

// Challenge reference
const $challengeRef = document.getElementById("response-challenge-ref");
const $challengeLink = document.getElementById("response-challenge-link");

// Strength indicator
const $strength = document.getElementById("response-strength");
const $strengthDots = document.getElementById("response-strength-dots");

// Body
const $body = document.getElementById("response-body");

// Footnotes & references
const $footnotes = document.getElementById("response-footnotes");
const $footnotesList = document.getElementById("response-footnotes-list");
const $references = document.getElementById("response-references");
const $referencesList = document.getElementById("response-references-list");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /debate/responses/{slug}
  const segment = getSegment(2);
  if (!segment) {
    showError("No response specified.");
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

function renderTitleBlock(response) {
  if ($title) $title.textContent = response.title || "Untitled Response";

  if ($author) {
    $author.textContent = response.author || "";
  }

  if ($authorBio) {
    if (response.author_bio) {
      $authorBio.textContent = response.author_bio;
      $authorBio.hidden = false;
    } else {
      $authorBio.hidden = true;
    }
  }

  if ($date) {
    const dateStr = response.published_at || response.created_at;
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

  if ($doi) {
    if (response.doi) {
      $doi.textContent = `DOI: ${response.doi}`;
      $doi.hidden = false;
    } else {
      $doi.hidden = true;
    }
  }
}

function renderAbstract(response) {
  if (!response.abstract) {
    if ($abstract) $abstract.hidden = true;
    return;
  }
  if ($abstract) $abstract.hidden = false;
  if ($abstractBody) $abstractBody.textContent = response.abstract;
}

function renderKeywords(response) {
  if (
    !response.keywords ||
    !Array.isArray(response.keywords) ||
    response.keywords.length === 0
  ) {
    if ($keywords) $keywords.hidden = true;
    return;
  }
  if ($keywords) $keywords.hidden = false;
  if ($keywordsList) {
    $keywordsList.innerHTML = response.keywords
      .map((kw) => renderBadge(kw))
      .join("");
  }
}

function renderChallengeReference(response) {
  if (!response.challenge_title) {
    if ($challengeRef) $challengeRef.hidden = true;
    return;
  }
  if ($challengeRef) $challengeRef.hidden = false;

  if ($challengeLink) {
    const challengeUrl =
      response.challenge_type === "academic"
        ? `/debate/academic-challenges/${encodeURIComponent(response.challenge_slug || "")}`
        : `/debate/popular-challenges/${encodeURIComponent(response.challenge_slug || "")}`;

    $challengeLink.href = challengeUrl;
    $challengeLink.textContent = response.challenge_title;
  }
}

function renderStrengthIndicator(response) {
  if (!response.strength || typeof response.strength !== "number") {
    if ($strength) $strength.hidden = true;
    return;
  }
  if ($strength) $strength.hidden = false;

  if ($strengthDots) {
    const maxDots = 5;
    let dotsHTML = "";
    for (let i = 1; i <= maxDots; i++) {
      const filledClass = i <= response.strength ? "filled" : "";
      dotsHTML += `<span class="strength-dot ${filledClass}"></span>`;
    }
    $strengthDots.innerHTML = dotsHTML;
  }
}

function renderBody(response) {
  if (!$body) return;

  if (!response.body) {
    $body.innerHTML = "";
    return;
  }

  const htmlContent = parseContentBody(response.body, {
    mlaSources: response.mla_sources || [],
    identifiers: response.identifiers || [],
    citationStyle: "superscript",
  });
  $body.innerHTML = htmlContent;

  numberFigures($body);
}

function renderFootnotes(response) {
  if (
    !response.footnotes ||
    !Array.isArray(response.footnotes) ||
    response.footnotes.length === 0
  ) {
    if ($footnotes) $footnotes.hidden = true;
    return;
  }
  if ($footnotes) $footnotes.hidden = false;
  if ($footnotesList) {
    $footnotesList.innerHTML = response.footnotes
      .map((fn) => html`<li>${fn}</li>`)
      .join("");
  }
}

function renderBibliography(response) {
  if (
    !response.bibliography ||
    !Array.isArray(response.bibliography) ||
    response.bibliography.length === 0
  ) {
    if ($references) $references.hidden = true;
    return;
  }

  const citations = response.bibliography
    .map(formatMlaCitation)
    .filter(Boolean);

  if (citations.length === 0) {
    if ($references) $references.hidden = true;
    return;
  }

  if ($references) $references.hidden = false;
  if ($referencesList) {
    $referencesList.innerHTML = citations
      .map((citation, i) => {
        const ref = response.bibliography[i];
        const idAttr = ref && ref.id ? ` id="mla-${ref.id}"` : "";
        return `<li${idAttr}>${citation}</li>`;
      })
      .join("");
  }
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(response) {
  const title = response.title
    ? `${response.title} — Response — The Jesus Website`
    : "Response — The Jesus Website";

  const description = response.abstract
    ? truncateText(response.abstract, 160)
    : "A scholarly response from The Jesus Website.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: response.title,
      description: response.abstract || response.description || undefined,
      datePublished: response.published_at || response.created_at,
      dateModified:
        response.updated_at || response.published_at || response.created_at,
      author: {
        "@type": "Person",
        name: response.author || "Luke Isham",
      },
      ...(response.keywords && response.keywords.length > 0
        ? { keywords: response.keywords.join(", ") }
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

  const { data, error } = await getResponseBySlug(slug);

  if (error) {
    if (error === "Slug is required" || error.includes("not found")) {
      showEmpty();
    } else {
      showError("Failed to load this response.");
      showToast("Failed to load response", "error");
    }
    return;
  }

  if (!data) {
    showEmpty();
    return;
  }

  if ($h1) $h1.textContent = data.title || "Response";

  renderTitleBlock(data);
  renderAbstract(data);
  renderKeywords(data);
  renderChallengeReference(data);
  renderStrengthIndicator(data);
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
