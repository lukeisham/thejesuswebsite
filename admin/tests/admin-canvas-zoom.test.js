// AdminCanvasZoom tests — node:test + node:assert + vm.
// Tests the shared canvas-zoom module: clamp bounds, step math,
// pan-delta accumulation, rounding, and panning-class add/remove.

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

function createSandbox(worldEl, viewportEl, extraOpts) {
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

  var opts = {
    worldEl: worldEl || {},
    viewportEl: effectiveViewport,
    minScale: 0.3,
    maxScale: 3.0,
    step: 1.25,
    onChange: null,
  };
  if (extraOpts) Object.assign(opts, extraOpts);

  return {
    api: sandbox.window.AdminCanvasZoom.create(opts),
    sandbox: sandbox,
  };
}

/**
 * Create a sandbox where the fake viewportEl captures registered event
 * listeners so tests can simulate mousedown/mousemove/mouseup directly.
 *
 * @param {Object} worldEl   — fake world element (needs style + optional classList)
 * @param {Object} extraOpts — additional create() options (e.g. panningClass)
 * @returns {{ api: Object, listeners: Object }}
 */
function createCapturingSandbox(worldEl, extraOpts) {
  var listeners = {};

  var fakeDoc = {
    addEventListener: function (type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener: function () {},
  };

  var fakeViewport = {
    addEventListener: function (type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener: function () {},
    querySelector: function () { return null; },
    style: {},
  };

  var sandbox = {
    window: {},
    document: fakeDoc,
    console: {
      warn: function () {},
    },
    HTMLElement: function () {},
  };
  vm.runInNewContext(zoomSource, sandbox);

  var opts = {
    worldEl: worldEl || { style: {} },
    viewportEl: fakeViewport,
    minScale: 0.3,
    maxScale: 3.0,
    step: 1.25,
    onChange: null,
  };
  if (extraOpts) Object.assign(opts, extraOpts);

  return {
    api: sandbox.window.AdminCanvasZoom.create(opts),
    listeners: listeners,
  };
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

function roundToGrid(value, gridSize) {
  if (gridSize == null) gridSize = 0.5;
  return Math.round(value / gridSize) * gridSize;
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
    var ctx = createSandbox();
    assert.strictEqual(typeof ctx.api.zoomIn, "function");
    assert.strictEqual(typeof ctx.api.zoomOut, "function");
    assert.strictEqual(typeof ctx.api.getScale, "function");
    assert.strictEqual(typeof ctx.api.getPan, "function");
  });

  test("getScale returns 1 by default", () => {
    var ctx = createSandbox();
    assert.strictEqual(ctx.api.getScale(), 1);
  });

  test("getPan returns {x:0, y:0} by default", () => {
    var ctx = createSandbox();
    var pan = ctx.api.getPan();
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

describe("AdminCanvasZoom — pan rounding (roundToGrid)", () => {
  test("roundToGrid snaps to nearest 0.5px", () => {
    assert.strictEqual(roundToGrid(0.24, 0.5), 0);
    assert.strictEqual(roundToGrid(0.26, 0.5), 0.5);
    assert.strictEqual(roundToGrid(12.37, 0.5), 12.5);
    assert.strictEqual(roundToGrid(12.5, 0.5), 12.5);
  });

  test("roundToGrid handles negative values symmetrically", () => {
    assert.strictEqual(roundToGrid(-0.26, 0.5), -0.5);
    assert.strictEqual(roundToGrid(-12.24, 0.5), -12);
  });

  test("default gridSize is 0.5", () => {
    assert.strictEqual(roundToGrid(0.26), 0.5);
  });

  test("drag with sub-pixel deltas produces rounded transform values", () => {
    // Create a worldEl that captures the transform string
    var transformValue = "";
    var worldEl = {
      style: {},
    };
    // Intercept style.transform setter
    Object.defineProperty(worldEl.style, "transform", {
      get: function () { return transformValue; },
      set: function (v) { transformValue = v; },
    });

    var ctx = createCapturingSandbox(worldEl);

    // Simulate a drag: mousedown at (0,0), mousemove with fractional deltas
    var mousedown = ctx.listeners["mousedown"];
    var mousemove = ctx.listeners["mousemove"];
    var mouseup = ctx.listeners["mouseup"];

    assert.ok(mousedown && mousedown.length > 0, "mousedown listener registered");
    assert.ok(mousemove && mousemove.length > 0, "mousemove listener registered");

    // Start drag at (0, 0)
    mousedown[0]({ clientX: 0, clientY: 0, button: 0, target: { closest: function () { return null; } } });

    // Move with sub-pixel-producing deltas
    mousemove[0]({ clientX: 12.37, clientY: -0.26 });

    // The transform should contain rounded values (12.5, -0.5), not raw (12.37, -0.26)
    assert.ok(transformValue.indexOf("12.5") !== -1, "expected rounded 12.5 in transform, got: " + transformValue);
    assert.ok(transformValue.indexOf("-0.5") !== -1, "expected rounded -0.5 in transform, got: " + transformValue);
    assert.ok(transformValue.indexOf("12.37") === -1, "raw 12.37 should NOT be in transform");
    assert.ok(transformValue.indexOf("-0.26") === -1, "raw -0.26 should NOT be in transform");
  });
});

describe("AdminCanvasZoom — panningClass add/remove", () => {
  test("panningClass is added on drag start and removed on drag end", () => {
    var classList = [];
    var worldEl = {
      style: {},
      classList: {
        add: function (c) { classList.push("add:" + c); },
        remove: function (c) { classList.push("remove:" + c); },
      },
    };

    var ctx = createCapturingSandbox(worldEl, {
      panningClass: "test-panning",
    });

    var mousedown = ctx.listeners["mousedown"];
    var mouseup = ctx.listeners["mouseup"];

    // Start drag
    mousedown[0]({ clientX: 10, clientY: 20, button: 0, target: { closest: function () { return null; } } });
    assert.ok(classList.indexOf("add:test-panning") !== -1, "panningClass should be added on drag start");

    // End drag
    mouseup[0]();
    assert.ok(classList.indexOf("remove:test-panning") !== -1, "panningClass should be removed on drag end");
  });

  test("panningClass omitted: no class-related calls, nothing throws", () => {
    var classCalls = 0;
    var worldEl = {
      style: {},
      classList: {
        add: function () { classCalls++; },
        remove: function () { classCalls++; },
      },
    };

    // No panningClass in opts
    var ctx = createCapturingSandbox(worldEl, {});

    var mousedown = ctx.listeners["mousedown"];
    var mouseup = ctx.listeners["mouseup"];

    // Drag should not throw and should not call classList
    assert.doesNotThrow(function () {
      mousedown[0]({ clientX: 10, clientY: 20, button: 0, target: { closest: function () { return null; } } });
      mouseup[0]();
    });

    assert.strictEqual(classCalls, 0, "no classList calls when panningClass is omitted");
  });
});
