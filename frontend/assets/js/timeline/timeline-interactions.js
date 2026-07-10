/**
 * Timeline interactions module.
 *
 * Handles dot hover → tooltip, dot click → detail panel, era filter chips,
 * cluster hover highlight, drag/momentum horizontal scroll, and panel dismiss.
 * Uses event delegation (JS-6).
 *
 * @module timeline/timeline-interactions
 */

import { delegate, batchWrite } from "../utils/dom.js";
import { formatVerse } from "../utils/format.js";
import { renderBadge } from "../utils/templates.js";
import {
  init as renderInit,
  showLoading,
  showEmpty,
  renderTimeline,
  clearFilteredOut,
  applyEraFilter,
  initialEra,
  isVerticalMode,
} from "./timeline-render.js";
import { fetchTimelineEvents, groupEventsByPeriod } from "./timeline-data.js";
import { showToast } from "../utils/toasts.js";

// ─── DOM references ────────────────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let container = null;

/** @type {HTMLElement|null} */
let tooltipEl = null;

/** @type {HTMLElement|null} */
let panelEl = null;

/** @type {HTMLElement|null} */
let panelTitle = null;
let panelMeta = null;
let panelVerse = null;
let panelLink = null;
let panelClose = null;

/** @type {HTMLElement|null} */
let filtersEl = null;

/** @type {string} */
let activeEra = initialEra || "all";

// ─── Tooltip ───────────────────────────────────────────────────────────────────

let tooltipTimer = null;

/**
 * Show the tooltip near a dot.
 *
 * @param {MouseEvent} e
 * @param {HTMLElement} dot
 */
function showTooltip(e, dot) {
  if (!tooltipEl) return;

  const title = dot.dataset.title || "";
  const location = dot.dataset.location || "";
  const category = dot.dataset.category || "";
  const verse = dot.dataset.verse ? formatVerse(dot.dataset.verse) : "";

  const parts = [];
  if (title) parts.push(`<strong>${title}</strong>`);
  if (location) parts.push(location);
  if (category) parts.push(renderBadge(category));
  if (verse) parts.push(`<em>${verse}</em>`);

  tooltipEl.innerHTML = parts.join("<br>");
  tooltipEl.hidden = false;

  // Position near cursor, clamped within viewport
  const padding = 12;
  let left = e.clientX + padding;
  let top = e.clientY + padding;

  // Prevent overflow off right/bottom edges
  const rect = tooltipEl.getBoundingClientRect();
  if (left + rect.width > window.innerWidth) {
    left = e.clientX - rect.width - padding;
  }
  if (top + rect.height > window.innerHeight) {
    top = e.clientY - rect.height - padding;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

/**
 * Initialise tooltip inline styles using design tokens.
 */
function initTooltipStyles() {
  if (!tooltipEl) return;
  Object.assign(tooltipEl.style, {
    position: "fixed",
    zIndex: "60",
    maxWidth: "240px",
    padding: "var(--space-sm) var(--space-md)",
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    boxShadow: "var(--shadow-card)",
    fontSize: "var(--text-2xs)",
    lineHeight: "var(--leading-small)",
    pointerEvents: "none",
  });
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

// ─── Detail Panel ──────────────────────────────────────────────────────────────

/**
 * Populate and show the detail panel for a dot.
 *
 * @param {HTMLElement} dot
 */
function showDetailPanel(dot) {
  if (!panelEl) return;

  const title = dot.dataset.title || "";
  const location = dot.dataset.location || "";
  const verse = dot.dataset.verse || "";
  const slug = dot.dataset.slug || "";

  if (panelTitle) panelTitle.textContent = title;

  if (panelMeta) {
    panelMeta.textContent = location || "";
  }

  if (panelVerse) {
    panelVerse.textContent = verse ? formatVerse(verse) : "";
  }

  if (panelLink) {
    panelLink.href = `/evidence/${slug}`;
  }

  panelEl.hidden = false;
}

/**
 * Hide the detail panel.
 */
function hideDetailPanel() {
  if (panelEl) panelEl.hidden = true;
}

// ─── Era Filters ───────────────────────────────────────────────────────────────

/**
 * Update the active era filter and re-render.
 *
 * @param {string} era - Era key or 'all'.
 */
function setEraFilter(era) {
  activeEra = era;

  // Update chip active states
  if (filtersEl) {
    filtersEl.querySelectorAll(".filter-chip").forEach((chip) => {
      const chipEra = chip.dataset.era;
      if (chipEra === era) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });
  }

  // Apply visual filter
  if (era === "all") {
    clearFilteredOut();
  } else {
    applyEraFilter(era);
  }

  hideDetailPanel();
}

// ─── Drag / Momentum Scroll ────────────────────────────────────────────────────

let isDragging = false;
let dragStartX = 0;
let scrollStartX = 0;
let velocityX = 0;
let lastX = 0;
let lastTime = 0;
let momentumRaf = null;

/**
 * Whether the user has requested reduced motion (Style guide §6) — momentum
 * decay is a JS-driven animation the global CSS reduced-motion rule can't
 * reach, so it's checked explicitly here.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Clamp a horizontal scroll target to the container's valid scroll range,
 * so drag/momentum can never push it past either end.
 *
 * @param {number} target
 * @returns {number}
 */
function clampScrollLeft(target) {
  const max = Math.max(0, container.scrollWidth - container.clientWidth);
  return Math.max(0, Math.min(max, target));
}

/**
 * Start drag. Only active in horizontal (desktop/tablet) mode — vertical
 * mode defers entirely to native page scroll.
 */
function onDragStart(e) {
  if (isVerticalMode()) return;
  // Only handle left mouse button
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  scrollStartX = container.scrollLeft;
  lastX = e.clientX;
  lastTime = performance.now();
  velocityX = 0;

  if (momentumRaf) {
    cancelAnimationFrame(momentumRaf);
    momentumRaf = null;
  }

  container.style.cursor = "grabbing";
  container.style.userSelect = "none";
}

/**
 * Drag move.
 */
function onDragMove(e) {
  if (!isDragging) return;

  const dx = e.clientX - dragStartX;
  container.scrollLeft = clampScrollLeft(scrollStartX - dx);

  // Calculate velocity
  const now = performance.now();
  const dt = now - lastTime;
  if (dt > 0) {
    velocityX = (e.clientX - lastX) / dt; // px/ms
  }
  lastX = e.clientX;
  lastTime = now;
}

/**
 * End drag — apply momentum.
 */
function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;

  container.style.cursor = "";
  container.style.removeProperty("user-select");

  // Apply momentum if velocity is significant (skipped under reduced motion)
  if (Math.abs(velocityX) > 0.05 && !prefersReducedMotion()) {
    momentumScroll();
  }
}

/**
 * Decaying momentum animation. Stops as soon as the scroll position hits
 * either edge, rather than continuing to decay against a clamped value.
 */
function momentumScroll() {
  const friction = 0.95;
  const minVelocity = 0.02;

  momentumRaf = requestAnimationFrame(() => {
    const raw = container.scrollLeft - velocityX * 16;
    const next = clampScrollLeft(raw);
    const hitEdge = next !== raw;
    container.scrollLeft = next;
    velocityX *= friction;

    if (!hitEdge && Math.abs(velocityX) > minVelocity) {
      momentumScroll();
    } else {
      momentumRaf = null;
    }
  });
}

// ─── Initialisation ────────────────────────────────────────────────────────────

/**
 * Bootstrap the timeline page: fetch data, render, and wire interactions.
 */
async function init() {
  // Cache DOM references
  renderInit();
  container = document.getElementById("timeline-container");
  tooltipEl = document.getElementById("timeline-tooltip");
  panelEl = document.getElementById("detail-panel");
  panelTitle = document.getElementById("detail-title");
  panelMeta = document.getElementById("detail-meta");
  panelVerse = document.getElementById("detail-verse");
  panelLink = document.getElementById("detail-link");
  panelClose = document.getElementById("detail-panel-close");
  filtersEl = document.getElementById("era-filters");

  // ── Fetch events ────────────────────────────────────────────────────────
  showLoading();

  const { data, error } = await fetchTimelineEvents();

  if (error) {
    showToast("Failed to load timeline events. Please try again.", "error");
    showEmpty();
    return;
  }

  const events = Array.isArray(data)
    ? data
    : data && data.events
      ? data.events
      : [];
  const grouped = groupEventsByPeriod(events);

  if (grouped.size === 0) {
    showEmpty();
    return;
  }

  renderTimeline(grouped, activeEra);

  // ── Update chip active state for initial era ────────────────────────────
  if (activeEra !== "all" && filtersEl) {
    filtersEl.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.era === activeEra);
    });
  }

  // ── Wire tooltip on dots (JS-6: event delegation) ──────────────────────
  if (container) {
    delegate(container, ".timeline-dot", "mouseenter", (e, dot) => {
      tooltipTimer = setTimeout(() => showTooltip(e, dot), 200);
    });

    delegate(container, ".timeline-dot", "mouseleave", () => {
      hideTooltip();
    });

    delegate(container, ".timeline-dot", "mousemove", (e, dot) => {
      // Update tooltip position on move even while shown
      if (tooltipEl && !tooltipEl.hidden) {
        showTooltip(e, dot);
      }
    });

    // ── Wire click → detail panel ────────────────────────────────────────
    delegate(container, ".timeline-dot", "click", (_e, dot) => {
      showDetailPanel(dot);
    });

    // ── Cluster hover highlight ─────────────────────────────────────────
    const CLUSTER_GLOW = "0 0 0 4px rgba(92, 64, 51, 0.15)";

    delegate(container, ".timeline-dot", "mouseenter", (_e, dot) => {
      const period = dot.dataset.period;
      if (!period) return;

      batchWrite(() => {
        const siblings = container.querySelectorAll(
          `.timeline-dot[data-period="${CSS.escape(period)}"]`,
        );
        siblings.forEach((s) => {
          s.style.boxShadow = CLUSTER_GLOW;
        });
      });
    });

    delegate(container, ".timeline-dot", "mouseleave", (_e, dot) => {
      const period = dot.dataset.period;
      if (!period) return;

      batchWrite(() => {
        const siblings = container.querySelectorAll(
          `.timeline-dot[data-period="${CSS.escape(period)}"]`,
        );
        siblings.forEach((s) => {
          s.style.boxShadow = "";
        });
      });
    });

    // ── Drag / momentum scroll ───────────────────────────────────────────
    container.addEventListener("mousedown", onDragStart);
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);

    // Touch support (horizontal mode only — vertical mode uses native scroll)
    container.addEventListener(
      "touchstart",
      (e) => {
        if (isVerticalMode()) return;
        if (e.touches.length === 1) {
          onDragStart({
            button: 0,
            clientX: e.touches[0].clientX,
          });
        }
      },
      { passive: false },
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (isDragging && e.touches.length === 1) {
          e.preventDefault();
          onDragMove({ clientX: e.touches[0].clientX });
        }
      },
      { passive: false },
    );

    container.addEventListener("touchend", onDragEnd);
  }

  // ── Wire era filter chips (JS-6: event delegation) ────────────────────
  if (filtersEl) {
    delegate(filtersEl, ".filter-chip", "click", (_e, chip) => {
      setEraFilter(chip.dataset.era);
    });
  }

  // ── Wire detail panel close ────────────────────────────────────────────
  if (panelClose) {
    panelClose.classList.add("btn", "btn--ghost");
    panelClose.addEventListener("click", hideDetailPanel);
  }

  // ── Initialise tooltip styles ──────────────────────────────────────────
  initTooltipStyles();

  // ── Dismiss panel on outside click or ESC ──────────────────────────────
  document.addEventListener("click", (e) => {
    if (panelEl && !panelEl.hidden) {
      const clickedInside = panelEl.contains(e.target);
      const clickedDot = e.target.closest(".timeline-dot");
      if (!clickedInside && !clickedDot) {
        hideDetailPanel();
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panelEl && !panelEl.hidden) {
      hideDetailPanel();
    }
  });
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
