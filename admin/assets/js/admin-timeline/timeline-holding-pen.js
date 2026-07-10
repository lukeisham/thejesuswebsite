/**
 * Admin timeline holding pen module.
 *
 * Renders a horizontal strip of draft-chips (evidence with timeline_era set
 * but timeline_period IS NULL) above the canvas. HTML5 drag (with pointer-event
 * fallback) from pen onto the axis; on drop, snaps to nearest period via
 * AdminTimelineAxis.xToPeriod and stages the change locally. Chips leave
 * the pen, dots appear. Nothing hits the API until the Save button is clicked.
 *
 * @module admin-timeline/timeline-holding-pen
 */

window.AdminTimelineHoldingPen = {};
var HoldingPen = window.AdminTimelineHoldingPen;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} Unplaced evidence rows (era set, no period). */
var unplaced = [];

/** @type {Array<Object>} Staged period assignments, pending Save. */
var staged = [];

/** @type {boolean} Whether we're currently saving. */
var saving = false;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire the holding pen: fetch unplaced evidence, render chips, init drag.
 */
HoldingPen.init = function () {
  HoldingPen.loadUnplaced();
};

/* ── Loading ───────────────────────────────────────────────────────────────── */

/**
 * Fetch evidence with timeline_era set but timeline_period IS NULL.
 */
HoldingPen.loadUnplaced = async function () {
  try {
    var data = await Admin.api.get("/timeline/admin?unplaced=1");
    unplaced = Array.isArray(data)
      ? data
      : data && data.events
        ? data.events
        : [];
  } catch (err) {
    console.error("Failed to load unplaced evidence:", err);
    unplaced = [];
  }
  HoldingPen.renderChips();
};

/**
 * Fetch unplaced events and re-render.
 */
HoldingPen.refresh = async function () {
  await HoldingPen.loadUnplaced();
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Render the chip strip.
 */
HoldingPen.renderChips = function () {
  var pen = document.getElementById("timeline-holding-pen");
  var chipsEl = document.getElementById("timeline-holding-pen-chips");
  if (!pen || !chipsEl) return;

  chipsEl.innerHTML = "";

  if (unplaced.length === 0) {
    pen.hidden = true;
    return;
  }

  pen.hidden = false;

  for (var i = 0; i < unplaced.length; i++) {
    var ev = unplaced[i];
    var chip = document.createElement("button");
    chip.className = "admin-timeline-holding-pen__chip";
    chip.type = "button";
    chip.draggable = true;
    chip.dataset.eventId = String(ev.id);
    chip.setAttribute(
      "aria-label",
      "Drag " + (ev.title || "Untitled") + " to timeline",
    );

    // Era-coloured swatch
    var swatch = document.createElement("span");
    swatch.className = "admin-timeline-holding-pen__swatch";
    var era = ev.timeline_era || "";
    var eraKebab = era
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
    if (eraKebab) swatch.classList.add("era--" + eraKebab);

    // Label
    var label = document.createElement("span");
    label.textContent = ev.title || "(untitled)";

    chip.appendChild(swatch);
    chip.appendChild(label);

    // Drag events
    chip.addEventListener("dragstart", HoldingPen.onDragStart);
    chip.addEventListener("dragend", HoldingPen.onDragEnd);

    chipsEl.appendChild(chip);
  }
};

/* ── Drag & Drop ───────────────────────────────────────────────────────────── */

/**
 * dragstart: set the event id as transfer data.
 */
HoldingPen.onDragStart = function (e) {
  var eventId = e.currentTarget.dataset.eventId;
  e.dataTransfer.setData("text/plain", eventId);
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
};

/**
 * dragend: clean up.
 */
HoldingPen.onDragEnd = function (e) {
  e.currentTarget.classList.remove("dragging");
  var canvas = document.getElementById("timeline-canvas");
  if (canvas) canvas.classList.remove("admin-timeline-canvas--drop-target");
};

/* ── Canvas Drop Target ────────────────────────────────────────────────────── */

/**
 * Wire the canvas as a drop target. Called from the main init after DOM ready.
 */
HoldingPen.wireCanvasDrop = function () {
  var canvas = document.getElementById("timeline-canvas");
  if (!canvas) return;

  canvas.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    canvas.classList.add("admin-timeline-canvas--drop-target");
  });

  canvas.addEventListener("dragleave", function () {
    canvas.classList.remove("admin-timeline-canvas--drop-target");
  });

  canvas.addEventListener("drop", HoldingPen.onCanvasDrop);
};

/**
 * Handle a chip dropped onto the canvas: snap to nearest period, stage the
 * change, remove from unplaced, re-render.
 */
HoldingPen.onCanvasDrop = function (e) {
  e.preventDefault();
  var canvas = document.getElementById("timeline-canvas");
  if (canvas) canvas.classList.remove("admin-timeline-canvas--drop-target");

  var eventId = parseInt(e.dataTransfer.getData("text/plain"), 10);
  if (!eventId) return;

  // Find the unplaced event
  var ev = null;
  for (var i = 0; i < unplaced.length; i++) {
    if (unplaced[i].id === eventId) {
      ev = unplaced[i];
      break;
    }
  }
  if (!ev) return;

  // Snap to nearest period
  var pxPerPeriod = window.AdminTimelineAxis.getPxPerPeriod();
  var offsetX = window.AdminTimelineZoom
    ? window.AdminTimelineZoom.getPanOffset()
    : 0;
  var rect = canvas.getBoundingClientRect();
  var dropX = e.clientX - rect.left + canvas.scrollLeft;
  var snapPeriod = window.AdminTimelineAxis.xToPeriod(
    dropX,
    pxPerPeriod,
    offsetX,
  );

  // Determine the era for the snapped period
  var newEra = ev.timeline_era;
  if (window.AdminTimelineEvents && window.AdminTimelineEvents.eraForPeriod) {
    newEra = window.AdminTimelineEvents.eraForPeriod(snapPeriod);
  }

  // Stage the change
  staged.push({
    id: ev.id,
    timeline_period: snapPeriod,
    timeline_era: newEra,
  });

  // Add to the displayed events immediately
  var placedEv = {
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    timeline_period: snapPeriod,
    timeline_era: newEra,
    primary_verse: ev.primary_verse,
    description: ev.description,
    gospel_category: ev.gospel_category,
  };
  if (window.AdminTimelineEvents && window.AdminTimelineEvents.addStagedEvent) {
    window.AdminTimelineEvents.addStagedEvent(placedEv);
  }

  // Remove from unplaced
  unplaced = unplaced.filter(function (u) {
    return u.id !== eventId;
  });
  HoldingPen.renderChips();
};

/* ── Save ──────────────────────────────────────────────────────────────────── */

/**
 * Save all staged period assignments via the API.
 * Each staged event is PATCHed individually via UpdateRecord.
 * Explicit error surfacing (JS-2); button disabled while saving.
 */
HoldingPen.save = async function () {
  if (saving || staged.length === 0) return;

  var saveBtn = document.getElementById("timeline-save-btn");
  saving = true;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  var errors = [];
  var succeeded = [];

  for (var i = 0; i < staged.length; i++) {
    var item = staged[i];
    try {
      await UpdateRecord.saveEvent(item.id, {
        timeline_period: item.timeline_period,
        timeline_era: item.timeline_era,
      });
      succeeded.push(item.id);
    } catch (err) {
      errors.push({
        id: item.id,
        message: err.message || "Unknown error",
      });
    }
  }

  // Remove successfully saved items from staged
  staged = staged.filter(function (s) {
    return succeeded.indexOf(s.id) === -1;
  });

  saving = false;
  if (saveBtn) {
    saveBtn.disabled = staged.length === 0;
    saveBtn.textContent =
      staged.length > 0
        ? "Save Changes (" + staged.length + " remaining)"
        : "Save Changes";
  }

  if (errors.length > 0) {
    var msg =
      "Failed to save " +
      errors.length +
      " event(s): " +
      errors
        .map(function (e) {
          return "ID " + e.id + ": " + e.message;
        })
        .join("; ");
    console.error(msg);
    // Try to show via toast if available
    if (typeof showToast === "function") {
      showToast(msg, "error");
    }
  }
};
