// AdminTimelineNodeBounds tests — node:test + node:assert + vm.
// Tests the pure functions for clamping and converting offset values.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const boundsPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-node-bounds.js",
);
const boundsSource = fs.readFileSync(boundsPath, "utf8");

// ── Sandbox setup ──────────────────────────────────────────────────────────

function createSandbox() {
  const sandbox = {
    window: {},
  };
  vm.runInNewContext(boundsSource, sandbox);
  return sandbox.window.AdminTimelineNodeBounds;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AdminTimelineNodeBounds", () => {
  describe("clampOffsetX", () => {
    test("clamps values in range [-0.45, 0.45]", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(0), 0);
      assert.strictEqual(bounds.clampOffsetX(0.25), 0.25);
      assert.strictEqual(bounds.clampOffsetX(-0.25), -0.25);
    });

    test("clamps negative overflow to -0.45", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(-0.5), -0.45);
      assert.strictEqual(bounds.clampOffsetX(-1), -0.45);
    });

    test("clamps positive overflow to 0.45", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(0.5), 0.45);
      assert.strictEqual(bounds.clampOffsetX(1), 0.45);
    });

    test("preserves boundary values", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(-0.45), -0.45);
      assert.strictEqual(bounds.clampOffsetX(0.45), 0.45);
    });
  });

  describe("clampOffsetY", () => {
    test("clamps values in range [-0.4, 0.4]", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetY(0), 0);
      assert.strictEqual(bounds.clampOffsetY(0.2), 0.2);
      assert.strictEqual(bounds.clampOffsetY(-0.2), -0.2);
    });

    test("clamps negative overflow to -0.4", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetY(-0.5), -0.4);
      assert.strictEqual(bounds.clampOffsetY(-1), -0.4);
    });

    test("clamps positive overflow to 0.4", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetY(0.5), 0.4);
      assert.strictEqual(bounds.clampOffsetY(1), 0.4);
    });

    test("preserves boundary values", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetY(-0.4), -0.4);
      assert.strictEqual(bounds.clampOffsetY(0.4), 0.4);
    });
  });

  describe("pixelToOffsetX", () => {
    test("converts pixel delta to offset fraction given pxPerPeriod", () => {
      const bounds = createSandbox();
      // At 100 px/period, 50 pixels = 0.5 offset
      assert.strictEqual(bounds.pixelToOffsetX(50, 100), 0.5);
      // At 120 px/period, 60 pixels = 0.5 offset
      assert.strictEqual(bounds.pixelToOffsetX(60, 120), 0.5);
    });

    test("handles negative deltas", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetX(-50, 100), -0.5);
    });

    test("returns 0 for zero delta", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetX(0, 100), 0);
    });

    test("returns 0 for invalid pxPerPeriod", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetX(50, 0), 0);
      assert.strictEqual(bounds.pixelToOffsetX(50, null), 0);
    });
  });

  describe("offsetXToPixel", () => {
    test("converts offset fraction back to pixels", () => {
      const bounds = createSandbox();
      // At 100 px/period, 0.5 offset = 50 pixels
      assert.strictEqual(bounds.offsetXToPixel(0.5, 100), 50);
      // At 120 px/period, 0.5 offset = 60 pixels
      assert.strictEqual(bounds.offsetXToPixel(0.5, 120), 60);
    });

    test("handles negative offsets", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetXToPixel(-0.5, 100), -50);
    });

    test("returns 0 for zero offset", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetXToPixel(0, 100), 0);
    });

    test("returns 0 for invalid pxPerPeriod", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetXToPixel(0.5, 0), 0);
      assert.strictEqual(bounds.offsetXToPixel(0.5, null), 0);
    });
  });

  describe("pixelToOffsetY", () => {
    test("converts pixel delta to offset fraction given canvasHeight", () => {
      const bounds = createSandbox();
      // At 280px canvas, 140 pixels = 0.5 offset
      assert.strictEqual(bounds.pixelToOffsetY(140, 280), 0.5);
      // At 400px canvas, 200 pixels = 0.5 offset
      assert.strictEqual(bounds.pixelToOffsetY(200, 400), 0.5);
    });

    test("handles negative deltas", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetY(-140, 280), -0.5);
    });

    test("returns 0 for zero delta", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetY(0, 280), 0);
    });

    test("returns 0 for invalid canvasHeight", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.pixelToOffsetY(140, 0), 0);
      assert.strictEqual(bounds.pixelToOffsetY(140, null), 0);
    });
  });

  describe("offsetYToPixel", () => {
    test("converts offset fraction back to pixels", () => {
      const bounds = createSandbox();
      // At 280px canvas, 0.5 offset = 140 pixels
      assert.strictEqual(bounds.offsetYToPixel(0.5, 280), 140);
      // At 400px canvas, 0.5 offset = 200 pixels
      assert.strictEqual(bounds.offsetYToPixel(0.5, 400), 200);
    });

    test("handles negative offsets", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetYToPixel(-0.5, 280), -140);
    });

    test("returns 0 for zero offset", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetYToPixel(0, 280), 0);
    });

    test("returns 0 for invalid canvasHeight", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.offsetYToPixel(0.5, 0), 0);
      assert.strictEqual(bounds.offsetYToPixel(0.5, null), 0);
    });
  });

  describe("round-trip conversions", () => {
    test("pixel → offset → pixel round-trips for X", () => {
      const bounds = createSandbox();
      const original = 37;
      const offset = bounds.pixelToOffsetX(original, 100);
      const roundTrip = bounds.offsetXToPixel(offset, 100);
      assert.strictEqual(roundTrip, original);
    });

    test("pixel → offset → pixel round-trips for Y", () => {
      const bounds = createSandbox();
      const original = 73;
      const offset = bounds.pixelToOffsetY(original, 280);
      const roundTrip = bounds.offsetYToPixel(offset, 280);
      assert.strictEqual(roundTrip, original);
    });

    test("handles different scales consistently", () => {
      const bounds = createSandbox();
      // Test at several scales
      for (const pxPerPeriod of [80, 100, 120, 150]) {
        const offsetX = 0.3;
        const pixels = bounds.offsetXToPixel(offsetX, pxPerPeriod);
        const backToOffset = bounds.pixelToOffsetX(pixels, pxPerPeriod);
        assert.strictEqual(backToOffset, offsetX);
      }
    });
  });
});
