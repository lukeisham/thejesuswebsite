/**
 * Admin maps gallery module.
 *
 * Renders a card-gallery landing view matching the public /evidence/maps/
 * index.  Click a card to open that map's canvas editor.  Depends on
 * AdminMapsRegions for map data and map switching.
 *
 * @module admin-maps/maps-gallery
 */

window.AdminMapsGallery = {};
const Gallery = window.AdminMapsGallery;

/** @type {HTMLElement|null} */
let galleryEl = null;

/** @type {HTMLElement|null} */
let gridEl = null;

/** @type {boolean} */
let isVisible = true;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Cache DOM and wire the "← All Maps" button.
 */
Gallery.init = function () {
  galleryEl = document.getElementById("maps-gallery");
  gridEl = document.getElementById("maps-gallery-grid");

  var backBtn = document.getElementById("maps-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      Gallery.show();
    });
  }
};

/* ── Render ────────────────────────────────────────────────────────────────── */

/**
 * Build gallery cards from AdminMapsRegions.getMaps() and render them.
 */
Gallery.render = function () {
  if (!gridEl) return;

  gridEl.innerHTML = "";

  var maps = [];
  if (window.AdminMapsRegions && window.AdminMapsRegions.getMaps) {
    maps = window.AdminMapsRegions.getMaps();
  }

  if (maps.length === 0) {
    var empty = document.createElement("p");
    empty.textContent = "No maps available.";
    empty.style.color = "var(--text-muted)";
    gridEl.appendChild(empty);
    return;
  }

  for (var i = 0; i < maps.length; i++) {
    var card = Gallery._createCard(maps[i]);
    gridEl.appendChild(card);
  }
};

/**
 * Create a single map card element.
 *
 * @param {Object} map
 * @returns {HTMLButtonElement}
 */
Gallery._createCard = function (map) {
  var card = document.createElement("button");
  card.className = "admin-map-card";
  card.type = "button";
  card.setAttribute("aria-label", "Open " + (map.map_name || "map"));

  // Thumbnail
  if (map.image_path) {
    var img = document.createElement("img");
    img.className = "admin-map-card__thumbnail";
    img.src = map.image_path;
    img.alt = "";
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    var placeholder = document.createElement("div");
    placeholder.className = "admin-map-card__thumbnail";
    placeholder.style.background = "var(--bg-surface-alt)";
    card.appendChild(placeholder);
  }

  // Body
  var body = document.createElement("div");
  body.className = "admin-map-card__body";

  var title = document.createElement("h3");
  title.className = "admin-map-card__title";
  title.textContent = map.map_name || "Untitled Map";
  body.appendChild(title);

  if (map.description) {
    var desc = document.createElement("p");
    desc.className = "admin-map-card__description";
    desc.textContent = map.description;
    body.appendChild(desc);
  }

  // Pin count
  var count = document.createElement("p");
  count.className = "admin-map-card__pin-count";
  var n = map.pin_count != null ? map.pin_count : 0;
  count.textContent = n === 1 ? "1 pin" : n + " pins";
  body.appendChild(count);

  card.appendChild(body);

  // Click handler
  card.addEventListener("click", function () {
    Gallery.hide();
    if (window.AdminMapsRegions && window.AdminMapsRegions.switchToMap) {
      window.AdminMapsRegions.switchToMap(map.map_key);
    }
  });

  return card;
};

/* ── Show / Hide ───────────────────────────────────────────────────────────── */

/**
 * Show the gallery and hide the editor chrome.  Guards against unsaved
 * staged changes before switching away.
 */
Gallery.show = function () {
  // Warn if there are unsaved changes
  if (
    window.AdminMapsStaged &&
    window.AdminMapsStaged.hasChanges &&
    window.AdminMapsStaged.hasChanges()
  ) {
    if (
      !confirm(
        "You have unsaved pin changes. Returning to the gallery will discard them. Continue?",
      )
    ) {
      return;
    }
  }

  // Close any open edit panel
  if (window.AdminMapsPins && window.AdminMapsPins.closeEditPanel) {
    window.AdminMapsPins.closeEditPanel();
  }

  // Show gallery
  if (galleryEl) galleryEl.hidden = false;

  // Hide editor chrome
  var toolbar = document.querySelector(".admin-maps-toolbar");
  var canvas = document.getElementById("map-canvas");
  var loading = document.getElementById("map-loading");
  var details = document.getElementById("map-details-panel");
  var pen = document.getElementById("holding-pen");

  if (toolbar) toolbar.hidden = true;
  if (canvas) canvas.hidden = true;
  if (loading) loading.hidden = true;
  if (details) details.hidden = true;
  if (pen) pen.hidden = true;

  isVisible = true;

  // Re-render in case maps data changed
  Gallery.render();
};

/**
 * Hide the gallery and reveal the editor chrome.
 */
Gallery.hide = function () {
  if (galleryEl) galleryEl.hidden = true;

  var main = document.querySelector("main");
  var toolbar = document.querySelector(".admin-maps-toolbar");
  var loading = document.getElementById("map-loading");
  var pen = document.getElementById("holding-pen");

  if (main) main.hidden = false;
  if (toolbar) toolbar.hidden = false;
  // canvas is shown by switchToMap after loading
  if (loading) loading.hidden = false;
  if (pen) pen.hidden = false;

  isVisible = false;
};
