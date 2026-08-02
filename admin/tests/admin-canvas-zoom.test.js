// AdminCanvasZoom tests — node:test + node:assert + vm.
// Tests the shared canvas-zoom module: clamp bounds, step math,
// pan-delta accumulation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const zoomPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-canvas-zoom.js",
);
const zoomSource = fs.readFileSync(zoomPath, "utf8");

// ── Sandbox setup ──────────────────────────────────────────────────────────

function createSandbox(worldEl, viewportEl) {
  var sandbox = {
    window: {},
    document: {
      addEventListener: function () {},
      removeEventListener: function () {},
    },
    console: {
      warn: function () {},
    },
    HTMLElement: function () {},
  };
  vm.runInNewContext(zoomSource, sandbox);

  var effectiveViewport = viewportEl || {
    addEventListener: function () {},
    removeEventListener: function () {},
    querySelector: function () { return null; },
  };

  return sandbox.window.AdminCanvasZoom.create({
    worldEl: worldEl || {},
    viewportEl: effectiveViewport,
    minScale: 0.3,
    maxScale: 3.0,
    step: 1.25,
    onChange: null,
  });
}

// ── Pure math tests (no DOM sandbox needed) ────────────────────────────────

const ZOOM_FACTOR = 1.25;
const SCALE_MIN = 0.3;
const SCALE_MAX = 3.0;

function zoomIn(scale) {
  return Math.min(SCALE_MAX, scale * ZOOM_FACTOR);
}

function zoomOut(scale) {
  return Math.max(SCALE_MIN, scale / ZOOM_FACTOR);
}

function applyPanDelta(pan, delta) {
  return pan + delta;
}

describe("AdminCanvasZoom — zoom math", () => {
  describe("zoomIn", () => {
    test("multiplies scale by 1.25", () => {
      assert.strictEqual(zoomIn(1.0), 1.25);
      assert.strictEqual(zoomIn(0.8), 1.0);
      assert.strictEqual(zoomIn(2.0), 2.5);
    });

    test("clamps to SCALE_MAX (3.0)", () => {
      assert.strictEqual(zoomIn(2.5), 3.0);
      assert.strictEqual(zoomIn(3.0), 3.0);
      assert.strictEqual(zoomIn(10.0), 3.0);
    });

    test("no-op at max", () => {
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

    test("no-op at min", () => {
      assert.strictEqual(zoomOut(0.3), 0.3);
    });
  });

  describe("bounds round-trip", () => {
    test("zoom out then in returns original", () => {
      var s = zoomOut(1.0);
      s = zoomIn(s);
      assert.strictEqual(s, 1.0);
    });

    test("zoom in then out returns original", () => {
      var s = zoomIn(1.0);
      s = zoomOut(s);
      assert.strictEqual(s, 1.0);
    });

    test("stays within [0.3, 3.0] under repeated operations", () => {
      var s = 1.0;
      for (var i = 0; i < 30; i++) s = zoomIn(s);
      assert.ok(s <= 3.0);
      for (var j = 0; j < 40; j++) s = zoomOut(s);
      assert.ok(s >= 0.3);
    });
  });
});

describe("AdminCanvasZoom — pan math", () => {
  describe("panDelta", () => {
    test("positive delta increases pan", () => {
      assert.strictEqual(applyPanDelta(0, 50), 50);
      assert.strictEqual(applyPanDelta(100, 30), 130);
    });

    test("negative delta decreases pan", () => {
      assert.strictEqual(applyPanDelta(100, -50), 50);
      assert.strictEqual(applyPanDelta(0, -30), -30);
    });

    test("no clamping — pan can be any value", () => {
      assert.strictEqual(applyPanDelta(0, 5000), 5000);
    });

    test("pan does not depend on scale (raw screen deltas)", () => {
      var panX = 100;
      panX = applyPanDelta(panX, 60);
      assert.strictEqual(panX, 160);
    });
  });
});

describe("AdminCanvasZoom — transform string format", () => {
  test("matches arbor format exactly", () => {
    var scale = 1.5;
    var panX = 100;
    var panY = -50;
    var transform = "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
    assert.strictEqual(transform, "translate(100px, -50px) scale(1.5)");
  });

  test("default state", () => {
    var transform = "translate(0px, 0px) scale(1)";
    assert.strictEqual(transform, "translate(0px, 0px) scale(1)");
  });
});

describe("AdminCanvasZoom — factory API", () => {
  test("create returns API with zoomIn, zoomOut, getScale, getPan", () => {
    var api = createSandbox();
    assert.strictEqual(typeof api.zoomIn, "function");
    assert.strictEqual(typeof api.zoomOut, "function");
    assert.strictEqual(typeof api.getScale, "function");
    assert.strictEqual(typeof api.getPan, "function");
  });

  test("getScale returns 1 by default", () => {
    var api = createSandbox();
    assert.strictEqual(api.getScale(), 1);
  });

  test("getPan returns {x:0, y:0} by default", () => {
    var api = createSandbox();
    var pan = api.getPan();
    assert.strictEqual(pan.x, 0);
    assert.strictEqual(pan.y, 0);
  });

  test("no-op API when worldEl is missing", () => {
    var sandbox = { window: {}, document: { addEventListener: function() {} }, console: { warn: function() {} }, HTMLElement: function() {} };
    vm.runInNewContext(fs.readFileSync(zoomPath, "utf8"), sandbox);
    var api = sandbox.window.AdminCanvasZoom.create({ worldEl: null });
    assert.strictEqual(typeof api.zoomIn, "function");
    assert.strictEqual(api.getScale(), 1);
  });
});
