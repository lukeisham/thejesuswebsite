/**
 * Admin timeline axis module.
 *
 * Renders the horizontal time-scale axis and era bands for the timeline editor,
 * and exposes pure helpers to convert between dates and x-axis positions.
 * All math functions are DOM-free and exported so tests can verify round-trip
 * stability and era-boundary mapping (see admin/tests/admin-timeline.test.js).
 *
 * @module admin-timeline/timeline-axis
 */

window.AdminTimelineAxis = {};
const Axis = window.AdminTimelineAxis;

/* ── Era and period constants (from admin-timeline/timeline-geometry.js) ────── */

const ERA_ORDER = window.AdminTimelineGeometry.ERA_ORDER;
const PERIOD_ORDER = window.AdminTimelineGeometry.TIMELINE_PERIODS;
const ERA_LABELS = window.AdminTimelineGeometry.ERA_LABELS;
const ERA_STARTS = window.AdminTimelineGeometry.ERA_STARTS;
const DEFAULT_PX_PER_PERIOD =
  window.AdminTimelineGeometry.DEFAULT_PX_PER_PERIOD;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {HTMLElement|null} */
let axisContainer = null;

/** @type {number}  Total width of the timeline in pixels at current scale. */
let totalWidth = 0;

/** @type {number}  Current pixels-per-period scale. */
let pxPerPeriod = DEFAULT_PX_PER_PERIOD;

/* ── Pure scale helpers ────────────────────────────────────────────────────── */

/**
 * Return the ordinal index of a period within the canonical order.
 * Unknown values sort last (consistent with the API model).
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
 * Convert a timeline period to an x-position on the timeline axis.
 *
 * @param {string} period       - the timeline_period value
 * @param {number} pxPerUnit    - pixels per period unit
 * @param {number} offsetX      - horizontal pan offset in pixels
 * @returns {number}  x-position in pixels
 */
Axis.periodToX = function (period, pxPerUnit, offsetX) {
  var scale = pxPerUnit || DEFAULT_PX_PER_PERIOD;
  var off = offsetX || 0;
  return Axis.periodOrdinal(period) * scale + off;
};

/**
 * Convert an x-position on the timeline axis to the nearest period.
 *
 * @param {number} x           - x-position in pixels
 * @param {number} pxPerUnit   - pixels per period unit
 * @param {number} offsetX     - horizontal pan offset in pixels
 * @returns {string}  the nearest timeline_period value
 */
Axis.xToPeriod = function (x, pxPerUnit, offsetX) {
  var scale = pxPerUnit || DEFAULT_PX_PER_PERIOD;
  var off = offsetX || 0;
  var index = Math.round((x - off) / scale);
  if (index < 0) index = 0;
  if (index >= PERIOD_ORDER.length) index = PERIOD_ORDER.length - 1;
  return PERIOD_ORDER[index];
};

/**
 * Convert a timeline era to the x-position where its band starts.
 *
 * @param {string} era
 * @param {number} pxPerUnit
 * @param {number} offsetX
 * @returns {number}
 */
Axis.eraStartX = function (era, pxPerUnit, offsetX) {
  var scale = pxPerUnit || DEFAULT_PX_PER_PERIOD;
  var off = offsetX || 0;

  var firstPeriod = ERA_STARTS[era];
  if (!firstPeriod) return 0;
  return Axis.periodToX(firstPeriod, scale, off);
};

/**
 * Calculate the total width of the timeline at the given scale.
 *
 * @param {number} pxPerUnit
 * @returns {number}
 */
Axis.totalWidth = function (pxPerUnit) {
  var scale = pxPerUnit || DEFAULT_PX_PER_PERIOD;
  return PERIOD_ORDER.length * scale;
};

/**
 * Return the current pixels-per-period scale.
 *
 * @returns {number}
 */
Axis.getPxPerPeriod = function () {
  return pxPerPeriod;
};

/**
 * Set the pixels-per-period scale and recalculate width.
 *
 * @param {number} newScale
 */
Axis.setPxPerPeriod = function (newScale) {
  pxPerPeriod = Math.max(30, Math.min(300, newScale));
  totalWidth = Axis.totalWidth(pxPerPeriod);
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
  totalWidth = Axis.totalWidth(pxPerPeriod);
  Axis.renderAxis();
};

/**
 * Render the horizontal axis line, period tick marks, and era bands.
 */
Axis.renderAxis = function () {
  if (!axisContainer) return;
  axisContainer.innerHTML = "";

  axisContainer.style.position = "relative";
  axisContainer.style.width = totalWidth + "px";
  axisContainer.style.minHeight = "120px";

  // ── Era bands ──────────────────────────────────────────────────────────

  // Pre-compute era midpoints for overlap detection
  var eraData = [];
  for (var e = 0; e < ERA_ORDER.length; e++) {
    var era = ERA_ORDER[e];
    var startX = Axis.eraStartX(era, pxPerPeriod, 0);
    var endX;
    if (e < ERA_ORDER.length - 1) {
      endX = Axis.eraStartX(ERA_ORDER[e + 1], pxPerPeriod, 0);
    } else {
      endX = totalWidth;
    }
    var midX = (startX + endX) / 2;
    eraData.push({ era: era, startX: startX, endX: endX, midX: midX });
  }

  // Build a list of which eras need alternating labels (adjacent midpoints
  // too close together, matching the frontend BASE_TOP / ALT_TOP pattern).
  var MIN_ERA_LABEL_GAP = 80;
  var needsAlt = [];
  for (var i = 0; i < eraData.length; i++) {
    var prevClose =
      i > 0 && eraData[i].midX - eraData[i - 1].midX < MIN_ERA_LABEL_GAP;
    needsAlt.push(prevClose);
  }

  // Render bands, alternating label tops when adjacent eras are too close
  var altToggle = false;
  for (var j = 0; j < eraData.length; j++) {
    var d = eraData[j];
    var era = d.era;
    var startX = d.startX;
    var endX = d.endX;

    // Determine label top: alternate when this era overlaps the previous one
    if (needsAlt[j]) {
      altToggle = !altToggle;
    } else {
      altToggle = false;
    }
    var labelTop = needsAlt[j] ? (altToggle ? "28px" : "4px") : "4px";

    var band = document.createElement("div");
    band.className = "admin-timeline-era-band";
    band.style.position = "absolute";
    band.style.left = startX + "px";
    band.style.width = endX - startX + "px";
    band.style.top = "0";
    band.style.height = "100%";
    band.setAttribute("data-era", era);

    var label = document.createElement("span");
    label.className = "admin-timeline-era-label";
    label.textContent = ERA_LABELS[era] || era;
    label.style.left = "50%";
    label.style.transform = "translateX(-50%)";
    label.style.top = labelTop;
    band.appendChild(label);

    axisContainer.appendChild(band);
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

  // ── Period tick marks ──────────────────────────────────────────────────
  for (var p = 0; p < PERIOD_ORDER.length; p++) {
    var period = PERIOD_ORDER[p];
    var x = Axis.periodToX(period, pxPerPeriod, 0);

    var tick = document.createElement("div");
    tick.className = "admin-timeline-tick";
    tick.style.position = "absolute";
    tick.style.left = x + "px";
    tick.style.top = "54px";
    tick.setAttribute("data-period", period);

    var tickLabel = document.createElement("span");
    tickLabel.className = "admin-timeline-tick-label";
    tickLabel.textContent = period.replace(/([a-z])([A-Z])/g, "$1 $2");
    tick.appendChild(tickLabel);

    axisContainer.appendChild(tick);
  }
};

/**
 * Re-render the axis (called after zoom changes scale).
 */
Axis.refresh = function () {
  totalWidth = Axis.totalWidth(pxPerPeriod);
  Axis.renderAxis();
};
