/**
 * Admin timeline axis module.
 *
 * Renders the horizontal time-scale axis and era labels for the timeline
 * editor using fixed world coordinates (BASE_PX_PER_PERIOD = 100). Zoom
 * is applied by a CSS transform on the `.admin-timeline-world` wrapper
 * — the axis itself always renders at scale 1.
 *
 * All math functions are DOM-free and exported so tests can verify
 * round-trip stability and era-boundary mapping.
 *
 * @module admin-timeline/timeline-axis
 */

window.AdminTimelineAxis = {};
const Axis = window.AdminTimelineAxis;

/* ── Era and period constants (from admin-timeline/timeline-geometry.js) ────── */

const ERA_ORDER = window.AdminTimelineGeometry.ERA_ORDER;
const PERIOD_ORDER = window.AdminTimelineGeometry.TIMELINE_PERIODS;
const ERA_STARTS = window.AdminTimelineGeometry.ERA_STARTS;

/** Fixed world-coordinate base — zoom is applied by the transform wrapper. */
const BASE_PX_PER_PERIOD = 100;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {HTMLElement|null} */
let axisContainer = null;

/** @type {number}  Total width of the timeline in world pixels. */
let totalWidth = 0;

/* ── Pure helpers ──────────────────────────────────────────────────────────── */

/**
 * Return the ordinal index of a period within the canonical order.
 * Unknown values sort last.
 *
 * @param {string} period
 * @returns {number}
 */
Axis.periodOrdinal = function (period) {
  var index = PERIOD_ORDER.indexOf(period);
  return index === -1 ? PERIOD_ORDER.length : index;
};

/**
 * Return the ordinal index of an era within the canonical order.
 *
 * @param {string} era
 * @returns {number}
 */
Axis.eraOrdinal = function (era) {
  var index = ERA_ORDER.indexOf(era);
  return index === -1 ? ERA_ORDER.length : index;
};

/**
 * Convert a timeline period to an x-position in world pixels.
 * Zoom is NOT applied here — positions are always at scale 1.
 *
 * @param {string} period       - the timeline_period value
 * @param {number} [basePx=100] - base pixels per period (world scale)
 * @returns {number}  x-position in world pixels
 */
Axis.periodToX = function (period, basePx) {
  var index = Axis.periodOrdinal(period);
  var scale = basePx || BASE_PX_PER_PERIOD;
  return index * scale + scale / 2;
};

/**
 * Convert an x-position (world pixels) to the nearest period.
 *
 * @param {number} x           - x-position in world pixels
 * @param {number} [basePx=100] - base pixels per period
 * @returns {string}  the nearest timeline_period value
 */
Axis.xToPeriod = function (x, basePx) {
  var scale = basePx || BASE_PX_PER_PERIOD;
  var index = Math.round((x - scale / 2) / scale);
  if (index < 0) index = 0;
  if (index >= PERIOD_ORDER.length) index = PERIOD_ORDER.length - 1;
  return PERIOD_ORDER[index];
};

/**
 * Convert a timeline era to the x-position where its band starts (world pixels).
 *
 * @param {string} era
 * @param {number} [basePx=100]
 * @returns {number}
 */
Axis.eraStartX = function (era, basePx) {
  var scale = basePx || BASE_PX_PER_PERIOD;
  var firstPeriod = ERA_STARTS[era];
  if (!firstPeriod) return 0;
  return Axis.periodToX(firstPeriod, scale);
};

/**
 * Calculate the total width of the timeline at world scale.
 *
 * @param {number} [basePx=100]
 * @returns {number}
 */
Axis.totalWidth = function (basePx) {
  var scale = basePx || BASE_PX_PER_PERIOD;
  return PERIOD_ORDER.length * scale;
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Initialise the timeline axis within a container element.
 *
 * @param {HTMLElement} container
 */
Axis.init = function (container) {
  axisContainer = container;
  if (!axisContainer) return;
  totalWidth = Axis.totalWidth(BASE_PX_PER_PERIOD);
  Axis.renderAxis();
};

/**
 * Render the horizontal axis line and era labels (matching frontend exactly).
 * Positions use fixed world pixels at scale 1. Era bands and tick marks are
 * removed for parity with the frontend timeline.
 */
Axis.renderAxis = function () {
  if (!axisContainer) return;
  axisContainer.innerHTML = "";

  axisContainer.style.position = "relative";
  axisContainer.style.width = totalWidth + "px";
  axisContainer.style.minHeight = "120px";

  // ── Era labels ───────────────────────────────────────────────────────
  // Superseded by top-left .admin-timeline-era-heading elements rendered in
  // timeline-events.js (shared placement module, SR-4). Era boundary data
  // is still needed for the divider lines below.
  var eraData = [];
  for (var e = 0; e < ERA_ORDER.length; e++) {
    var era = ERA_ORDER[e];
    var startX = Axis.eraStartX(era, BASE_PX_PER_PERIOD);
    var endX;
    if (e < ERA_ORDER.length - 1) {
      endX = Axis.eraStartX(ERA_ORDER[e + 1], BASE_PX_PER_PERIOD);
    } else {
      endX = totalWidth;
    }
    var midX = (startX + endX) / 2;
    eraData.push({ era: era, startX: startX, endX: endX, midX: midX });
  }

  // ── Era divider lines ──────────────────────────────────────────────────
  for (var d2 = 1; d2 < eraData.length; d2++) {
    var dividerX = eraData[d2].startX;
    var divider = document.createElement("div");
    divider.className = "admin-timeline-era-divider";
    divider.style.position = "absolute";
    divider.style.left = dividerX + "px";
    divider.style.top = "0";
    divider.style.height = "100%";
    axisContainer.appendChild(divider);
  }

  // ── Main axis line ─────────────────────────────────────────────────────
  var axisLine = document.createElement("div");
  axisLine.className = "admin-timeline-axis-line";
  axisLine.style.position = "absolute";
  axisLine.style.left = "0";
  axisLine.style.width = totalWidth + "px";
  axisLine.style.top = "60px";
  axisLine.style.height = "1px";
  axisContainer.appendChild(axisLine);
};

/**
 * Re-render the axis (called after init or external changes).
 */
Axis.refresh = function () {
  totalWidth = Axis.totalWidth(BASE_PX_PER_PERIOD);
  Axis.renderAxis();
};
