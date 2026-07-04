/**
 * Admin maps render module.
 *
 * Loads the selected map's background image into the editor canvas and exposes
 * pure helpers to convert between screen pixels and stored x/y image percentages.
 * All coordinate functions are DOM-free and exported so tests can exercise them
 * without a browser (see admin/tests/maps.test.js).
 *
 * @module admin-maps/maps-render
 */

window.AdminMapsRender = {};
const Render = window.AdminMapsRender;

/* ── DOM state (browser-only) ─────────────────────────────────────────────── */

/** @type {HTMLImageElement|null} */
let mapImage = null;

/** @type {HTMLElement|null} */
let canvasContainer = null;

/**
 * Cache DOM references for the editor canvas.
 * Called once on page load.
 */
Render.init = function () {
  mapImage = document.getElementById("map-canvas-image");
  canvasContainer = document.getElementById("map-canvas");
};

/**
 * Load a map background image into the canvas.
 *
 * @param {Object} map - Map object from GET /maps/:map_key.
 * @returns {Promise<void>}
 */
Render.loadMap = function (map) {
  return new Promise(function (resolve, reject) {
    if (!mapImage) {
      reject(new Error("Canvas image element not found."));
      return;
    }
    mapImage.src = map.image_path || "";
    mapImage.alt = map.map_name || "Map";
    mapImage.dataset.mapId = String(map.id);
    mapImage.onload = function () { resolve(); };
    mapImage.onerror = function () {
      reject(new Error("Failed to load map image: " + (map.image_path || "")));
    };
  });
};

/* ── Pure coordinate helpers ──────────────────────────────────────────────── */

/**
 * Image rectangle descriptor — the bounding box of the map image inside
 * the canvas container, in screen pixels.
 *
 * @typedef {Object} ImageRect
 * @property {number} width  - Rendered image width in pixels.
 * @property {number} height - Rendered image height in pixels.
 * @property {number} left   - Left offset of the image relative to the canvas container.
 * @property {number} top    - Top offset of the image relative to the canvas container.
 */

/**
 * Measure the current bounding rect of the map image relative to its container.
 * Returns null if the image is not loaded.
 *
 * @returns {ImageRect|null}
 */
Render.getImageRect = function () {
  if (!mapImage || !mapImage.complete || mapImage.naturalWidth === 0) return null;

  var containerRect = canvasContainer.getBoundingClientRect();
  var imageRect = mapImage.getBoundingClientRect();

  return {
    width: imageRect.width,
    height: imageRect.height,
    left: imageRect.left - containerRect.left,
    top: imageRect.top - containerRect.top,
  };
};

/**
 * Convert a screen (x, y) coordinate relative to the canvas container into a
 * percentage position on the map image.
 *
 * @param {number} screenX   - X pixel relative to the canvas container.
 * @param {number} screenY   - Y pixel relative to the canvas container.
 * @param {ImageRect} rect   - The image bounding rect from getImageRect().
 * @returns {{x: number, y: number}}  - x and y as percentages (0-100).
 */
Render.screenToPercent = function (screenX, screenY, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  var x = ((screenX - rect.left) / rect.width) * 100;
  var y = ((screenY - rect.top) / rect.height) * 100;
  return {
    x: clampPercent(x),
    y: clampPercent(y),
  };
};

/**
 * Convert a stored (x, y) percentage into a screen coordinate relative to
 * the canvas container.
 *
 * @param {number} percentX  - X percentage (0-100).
 * @param {number} percentY  - Y percentage (0-100).
 * @param {ImageRect} rect   - The image bounding rect from getImageRect().
 * @returns {{screenX: number, screenY: number}}
 */
Render.percentToScreen = function (percentX, percentY, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return { screenX: 0, screenY: 0 };
  }
  return {
    screenX: rect.left + (percentX / 100) * rect.width,
    screenY: rect.top + (percentY / 100) * rect.height,
  };
};

/**
 * Build a pin payload for the API from a screen click.
 *
 * @param {number} mapId     - The map's id.
 * @param {number} screenX   - X pixel relative to the canvas container.
 * @param {number} screenY   - Y pixel relative to the canvas container.
 * @param {ImageRect} rect   - The image bounding rect.
 * @returns {{map_id: number, x: number, y: number, label: string|null, evidence_id: number|null}}
 */
Render.buildPinPayload = function (mapId, screenX, screenY, rect) {
  var pct = Render.screenToPercent(screenX, screenY, rect);
  return {
    map_id: mapId,
    x: Math.round(pct.x * 100) / 100,
    y: Math.round(pct.y * 100) / 100,
    label: null,
    evidence_id: null,
  };
};

/* ── Internal helpers ─────────────────────────────────────────────────────── */

/**
 * Clamp a percentage to [0, 100].
 *
 * @param {number} value
 * @returns {number}
 */
function clampPercent(value) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
