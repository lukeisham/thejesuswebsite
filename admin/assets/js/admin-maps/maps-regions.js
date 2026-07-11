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
  allMaps.sort(
    (a, b) => MAP_KEYS.indexOf(a.map_key) - MAP_KEYS.indexOf(b.map_key),
  );

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

  // Warn if there are unsaved changes
  if (
    window.AdminMapsStaged &&
    window.AdminMapsStaged.hasChanges &&
    window.AdminMapsStaged.hasChanges()
  ) {
    if (
      !confirm(
        "You have unsaved pin changes. Switching maps will discard them. Continue?",
      )
    ) {
      // Revert selector to current map
      const sel = document.getElementById("map-selector");
      if (sel) sel.value = currentMapKey;
      return;
    }
  }

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

    // Refresh the metadata panel (if the module is loaded)
    if (window.AdminMapsMetadata && window.AdminMapsMetadata.loadMap) {
      window.AdminMapsMetadata.loadMap(map);
    }

    // Load the holding pen for this map
    if (window.AdminMapsHoldingPen && window.AdminMapsHoldingPen.loadForMap) {
      window.AdminMapsHoldingPen.loadForMap(map.id);
    }

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
