// AdminTimelineNodeBounds tests — node:test + node:assert + vm.
// Tests the pure functions for clamping offset values. The clamp limits come
// from the real offsets module (loadCanonical), so a test here also fails when
// the editor stops using the canonical limits.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadBridge, loadCanonical } = require("./helpers/load-bridge");

const boundsPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-node-bounds.js",
);
const boundsSource = fs.readFileSync(boundsPath, "utf8");

// The bridge publishes the functions the script calls; the limit constants
// live only in the canonical module (the bridge does not publish them).
const canonicalOffsets = loadCanonical(
  "/assets/js/cluster-logic/timeline-offsets.js",
);

// ── Sandbox setup ──────────────────────────────────────────────────────────

function createSandbox() {
  const sandbox = {
    window: loadBridge("timeline-bridge.js"),
  };
  vm.runInNewContext(boundsSource, sandbox);
  return sandbox.window.AdminTimelineNodeBounds;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AdminTimelineNodeBounds", () => {
  describe("canonical limits", () => {
    test("the clamps stop at the limits that the offsets module defines", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(10), canonicalOffsets.DRAG_LIMIT_X);
      assert.strictEqual(bounds.clampOffsetX(-10), -canonicalOffsets.DRAG_LIMIT_X);
      assert.strictEqual(bounds.clampOffsetY(10), canonicalOffsets.OFFSET_LIMIT_Y);
      assert.strictEqual(bounds.clampOffsetY(-10), -canonicalOffsets.OFFSET_LIMIT_Y);
    });
  });

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

    test("a dot saved past the drag limit keeps its start as the limit", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(0.5, 0.5), 0.5);
      assert.strictEqual(bounds.clampOffsetX(0.6, 0.5), 0.5);
      assert.strictEqual(bounds.clampOffsetX(-0.5, -0.5), -0.5);
    });

    test("a dot saved past the drag limit can still move inwards", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(0.3, 0.5), 0.3);
    });

    test("never exceeds the limit that the API stores", () => {
      const bounds = createSandbox();
      assert.strictEqual(bounds.clampOffsetX(2, 2), 0.5);
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
});
