/**
 * Admin maps pin module.
 *
 * Places a pin on canvas click, drags to reposition, edits label and linked
 * evidence, and creates/updates/deletes via POST/PUT/DELETE /maps/pins.
 * Depends on AdminMapsRender for coordinate conversion.
 *
 * @module admin-maps/maps-pins
 */

window.AdminMapsPins = {};
const Pins = window.AdminMapsPins;

/* ── State ────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} */
let pins = [];

/** @type {number|null} */
let currentMapId = null;

/** @type {Object|null} */
let selectedPinId = null;

/** @type {HTMLElement|null} */
let pinsLayer = null;

/** @type {boolean} */
let addingMode = false;

/** @type {Object|null}  Pin currently being dragged. */
let dragState = null;

/* ── Initialisation ───────────────────────────────────────────────────────── */

/**
 * Cache DOM references and wire canvas click handler.
 */
Pins.init = function () {
  pinsLayer = document.getElementById("map-pins-layer");

  const canvas = document.getElementById("map-canvas");
  if (canvas) {
    canvas.addEventListener("click", Pins.onCanvasClick);
  }

  // Pin-edit panel actions
  const saveBtn = document.getElementById("pin-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", Pins.onSavePin);

  const deleteBtn = document.getElementById("pin-delete-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", Pins.onDeletePin);

  const cancelBtn = document.getElementById("pin-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", Pins.closeEditPanel);

  const closePanelBtn = document.getElementById("pin-panel-close");
  if (closePanelBtn)
    closePanelBtn.addEventListener("click", Pins.closeEditPanel);

  const addPinBtn = document.getElementById("add-pin-btn");
  if (addPinBtn) addPinBtn.addEventListener("click", Pins.toggleAddMode);
};

/* ── Pin loading ──────────────────────────────────────────────────────────── */

/**
 * Fetch pins for a map and render them.
 *
 * @param {number} mapId
 * @returns {Promise<void>}
 */
Pins.loadPins = async function (mapId) {
  currentMapId = mapId;
  selectedPinId = null;
  Pins.closeEditPanel();

  try {
    pins = await Admin.api.get("/maps/admin/pins/by-map/" + mapId);
  } catch (e) {
    console.error("Failed to load pins:", e);
    pins = [];
  }

  Pins.renderPins();
};

/**
 * Render all pins into the pins layer.
 */
Pins.renderPins = function () {
  if (!pinsLayer) return;
  pinsLayer.innerHTML = "";

  // Render existing (saved) pins
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const el = Pins.createPinElement(pin);
    pinsLayer.appendChild(el);
  }

  // Render staged creates (holding-pen drops / staged add-mode clicks)
  if (window.AdminMapsStaged) {
    const staged = window.AdminMapsStaged.getCreates();
    for (let j = 0; j < staged.length; j++) {
      const s = staged[j];
      const sel = Pins._createStagedPinElement(s);
      pinsLayer.appendChild(sel);
    }
  }
};

/**
 * Create a DOM element for a single pin.
 *
 * @param {Object} pin
 * @returns {HTMLElement}
 */
Pins.createPinElement = function (pin) {
  const el = document.createElement("button");
  el.className = "admin-map-pin";
  if (pin.timeline_era) {
    el.classList.add("era--" + AdminMapsEraUtils.eraToKebab(pin.timeline_era));
  }
  if (pin.id === selectedPinId) {
    el.classList.add("admin-map-pin--selected");
  }

  // Draft indicator: evidence-linked pin whose evidence is unpublished
  if (
    pin.evidence_id != null &&
    pin.evidence_published !== undefined &&
    !pin.evidence_published
  ) {
    el.classList.add("admin-map-pin--draft");
    el.setAttribute("title", (pin.label || "") + " (Draft — not public)");
  } else {
    el.setAttribute("title", pin.label || "");
  }

  el.style.left = pin.x + "%";
  el.style.top = pin.y + "%";
  el.setAttribute("aria-label", pin.label || "Map pin");
  el.dataset.pinId = String(pin.id);
  el.dataset.evidenceSlug = pin.evidence_slug || "";
  el.dataset.evidenceTitle = pin.evidence_title || "";
  el.dataset.label = pin.label || "";

  // Label span below the dot
  if (pin.label) {
    const labelEl = document.createElement("span");
    labelEl.className = "admin-map-pin-label";
    labelEl.textContent = pin.label;
    el.appendChild(labelEl);
  }

  el.addEventListener("click", (e) => {
    Pins.onPinClick(e, pin);
  });

  // Drag listeners
  el.addEventListener("mousedown", (e) => {
    Pins.onPinMouseDown(e, pin);
  });

  // Right-click → "Remove from Map" (with confirmation for saved pins)
  el.addEventListener("contextmenu", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.AdminMapsPinMenu || !window.AdminMapsPinMenu.open) return;

    var result = await window.AdminMapsPinMenu.open(e.clientX, e.clientY, [
      { label: "Remove from Map", danger: true },
    ]);
    if (!result) return;

    if (!confirm("Delete this pin? This cannot be undone.")) return;

    await Pins.removePin(pin.id);
  });

  return el;
};

/**
 * Create a DOM element for a staged (not yet saved) pin.
 * Styled with a dashed border to distinguish from saved pins.
 *
 * @param {Object} staged
 * @returns {HTMLElement}
 */
Pins._createStagedPinElement = function (staged) {
  const el = document.createElement("button");
  el.className = "admin-map-pin admin-map-pin--staged";
  if (staged.timeline_era) {
    el.classList.add(
      "era--" + AdminMapsEraUtils.eraToKebab(staged.timeline_era),
    );
  }
  el.style.left = staged.x + "%";
  el.style.top = staged.y + "%";
  el.setAttribute("aria-label", staged.label || "Staged pin");
  el.title = staged.label || "";
  el.dataset.tempId = staged._tempId;

  // Label span
  if (staged.label) {
    const labelEl = document.createElement("span");
    labelEl.className = "admin-map-pin-label";
    labelEl.textContent = staged.label;
    el.appendChild(labelEl);
  }

  // Drag — reuse the same handlers, generalized for staged pins
  el.addEventListener("mousedown", function (e) {
    Pins.onPinMouseDown(e, staged);
  });

  // Right-click → "Remove from Map" (no confirmation for unsaved pins)
  el.addEventListener("contextmenu", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.AdminMapsPinMenu || !window.AdminMapsPinMenu.open) return;

    var result = await window.AdminMapsPinMenu.open(e.clientX, e.clientY, [
      { label: "Remove from Map", danger: true },
    ]);
    if (!result) return;

    // Unstage the create — no API call needed
    if (window.AdminMapsStaged && window.AdminMapsStaged.unstageCreate) {
      window.AdminMapsStaged.unstageCreate(staged._tempId);
    }

    // Refresh holding pen so the evidence chip reappears
    if (window.AdminMapsHoldingPen && window.AdminMapsHoldingPen.loadForMap) {
      var mapId = window.AdminMapsStaged && window.AdminMapsStaged._getCurrentMapId
        ? window.AdminMapsStaged._getCurrentMapId() : null;
      if (mapId) window.AdminMapsHoldingPen.loadForMap(mapId);
    }

    Pins.renderPins();
  });

  return el;
};

/* ── Adding mode ──────────────────────────────────────────────────────────── */

/**
 * Toggle "Add Pin" mode. When active, the next canvas click places a new pin.
 */
Pins.toggleAddMode = function () {
  addingMode = !addingMode;
  const btn = document.getElementById("add-pin-btn");
  const canvas = document.getElementById("map-canvas");
  if (btn) {
    btn.classList.toggle("admin-maps-toolbar__btn--active", addingMode);
    btn.textContent = addingMode ? "Cancel Add" : "Add Pin";
  }
  if (canvas) {
    canvas.classList.toggle("admin-map-canvas--adding", addingMode);
  }
};

/**
 * Canvas click handler. If in adding mode, create a new pin at the click position.
 *
 * @param {MouseEvent} e
 */
Pins.onCanvasClick = async function (e) {
  if (!addingMode || !currentMapId) return;

  // Don't fire if we clicked on an existing pin
  if (e.target.closest(".admin-map-pin")) return;

  const rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  const containerRect = document
    .getElementById("map-canvas")
    .getBoundingClientRect();
  const screenX = e.clientX - containerRect.left;
  const screenY = e.clientY - containerRect.top;

  const payload = window.AdminMapsRender.buildPinPayload(
    currentMapId,
    screenX,
    screenY,
    rect,
  );

  try {
    // If staging is available, stage the pin instead of POSTing immediately
    if (window.AdminMapsStaged) {
      // Build a minimal evidence-like object for staging
      const stagedEvidence = { id: null, title: null, timeline_era: null };
      const staged = window.AdminMapsStaged.stageCreate(
        currentMapId,
        stagedEvidence,
        payload.x,
        payload.y,
      );
      staged.label = null; // No label for clicked pins
      Pins.renderPins();
      Pins.toggleAddMode();
      return;
    }

    const created = await Admin.api.post("/maps/pins", payload);
    pins.push(created);
    Pins.renderPins();
    Pins.selectPin(created.id);
    Pins.toggleAddMode();
  } catch (e) {
    console.error("Failed to create pin:", e);
  }
};

/* ── Pin selection & edit panel ───────────────────────────────────────────── */

/**
 * Handle click on an existing pin — open the edit panel.
 *
 * @param {MouseEvent} e
 * @param {Object} pin
 */
Pins.onPinClick = function (e, pin) {
  if (addingMode) return;
  e.stopPropagation();
  Pins.selectPin(pin.id);
};

/**
 * Select a pin and open the edit panel.
 *
 * @param {number} pinId
 */
Pins.selectPin = function (pinId) {
  selectedPinId = pinId;
  Pins.renderPins();
  Pins.openEditPanel(pinId);
};

/**
 * Open the slide-in pin edit panel and populate fields.
 *
 * @param {number} pinId
 */
Pins.openEditPanel = function (pinId) {
  const panel = document.getElementById("pin-edit-panel");
  if (!panel) return;

  let pin = null;
  for (let i = 0; i < pins.length; i++) {
    if (pins[i].id === pinId) {
      pin = pins[i];
      break;
    }
  }
  if (!pin) return;

  document.getElementById("pin-label-input").value = pin.label || "";
  document.getElementById("pin-evidence-input").value =
    pin.evidence_id != null ? String(pin.evidence_id) : "";

  // Geo-anchor fields
  const latInput = document.getElementById("pin-lat-input");
  const lngInput = document.getElementById("pin-lng-input");
  const geoInfo = document.getElementById("pin-geo-info");

  if (latInput && lngInput) {
    latInput.value = pin.lat != null ? String(pin.lat) : "";
    lngInput.value = pin.lng != null ? String(pin.lng) : "";
  }

  // Show geo-anchored state
  if (geoInfo) {
    if (pin.lat != null && pin.lng != null) {
      geoInfo.textContent = "Geo-anchored: pin position derived from lat/lng.";
    } else {
      geoInfo.textContent =
        "Percentage-only: pin was placed by eye or dragged on the map.";
    }
  }

  // Show evidence section if evidence is linked
  const evidenceInfo = document.getElementById("pin-evidence-info");
  if (evidenceInfo) {
    evidenceInfo.textContent = pin.evidence_title
      ? "Linked: " + pin.evidence_title + " (" + pin.evidence_slug + ")"
      : "";
  }

  panel.classList.add("admin-pin-panel--open");
};

/**
 * Close the pin edit panel and deselect.
 */
Pins.closeEditPanel = function () {
  const panel = document.getElementById("pin-edit-panel");
  if (panel) panel.classList.remove("admin-pin-panel--open");
  selectedPinId = null;
  Pins.renderPins();
};

/* ── Save / Delete pin ────────────────────────────────────────────────────── */

/**
 * Save the edit panel form data back to the API.
 */
Pins.onSavePin = async function () {
  if (!selectedPinId) return;

  const label = document.getElementById("pin-label-input").value.trim();
  const evidenceRaw = document
    .getElementById("pin-evidence-input")
    .value.trim();
  const latRaw = document.getElementById("pin-lat-input").value.trim();
  const lngRaw = document.getElementById("pin-lng-input").value.trim();

  const payload = { label: label || null };
  if (evidenceRaw !== "") {
    const evidenceId = Number(evidenceRaw);
    payload.evidence_id = Number.isFinite(evidenceId) ? evidenceId : null;
  } else {
    payload.evidence_id = null;
  }

  // Include lat/lng if both are filled, validate before sending
  if (latRaw !== "" || lngRaw !== "") {
    // One field filled but not the other — both required for geo-anchoring.
    if (latRaw === "" || lngRaw === "") {
      if (errorEl)
        errorEl.textContent =
          "Both latitude and longitude are required for geo-anchoring.";
      return;
    }
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (errorEl)
        errorEl.textContent = "Latitude and longitude must be valid numbers.";
      return;
    }
    payload.lat = lat;
    payload.lng = lng;
  }

  // Clear error state
  const errorEl = document.getElementById("pin-edit-error");
  if (errorEl) errorEl.textContent = "";

  try {
    const updated = await Admin.api.put("/maps/pins/" + selectedPinId, payload);

    // Update local state
    for (let i = 0; i < pins.length; i++) {
      if (pins[i].id === updated.id) {
        pins[i] = updated;
        break;
      }
    }

    Pins.closeEditPanel();
    Pins.renderPins();
  } catch (e) {
    console.error("Failed to update pin:", e);
    if (errorEl) errorEl.textContent = e.message;
  }
};

/**
 * Delete the selected pin.
 */
Pins.onDeletePin = async function () {
  if (!selectedPinId) return;
  if (!confirm("Delete this pin? This cannot be undone.")) return;
  await Pins.removePin(selectedPinId);
  Pins.closeEditPanel();
  Pins.renderPins();
};

/**
 * Remove a saved pin by id (delete from API and local state).
 * Reusable from both the edit-panel Delete button and the
 * right-click context menu.
 *
 * @param {number} pinId
 * @returns {Promise<void>}
 */
Pins.removePin = async function (pinId) {
  const errorEl = document.getElementById("pin-edit-error");
  if (errorEl) errorEl.textContent = "";

  try {
    await Admin.api.del("/maps/pins/" + pinId);
    pins = pins.filter(function (p) { return p.id !== pinId; });
    // Refresh the holding pen so the evidence chip reappears
    if (window.AdminMapsHoldingPen && window.AdminMapsHoldingPen.loadForMap) {
      var mapId = window.AdminMapsStaged && window.AdminMapsStaged._getCurrentMapId
        ? window.AdminMapsStaged._getCurrentMapId() : null;
      if (mapId) window.AdminMapsHoldingPen.loadForMap(mapId);
    }
    Pins.renderPins();
  } catch (e) {
    console.error("Failed to delete pin:", e);
    if (errorEl) errorEl.textContent = e.message;
  }
};

/* ── Drag-to-reposition ───────────────────────────────────────────────────── */

/**
 * Mouse-down on a pin — begin drag.
 *
 * @param {MouseEvent} e
 * @param {Object} pin
 */
Pins.onPinMouseDown = function (e, pin) {
  if (addingMode) return;
  e.preventDefault();
  e.stopPropagation();

  dragState = {
    pin: pin,
    startX: e.clientX,
    startY: e.clientY,
  };

  document.addEventListener("mousemove", Pins.onPinMouseMove);
  document.addEventListener("mouseup", Pins.onPinMouseUp);
};

/**
 * Mouse-move during drag — update pin position visually.
 *
 * @param {MouseEvent} e
 */
Pins.onPinMouseMove = function (e) {
  if (!dragState) return;

  // Visual feedback: move the pin element — supports both saved pins
  // (data-pin-id) and staged pins (data-temp-id)
  var selector;
  if (dragState.pin._tempId) {
    selector = '[data-temp-id="' + dragState.pin._tempId + '"]';
  } else {
    selector = '[data-pin-id="' + dragState.pin.id + '"]';
  }
  const el = document.querySelector(selector);
  if (!el) return;

  const rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  const containerRect = document
    .getElementById("map-canvas")
    .getBoundingClientRect();
  let screenX = e.clientX - containerRect.left;
  let screenY = e.clientY - containerRect.top;

  // Clamp to image bounds
  screenX = Math.max(rect.left, Math.min(rect.left + rect.width, screenX));
  screenY = Math.max(rect.top, Math.min(rect.top + rect.height, screenY));

  const pct = window.AdminMapsRender.screenToPercent(screenX, screenY, rect);
  el.style.left = pct.x + "%";
  el.style.top = pct.y + "%";
};

/**
 * Mouse-up during drag — persist the new position.
 *
 * @param {MouseEvent} e
 */
Pins.onPinMouseUp = async function (e) {
  document.removeEventListener("mousemove", Pins.onPinMouseMove);
  document.removeEventListener("mouseup", Pins.onPinMouseUp);

  if (!dragState) return;

  const pin = dragState.pin;
  dragState = null;

  const rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  const containerRect = document
    .getElementById("map-canvas")
    .getBoundingClientRect();
  const screenX = e.clientX - containerRect.left;
  const screenY = e.clientY - containerRect.top;

  const pct = window.AdminMapsRender.screenToPercent(screenX, screenY, rect);

  try {
    // If this is a staged pin (has _tempId), update its position in the store
    if (pin._tempId) {
      if (window.AdminMapsStaged && window.AdminMapsStaged.updateStagedPosition) {
        window.AdminMapsStaged.updateStagedPosition(pin._tempId, pct.x, pct.y);
      }
      Pins.renderPins();
      return;
    }

    // If staging is available, stage the move instead of PUTting immediately
    if (window.AdminMapsStaged) {
      window.AdminMapsStaged.stageMove(pin.id, pct.x, pct.y);
      // Update local state visually
      for (let i = 0; i < pins.length; i++) {
        if (pins[i].id === pin.id) {
          pins[i].x = Math.round(pct.x * 100) / 100;
          pins[i].y = Math.round(pct.y * 100) / 100;
          // lat/lng are now re-derived server-side on save — no need to
          // clear them here.  The API's updatePin computes percentToLatLng
          // when it receives x/y without explicit lat/lng.
          break;
        }
      }
      Pins.renderPins();
      return;
    }

    const updated = await Admin.api.put("/maps/pins/" + pin.id, {
      x: Math.round(pct.x * 100) / 100,
      y: Math.round(pct.y * 100) / 100,
    });

    // Update local state
    for (let i = 0; i < pins.length; i++) {
      if (pins[i].id === pin.id) {
        pins[i].x = Math.round(pct.x * 100) / 100;
        pins[i].y = Math.round(pct.y * 100) / 100;
        // lat/lng are now re-derived server-side on save.
        break;
      }
    }
    Pins.renderPins();
  } catch (e) {
    console.error("Failed to reposition pin:", e);
    // Re-render from local state to restore position
    Pins.renderPins();
  }
};
