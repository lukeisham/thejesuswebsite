/**
 * Admin maps holding pen module.
 *
 * Renders unplaced evidence as draggable chips above the map canvas.
 * Dropping a chip onto the map stages a new pin locally (no API call).
 * Depends on AdminMapsRender for coordinate conversion and AdminMapsStaged
 * for the staged-changes store.
 *
 * @module admin-maps/maps-holding-pen
 */

window.AdminMapsHoldingPen = {};
const HoldingPen = window.AdminMapsHoldingPen;

/* ── State ────────────────────────────────────────────────────────────────── */

/** @type {HTMLElement|null} */
let penContainer = null;

/** @type {Array<Object>} */
let unplacedEvidence = [];

/** @type {Object|null}  Evidence chip selected for click-to-place. */
let selectedEvidence = null;

/** @type {HTMLElement|null} */
let selectedChipEl = null;

/* ── Initialisation ───────────────────────────────────────────────────────── */

/**
 * Cache DOM refs and wire drop target + click-to-place on the canvas.
 */
HoldingPen.init = function () {
  penContainer = document.getElementById("holding-pen");

  // Wire the canvas as a drop target
  const canvas = document.getElementById("map-canvas");
  if (canvas) {
    canvas.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      canvas.classList.add("holding-pen--drop-target");
    });
    canvas.addEventListener("dragleave", () => {
      canvas.classList.remove("holding-pen--drop-target");
    });
    canvas.addEventListener("drop", HoldingPen.onDrop);
    canvas.addEventListener("click", HoldingPen.onCanvasClick);
  }
};

/* ── Click-to-place selection ─────────────────────────────────────────────── */

/**
 * Select a chip, arming the canvas so the next click places it there.
 * Selecting again deselects.
 *
 * @param {Object} evidence
 * @param {HTMLElement} chipEl
 */
HoldingPen.selectChip = function (evidence, chipEl) {
  if (selectedEvidence && selectedEvidence.id === evidence.id) {
    HoldingPen.clearSelection();
    return;
  }

  if (selectedChipEl) {
    selectedChipEl.classList.remove("holding-pen__chip--selected");
  }

  selectedEvidence = evidence;
  selectedChipEl = chipEl;
  chipEl.classList.add("holding-pen__chip--selected");

  const canvas = document.getElementById("map-canvas");
  if (canvas) canvas.classList.add("admin-map-canvas--adding");
};

/**
 * Clear the current chip selection and disarm the canvas.
 */
HoldingPen.clearSelection = function () {
  if (selectedChipEl) {
    selectedChipEl.classList.remove("holding-pen__chip--selected");
  }
  selectedEvidence = null;
  selectedChipEl = null;

  const canvas = document.getElementById("map-canvas");
  if (canvas) canvas.classList.remove("admin-map-canvas--adding");
};

/* ── Loading ──────────────────────────────────────────────────────────────── */

/**
 * Fetch unplaced evidence for a map and render the pen.
 *
 * @param {number} mapId
 * @returns {Promise<void>}
 */
HoldingPen.loadForMap = async function (mapId) {
  HoldingPen.clearSelection();
  try {
    unplacedEvidence = await Admin.api.get(
      "/maps/admin/unplaced?map_id=" + mapId,
    );
  } catch (e) {
    console.error("Failed to load unplaced evidence:", e);
    unplacedEvidence = [];
  }
  HoldingPen.render();
};

/* ── Rendering ────────────────────────────────────────────────────────────── */

/**
 * Render chips for all unplaced evidence.
 */
HoldingPen.render = function () {
  if (!penContainer) return;

  penContainer.innerHTML = "";

  if (unplacedEvidence.length === 0) {
    const empty = document.createElement("p");
    empty.className = "holding-pen__empty";
    empty.textContent = "All map-located evidence has been placed.";
    penContainer.appendChild(empty);
    return;
  }

  for (let i = 0; i < unplacedEvidence.length; i++) {
    const ev = unplacedEvidence[i];
    const chip = HoldingPen.createChip(ev);
    penContainer.appendChild(chip);
  }
};

/**
 * Create a single draggable chip element.
 *
 * @param {Object} evidence
 * @returns {HTMLElement}
 */
HoldingPen.createChip = function (evidence) {
  const chip = document.createElement("button");
  chip.className = "holding-pen__chip";
  chip.draggable = true;
  chip.dataset.evidenceId = String(evidence.id);

  // Era swatch
  if (evidence.timeline_era) {
    const swatch = document.createElement("span");
    swatch.className =
      "holding-pen__chip-swatch era-swatch--" +
      AdminMapsEraUtils.eraToKebab(evidence.timeline_era);
    chip.appendChild(swatch);
  }

  // Title
  const titleEl = document.createElement("span");
  titleEl.className = "holding-pen__chip-title";
  titleEl.textContent = evidence.title;
  chip.appendChild(titleEl);

  // Click — select for click-to-place (next canvas click places the pin)
  chip.addEventListener("click", (e) => {
    e.preventDefault();
    HoldingPen.selectChip(evidence, chip);
  });

  // Drag start — stash evidence data
  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", String(evidence.id));
    e.dataTransfer.effectAllowed = "copy";
    chip.classList.add("holding-pen__chip--dragging");
  });

  chip.addEventListener("dragend", () => {
    chip.classList.remove("holding-pen__chip--dragging");
  });

  // ── Right-click: "Place on Map" without dragging ──────────────────────
  chip.addEventListener("contextmenu", async function (e) {
    e.preventDefault();

    if (!window.AdminMapsPinMenu || !window.AdminMapsPinMenu.open) return;

    var result = await window.AdminMapsPinMenu.open(e.clientX, e.clientY, [
      { label: "Place on Map" },
    ]);
    if (!result) return;

    // Get current map ID
    var maps = window.AdminMapsRegions.getMaps();
    var currentKey = window.AdminMapsRegions.getCurrentMapKey();
    var mapId = null;
    for (var j = 0; j < maps.length; j++) {
      if (maps[j].map_key === currentKey) {
        mapId = maps[j].id;
        break;
      }
    }
    if (!mapId) return;

    // Stage a create at a default centred position (50, 50)
    if (window.AdminMapsStaged) {
      window.AdminMapsStaged.stageCreate(mapId, evidence, 50, 50);
    }

    // Remove the chip from the pen
    unplacedEvidence = unplacedEvidence.filter(function (ev) {
      return ev.id !== evidence.id;
    });
    HoldingPen.render();
  });

  return chip;
};

/* ── Drop handler ─────────────────────────────────────────────────────────── */

/**
 * Handle a chip being dropped onto the canvas.
 *
 * @param {DragEvent} e
 */
HoldingPen.onDrop = function (e) {
  e.preventDefault();
  const canvas = document.getElementById("map-canvas");
  if (canvas) {
    canvas.classList.remove("holding-pen--drop-target");
  }

  const evidenceId = Number(e.dataTransfer.getData("text/plain"));
  if (!evidenceId) return;

  // Find the evidence in our local array
  let evidence = null;
  for (let i = 0; i < unplacedEvidence.length; i++) {
    if (unplacedEvidence[i].id === evidenceId) {
      evidence = unplacedEvidence[i];
      break;
    }
  }
  if (!evidence) return;

  // Convert drop coordinates to percentages
  const rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  const containerRect = canvas.getBoundingClientRect();
  const screenX = e.clientX - containerRect.left;
  const screenY = e.clientY - containerRect.top;

  const pct = window.AdminMapsRender.screenToPercent(screenX, screenY, rect);

  // Get current map ID from AdminMapsRegions
  const maps = window.AdminMapsRegions.getMaps();
  const currentKey = window.AdminMapsRegions.getCurrentMapKey();
  let mapId = null;
  for (let j = 0; j < maps.length; j++) {
    if (maps[j].map_key === currentKey) {
      mapId = maps[j].id;
      break;
    }
  }
  if (!mapId) return;

  // Stage the new pin
  if (window.AdminMapsStaged) {
    window.AdminMapsStaged.stageCreate(mapId, evidence, pct.x, pct.y);
  }

  // Remove the chip from the pen (evidence now has a staged pin)
  unplacedEvidence = unplacedEvidence.filter((ev) => ev.id !== evidenceId);
  HoldingPen.render();
};

/* ── Click-to-place handler ───────────────────────────────────────────────── */

/**
 * Handle a canvas click while a chip is selected — stage a pin there.
 *
 * @param {MouseEvent} e
 */
HoldingPen.onCanvasClick = function (e) {
  if (!selectedEvidence) return;

  // Don't fire if we clicked on an existing pin
  if (e.target.closest(".admin-map-pin")) return;

  const evidence = selectedEvidence;
  const canvas = document.getElementById("map-canvas");

  const rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  const containerRect = canvas.getBoundingClientRect();
  const screenX = e.clientX - containerRect.left;
  const screenY = e.clientY - containerRect.top;

  const pct = window.AdminMapsRender.screenToPercent(screenX, screenY, rect);

  // Get current map ID from AdminMapsRegions
  const maps = window.AdminMapsRegions.getMaps();
  const currentKey = window.AdminMapsRegions.getCurrentMapKey();
  let mapId = null;
  for (let j = 0; j < maps.length; j++) {
    if (maps[j].map_key === currentKey) {
      mapId = maps[j].id;
      break;
    }
  }
  if (!mapId) return;

  // Stage the new pin
  if (window.AdminMapsStaged) {
    window.AdminMapsStaged.stageCreate(mapId, evidence, pct.x, pct.y);
  }

  // Remove the chip from the pen (evidence now has a staged pin)
  unplacedEvidence = unplacedEvidence.filter((ev) => ev.id !== evidence.id);
  HoldingPen.clearSelection();
  HoldingPen.render();
};
