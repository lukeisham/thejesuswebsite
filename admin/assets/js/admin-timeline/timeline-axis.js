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
  var index = Axis.periodOrdinal(period);
  // Use the shared centred helper so dots land in the middle of their
  // period slot, matching the frontend's periodX (periodIndex * scale + scale/2).
  return window.AdminTimelineGeometry.periodToXCentered(
    index,
    pxPerUnit,
    offsetX,
  );
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
  // Subtract scale/2 so the snap boundary aligns with the centred dot
  // position produced by periodToXCentered. Without this correction,
  // a dot at x=40 (centred in period 0 at scale 80) would round to
  // Math.round(40/80)=0.5→1 (period 1), breaking the round-trip.
  var index = Math.round((x - off - scale / 2) / scale);
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
 * Render the horizontal axis line and era labels (matching frontend exactly).
 * Era bands and tick marks are removed for parity with the frontend timeline.
 */
Axis.renderAxis = function () {
  if (!axisContainer) return;
  axisContainer.innerHTML = "";

  axisContainer.style.position = "relative";
  axisContainer.style.width = totalWidth + "px";
  axisContainer.style.minHeight = "120px";

  // ── Era labels (no band backgrounds) ───────────────────────────────────

  // Pre-compute era midpoints for overlap detection (matching frontend logic)
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

  // Render era labels (without band backgrounds), alternating tops when adjacent eras are too close
  var altToggle = false;
  for (var j = 0; j < eraData.length; j++) {
    var d = eraData[j];
    var era = d.era;

    // Determine label top: alternate when this era overlaps the previous one
    if (needsAlt[j]) {
      altToggle = !altToggle;
    } else {
      altToggle = false;
    }
    var labelTop = needsAlt[j] ? (altToggle ? "28px" : "4px") : "4px";

    var label = document.createElement("span");
    label.className = "admin-timeline-era-label";
    label.textContent = ERA_LABELS[era] || era;
    label.style.position = "absolute";
    label.style.left = d.midX + "px";
    label.style.top = labelTop;
    label.style.transform = "translateX(-50%)";
    label.setAttribute("data-era", era);

    axisContainer.appendChild(label);
  }

  // ── Era divider lines (matching frontend era-marker) ───────────────────
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
 * Re-render the axis (called after zoom changes scale).
 */
Axis.refresh = function () {
  totalWidth = Axis.totalWidth(pxPerPeriod);
  Axis.renderAxis();
};
