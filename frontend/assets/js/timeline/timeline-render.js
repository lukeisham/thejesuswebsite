/**
 * Timeline render module.
 *
 * Builds the DOM timeline inside `.timeline-container`. Computes horizontal
 * positions from period indices, staggers overlapping events into vertical
 * clusters, draws era markers and labels, and handles loading / empty states.
 *
 * No CSS changes — all emitted classes match the existing `timeline.css` contract.
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

/**
 * Read the horizontal slot width per period from the CSS custom property
 * --px-per-period on the timeline container, falling back to 100px.
 *
 * @returns {number}
 */
function getSlotWidth() {
  const el = document.getElementById("timeline-container");
  if (!el) return 100;
  const raw = getComputedStyle(el).getPropertyValue("--px-per-period").trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : 100;
}

/** Stagger offsets (pixels) for events sharing the same period. */
const STAGGER_OFFSETS = [0, -8, 8, -16, 16, -24, 24];

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

/**
 * Initialise cached references to key DOM nodes.
 */
export function init() {
  container = document.getElementById("timeline-container");
  spineEl = document.getElementById("timeline-spine");
  loadingEl = document.getElementById("loading-state");
  emptyEl = document.getElementById("empty-state");
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
 * Compute the pixel X position for a period by its canonical index.
 *
 * @param {number} periodIndex
 * @returns {number}
 */
function periodX(periodIndex, slotWidth) {
  return periodIndex * slotWidth + slotWidth / 2;
}

/**
 * Determine the vertical stagger offset for an event within a cluster.
 *
 * @param {number} index - Position within the cluster (0-based).
 * @returns {number} Pixel offset from the spine centre.
 */
function staggerY(index) {
  return STAGGER_OFFSETS[index % STAGGER_OFFSETS.length];
}

/**
 * Determine whether a label should be above or below the dot based on stagger.
 *
 * @param {number} yOffset
 * @returns {'above'|'below'}
 */
function labelPosition(yOffset) {
  return yOffset <= 0 ? "above" : "below";
}

/**
 * Build the complete timeline DOM and inject it into the container.
 *
 * Uses batchWrite to avoid layout thrash during scroll/filter (SR-3).
 *
 * @param {Map<string, Array>} groupedEvents - Map from period → events array.
 * @param {string|null} activeEra - Currently active era filter, or 'all'.
 */
export function renderTimeline(groupedEvents, activeEra) {
  if (!container) return;

  const slotWidth = getSlotWidth();
  const totalWidth = TIMELINE_PERIODS.length * slotWidth;

  batchWrite(() => {
    // ── Build inner scrollable canvas ──────────────────────────────────────
    innerEl = createElement("div", {
      className: "timeline-inner",
      style: `width:${totalWidth}px;position:relative;height:100%;min-height:280px`,
    });

    // ── Spine ─────────────────────────────────────────────────────────────
    const spine = createElement("div", {
      className: "timeline-spine",
      style: `width:${totalWidth}px`,
    });
    innerEl.appendChild(spine);

    // ── Era markers and labels ────────────────────────────────────────────
    const eraKeys = ["beginning", "middle", "end"];
    for (let i = 0; i < eraKeys.length; i++) {
      const era = eraKeys[i];
      const bounds = ERA_BOUNDARIES[era];

      // Divider line at the start of each era (except the first)
      if (i > 0) {
        const markerX = bounds.start * slotWidth;
        const marker = createElement("div", {
          className: "timeline-era-marker",
          style: `left:${markerX}px`,
        });
        innerEl.appendChild(marker);
      }

      // Era label centred over the era's span
      const eraStartX = bounds.start * slotWidth;
      const eraEndX = (bounds.end + 1) * slotWidth;
      const eraMidX = (eraStartX + eraEndX) / 2;

      const eraLabel = createElement(
        "div",
        {
          className: "timeline-era-label",
          style: `left:${eraMidX}px`,
        },
        [ERA_LABELS[era]],
      );
      innerEl.appendChild(eraLabel);
    }

    // ── Events (dots + labels) ────────────────────────────────────────────
    let hasEvents = false;

    for (const [period, events] of groupedEvents) {
      const periodIdx = getPeriodIndex(period);
      if (periodIdx < 0) continue;

      const x = periodX(periodIdx, slotWidth);

      events.forEach((event, clusterIndex) => {
        const yOffset = staggerY(clusterIndex);
        const pos = labelPosition(yOffset);
        const isFiltered =
          activeEra && activeEra !== "all" && event.timeline_era !== activeEra;

        // ── Dot ──────────────────────────────────────────────────────────
        const dot = createElement("div", {
          className: [
            "timeline-dot",
            "standard",
            isFiltered ? "filtered-out" : "",
          ]
            .filter(Boolean)
            .join(" "),
          style: `left:${x}px;top:${50 + yOffset}%`,
          dataset: {
            eventId: String(event.id),
            period,
            era: event.timeline_era || "",
            title: event.title || "",
            location: event.map_location || "",
            verse: event.primary_verse || "",
            slug: event.slug || "",
            category: event.gospel_category || "",
          },
        });
        innerEl.appendChild(dot);

        // ── Label ────────────────────────────────────────────────────────
        const titleSpan = createElement(
          "span",
          {
            className: "timeline-label-title",
          },
          [event.title || ""],
        );

        const metaText = [event.map_location || ""].filter(Boolean).join(" · ");

        const metaSpan = createElement(
          "span",
          {
            className: "timeline-label-meta",
          },
          [metaText],
        );

        const label = createElement(
          "div",
          {
            className: ["timeline-label", pos, isFiltered ? "filtered-out" : ""]
              .filter(Boolean)
              .join(" "),
            style: `left:${x}px;top:${50 + yOffset}%`,
          },
          [titleSpan, metaSpan],
        );
        innerEl.appendChild(label);

        hasEvents = true;
      });
    }

    // ── Clear and inject ──────────────────────────────────────────────────
    container.innerHTML = "";
    container.appendChild(innerEl);

    // ── State visibility ──────────────────────────────────────────────────
    if (loadingEl) loadingEl.hidden = true;
    container.hidden = !hasEvents;
    if (emptyEl) emptyEl.hidden = hasEvents;
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
      } else {
        dot.classList.remove("filtered-out");
      }
    });

    labels.forEach((label) => {
      // Labels are siblings of dots in the DOM tree; filter by the same logic
      const dot = label.previousElementSibling;
      if (dot && dot.dataset.era !== era) {
        label.classList.add("filtered-out");
      } else {
        label.classList.remove("filtered-out");
      }
    });
  });
}
