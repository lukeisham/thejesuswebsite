/**
 * Resources list page: reads `key` URL param, fetches resources, and renders
 * them as `<section>` groups — one per subheading, each with its own
 * restarted `<ol>` numbering — with infinite scroll.
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
const TITLE_ID = "resources-title";
const DESC_ID = "resources-description";
const RETRY_ID = "retry-load";

const PAGE_SIZE = 30;
const SCROLL_THRESHOLD = 300;

let isLoading = false;
let hasMore = true;
let activeKey = null;
let observer = null;
let retryTeardown = null;

// Rows fetched from the API (items + subheadings), the flattened render plan
// built from them once per load, and how much of that plan has been rendered
// so far (JS-6: pagination tracks this module state, not DOM element counts).
let allRows = [];
let renderPlan = [];
let planIndex = 0;
let itemCount = 0;

// The currently open section's <ol> — new item entries append here until a
// new heading entry replaces it. Tracked in module state, not recomputed
// from the DOM, so infinite-scroll batches continue the right section.
let $currentSectionOl = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────
// Guarded so this module can be imported in a non-browser environment (e.g.
// a Node test importing the pure grouping functions below) without throwing.

let $list = null;
let $sentinel = null;
let $loading = null;
let $empty = null;
let $error = null;
let $end = null;
let $title = null;
let $desc = null;
let $retry = null;

if (typeof document !== "undefined") {
  $list = document.getElementById(LIST_ID);
  $sentinel = document.getElementById(SENTINEL_ID);
  $loading = document.getElementById(LOADING_ID);
  $empty = document.getElementById(EMPTY_ID);
  $error = document.getElementById(ERROR_ID);
  $end = document.getElementById(END_ID);
  $title = document.getElementById(TITLE_ID);
  $desc = document.getElementById(DESC_ID);
  $retry = document.getElementById(RETRY_ID);
}

// ─── Pure grouping logic (exported for tests) ───────────────────────────────

/**
 * Group a flat list of resource rows into sections, restarting item
 * numbering under each subheading. Items before the first subheading form a
 * leading, unlabelled section. A subheading with nothing under it (trailing,
 * or immediately followed by another subheading) produces no section at all
 * — an empty heading must never render on the public page.
 *
 * @param {Array<object>} rows
 * @returns {Array<{heading: object|null, items: object[]}>}
 */
export function groupIntoSections(rows) {
  const sections = [];
  let current = { heading: null, items: [] };

  rows.forEach((row) => {
    if (row.item_type === "subheading") {
      if (current.items.length > 0) sections.push(current);
      current = { heading: row, items: [] };
    } else {
      current.items.push(row);
    }
  });

  if (current.items.length > 0) sections.push(current);
  return sections;
}

/**
 * Flatten grouped sections into an ordered render plan: one "heading" entry
 * per section (heading may be null for the leading section) followed by its
 * "item" entries, each carrying the ordinal restarted for that section.
 *
 * @param {Array<object>} rows
 * @returns {Array<{type: 'heading', sectionIndex: number, heading: object|null}
 *                | {type: 'item', sectionIndex: number, ordinal: number, item: object}>}
 */
export function buildRenderPlan(rows) {
  const sections = groupIntoSections(rows);
  const plan = [];

  sections.forEach((section, sectionIndex) => {
    plan.push({ type: "heading", sectionIndex, heading: section.heading });
    section.items.forEach((item, i) => {
      plan.push({ type: "item", sectionIndex, ordinal: i + 1, item });
    });
  });

  return plan;
}

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

  allRows = Array.isArray(data) ? data : [];
  renderPlan = buildRenderPlan(allRows);
  itemCount = renderPlan.filter((entry) => entry.type === "item").length;
  planIndex = 0;
  $currentSectionOl = null;
  hasMore = true;
  if ($list) $list.innerHTML = "";

  if (itemCount === 0) {
    showState("empty");
    const emptyMsg = document.querySelector(
      "#empty-state .empty-state__message",
    );
    if (emptyMsg) emptyMsg.textContent = `No resources in this category yet.`;
    return;
  }

  renderNextBatch();
}

function renderNextBatch() {
  if (isLoading) return;

  if (planIndex >= renderPlan.length) {
    finishLoading();
    return;
  }

  isLoading = true;
  showState("loading");

  const batch = renderPlan.slice(planIndex, planIndex + PAGE_SIZE);
  planIndex += batch.length;
  renderPlanEntries(batch);

  isLoading = false;

  if (planIndex >= renderPlan.length) {
    finishLoading();
  } else {
    hasMore = true;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

function finishLoading() {
  hasMore = false;
  $sentinel && ($sentinel.hidden = true);
  showState("end");
  if ($end)
    $end.textContent = `All ${itemCount} item${itemCount !== 1 ? "s" : ""} loaded`;
}

function loadNextPage() {
  if (isLoading || !hasMore) return;
  renderNextBatch();
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderPlanEntries(entries) {
  if (!$list) return;

  entries.forEach((entry) => {
    if (entry.type === "heading") {
      const section = document.createElement("section");
      section.className = "resources-section";

      if (entry.heading) {
        const h3 = document.createElement("h3");
        h3.className = "resource-subheading";
        h3.textContent = entry.heading.resource_title;
        section.appendChild(h3);
      }

      const ol = document.createElement("ol");
      ol.className = "resources-list";
      ol.setAttribute(
        "aria-label",
        entry.heading ? entry.heading.resource_title : "Resource items",
      );
      section.appendChild(ol);

      $list.appendChild(section);
      $currentSectionOl = ol;
    } else if ($currentSectionOl) {
      $currentSectionOl.appendChild(
        buildResourceItem(entry.item, entry.ordinal),
      );
    }
  });
}

function buildResourceItem(item, ordinal) {
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

  return li;
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
    allRows = [];
    renderPlan = [];
    planIndex = 0;
    itemCount = 0;
    $currentSectionOl = null;
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

  if (!activeKey || !VALID_LIST_KEYS.includes(activeKey)) {
    showState("empty");
    return;
  }

  // Set page title from key
  setPageTitle(activeKey);

  // Load resources for this key
  loadResources(activeKey);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
