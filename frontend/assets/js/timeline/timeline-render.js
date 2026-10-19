/**
 * Timeline render module.
 *
 * Builds the DOM timeline inside `.timeline-container`. Computes horizontal
 * (desktop/tablet) or vertical (mobile, < 768px) positions from period
 * indices using fixed world-coordinate geometry, staggers overlapping events
 * into escalating clusters, draws era markers and labels, and handles
 * loading / empty states.
 *
 * Zoom and pan are a CSS transform on a `.timeline-world` wrapper (the arbor
 * diagram works the same way), so all positions use the fixed
 * `BASE_PX_PER_PERIOD` geometry.
 *
 * The admin editor (admin/assets/js/admin-timeline/timeline-events.js) draws
 * the same layout from the same stored offsets. Both convert offsets with
 * cluster-logic/timeline-offsets.js, and both read the label clearance and the
 * tier step from cluster-label-collision.js:
 * setup/ARCHITECTURE/node-cluster-logic.md lists the invariants and
 * api/tests/guide-node-cluster-logic.test.js checks them.
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
import {
  periodX,
  periodY,
  BASE_PX_PER_PERIOD,
  TIMELINE_CANVAS_HEIGHT_PX,
} from "./timeline-geometry.js";
import { getScale, getPan, mountZoomControls, onTransformChange } from "./timeline-zoom.js";
import {
  resolveLabelCollisions as resolveCollisionsShared,
  tierShift,
} from "../cluster-logic/cluster-label-collision.js";
import {
  layoutLabelsBesideNodes,
  computeLeaderLine,
  DOT_CLEARANCE_PX,
} from "../cluster-logic/cluster-label-layout.js";
import { computeZoomStacks } from "../cluster-logic/timeline-zoom-stacks.js";
import {
  offsetXToPixels,
  offsetYToPixels,
  crossAxisToTopPercent,
} from "../cluster-logic/timeline-offsets.js";
import {
  computeEraBandLayout,
  computeEraHeadingPositions,
} from "./timeline-era-heading-placement.js";

// ─── Era Headings ───────────────────────────────────────────────────────────

/**
 * Render the era headings of the vertical (mobile) layout: <h3> elements left
 * of the spine, placed by `computeEraHeadingPositions` so they avoid the event
 * boxes. The horizontal layout uses `renderEraBand` instead.
 *
 * @param {HTMLElement} inner — the .timeline-inner element
 * @param {Map} positions — clustered dot positions from computeDotPositions
 * @param {Array<{era:string,x:number,y:number,width:number,height:number}>} labelBounds
 *   measured label boxes in world coordinates, so headings avoid label text
 *   as well as dots
 */
function renderEraHeadings(inner, positions, labelBounds) {
  const eventBounds = [];
  for (const [period, periodPositions] of positions) {
    const periodIdx = getPeriodIndex(period);
    if (periodIdx < 0) continue;

    for (const pos of periodPositions) {
      eventBounds.push({
        era: pos.event.timeline_era || "",
        x: 0,
        y: periodY(periodIdx),
        width: 10,
        height: 10,
      });
    }
  }
  eventBounds.push(...labelBounds);

  const headings = computeEraHeadingPositions(
    ERA_BOUNDARIES,
    eventBounds,
    getScale(),
    TIMELINE_PERIODS.length * BASE_PX_PER_PERIOD,
  );

  for (const h of headings) {
    const heading = createElement("h3", {
      className: `timeline-era-heading era--${eraKebab(h.era)} tier-${h.tier}`,
      style: `left:${h.x}px;top:${h.y}px`,
      textContent: ERA_LABELS[h.era] || h.era,
    });
    inner.appendChild(heading);
  }
}

/**
 * CSS class suffix for an era key, for example "GalileeMinistry" becomes
 * "galilee-ministry".
 *
 * @param {string} era
 * @returns {string}
 */
function eraKebab(era) {
  return era
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

// ─── Era heading band (horizontal layout) ───────────────────────────────────

/** The band element and the pieces of each era in it. */
let bandEl = null;
let bandTrackEl = null;
/** @type {Array<{era:string, heading:HTMLElement, bar:HTMLElement, leader:HTMLElement}>} */
let bandItems = [];
/** Heading widths in px by era key. They do not change with zoom. */
let bandTextWidths = {};
/** Zoom scale that the band was last laid out for. */
let bandScale = null;

/**
 * Build the era heading band above the dots, measure the headings, and lay it
 * out for the current zoom and pan. The band lives in the container, outside
 * `.timeline-world`, so the headings keep a fixed size and a fixed place at the
 * top while the world zooms and pans underneath. `syncEraBand` keeps it in step.
 *
 * @param {HTMLElement} containerEl — the .timeline-container element
 */
function renderEraBand(containerEl) {
  containerEl.querySelector(".timeline-heading-band")?.remove();

  bandEl = createElement("div", { className: "timeline-heading-band" });
  bandTrackEl = createElement("div", { className: "timeline-heading-band__track" });
  bandItems = [];

  for (const era of Object.keys(ERA_BOUNDARIES)) {
    const kebab = eraKebab(era);
    const heading = createElement("h3", {
      className: `timeline-era-heading era--${kebab}`,
      textContent: ERA_LABELS[era] || era,
    });
    const bar = createElement("span", { className: `timeline-era-bar era--${kebab}` });
    const leader = createElement("span", { className: `timeline-era-leader era--${kebab}` });
    bandTrackEl.append(bar, leader, heading);
    bandItems.push({ era, heading, bar, leader });
  }

  bandEl.appendChild(bandTrackEl);
  containerEl.appendChild(bandEl);

  // Measure once the headings are in the document; the size is fixed, so the
  // widths stay valid across zoom changes.
  bandTextWidths = {};
  for (const { era, heading } of bandItems) {
    bandTextWidths[era] = heading.offsetWidth;
  }

  bandScale = null;
  syncEraBand({ panX: getPan().x, scale: getScale() });
}

/**
 * Bring the band in step with the world transform. A zoom change lays the band
 * out again; a pan only shifts the track. Runs after every transform
 * (timeline-zoom.js `onTransformChange`) and once after each render.
 *
 * @param {{panX: number, scale: number}} state
 */
function syncEraBand({ panX, scale }) {
  if (!bandEl || !bandEl.isConnected) return;

  if (scale !== bandScale) {
    bandScale = scale;
    const layout = computeEraBandLayout(
      ERA_BOUNDARIES,
      BASE_PX_PER_PERIOD * scale,
      bandTextWidths,
    );
    for (const entry of layout) {
      const item = bandItems.find((i) => i.era === entry.era);
      if (!item) continue;
      item.heading.style.left = `${entry.textX}px`;
      item.heading.style.setProperty("--lane", String(entry.lane));
      item.bar.style.left = `${entry.x + 1}px`;
      item.bar.style.width = `${Math.max(0, entry.width - 3)}px`;
      item.leader.style.left = `${entry.x + 1}px`;
      item.leader.style.setProperty("--lane", String(entry.lane));
      item.leader.hidden = !entry.leader;
    }
  }

  bandTrackEl.style.transform = `translateX(${panX}px)`;
}

onTransformChange(syncEraBand);

// ─── Layout Functions ───────────────────────────────────────────────────────

/**
 * Read the initial era from body dataset attributes.
 * These are set by era-specific HTML pages and read at module evaluation time
 * (scripts are deferred, so DOM is parsed).
 */
export const initialEra =
  (typeof document !== "undefined" && document.body?.dataset?.initialEra) ||
  null;

/** Same breakpoint as the 767px media queries in timeline-responsive.css,
 * timeline-dots.css and timeline-era-headings.css. */
const MOBILE_QUERY = "(max-width: 767px)";

/** Equals .timeline-container min-height in timeline.css; the check at the end
 * of renderTimeline warns when the content grows taller than this. */
const CONTAINER_MIN_HEIGHT = 600;

/**
 * Compute the effective px-per-period at the current zoom level:
 * BASE_PX_PER_PERIOD × the current zoom scale. cluster-density.js compares its
 * thresholds against this value.
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
 * Determine label side for vertical mode based on X offset.
 * @param {number} xOffset
 * @returns {string} "left" or "right"
 */
function labelSide(xOffset) {
  return xOffset <= 0 ? "left" : "right";
}

/**
 * Vertical-mode (mobile) distances, in pixels. The horizontal layout places
 * labels with `layoutLabelsBesideNodes` instead (cluster-logic/cluster-label-layout.js).
 */
const LABEL_CLEARANCE_PX = 48;
const TIER_STEP_PX = 40;

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
 * Layout era divider markers in horizontal mode (no labels — era headings
 * are rendered separately by renderEraHeadings after dot placement).
 * @param {HTMLElement} innerEl
 * @param {number} slotWidth
 */
function layoutEraMarkersHorizontal(inner, slotWidth) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);
  for (const era of eraKeys) {
    const bounds = ERA_BOUNDARIES[era];
    const markerX = bounds.start * slotWidth;
    const divider = createElement("div", {
      className: "timeline-era-marker",
      style: `left:${markerX}px`,
    });
    inner.appendChild(divider);
  }
}

/**
 * Layout era divider markers in vertical mode (no labels).
 * @param {HTMLElement} innerEl
 * @param {number} slotHeight
 */
function layoutEraMarkersVertical(inner, slotHeight) {
  const eraKeys = Object.keys(ERA_BOUNDARIES);
  for (const era of eraKeys) {
    const bounds = ERA_BOUNDARIES[era];
    const markerY = bounds.start * slotHeight;
    const divider = createElement("div", {
      className: "timeline-era-marker timeline-era-marker--vertical",
      style: `top:${markerY}px`,
    });
    inner.appendChild(divider);
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
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array, positions: Map, effectivePx: number, vertical: boolean}}
 */
function buildHorizontalLayout(groupedEvents, activeEra) {
  const totalWidth = TIMELINE_PERIODS.length * BASE_PX_PER_PERIOD;
  const effectivePx = effectivePxPerPeriod();

  const inner = createElement("div", {
    className: "timeline-inner",
    style: `width:${totalWidth}px;position:relative;height:100%;min-height:${TIMELINE_CANVAS_HEIGHT_PX}px`,
  });

  inner.appendChild(
    createElement("div", {
      className: "timeline-spine",
      style: `width:${totalWidth}px`,
    }),
  );

  layoutEraMarkersHorizontal(inner, BASE_PX_PER_PERIOD);

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

    periodPositions.forEach((pos) => {
      const event = pos.event;
      let yOffset = pos.yOffset;
      const xFan = pos.xFan || 0;

      // A stored offset (set by dragging in the admin editor) replaces the
      // cluster position. The admin editor converts offsets with the same
      // functions (cluster-logic/timeline-offsets.js).
      let finalX = x + xFan;
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        finalX = x + offsetXToPixels(event.timeline_offset_x);
      }
      if (event.timeline_offset_y !== null && event.timeline_offset_y !== undefined) {
        yOffset = offsetYToPixels(event.timeline_offset_y);
      }

      const isFiltered =
        activeEra && activeEra !== "all" && event.timeline_era !== activeEra;
      const topPercent = crossAxisToTopPercent(yOffset);
      const dotStyle = `left:${finalX}px;top:${topPercent}%`;

      const dotEl = createDot(event, dotStyle, isFiltered);
      inner.appendChild(dotEl);

      // The label starts at the dot; layoutHorizontalLabels moves it beside the
      // dot once the labels are attached and measured.
      const label = createLabel(event, "", dotStyle, isFiltered);

      const mode = modeByEventId.get(event.id) || LABEL_FULL;
      if (mode === LABEL_TRUNCATED) {
        label.classList.add("label--truncated");
      } else if (mode === LABEL_HIDDEN) {
        label.classList.add("label--hidden");
      }

      inner.appendChild(label);
      labelDescriptors.push({
        el: label,
        dot: dotEl,
        x: finalX,
        y: (topPercent / 100) * TIMELINE_CANVAS_HEIGHT_PX,
        eventId: event.id,
        era: event.timeline_era || "",
        filtered: Boolean(isFiltered),
      });

      hasEvents = true;
    });
  }

  return { innerEl: inner, hasEvents, labelDescriptors, positions, effectivePx, vertical: false };
}

/**
 * Build the vertical (mobile, < 768px) layout: spine runs top-to-bottom,
 * events stagger left/right of it, era labels become section headings.
 *
 * @param {Map<string, Array>} groupedEvents
 * @param {string|null} activeEra
 * @returns {{innerEl: HTMLElement, hasEvents: boolean, labelDescriptors: Array, positions: Map, effectivePx: number, vertical: boolean}}
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

  layoutEraMarkersVertical(inner, BASE_PX_PER_PERIOD);

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

      // The time axis is vertical here. A stored x offset still means "along
      // the time axis" and a stored y offset still means "across it", as on
      // the horizontal layout.
      let finalY = y + yFan;
      if (event.timeline_offset_x !== null && event.timeline_offset_x !== undefined) {
        finalY = y + offsetXToPixels(event.timeline_offset_x);
      }
      if (event.timeline_offset_y !== null && event.timeline_offset_y !== undefined) {
        xOffset = offsetYToPixels(event.timeline_offset_y);
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
        era: event.timeline_era || "",
      });

      hasEvents = true;
    });
  }

  return { innerEl: inner, hasEvents, labelDescriptors, positions, effectivePx, vertical: true };
}

/**
 * Adapter for the vertical (mobile) layout: measure the label elements, delegate
 * collision resolution to the shared cluster-label-collision.js module, and
 * apply the result. The horizontal layout does not use it
 * (`layoutHorizontalLabels`).
 *
 * @param {Array} descriptors — array of { el, tierIndex, axis }
 */
function resolveLabelCollisions(descriptors) {
  if (!descriptors || descriptors.length === 0) return;

  // The shared resolver fans vertical-layout labels out left and right along
  // `left`, which is `calc(50% + Npx)`, so only the px part changes. It compares
  // measured rects, which are in screen px, so the step is scaled to screen px
  // too.
  const parent = descriptors[0].el.offsetParent;
  const parentH = parent ? parent.offsetHeight : 0;
  const scale = parentH > 0 ? parent.getBoundingClientRect().height / parentH : 1;
  const primaryStep = TIER_STEP_PX * (scale || 1);

  const collisionDescs = descriptors.map((d) => {
    const rect = d.el.getBoundingClientRect();
    return {
      el: d.el,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      tierIndex: d.tierIndex,
      axis: "y",
      primaryStep: primaryStep,
    };
  });

  const resolved = resolveCollisionsShared(collisionDescs);

  for (const item of resolved) {
    if (item.tierIndex <= 0) continue;
    const shift = tierShift(item.tierIndex, TIER_STEP_PX);
    const match = /calc\(50%\s*\+\s*(-?[\d.]+)px\)/.exec(item.el.style.left);
    const baseLeft = match ? parseFloat(match[1]) : 0;
    item.el.style.left = "calc(50% + " + (baseLeft + shift) + "px)";
  }
}

/**
 * Place the labels of the horizontal layout beside their dots and draw a leader
 * line for each label that had to move. The placement comes from
 * `layoutLabelsBesideNodes`, the same function that the admin editor calls, so a
 * title sits where the editor showed it. The labels must be attached to the
 * document so they can be measured. A dot that sits in a stack at the current
 * zoom (`stacked`) gets no label; its dot still blocks the other labels.
 *
 * @param {HTMLElement} inner — the attached .timeline-inner element
 * @param {Array<{el: HTMLElement, cx: number, cy: number, stacked: boolean, eventId: number, era: string, filtered: boolean}>} descriptors
 *   `cx` and `cy` are the dot's current position, which is not its exact
 *   position while it is in a stack or moving towards one
 */
function layoutHorizontalLabels(inner, descriptors) {
  inner.querySelector(".timeline-leaders")?.remove();
  if (descriptors.length === 0) return;

  const nodes = descriptors.map((d) => {
    const hidden = d.stacked || d.el.classList.contains("label--hidden");
    d.el.classList.toggle("label--stacked", Boolean(d.stacked));
    return {
      x: d.cx,
      y: d.cy,
      width: hidden ? 0 : d.el.offsetWidth,
      height: hidden ? 0 : d.el.offsetHeight,
    };
  });
  const placed = layoutLabelsBesideNodes(nodes, {
    width: inner.offsetWidth,
    height: TIMELINE_CANVAS_HEIGHT_PX,
  });

  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("class", "timeline-leaders");
  svg.setAttribute("viewBox", `0 0 ${inner.offsetWidth} ${TIMELINE_CANVAS_HEIGHT_PX}`);
  svg.setAttribute("width", String(inner.offsetWidth));
  svg.setAttribute("height", String(TIMELINE_CANVAS_HEIGHT_PX));
  svg.setAttribute("aria-hidden", "true");

  descriptors.forEach((d, i) => {
    const spot = placed[i];
    if (!spot || spot.height === 0) return;

    d.el.style.left = `${spot.left}px`;
    d.el.style.top = `${spot.top}px`;
    d.el.classList.toggle("timeline-label--left", spot.side === "left");

    if (!spot.leader) return;
    const { x1, y1, x2, y2 } = computeLeaderLine(
      { x: d.cx, y: d.cy },
      DOT_CLEARANCE_PX - 2,
      spot,
    );
    const line = document.createElementNS(svgNs, "line");
    line.setAttribute("class", d.filtered ? "timeline-leader filtered-out" : "timeline-leader");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.dataset.era = d.era;
    svg.appendChild(line);
  });

  inner.appendChild(svg);
}

// ─── Zoom stacks (horizontal layout) ────────────────────────────────────────

/** What the stacks were last computed for; null in the vertical layout. */
let stackState = null;

/**
 * Put every dot where it belongs at this zoom, show a stack button over each
 * stack, and place the labels again. Zoomed out, close nodes sit in a column at
 * their mean position; zoomed in, each sits at the exact spot the admin gave it
 * (cluster-logic/timeline-zoom-stacks.js has the rules).
 *
 * @param {HTMLElement} inner — the attached .timeline-inner element
 * @param {Array<Object>} descriptors — the label descriptors of the layout
 * @param {number} scale — current zoom scale
 */
function applyZoomStacks(inner, descriptors, scale) {
  const result = computeZoomStacks(
    descriptors.map((d) => ({ x: d.x, y: d.y })),
    scale,
    TIMELINE_CANVAS_HEIGHT_PX / 2,
  );
  if (result.positions.length !== descriptors.length) return;

  descriptors.forEach((d, i) => {
    const p = result.positions[i];
    d.cx = p.x;
    d.cy = p.y;
    d.stacked = result.collapsed && p.stackIndex >= 0;
    d.dot.style.left = `${p.x}px`;
    d.dot.style.top = `${(p.y / TIMELINE_CANVAS_HEIGHT_PX) * 100}%`;
    d.dot.classList.toggle("timeline-dot--stacked", d.stacked);
    d.dot.tabIndex = d.stacked || d.filtered ? -1 : 0;
  });

  inner.querySelectorAll(".timeline-stack").forEach((el) => el.remove());
  if (result.collapsed) {
    for (const stack of result.stacks) {
      inner.appendChild(createStackButton(stack, descriptors));
    }
  }

  layoutHorizontalLabels(inner, descriptors);
}

/**
 * Build the button that stands for a stack. It is a real button, so Enter and
 * Space work; timeline-interactions.js zooms to the stack when it is activated.
 *
 * @param {{members:number[], x:number, y:number, count:number, minX:number, maxX:number}} stack
 * @param {Array<{era:string, filtered:boolean}>} descriptors
 * @returns {HTMLElement}
 */
function createStackButton(stack, descriptors) {
  const members = stack.members.map((i) => descriptors[i]);
  const button = createElement("button", {
    className: "timeline-stack",
    style: `left:${stack.x}px;top:${(stack.y / TIMELINE_CANVAS_HEIGHT_PX) * 100}%;--stack-count:${stack.count}`,
    type: "button",
    "aria-label": `${stack.count} events. Zoom in to see them.`,
  });
  button.appendChild(
    createElement("span", {
      className: "timeline-stack__count",
      textContent: String(stack.count),
    }),
  );
  button.dataset.minX = String(stack.minX);
  button.dataset.maxX = String(stack.maxX);
  button.dataset.eras = [...new Set(members.map((m) => m.era))].join(",");
  const allFiltered = members.every((m) => m.filtered);
  button.classList.toggle("filtered-out", allFiltered);
  button.tabIndex = allFiltered ? -1 : 0;
  return button;
}

/**
 * Keep the stacks in step with the zoom. Runs after every transform
 * (timeline-zoom.js `onTransformChange`); a pan does not change the stacks.
 *
 * @param {{scale: number}} state
 */
function syncZoomStacks({ scale }) {
  if (!stackState || !stackState.inner.isConnected || scale === stackState.scale) return;
  stackState.scale = scale;
  applyZoomStacks(stackState.inner, stackState.descriptors, scale);
}

onTransformChange(syncZoomStacks);

/**
 * Measure each visible label in world coordinates (the space of the
 * `.timeline-inner` element), so era headings can avoid label text.
 * Labels must already be attached to the document, and their collision
 * shifts must already be applied, or the boxes are wrong or empty.
 *
 * @param {HTMLElement} inner — the attached .timeline-inner element
 * @param {Array<{el: HTMLElement, era?: string}>} descriptors
 * @returns {Array<{era:string,kind:string,x:number,y:number,width:number,height:number}>}
 */
function measureLabelBounds(inner, descriptors) {
  const innerRect = inner.getBoundingClientRect();
  // Screen size divided by layout size gives the current zoom scale.
  const scale = inner.offsetWidth > 0 ? innerRect.width / inner.offsetWidth : 0;
  if (!Number.isFinite(scale) || scale <= 0) return [];

  const bounds = [];
  for (const d of descriptors) {
    const rect = d.el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    bounds.push({
      era: d.era || "",
      kind: "label",
      x: (rect.left - innerRect.left) / scale,
      y: (rect.top - innerRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    });
  }
  return bounds;
}

/** Label sizes at the last render, used to detect a late layout change. */
let renderedLabelSignature = "";

/** True once the one-time re-check after the page settles is scheduled. */
let settleArmed = false;

/**
 * Sizes of all labels and era headings as text, for a cheap "did the layout
 * change" test.
 * @returns {string}
 */
function labelSignature() {
  if (!container) return "";
  return Array.from(
    container.querySelectorAll(".timeline-label, .timeline-era-heading"),
  )
    .map((el) => el.offsetWidth + "x" + el.offsetHeight)
    .join(",");
}

/**
 * Labels and headings are measured at the first render. If the stylesheet or
 * web fonts are not ready then, the boxes are wrong and headings can land on
 * labels. Once the page and fonts have loaded, render again if any label
 * changed size. This runs at most once per page load.
 */
function armSettleRerender() {
  if (settleArmed || typeof document === "undefined") return;
  settleArmed = true;

  const recheck = () => {
    if (!container || !lastGroupedEvents) return;
    if (labelSignature() === renderedLabelSignature) return;
    renderTimeline(lastGroupedEvents, lastActiveEra);
  };
  const afterFonts = () => {
    const ready = document.fonts && document.fonts.ready;
    (ready || Promise.resolve()).then(recheck);
  };

  if (document.readyState === "complete") {
    afterFonts();
  } else {
    window.addEventListener("load", afterFonts, { once: true });
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

    // ── Place the labels once, after elements are attached ─────────────────
    if (built.vertical) {
      stackState = null;
      resolveLabelCollisions(built.labelDescriptors);
    } else {
      stackState = {
        inner: innerEl,
        descriptors: built.labelDescriptors,
        scale: getScale(),
      };
      applyZoomStacks(innerEl, built.labelDescriptors, stackState.scale);
    }

    // ── Era headings last. Mobile headings avoid the final label positions;
    //    the desktop band has its own reserved space above the dots. ────────
    if (built.vertical) {
      renderEraHeadings(
        innerEl,
        built.positions,
        measureLabelBounds(innerEl, built.labelDescriptors),
      );
    } else if (built.hasEvents) {
      renderEraBand(container);
    }

    renderedLabelSignature = labelSignature();
    armSettleRerender();

    // ── State visibility ──────────────────────────────────────────────────
    if (loadingEl) loadingEl.hidden = true;
    if (emptyEl) emptyEl.hidden = built.hasEvents;

    // Mount zoom controls into the viewport (only in horizontal mode)
    if (!vertical && !container.querySelector(".timeline-controls")) {
      mountZoomControls(container);
    }
  });

  // Follow-up read-phase pass, scheduled after the batchWrite() callback
  // above so it runs once the batched writes have flushed (JS-2/SR-3).
  requestAnimationFrame(() => {
    const world = container && container.querySelector(".timeline-world");
    if (!world || container.hidden) return;
    const contentHeight = world.getBoundingClientRect().height;
    if (contentHeight > CONTAINER_MIN_HEIGHT) {
      console.warn(
        `Timeline content height (${Math.round(contentHeight)}px) exceeds container min-height (${CONTAINER_MIN_HEIGHT}px); content may clip. Consider increasing .timeline-container min-height in timeline.css.`,
      );
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
      if (el.classList.contains("timeline-stack")) el.tabIndex = 0;
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
      dots[i].tabIndex =
        faded.includes(i) || dots[i].classList.contains("timeline-dot--stacked") ? -1 : 0;
    }
    for (let i = 0; i < labels.length; i++) {
      labels[i].classList.toggle("filtered-out", faded.includes(i));
    }
    for (const leader of container.querySelectorAll(".timeline-leader")) {
      leader.classList.toggle("filtered-out", leader.dataset.era !== activeEra);
    }
    for (const stack of container.querySelectorAll(".timeline-stack")) {
      const inEra = stack.dataset.eras.split(",").includes(activeEra);
      stack.classList.toggle("filtered-out", !inEra);
      stack.tabIndex = inEra ? 0 : -1;
    }
  });
}
