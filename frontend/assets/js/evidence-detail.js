/**
 * Evidence detail single-page: read slug, fetch full record, render all sections.
 *
 * @module evidence-detail
 */

import { getEvidenceBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { formatDate, formatVerse } from "./utils/format.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";
import {
  parseContentBody,
  getIdentifierLabel,
} from "./utils/content-markers.js";

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $skeleton = document.getElementById("skeleton-state");
const $error = document.getElementById("error-state");
const $content = document.getElementById("evidence-content");
const $h1 = document.getElementById("page-h1");
const $breadcrumbs = document.getElementById("breadcrumbs");

// Content regions
const $title = document.getElementById("evidence-title");
const $verse = document.getElementById("evidence-verse");
const $desc = document.getElementById("evidence-description");
const $descSection = document.getElementById("evidence-description-section");
const $sources = document.getElementById("evidence-sources");
const $sourcesSection = document.getElementById("evidence-sources-section");

// Pictures
const $picturesSection = document.getElementById("evidence-pictures-section");
const $pictures = document.getElementById("evidence-pictures");

// Dates
const $dates = document.getElementById("evidence-dates");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /evidence/{slug}
  // getSegment(0) = 'evidence', getSegment(1) = slug
  const segment = getSegment(1);
  if (!segment) {
    showError("No evidence item specified.");
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

function renderBreadcrumbs(item) {
  if (!$breadcrumbs) return;

  $breadcrumbs.innerHTML = html`
    <a href="/">Home</a>
    <span class="breadcrumbs__sep">/</span>
    <a href="/evidence/">Evidence</a>
    <span class="breadcrumbs__sep">/</span>
    <span class="breadcrumbs__current">${item.title}</span>
  `;
}

function renderHero(item) {
  if ($title) $title.textContent = item.title || "Untitled";

  if ($verse && item.primary_verse) {
    const verseText = formatVerse(item.primary_verse);
    $verse.innerHTML = html`
      <p>${verseText}</p>
      ${item.secondary_verse
        ? html`<p>${formatVerse(item.secondary_verse)}</p>`
        : ""}
    `;
    $verse.hidden = false;
  } else if ($verse) {
    $verse.hidden = true;
  }
}

function renderDescription(item) {
  if (!item.description) {
    if ($descSection) $descSection.hidden = true;
    return;
  }
  if ($descSection) $descSection.hidden = false;
  if ($desc) {
    $desc.innerHTML = parseContentBody(item.description, {
      mlaSources: item.mla_sources || [],
      identifiers: item.identifiers || [],
      citationStyle: "superscript",
    });
    numberFigures($desc);
  }
}

function renderPictures(description) {
  // Pictures are now [figure] shortcodes in body text (migration 006 dropped
  // evidence_pictures). Extract them from the description for the dedicated
  // pictures section, and return the cleaned description for renderDescription.
  if (!$picturesSection || !$pictures) return description || "";

  const figureRegex =
    /\[figure\s+src="([^"]*)"(?:\s+caption="([^"]*)")?(?:\s+align="(left|right)")?\]/g;
  const figures = [];
  let cleaned = description || "";

  let match;
  while ((match = figureRegex.exec(description || "")) !== null) {
    figures.push({ src: match[1], caption: match[2] || "" });
  }

  if (figures.length === 0) {
    $picturesSection.hidden = true;
    return cleaned;
  }

  $picturesSection.hidden = false;

  const itemsHTML = figures
    .map((fig) => {
      const alt = fig.caption ? html`${fig.caption}` : "";
      return `<figure>
        <img src="${html`${fig.src}`}" alt="${alt}" loading="lazy" />
        ${fig.caption ? `<figcaption>${html`${fig.caption}`}</figcaption>` : ""}
      </figure>`;
    })
    .join("");

  $pictures.innerHTML = itemsHTML;
  numberFigures($pictures);

  // Strip [figure] shortcodes from the description so renderDescription only
  // processes prose + inline markers (mla/id).
  cleaned = cleaned
    .replace(figureRegex, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

function renderDates(item) {
  if (!$dates) return;
  const created = item.created_at ? formatDate(item.created_at) : null;
  const modified =
    item.updated_at && item.updated_at !== item.created_at
      ? formatDate(item.updated_at)
      : null;

  if (!created) {
    $dates.hidden = true;
    return;
  }

  const parts = [html`Created ${created}`];
  if (modified) {
    parts.push(html` · Modified ${modified}`);
  }
  $dates.innerHTML = parts.join("");
}

function renderSources(mlaSources) {
  if (!mlaSources || mlaSources.length === 0) {
    if ($sourcesSection) $sourcesSection.hidden = true;
    return;
  }

  if ($sourcesSection) $sourcesSection.hidden = false;

  const itemsHTML = mlaSources
    .map((src) => {
      const label =
        src.citation ||
        src.title ||
        src.mla_book_title ||
        src.mla_website_title ||
        src.mla_journal_article_title ||
        "Untitled source";
      if (src && src.id) {
        return `<li class="source-list__item" id="mla-${src.id}">${html`${label}`}</li>`;
      }
      return html`<li class="source-list__item">${label}</li>`;
    })
    .join("");

  if ($sources) $sources.innerHTML = itemsHTML;
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

function applySEO(item) {
  const title = item.title
    ? `${item.title} — Evidence — The Jesus Website`
    : "Evidence Detail — The Jesus Website";

  const description = item.description
    ? truncateText(item.description, 160)
    : "Historical evidence for Jesus of Nazareth.";

  setSEO({
    title,
    description,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: item.title,
      description: item.description,
      dateCreated: item.created_at,
      dateModified: item.updated_at || item.created_at,
      author: {
        "@type": "Person",
        name: "Luke Isham",
      },
    },
  });
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "…";
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function init() {
  const slug = getSlugFromUrl();
  if (!slug) return;

  showSkeleton();

  const { data, error } = await getEvidenceBySlug(slug);

  if (error) {
    const is404 =
      error === "Slug is required" ||
      (typeof error === "object" && error.code === "E-PERSIST-004");
    if (error === "Slug is required") {
      showError("No evidence item specified.");
    } else if (is404) {
      showError("Evidence item not found.");
    } else {
      showError("Failed to load this evidence item.");
      showToast("Failed to load evidence", "error");
    }
    return;
  }

  if (!data) {
    showError("Evidence item not found.");
    return;
  }

  // Update hidden h1
  if ($h1) $h1.textContent = data.title || "Evidence Detail";

  // Render all sections
  renderBreadcrumbs(data);
  renderHero(data);
  // Extract [figure] shortcodes from description for the pictures section;
  // renderPictures returns the cleaned description for renderDescription.
  const cleanDescription = renderPictures(data.description);
  renderDescription({ ...data, description: cleanDescription });
  renderSources(data.mla_sources);
  renderDates(data);

  // Apply SEO metadata
  applySEO(data);

  // Show content
  showContent();
}

// Run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
