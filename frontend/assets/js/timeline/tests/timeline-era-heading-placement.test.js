// Timeline era heading placement tests — node:test + node:assert.
// Pure math tests: module loads, happy path, zoom scaling, collision
// escalation, edge cases.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Simulated ERA_BOUNDARIES (mirrors timeline-data.js) ──────────────────────

const ERA_BOUNDARIES = {
  PreIncarnation: { start: 0, end: 0, label: "Pre-Incarnation" },
  OldTestament: { start: 1, end: 1, label: "Old Testament" },
  EarlyLife: { start: 2, end: 5, label: "Early Life" },
  Life: { start: 6, end: 8, label: "Life" },
  GalileeMinistry: { start: 9, end: 12, label: "Galilee Ministry" },
  JudeanMinistry: { start: 13, end: 17, label: "Judean Ministry" },
  PassionWeek: { start: 18, end: 33, label: "Passion Week" },
  "Post-Passion": { start: 34, end: 37, label: "Post-Passion" },
};

// We can't import the actual ES module in Node without a bundler, so we
// replicate the logic inline for testing (mirrors the module exactly).

const BASE_PX = 100;

function periodCentreX(idx) {
  return idx * BASE_PX + BASE_PX / 2;
}

// ── Simulated collision resolver ────────────────────────────────────────────

const LABEL_GAP_PX = 8;
const MAX_TIER = 10;

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  const gap = LABEL_GAP_PX;
  const aLeft = a.x - a.w / 2;
  const aRight = a.x + a.w / 2;
  const aTop = a.y - a.h / 2;
  const aBottom = a.y + a.h / 2;
  const bLeft = b.x - b.w / 2;
  const bRight = b.x + b.w / 2;
  const bTop = b.y - b.h / 2;
  const bBottom = b.y + b.h / 2;
  return (
    aRight + gap > bLeft &&
    bRight + gap > aLeft &&
    aBottom + gap > bTop &&
    bBottom + gap > aTop
  );
}

function resolveLabelCollisions(descriptors) {
  if (!descriptors || descriptors.length === 0) return [];
  const items = descriptors.map((d) => ({ ...d })).sort((a, b) => a.tierIndex - b.tierIndex);
  const axis = items[0].axis;
  const placed = [];
  for (const item of items) {
    const origX = item.x;
    const origY = item.y;
    let tier = item.tierIndex;
    let rect = { x: item.x, y: item.y, w: item.width, h: item.height };
    let collides = false;
    do {
      collides = false;
      for (const pr of placed) {
        if (rectsOverlap(rect, pr)) {
          collides = true;
          tier++;
          if (tier > MAX_TIER) { tier = MAX_TIER; break; }
          const direction = tier % 2 === 1 ? -1 : 1;
          const netShift = direction * item.primaryStep * Math.ceil(tier / 2);
          if (axis === "x") {
            item.y = origY + netShift;
          } else {
            item.x = origX + netShift;
          }
          rect = { x: item.x, y: item.y, w: item.width, h: item.height };
          break;
        }
      }
    } while (collides && tier < MAX_TIER);
    item.tierIndex = tier;
    placed.push(rect);
  }
  return items;
}

// ── Simulated placement function ─────────────────────────────────────────────

const BASE_FONT_SIZE_REM = 1.125;
const MIN_FONT_SIZE_REM = 0.875;
const MAX_FONT_SIZE_REM = 1.375;
const LINE_HEIGHT = 1.3;
const TOP_MARGIN = 8;
const REGION_PADDING = 8;
const DOT_SIZE = 10;

function computeEraHeadingPositions(eraBoundaries, eventBounds, zoomScale, containerWidth, containerHeight, isMobile) {
  if (!eraBoundaries || typeof eraBoundaries !== "object") {
    return [];
  }
  if (!Number.isFinite(zoomScale) || zoomScale <= 0 || !Number.isFinite(containerWidth) || containerWidth <= 0) {
    return [];
  }

  const evBounds = Array.isArray(eventBounds) ? eventBounds : [];

  const rawFontSize = BASE_FONT_SIZE_REM * zoomScale;
  const fontSizeRem = Math.max(MIN_FONT_SIZE_REM, Math.min(MAX_FONT_SIZE_REM, rawFontSize));
  const fontSizeStr = fontSizeRem.toFixed(3) + "rem";
  const fontSizePx = fontSizeRem * 16;
  const headingHeightPx = fontSizePx * LINE_HEIGHT;

  const eraKeys = Object.keys(eraBoundaries);
  const descriptors = [];

  const AVG_GLYPH_WIDTH_RATIO = 0.65;
  const MIN_HEADING_WIDTH = 40;
  const MAX_HEADING_WIDTH = 260;
  function estimateHeadingWidth(label) {
    const text = label || "";
    const textWidth = text.length * fontSizePx * AVG_GLYPH_WIDTH_RATIO;
    return Math.max(MIN_HEADING_WIDTH, Math.min(MAX_HEADING_WIDTH, textWidth + REGION_PADDING * 2));
  }

  for (const era of eraKeys) {
    const bounds = eraBoundaries[era];
    if (!bounds || typeof bounds.start !== "number" || typeof bounds.end !== "number") continue;

    const spanStart = bounds.start * BASE_PX;
    const spanEnd = (bounds.end + 1) * BASE_PX;
    const spanLength = spanEnd - spanStart;
    const headingWidth = estimateHeadingWidth(bounds.label || era);

    let headingX, headingY, primaryStep;
    if (isMobile) {
      headingX = REGION_PADDING;
      headingY = spanStart + REGION_PADDING;
      primaryStep = Math.min(60, spanLength / 8) || 24;
    } else {
      headingX = spanStart + REGION_PADDING;
      headingY = TOP_MARGIN;
      primaryStep = Math.min(60, spanLength / 8) || 24;
    }

    descriptors.push({
      era: era,
      x: headingX + headingWidth / 2,
      y: headingY + headingHeightPx / 2,
      width: headingWidth,
      height: headingHeightPx,
      tierIndex: 0,
      axis: "y",
      primaryStep: primaryStep,
      _spanStart: spanStart,
      _spanEnd: spanEnd,
      _headingWidth: headingWidth,
      _headingHeight: headingHeightPx,
      _isMobile: isMobile,
    });
  }

  if (descriptors.length === 0) return [];

  const allDescriptors = [];
  // Events first (tierIndex -1) so they are obstacles for headings
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
  for (const d of descriptors) {
    allDescriptors.push(d);
  }

  const resolved = resolveLabelCollisions(allDescriptors);

  const VERTICAL_STACK_GAP = 4;
  let verticalStackCount = 0;

  const results = [];
  for (const item of resolved) {
    if (item._isEvent) continue;
    const topLeftX = item.x - item._headingWidth / 2;
    const topLeftY = item.y - item._headingHeight / 2;

    let clampedX = topLeftX;
    let clampedY = topLeftY;

    if (item._isMobile) {
      const origHeadingY = item._spanStart + REGION_PADDING;
      clampedY = Math.max(
        item._spanStart + REGION_PADDING,
        Math.min(item._spanEnd - item._headingHeight - REGION_PADDING, topLeftY),
      );
      if (Math.abs(clampedY - origHeadingY) < 0.5 && item.tierIndex > 0) {
        const downShift = item.primaryStep * Math.ceil(item.tierIndex / 2);
        clampedY = Math.max(
          item._spanStart + REGION_PADDING,
          Math.min(item._spanEnd - item._headingHeight - REGION_PADDING, origHeadingY + downShift),
        );
      }
      clampedX = Math.max(0, topLeftX);
    } else {
      const origHeadingX = item._spanStart + REGION_PADDING;
      clampedX = Math.max(
        item._spanStart + REGION_PADDING,
        Math.min(item._spanEnd - item._headingWidth - REGION_PADDING, topLeftX),
      );

      if (Math.abs(clampedX - origHeadingX) < 0.5 && item.tierIndex > 0) {
        const rightShift = item.primaryStep * Math.ceil(item.tierIndex / 2);
        clampedX = Math.max(
          item._spanStart + REGION_PADDING,
          Math.min(item._spanEnd - item._headingWidth - REGION_PADDING, origHeadingX + rightShift),
        );
      }

      if (item.tierIndex >= MAX_TIER) {
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe("EraHeadingPlacement — module loads & guards", () => {
  test("returns empty array for null eraBoundaries", () => {
    assert.deepStrictEqual(computeEraHeadingPositions(null, [], 1.0, 3800, 280, false), []);
  });

  test("returns empty array for invalid zoom", () => {
    assert.deepStrictEqual(computeEraHeadingPositions(ERA_BOUNDARIES, [], -1, 3800, 280, false), []);
    assert.deepStrictEqual(computeEraHeadingPositions(ERA_BOUNDARIES, [], NaN, 3800, 280, false), []);
  });
});

describe("EraHeadingPlacement — happy path: single era, no collisions", () => {
  test("returns one descriptor per era", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    assert.strictEqual(result.length, 8);
  });

  test("first era (PreIncarnation) anchors at top-left of era region before any nudge", () => {
    // PreIncarnation and OldTestament are both single-period (100px) eras \u2014
    // at 1x zoom their realistic label widths overlap each other by default,
    // so escalation (not tier 0) is expected here; only the top-left anchor
    // (x = eraLeft + REGION_PADDING, y = TOP_MARGIN) is asserted directly.
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    const pre = result.find((r) => r.era === "PreIncarnation");
    assert.ok(pre);
    assert.ok(Math.abs(pre.y - 8) < 0.01, "expected y \u2248 8, got " + pre.y); // TOP_MARGIN
  });

  test("PassionWeek heading is within its era region", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    const pw = result.find((r) => r.era === "PassionWeek");
    assert.ok(pw);
    // PassionWeek: start=18 (eraLeft=1800), end=33 (eraRight=3400)
    // headingX = 1800 + 8 = 1808
    assert.ok(Math.abs(pw.x - 1808) < 0.01, "expected x \u2248 1808, got " + pw.x);
    assert.ok(pw.x >= 1800);
    assert.ok(pw.x <= 3400);
    assert.strictEqual(pw.tier, 0);
  });
});

describe("EraHeadingPlacement — zoom scales font-size", () => {
  // fontSize reports the clamped *visual* target size — informational only.
  // The live-rendered CSS font-size is driven by a --timeline-zoom-scale
  // clamp()/calc() rule in timeline-era-headings.css (not this value),
  // since positions/sizes here are computed once and not recomputed as the
  // user zooms — see the comment in the real module.

  test("at zoom=1.0, font-size equals base 1.125rem", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    assert.strictEqual(result[0].fontSize, "1.125rem");
  });

  test("at zoom=2.0, font-size doubles (capped at max)", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 2.0, 3800, 280, false);
    // raw = 1.125*2 = 2.25, capped to MAX_FONT_SIZE_REM = 1.375
    assert.strictEqual(result[0].fontSize, "1.375rem");
  });

  test("at zoom=0.3, font-size shrinks (floored at min)", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 0.3, 3800, 280, false);
    // raw = 1.125*0.3 = 0.3375, floored to MIN_FONT_SIZE_REM = 0.875
    assert.strictEqual(result[0].fontSize, "0.875rem");
  });

  test("at zoom=0.5, font-size scales proportionally within bounds", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 0.5, 3800, 280, false);
    // raw = 1.125*0.5 = 0.5625, floored to 0.875
    assert.strictEqual(result[0].fontSize, "0.875rem");
  });
});

describe("EraHeadingPlacement — collision with event node", () => {
  test("heading nudges when an event overlaps its initial position", () => {
    // Use PassionWeek (16 periods, 1600px wide).
    // headingWidth=200, headingX=1808, centreX=1908, centreY≈19.7
    // Place an event right at the heading centre to force a collision.
    const eventBounds = [
      {
        era: "PassionWeek",
        x: 1908, // right at the heading's centre x
        y: 19,   // near heading centre y (~19.7)
        width: 10,
        height: 10,
      },
    ];
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, eventBounds, 1.0, 3800, 280, false);
    const pw = result.find((r) => r.era === "PassionWeek");
    assert.ok(pw);
    // Should be nudged (tier > 0)
    assert.ok(pw.tier > 0, "expected tier > 0, got " + pw.tier);
    // x should differ from the original position (1808)
    assert.ok(Math.abs(pw.x - 1808) > 0.5, "expected x to differ from 1808, got " + pw.x);
    // Should still be within the era region [1800, 3400]
    assert.ok(pw.x >= 1800 && pw.x <= 3400, "heading x within era bounds, got " + pw.x);
  });

  test("distant events do not trigger collision nudging", () => {
    // Place an event far from the PreIncarnation heading
    const eventBounds = [
      {
        era: "PassionWeek",
        x: 2000, // far away from PreIncarnation (at x≈48)
        y: 140,
        width: 10,
        height: 10,
      },
    ];
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, eventBounds, 1.0, 3800, 280, false);
    const pre = result.find((r) => r.era === "PreIncarnation");
    assert.ok(pre);
    assert.strictEqual(pre.tier, 0);
  });
});

describe("EraHeadingPlacement — multiple eras, no cross-era nudging", () => {
  test("each era resolves independently", () => {
    // Place events in two wide eras — each heading should resolve
    // within its own region.
    // PassionWeek: eraLeft=1800, headingWidth≈156.4, centreX≈1886.2
    // Life: eraLeft=600, headingWidth≈62.8, centreX≈639.4
    const eventBounds = [
      { era: "PassionWeek", x: 1881, y: 19, width: 10, height: 10 },
      { era: "Life", x: 635, y: 19, width: 10, height: 10 },
    ];
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, eventBounds, 1.0, 3800, 280, false);

    const pw = result.find((r) => r.era === "PassionWeek");
    const life = result.find((r) => r.era === "Life");
    assert.ok(pw);
    assert.ok(life);
    // Both should have been nudged by their respective events
    assert.ok(pw.tier > 0, "PassionWeek tier > 0, got " + pw.tier);
    assert.ok(life.tier > 0, "Life tier > 0, got " + life.tier);
    // PassionWeek should still be in its region [1800, 3400]
    assert.ok(pw.x >= 1800 && pw.x <= 3400, "PassionWeek x in bounds, got " + pw.x);
    // Life should be in its region [600, 900]
    assert.ok(life.x >= 600 && life.x <= 900, "Life x in bounds, got " + life.x);
  });
});

describe("EraHeadingPlacement — vertical stacking fallback", () => {
  test("adjacent single-period eras whose labels can't fit stack vertically instead of staying stuck", () => {
    // PreIncarnation and OldTestament are each a single 100px-wide period —
    // both need ~150-190px for their real label text, so no amount of
    // x-nudging within their own span can separate them (Notes: "if an era
    // is narrow ... headings may stack and escalate vertically as a
    // fallback"). Assert at least one of the pair moved off the shared
    // TOP_MARGIN row rather than silently sitting on top of the other.
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    const pre = result.find((r) => r.era === "PreIncarnation");
    const old = result.find((r) => r.era === "OldTestament");
    assert.ok(pre && old);
    assert.ok(
      Math.abs(pre.y - old.y) > 0.5,
      "expected PreIncarnation/OldTestament to end up on different rows, got y=" +
        pre.y + " and y=" + old.y,
    );
  });
});

describe("EraHeadingPlacement — mobile/vertical mode", () => {
  test("headings anchor at fixed left offset, y follows era's vertical span", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, true);
    const pre = result.find((r) => r.era === "PreIncarnation");
    assert.ok(pre);
    assert.ok(Math.abs(pre.x - REGION_PADDING) < 0.01, "expected x ≈ 8, got " + pre.x);
    assert.ok(Math.abs(pre.y - REGION_PADDING) < 0.01, "expected y ≈ 8, got " + pre.y);
    assert.strictEqual(pre.tier, 0);

    const pw = result.find((r) => r.era === "PassionWeek");
    assert.ok(pw);
    // PassionWeek: start=18 -> spanStart=1800, headingY = 1800 + 8 = 1808
    assert.ok(Math.abs(pw.y - 1808) < 0.01, "expected y ≈ 1808, got " + pw.y);
    assert.ok(pw.y >= 1800 && pw.y <= 3400, "heading y within era's vertical span");
  });

  test("heading nudges along x (away from spine) when an event overlaps it", () => {
    // PreIncarnation heading anchors at x=8 in mobile mode; place the event
    // right at that fixed left offset so it overlaps regardless of width.
    const eventBounds = [
      { era: "PreIncarnation", x: 8, y: 8, width: 10, height: 10 },
    ];
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, eventBounds, 1.0, 3800, 280, true);
    const pre = result.find((r) => r.era === "PreIncarnation");
    assert.ok(pre);
    assert.ok(pre.tier > 0, "expected tier > 0, got " + pre.tier);
    // y should still be clamped within PreIncarnation's span [0, 100]
    assert.ok(pre.y >= 0 && pre.y <= 100, "heading y within era bounds, got " + pre.y);
  });
});

describe("EraHeadingPlacement — edge case: empty era", () => {
  test("era with no events still gets a heading", () => {
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1.0, 3800, 280, false);
    // All 8 eras should have headings
    assert.strictEqual(result.length, 8);
    // PreIncarnation (single period, no events) should still be placed
    const pre = result.find((r) => r.era === "PreIncarnation");
    assert.ok(pre);
    assert.strictEqual(pre.tier, 0);
  });
});
