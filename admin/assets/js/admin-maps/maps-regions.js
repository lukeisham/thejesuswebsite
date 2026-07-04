/**
 * Admin maps region module.
 *
 * Manages the map-scale selector dropdown (switch between the five maps:
 * roman-empire → levant → judea → galilee → jerusalem) plus region
 * highlight/boundary helpers.
 *
 * @module admin-maps/maps-regions
 */

window.AdminMapsRegions = {};
const Regions = window.AdminMapsRegions;

/* ── Map ordering ─────────────────────────────────────────────────────────── */

/** Canonical map scale order, from broadest to most detailed. */
const MAP_KEYS = ["roman-empire", "levant", "judea", "galilee", "jerusalem"];

/** @type {Array<Object>} */
let allMaps = [];

/** @type {string|null} */
let currentMapKey = null;

/* ── Initialisation ───────────────────────────────────────────────────────── */

/**
 * Cache DOM and wire the map selector dropdown.
 */
Regions.init = function () {
  const selector = document.getElementById("map-selector");
  if (selector) {
    selector.addEventListener("change", Regions.onMapChange);
  }

  const prevBtn = document.getElementById("map-prev-btn");
  if (prevBtn) prevBtn.addEventListener("click", Regions.onPrevMap);

  const nextBtn = document.getElementById("map-next-btn");
  if (nextBtn) nextBtn.addEventListener("click", Regions.onNextMap);
};

/* ── Map loading ──────────────────────────────────────────────────────────── */

/**
 * Fetch all maps and populate the selector dropdown.
 *
 * @returns {Promise<void>}
 */
Regions.loadMaps = async function () {
  try {
    allMaps = await Admin.api.get("/maps");
  } catch (e) {
    console.error("Failed to load maps:", e);
    allMaps = [];
  }

  // Sort into canonical order
  allMaps.sort(function (a, b) {
    return MAP_KEYS.indexOf(a.map_key) - MAP_KEYS.indexOf(b.map_key);
  });

  Regions.populateSelector();
};

/**
 * Fill the map selector dropdown with options.
 */
Regions.populateSelector = function () {
  const selector = document.getElementById("map-selector");
  if (!selector) return;

  selector.innerHTML = "";

  for (let i = 0; i < allMaps.length; i++) {
    const map = allMaps[i];
    const option = document.createElement("option");
    option.value = map.map_key;
    option.textContent = map.map_name + " (" + (map.pin_count || 0) + " pins)";
    selector.appendChild(option);
  }
};

/**
 * Switch to a map by key. Loads the map image and pins.
 *
 * @param {string} mapKey
 * @returns {Promise<void>}
 */
Regions.switchToMap = async function (mapKey) {
  if (mapKey === currentMapKey) return;

  let map = null;
  for (let i = 0; i < allMaps.length; i++) {
    if (allMaps[i].map_key === mapKey) {
      map = allMaps[i];
      break;
    }
  }

  // If not in the cache, fetch it
  if (!map) {
    try {
      map = await Admin.api.get("/maps/" + encodeURIComponent(mapKey));
    } catch (e) {
      console.error("Failed to load map:", e);
      return;
    }
  }

  currentMapKey = mapKey;

  // Update page title
  const titleEl = document.getElementById("map-editor-title");
  if (titleEl) titleEl.textContent = map.map_name || "Map Editor";

  // Update selector
  const selector = document.getElementById("map-selector");
  if (selector) selector.value = mapKey;

  // Update navigation button states
  Regions.updateNavButtons();

  // Show loading
  const loadingEl = document.getElementById("map-loading");
  const canvas = document.getElementById("map-canvas");
  if (loadingEl) loadingEl.hidden = false;
  if (canvas) canvas.hidden = true;

  // Close any open edit panel
  if (window.AdminMapsPins && window.AdminMapsPins.closeEditPanel) {
    window.AdminMapsPins.closeEditPanel();
  }

  try {
    await window.AdminMapsRender.loadMap(map);
    await window.AdminMapsPins.loadPins(map.id);

    if (loadingEl) loadingEl.hidden = true;
    if (canvas) canvas.hidden = false;
  } catch (e) {
    console.error("Failed to switch map:", e);
    if (loadingEl) loadingEl.hidden = true;
  }
};

/* ── Navigation ───────────────────────────────────────────────────────────── */

/**
 * Handler for the map selector dropdown change event.
 */
Regions.onMapChange = function () {
  const selector = document.getElementById("map-selector");
  if (!selector) return;
  Regions.switchToMap(selector.value);
};

/**
 * Navigate to the previous map in the canonical order.
 */
Regions.onPrevMap = function () {
  const idx = MAP_KEYS.indexOf(currentMapKey);
  if (idx > 0) {
    Regions.switchToMap(MAP_KEYS[idx - 1]);
  }
};

/**
 * Navigate to the next map in the canonical order.
 */
Regions.onNextMap = function () {
  const idx = MAP_KEYS.indexOf(currentMapKey);
  if (idx < MAP_KEYS.length - 1) {
    Regions.switchToMap(MAP_KEYS[idx + 1]);
  }
};

/**
 * Enable or disable the prev/next navigation buttons based on position
 * in the canonical order.
 */
Regions.updateNavButtons = function () {
  const idx = MAP_KEYS.indexOf(currentMapKey);
  const prevBtn = document.getElementById("map-prev-btn");
  const nextBtn = document.getElementById("map-next-btn");

  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx >= MAP_KEYS.length - 1;
};

/* ── Public accessors ─────────────────────────────────────────────────────── */

/**
 * Get the currently active map key.
 *
 * @returns {string|null}
 */
Regions.getCurrentMapKey = function () {
  return currentMapKey;
};

/**
 * Get all loaded maps.
 *
 * @returns {Array<Object>}
 */
Regions.getMaps = function () {
  return allMaps;
};
