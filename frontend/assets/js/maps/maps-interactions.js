/**
 * Maps interactions module.
 *
 * Handles zoom/pan on the map container (transform-based, clamped),
 * pin hover → tooltip, pin click → open evidence detail.
 * Uses event delegation on the pins layer (JS-6).
 *
 * @module maps/maps-interactions
 */

import { delegate } from '../utils/dom.js';

// ─── DOM references ────────────────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let mapContainer = null;

/** @type {HTMLElement|null} */
let pinsLayer = null;

/** @type {HTMLElement|null} */
let tooltipEl = null;

/** @type {HTMLElement|null} */
let zoomInBtn = null;
let zoomOutBtn = null;
let zoomResetBtn = null;

// ─── Zoom state ────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.25;

let zoomLevel = 1.0;

// ─── Pan state ─────────────────────────────────────────────────────────────────

let translateX = 0;
let translateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

// ─── Tooltip ───────────────────────────────────────────────────────────────────

let tooltipTimer = null;

/**
 * Show the tooltip for a pin.
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} pinEl
 */
function showTooltip(e, pinEl) {
  if (!tooltipEl) return;

  const label = pinEl.dataset.label || '';
  const evidenceTitle = pinEl.dataset.evidenceTitle || '';
  const evidenceSlug = pinEl.dataset.evidenceSlug || '';

  if (!label && !evidenceTitle) {
    hideTooltip();
    return;
  }

  let html = '';
  if (label) {
    html += `<strong class="map-tooltip-title">${label}</strong>`;
  }
  if (evidenceTitle && evidenceSlug) {
    html +=
      `<span class="map-tooltip-evidence">${evidenceTitle}</span>`;
  }

  tooltipEl.innerHTML = html;
  tooltipEl.hidden = false;

  // Position relative to the map container
  const rect = mapContainer.getBoundingClientRect();
  let left = e.clientX - rect.left + 16;
  let top = e.clientY - rect.top - 8;

  // Clamp within container
  const tooltipRect = tooltipEl.getBoundingClientRect();
  if (left + tooltipRect.width > rect.width) {
    left = e.clientX - rect.left - tooltipRect.width - 16;
  }
  if (top < 0) {
    top = e.clientY - rect.top + 16;
  }
  if (top + tooltipRect.height > rect.height) {
    top = e.clientY - rect.top - tooltipRect.height - 8;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

/**
 * Hide the tooltip.
 */
function hideTooltip() {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
  if (tooltipEl) {
    tooltipEl.hidden = true;
  }
}

// ─── Zoom / Pan ────────────────────────────────────────────────────────────────

function applyTransform() {
  if (!pinsLayer) return;
  // Clamp translation to prevent the content from drifting too far off-screen
  const clampedX = Math.max(-500, Math.min(500, translateX));
  const clampedY = Math.max(-500, Math.min(500, translateY));
  pinsLayer.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${zoomLevel})`;
}

function zoomIn() {
  const newZoom = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  if (newZoom === zoomLevel) return;
  zoomLevel = newZoom;
  applyTransform();
}

function zoomOut() {
  const newZoom = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
  if (newZoom === zoomLevel) return;
  zoomLevel = newZoom;
  applyTransform();
}

function zoomReset() {
  zoomLevel = 1.0;
  translateX = 0;
  translateY = 0;
  applyTransform();
}

// ─── Pan handlers ──────────────────────────────────────────────────────────────

function onPanStart(e) {
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest('.map-pin')) return;

  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = translateX;
  panOriginY = translateY;

  if (mapContainer) {
    mapContainer.style.cursor = 'grabbing';
  }
}

function onPanMove(e) {
  if (!isPanning || !mapContainer) return;

  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;

  translateX = panOriginX + dx;
  translateY = panOriginY + dy;

  applyTransform();
}

function onPanEnd() {
  if (!isPanning) return;
  isPanning = false;

  if (mapContainer) {
    mapContainer.style.cursor = '';
  }
}

// ─── Teardown ──────────────────────────────────────────────────────────────────

/** @type {Function[]} */
let teardowns = [];

/**
 * Wire all interactions. Returns a teardown function that removes all listeners.
 *
 * @returns {Function}
 */
export function setupInteractions(container) {
  // Cache DOM references
  mapContainer = container || document.getElementById('map-container');
  pinsLayer = document.getElementById('map-pins');
  tooltipEl = document.getElementById('map-tooltip');
  zoomInBtn = document.getElementById('zoom-in');
  zoomOutBtn = document.getElementById('zoom-out');
  zoomResetBtn = document.getElementById('zoom-reset');

  teardowns = [];

  // ── Pin hover → tooltip ──────────────────────────────────────────────────
  if (pinsLayer) {
    teardowns.push(
      delegate(pinsLayer, '.map-pin', 'mouseenter', (e, pinEl) => {
        tooltipTimer = setTimeout(() => showTooltip(e, pinEl), 200);
      })
    );

    teardowns.push(
      delegate(pinsLayer, '.map-pin', 'mouseleave', () => {
        hideTooltip();
      })
    );

    // ── Pin click → open evidence detail ───────────────────────────────────
    teardowns.push(
      delegate(pinsLayer, '.map-pin', 'click', (_e, pinEl) => {
        const slug = pinEl.dataset.evidenceSlug;
        if (slug) {
          window.open(`/evidence/${encodeURIComponent(slug)}`, '_blank');
        }
      })
    );
  }

  // ── Zoom controls ────────────────────────────────────────────────────────
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', zoomIn);
    teardowns.push(() => zoomInBtn.removeEventListener('click', zoomIn));
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', zoomOut);
    teardowns.push(() => zoomOutBtn.removeEventListener('click', zoomOut));
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', zoomReset);
    teardowns.push(() => zoomResetBtn.removeEventListener('click', zoomReset));
  }

  // Keyboard shortcuts
  const onKeyDown = (e) => {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      zoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      zoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      zoomReset();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  teardowns.push(() => document.removeEventListener('keydown', onKeyDown));

  // ── Pan via mouse drag ───────────────────────────────────────────────────
  if (mapContainer) {
    mapContainer.addEventListener('mousedown', onPanStart);
    teardowns.push(() =>
      mapContainer.removeEventListener('mousedown', onPanStart)
    );

    mapContainer.addEventListener('mousemove', onPanMove);
    teardowns.push(() =>
      mapContainer.removeEventListener('mousemove', onPanMove)
    );

    mapContainer.addEventListener('mouseup', onPanEnd);
    teardowns.push(() =>
      mapContainer.removeEventListener('mouseup', onPanEnd)
    );

    mapContainer.addEventListener('mouseleave', onPanEnd);
    teardowns.push(() =>
      mapContainer.removeEventListener('mouseleave', onPanEnd)
    );

    // Touch support
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        onPanStart({
          button: 0,
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
          target: e.target,
        });
      }
    };
    mapContainer.addEventListener('touchstart', onTouchStart, { passive: false });
    teardowns.push(() =>
      mapContainer.removeEventListener('touchstart', onTouchStart)
    );

    const onTouchMove = (e) => {
      if (isPanning && e.touches.length === 1) {
        e.preventDefault();
        onPanMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        });
      }
    };
    mapContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    teardowns.push(() =>
      mapContainer.removeEventListener('touchmove', onTouchMove)
    );

    const onTouchEnd = () => onPanEnd();
    mapContainer.addEventListener('touchend', onTouchEnd);
    teardowns.push(() =>
      mapContainer.removeEventListener('touchend', onTouchEnd)
    );
  }

  return () => {
    for (const teardown of teardowns) {
      teardown();
    }
    teardowns = [];
  };
}
