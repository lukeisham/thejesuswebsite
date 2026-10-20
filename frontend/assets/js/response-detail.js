/**
 * Response detail page: fetch response by slug, render journal-article format
 * with title block, "In response to:" challenge reference, strength indicator,
 * body, footnotes, and bibliography.
 *
 * @module response-detail
 */

import { getResponseBySlug } from "./api.js";
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
import { renderCreatedEditedLine } from "./utils/date-format.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────
// requireNode warns for an id the template dropped; the `if ($node)` guards below
// then keep the rest of the page rendering.

const $skeleton = requireNode("skeleton-state", "response-detail");
const $error = requireNode("error-state", "response-detail");
const $empty = requireNode("empty-state", "response-detail");
const $content = requireNode("response-content", "response-detail");
const $h1 = requireNode("page-h1", "response-detail");
const $breadcrumbs = requireNode("breadcrumbs", "response-detail");

// Title block
const $title = requireNode("response-title", "response-detail");
const $author = requireNode("response-author", "response-detail");
const $authorBio = requireNode("response-author-bio", "response-detail");
const $date = requireNode("response-date", "response-detail");
const $doi = requireNode("response-doi", "response-detail");

// Abstract & keywords
const $abstract = requireNode("response-abstract", "response-detail");
const $abstractBody = requireNode("response-abstract-body", "response-detail");
const $keywords = requireNode("response-keywords", "response-detail");
const $keywordsList = requireNode("response-keywords-list", "response-detail");

// Challenge reference
const $challengeRef = requireNode("response-challenge-ref", "response-detail");
const $challengeLink = requireNode("response-challenge-link", "response-detail");

// Strength indicator
const $strength = requireNode("response-strength", "response-detail");
const $strengthDots = requireNode("response-strength-dots", "response-detail");

// Body
const $body = requireNode("response-body", "response-detail");

// Footnotes & references
const $footnotes = requireNode("response-footnotes", "response-detail");
const $footnotesList = requireNode("response-footnotes-list", "response-detail");
const $references = requireNode("response-references", "response-detail");
const $referencesList = requireNode("response-references-list", "response-detail");

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

function renderBreadcrumbs(response) {
  if (!$breadcrumbs) return;

  $breadcrumbs.innerHTML = html`
    <span class="breadcrumb-item"><a href="/">Home</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item"><a href="/debate/">Debate</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item"
      ><a href="/debate/responses/">Responses</a></span
    >
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item current">${response.title}</span>
  `;
}

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
  const strength = response.strength;
  // The API CHECK keeps strength at 1 to 5 or null; anything else is a contract break.
  if (strength === null || strength === undefined) {
    if ($strength) $strength.hidden = true;
    return;
  }
  if (!Number.isInteger(strength) || strength < 1 || strength > 5) {
    console.warn("response-detail: ignoring strength outside 1-5:", strength);
    if ($strength) $strength.hidden = true;
    return;
  }
  if ($strength) $strength.hidden = false;

  if ($strengthDots) {
    const maxDots = 5;
    let dotsHTML = "";
    for (let i = 1; i <= maxDots; i++) {
      const filledClass = i <= strength ? "filled" : "";
      dotsHTML += `<span class="strength-dot ${filledClass}"></span>`;
    }
    $strengthDots.innerHTML = dotsHTML;
    // Colour alone shows the value, so give the dots a text name (WCAG 1.4.1).
    $strengthDots.setAttribute("role", "img");
    $strengthDots.setAttribute(
      "aria-label",
      `Strength of response: ${strength} of ${maxDots}`,
    );
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
    footnotes: response.footnotes || [],
    citationStyle: "superscript",
    useMarkdown: true,
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
    // Runs after renderBody(), so the helper can find the rendered fnref ids.
    $footnotesList.innerHTML = footnoteListHTML(response.footnotes, $body);
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
        return ref && ref.id
          ? html`<li id="mla-${ref.id}">${raw(citation)}</li>`
          : html`<li>${raw(citation)}</li>`;
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
    const is404 =
      error === "Slug is required" ||
      (typeof error === "object" && error.code === "E-PERSIST-004");
    if (is404) {
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

  renderBreadcrumbs(data);
  renderTitleBlock(data);
  renderAbstract(data);
  renderKeywords(data);
  renderChallengeReference(data);
  renderStrengthIndicator(data);
  renderBody(data);
  renderFootnotes(data);
  renderBibliography(data);
  renderCreatedEditedLine(data.created_at, data.updated_at);

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
