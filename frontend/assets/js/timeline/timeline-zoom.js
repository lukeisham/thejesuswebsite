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
 * Line stability under zoom/pan (see timeline/timeline-line-stability.css):
 * - `.timeline-spine` / `.timeline-era-marker` live inside `.timeline-world`,
 *   so `scale()` inflates their declared thickness along with everything else
 *   (a 2px spine renders 6px wide at scale 3.0). `applyTransform()` publishes
 *   the live scale as the `--timeline-zoom-scale` custom property on
 *   `.timeline-world` on every update; the CSS divides declared thickness by
 *   it to cancel the inflation out, so apparent thickness stays constant.
 * - Fractional pan values (e.g. panX = 142.5333...px) land on sub-pixel
 *   offsets that browsers antialias inconsistently frame-to-frame, which
 *   reads as shimmer while dragging. `roundToGrid()` snaps panX/panY to the
 *   nearest 0.5px before the transform is applied — coarse enough to kill
 *   the shimmer, fine enough to stay visually imperceptible.
 * - The 150ms transform transition (timeline.css) is desirable for button
 *   zoom (smooth, reassuring) but makes drag-pan lag behind the pointer.
 *   `.timeline-world--panning` (added only while `isPanning`) suppresses it.
 *
 * @module timeline/timeline-zoom
 */

import { throttle } from "../utils/debounce.js";
import { clampPan } from "./timeline-transform.js";

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

/** Last known-good transform state, restored if panX/panY/scale go non-finite (JS-2). */
let lastValidPanX = 0;
let lastValidPanY = 0;
let lastValidScale = 1.0;

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
 * Round a value to the nearest multiple of gridSize.
 * Used to snap pan values to a coarse pixel grid, avoiding the sub-pixel
 * offsets that cause line shimmer while dragging (see module doc comment).
 *
 * @param {number} value
 * @param {number} [gridSize=0.5]
 * @returns {number}
 */
export function roundToGrid(value, gridSize = 0.5) {
  return Math.round(value / gridSize) * gridSize;
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

  // JS-2: fail visibly and recover rather than writing NaN/Infinity into a
  // live transform, which would silently blank the timeline.
  if (!Number.isFinite(panX) || !Number.isFinite(panY) || !Number.isFinite(scale)) {
    console.warn(
      "TimelineZoom.applyTransform: non-finite transform state, restoring last valid state",
      { panX, panY, scale },
    );
    panX = lastValidPanX;
    panY = lastValidPanY;
    scale = lastValidScale;
  }

  const roundedX = roundToGrid(panX);
  const roundedY = roundToGrid(panY);

  // Live-bind the scale for CSS counter-scaling (timeline-line-stability.css).
  worldEl.style.setProperty("--timeline-zoom-scale", String(scale));
  worldEl.style.transform = `translate(${roundedX}px, ${roundedY}px) scale(${scale})`;

  lastValidPanX = panX;
  lastValidPanY = panY;
  lastValidScale = scale;
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

  // Suppress the button-zoom transition so drag-pan tracks the pointer
  // immediately instead of lagging behind it (mouse and touch both funnel
  // through this shared onPanStart, so one class toggle covers both).
  if (worldEl) {
    worldEl.classList.add("timeline-world--panning");
  }

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
  if (worldEl) {
    worldEl.classList.remove("timeline-world--panning");
  }
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

/**
 * Programmatic transform setter — used by chip-jump navigation
 * (timeline-nav.js) and any future feature that needs to set pan/zoom
 * without going through the button or drag handlers.
 *
 * Clamps pan via clampPan() so the world stays at least partially
 * visible, assigns to the module-scope state, applies the transform,
 * and fires `timeline:transformed` on `.timeline-world` so other
 * modules can listen for viewport changes.
 *
 * @param {number}  newPanX
 * @param {number}  newPanY
 * @param {number}  newScale
 * @param {string}  [eraKey] — era key for the custom event detail
 */
export function setTransform(newPanX, newPanY, newScale, eraKey) {
  if (isVerticalMode()) return;

  // Guard: ensure all inputs are finite numbers
  if (
    !Number.isFinite(newPanX) ||
    !Number.isFinite(newPanY) ||
    !Number.isFinite(newScale)
  ) {
    console.warn("TimelineZoom.setTransform: non-finite input, ignoring", {
      newPanX,
      newPanY,
      newScale,
    });
    return;
  }

  // Derive total world width from the last period index (ERA_BOUNDARIES
  // end + 1 periods at BASE_PX_PER_PERIOD each).
  // This is a reasonable approximation — the exact value isn't critical
  // because clampPan allows up to 90% overflow.
  var worldWidth = 0;
  // We import clampPan from timeline-transform but that module also
  // knows the world bounds; pass a reasonable default.
  worldWidth = 3800; // 38 periods * 100px, the known total

  // Clamp pan to keep the world in view
  var clamped = clampPan(newPanX, newPanY, newScale, worldWidth);

  // Clamp scale to valid range
  var clampedScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, newScale));

  panX = clamped.panX;
  panY = clamped.panY;
  scale = clampedScale;

  applyTransform();

  // Fire custom event so other modules can react to programmatic transforms
  if (worldEl) {
    var eventDetail = { panX: panX, panY: panY, scale: scale };
    if (eraKey) eventDetail.era = eraKey;
    worldEl.dispatchEvent(
      new CustomEvent("timeline:transformed", {
        bubbles: false,
        detail: eventDetail,
      }),
    );
  }
}
