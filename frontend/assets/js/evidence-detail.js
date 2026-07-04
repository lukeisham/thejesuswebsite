/**
 * Evidence detail single-page: read slug, fetch full record, render all sections.
 *
 * @module evidence-detail
 */

import { getEvidenceBySlug } from "./api.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html } from "./utils/templates.js";
import { formatVerse } from "./utils/format.js";
import { numberFigures } from "./utils/figures.js";
import { showToast } from "./utils/toasts.js";

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
const $timeline = document.getElementById("evidence-timeline-context");
const $timelineSection = document.getElementById("evidence-timeline-section");
const $pictures = document.getElementById("evidence-pictures");
const $picturesSection = document.getElementById("evidence-pictures-section");
const $sources = document.getElementById("evidence-sources");
const $sourcesSection = document.getElementById("evidence-sources-section");

// Page info row
const $infoRow = document.getElementById("page-info-row");
const $infoRelated = document.getElementById("info-related");
const $infoRelatedList = document.getElementById("info-related-list");
const $infoIdentifiers = document.getElementById("info-identifiers");
const $infoIdentifiersList = document.getElementById("info-identifiers-list");
const $infoEra = document.getElementById("info-era");
const $infoPeriod = document.getElementById("info-period");
const $infoLocation = document.getElementById("info-location");
const $infoCategory = document.getElementById("info-category");

// ─── Slug extraction ─────────────────────────────────────────────────────────

function getSlugFromUrl() {
  // URL pattern: /evidence/single/{slug}
  // getSegment(0) = 'evidence', getSegment(1) = 'single', getSegment(2) = slug
  const segment = getSegment(2);
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
  if ($desc) $desc.innerHTML = escapeAndRender(item.description);
}

function renderTimelineContext(item) {
  const parts = [];
  if (item.timeline_era) parts.push(`Era: ${escapeHTML(item.timeline_era)}`);
  if (item.timeline_period)
    parts.push(`Period: ${escapeHTML(item.timeline_period)}`);
  if (item.timeline_year_start || item.timeline_year_end) {
    const range = [item.timeline_year_start, item.timeline_year_end]
      .filter(Boolean)
      .join("–");
    parts.push(`Date: ${escapeHTML(range)}`);
  }

  if (parts.length === 0) {
    if ($timelineSection) $timelineSection.hidden = true;
    return;
  }

  if ($timelineSection) $timelineSection.hidden = false;
  if ($timeline) $timeline.innerHTML = `<p>${parts.join(" · ")}</p>`;
}

function renderPictures(pictures) {
  if (!pictures || pictures.length === 0) {
    if ($picturesSection) $picturesSection.hidden = true;
    return;
  }

  if ($picturesSection) $picturesSection.hidden = false;

  const figuresHTML = pictures
    .map(
      (pic, i) => html`
        <figure>
          <img
            src="${pic.image_path}"
            alt="${pic.caption || ""}"
            loading="lazy"
          />
          <figcaption>${pic.caption || ""}</figcaption>
        </figure>
      `,
    )
    .join("");

  if ($pictures) $pictures.innerHTML = figuresHTML;

  // Number figures after insertion
  if ($pictures) numberFigures($pictures);
}

function renderSources(mlaSources) {
  if (!mlaSources || mlaSources.length === 0) {
    if ($sourcesSection) $sourcesSection.hidden = true;
    return;
  }

  if ($sourcesSection) $sourcesSection.hidden = false;

  const itemsHTML = mlaSources
    .map(
      (src) => html`
        <li class="source-list__item">
          ${src.citation || src.title || "Untitled source"}
        </li>
      `,
    )
    .join("");

  if ($sources) $sources.innerHTML = itemsHTML;
}

function renderPageInfoRow(item) {
  if (!$infoRow) return;

  let hasContent = false;

  // Related evidence links
  if (item.links_evidence && item.links_evidence.length > 0) {
    if ($infoRelated) $infoRelated.hidden = false;
    if ($infoRelatedList) {
      $infoRelatedList.innerHTML = item.links_evidence
        .map(
          (link) => html`
            <li>
              <a href="/evidence/single/${link.slug || ""}"
                >${link.title || "Untitled"}</a
              >
            </li>
          `,
        )
        .join("");
    }
    hasContent = true;
  } else if ($infoRelated) {
    $infoRelated.hidden = true;
  }

  // Identifiers
  if (item.identifiers && item.identifiers.length > 0) {
    if ($infoIdentifiers) $infoIdentifiers.hidden = false;
    if ($infoIdentifiersList) {
      $infoIdentifiersList.innerHTML = item.identifiers
        .map((id) => html` <li>${id.label || id.value || ""}</li> `)
        .join("");
    }
    hasContent = true;
  } else if ($infoIdentifiers) {
    $infoIdentifiers.hidden = true;
  }

  // Meta details
  if ($infoEra) $infoEra.textContent = item.timeline_era || "—";
  if ($infoPeriod) $infoPeriod.textContent = item.timeline_period || "—";
  if ($infoLocation) $infoLocation.textContent = item.map_location || "—";
  if ($infoCategory) $infoCategory.textContent = item.gospel_category || "—";
  hasContent = true;

  $infoRow.hidden = !hasContent;
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

function escapeAndRender(text) {
  // Simple line-break to paragraph conversion, already escaped
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHTML(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

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
    showError(
      error === "Slug is required"
        ? "No evidence item specified."
        : "Failed to load this evidence item.",
    );
    showToast("Failed to load evidence", "error");
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
  renderDescription(data);
  renderTimelineContext(data);
  renderPictures(data.pictures);
  renderSources(data.mla_sources);
  renderPageInfoRow(data);

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
