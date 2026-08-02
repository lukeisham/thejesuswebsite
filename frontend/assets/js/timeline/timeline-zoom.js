/**
 * Timeline zoom module.
 *
 * Implements Arbor-style transform-based zoom and pan for the public frontend
 * timeline: two buttons (zoom in / zoom out, no reset), mouse/touch drag
 * panning. Uses transform: translate() scale() with transform-origin: 0 0
 * on a .timeline-world wrapper — exactly matching the arbor diagram's model.
 *
 * Disabled below 768px (vertical/mobile mode), matching arbor.
 *
 * @module timeline/timeline-zoom
 */

import { throttle } from "../utils/debounce.js";

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {number} */
let scale = 1.0;
let panX = 0;
let panY = 0;

/** Zoom step multiplier. */
const ZOOM_FACTOR = 1.25;
/** Scale bounds — mirrors old [30, 300] px-per-period with BASE_PX_PER_PERIOD=100. */
const SCALE_MIN = 0.3;
const SCALE_MAX = 3.0;

/** Mobile breakpoint — 768px, matching arbor. */
const MOBILE_QUERY = "(max-width: 767px)";

// ─── DOM references ───────────────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let worldEl = null;
/** @type {HTMLElement|null} */
let viewportEl = null;

// ─── Pan state ────────────────────────────────────────────────────────────────

let isPanning = false;
let panStartClientX = 0;
let panStartClientY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the current zoom scale.
 * @returns {number}
 */
export function getScale() {
  return scale;
}

/**
 * Return the current pan offset.
 * @returns {{ x: number, y: number }}
 */
export function getPan() {
  return { x: panX, y: panY };
}

/**
 * Apply the current transform to the world element.
 * No-ops in vertical/mobile mode.
 */
function applyTransform() {
  if (!worldEl) {
    console.warn("TimelineZoom.applyTransform: .timeline-world not found");
    return;
  }
  if (isVerticalMode()) return;
  worldEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

/**
 * Whether the viewport is currently in mobile vertical-mode range.
 * @returns {boolean}
 */
function isVerticalMode() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_QUERY).matches
  );
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

/**
 * Zoom in.
 */
export function zoomIn() {
  const newScale = Math.min(SCALE_MAX, scale * ZOOM_FACTOR);
  if (newScale === scale) return;
  scale = newScale;
  applyTransform();
}

/**
 * Zoom out.
 */
export function zoomOut() {
  const newScale = Math.max(SCALE_MIN, scale / ZOOM_FACTOR);
  if (newScale === scale) return;
  scale = newScale;
  applyTransform();
}

// ─── Pan ──────────────────────────────────────────────────────────────────────

/**
 * Start panning.
 * @param {MouseEvent|Touch} point - event or touch with clientX/clientY
 * @param {Event} originalEvent - the original event for target checking
 */
function onPanStart(point, originalEvent) {
  if (isVerticalMode()) return;
  // Don't start pan if clicking a dot or control
  if (originalEvent && originalEvent.target) {
    if (
      originalEvent.target.closest(".timeline-dot") ||
      originalEvent.target.closest(".timeline-controls") ||
      originalEvent.target.closest(".timeline-era-filters")
    ) {
      return;
    }
  }

  isPanning = true;
  panStartClientX = point.clientX;
  panStartClientY = point.clientY;
  panStartPanX = panX;
  panStartPanY = panY;

  if (viewportEl) {
    viewportEl.style.cursor = "grabbing";
  }
}

/**
 * Pan move (throttled).
 */
const onPanMove = throttle((clientX, clientY) => {
  if (!isPanning) return;

  const dx = clientX - panStartClientX;
  const dy = clientY - panStartClientY;

  panX = panStartPanX + dx;
  panY = panStartPanY + dy;

  applyTransform();
}, 16);

/**
 * End panning.
 */
function onPanEnd() {
  if (!isPanning) return;
  isPanning = false;
  if (viewportEl) {
    viewportEl.style.cursor = "";
  }
}

// ─── Event handlers (mouse) ──────────────────────────────────────────────────

/**
 * @param {MouseEvent} e
 */
function onMouseDown(e) {
  if (e.button !== 0) return;
  onPanStart(e, e);
}

/**
 * @param {MouseEvent} e
 */
function onMouseMove(e) {
  if (!isPanning) return;
  onPanMove(e.clientX, e.clientY);
}

/**
 * @param {MouseEvent} e
 */
function onMouseUp(e) {
  onPanEnd();
}

// ─── Event handlers (touch) ──────────────────────────────────────────────────

/**
 * @param {TouchEvent} e
 */
function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  onPanStart({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, e);
}

/**
 * @param {TouchEvent} e
 */
function onTouchMove(e) {
  if (!isPanning || e.touches.length !== 1) return;
  e.preventDefault();
  onPanMove(e.touches[0].clientX, e.touches[0].clientY);
}

/**
 * @param {TouchEvent} e
 */
function onTouchEnd(e) {
  onPanEnd();
}

// ─── Control bar ─────────────────────────────────────────────────────────────

/**
 * Build and mount the zoom control bar into the timeline viewport.
 * Creates two buttons (zoom-out, zoom-in — no reset, matching arbor)
 * and wires click handlers.
 *
 * Call during page init after the viewport container is in the DOM.
 *
 * @param {HTMLElement} viewport - the scroll/zoom viewport container (.timeline-container)
 */
export function mountZoomControls(viewport) {
  if (!viewport) {
    console.warn("TimelineZoom.mountZoomControls: viewport element not provided");
    return;
  }

  viewportEl = viewport;
  worldEl = viewport.querySelector(".timeline-world");

  if (!worldEl) {
    console.warn("TimelineZoom.mountZoomControls: .timeline-world not found in viewport");
    // Still create controls — they'll be wired when world is available
  }

  // Don't mount controls in vertical/mobile mode
  if (isVerticalMode()) return;

  // Check if controls already exist
  if (viewport.querySelector(".timeline-controls")) return;

  const controls = document.createElement("div");
  controls.className = "timeline-controls";
  controls.setAttribute("role", "toolbar");
  controls.setAttribute("aria-label", "Zoom controls");

  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.className = "btn btn--secondary";
  zoomOutBtn.setAttribute("aria-label", "Zoom out");
  zoomOutBtn.innerHTML =
    '<svg width="20" height="20" aria-hidden="true"><use href="/assets/images/feather-sprite.svg#icon-zoom-out"></use></svg>';
  zoomOutBtn.addEventListener("click", zoomOut);

  const zoomInBtn = document.createElement("button");
  zoomInBtn.className = "btn btn--secondary";
  zoomInBtn.setAttribute("aria-label", "Zoom in");
  zoomInBtn.innerHTML =
    '<svg width="20" height="20" aria-hidden="true"><use href="/assets/images/feather-sprite.svg#icon-zoom-in"></use></svg>';
  zoomInBtn.addEventListener("click", zoomIn);

  controls.appendChild(zoomOutBtn);
  controls.appendChild(zoomInBtn);
  viewport.appendChild(controls);

  // Wire pan events on the viewport
  viewport.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);

  viewport.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
}
