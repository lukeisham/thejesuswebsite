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

/* ── Initialisation ───────────────────────────────────────────────────────── */

/**
 * Cache DOM refs and wire drop target on the canvas.
 */
HoldingPen.init = function () {
  penContainer = document.getElementById("holding-pen");

  // Wire the canvas as a drop target
  const canvas = document.getElementById("map-canvas");
  if (canvas) {
    canvas.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      canvas.classList.add("holding-pen--drop-target");
    });
    canvas.addEventListener("dragleave", function () {
      canvas.classList.remove("holding-pen--drop-target");
    });
    canvas.addEventListener("drop", HoldingPen.onDrop);
  }
};

/* ── Loading ──────────────────────────────────────────────────────────────── */

/**
 * Fetch unplaced evidence for a map and render the pen.
 *
 * @param {number} mapId
 * @returns {Promise<void>}
 */
HoldingPen.loadForMap = async function (mapId) {
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
 * Era CamelCase → kebab-case helper.
 */
function eraToKebab(era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Render chips for all unplaced evidence.
 */
HoldingPen.render = function () {
  if (!penContainer) return;

  penContainer.innerHTML = "";

  if (unplacedEvidence.length === 0) {
    var empty = document.createElement("p");
    empty.className = "holding-pen__empty";
    empty.textContent = "All map-located evidence has been placed.";
    penContainer.appendChild(empty);
    return;
  }

  for (var i = 0; i < unplacedEvidence.length; i++) {
    var ev = unplacedEvidence[i];
    var chip = HoldingPen.createChip(ev);
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
  var chip = document.createElement("button");
  chip.className = "holding-pen__chip";
  chip.draggable = true;
  chip.dataset.evidenceId = String(evidence.id);

  // Era swatch
  if (evidence.timeline_era) {
    var swatch = document.createElement("span");
    swatch.className =
      "holding-pen__chip-swatch era-swatch--" + eraToKebab(evidence.timeline_era);
    chip.appendChild(swatch);
  }

  // Title
  var titleEl = document.createElement("span");
  titleEl.className = "holding-pen__chip-title";
  titleEl.textContent = evidence.title;
  chip.appendChild(titleEl);

  // Drag start — stash evidence data
  chip.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", String(evidence.id));
    e.dataTransfer.effectAllowed = "copy";
    chip.classList.add("holding-pen__chip--dragging");
  });

  chip.addEventListener("dragend", function () {
    chip.classList.remove("holding-pen__chip--dragging");
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
  var canvas = document.getElementById("map-canvas");
  if (canvas) {
    canvas.classList.remove("holding-pen--drop-target");
  }

  var evidenceId = Number(e.dataTransfer.getData("text/plain"));
  if (!evidenceId) return;

  // Find the evidence in our local array
  var evidence = null;
  for (var i = 0; i < unplacedEvidence.length; i++) {
    if (unplacedEvidence[i].id === evidenceId) {
      evidence = unplacedEvidence[i];
      break;
    }
  }
  if (!evidence) return;

  // Convert drop coordinates to percentages
  var rect = window.AdminMapsRender.getImageRect();
  if (!rect) return;

  var containerRect = canvas.getBoundingClientRect();
  var screenX = e.clientX - containerRect.left;
  var screenY = e.clientY - containerRect.top;

  var pct = window.AdminMapsRender.screenToPercent(screenX, screenY, rect);

  // Get current map ID from AdminMapsRegions
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

  // Stage the new pin
  if (window.AdminMapsStaged) {
    window.AdminMapsStaged.stageCreate(mapId, evidence, pct.x, pct.y);
  }

  // Remove the chip from the pen (evidence now has a staged pin)
  unplacedEvidence = unplacedEvidence.filter(function (ev) {
    return ev.id !== evidenceId;
  });
  HoldingPen.render();
};
