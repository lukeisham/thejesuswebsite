/**
 * Timeline render module.
 *
 * Builds the DOM timeline inside `.timeline-container`. Computes horizontal
 * (desktop/tablet) or vertical (mobile, < 768px) positions from period
 * indices, staggers overlapping events into escalating clusters, draws era
 * markers and labels, and handles loading / empty states.
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
} from "./timeline-cluster-density.js";
import { computeDotPositions } from "./timeline-cluster-placement.js";
import {
  computeLabelModes,
  LABEL_FULL,
  LABEL_TRUNCATED,
  LABEL_HIDDEN,
} from "./timeline-cluster-labels.js";
import { periodX, periodY } from "./timeline-geometry.js";

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Read the initial era and zoom from body dataset attributes.
 * These are set by era/zoom HTML pages and read at module evaluation time
 * (scripts are deferred, so DOM is parsed).
 */
export const initialEra =
  (typeof document !== "undefined" && document.body?.dataset?.initialEra) ||
  null;
export const initialZoom =
  parseFloat(
    typeof document !== "undefined" && document.body?.dataset?.initialZoom,
  ) || 1;

/** Matches the mobile vertical-mode breakpoint used in timeline.css. */
const MOBILE_QUERY = "(max-width: 767px)";

/** Minimum pixel gap enforced between adjacent label bounding boxes. */
const LABEL_GAP_PX = 8;

/**
 * Read the per-period slot size (width in horizontal mode, height in
 * vertical mode) from the CSS custom property --px-per-period on the
 * timeline container, falling back to 100px.
 *
 * @returns {number}
 */
export function getPxPerPeriod() {
  const el = document.getElementById("timeline-container");
  if (!el) return 100;
  const raw = getComputedStyle(el).getPropertyValue("--px-per-period").trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : 100;
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
 * resize/orientation listener that re-renders on breakpoint crossing.
 */
export function init() {
  container = document.getElementById("timeline-container");
  spineEl = document.getElementById("timeline-spine");
  loadingEl = document.getElementById("loading-state");
  emptyEl = document.getElementById("empty-state");

  if (resizeTeardown) resizeTeardown();

  const handleResize = debounce(() => {
    const mode = isVerticalMode() ? "vertical" : "horizontal";
    if (mode !== currentMode && lastGroupedEvents) {
      renderTimeline(lastGroupedEvents, lastActiveEra);
    }
  }, 150);

  window.addEventListener("resize", handleResize);
  resizeTeardown = () => {
    window.removeEventListener("resize", handleResize);
    handleResize.cancel();
  };
}

/**
 * Show the loading spinner and hide other states.
 */
export function showLoading() {
  if (loadingEl) loadingEl.hidden = false;
  if (container) container.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
}

/**
 * Show the empty state.
 */
export function showEmpty() {
  if (loadingEl) loadingEl.hidden = true;
  if (container) container.hidden = true;
  if (emptyEl) emptyEl.hidden = false;
}

/**
 * Compute the pixel X position for a period by its canonical index
 * (horizontal mode).
 *
 * @param {number} periodIndex
 * @param {number} slotWidth
 * @returns {number}
 */

/**
 * Determine whether a horizontal-mode label should sit above or below the
 * dot based on its stagger offset.
 *
 * @param {number} yOffset
 * @returns {'above'|'below'}
 */
function labelPosition(yOffset) {
  return yOffset <= 0 ? "above" : "below";
}

/**
 * Determine whether a vertical-mode label should sit left or right of the
 * spine based on its stagger offset.
 *
 * @param {number} xOffset
 * @returns {'left'|'right'}
 */
function labelSide(xOffset) {
  return xOffset <= 0 ? "left" : "right";
}

/**
 * Clearance constants for label positioning relative to dots (Phase 1).
 * LABEL_CLEARANCE_PCT: percentage offset from dot's top in horizontal mode.
 *   10% gives ~60px at typical 600px timeline height — enough for two-line
 *   wrapped labels (title + meta) plus a readable gap.
 * LABEL_CLEARANCE_PX: pixel offset from spine in vertical (mobile) mode.
 *   48px gives room for a 100px-wide label centred at 50% + offset.
 */
const LABEL_CLEARANCE_PCT = 10;
const LABEL_CLEARANCE_PX = 48;

/**
 * Step size per collision-escalation tier (Phase 2).
 * TIER_STEP_PCT = 12% — larger than clearance so each escalation
 * meaningfully separates colliding labels.
 * TIER_STEP_PX = 40px for vertical mode.
 */
const TIER_STEP_PCT = 12;
const TIER_STEP_PX = 40;

/**
 * Compute the inline style string for a horizontal-mode label.
 * Offsets the label above or below its dot with clearance, preserving
 * the dot's jittered yOffset so labels follow their cluster placement.
 *
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
 * Offsets the label left or right of the spine with clearance, preserving
 * the dot's jittered xOffset.
 *
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
 *
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
  const catClass =
    category === "places"
      ? "dot-cat--place"
      : category === "people"
        ? "dot-cat--person"
        : category === "objects"
          ? "dot-cat--object"
          : "";

  return createElement("div", {
    className: [
      "timeline-dot",
      "standard",
      eraKebab ? `era--${eraKebab}` : "",
      catClass,
      isFiltered ? "filtered-out" : "",
    ]
      .filter(Boolean)
      .join(" "),
    style,
    tabIndex: isFiltered ? "-1" : "0",
    role: "button",
    ariaLabel: event.title
      ? event.map_location
        ? `${event.title}, ${event.map_location}`
        : event.title
      : "",
    dataset: {
      eventId: String(event.id),
      period: event.timeline_period || "",
      era: event.timeline_era || "",
      title: event.title || "",
      location: event.map_location || "",
      verse: event.primary_verse || "",
      slug: event.slug || "",
      category: event.gospel_category || "",
    },
  });
}

/**
 * Build the label element shared by both layout modes.
 *
 * @param {Object} event
 * @param {string} posClass - 'above'/'below' (horizontal) or 'left'/'right' (vertical)
 * @param {string} style - inline positioning style
 * @param {boolean} isFiltered
 * @returns {HTMLElement}
 */
function createLabel(event, posClass, style, isFiltered) {
  const titleSpan = createElement(
    "span",
    { className: "timeline-label-title" },
    [event.title || ""],
  );

  const metaText = [event.map_location || ""].filter(Boolean).join(" · ");
  const metaSpan = createElement("span", { className: "timeline-label-meta" }, [
    metaText,
  ]);

  return createElement(
    "div",
    {
      className: ["timeline-label", posClass, isFiltered ? "filtered-out" : ""]
        .filter(Boolean)
        .join(" "),
      style,
      dataset: {
        eventId: String(event.id),
      },
    },
    [titleSpan, metaSpan],
  );
}

/**
 * Lay out era divider markers and labels for horizontal mode: centred over
 * each era's span, truncated to that span's width, and alternated
 * vertically when adjacent eras are narrow enough for labels to touch.
 *
 * @param {HTMLElement} target
 * @param {number} slotWidth
 */
function layoutEraLabelsHorizontal(target, slotWidth) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);
  let prevMidX = null;
  let prevHalfSpan = 0;
  let alternate = false;

  // Two-line labels need more vertical room — increase alternate offsets
  const BASE_TOP = 4;
  const ALT_TOP = 28;

  eraKeys.forEach((era, i) => {
    const bounds = ERA_BOUNDARIES[era];

    if (i > 0) {
      const markerX = bounds.start * slotWidth;
      target.appendChild(
        createElement("div", {
          className: "timeline-era-marker",
          style: `left:${markerX}px`,
        }),
      );
    }

    const eraStartX = bounds.start * slotWidth;
    const eraEndX = (bounds.end + 1) * slotWidth;
    const eraMidX = (eraStartX + eraEndX) / 2;
    const span = eraEndX - eraStartX;
    const halfSpan = span / 2;

    const tooClose =
      prevMidX !== null && eraMidX - prevMidX < halfSpan + prevHalfSpan;
    alternate = tooClose ? !alternate : false;

    const labelMaxW = Math.max(span - 8, 24);
    const eraLabel = createElement(
      "div",
      {
        className: "timeline-era-label",
        style: `left:${eraMidX}px;top:${alternate ? ALT_TOP : BASE_TOP}px;max-width:${Math.min(labelMaxW, 140)}px`,
      },
      [ERA_LABELS[era]],
    );
    target.appendChild(eraLabel);

    prevMidX = eraMidX;
    prevHalfSpan = halfSpan;
  });
}

/**
 * Lay out era divider markers and section-heading labels for vertical
 * mode: a horizontal rule and left-aligned heading at the start of each
 * era's Y range, beside the spine.
 *
 * @param {HTMLElement} target
 * @param {number} slotHeight
 */
function layoutEraLabelsVertical(target, slotHeight) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);

  eraKeys.forEach((era, i) => {
    const bounds = ERA_BOUNDARIES[era];

    if (i > 0) {
      const markerY = bounds.start * slotHeight;
      target.appendChild(
        createElement("div", {
          className: "timeline-era-marker timeline-era-marker--vertical",
          style: `top:${markerY}px`,
        }),
      );
    }

    const eraStartY = bounds.start * slotHeight;
    target.appendChild(
      createElement(
        "div",
        {
          className: "timeline-era-label timeline-era-label--vertical",
          style: `top:${eraStartY}px`,
        },
        [ERA_LABELS[era]],
      ),
    );
  });
}

/**
 * Build the horizontal (desktop/tablet) layout: spine runs left-to-right,
 * events stagger above/below it.
 *
 * @param {Map<string, Array>} groupedEvents
 * @param {string|null} activeEra
 * @param {number} slotWidth
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array}}
 */
function buildHorizontalLayout(groupedEvents, activeEra, slotWidth) {
  const totalWidth = TIMELINE_PERIODS.length * slotWidth;

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

  layoutEraLabelsHorizontal(inner, slotWidth);

  // Compute cluster-placement positions and label modes
  const positions = computeDotPositions(groupedEvents, slotWidth);
  const densityTier = getClusterDensity(null, slotWidth);

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

    const x = periodX(periodIdx, slotWidth);

    periodPositions.forEach((pos, clusterIndex) => {
      const event = pos.event;
      let yOffset = pos.yOffset;
      const xFan = pos.xFan || 0;

      // Apply timeline offsets if present (stored manual repositioning).
      // Offsets override cluster-computed placement.
      let finalX = x + xFan;
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        finalX = x + (event.timeline_offset_x * slotWidth);
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
 * @param {number} slotHeight
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array}}
 */
function buildVerticalLayout(groupedEvents, activeEra, slotHeight) {
  const totalHeight = TIMELINE_PERIODS.length * slotHeight;

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

  layoutEraLabelsVertical(inner, slotHeight);

  // Compute cluster-placement positions and label modes
  const positions = computeDotPositions(groupedEvents, slotHeight);
  const densityTier = getClusterDensity(null, slotHeight);

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

    const y = periodY(periodIdx, slotHeight);

    periodPositions.forEach((pos, clusterIndex) => {
      const event = pos.event;
      // Map yOffset from placement (vertical stack) to xOffset for vertical mode (left/right of spine)
      let xOffset = pos.yOffset;
      let finalY = y;

      // Apply timeline offsets if present (stored manual repositioning).
      // In vertical mode: offsetX maps to left/right offset, offsetY maps to top offset.
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        xOffset = event.timeline_offset_x * slotHeight;
      }
      if (event.timeline_offset_y !== null && event.timeline_offset_y !== undefined) {
        finalY = y + (event.timeline_offset_y * slotHeight);
      }

      const side = labelSide(xOffset);
      const isFiltered =
        activeEra && activeEra !== "all" && event.timeline_era !== activeEra;
      const dotStyle = `top:${finalY}px;left:calc(50% + ${xOffset}px)`;
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
 * Apply an escalated stagger tier to a label's position, escalating
 * incrementally from the label's original cluster-jittered position
 * rather than overriding to an absolute STAGGER_OFFSETS value.
 * The above/below (or left/right) class is preserved — the label
 * stays on its original side of the spine regardless of escalation.
 *
 * @param {HTMLElement} el
 * @param {number} tier       - escalation tier (0 = original position)
 * @param {'x'|'y'} axis
 * @param {string} originalStyle - the label's initial inline style string
 */
function applyTier(el, tier, axis, originalStyle) {
  if (axis === "x") {
    // Extract original top percentage from style string
    var match = originalStyle.match(/top:([\d.]+)%/);
    if (match) {
      var originalTop = parseFloat(match[1]);
      el.style.top = "calc(" + originalTop + "% + " + (tier * TIER_STEP_PCT) + "%)";
    }
    // Preserve the above/below class — never change it during escalation
  } else {
    // Extract original left calc from style string
    var leftMatch = originalStyle.match(/left:calc\(50% \+ (-?[\d.]+)px\)/);
    if (leftMatch) {
      var originalLeft = parseFloat(leftMatch[1]);
      // Escalate away from the spine: if label is on the left (negative), go further left;
      // if on the right (positive), go further right.
      var dir = originalLeft <= 0 ? -1 : 1;
      el.style.left = "calc(50% + " + (originalLeft + dir * tier * TIER_STEP_PX) + "px)";
    }
    // Preserve the left/right class — never change it during escalation
  }
}

/**
 * Whether two bounding rects overlap, with a minimum required gap between
 * them on both axes.
 *
 * @param {DOMRect} a
 * @param {DOMRect} b
 * @param {number} gap
 * @returns {boolean}
 */
function rectsOverlap(a, b, gap) {
  return !(
    a.right + gap <= b.left ||
    b.right + gap <= a.left ||
    a.bottom + gap <= b.top ||
    b.bottom + gap <= a.top
  );
}

/**
 * Push labels whose bounding boxes overlap *any* already-placed label to the
 * next stagger tier, so long titles never visually collide — whether the
 * collision is between neighbouring periods (same tier, adjacent x/y) or
 * between events clustered in the same period (same x/y, adjacent tiers).
 * Re-measures a label's rect only when it's actually escalated, after the
 * caller has already attached every label to the document (SR-3: layout is
 * forced only as needed during this one render pass, not per frame).
 *
 * @param {Array<{el: HTMLElement, tierIndex: number, axis: 'x'|'y'}>} descriptors
 */
function resolveLabelCollisions(descriptors) {
  if (!descriptors.length) return;

  const axis = descriptors[0].axis;
  const maxTier = 10; // allow up to 11 positions (0–10)

  const items = descriptors.map((d) => ({
    ...d,
    eventId: d.el.dataset.eventId,
    originalStyle: axis === "x" ? d.originalTop : d.originalLeft,
    rect: d.el.getBoundingClientRect(),
  }));

  items.sort((a, b) => {
    const primaryDiff =
      axis === "x" ? a.rect.left - b.rect.left : a.rect.top - b.rect.top;
    return primaryDiff !== 0
      ? primaryDiff
      : (a.eventId || "").localeCompare(b.eventId || "");
  });

  const placedRects = [];

  items.forEach((item) => {
    let tier = item.tierIndex;
    let rect = item.rect;

    while (
      tier < maxTier &&
      placedRects.some((placed) => rectsOverlap(rect, placed, LABEL_GAP_PX))
    ) {
      tier += 1;
      applyTier(item.el, tier, axis, item.originalStyle);
      rect = item.el.getBoundingClientRect();
    }

    placedRects.push(rect);
  });
}

/**
 * Build the complete timeline DOM and inject it into the container.
 * Chooses horizontal or vertical layout based on the current viewport.
 *
 * Uses batchWrite to avoid layout thrash during scroll/filter (SR-3).
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
  const slotSize = getPxPerPeriod();

  batchWrite(() => {
    const built = vertical
      ? buildVerticalLayout(groupedEvents, activeEra, slotSize)
      : buildHorizontalLayout(groupedEvents, activeEra, slotSize);

    innerEl = built.innerEl;

    // ── Clear and inject ──────────────────────────────────────────────────
    container.innerHTML = "";
    container.classList.toggle("timeline-container--vertical", vertical);
    container.appendChild(innerEl);

    // ── Resolve collisions once, after elements are attached ───────────────
    resolveLabelCollisions(built.labelDescriptors);

    // ── State visibility ──────────────────────────────────────────────────
    if (loadingEl) loadingEl.hidden = true;
    container.hidden = !built.hasEvents;
    if (emptyEl) emptyEl.hidden = built.hasEvents;
  });
}

/**
 * Remove `.filtered-out` from all dots and labels (reset filters).
 */
export function clearFilteredOut() {
  if (!container) return;
  batchWrite(() => {
    container.querySelectorAll(".filtered-out").forEach((el) => {
      el.classList.remove("filtered-out");
      // Restore tabbability when filter is cleared
      if (el.classList.contains("timeline-dot")) {
        el.setAttribute("tabindex", "0");
      }
    });
  });
}

/**
 * Apply `.filtered-out` to dots/labels whose era doesn't match the active era.
 *
 * @param {string} era - The era key to show.
 */
export function applyEraFilter(era) {
  if (!container) return;
  batchWrite(() => {
    const dots = container.querySelectorAll(".timeline-dot");
    const labels = container.querySelectorAll(".timeline-label");

    dots.forEach((dot) => {
      if (dot.dataset.era !== era) {
        dot.classList.add("filtered-out");
        dot.setAttribute("tabindex", "-1");
      } else {
        dot.classList.remove("filtered-out");
        dot.setAttribute("tabindex", "0");
      }
    });

    labels.forEach((label) => {
      const dot = container.querySelector(
        `[data-event-id="${CSS.escape(label.dataset.eventId)}"].timeline-dot`,
      );
      if (dot && dot.dataset.era !== era) {
        label.classList.add("filtered-out");
      } else {
        label.classList.remove("filtered-out");
      }
    });
  });
}
