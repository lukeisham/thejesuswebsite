/**
 * Admin timeline axis module.
 *
 * Renders the horizontal axis line and the era divider lines for the timeline
 * editor, in fixed world coordinates (`AdminTimelineGeometry.BASE_PX_PER_PERIOD`
 * per period). The axis is `CANVAS_HEIGHT_PX` tall, the height of the public
 * timeline's dot field, so a dot at a given percentage sits at the same pixel
 * height as on the public page. Zoom is a CSS transform on the
 * `.admin-timeline-world` wrapper; the axis itself always renders at scale 1.
 * The era heading band is drawn by timeline-events.js.
 *
 * Connections: `Axis.init` is called by the inline script in
 * admin/diagrams/timeline.html, which hands in `#timeline-axis`. `renderAxis`
 * empties that element, so the dots, labels and leaders that
 * timeline-events.js renders into it exist only after `init` has run; init
 * runs first. `periodToX` places each dot's slot centre for timeline-events.js
 * and timeline-node-drag.js. `eraStartX` must match the public
 * `layoutEraMarkersHorizontal` (setup/ARCHITECTURE/timeline.md, row 7).
 * Reads `AdminTimelineGeometry`, which loads first.
 *
 * The maths functions are DOM-free so tests can check round-trip stability and
 * era-boundary mapping (admin/tests/admin-timeline.test.js).
 *
 * @module admin-timeline/timeline-axis
 */

window.AdminTimelineAxis = {};
const Axis = window.AdminTimelineAxis;

/* ── Constants from timeline-geometry.js ───────────────────────────────────── */

const ERA_ORDER = window.AdminTimelineGeometry.ERA_ORDER;
const PERIOD_ORDER = window.AdminTimelineGeometry.TIMELINE_PERIODS;
const ERA_STARTS = window.AdminTimelineGeometry.ERA_STARTS;

/** Pixels per period slot in world coordinates; zoom is the transform wrapper's job. */
const BASE_PX_PER_PERIOD = window.AdminTimelineGeometry.BASE_PX_PER_PERIOD;

/** Height of the dot field, equal to the public timeline's (guide row 2). */
const CANVAS_HEIGHT_PX = window.AdminTimelineGeometry.CANVAS_HEIGHT_PX;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {HTMLElement|null} */
let axisContainer = null;

/** @type {number} Width of the timeline in world pixels. */
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
 * Return the ordinal index of an era within the canonical order. No page code
 * calls it; admin/tests/admin-timeline.test.js does.
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
 * @param {string} period - the timeline_period value
 * @param {number} [basePx] - pixels per period; defaults to BASE_PX_PER_PERIOD
 * @returns {number} x-position in world pixels
 */
Axis.periodToX = function (period, basePx) {
  var index = Axis.periodOrdinal(period);
  var slotWidth = basePx || BASE_PX_PER_PERIOD;
  return index * slotWidth + slotWidth / 2;
};

/**
 * Convert an x-position (world pixels) to the nearest period. No page code
 * calls it; admin/tests/admin-timeline.test.js checks it against `periodToX`.
 *
 * @param {number} x - x-position in world pixels
 * @param {number} [basePx] - pixels per period; defaults to BASE_PX_PER_PERIOD
 * @returns {string} the nearest timeline_period value
 */
Axis.xToPeriod = function (x, basePx) {
  var slotWidth = basePx || BASE_PX_PER_PERIOD;
  var index = Math.round((x - slotWidth / 2) / slotWidth);
  if (index < 0) index = 0;
  if (index >= PERIOD_ORDER.length) index = PERIOD_ORDER.length - 1;
  return PERIOD_ORDER[index];
};

/**
 * Convert a timeline era to the x-position where its band starts (world pixels):
 * the left edge of its first period slot. The era heading bars
 * (`computeEraBandLayout`) and the public `.timeline-era-marker` start there too,
 * so a divider at the slot centre would sit half a slot inside the bar.
 *
 * @param {string} era
 * @param {number} [basePx] - pixels per period; defaults to BASE_PX_PER_PERIOD
 * @returns {number}
 */
Axis.eraStartX = function (era, basePx) {
  var slotWidth = basePx || BASE_PX_PER_PERIOD;
  var firstPeriod = ERA_STARTS[era];
  if (!firstPeriod) return 0;
  return Axis.periodOrdinal(firstPeriod) * slotWidth;
};

/**
 * Calculate the total width of the timeline at world scale.
 *
 * @param {number} [basePx] - pixels per period; defaults to BASE_PX_PER_PERIOD
 * @returns {number}
 */
Axis.totalWidth = function (basePx) {
  var slotWidth = basePx || BASE_PX_PER_PERIOD;
  return PERIOD_ORDER.length * slotWidth;
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Draw the axis inside the container (`#timeline-axis`).
 *
 * @param {HTMLElement} container
 * @returns {void}
 */
Axis.init = function (container) {
  if (!container) {
    console.warn("AdminTimelineAxis.init: container not provided");
    return;
  }
  axisContainer = container;
  totalWidth = Axis.totalWidth(BASE_PX_PER_PERIOD);
  Axis.renderAxis();
};

/**
 * Render the horizontal axis line and the era divider lines. Positions use fixed
 * world pixels at scale 1. Empties the container first, which removes any dots
 * that timeline-events.js rendered into it.
 *
 * @returns {void}
 */
Axis.renderAxis = function () {
  if (!axisContainer) return;
  axisContainer.innerHTML = "";

  axisContainer.style.position = "relative";
  axisContainer.style.width = totalWidth + "px";
  axisContainer.style.minHeight = CANVAS_HEIGHT_PX + "px";

  // The first era needs no divider: it starts at the left edge of the world.
  for (var eraIndex = 1; eraIndex < ERA_ORDER.length; eraIndex++) {
    var dividerX = Axis.eraStartX(ERA_ORDER[eraIndex], BASE_PX_PER_PERIOD);
    var divider = document.createElement("div");
    divider.className = "admin-timeline-era-divider";
    divider.style.position = "absolute";
    divider.style.left = dividerX + "px";
    divider.style.top = "0";
    divider.style.height = "100%";
    axisContainer.appendChild(divider);
  }

  var axisLine = document.createElement("div");
  axisLine.className = "admin-timeline-axis-line";
  axisLine.style.position = "absolute";
  axisLine.style.left = "0";
  axisLine.style.width = totalWidth + "px";
  axisLine.style.top = CANVAS_HEIGHT_PX / 2 + "px";
  axisContainer.appendChild(axisLine);
};
