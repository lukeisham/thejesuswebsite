/**
 * Arbor interactions module.
 *
 * Handles node hover → tooltip, node click → navigation, zoom in/out/reset,
 * and pan via mouse/touch drag. Uses event delegation (JS-6).
 *
 * @module arbor/arbor-interactions
 */

import { delegate, batchWrite } from '../utils/dom.js';
import { throttle } from '../utils/debounce.js';
import { formatVerse } from '../utils/format.js';
import {
  init as renderInit,
  showLoading,
  showEmpty,
  renderArbor,
} from './arbor-render.js';
import {
  fetchArborGraph,
} from './arbor-data.js';
import { showToast } from '../utils/toasts.js';

// ─── DOM references ────────────────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let canvasEl = null;

/** @type {HTMLElement|null} */
let diagramEl = null;

/** @type {HTMLElement|null} */
let tooltipEl = null;

/** @type {HTMLElement|null} */
let zoomInBtn = null;
let zoomOutBtn = null;
let zoomResetBtn = null;

// ─── Zoom State ────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.25;

let zoomLevel = 1.0;

// ─── Pan State ─────────────────────────────────────────────────────────────────

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
 * Show the tooltip for a node.
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} nodeEl
 */
function showTooltip(e, nodeEl) {
  if (!tooltipEl) return;

  const title = nodeEl.dataset.title || '';
  const description = nodeEl.dataset.description || '';
  const verse = nodeEl.dataset.verse ? formatVerse(nodeEl.dataset.verse) : '';

  let html = '';
  if (title) html += `<strong style="display:block;margin-bottom:4px">${title}</strong>`;
  if (verse) html += `<em style="display:block;margin-bottom:4px;color:var(--text-muted)">${verse}</em>`;
  if (description) html += `<span style="font-size:var(--text-2xs);color:var(--text-secondary)">${description}</span>`;

  tooltipEl.innerHTML = html;
  tooltipEl.hidden = false;

  // Position relative to the canvas
  const canvasRect = canvasEl.getBoundingClientRect();
  let left = e.clientX - canvasRect.left + 12;
  let top = e.clientY - canvasRect.top + 12;

  // Clamp within canvas
  const tooltipRect = tooltipEl.getBoundingClientRect();
  if (left + tooltipRect.width > canvasRect.width) {
    left = e.clientX - canvasRect.left - tooltipRect.width - 12;
  }
  if (top + tooltipRect.height > canvasRect.height) {
    top = e.clientY - canvasRect.top - tooltipRect.height - 12;
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

// ─── Zoom ──────────────────────────────────────────────────────────────────────

/**
 * Apply the current zoom and pan transform to the diagram.
 */
function applyTransform() {
  if (!diagramEl) return;
  diagramEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
}

/**
 * Zoom in by one step.
 */
function zoomIn() {
  const newZoom = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  if (newZoom === zoomLevel) return;
  zoomLevel = newZoom;
  applyTransform();
}

/**
 * Zoom out by one step.
 */
function zoomOut() {
  const newZoom = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
  if (newZoom === zoomLevel) return;
  zoomLevel = newZoom;
  applyTransform();
}

/**
 * Reset zoom and pan to defaults.
 */
function zoomReset() {
  zoomLevel = 1.0;
  translateX = 0;
  translateY = 0;
  applyTransform();
}

// ─── Pan ───────────────────────────────────────────────────────────────────────

/**
 * Start panning.
 */
function onPanStart(e) {
  if (e.button !== undefined && e.button !== 0) return;
  // Don't start pan if clicking a node
  if (e.target.closest('.arbor-node')) return;

  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = translateX;
  panOriginY = translateY;

  if (canvasEl) {
    canvasEl.style.cursor = 'grabbing';
  }
}

/**
 * Pan move (throttled, SR-3).
 */
const onPanMove = throttle((e) => {
  if (!isPanning || !canvasEl) return;

  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;

  translateX = panOriginX + dx;
  translateY = panOriginY + dy;

  applyTransform();
}, 16); // ~60fps

/**
 * End panning.
 */
function onPanEnd() {
  if (!isPanning) return;
  isPanning = false;

  if (canvasEl) {
    canvasEl.style.cursor = '';
  }
}

// ─── Initialisation ────────────────────────────────────────────────────────────

/**
 * Bootstrap the arbor page: fetch data, render, wire interactions.
 */
async function init() {
  // Cache DOM references
  renderInit();
  canvasEl = document.getElementById('arbor-canvas');
  diagramEl = document.getElementById('arbor-diagram');
  tooltipEl = document.getElementById('arbor-tooltip');
  zoomInBtn = document.getElementById('zoom-in');
  zoomOutBtn = document.getElementById('zoom-out');
  zoomResetBtn = document.getElementById('zoom-reset');

  // ── Fetch data ──────────────────────────────────────────────────────────
  showLoading();

  const { data, error } = await fetchArborGraph();

  if (error) {
    showToast('Failed to load arbor diagram. Please try again.', 'error');
    showEmpty();
    return;
  }

  const nodes = data && data.nodes ? data.nodes : [];
  const edges = data && data.edges ? data.edges : [];

  if (!nodes.length) {
    showEmpty();
    return;
  }

  renderArbor(nodes, edges);

  // ── Wire tooltip on nodes (JS-6: event delegation) ─────────────────────
  if (diagramEl) {
    delegate(diagramEl, '.arbor-node', 'mouseenter', (e, nodeEl) => {
      tooltipTimer = setTimeout(() => showTooltip(e, nodeEl), 300);
    });

    delegate(diagramEl, '.arbor-node', 'mouseleave', () => {
      hideTooltip();
    });

    delegate(diagramEl, '.arbor-node', 'mousemove', (e, nodeEl) => {
      if (tooltipEl && !tooltipEl.hidden) {
        showTooltip(e, nodeEl);
      }
    });

    // ── Wire click → navigate to evidence detail ─────────────────────────
    delegate(diagramEl, '.arbor-node', 'click', (_e, nodeEl) => {
      const slug = nodeEl.dataset.slug;
      if (slug) {
        window.location.href = `/evidence/${slug}`;
      }
    });
  }

  // ── Wire zoom controls ──────────────────────────────────────────────────
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', zoomIn);
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', zoomOut);
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', zoomReset);
  }

  // Keyboard zoom shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '=' || e.key === '+') {
      zoomIn();
    } else if (e.key === '-') {
      zoomOut();
    } else if (e.key === '0') {
      zoomReset();
    }
  });

  // ── Wire pan via mouse drag on canvas ───────────────────────────────────
  if (canvasEl) {
    canvasEl.addEventListener('mousedown', onPanStart);
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanEnd);

    // Touch support
    canvasEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onPanStart({
          button: 0,
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
          target: e.target,
        });
      }
    }, { passive: false });

    canvasEl.addEventListener('touchmove', (e) => {
      if (isPanning && e.touches.length === 1) {
        e.preventDefault();
        onPanMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        });
      }
    }, { passive: false });

    canvasEl.addEventListener('touchend', onPanEnd);
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
