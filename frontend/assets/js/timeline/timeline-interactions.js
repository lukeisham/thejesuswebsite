/**
 * Timeline interactions module: the entry script of every page under
 * /evidence/timeline/. It loads the events, calls `renderTimeline`, then wires
 * dot hover (tooltip, cluster glow), dot click (detail panel), stack click,
 * era chips and panel dismiss. Dot, stack and era-chip handlers are delegated
 * (JS-6); the panel close button, document click and Escape key use direct
 * listeners.
 *
 * Zoom and pan live in timeline-zoom.js, which `renderTimeline` mounts.
 * The element ids read in `init` (`timeline-container`, `timeline-tooltip`,
 * `detail-panel`, `detail-*`, `era-filters`) are in the markup of every
 * timeline page; renaming one there silences the matching feature.
 *
 * @module timeline/timeline-interactions
 */

import { delegate, batchWrite } from "../utils/dom.js";
import { escapeHTML } from "../utils/escape-html.js";
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
} from "./timeline-render.js";
import { fetchTimelineEvents, groupEventsByPeriod } from "./timeline-data.js";
import { showToast } from "../utils/toasts.js";
import { readEmbeddedData } from "../api.js";
import { announce } from "../utils/announce.js";
import { revalidateInBackground } from "../utils/data-revalidation.js";
import { jumpToEra } from "./timeline-nav.js";
// Zoom limits and `setTransform` are the zoom module's contract: a stack click
// asks `fitStackView` for a scale inside SCALE_MIN..SCALE_MAX and applies it.
import { setTransform, SCALE_MIN, SCALE_MAX } from "./timeline-zoom.js";
import { fitStackView } from "../cluster-logic/timeline-zoom-stacks.js";
import { TIMELINE_CANVAS_HEIGHT_PX } from "./timeline-geometry.js";

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

/** @type {HTMLElement|null} Focus-return target for keyboard navigation (JS-2) */
let focusReturnTarget = null;

// ─── Tooltip ───────────────────────────────────────────────────────────────────

/** Delay before the tooltip appears, so a pointer crossing the field does not flash it. */
const TOOLTIP_DELAY_MS = 200;

let tooltipTimer = null;

/**
 * True when the pointer moved into or out of `dot` itself, not between two
 * of its children. `mouseenter`/`mouseleave` do not bubble, so delegation
 * listens for `mouseover`/`mouseout`, which fire again on every child.
 *
 * @param {MouseEvent} e - a `mouseover` or `mouseout` event
 * @param {Element} dot - the matched `.timeline-dot`
 * @returns {boolean}
 */
function crossesDotBoundary(e, dot) {
  return !dot.contains(e.relatedTarget);
}

/**
 * Fill the tooltip for a dot, show it and place it at the pointer.
 *
 * @param {MouseEvent|TouchEvent} e
 * @param {HTMLElement} dot
 */
function showTooltip(e, dot) {
  if (!tooltipEl) return;

  const title = dot.dataset.title || "";
  const location = dot.dataset.location || "";
  const category = dot.dataset.category || "";
  const verse = dot.dataset.verse ? formatVerse(dot.dataset.verse) : "";

  const parts = [];
  if (title) parts.push(`<strong>${escapeHTML(title)}</strong>`);
  if (location) parts.push(escapeHTML(location));
  if (category) parts.push(renderBadge(category));
  if (verse) parts.push(`<em>${escapeHTML(verse)}</em>`);

  tooltipEl.innerHTML = parts.join("<br>");
  tooltipEl.hidden = false;
  positionTooltip(e);
}

/**
 * Place the shown tooltip beside the pointer, flipped to stay inside the
 * viewport. Called on every mouse move, so it only writes `left` and `top`.
 * A `TouchEvent` has no `clientX`/`clientY`; its first touch point carries them.
 *
 * @param {MouseEvent|TouchEvent} e
 */
function positionTooltip(e) {
  const padding = 12;
  const point = e.touches?.[0] ?? e;
  let left = point.clientX + padding;
  let top = point.clientY + padding;

  const rect = tooltipEl.getBoundingClientRect();
  if (left + rect.width > window.innerWidth) {
    left = point.clientX - rect.width - padding;
  }
  if (top + rect.height > window.innerHeight) {
    top = point.clientY - rect.height - padding;
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

// ─── Detail Panel ──────────────────────────────────────────────────────────────

/**
 * Populate and show the detail panel for a dot.
 *
 * @param {HTMLElement} dot
 */
function showDetailPanel(dot) {
  if (!panelEl) return;

  focusReturnTarget = dot;

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
    panelLink.href = `/evidence/${encodeURIComponent(slug)}`;
  }

  panelEl.hidden = false;
}

/**
 * Hide the detail panel.
 */
function hideDetailPanel() {
  if (panelEl) panelEl.hidden = true;
  // Return focus to the triggering dot so keyboard users don't lose their place
  if (focusReturnTarget && focusReturnTarget.isConnected) {
    focusReturnTarget.focus();
  }
  focusReturnTarget = null;
}

// ─── Zoom stacks ───────────────────────────────────────────────────────────────

/** Largest zoom that a stack click asks for. A tighter zoom would show too
 * little of the timeline around the stack. */
const STACK_ZOOM_MAX = 2;

/**
 * Zoom to a stack so that its events sit at their exact positions, with the
 * stack in the middle of the view. The scale and the horizontal pan come from
 * `fitStackView`; the vertical pan puts the spine in the middle of the view.
 *
 * @param {HTMLElement} stack - the stack button; its `data-min-x` and `data-max-x` hold the events' range
 */
function zoomToStack(stack) {
  if (!container) {
    console.warn("timeline-interactions: zoomToStack called before init found the container");
    return;
  }
  const minX = Number(stack.dataset.minX);
  const maxX = Number(stack.dataset.maxX);
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    console.warn("timeline-interactions: stack button has no usable x range", stack.dataset);
    return;
  }

  const { scale, panX } = fitStackView(
    minX,
    maxX,
    container.clientWidth,
    SCALE_MIN,
    Math.min(SCALE_MAX, STACK_ZOOM_MAX),
  );
  const world = container.querySelector(".timeline-world");
  const worldTop = world ? world.offsetTop : 0;
  const panY = container.clientHeight / 2 - worldTop - (TIMELINE_CANVAS_HEIGHT_PX / 2) * scale;
  setTransform(panX, panY, scale);
  announce(`${stack.getAttribute("aria-label") || "Stack"} Zoomed in.`);
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

// ─── Initialisation ────────────────────────────────────────────────────────────

const LOAD_ERROR_MESSAGE = "Failed to load timeline events. Please try again.";

/**
 * Fetch the events and draw the timeline. The era pages embed a snapshot
 * (`api/scripts/embed-initial-data.js`) that paints first (SR-3); a page
 * without one fetches live.
 *
 * @returns {Promise<boolean>} true when the timeline was drawn; false when the
 *   empty state is showing instead.
 */
async function loadAndRender() {
  const embedded = readEmbeddedData("timeline-data");
  let events;
  if (embedded && Array.isArray(embedded) && embedded.length > 0) {
    events = embedded;
  } else {
    showLoading();

    const { data, error } = await fetchTimelineEvents();

    if (error) {
      showToast(LOAD_ERROR_MESSAGE, "error");
      showEmpty();
      return false;
    }

    events = Array.isArray(data)
      ? data
      : data && data.events
        ? data.events
        : [];
  }

  const grouped = groupEventsByPeriod(events);

  if (grouped.size === 0) {
    showEmpty();
    return false;
  }

  renderTimeline(grouped, activeEra);

  // An embedded snapshot is only as fresh as the last deploy, so check live
  // data after first paint and re-render if it differs. Not awaited: it must
  // not delay the interaction wiring in `init`.
  revalidateInBackground({
    embeddedData: events,
    fetchLive: fetchTimelineEvents,
    onFresh: (fresh) => {
      const freshEvents = Array.isArray(fresh) ? fresh : fresh.events || [];
      const freshGrouped = groupEventsByPeriod(freshEvents);
      if (freshGrouped.size === 0) return;
      renderTimeline(freshGrouped, activeEra);
    },
  });

  return true;
}

/**
 * Wire hover, click and keyboard handling for the dots and stacks. Delegated
 * from the container, so the dots that `renderTimeline` redraws keep working.
 */
function wireDotInteractions() {
  // Tooltip: `mouseover`/`mouseout` because `mouseenter`/`mouseleave` do not
  // bubble to a delegating root.
  delegate(container, ".timeline-dot", "mouseover", (e, dot) => {
    if (!crossesDotBoundary(e, dot)) return;
    tooltipTimer = setTimeout(() => showTooltip(e, dot), TOOLTIP_DELAY_MS);
  });

  delegate(container, ".timeline-dot", "mouseout", (e, dot) => {
    if (!crossesDotBoundary(e, dot)) return;
    hideTooltip();
  });

  delegate(container, ".timeline-dot", "mousemove", (e) => {
    if (tooltipEl && !tooltipEl.hidden) {
      positionTooltip(e);
    }
  });

  delegate(container, ".timeline-dot", "touchstart", (e, dot) => {
    tooltipTimer = setTimeout(() => showTooltip(e, dot), TOOLTIP_DELAY_MS);
  });

  delegate(container, ".timeline-dot", "touchend", hideTooltip);

  // A scroll gesture is not a long press.
  delegate(container, ".timeline-dot", "touchmove", hideTooltip);

  delegate(container, ".timeline-dot", "click", (_e, dot) => {
    showDetailPanel(dot);
    announce(`${dot.dataset.title || "Event"}, details shown`);
  });

  delegate(container, ".timeline-dot", "keydown", (e, dot) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Space scrolls the page by default
      showDetailPanel(dot);
      announce(`${dot.dataset.title || "Event"}, details shown`);
    }
  });

  // A stack is a real button, so Enter and Space fire this click too.
  delegate(container, ".timeline-stack", "click", (_e, stack) => {
    zoomToStack(stack);
  });

  // Hovering one dot lights every dot of its period.
  delegate(container, ".timeline-dot", "mouseover", (e, dot) => {
    if (!crossesDotBoundary(e, dot)) return;
    setClusterGlow(dot, true);
  });

  delegate(container, ".timeline-dot", "mouseout", (e, dot) => {
    if (!crossesDotBoundary(e, dot)) return;
    setClusterGlow(dot, false);
  });
}

/**
 * Add or remove the glow class on every dot that shares `dot`'s period.
 *
 * @param {HTMLElement} dot
 * @param {boolean} on
 */
function setClusterGlow(dot, on) {
  const period = dot.dataset.period;
  if (!period) return;

  batchWrite(() => {
    const siblings = container.querySelectorAll(
      `.timeline-dot[data-period="${CSS.escape(period)}"]`,
    );
    siblings.forEach((s) => {
      s.classList.toggle("timeline-dot--cluster-glow", on);
    });
  });
}

/**
 * Bootstrap the timeline page: cache the markup, draw the timeline, wire
 * interactions. A failed load leaves the empty state showing and wires nothing.
 */
async function init() {
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

  if (!container || !tooltipEl || !panelEl) {
    console.warn("timeline-interactions: timeline markup is missing an element", {
      container: !!container,
      tooltip: !!tooltipEl,
      detailPanel: !!panelEl,
    });
  }

  try {
    if (!(await loadAndRender())) return;
  } catch (error) {
    console.error("timeline-interactions: loading the timeline failed:", error);
    showToast(LOAD_ERROR_MESSAGE, "error");
    showEmpty();
    return;
  }

  if (activeEra !== "all" && filtersEl) {
    filtersEl.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.era === activeEra);
    });
  }

  if (container) {
    wireDotInteractions();
  }

  if (filtersEl) {
    delegate(filtersEl, ".filter-chip", "click", (_e, chip) => {
      const era = chip.dataset.era;
      setEraFilter(era);
      jumpToEra(era);
    });
  }

  if (panelClose) {
    panelClose.classList.add("btn", "btn--ghost");
    panelClose.addEventListener("click", hideDetailPanel);
  }

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
