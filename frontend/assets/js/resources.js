/**
 * Resources list page: reads `key` URL param, fetches resources,
 * renders category nav chips and ordered list with ordinal numbers,
 * and infinite scroll.
 *
 * @module resources
 */

import { getResources } from "./api.js";
import { getParams } from "./utils/router.js";
import { html } from "./utils/templates.js";
import { setSEO } from "./seo.js";
import { showToast } from "./utils/toasts.js";
import { delegate } from "./utils/dom.js";

// Valid list keys from the schema
const VALID_LIST_KEYS = [
  "sermons-and-sayings",
  "parables",
  "objects",
  "people",
  "sites",
  "ot-verses",
  "internal-witnesses",
  "external-witnesses",
  "places",
  "world-events",
  "miracles",
  "events",
  "apologetics",
  "manuscripts",
  "sources",
];

// Human-readable labels for each key
const LIST_KEY_LABELS = {
  "sermons-and-sayings": "Sermons & Sayings",
  parables: "Parables",
  objects: "Objects",
  people: "People",
  sites: "Sites",
  "ot-verses": "OT Verses",
  "internal-witnesses": "Internal Witnesses",
  "external-witnesses": "External Witnesses",
  places: "Places",
  "world-events": "World Events",
  miracles: "Miracles",
  events: "Events",
  apologetics: "Apologetics",
  manuscripts: "Manuscripts",
  sources: "Sources",
};

const SENTINEL_ID = "scroll-sentinel";
const LIST_ID = "resources-list";
const LOADING_ID = "loading-state";
const EMPTY_ID = "empty-state";
const ERROR_ID = "error-state";
const END_ID = "end-of-list";
const CATEGORY_NAV_ID = "category-nav";
const TITLE_ID = "resources-title";
const DESC_ID = "resources-description";
const RETRY_ID = "retry-load";

const PAGE_SIZE = 30;
const SCROLL_THRESHOLD = 300;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let activeKey = null;
let observer = null;
let retryTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list = document.getElementById(LIST_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading = document.getElementById(LOADING_ID);
const $empty = document.getElementById(EMPTY_ID);
const $error = document.getElementById(ERROR_ID);
const $end = document.getElementById(END_ID);
const $categoryNav = document.getElementById(CATEGORY_NAV_ID);
const $title = document.getElementById(TITLE_ID);
const $desc = document.getElementById(DESC_ID);
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

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadResources(key) {
  if (!key || !VALID_LIST_KEYS.includes(key)) {
    showState("empty");
    return;
  }

  if (isLoading) return;
  isLoading = true;
  showState("loading");

  const { data, error } = await getResources({ list_key: key });

  isLoading = false;

  if (error) {
    showState("error");
    showToast("Failed to load resources", "error");
    return;
  }

  if (!data || data.length === 0) {
    if (allItems.length === 0) {
      showState("empty");
      const emptyMsg = document.querySelector(
        "#empty-state .empty-state__message",
      );
      if (emptyMsg) emptyMsg.textContent = `No resources in this category yet.`;
    }
    return;
  }

  allItems = data;
  currentPage = 1;
  hasMore = data.length > PAGE_SIZE;

  // Render first page
  const pageItems = data.slice(0, PAGE_SIZE);
  renderListItems(pageItems);

  if (pageItems.length >= data.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState("end");
    const total = allItems.length;
    if ($end)
      $end.textContent = `All ${total} item${total !== 1 ? "s" : ""} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

function loadNextPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState("loading");

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = allItems.slice(start, start + PAGE_SIZE);

  isLoading = false;

  if (pageItems.length === 0) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState("end");
    const total = allItems.length;
    if ($end)
      $end.textContent = `All ${total} item${total !== 1 ? "s" : ""} loaded`;
    return;
  }

  renderListItems(pageItems);

  if (start + pageItems.length >= allItems.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState("end");
    const total = allItems.length;
    if ($end)
      $end.textContent = `All ${total} item${total !== 1 ? "s" : ""} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderListItems(items) {
  if (!$list) return;

  // Calculate starting ordinal from existing list items
  const existingItems = $list.querySelectorAll(".resource-item");
  const startOrdinal = existingItems.length;

  items.forEach((item, index) => {
    const ordinal = startOrdinal + index + 1;

    const titleHTML = item.resource_url
      ? html`<a
          href="${item.resource_url}"
          target="_blank"
          rel="noopener noreferrer"
          >${item.resource_title}
          <svg
            width="14"
            height="14"
            aria-hidden="true"
            style="display:inline;vertical-align:middle;"
          >
            <use
              href="/assets/images/feather-sprite.svg#icon-external-link"
            /></svg
        ></a>`
      : html`${item.resource_title}`;

    const li = document.createElement("li");
    li.className = "resource-item";
    li.innerHTML = html`
      <span class="resource-ordinal">${ordinal}</span>
      <div class="resource-content">
        <div class="resource-title">${titleHTML}</div>
        ${item.resource_description
          ? html`<p class="resource-description">
              ${item.resource_description}
            </p>`
          : ""}
      </div>
    `;

    $list.appendChild(li);
  });
}

function renderCategoryNav(activeKey) {
  if (!$categoryNav) return;

  $categoryNav.innerHTML = VALID_LIST_KEYS.map((key) => {
    const label = LIST_KEY_LABELS[key] || key;
    const isActive = key === activeKey;
    const href = `/resources/${key}.html`;

    return html`
      <a
        class="resources-category-link${isActive ? " active" : ""}"
        href="${href}"
        data-key="${key}"
        >${label}</a
      >
    `;
  }).join("");
}

function setPageTitle(key) {
  const label = LIST_KEY_LABELS[key] || key;

  if ($title) $title.textContent = label;

  // Update SEO
  setSEO({
    title: `${label} — Resources — The Jesus Website`,
    description: `Browse the curated, ranked list of ${label.toLowerCase()} resources.`,
  });
}

// ─── Infinite scroll ─────────────────────────────────────────────────────────

function initInfiniteScroll() {
  if (!$sentinel) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadNextPage();
        }
      });
    },
    { rootMargin: `${SCROLL_THRESHOLD}px` },
  );

  observer.observe($sentinel);
}

// ─── Event wiring ────────────────────────────────────────────────────────────

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, "click", () => {
    if ($list) $list.innerHTML = "";
    allItems = [];
    currentPage = 1;
    hasMore = true;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadResources(activeKey);
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  bindRetry();
  initInfiniteScroll();

  // Read `list_key` from URL param (supports both `key` and `list_key`),
  // falling back to `data-category` attribute on `<body>` for `list-N.html` pages.
  const params = getParams();
  activeKey =
    params.get("key") ||
    params.get("list_key") ||
    document.body.dataset.category ||
    null;

  // Render category nav with active state
  renderCategoryNav(activeKey);

  if (!activeKey || !VALID_LIST_KEYS.includes(activeKey)) {
    showState("empty");
    return;
  }

  // Set page title from key
  setPageTitle(activeKey);

  // Load resources for this key
  loadResources(activeKey);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
