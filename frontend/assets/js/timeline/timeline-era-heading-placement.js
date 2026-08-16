/**
 * Timeline era heading placement module.
 *
 * Pure, DOM-free function that computes final positions for era headings
 * after collision avoidance with event nodes.  Designed to be shared across
 * frontend and admin (SR-4) — the module exports a single function that
 * takes data in, returns positions out, and never touches the DOM.
 *
 * Coordinate system: all x/y values are in world coordinates (matching the
 * `.timeline-inner` container inside `.timeline-world`).  Zoom scaling is
 * applied by the CSS transform wrapper, so positions do not include zoom
 * multiplication — only the font-size is zoom-aware for sizing the
 * collision bounding boxes.
 *
 * Collision model: delegates to the shared `resolveLabelCollisions()` from
 * `cluster-label-collision.js` (SR-4).  Each heading is treated as a label
 * descriptor with `axis: 'y'` so it nudges horizontally (along x) while
 * staying on the same vertical row — preserving the "top-left" intent.
 *
 * @module timeline/timeline-era-heading-placement
 */

import { resolveLabelCollisions, MAX_TIER } from "../cluster-logic/cluster-label-collision.js";

// ── Font-size tokens (must match frontend/assets/css/base/variables.css) ──────

/** Base heading font-size at 1× zoom (matches --text-h4). */
const BASE_FONT_SIZE_REM = 1.125;

/** Minimum readable font-size (matches --text-small). */
const MIN_FONT_SIZE_REM = 0.875;

/** Maximum font-size (matches --text-h3). */
const MAX_FONT_SIZE_REM = 1.375;

/** Line-height multiplier for bounding-box height estimation. */
const LINE_HEIGHT = 1.3;

/** Default vertical margin from the top of the container (world pixels). */
const TOP_MARGIN = 8;

/** Gap between heading edge and era region edge (world pixels). */
const REGION_PADDING = 8;

/** Dot size in world pixels for collision estimation. */
const DOT_SIZE = 10;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute final positions for era headings after collision avoidance.
 *
 * @param {Object<string,{start:number,end:number}>} eraBoundaries
 *   Era key → { start, end } period indices (inclusive).
 * @param {Array<{era:string, x:number, y:number, width:number, height:number}>} eventBounds
 *   Bounding boxes of event dots in world coordinates.  Pass [] or null
 *   if no events are rendered yet.
 * @param {number} zoomScale
 *   Current zoom scale (0.3–3.0).  Affects only font-size (sizing), not
 *   positioning (which is in world coordinates).
 * @param {number} containerWidth
 *   Total world width of the timeline (pixels).  Used for clamping headings
 *   within bounds.
 * @param {number} containerHeight
 *   Approximate height of the timeline container in pixels.  Used for
 *   estimating dot y-positions when event bounds are missing.
 * @param {boolean} isMobile
 *   True for vertical/mobile mode (< 768px).  Headings position to the left
 *   of the spine instead of above it.
 * @returns {Array<{era:string, x:number, y:number, tier:number, fontSize:string}>}
 *   One descriptor per era.  `tier` is the final collision-escalation tier
 *   (0 = no nudge), `fontSize` is a CSS-ready value like "1.125rem".
 */
export function computeEraHeadingPositions(
  eraBoundaries,
  eventBounds,
  zoomScale,
  containerWidth,
  containerHeight,
  isMobile,
) {
  // ── Guard: validate inputs ──────────────────────────────────────────────
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

  // Normalise event bounds
  const evBounds = Array.isArray(eventBounds) ? eventBounds : [];

  // ── Compute clamped font-size for this zoom level ────────────────────────
  // fontSizeRem is the INTENDED on-screen size (clamped for readability),
  // used for collision/layout box math below (headings live inside
  // `.timeline-world`, scaled by `transform: scale(zoomScale)` — see
  // timeline-zoom.js — so world-unit box sizes here should reflect the
  // final visual size, matching how event-dot bounds are also expressed in
  // world units). The `fontSize` field returned is informational only: the
  // actual CSS font-size is driven live by a `--timeline-zoom-scale`
  // clamp()/calc() rule in timeline-era-headings.css (same counter-scaling
  // technique as timeline-line-stability.css), not by this one-shot value —
  // positions/sizes here are computed once (SR-3) and never recomputed as
  // the user zooms, so a static inline font-size would go stale immediately.
  const rawFontSize = BASE_FONT_SIZE_REM * zoomScale;
  const fontSizeRem = Math.max(
    MIN_FONT_SIZE_REM,
    Math.min(MAX_FONT_SIZE_REM, rawFontSize),
  );
  const fontSizeStr = fontSizeRem.toFixed(3) + "rem";

  // ── Estimate heading height from font-size (rem → px conversion is rough;
  //     we approximate by assuming 1rem ≈ 16px for bounding-box math). ──────
  const fontSizePx = fontSizeRem * 16;
  const headingHeightPx = fontSizePx * LINE_HEIGHT;

  // ── Build initial heading descriptors ────────────────────────────────────
  const eraKeys = Object.keys(eraBoundaries);
  const descriptors = [];

  // We need periodX from timeline-geometry — but this module is pure math
  // and should not import timeline-geometry to stay shareable.  Instead we
  // expect callers to pass ERA_BOUNDARIES that include { start, end } as
  // period indices, and a conversion function.  Actually, looking at the
  // plan, ERA_BOUNDARIES already contains { start, end } as indices, and
  // BASE_PX_PER_PERIOD = 100 is the canonical world-pixel scale.
  //
  // We'll embed the period→pixel conversion here using BASE_PX_PER_PERIOD=100
  // which is the canonical constant shared by both frontend and admin.
  const BASE_PX = 100;

  /**
   * Convert period index to world-pixel centre-X (matches periodX()).
   * @param {number} idx
   * @returns {number}
   */
  function periodCentreX(idx) {
    return idx * BASE_PX + BASE_PX / 2;
  }

  // Mobile/vertical mode: eras are arranged top-to-bottom along the spine
  // (periodY uses the same BASE_PX formula as periodX), so the era's
  // "span" runs along y instead of x. Headings sit at a fixed small offset
  // from the left edge (left of the spine) rather than spanning era width.
  // Collision nudging still shifts along x in both modes (headings move
  // away from the shared left position when adjacent eras' y-ranges
  // overlap) — see cluster-label-collision.js `axis: 'y'` convention.

  // Rough average glyph width for a bold uppercase sans label at the given
  // font-size, including the 0.08em letter-spacing (see
  // components/timeline-era-headings.css). Collision boxes must reflect the
  // actual rendered text width — a box sized only from the era's pixel span
  // under-estimates narrow (single/double-period) eras and lets long labels
  // (e.g. "PRE-INCARNATION") visually overlap a neighbour even though the
  // collision resolver reports no overlap.
  const AVG_GLYPH_WIDTH_RATIO = 0.65;
  const MIN_HEADING_WIDTH = 40;
  const MAX_HEADING_WIDTH = 260;

  /**
   * @param {string} label
   * @param {number} fontSizePx
   * @returns {number}
   */
  function estimateHeadingWidth(label, fontSizePx) {
    const text = label || "";
    const textWidth = text.length * fontSizePx * AVG_GLYPH_WIDTH_RATIO;
    return Math.max(
      MIN_HEADING_WIDTH,
      Math.min(MAX_HEADING_WIDTH, textWidth + REGION_PADDING * 2),
    );
  }

  for (const era of eraKeys) {
    const bounds = eraBoundaries[era];
    if (!bounds || typeof bounds.start !== "number" || typeof bounds.end !== "number") {
      continue;
    }

    // Era region span (start edge / end edge) along the arrangement axis:
    // x for desktop (left-to-right eras), y for mobile (top-to-bottom eras).
    const spanStart = bounds.start * BASE_PX;
    const spanEnd = (bounds.end + 1) * BASE_PX;
    const spanLength = spanEnd - spanStart;
    const headingWidth = estimateHeadingWidth(bounds.label || era, fontSizePx);

    let headingX;
    let headingY;
    let primaryStep;

    if (isMobile) {
      // Fixed left offset (near the container's left edge, left of the
      // centred spine); vertical position anchored at the era's start.
      headingX = REGION_PADDING;
      headingY = spanStart + REGION_PADDING;
      primaryStep = Math.min(60, spanLength / 8) || 24;
    } else {
      // Top-left of era's horizontal region.
      headingX = spanStart + REGION_PADDING;
      headingY = TOP_MARGIN;
      primaryStep = Math.min(60, spanLength / 8) || 24;
    }

    // Convert to centre coordinates for the collision resolver
    descriptors.push({
      era: era,
      x: headingX + headingWidth / 2,   // centre x
      y: headingY + headingHeightPx / 2, // centre y
      width: headingWidth,
      height: headingHeightPx,
      tierIndex: 0,
      axis: "y", // nudge along x (preserves left-anchored intent)
      primaryStep: primaryStep,
      // Carry extra metadata for post-resolution conversion
      _spanStart: spanStart,
      _spanEnd: spanEnd,
      _headingWidth: headingWidth,
      _headingHeight: headingHeightPx,
      _isMobile: isMobile,
    });
  }

  if (descriptors.length === 0) return [];

  // ── Add event-dot bounding boxes as fixed "already placed" items ─────────
  // We inject the event bounds as already-resolved descriptors with lower
  // tierIndex so they sort before headings and act as obstacles.
  const allDescriptors = [];
  for (const eb of evBounds) {
    if (!eb || typeof eb.x !== "number" || typeof eb.y !== "number") continue;
    allDescriptors.push({
      era: eb.era || "",
      x: eb.x + (eb.width || DOT_SIZE) / 2,
      y: eb.y + (eb.height || DOT_SIZE) / 2,
      width: eb.width || DOT_SIZE,
      height: eb.height || DOT_SIZE,
      tierIndex: -1, // process before headings
      axis: "y",
      primaryStep: 0, // events don't nudge
      _isEvent: true,
    });
  }
  // Append headings after events so they're processed second
  for (const d of descriptors) {
    allDescriptors.push(d);
  }

  // ── Run collision resolution ─────────────────────────────────────────────
  const resolved = resolveLabelCollisions(allDescriptors);

  // ── Filter back to only heading descriptors, convert to top-left output ──
  // Vertical stacking fallback (Notes: "if an era is narrow and heavily
  // clustered, headings may stack and escalate vertically as a fallback").
  // Triggers only when horizontal escalation is fully exhausted (tier hit
  // MAX_TIER) — narrow single/double-period eras whose real label width
  // exceeds their own span can never resolve purely by x-nudging within it.
  const VERTICAL_STACK_GAP = 4;
  let verticalStackCount = 0;

  const results = [];
  for (const item of resolved) {
    if (item._isEvent) continue;

    // Convert centre x/y back to top-left
    const topLeftX = item.x - item._headingWidth / 2;
    const topLeftY = item.y - item._headingHeight / 2;

    let clampedX = topLeftX;
    let clampedY = topLeftY;

    if (item._isMobile) {
      // Vertical mode: clamp to era region along y (never leave the era's
      // vertical span); x is never clamped since nudges intentionally move
      // it away from the fixed left offset.
      const origHeadingY = item._spanStart + REGION_PADDING;
      clampedY = Math.max(
        item._spanStart + REGION_PADDING,
        Math.min(item._spanEnd - item._headingHeight - REGION_PADDING, topLeftY),
      );
      if (Math.abs(clampedY - origHeadingY) < 0.5 && item.tierIndex > 0) {
        // Upward nudge was eaten by clamping — force downward instead.
        const downShift = item.primaryStep * Math.ceil(item.tierIndex / 2);
        clampedY = Math.max(
          item._spanStart + REGION_PADDING,
          Math.min(
            item._spanEnd - item._headingHeight - REGION_PADDING,
            origHeadingY + downShift,
          ),
        );
      }
      clampedX = Math.max(0, topLeftX);
    } else {
      // Horizontal mode: clamp to era region along x.
      // Since headings start at top-left (spanStart + REGION_PADDING), left
      // nudges get eaten by clamping.  Detect when clamping undoes a nudge
      // and fall back to a right-only shift.
      const origHeadingX = item._spanStart + REGION_PADDING;
      clampedX = Math.max(
        item._spanStart + REGION_PADDING,
        Math.min(item._spanEnd - item._headingWidth - REGION_PADDING, topLeftX),
      );

      if (Math.abs(clampedX - origHeadingX) < 0.5 && item.tierIndex > 0) {
        // Left nudge was eaten by clamping — force right instead.
        const rightShift = item.primaryStep * Math.ceil(item.tierIndex / 2);
        clampedX = Math.max(
          item._spanStart + REGION_PADDING,
          Math.min(
            item._spanEnd - item._headingWidth - REGION_PADDING,
            origHeadingX + rightShift,
          ),
        );
      }

      if (item.tierIndex >= MAX_TIER) {
        // Horizontal escalation exhausted without clearing the collision
        // (era too narrow for its own label) — stack downward instead.
        verticalStackCount += 1;
        clampedY = topLeftY + verticalStackCount * (item._headingHeight + VERTICAL_STACK_GAP);
      }
    }

    results.push({
      era: item.era,
      x: clampedX,
      y: clampedY,
      tier: item.tierIndex,
      fontSize: fontSizeStr,
    });
  }

  return results;
}
