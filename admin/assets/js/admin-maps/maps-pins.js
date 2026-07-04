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
    pins = await Admin.api.get("/maps/pins/by-map/" + mapId);
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

  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const el = Pins.createPinElement(pin);
    pinsLayer.appendChild(el);
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
  if (pin.id === selectedPinId) {
    el.classList.add("admin-map-pin--selected");
  }
  el.style.left = pin.x + "%";
  el.style.top = pin.y + "%";
  el.setAttribute("aria-label", pin.label || "Map pin");
  el.title = pin.label || "";
  el.dataset.pinId = String(pin.id);

  // Label span below the dot
  if (pin.label) {
    const labelEl = document.createElement("span");
    labelEl.className = "admin-map-pin-label";
    labelEl.textContent = pin.label;
    el.appendChild(labelEl);
  }

  el.addEventListener("click", function (e) {
    Pins.onPinClick(e, pin);
  });

  // Drag listeners
  el.addEventListener("mousedown", function (e) {
    Pins.onPinMouseDown(e, pin);
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
  document.getElementById("pin-evidence-info").textContent = pin.evidence_title
    ? pin.evidence_title + " (" + pin.evidence_slug + ")"
    : "";

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

  const payload = { label: label || null };
  if (evidenceRaw !== "") {
    const evidenceId = Number(evidenceRaw);
    payload.evidence_id = Number.isFinite(evidenceId) ? evidenceId : null;
  } else {
    payload.evidence_id = null;
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

  const errorEl = document.getElementById("pin-edit-error");
  if (errorEl) errorEl.textContent = "";

  try {
    await Admin.api.del("/maps/pins/" + selectedPinId);

    // Remove from local state
    pins = pins.filter(function (p) {
      return p.id !== selectedPinId;
    });
    Pins.closeEditPanel();
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

  // Visual feedback: move the pin element
  const el = document.querySelector('[data-pin-id="' + dragState.pin.id + '"]');
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
    const updated = await Admin.api.put("/maps/pins/" + pin.id, {
      x: Math.round(pct.x * 100) / 100,
      y: Math.round(pct.y * 100) / 100,
    });

    // Update local state
    for (let i = 0; i < pins.length; i++) {
      if (pins[i].id === updated.id) {
        pins[i] = updated;
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
