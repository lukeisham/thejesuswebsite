/**
 * Timeline render module.
 *
 * Builds the DOM timeline inside `.timeline-container`. Computes horizontal
 * (desktop/tablet) or vertical (mobile, < 768px) positions from period
 * indices using fixed world-coordinate geometry, staggers overlapping events
 * into escalating clusters, draws era markers and labels, and handles
 * loading / empty states.
 *
 * Zoom and pan are now applied by a CSS transform on a `.timeline-world`
 * wrapper (matching the arbor diagram model), so all positions use the
 * fixed `BASE_PX_PER_PERIOD` geometry — no CSS variable read needed.
 *
 * @module timeline/timeline-render
 */

import {
  TIMELINE_PERIODS,
  ERA_BOUNDARIES,
  ERA_LABELS,
  getPeriodIndex,
} from "./timeline-data.js";
import { createElement, batchWrite } from "../utils/dom.js";
import { debounce } from "../utils/debounce.js";
import {
  getClusterDensity,
  DENSITY_COMPACT,
  DENSITY_NORMAL,
  DENSITY_SPREAD,
} from "../cluster-logic/cluster-density.js";
import { computeDotPositions } from "../cluster-logic/cluster-placement.js";
import {
  computeLabelModes,
  LABEL_FULL,
  LABEL_TRUNCATED,
  LABEL_HIDDEN,
} from "../cluster-logic/cluster-labels.js";
import { periodX, periodY, BASE_PX_PER_PERIOD } from "./timeline-geometry.js";
import { getScale, mountZoomControls } from "./timeline-zoom.js";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Read the initial era from body dataset attributes.
 * These are set by era-specific HTML pages and read at module evaluation time
 * (scripts are deferred, so DOM is parsed).
 */
export const initialEra =
  (typeof document !== "undefined" && document.body?.dataset?.initialEra) ||
  null;

/** Matches the mobile vertical-mode breakpoint used in timelines.css. */
const MOBILE_QUERY = "(max-width: 767px)";

/** Minimum pixel gap enforced between adjacent label bounding boxes. */
const LABEL_GAP_PX = 8;

/**
 * Compute the effective px-per-period at the current zoom level.
 * cluster-density.js thresholds work against this value just as they did
 * against the old CSS variable — it's BASE_PX_PER_PERIOD × current zoom scale.
 *
 * @returns {number}
 */
export function effectivePxPerPeriod() {
  return BASE_PX_PER_PERIOD * getScale();
}

/**
 * Whether the viewport is currently in mobile vertical-mode range.
 *
 * @returns {boolean}
 */
export function isVerticalMode() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_QUERY).matches
  );
}

// ─── Cached references (SR-3) ─────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let container = null;

/** @type {HTMLElement|null} */
let spineEl = null;

/** @type {HTMLElement|null} */
let innerEl = null;

/** @type {HTMLElement|null} */
let loadingEl = null;

/** @type {HTMLElement|null} */
let emptyEl = null;

/** Last render inputs, kept so a breakpoint crossing can trigger a re-render. */
let lastGroupedEvents = null;
let lastActiveEra = "all";
let currentMode = null;

/** Teardown for the debounced resize listener (JS-6: clean up listeners). */
let resizeTeardown = null;

/**
 * Initialise cached references to key DOM nodes and wire the
 * debounced resize listener.
 */
export function init() {
  container = document.getElementById("timeline-container");
  spineEl = document.getElementById("timeline-spine");
  loadingEl = document.getElementById("loading-state");
  emptyEl = document.getElementById("empty-state");

  // Debounced resize — re-render on breakpoint crossing
  const handleResize = debounce(() => {
    const mode = isVerticalMode();
    if (mode !== currentMode && lastGroupedEvents) {
      renderTimeline(lastGroupedEvents, lastActiveEra);
    }
  }, 150);

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
  resizeTeardown = () => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleResize);
  };
}

/**
 * Show the loading spinner, hide the timeline and empty state.
 */
export function showLoading() {
  if (loadingEl) loadingEl.hidden = false;
  if (container) container.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
}

/**
 * Show the empty state, hide the loading spinner and timeline.
 */
export function showEmpty() {
  if (emptyEl) emptyEl.hidden = false;
  if (loadingEl) loadingEl.hidden = true;
  if (container) container.hidden = true;
}

// ─── Horizontal label helpers (positioning, side) ────────────────────────────

/**
 * Determine label positioning class based on vertical offset relative to spine.
 * @param {number} yOffset - cluster-jittered Y offset for this dot
 * @returns {string} "above" or "below"
 */
function labelPosition(yOffset) {
  return yOffset <= 0 ? "above" : "below";
}

/**
 * Determine label side for vertical mode based on X offset.
 * @param {number} xOffset
 * @returns {string} "left" or "right"
 */
function labelSide(xOffset) {
  return xOffset <= 0 ? "left" : "right";
}

/**
 * Clearance constants for label positioning relative to dots (Phase 1).
 */
const LABEL_CLEARANCE_PCT = 10;
const LABEL_CLEARANCE_PX = 48;

/**
 * Step size per collision-escalation tier (Phase 2).
 */
const TIER_STEP_PCT = 12;
const TIER_STEP_PX = 40;

/**
 * Compute the inline style string for a horizontal-mode label.
 * @param {number} finalX  - dot's pixel x position
 * @param {number} yOffset - dot's cluster-jittered y offset
 * @returns {string} inline style value
 */
function labelStyleHorizontal(finalX, yOffset) {
  var dotTop = 50 + yOffset / 2;
  var labelTop = yOffset <= 0
    ? dotTop - LABEL_CLEARANCE_PCT
    : dotTop + LABEL_CLEARANCE_PCT;
  return "left:" + finalX + "px;top:" + labelTop + "%";
}

/**
 * Compute the inline style string for a vertical-mode label.
 * @param {number} finalY  - dot's pixel y position
 * @param {number} xOffset - dot's cluster-jittered x offset
 * @returns {string} inline style value
 */
function labelStyleVertical(finalY, xOffset) {
  var labelLeft = xOffset <= 0
    ? xOffset - LABEL_CLEARANCE_PX
    : xOffset + LABEL_CLEARANCE_PX;
  return "top:" + finalY + "px;left:calc(50% + " + labelLeft + "px)";
}

/**
 * Build the dot element shared by both layout modes.
 * @param {Object} event
 * @param {string} style - inline positioning style
 * @param {boolean} isFiltered
 * @returns {HTMLElement}
 */
function createDot(event, style, isFiltered) {
  const era = event.timeline_era || "";
  const eraKebab = era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const category = event.gospel_category || "";
  let catClass = "";
  if (category === "places") catClass = "dot-cat--place";
  else if (category === "people") catClass = "dot-cat--person";
  else if (category === "objects") catClass = "dot-cat--object";

  const className = [
    "timeline-dot",
    eraKebab ? "era--" + eraKebab : "",
    catClass,
    isFiltered ? "filtered-out" : "",
  ].filter(Boolean).join(" ");

  const dot = createElement("button", {
    className: className,
    style: style,
    tabIndex: isFiltered ? "-1" : "0",
    role: "button",
    ariaLabel: (event.title || "Timeline event"),
  });

  dot.dataset.eventId = String(event.id);
  dot.dataset.period = event.timeline_period || "";
  dot.dataset.era = event.timeline_era || "";
  dot.dataset.title = event.title || "";
  dot.dataset.location = event.location || "";
  dot.dataset.verse = event.verses || "";
  dot.dataset.slug = event.slug || "";
  dot.dataset.category = event.gospel_category || "";

  return dot;
}

/**
 * Build the label element shared by both layout modes.
 * @param {Object} event
 * @param {string} posClass - "above" or "below"
 * @param {string} style - inline positioning style
 * @param {boolean} isFiltered
 * @returns {HTMLElement}
 */
function createLabel(event, posClass, style, isFiltered) {
  const titleSpan = createElement("span", {
    className: "timeline-label-title",
    textContent: event.title || "",
  });

  const metaText =
    (event.location ? event.location + " " : "") +
    (event.verses ? event.verses : "");
  const metaSpan = createElement("span", {
    className: "timeline-label-meta",
    textContent: metaText.trim(),
  });

  const className = [
    "timeline-label",
    posClass,
    isFiltered ? "filtered-out" : "",
  ].filter(Boolean).join(" ");

  const label = createElement("span", {
    className: className,
    style: style,
  });
  label.dataset.eventId = String(event.id);

  label.appendChild(titleSpan);
  if (metaSpan.textContent) label.appendChild(metaSpan);
  return label;
}

/**
 * Layout era markers and labels in horizontal mode.
 * @param {HTMLElement} innerEl
 * @param {number} slotWidth
 */
function layoutEraLabelsHorizontal(inner, slotWidth) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);

  let prevMidX = 0;
  let prevHalfSpan = 0;
  let alternate = false;

  const BASE_TOP = "4px";
  const ALT_TOP = "28px";

  for (const era of eraKeys) {
    const bounds = ERA_BOUNDARIES[era];
    const markerX = bounds.start * slotWidth;

    // Era divider at era start
    const divider = createElement("div", {
      className: "timeline-era-marker",
      style: `left:${markerX}px`,
    });
    inner.appendChild(divider);

    const eraStartX = bounds.start * slotWidth;
    const eraEndX = (bounds.end + 1) * slotWidth;
    const eraMidX = (eraStartX + eraEndX) / 2;
    const span = eraEndX - eraStartX;
    const halfSpan = span / 2;

    const tooClose =
      alternate > 0 && eraMidX - halfSpan < prevMidX + prevHalfSpan;
    const labelTop = tooClose ? ALT_TOP : BASE_TOP;
    if (tooClose) alternate = !alternate;

    const labelMaxW = Math.min(140, span);
    const eraLabel = createElement("span", {
      className: "timeline-era-label",
      style: `left:${eraMidX}px;top:${labelTop};max-width:${labelMaxW}px`,
      textContent: ERA_LABELS[era] || era,
    });
    inner.appendChild(eraLabel);

    prevMidX = eraMidX;
    prevHalfSpan = halfSpan;
  }
}

/**
 * Layout era markers and labels in vertical mode.
 * @param {HTMLElement} innerEl
 * @param {number} slotHeight
 */
function layoutEraLabelsVertical(inner, slotHeight) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);

  for (const era of eraKeys) {
    const bounds = ERA_BOUNDARIES[era];
    const markerY = bounds.start * slotHeight;

    // Era divider
    const divider = createElement("div", {
      className: "timeline-era-marker timeline-era-marker--vertical",
      style: `top:${markerY}px`,
    });
    inner.appendChild(divider);

    const eraStartY = (bounds.start + bounds.end) / 2 * slotHeight;

    const eraLabel = createElement("div", {
      className: "timeline-era-label timeline-era-label--vertical",
      style: `top:${eraStartY}px`,
      textContent: ERA_LABELS[era] || era,
    });
    inner.appendChild(eraLabel);
  }
}

/**
 * Build the horizontal desktop/tablet layout.
 *
 * All positions use fixed BASE_PX_PER_PERIOD world coordinates. Zoom is
 * applied by the `.timeline-world` transform wrapper.
 *
 * @param {Map<string, Array>} groupedEvents
 * @param {string|null} activeEra
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array}}
 */
function buildHorizontalLayout(groupedEvents, activeEra) {
  const totalWidth = TIMELINE_PERIODS.length * BASE_PX_PER_PERIOD;
  const effectivePx = effectivePxPerPeriod();

  const inner = createElement("div", {
    className: "timeline-inner",
    style: `width:${totalWidth}px;position:relative;height:100%;min-height:280px`,
  });

  inner.appendChild(
    createElement("div", {
      className: "timeline-spine",
      style: `width:${totalWidth}px`,
    }),
  );

  layoutEraLabelsHorizontal(inner, BASE_PX_PER_PERIOD);

  // Compute cluster-placement positions and label modes
  const positions = computeDotPositions(groupedEvents, BASE_PX_PER_PERIOD);
  const densityTier = getClusterDensity(null, effectivePx);

  // Build flattened descriptors for label-mode computation
  const flatDescs = [];
  for (const [period, periodPositions] of positions) {
    for (const pos of periodPositions) {
      flatDescs.push({ event: pos.event, timeline_period: period });
    }
  }
  const labelModes = computeLabelModes(flatDescs, densityTier);
  const modeByEventId = new Map();
  for (const lm of labelModes) {
    modeByEventId.set(lm.event.id, lm.mode);
  }

  let hasEvents = false;
  const labelDescriptors = [];

  for (const [period, periodPositions] of positions) {
    const periodIdx = getPeriodIndex(period);
    if (periodIdx < 0) continue;

    const x = periodX(periodIdx);

    periodPositions.forEach((pos, clusterIndex) => {
      const event = pos.event;
      let yOffset = pos.yOffset;
      const xFan = pos.xFan || 0;

      // Apply timeline offsets if present (stored manual repositioning).
      let finalX = x + xFan;
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        finalX = x + (event.timeline_offset_x * BASE_PX_PER_PERIOD);
      }
      if (event.timeline_offset_y !== null && event.timeline_offset_y !== undefined) {
        yOffset = event.timeline_offset_y * 280;
      }

      const posClass = labelPosition(yOffset);
      const isFiltered =
        activeEra && activeEra !== "all" && event.timeline_era !== activeEra;
      const dotStyle = `left:${finalX}px;top:${50 + yOffset / 2}%`;
      const labelStyle = labelStyleHorizontal(finalX, yOffset);

      inner.appendChild(createDot(event, dotStyle, isFiltered));

      const label = createLabel(event, posClass, labelStyle, isFiltered);

      const mode = modeByEventId.get(event.id) || LABEL_FULL;
      if (mode === LABEL_TRUNCATED) {
        label.classList.add("label--truncated");
      } else if (mode === LABEL_HIDDEN) {
        label.classList.add("label--hidden");
      }

      inner.appendChild(label);
      labelDescriptors.push({
        el: label,
        tierIndex: clusterIndex,
        axis: "x",
        originalTop: labelStyle,
      });

      hasEvents = true;
    });
  }

  return { innerEl: inner, hasEvents, labelDescriptors };
}

/**
 * Build the vertical (mobile, < 768px) layout: spine runs top-to-bottom,
 * events stagger left/right of it, era labels become section headings.
 *
 * @param {Map<string, Array>} groupedEvents
 * @param {string|null} activeEra
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array}}
 */
function buildVerticalLayout(groupedEvents, activeEra) {
  const totalHeight = TIMELINE_PERIODS.length * BASE_PX_PER_PERIOD;
  const effectivePx = effectivePxPerPeriod();

  const inner = createElement("div", {
    className: "timeline-inner timeline-inner--vertical",
    style: `height:${totalHeight}px;position:relative;width:100%;min-height:${totalHeight}px`,
  });

  inner.appendChild(
    createElement("div", {
      className: "timeline-spine timeline-spine--vertical",
      style: `height:${totalHeight}px`,
    }),
  );

  layoutEraLabelsVertical(inner, BASE_PX_PER_PERIOD);

  const positions = computeDotPositions(groupedEvents, BASE_PX_PER_PERIOD);
  const densityTier = getClusterDensity(null, effectivePx);

  const flatDescs = [];
  for (const [period, periodPositions] of positions) {
    for (const pos of periodPositions) {
      flatDescs.push({ event: pos.event, timeline_period: period });
    }
  }
  const labelModes = computeLabelModes(flatDescs, densityTier);
  const modeByEventId = new Map();
  for (const lm of labelModes) {
    modeByEventId.set(lm.event.id, lm.mode);
  }

  let hasEvents = false;
  const labelDescriptors = [];

  for (const [period, periodPositions] of positions) {
    const periodIdx = getPeriodIndex(period);
    if (periodIdx < 0) continue;

    const y = periodY(periodIdx);

    periodPositions.forEach((pos, clusterIndex) => {
      const event = pos.event;
      let xOffset = pos.yOffset; // In vertical mode, yOffset becomes xOffset
      const yFan = pos.xFan || 0;

      let finalY = y + yFan;
      if (event.timeline_offset_y !== null && event.timeline_offset_y !== undefined) {
        finalY = y + (event.timeline_offset_y * BASE_PX_PER_PERIOD);
      }
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        xOffset = event.timeline_offset_x * 280;
      }

      const side = labelSide(xOffset);
      const isFiltered =
        activeEra && activeEra !== "all" && event.timeline_era !== activeEra;
      const dotStyle = `top:${finalY}px;left:calc(50% + ${xOffset / 2}px)`;
      const labelStyle = labelStyleVertical(finalY, xOffset);

      inner.appendChild(createDot(event, dotStyle, isFiltered));

      const label = createLabel(event, side, labelStyle, isFiltered);

      const mode = modeByEventId.get(event.id) || LABEL_FULL;
      if (mode === LABEL_TRUNCATED) {
        label.classList.add("label--truncated");
      } else if (mode === LABEL_HIDDEN) {
        label.classList.add("label--hidden");
      }

      inner.appendChild(label);
      labelDescriptors.push({
        el: label,
        tierIndex: clusterIndex,
        axis: "y",
        originalLeft: labelStyle,
      });

      hasEvents = true;
    });
  }

  return { innerEl: inner, hasEvents, labelDescriptors };
}

/**
 * Attempt to push a single label descriptor to a higher tier when its
 * bounding rect overlaps a previously placed sibling on the same axis.
 *
 * @param {Object} desc
 * @param {number} tier
 * @param {Array} placedRects
 * @param {'x'|'y'} axis
 * @param {number} maxTier
 */
function applyTier(desc, tier, placedRects, axis, maxTier) {
  const el = desc.el;
  if (!el) return;

  const primaryDiff = axis === "x" ? TIER_STEP_PCT : TIER_STEP_PX;
  const primaryKey = axis === "x" ? "left" : "top";

  el.style[primaryKey] = desc.originalTop;
  const rect = el.getBoundingClientRect();
  for (let i = 0; i < placedRects.length; i++) {
    if (rectsOverlap(rect, placedRects[i])) {
      const currentVal = parseFloat(el.style[primaryKey]);
      el.style[primaryKey] =
        (Number.isFinite(currentVal) ? currentVal : 0) +
        (el.dataset._tierSign === "negative" ? -primaryDiff : primaryDiff);
      break;
    }
  }
  el.dataset._tierSign = el.dataset._tierSign || "positive";
}

/**
 * Check whether two bounding rectangles overlap with a gap allowance.
 * @param {DOMRect} a
 * @param {DOMRect} b
 * @returns {boolean}
 */
function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return (
    a.right + LABEL_GAP_PX > b.left &&
    b.right + LABEL_GAP_PX > a.left &&
    a.bottom + LABEL_GAP_PX > b.top &&
    b.bottom + LABEL_GAP_PX > a.top
  );
}

/**
 * Resolve label collisions after layout: iterate through descriptors sorted
 * by tier within each axis, detect bounding-box overlap, and push labels to
 * higher tiers until they no longer collide.
 *
 * @param {Array} descriptors — array of { el, tierIndex, axis, originalTop }
 */
function resolveLabelCollisions(descriptors) {
  if (!descriptors || descriptors.length === 0) return;
  const axis = descriptors[0].axis;
  const maxTier = 10;

  // Group by tier within the same axis
  const items = descriptors.map((d) => ({
    eventId: d.el.dataset.eventId,
    originalStyle: d.originalTop || d.originalLeft || "",
    rect: d.el.getBoundingClientRect(),
    el: d.el,
    tierIndex: d.tierIndex,
  }));

  // Sort by tierIndex ascending
  items.sort((a, b) => a.tierIndex - b.tierIndex);

  const primaryDiff = axis === "x" ? TIER_STEP_PCT : TIER_STEP_PX;
  const primaryKey = axis === "x" ? "left" : "top";

  const placedRects = [];

  for (const item of items) {
    let tier = item.tierIndex;
    let rect = item.el.getBoundingClientRect();
    let collides = false;

    do {
      collides = false;
      for (const pr of placedRects) {
        if (rectsOverlap(rect, pr)) {
          collides = true;
          tier++;
          // Push label further
          const currentVal = parseFloat(item.el.style[primaryKey]);
          item.el.style[primaryKey] =
            (Number.isFinite(currentVal) ? currentVal : 0) +
            (tier % 2 === 1 ? -primaryDiff : primaryDiff);
          rect = item.el.getBoundingClientRect();
          break;
        }
      }
    } while (collides && tier < maxTier);

    placedRects.push(rect);
  }
}

/**
 * Build the complete timeline DOM and inject it into the container.
 * Chooses horizontal or vertical layout based on the current viewport.
 *
 * Wraps output in a `.timeline-world` element for CSS transform zoom/pan.
 * Uses batchWrite to avoid layout thrash (SR-3).
 *
 * @param {Map<string, Array>} groupedEvents - Map from period → events array.
 * @param {string|null} activeEra - Currently active era filter, or 'all'.
 */
export function renderTimeline(groupedEvents, activeEra) {
  if (!container) return;

  lastGroupedEvents = groupedEvents;
  lastActiveEra = activeEra;

  const vertical = isVerticalMode();
  currentMode = vertical ? "vertical" : "horizontal";

  batchWrite(() => {
    const built = vertical
      ? buildVerticalLayout(groupedEvents, activeEra)
      : buildHorizontalLayout(groupedEvents, activeEra);

    innerEl = built.innerEl;

    // ── Clear and inject ──────────────────────────────────────────────────
    container.innerHTML = "";

    // Create the world wrapper for zoom/pan transform
    const world = createElement("div", {
      className: "timeline-world",
    });
    world.appendChild(innerEl);
    container.appendChild(world);

    container.classList.toggle("timeline-container--vertical", vertical);
    container.hidden = !built.hasEvents;

    // ── Resolve collisions once, after elements are attached ───────────────
    resolveLabelCollisions(built.labelDescriptors);

    // ── State visibility ──────────────────────────────────────────────────
    if (loadingEl) loadingEl.hidden = true;
    if (emptyEl) emptyEl.hidden = built.hasEvents;

    // Mount zoom controls into the viewport (only in horizontal mode)
    if (!vertical && !container.querySelector(".timeline-controls")) {
      mountZoomControls(container);
    }
  });
}

/**
 * Remove `.filtered-out` from all dots and labels (reset filters).
 */
export function clearFilteredOut() {
  if (!container) return;
  batchWrite(() => {
    const allFiltered = container.querySelectorAll(".filtered-out");
    for (const el of allFiltered) {
      el.classList.remove("filtered-out");
    }
  });
}

/**
 * Map dots and labels by their data-era attribute to find indices that
 * don't match the active filter and should be faded out.
 *
 * @param {NodeListOf<Element>} dots
 * @param {NodeListOf<Element>} labels
 * @param {string} activeEra
 * @returns {number[]}
 */
function computeFadedIndices(dots, labels, activeEra) {
  const faded = [];
  for (let i = 0; i < dots.length; i++) {
    const era = dots[i].dataset.era;
    if (era !== activeEra) {
      faded.push(i);
    }
  }
  return faded;
}

/**
 * Apply era filter to the current timeline DOM: fade out dots/labels
 * whose data-era does not match.
 *
 * @param {string} activeEra
 */
export function applyEraFilter(activeEra) {
  if (!container) return;
  const dots = container.querySelectorAll(".timeline-dot");
  const labels = container.querySelectorAll(".timeline-label");

  const faded = computeFadedIndices(dots, labels, activeEra);

  batchWrite(() => {
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("filtered-out", faded.includes(i));
      dots[i].tabIndex = faded.includes(i) ? -1 : 0;
    }
    for (let i = 0; i < labels.length; i++) {
      labels[i].classList.toggle("filtered-out", faded.includes(i));
    }
  });
}
