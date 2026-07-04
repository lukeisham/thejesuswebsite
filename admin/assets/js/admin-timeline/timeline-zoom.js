/**
 * Admin timeline zoom module.
 *
 * Handles zoom in/out, pan, and scale controls for the timeline editor canvas.
 * Coordinates with AdminTimelineAxis to update the axis rendering when scale
 * changes, and with AdminTimelineEvents to re-render event markers.
 *
 * @module admin-timeline/timeline-zoom
 */

window.AdminTimelineZoom = {};
const Zoom = window.AdminTimelineZoom;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {number}  Current horizontal pan offset in pixels. */
let panOffset = 0;

/** @type {boolean} */
let panning = false;

/** @type {{ startX: number, origOffset: number }|null} */
let panState = null;

/** @type {HTMLElement|null} */
let scrollContainer = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire zoom buttons, pan events, and the scroll container.
 *
 * @param {HTMLElement} container  - the scrollable container wrapping the axis
 */
Zoom.init = function (container) {
  scrollContainer = container;
  if (!scrollContainer) return;

  var zoomInBtn = document.getElementById("timeline-zoom-in");
  if (zoomInBtn) zoomInBtn.addEventListener("click", Zoom.zoomIn);

  var zoomOutBtn = document.getElementById("timeline-zoom-out");
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", Zoom.zoomOut);

  var resetBtn = document.getElementById("timeline-zoom-reset");
  if (resetBtn) resetBtn.addEventListener("click", Zoom.resetZoom);

  // Pan via mouse drag on the scroll container
  scrollContainer.addEventListener("mousedown", Zoom.onPanStart);
  document.addEventListener("mousemove", Zoom.onPanMove);
  document.addEventListener("mouseup", Zoom.onPanEnd);

  // Touch pan support
  scrollContainer.addEventListener("touchstart", Zoom.onTouchStart, { passive: false });
  document.addEventListener("touchmove", Zoom.onTouchMove, { passive: false });
  document.addEventListener("touchend", Zoom.onTouchEnd);
};

/* ── Pan offset accessor ───────────────────────────────────────────────────── */

/**
 * Return the current horizontal pan offset.
 *
 * @returns {number}
 */
Zoom.getPanOffset = function () {
  return panOffset;
};

/* ── Zoom ──────────────────────────────────────────────────────────────────── */

/**
 * Zoom in: increase pixels per period, keep the centre of the view stable.
 */
Zoom.zoomIn = function () {
  var currentScale = window.AdminTimelineAxis.getPxPerPeriod();
  var newScale = currentScale * 1.25;
  applyZoom(newScale);
};

/**
 * Zoom out: decrease pixels per period, keep the centre of the view stable.
 */
Zoom.zoomOut = function () {
  var currentScale = window.AdminTimelineAxis.getPxPerPeriod();
  var newScale = currentScale / 1.25;
  applyZoom(newScale);
};

/**
 * Reset zoom and pan to defaults.
 */
Zoom.resetZoom = function () {
  window.AdminTimelineAxis.setPxPerPeriod(80);
  panOffset = 0;
  window.AdminTimelineAxis.refresh();
  Zoom.applyScrollPosition();

  if (window.AdminTimelineEvents && window.AdminTimelineEvents.renderEvents) {
    window.AdminTimelineEvents.renderEvents();
  }
};

/* ── Internal zoom logic ───────────────────────────────────────────────────── */

/**
 * Apply a new scale, adjusting pan so the view centre stays stable.
 *
 * @param {number} newScale
 */
function applyZoom(newScale) {
  newScale = Math.max(30, Math.min(300, newScale));
  var oldScale = window.AdminTimelineAxis.getPxPerPeriod();
  if (newScale === oldScale) return;

  // Keep the centre of the visible area stable
  if (scrollContainer) {
    var viewCentre = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
    panOffset = viewCentre - (viewCentre - panOffset) * (newScale / oldScale);
  }

  window.AdminTimelineAxis.setPxPerPeriod(newScale);
  window.AdminTimelineAxis.refresh();
  Zoom.applyScrollPosition();

  if (window.AdminTimelineEvents && window.AdminTimelineEvents.renderEvents) {
    window.AdminTimelineEvents.renderEvents();
  }
}

/**
 * Apply the current panOffset to the scroll container.
 */
Zoom.applyScrollPosition = function () {
  if (!scrollContainer) return;
  scrollContainer.scrollLeft = panOffset;
};

/* ── Mouse pan ─────────────────────────────────────────────────────────────── */

/**
 * Mouse-down on the scroll container starts panning.
 *
 * @param {MouseEvent} e
 */
Zoom.onPanStart = function (e) {
  // Don't start pan if we clicked on an event marker
  if (e.target.closest(".admin-timeline-event")) return;

  panning = true;
  panState = {
    startX: e.clientX,
    origOffset: panOffset,
  };
  scrollContainer.style.cursor = "grabbing";
};

/**
 * Mouse-move during pan.
 *
 * @param {MouseEvent} e
 */
Zoom.onPanMove = function (e) {
  if (!panning || !panState) return;
  panOffset = panState.origOffset - (e.clientX - panState.startX);
  Zoom.applyScrollPosition();
};

/**
 * Mouse-up ends panning.
 */
Zoom.onPanEnd = function () {
  panning = false;
  panState = null;
  if (scrollContainer) scrollContainer.style.cursor = "";
};

/* ── Touch pan ─────────────────────────────────────────────────────────────── */

/**
 * @param {TouchEvent} e
 */
Zoom.onTouchStart = function (e) {
  if (e.touches.length !== 1) return;
  if (e.target.closest(".admin-timeline-event")) return;

  panning = true;
  panState = {
    startX: e.touches[0].clientX,
    origOffset: panOffset,
  };
};

/**
 * @param {TouchEvent} e
 */
Zoom.onTouchMove = function (e) {
  if (!panning || !panState || e.touches.length !== 1) return;
  e.preventDefault();
  panOffset = panState.origOffset - (e.touches[0].clientX - panState.startX);
  Zoom.applyScrollPosition();
};

/**
 * @param {TouchEvent} e
 */
Zoom.onTouchEnd = function () {
  panning = false;
  panState = null;
};
