/**
 * Timeline era heading placement module.
 *
 * Pure, DOM-free functions for placing the era headings. Both take data in and
 * return positions out. The admin editor reaches `computeEraBandLayout` through
 * admin/assets/js/cluster-logic-bridge/timeline-era-heading-placement-bridge.js.
 *
 * - `computeEraBandLayout` is the horizontal (desktop) layout. Headings sit in
 *   a reserved band above the dots, in screen pixels, in up to three lanes. A
 *   heading that is wider than its era, or that sits below the first lane, gets
 *   a leader line down to the era bar. Called by timeline-render.js and by the
 *   admin editor's timeline-events.js.
 * - `computeEraHeadingPositions` is the vertical (mobile) layout. Headings sit
 *   left of the spine, in world coordinates, and avoid the event boxes.
 *   Called by timeline-render.js only.
 *
 * @module timeline/timeline-era-heading-placement
 */

import { resolveLabelCollisions } from "../cluster-logic/cluster-label-collision.js";

// ── Era band layout (horizontal) ──────────────────────────────────────────────

/** Number of heading lanes in the band. The band height token
 * `--timeline-heading-band-height` in variables.css must hold this many lanes
 * plus the era bar. */
export const ERA_BAND_LANES = 3;

/** Space between the left edge of an era and the start of its heading (px). */
const BAND_TEXT_INSET = 4;

/** Space kept free after a heading in its lane, before the next heading (px). */
const BAND_LANE_GAP = 10;

/**
 * Lay out the era headings in the reserved band.
 *
 * Each era takes the first lane whose last heading ends before the era starts.
 * A heading gets a leader when it does not fit inside its own era, or when it
 * is not in the first lane. All values are screen pixels measured from the left
 * edge of the world, so a caller shifts the whole band by the current pan.
 * The heading size does not change with zoom, so `textWidths` stay valid when
 * only the zoom changes.
 *
 * @param {Object<string,{start:number,end:number,label?:string}>} eraBoundaries
 *   Era key -> first and last period index (inclusive).
 * @param {number} pxPerPeriod - screen pixels per period (base scale x zoom)
 * @param {Object<string,number>} textWidths - measured heading width in px, by era key
 * @returns {Array<{era:string, x:number, width:number, textX:number, lane:number, leader:boolean}>}
 *   One entry per era, in the order of `eraBoundaries`. `x` is the left edge of
 *   the era (also the left edge of the bar), `width` is the era span, and
 *   `textX` is the left edge of the heading text.
 */
export function computeEraBandLayout(eraBoundaries, pxPerPeriod, textWidths) {
  if (!eraBoundaries || typeof eraBoundaries !== "object") {
    console.warn("timeline-era-heading-placement: eraBoundaries is missing or invalid");
    return [];
  }
  if (!Number.isFinite(pxPerPeriod) || pxPerPeriod <= 0) {
    console.warn("timeline-era-heading-placement: invalid pxPerPeriod", { pxPerPeriod });
    return [];
  }

  const laneEnds = new Array(ERA_BAND_LANES).fill(-Infinity);
  const result = [];

  for (const [era, bounds] of Object.entries(eraBoundaries)) {
    if (!bounds || !Number.isFinite(bounds.start) || !Number.isFinite(bounds.end)) continue;

    const x = bounds.start * pxPerPeriod;
    const width = (bounds.end - bounds.start + 1) * pxPerPeriod;
    const textWidth = textWidths && Number.isFinite(textWidths[era]) ? textWidths[era] : 0;
    const textLeft = x + BAND_TEXT_INSET;

    let lane = laneEnds.findIndex((end) => end <= textLeft);
    if (lane === -1) {
      lane = ERA_BAND_LANES - 1;
      console.warn(
        "timeline-era-heading-placement: no free heading lane; this heading overlaps the previous one",
        { era },
      );
    }
    laneEnds[lane] = textLeft + textWidth + BAND_LANE_GAP;

    result.push({
      era,
      x,
      width,
      textX: textLeft,
      lane,
      leader: lane > 0 || textWidth + BAND_TEXT_INSET * 2 > width,
    });
  }

  return result;
}

// ── Mobile heading layout (vertical) ──────────────────────────────────────────

/** Base heading font-size (matches --text-h4 in variables.css). */
const BASE_FONT_SIZE_REM = 1.125;

/** Minimum readable font-size (matches --text-small). */
const MIN_FONT_SIZE_REM = 0.875;

/** Maximum font-size (matches --text-h3). */
const MAX_FONT_SIZE_REM = 1.375;

/** Line-height multiplier for bounding-box height estimation. */
const LINE_HEIGHT = 1.3;

/**
 * Vertical padding of a heading, top and bottom each (px). Matches
 * `padding: var(--space-xs) ...` in timeline-era-headings.css. The box must
 * include it, or headings sit about 8px too close to labels and touch them.
 */
const HEADING_PADDING_Y = 4;

/** Gap between a heading edge and its era region edge (world pixels). */
const REGION_PADDING = 8;

/** Dot size in world pixels for collision estimation. */
const DOT_SIZE = 10;

/** Pixels per period in world coordinates. Equals `BASE_PX_PER_PERIOD` in
 * timeline-geometry.js; this module stays free of imports from it. */
const BASE_PX = 100;

/** Rough width of a bold uppercase glyph as a share of the font size,
 * including the 0.08em letter-spacing in timeline-era-headings.css. */
const AVG_GLYPH_WIDTH_RATIO = 0.65;
const MIN_HEADING_WIDTH = 40;
const MAX_HEADING_WIDTH = 260;

/**
 * Estimate the rendered width of a heading from its text.
 *
 * @param {string} label
 * @param {number} fontSizePx
 * @returns {number}
 */
function estimateHeadingWidth(label, fontSizePx) {
  const textWidth = (label || "").length * fontSizePx * AVG_GLYPH_WIDTH_RATIO;
  return Math.max(
    MIN_HEADING_WIDTH,
    Math.min(MAX_HEADING_WIDTH, textWidth + REGION_PADDING * 2),
  );
}

/**
 * Compute positions for the era headings of the vertical (mobile) layout.
 *
 * Eras run top to bottom, so an era's span is along y. A heading starts at a
 * fixed left offset, at the era start. The shared collision resolver nudges it
 * along x when an event box overlaps it. Each heading stays inside its era's
 * vertical span.
 *
 * @param {Object<string,{start:number,end:number,label?:string}>} eraBoundaries
 *   Era key -> first and last period index (inclusive).
 * @param {Array<{era:string, x:number, y:number, width:number, height:number}>} eventBounds
 *   Boxes of event dots and labels in world coordinates (top-left based).
 *   Pass [] or null if no events are rendered.
 * @param {number} zoomScale - current zoom scale; it only sizes the boxes
 * @param {number} containerWidth - world size of the timeline (px); must be positive
 * @returns {Array<{era:string, x:number, y:number, tier:number, fontSize:string}>}
 *   One entry per era. `tier` is the collision tier (0 means no nudge) and
 *   `fontSize` is a CSS value such as "1.125rem".
 */
export function computeEraHeadingPositions(
  eraBoundaries,
  eventBounds,
  zoomScale,
  containerWidth,
) {
  if (!eraBoundaries || typeof eraBoundaries !== "object") {
    console.warn(
      "timeline-era-heading-placement: eraBoundaries is missing or invalid — returning empty array",
    );
    return [];
  }
  if (
    !Number.isFinite(zoomScale) ||
    zoomScale <= 0 ||
    !Number.isFinite(containerWidth) ||
    containerWidth <= 0
  ) {
    console.warn(
      "timeline-era-heading-placement: invalid zoom/container dimensions — returning empty array",
      { zoomScale, containerWidth },
    );
    return [];
  }

  const evBounds = Array.isArray(eventBounds) ? eventBounds : [];

  const fontSizeRem = Math.max(
    MIN_FONT_SIZE_REM,
    Math.min(MAX_FONT_SIZE_REM, BASE_FONT_SIZE_REM * zoomScale),
  );
  const fontSizePx = fontSizeRem * 16;
  const headingHeightPx = fontSizePx * LINE_HEIGHT + HEADING_PADDING_Y * 2;

  const descriptors = [];
  for (const [era, bounds] of Object.entries(eraBoundaries)) {
    if (!bounds || typeof bounds.start !== "number" || typeof bounds.end !== "number") {
      continue;
    }
    const spanStart = bounds.start * BASE_PX;
    const spanEnd = (bounds.end + 1) * BASE_PX;
    const headingWidth = estimateHeadingWidth(bounds.label || era, fontSizePx);

    descriptors.push({
      era,
      // The resolver works with centre coordinates.
      x: REGION_PADDING + headingWidth / 2,
      y: spanStart + REGION_PADDING + headingHeightPx / 2,
      width: headingWidth,
      height: headingHeightPx,
      tierIndex: 0,
      axis: "y", // nudge along x, away from the spine
      primaryStep: Math.min(60, (spanEnd - spanStart) / 8) || 24,
      _spanStart: spanStart,
      _spanEnd: spanEnd,
      _headingWidth: headingWidth,
      _headingHeight: headingHeightPx,
    });
  }
  if (descriptors.length === 0) return [];

  // Event boxes go in first, with tier -1, so they act as fixed obstacles.
  const allDescriptors = [];
  for (const eb of evBounds) {
    if (!eb || typeof eb.x !== "number" || typeof eb.y !== "number") continue;
    allDescriptors.push({
      era: eb.era || "",
      x: eb.x + (eb.width || DOT_SIZE) / 2,
      y: eb.y + (eb.height || DOT_SIZE) / 2,
      width: eb.width || DOT_SIZE,
      height: eb.height || DOT_SIZE,
      tierIndex: -1,
      axis: "y",
      primaryStep: 0,
      _isEvent: true,
    });
  }
  allDescriptors.push(...descriptors);

  const resolved = resolveLabelCollisions(allDescriptors);
  const fontSize = fontSizeRem.toFixed(3) + "rem";

  const results = [];
  for (const item of resolved) {
    if (item._isEvent) continue;

    const topLeftX = item.x - item._headingWidth / 2;
    const topLeftY = item.y - item._headingHeight / 2;

    // Keep the heading inside its era's vertical span.
    const minY = item._spanStart + REGION_PADDING;
    const maxY = item._spanEnd - item._headingHeight - REGION_PADDING;
    let y = Math.max(minY, Math.min(maxY, topLeftY));
    if (Math.abs(y - minY) < 0.5 && item.tierIndex > 0) {
      // The resolver moved the heading up and the clamp undid it; move it down.
      const downShift = item.primaryStep * Math.ceil(item.tierIndex / 2);
      y = Math.max(minY, Math.min(maxY, minY + downShift));
    }

    results.push({
      era: item.era,
      x: Math.max(0, topLeftX),
      y,
      tier: item.tierIndex,
      fontSize,
    });
  }

  return results;
}
