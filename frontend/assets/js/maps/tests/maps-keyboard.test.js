// Maps keyboard tests — node:test + node:assert.
// Tests the pan-adjustment logic for keeping a focused pin within the viewport.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Viewport pan-adjustment logic ───────────────────────────────────────────
// Mirrors the clamping approach in maps-interactions.js.

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const PAN_CLAMP = 500; // px

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute pan adjustment to bring a pin at relative position (0-1)
 * into the visible 80% of the viewport.
 */
function computePanAdjustment(pinFractionX, pinFractionY, viewportW, viewportH, zoomLevel) {
  const safeMargin = 0.1; // 10% margin on each side
  const minX = safeMargin * viewportW;
  const maxX = (1 - safeMargin) * viewportW;
  const minY = safeMargin * viewportH;
  const maxY = (1 - safeMargin) * viewportH;

  const pinScreenX = pinFractionX * viewportW * zoomLevel;
  const pinScreenY = pinFractionY * viewportH * zoomLevel;

  let adjustX = 0;
  let adjustY = 0;

  if (pinScreenX < minX) adjustX = minX - pinScreenX;
  else if (pinScreenX > maxX) adjustX = maxX - pinScreenX;

  if (pinScreenY < minY) adjustY = minY - pinScreenY;
  else if (pinScreenY > maxY) adjustY = maxY - pinScreenY;

  return {
    translateX: clamp(adjustX, -PAN_CLAMP, PAN_CLAMP),
    translateY: clamp(adjustY, -PAN_CLAMP, PAN_CLAMP),
  };
}

describe("maps keyboard: pan-adjustment", () => {
  test("centered pin needs no adjustment", () => {
    const result = computePanAdjustment(0.5, 0.5, 1000, 800, 1.0);
    assert.equal(result.translateX, 0);
    assert.equal(result.translateY, 0);
  });

  test("pin near left edge adjusts right", () => {
    const result = computePanAdjustment(0.05, 0.5, 1000, 800, 1.0);
    assert.ok(result.translateX > 0);
    assert.equal(result.translateY, 0);
  });

  test("pin near right edge adjusts left", () => {
    const result = computePanAdjustment(0.95, 0.5, 1000, 800, 1.0);
    assert.ok(result.translateX < 0);
  });

  test("pan adjustment is clamped to PAN_CLAMP", () => {
    // Far out of bounds should still be clamped
    const result = computePanAdjustment(0.0, 0.0, 1000, 800, 3.0);
    assert.ok(result.translateX >= -PAN_CLAMP && result.translateX <= PAN_CLAMP);
    assert.ok(result.translateY >= -PAN_CLAMP && result.translateY <= PAN_CLAMP);
  });
});
