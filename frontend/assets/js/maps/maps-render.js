/**
 * Maps render module.
 *
 * Renders the overview grid and the single dynamic map region page.
 * Uses createElement from dom.js (JS-6).
 *
 * @module maps/maps-render
 */

import { createElement, batchWrite } from "../utils/dom.js";
import { fetchMapByKey } from "./maps-data.js";
import { setupInteractions } from "./maps-interactions.js";
import { showToast } from "../utils/toasts.js";

// ─── Overview render ──────────────────────────────────────────────────────────

/**
 * Map label → display name mapping for overview cards.
 * @type {Object<string, string>}
 */
const MAP_LABELS = {
  "roman-empire": "Roman Empire",
  levant: "The Levant",
  judea: "Judea",
  galilee: "Galilee",
  jerusalem: "Jerusalem",
};

/**
 * Render the overview grid of map cards.
 *
 * @param {Array} maps - Array of map objects from the API.
 */
export function renderOverview(maps) {
  const grid = document.getElementById("maps-grid");
  if (!grid) return;

  batchWrite(() => {
    grid.innerHTML = "";

    if (!maps || maps.length === 0) {
      showEmptyState(grid);
      return;
    }

    for (const map of maps) {
      const count = map.pin_count || 0;
      const pinLabel = count === 1 ? "1 pin" : `${count} pins`;
      const label = MAP_LABELS[map.map_key] || map.map_name;

      const card = createElement(
        "a",
        {
          className: "card card-image-top maps-overview-card",
          href: `/evidence/maps/${encodeURIComponent(map.map_key)}.html`,
        },
        [
          createElement("img", {
            className: "card-image",
            src: map.image_path || "",
            alt: `Map of ${label}`,
            loading: "lazy",
          }),
          createElement("div", { className: "card-body" }, [
            createElement("h3", { className: "card-title" }, [label]),
            createElement("p", { className: "card-description" }, [
              map.description || "",
            ]),
            createElement(
              "span",
              {
                className: "maps-pin-count badge badge--neutral",
              },
              [pinLabel],
            ),
          ]),
        ],
      );

      grid.appendChild(card);
    }
  });
}

// ─── Region page render ───────────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let mapContainer = null;
/** @type {HTMLElement|null} */
let mapImageEl = null;
/** @type {HTMLElement|null} */
let pinsLayer = null;
/** @type {HTMLElement|null} */
let loadingEl = null;
/** @type {HTMLElement|null} */
let emptyEl = null;
/** @type {HTMLElement|null} */
let tooltipEl = null;

/**
 * Initialise cached DOM references for the region page.
 */
export function initRegion() {
  mapContainer = document.getElementById("map-container");
  mapImageEl = document.getElementById("map-image");
  pinsLayer = document.getElementById("map-pins");
  loadingEl = document.getElementById("loading-state");
  emptyEl = document.getElementById("empty-state");
  tooltipEl = document.getElementById("map-tooltip");
}

/**
 * Show the loading skeleton on the region page.
 */
export function showRegionLoading() {
  if (loadingEl) loadingEl.hidden = false;
  if (mapContainer) mapContainer.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
}

/**
 * Show the empty state.
 */
export function showRegionEmpty() {
  if (loadingEl) loadingEl.hidden = true;
  if (mapContainer) mapContainer.hidden = true;
  if (emptyEl) emptyEl.hidden = false;
}

/**
 * Render a single map region: background image + pins.
 *
 * @param {Object} map - The map object from the API with embedded pins.
 */
export function renderRegion(map) {
  if (!mapContainer || !mapImageEl || !pinsLayer) return;

  if (!map) {
    showRegionEmpty();
    return;
  }

  batchWrite(() => {
    // Set the map image
    mapImageEl.src = map.image_path || "";
    mapImageEl.alt = map.description
      ? `Map of ${map.map_name} — ${map.description}`
      : `Map of ${map.map_name}`;

    // Update page title
    document.getElementById("map-page-title").textContent =
      map.map_name || "Map";

    // Render pins
    pinsLayer.innerHTML = "";
    const pins = map.pins || [];
    for (const pin of pins) {
      const pinEl = createPinElement(pin);
      pinsLayer.appendChild(pinEl);
    }

    // Render region nav links
    renderRegionNav(map.map_key);

    // Visibility
    if (loadingEl) loadingEl.hidden = true;
    mapContainer.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
  });
}

/**
 * Create a single pin element.
 *
 * @param {Object} pin
 * @returns {HTMLElement}
 */
function createPinElement(pin) {
  const hasEvidence = pin.evidence_slug && pin.evidence_title;

  const el = createElement("button", {
    className: "map-pin",
    style: `left:${pin.x}%;top:${pin.y}%`,
    "aria-label": pin.label || "Map pin",
    title: pin.label || "",
    dataset: {
      pinId: String(pin.id),
      evidenceSlug: pin.evidence_slug || "",
      evidenceTitle: pin.evidence_title || "",
      label: pin.label || "",
    },
  });

  // Label below the pin dot
  if (pin.label) {
    const labelEl = createElement(
      "span",
      {
        className: "map-pin-label",
      },
      [pin.label],
    );
    el.appendChild(labelEl);
  }

  return el;
}

/**
 * Render the region navigation links for neighbouring maps.
 *
 * @param {string} currentKey - The map_key of the currently displayed map.
 */
function renderRegionNav(currentKey) {
  const nav = document.getElementById("region-nav");
  if (!nav) return;

  const keys = ["roman-empire", "levant", "judea", "galilee", "jerusalem"];
  const idx = keys.indexOf(currentKey);
  const prevKey = idx > 0 ? keys[idx - 1] : null;
  const nextKey = idx < keys.length - 1 ? keys[idx + 1] : null;

  nav.innerHTML = "";

  if (prevKey) {
    const label = MAP_LABELS[prevKey] || prevKey;
    nav.appendChild(
      createElement(
        "a",
        {
          className: "btn btn--secondary maps-nav-link maps-nav-link--prev",
          href: `/evidence/maps/${prevKey}.html`,
        },
        [`← ${label}`],
      ),
    );
  }

  // Current label
  nav.appendChild(
    createElement("span", { className: "maps-nav-current" }, [
      MAP_LABELS[currentKey] || currentKey,
    ]),
  );

  if (nextKey) {
    const label = MAP_LABELS[nextKey] || nextKey;
    nav.appendChild(
      createElement(
        "a",
        {
          className: "btn btn--secondary maps-nav-link maps-nav-link--next",
          href: `/evidence/maps/${nextKey}.html`,
        },
        [`${label} →`],
      ),
    );
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Show an empty state in the overview grid.
 *
 * @param {HTMLElement} container
 */
function showEmptyState(container) {
  container.innerHTML = "";
  container.appendChild(
    createElement("div", { className: "empty-state" }, [
      createElement("p", { className: "empty-state-message" }, [
        "No maps available yet.",
      ]),
    ]),
  );
}

// ─── Data-attribute auto-init ──────────────────────────────────────────────────

/**
 * Initialise the map region page from data attributes on `<body>`.
 *
 * Reads `data-map-key` to pre-select a region and `data-map-zoom`
 * (optional) to apply an initial zoom factor (e.g. "2").
 *
 * Used by SEO-friendly region and zoom-variant pages.
 */
export async function initFromDataAttributes() {
  initRegion();

  const mapKey = document.body.dataset.mapKey;
  if (!mapKey) {
    showToast("No map specified.", "error");
    showRegionEmpty();
    return;
  }

  showRegionLoading();

  const { data, error } = await fetchMapByKey(mapKey);

  if (error) {
    showToast("Failed to load map. Please try again.", "error");
    showRegionEmpty();
    return;
  }

  renderRegion(data);

  // Wire zoom/pan interactions
  setupInteractions();

  // Apply initial zoom if data-map-zoom is set
  const zoomAttr = document.body.dataset.mapZoom;
  if (zoomAttr) {
    const zoom = parseFloat(zoomAttr);
    if (!isNaN(zoom)) {
      applyInitialZoom(zoom);
    }
  }
}

/**
 * Apply an initial zoom level to the pins layer.
 *
 * This sets the transform directly (scale only, no translate) so
 * that the region appears pre-zoomed on page load. Subsequent zoom
 * controls in maps-interactions.js will operate relative to their
 * internal state (which starts at 1.0).
 *
 * @param {number} zoom - Zoom factor (e.g. 2 for 2×).
 */
function applyInitialZoom(zoom) {
  const pinsLayer = document.getElementById("map-pins");
  if (!pinsLayer) return;
  pinsLayer.style.transform = `translate(0px, 0px) scale(${zoom})`;
}
