/**
 * Evidence list page: fetch, filter, infinite scroll, and sessionStorage caching.
 *
 * @module evidence-list
 */

import { getEvidence, readEmbeddedData } from "./api.js";
import { html, raw } from "./utils/templates.js";
import { getParams, pushState } from "./utils/router.js";
import { showToast } from "./utils/toasts.js";
import { formatItemsLoaded } from "./utils/format.js";
import { numberFigures } from "./utils/figures.js";
import { delegate } from "./utils/dom.js";
import { initFilterPanel } from "./utils/filter-panel.js";

const SENTINEL_ID = "scroll-sentinel";
const EVIDENCE_LIST_ID = "evidence-list";
const LOADING_ID = "loading-state";
const EMPTY_ID = "empty-state";
const ERROR_ID = "error-state";
const END_ID = "end-of-list";
const FILTER_CHIPS_ID = "filter-chips";
const CLEAR_FILTERS_ID = "clear-filters";
const RETRY_ID = "retry-load";

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

const STORAGE_KEY_ITEMS = "evidence_list_items";
const STORAGE_KEY_SCROLL = "evidence_list_scroll";

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let activeFilters = {};
let observer = null;
let clearFiltersTeardown = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list = document.getElementById(EVIDENCE_LIST_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $end = document.getElementById(END_ID);
const $chips = document.getElementById(FILTER_CHIPS_ID);
const $clearFilters = document.getElementById(CLEAR_FILTERS_ID);
const $retry = document.getElementById(RETRY_ID);

// ─── State management ────────────────────────────────────────────────────────

function showState(name) {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error, end: $end }[
    name
  ];
  if (target) target.hidden = false;
  if ($sentinel) $sentinel.hidden = name !== "none";
}

function hideAllStates() {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
}

// ─── Filter logic ────────────────────────────────────────────────────────────

function parseUrlFilters() {
  const params = getParams();
  const filters = {};
  for (const key of [
    "timeline_era",
    "timeline_period",
    "gospel_category",
    "map_location",
  ]) {
    const val = params.get(key);
    if (val) filters[key] = val;
  }
  return filters;
}

function syncChipUI(filters) {
  if (!$chips) return;
  const buttons = $chips.querySelectorAll(".filter-chip");
  buttons.forEach((btn) => {
    const key = btn.dataset.filter;
    const val = btn.dataset.value;
    if (key === "all") {
      const hasAny = Object.keys(filters).length > 0;
      btn.classList.toggle("filter-chip--active", !hasAny);
    } else if (filters[key] === val) {
      btn.classList.add("filter-chip--active");
    } else {
      btn.classList.remove("filter-chip--active");
    }
  });
}

function applyFilters(filters) {
  activeFilters = { ...filters };
  const qs = new URLSearchParams(filters).toString();
  pushState(window.location.pathname + (qs ? "?" + qs : ""));
  syncChipUI(filters);
  resetAndLoad();
}

async function resetAndLoad() {
  currentPage = 1;
  hasMore = true;
  allItems = [];
  if ($list) $list.innerHTML = "";
  if ($sentinel) $sentinel.hidden = false;
  hideAllStates();
  clearCachedItems();
  await loadPage();
  restoreScrollPosition();
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState("loading");

  const params = {
    ...activeFilters,
    page: String(currentPage),
    limit: String(PAGE_SIZE),
  };

  const { data, error } = await getEvidence(params);

  isLoading = false;

  if (error) {
    showState("error");
    showToast("Failed to load evidence", "error");
    return;
  }

  // Server returns paginated shape: { items, total, page, limit, totalPages }
  // when page/limit params are sent.
  const pageItems = data?.items || data || [];
  const total = data?.total ?? pageItems.length;

  if (!Array.isArray(pageItems) || pageItems.length === 0) {
    if (allItems.length === 0) {
      showState("empty");
    } else {
      hasMore = false;
      $sentinel.hidden = true;
      showState("end");
      if ($end) $end.textContent = formatItemsLoaded(total);
    }
    return;
  }

  allItems = [...allItems, ...pageItems];
  renderRows(pageItems);
  cacheItems();

  if (pageItems.length < PAGE_SIZE || allItems.length >= total) {
    hasMore = false;
    $sentinel.hidden = true;
    showState("end");
    if ($end) $end.textContent = formatItemsLoaded(total);
  } else {
    currentPage++;
    hideAllStates();
    $sentinel.hidden = false;
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderRows(items) {
  if (!$list) return;

  items.forEach((item) => {
    const rowHTML = renderEvidenceRow(item);
    const temp = document.createElement("div");
    temp.innerHTML = rowHTML.toString();
    const rowEl = temp.firstElementChild;
    if (rowEl) {
      $list.appendChild(rowEl);
    }
  });

  // Number figures in newly rendered content
  numberFigures($list);
}

/**
 * Render a single evidence row as a safe HTML string.
 *
 * Emits an <li> row with:
 *   - thumbnail placeholder (evidence_pictures was dropped by migration 006;
 *     pictures are now [figure] shortcodes in body text)
 *   - title (linked to /evidence/<slug>)
 *   - primary_verse in muted monospace style
 *
 * All values are escaped via the `html` tagged template (JS-6).
 * Thumbnail `alt=""` per HTML-2 (title sits beside it).
 *
 * @param {Object} item - Evidence row from the API.
 * @returns {SafeString}
 */
function renderEvidenceRow(item) {
  const url = `/evidence/${encodeURIComponent(item.slug || "")}`;
  const title = item.title || "Untitled";
  const verse = item.primary_verse || "";
  const thumbnail = item.thumbnail_path || "";

  return html`
    <li class="evidence-row">
      <a class="evidence-row__link" href="${url}">
        <div class="evidence-row__thumbnail">
          ${thumbnail
            ? raw(`<img
                class="evidence-row__thumb-img"
                data-src="${thumbnail}"
                src=""
                alt=""
                width="80"
                height="80"
                loading="lazy"
              />`)
            : raw(
                '<div class="evidence-row__thumb-placeholder" aria-hidden="true"></div>',
              )}
        </div>
        <div class="evidence-row__body">
          <span class="evidence-row__title">${title}</span>
          ${verse
            ? html`<span class="evidence-row__verse">${verse}</span>`
            : raw("")}
        </div>
      </a>
    </li>
  `;
}

// ─── Infinite scroll (IntersectionObserver) ──────────────────────────────────

function initInfiniteScroll() {
  if (!$sentinel) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadPage();
        }
      });
    },
    { rootMargin: `${SCROLL_THRESHOLD}px` },
  );

  observer.observe($sentinel);
}

// ─── SessionStorage caching (back-nav) ───────────────────────────────────────

function cacheItems() {
  try {
    sessionStorage.setItem(
      STORAGE_KEY_ITEMS,
      JSON.stringify({
        version: Date.now(),
        items: allItems,
      }),
    );
    sessionStorage.setItem(STORAGE_KEY_SCROLL, String(window.scrollY));
  } catch {
    /* quota exceeded — non-critical */
  }
}

function clearCachedItems() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_ITEMS);
    sessionStorage.removeItem(STORAGE_KEY_SCROLL);
  } catch {
    /* ignore */
  }
}

/**
 * Silently fetch page 1 and replace the rendered list if the server
 * data differs from the current in-memory items.  Never shows loading
 * or error states — the cache already provides visible content.
 */
async function silentlyRefreshPage1() {
  try {
    const params = { page: "1", limit: String(PAGE_SIZE) };
    const { data, error } = await getEvidence(params);
    if (error || !data) return;

    const freshItems = data?.items || data || [];
    const freshTotal = data?.total ?? freshItems.length;
    if (!Array.isArray(freshItems) || freshItems.length === 0) return;

    // Only replace if the data actually changed
    if (
      freshItems.length === allItems.length &&
      JSON.stringify(freshItems) === JSON.stringify(allItems)
    ) {
      // Identical — update the end counter just in case total changed
      if (freshTotal !== allItems.length) {
        if ($end) $end.textContent = formatItemsLoaded(freshTotal);
      }
      return;
    }

    // Data differs — replace the rendered list
    allItems = freshItems;
    if ($list) $list.innerHTML = "";
    renderRows(allItems);
    cacheItems();

    // Update pagination state from the fresh page-1 data
    if (freshItems.length < PAGE_SIZE || allItems.length >= freshTotal) {
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      showState("end");
      if ($end) $end.textContent = formatItemsLoaded(freshTotal);
    } else {
      hasMore = true;
      currentPage = 2;
      hideAllStates();
      $sentinel && ($sentinel.hidden = false);
      if (observer && $sentinel) observer.observe($sentinel);
    }
  } catch {
    /* network error — leave cached list in place */
  }
}

function restoreFromCache() {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY_ITEMS);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Handle both versioned and legacy (flat array) cache formats
      const cachedItems = parsed.items || parsed;

      if (cachedItems && cachedItems.length > 0) {
        allItems = cachedItems;
        if ($list) $list.innerHTML = "";
        renderRows(allItems);
        showState("end");
        const total = allItems.length;
        if ($end) $end.textContent = formatItemsLoaded(total);
        $sentinel && ($sentinel.hidden = true);

        // Always silently revalidate from page 1 — new items may have
        // appeared anywhere in the list, not just after the cached window.
        silentlyRefreshPage1();

        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

function restoreScrollPosition() {
  try {
    const scrollY = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    if (scrollY) {
      requestAnimationFrame(() => window.scrollTo(0, Number(scrollY)));
    }
  } catch {
    /* ignore */
  }
}

// ─── Event wiring ────────────────────────────────────────────────────────────

function bindFilterChips() {
  if (!$chips) return;

  delegate($chips, ".filter-chip", "click", (_e, target) => {
    const filterKey = target.dataset.filter;
    if (filterKey === "all") {
      applyFilters({});
      return;
    }

    const filterValue = target.dataset.value;
    const newFilters = { ...activeFilters };

    if (newFilters[filterKey] === filterValue) {
      // Toggle off
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = filterValue;
    }

    applyFilters(newFilters);
  });
}

function bindClearFilters() {
  if (!$clearFilters) return;
  if (clearFiltersTeardown) clearFiltersTeardown();
  clearFiltersTeardown = delegate(
    document.body,
    `#${CLEAR_FILTERS_ID}`,
    "click",
    () => {
      applyFilters({});
    },
  );
}

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, "click", () => {
    resetAndLoad();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  initFilterPanel();
  bindFilterChips();
  bindClearFilters();
  bindRetry();

  activeFilters = parseUrlFilters();
  syncChipUI(activeFilters);

  // Try restoring from cache first (back-navigation)
  const restored = restoreFromCache();
  if (restored) {
    restoreScrollPosition();
    return;
  }

  // Try embedded data (deploy-time snapshot for first-paint content — SR-3)
  const embedded = readEmbeddedData("evidence-list-data");
  if (embedded && Array.isArray(embedded) && embedded.length > 0) {
    const pageItems = embedded.slice(0, PAGE_SIZE);
    allItems = pageItems;
    renderRows(pageItems);
    hasMore = embedded.length > PAGE_SIZE;
    hideAllStates();
    if (!hasMore) {
      $sentinel.hidden = true;
      showState("end");
      if ($end) $end.textContent = formatItemsLoaded(allItems.length);
    } else {
      currentPage = 2;
      $sentinel.hidden = false;
    }
    cacheItems();
    initInfiniteScroll();
    return;
  }

  initInfiniteScroll();
  loadPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
