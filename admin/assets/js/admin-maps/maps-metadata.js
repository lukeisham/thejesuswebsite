/**
 * Admin maps metadata module.
 *
 * Manages the "Map details" collapsible panel: displays and saves map_name,
 * description, and base image, plus uploads a replacement raster image via
 * POST /uploads and writes the returned path to image_path.
 *
 * All API calls go through Admin.api.* (JS-5). No innerHTML with DB values (JS-6).
 *
 * @module admin-maps/maps-metadata
 */

window.AdminMapsMetadata = {};
const Metadata = window.AdminMapsMetadata;

/* ── State ────────────────────────────────────────────────────────────────── */

/** @type {Object|null} */
let currentMap = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Cache DOM references and wire the metadata panel controls.
 */
Metadata.init = function () {
  const toggleBtn = document.getElementById("map-details-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", Metadata.togglePanel);
  }

  const saveBtn = document.getElementById("map-details-save");
  if (saveBtn) {
    saveBtn.addEventListener("click", Metadata.onSave);
  }

  const replaceInput = document.getElementById("map-image-replace");
  if (replaceInput) {
    replaceInput.addEventListener("change", Metadata.onImageSelected);
  }
};

/* ── Panel visibility ─────────────────────────────────────────────────────── */

/**
 * Toggle the metadata panel open/closed.
 */
Metadata.togglePanel = function () {
  const panel = document.getElementById("map-details-panel");
  const toggleBtn = document.getElementById("map-details-toggle");
  if (!panel || !toggleBtn) return;

  const isOpen = panel.classList.toggle("admin-maps-metadata--open");
  toggleBtn.setAttribute("aria-expanded", String(isOpen));
  toggleBtn.textContent = isOpen ? "▲ Map Details" : "▼ Map Details";
};

/* ── Loading map into the panel ────────────────────────────────────────────── */

/**
 * Refresh the metadata panel with the currently active map.
 *
 * @param {Object} map - Map object (from maps list or API fetch).
 */
Metadata.loadMap = function (map) {
  currentMap = map;
  if (!map) return;

  // Map name
  const nameInput = document.getElementById("map-details-name");
  if (nameInput) nameInput.value = map.map_name || "";

  // Description
  const descInput = document.getElementById("map-details-description");
  if (descInput) descInput.value = map.description || "";

  // Base-image preview
  const preview = document.getElementById("map-details-preview");
  if (preview && map.image_path) {
    preview.src = map.image_path;
    preview.alt = map.map_name ? "Map of " + map.map_name : "Map preview";
    preview.hidden = false;
  } else if (preview) {
    preview.hidden = true;
  }

  // Image path display
  const pathDisplay = document.getElementById("map-details-image-path");
  if (pathDisplay) {
    pathDisplay.textContent = map.image_path || "(none)";
  }

  // Clear error
  const errorEl = document.getElementById("map-details-error");
  if (errorEl) errorEl.textContent = "";

  // Clear file input
  const replaceInput = document.getElementById("map-image-replace");
  if (replaceInput) replaceInput.value = "";
};

/* ── Save ──────────────────────────────────────────────────────────────────── */

/**
 * Save metadata changes to the API.
 */
Metadata.onSave = async function () {
  if (!currentMap || !currentMap.id) return;

  const nameInput = document.getElementById("map-details-name");
  const descInput = document.getElementById("map-details-description");
  const errorEl = document.getElementById("map-details-error");

  const mapName = nameInput ? nameInput.value.trim() : "";
  if (mapName === "") {
    if (errorEl) errorEl.textContent = "Map name cannot be empty.";
    if (nameInput) nameInput.focus();
    return;
  }

  const payload = {
    map_name: mapName,
    description: descInput ? descInput.value.trim() : "",
  };

  if (errorEl) errorEl.textContent = "";

  try {
    const updated = await Admin.api.put("/maps/" + currentMap.id, payload);
    currentMap.map_name = updated.map_name;
    currentMap.description = updated.description;

    // Update page title
    const titleEl = document.getElementById("map-editor-title");
    if (titleEl) titleEl.textContent = updated.map_name || "Map Editor";

    // Update selector option
    const selector = document.getElementById("map-selector");
    if (selector && selector.selectedOptions.length > 0) {
      const opt = selector.selectedOptions[0];
      opt.textContent =
        updated.map_name +
        " (" +
        (updated.pin_count != null ? updated.pin_count : "?") +
        " pins)";
    }

    // Refresh the canvas image alt and the panel
    Metadata.loadMap(updated);
  } catch (e) {
    console.error("Failed to save map metadata:", e);
    if (errorEl) errorEl.textContent = e.message || "Save failed.";
  }
};

/* ── Image replacement ─────────────────────────────────────────────────────── */

/**
 * Handle file selection for image replacement. Uploads via Admin.uploadImage
 * and writes the returned path to map.image_path.
 */
Metadata.onImageSelected = async function () {
  if (!currentMap || !currentMap.id) return;

  const input = document.getElementById("map-image-replace");
  const errorEl = document.getElementById("map-details-error");
  if (!input || !input.files || input.files.length === 0) return;

  const file = input.files[0];
  if (!file.type.startsWith("image/")) {
    if (errorEl) errorEl.textContent = "Please select an image file (PNG, JPG, GIF, WebP).";
    input.value = "";
    return;
  }

  if (errorEl) errorEl.textContent = "";

  try {
    const result = await Admin.uploadImage(file);
    const imagePath = result.image_path;

    // Update the map's image_path via the API
    const updated = await Admin.api.put("/maps/" + currentMap.id, {
      image_path: imagePath,
    });

    currentMap.image_path = updated.image_path;

    // Reload the canvas image
    if (window.AdminMapsRender && window.AdminMapsRender.loadMap) {
      try {
        await window.AdminMapsRender.loadMap(updated);
      } catch (e) {
        console.error("Failed to reload map image:", e);
      }
    }

    // Refresh the panel
    Metadata.loadMap(updated);
  } catch (e) {
    console.error("Failed to replace map image:", e);
    if (errorEl) errorEl.textContent = e.message || "Image upload failed.";
  } finally {
    input.value = "";
  }
};
