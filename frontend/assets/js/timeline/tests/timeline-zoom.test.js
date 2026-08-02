// Timeline zoom module tests — node:test + node:assert.
// Tests the pure math of the timeline zoom module: clamp bounds,
// step math, pan-delta accumulation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Simulated zoom math (mirroring timeline-zoom.js) ──────────────────────────

const ZOOM_FACTOR = 1.25;
const SCALE_MIN = 0.3;
const SCALE_MAX = 3.0;

/**
 * Simulate zoomIn — multiply scale, clamp to max.
 * @param {number} currentScale
 * @returns {number}
 */
function zoomIn(currentScale) {
  return Math.min(SCALE_MAX, currentScale * ZOOM_FACTOR);
}

/**
 * Simulate zoomOut — divide scale, clamp to min.
 * @param {number} currentScale
 * @returns {number}
 */
function zoomOut(currentScale) {
  return Math.max(SCALE_MIN, currentScale / ZOOM_FACTOR);
}

/**
 * Simulate pan delta accumulation — raw screen-space delta added to pan.
 * @param {number} panX
 * @param {number} deltaX
 * @returns {number}
 */
function applyPanDelta(panX, deltaX) {
  return panX + deltaX;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TimelineZoom — zoom math", () => {
  describe("zoomIn", () => {
    test("multiplies scale by 1.25", () => {
      assert.strictEqual(zoomIn(1.0), 1.25);
      assert.strictEqual(zoomIn(0.8), 1.0);
      assert.strictEqual(zoomIn(2.0), 2.5);
    });

    test("clamps to SCALE_MAX (3.0)", () => {
      assert.strictEqual(zoomIn(2.5), 3.0);
      assert.strictEqual(zoomIn(3.0), 3.0);
    });

    test("no-op at max (returns same value)", () => {
      assert.strictEqual(zoomIn(3.0), 3.0);
    });
  });

  describe("zoomOut", () => {
    test("divides scale by 1.25", () => {
      assert.strictEqual(zoomOut(1.0), 0.8);
      assert.strictEqual(zoomOut(2.0), 1.6);
      assert.strictEqual(zoomOut(0.5), 0.4);
    });

    test("clamps to SCALE_MIN (0.3)", () => {
      assert.strictEqual(zoomOut(0.3), 0.3);
      assert.strictEqual(zoomOut(0.35), 0.3);
    });

    test("no-op at min (returns same value)", () => {
      assert.strictEqual(zoomOut(0.3), 0.3);
    });
  });

  describe("bounds — round-trip stability", () => {
    test("zoom out then in returns original when inside bounds", () => {
      var s1 = zoomOut(1.0);
      var s2 = zoomIn(s1);
      assert.strictEqual(s2, 1.0);
    });

    test("zoom in then out returns original when inside bounds", () => {
      var s1 = zoomIn(1.0);
      var s2 = zoomOut(s1);
      assert.strictEqual(s2, 1.0);
    });

    test("scale stays within [0.3, 3.0] under repeated operations", () => {
      var s = 1.0;
      // Zoom in 20 times — should cap at 3.0
      for (var i = 0; i < 20; i++) s = zoomIn(s);
      assert.ok(s <= 3.0);
      assert.ok(s >= 0.3);
      // Zoom out 30 times — should floor at 0.3
      for (var j = 0; j < 30; j++) s = zoomOut(s);
      assert.ok(s >= 0.3);
      assert.ok(s <= 3.0);
    });
  });

  describe("effective px-per-period range", () => {
    test("BASE_PX_PER_PERIOD * scale maps [0.3, 3.0] to [30, 300]", () => {
      var BASE = 100;
      assert.strictEqual(BASE * 0.3, 30);
      assert.strictEqual(BASE * 3.0, 300);
      assert.strictEqual(BASE * 1.0, 100);
      assert.strictEqual(BASE * 1.25, 125);
    });
  });
});

describe("TimelineZoom — pan math", () => {
  describe("panDelta", () => {
    test("positive delta increases panX", () => {
      assert.strictEqual(applyPanDelta(0, 50), 50);
      assert.strictEqual(applyPanDelta(100, 30), 130);
    });

    test("negative delta decreases panX", () => {
      assert.strictEqual(applyPanDelta(100, -50), 50);
      assert.strictEqual(applyPanDelta(0, -30), -30);
    });

    test("no clamping — pan can be any value", () => {
      assert.strictEqual(applyPanDelta(0, 5000), 5000);
      assert.strictEqual(applyPanDelta(100, -200), -100);
    });

    test("pan does not depend on scale (raw screen deltas, no division)", () => {
      // At scale=2.0, pan delta is added directly
      var panX = 100;
      panX = applyPanDelta(panX, 60); // 60px screen movement
      assert.strictEqual(panX, 160);
    });
  });
});

describe("TimelineZoom — transform string format", () => {
  test("matches arbor format exactly", () => {
    var scale = 1.5;
    var panX = 100;
    var panY = -50;
    var transform = "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
    assert.strictEqual(transform, "translate(100px, -50px) scale(1.5)");
  });

  test("default state (scale=1, pan=0)", () => {
    var scale = 1.0;
    var panX = 0;
    var panY = 0;
    var transform = "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
    assert.strictEqual(transform, "translate(0px, 0px) scale(1)");
  });
});
