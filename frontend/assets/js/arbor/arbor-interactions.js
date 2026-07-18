/**
 * Arbor interactions module.
 *
 * Handles node hover → tooltip, node click → navigation, zoom in/out/reset,
 * and pan via mouse/touch drag. Uses event delegation (JS-6).
 *
 * @module arbor/arbor-interactions
 */

import { delegate, batchWrite } from "../utils/dom.js";
import { throttle, debounce } from "../utils/debounce.js";
import { formatVerse } from "../utils/format.js";
import {
  init as renderInit,
  showLoading,
  showEmpty,
  renderArbor,
  isVerticalMode,
} from "./arbor-render.js";
import { fetchArborGraph, buildGraph } from "./arbor-data.js";
import { readEmbeddedData } from "../api.js";
import { showToast } from "../utils/toasts.js";
import { revalidateInBackground } from "../utils/data-revalidation.js";

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

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 1.0;
const ZOOM_FACTOR = 1.25;

let zoomLevel = 1.0;

// ─── Pan State ─────────────────────────────────────────────────────────────────

let translateX = 0;
let translateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

// ─── Layout mode tracking (for breakpoint-crossing re-render) ────────────────

/** @type {boolean} */
let currentVerticalMode = false;

/** @type {Array|null} Saved nodes for re-render on resize */
let savedNodes = null;

/** @type {Array|null} Saved edges for re-render on resize */
let savedEdges = null;

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

  const title = nodeEl.dataset.title || "";
  const description = nodeEl.dataset.description || "";
  const verse = nodeEl.dataset.verse ? formatVerse(nodeEl.dataset.verse) : "";

  let html = "";
  if (title)
    html += `<strong style="display:block;margin-bottom:4px">${title}</strong>`;
  if (verse)
    html += `<em style="display:block;margin-bottom:4px;color:var(--text-muted)">${verse}</em>`;
  if (description)
    html += `<span style="font-size:var(--text-2xs);color:var(--text-secondary)">${description}</span>`;

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
  if (!diagramEl || isVerticalMode()) return;
  diagramEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
}

/**
 * Zoom in by multiplying the current zoom level.
 */
function zoomIn() {
  const newZoom = Math.min(ZOOM_MAX, zoomLevel * ZOOM_FACTOR);
  if (newZoom === zoomLevel) return;
  zoomLevel = newZoom;
  applyTransform();
}

/**
 * Zoom out by dividing the current zoom level.
 */
function zoomOut() {
  const newZoom = Math.max(ZOOM_MIN, zoomLevel / ZOOM_FACTOR);
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
  // In vertical (mobile) mode, defer to native page scroll
  if (isVerticalMode()) return;
  if (e.button !== undefined && e.button !== 0) return;
  // Don't start pan if clicking a node
  if (e.target.closest(".arbor-node")) return;

  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panOriginX = translateX;
  panOriginY = translateY;

  if (canvasEl) {
    canvasEl.style.cursor = "grabbing";
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
    canvasEl.style.cursor = "";
  }
}

// ─── Initialisation ────────────────────────────────────────────────────────────

/**
 * Bootstrap the arbor page: fetch data, render, wire interactions.
 */
async function init() {
  // Cache DOM references
  renderInit();
  canvasEl = document.getElementById("arbor-canvas");
  diagramEl = document.getElementById("arbor-diagram");
  tooltipEl = document.getElementById("arbor-tooltip");
  zoomInBtn = document.getElementById("zoom-in");
  zoomOutBtn = document.getElementById("zoom-out");
  zoomResetBtn = document.getElementById("zoom-reset");

  // ── Fetch data ──────────────────────────────────────────────────────────

  // Try embedded data first (deploy-time snapshot for first-paint content — SR-3)
  const embedded = readEmbeddedData("arbor-data");
  if (embedded && embedded.nodes && embedded.nodes.length > 0) {
    savedNodes = embedded.nodes;
    savedEdges = embedded.edges || [];
  } else {
    // Fall back to live API fetch
    showLoading();

    const { data, error } = await fetchArborGraph();

    if (error) {
      showToast("Failed to load arbor diagram. Please try again.", "error");
      showEmpty();
      return;
    }

    const nodes = data && data.nodes ? data.nodes : [];
    const edges = data && data.edges ? data.edges : [];

    if (!nodes.length) {
      showEmpty();
      return;
    }

    savedNodes = nodes;
    savedEdges = edges;
  }

  currentVerticalMode = isVerticalMode();

  renderArbor(savedNodes, savedEdges);

  // Revalidate against live data in the background (Issues.md #64): an
  // embedded snapshot is only as fresh as the last deploy, so always
  // check for changes after first paint and re-render if the graph
  // actually changed. Not awaited — must not delay interaction wiring.
  console.log("[DEBUG] about to call revalidateInBackground", typeof revalidateInBackground);
  revalidateInBackground({
    embeddedData: { nodes: savedNodes, edges: savedEdges },
    fetchLive: fetchArborGraph,
    onFresh: (fresh) => {
      console.log("[DEBUG] onFresh called", fresh.nodes && fresh.nodes.length);
      savedNodes = fresh.nodes || [];
      savedEdges = fresh.edges || [];
      renderArbor(savedNodes, savedEdges);
    },
  }).then(() => console.log("[DEBUG] revalidateInBackground settled")).catch((e) => console.log("[DEBUG] revalidateInBackground threw", e));

  // ── Wire tooltip on nodes (JS-6: event delegation) ─────────────────────
  if (diagramEl) {
    delegate(diagramEl, ".arbor-node", "mouseenter", (e, nodeEl) => {
      tooltipTimer = setTimeout(() => showTooltip(e, nodeEl), 300);
    });

    delegate(diagramEl, ".arbor-node", "mouseleave", () => {
      hideTooltip();
    });

    delegate(diagramEl, ".arbor-node", "mousemove", (e, nodeEl) => {
      if (tooltipEl && !tooltipEl.hidden) {
        showTooltip(e, nodeEl);
      }
    });

    // Touch tooltip for mobile (long-press shows tooltip before navigation)
    delegate(diagramEl, ".arbor-node", "touchstart", (e, nodeEl) => {
      tooltipTimer = setTimeout(() => showTooltip(e, nodeEl), 300);
    });

    delegate(diagramEl, ".arbor-node", "touchend", () => {
      hideTooltip();
    });

    // Cancel tooltip timer on scroll
    delegate(diagramEl, ".arbor-node", "touchmove", () => {
      hideTooltip();
    });

    // ── Wire click → navigate to evidence detail ─────────────────────────
    // (JS-6: shared logic for click and keyboard activation)
    const navigateToEvidence = (nodeEl) => {
      const slug = nodeEl.dataset.slug;
      if (slug) {
        window.location.href = `/evidence/${slug}`;
      }
    };

    delegate(diagramEl, ".arbor-node", "click", (_e, nodeEl) => {
      navigateToEvidence(nodeEl);
    });

    // ── Wire keyboard activation (Enter/Space) ───────────────────────────
    delegate(diagramEl, ".arbor-node", "keydown", (e, nodeEl) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // Space scrolls the page by default
        navigateToEvidence(nodeEl);
      }
    });
  }

  // ── Wire zoom controls ──────────────────────────────────────────────────
  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", zoomIn);
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", zoomOut);
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener("click", zoomReset);
  }

  // Keyboard zoom shortcuts — guard: don't fire while focus is on an input/textarea
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (isVerticalMode()) return;
    if (e.key === "=" || e.key === "+") {
      zoomIn();
    } else if (e.key === "-") {
      zoomOut();
    } else if (e.key === "0") {
      zoomReset();
    }
  });

  // ── Wire pan via mouse drag on canvas ───────────────────────────────────
  if (canvasEl) {
    canvasEl.addEventListener("mousedown", onPanStart);
    window.addEventListener("mousemove", onPanMove);
    window.addEventListener("mouseup", onPanEnd);

    // Touch support for pan (desktop only — vertical mode defers to scroll)
    canvasEl.addEventListener(
      "touchstart",
      (e) => {
        if (isVerticalMode()) return;
        if (e.touches.length === 1) {
          onPanStart({
            button: 0,
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            target: e.target,
          });
        }
      },
      { passive: false },
    );

    canvasEl.addEventListener(
      "touchmove",
      (e) => {
        if (isVerticalMode()) return;
        if (isPanning && e.touches.length === 1) {
          e.preventDefault();
          onPanMove({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
          });
        }
      },
      { passive: false },
    );

    canvasEl.addEventListener("touchend", onPanEnd);
  }

  // ── Re-render on breakpoint crossing (debounced resize/orientation) ───
  const onBreakpointChange = debounce(() => {
    const newMode = isVerticalMode();
    if (newMode !== currentVerticalMode) {
      currentVerticalMode = newMode;
      // Reset desktop transform when switching to/from vertical
      zoomReset();
      if (savedNodes && savedEdges) {
        renderArbor(savedNodes, savedEdges);
      }
    }
  }, 150);

  window.addEventListener("resize", onBreakpointChange);
  window.addEventListener("orientationchange", onBreakpointChange);
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
