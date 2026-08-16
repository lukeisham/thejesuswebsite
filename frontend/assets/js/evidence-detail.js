/**
 * Evidence detail single-page: read slug, fetch full record, render all sections.
 *
 * @module evidence-detail
 */

import { getEvidenceBySlug } from "./api.js";
import { enhanceEsvVerses } from "./esv_verse.js";
import { getSegment } from "./utils/router.js";
import { setSEO } from "./seo.js";
import { html, raw } from "./utils/templates.js";
import { formatDate, formatVerse } from "./utils/format.js";
import { numberFigures } from "./utils/figures.js";
import { applyFigureOrientation } from "./utils/figure-orientation.js";
import { showToast } from "./utils/toasts.js";
import { formatMlaCitation } from "./utils/mla.js";
import {
  parseContentBody,
  getIdentifierLabel,
  EXTERNAL_LINK_ICON,
} from "./utils/content-markers.js";
import {
  FIGURE_SHORTCODE_PATTERN,
  parseFigureShortcodes,
} from "./utils/figure-shortcodes.js";

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

// Page info row — identifiers panel
const $infoRow = document.getElementById("evidence-info-row");
const $identifiersPanel = document.getElementById(
  "evidence-identifiers-panel",
);

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
    <span class="breadcrumb-item"><a href="/">Home</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item"><a href="/evidence/">Evidence</a></span>
    <span class="breadcrumb-separator">/</span>
    <span class="breadcrumb-item current">${item.title}</span>
  `;
}

function renderHero(item) {
  if ($title) $title.textContent = item.title || "Untitled";

  if ($verse && item.primary_verse) {
    const verseText = formatVerse(item.primary_verse);
    $verse.innerHTML = html`
      <p data-esv-ref="${verseText}">${verseText}</p>
      ${item.secondary_verse
        ? html`<p data-esv-ref="${formatVerse(item.secondary_verse)}">${formatVerse(item.secondary_verse)}</p>`
        : ""}
    `;
    $verse.hidden = false;
    enhanceEsvVerses($verse);
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
      standardFigures: true,
    });
    numberFigures($desc);
    applyFigureOrientation($desc);
  }
}

function renderPictures(description, primaryImage, primaryImageAlt, primaryImageCaption) {
  // Pictures are now [figure] shortcodes in body text (migration 006 dropped
  // evidence_pictures). Extract them from the description for the dedicated
  // pictures section, and return the cleaned description for renderDescription.
  // The dedicated primary image (migration 031) renders first, ahead of any
  // inline [figure] shortcodes, so legacy records keep working unchanged.
  if (!$picturesSection || !$pictures) return description || "";

  const figures = parseFigureShortcodes(description || "");
  let cleaned = description || "";

  if (!primaryImage && figures.length === 0) {
    $picturesSection.hidden = true;
    return cleaned;
  }

  $picturesSection.hidden = false;

  // image_caption is the intended caption; when unset, fall back to
  // image_alt so every existing published record keeps displaying exactly
  // what it showed before this field existed. alt always comes from
  // image_alt regardless — alt and caption are different jobs (HTML-2) and
  // must not be conflated going forward.
  const primaryCaption = primaryImageCaption || primaryImageAlt || "";
  const primaryHTML = primaryImage
    ? `<figure class="figure-standard">
        <img src="${html`${primaryImage}`}" alt="${html`${primaryImageAlt || ""}`}" loading="lazy" width="720" height="480" />
        ${primaryCaption ? `<figcaption>${html`${primaryCaption}`}</figcaption>` : ""}
      </figure>`
    : "";

  const itemsHTML = figures
    .map((fig) => {
      const alt = fig.caption ? html`${fig.caption}` : "";
      const figClass =
        fig.align === "left"
          ? "figure-align-left"
          : fig.align === "right"
            ? "figure-align-right"
            : "figure-standard";
      return `<figure class="${figClass}">
        <img src="${html`${fig.src}`}" alt="${alt}" loading="lazy" width="720" height="480" />
        ${fig.caption ? `<figcaption>${html`${fig.caption}`}</figcaption>` : ""}
      </figure>`;
    })
    .join("");

  $pictures.innerHTML = primaryHTML + itemsHTML;
  numberFigures($pictures);
  applyFigureOrientation($pictures);

  // Strip [figure] shortcodes from the description so renderDescription only
  // processes prose + inline markers (mla/id).
  cleaned = cleaned
    .replace(FIGURE_SHORTCODE_PATTERN(), "")
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
      const citation = formatMlaCitation(src);
      if (!citation) return "";
      const idAttr = src && src.id ? ` id="mla-${src.id}"` : "";
      return `<li class="source-list__item"${idAttr}>${citation}</li>`;
    })
    .filter(Boolean)
    .join("");

  if ($sources) $sources.innerHTML = itemsHTML;
}

/**
 * Build a single `<li>` for the identifiers panel: label (title, falling
 * back to type-specific fields via getIdentifierLabel) wrapped in a link
 * with an external-link icon when the identifier has an external_url.
 */
function buildIdentifierItem(identifier) {
  const label = getIdentifierLabel(identifier);
  if (!label) return "";

  const badge = html`<span class="inline-identifier">${label}</span>`;

  const content = identifier.external_url
    ? html`<a
        href="${identifier.external_url}"
        target="_blank"
        rel="noopener noreferrer"
        class="identifier-link"
        >${badge}${raw(EXTERNAL_LINK_ICON)}</a
      >`
    : badge;

  return html`<li class="info-panel__item">${content}</li>`;
}

function renderIdentifiersPanel(identifiers) {
  if (!$infoRow || !$identifiersPanel) return;

  const items = (identifiers || [])
    .map(buildIdentifierItem)
    .filter(Boolean);

  if (items.length === 0) {
    $infoRow.hidden = true;
    return;
  }

  $identifiersPanel.innerHTML = items.join("");
  $infoRow.hidden = false;
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
  const cleanDescription = renderPictures(
    data.description,
    data.image,
    data.image_alt,
    data.image_caption,
  );
  renderDescription({ ...data, description: cleanDescription });
  renderSources(data.mla_sources);
  renderDates(data);
  renderIdentifiersPanel(data.identifiers);

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
