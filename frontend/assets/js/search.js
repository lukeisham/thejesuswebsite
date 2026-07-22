/**
 * Search page: debounced input, API search, result rendering, and type filters.
 *
 * @module search
 */

import { search as apiSearch } from "./api.js";
import { debounce } from "./utils/debounce.js";
import { html, renderBadge, raw, safeJoin } from "./utils/templates.js";
import { getParams } from "./utils/router.js";
import { showToast } from "./utils/toasts.js";

// ─── DOM refs ────────────────────────────────────────────────────────────────

const $input = document.getElementById("search-input");
const $results = document.getElementById("search-results");
const $loading = document.getElementById("loading-state");
const $empty = document.getElementById("empty-state");
const $noResults = document.getElementById("no-results-state");
const $error = document.getElementById("error-state");
const $typeChips = document.getElementById("type-chips");

const DEBOUNCE_MS = 300;

let activeType = "all";

// ─── State helpers ───────────────────────────────────────────────────────────

function showState(name) {
  [$loading, $empty, $noResults, $error].forEach(
    (el) => el && (el.hidden = true),
  );
  if ($results) $results.hidden = true;

  const target = {
    loading: $loading,
    empty: $empty,
    noResults: $noResults,
    error: $error,
  }[name];
  if (target) target.hidden = false;
}

function showResults() {
  [$loading, $empty, $noResults, $error].forEach(
    (el) => el && (el.hidden = true),
  );
  if ($results) $results.hidden = false;
}

// ─── Search ──────────────────────────────────────────────────────────────────

async function performSearch(query) {
  if (!query || query.trim().length === 0) {
    showState("empty");
    return;
  }

  showState("loading");

  const typeParam = activeType === "all" ? null : activeType;
  const { data, error } = await apiSearch(query, typeParam);

  if (error) {
    showState("error");
    showToast("Search failed", "error");
    return;
  }

  if (!data || data.length === 0) {
    showState("noResults");
    return;
  }

  renderResults(data);
  showResults();
}

const debouncedSearch = debounce((query) => performSearch(query), DEBOUNCE_MS);

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderResults(items) {
  if (!$results) return;

  // Group by result_type
  const grouped = groupBy(items, "result_type");

  const groupLabels = {
    evidence: "Evidence",
    essays: "Essays",
    responses: "Responses",
    blog: "Blog Posts",
    news: "News",
    "bible-verses": "Bible Verses",
  };

  const sectionsHTML = Object.entries(grouped).map(([type, groupItems]) => {
    const label = groupLabels[type] || type;
    const rowsHTML = safeJoin(
      groupItems.map((item) => renderResultRow(item, type)),
    );

    return html`
      <div class="search-results__group">
        <h3 class="search-results__group-heading">
          ${label} (${groupItems.length})
        </h3>
        <div class="search-results__rows">${rowsHTML}</div>
      </div>
    `;
  });

  $results.innerHTML = safeJoin(sectionsHTML);
}

function renderResultRow(item, type) {
  const title = item.title || "Untitled";
  const snippet = item.snippet || "";
  const url = getResultUrl(item, type);
  const badge = renderBadge(typeLabels[type] || type);
  const thumbnail = item.thumbnail || "";

  const thumbnailHTML = thumbnail
    ? raw(`<img
        class="search-result-row__thumb-img"
        data-src="${thumbnail}"
        src=""
        alt=""
        width="64"
        height="64"
        loading="lazy"
      />`)
    : raw(
        '<div class="search-result-row__thumb-placeholder" aria-hidden="true"></div>',
      );

  return html`
    <a href="${url}" class="search-result-row">
      <div class="search-result-row__thumbnail">${thumbnailHTML}</div>
      <div class="search-result-row__body">
        <div class="search-result-row__header">
          <span class="search-result-row__title">${title}</span>
          <span class="search-result-row__badge">${badge}</span>
        </div>
        <p class="search-result-row__snippet">${raw(snippet)}</p>
      </div>
    </a>
  `;
}

function getResultUrl(item, type) {
  const slug = item.slug || "";
  switch (type) {
    case "evidence":
      return `/evidence/${encodeURIComponent(slug)}`;
    case "essays":
      return `/contextual-essays/${encodeURIComponent(slug)}`;
    case "responses":
      return `/debate/responses/${encodeURIComponent(slug)}`;
    case "blog":
      return `/news-and-blog/blog/${encodeURIComponent(slug)}`;
    case "news":
      return `/news-and-blog/news/${encodeURIComponent(slug)}`;
    case "bible-verses":
      return "/resources/list.html?key=ot-verses";
    default:
      return "#";
  }
}

const typeLabels = {
  evidence: "Evidence",
  essays: "Essays",
  responses: "Responses",
  blog: "Blog",
  news: "News",
  "bible-verses": "Bible Verses",
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const group = item[key] || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
}

// ─── Filter chips ────────────────────────────────────────────────────────────

function bindTypeChips() {
  if (!$typeChips) return;

  $typeChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;

    // Update active state
    $typeChips.querySelectorAll(".filter-chip").forEach((c) => {
      c.classList.remove("filter-chip--active");
    });
    chip.classList.add("filter-chip--active");

    activeType = chip.dataset.type || "all";

    // Re-run search with new type filter
    if ($input && $input.value.trim()) {
      performSearch($input.value.trim());
    }
  });
}

// ─── URL param initialisation ────────────────────────────────────────────────

function initFromUrl() {
  const params = getParams();
  const q = params.get("q");
  if (q && $input) {
    $input.value = q;
    performSearch(q);
  }

  const initialType = params.get("type");
  if (initialType && $typeChips) {
    const chip = $typeChips.querySelector(`[data-type="${initialType}"]`);
    if (chip) {
      $typeChips.querySelectorAll(".filter-chip").forEach((c) => {
        c.classList.remove("filter-chip--active");
      });
      chip.classList.add("filter-chip--active");
      activeType = initialType;
    }
  }
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  if (!$input) return;

  bindTypeChips();

  $input.addEventListener("input", () => {
    const query = $input.value.trim();
    if (query) {
      debouncedSearch(query);
    } else {
      showState("empty");
      if ($results) $results.hidden = true;
    }
  });

  // Initial load from URL params
  initFromUrl();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
