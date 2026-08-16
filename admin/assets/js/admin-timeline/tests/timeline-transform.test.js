// Admin timeline-transform tests — node:test + node:assert + vm.
// Tests the admin transform math module: era bounds, pan computation,
// and pan clamping.  Mirrors the frontend timeline-transform.test.js
// but runs against the admin implementation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const geomPath = path.resolve(
  __dirname,
  "..",
  "timeline-geometry.js",
);
const transformPath = path.resolve(
  __dirname,
  "..",
  "timeline-transform.js",
);

const geomSource = fs.readFileSync(geomPath, "utf8");
const transformSource = fs.readFileSync(transformPath, "utf8");

// ── Sandbox setup ──────────────────────────────────────────────────────────

function createSandbox() {
  var sandbox = {
    window: {},
    document: {},
    console: {
      warn: function () {},
    },
  };

  // Load geometry module first (populates window.AdminTimelineGeometry)
  vm.runInNewContext(geomSource, sandbox);

  // Load transform module (depends on window.AdminTimelineGeometry)
  vm.runInNewContext(transformSource, sandbox);

  return {
    Transform: sandbox.window.AdminTimelineTransform,
    Geom: sandbox.window.AdminTimelineGeometry,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AdminTimelineTransform — module loads", () => {
  test("module loads without throwing", () => {
    var ctx = createSandbox();
    assert.ok(ctx.Transform !== undefined);
    assert.strictEqual(typeof ctx.Transform.getEraWorldBounds, "function");
    assert.strictEqual(typeof ctx.Transform.computePanForEra, "function");
    assert.strictEqual(typeof ctx.Transform.clampPan, "function");
  });
});

describe("AdminTimelineTransform — getEraWorldBounds", () => {
  test("returns bounds for a known era", () => {
    var ctx = createSandbox();
    var bounds = ctx.Transform.getEraWorldBounds("Life");
    assert.ok(bounds !== null);
    // Life spans periods 6-8: periodX(6)=650, minX=600; periodX(8)=850, maxX=900
    assert.strictEqual(bounds.minX, 600);
    assert.strictEqual(bounds.maxX, 900);
  });

  test("bounds for PassionWeek cover 16 periods (18-33)", () => {
    var ctx = createSandbox();
    var bounds = ctx.Transform.getEraWorldBounds("PassionWeek");
    assert.ok(bounds !== null);
    assert.strictEqual(bounds.minX, 1800);
    assert.strictEqual(bounds.maxX, 3400);
  });

  test("returns null for an unrecognised era key", () => {
    var ctx = createSandbox();
    assert.strictEqual(ctx.Transform.getEraWorldBounds("InvalidEra"), null);
    assert.strictEqual(ctx.Transform.getEraWorldBounds(""), null);
  });

  test('"all" / "All" sentinel returns full-timeline bounds', () => {
    var ctx = createSandbox();
    var allBounds = ctx.Transform.getEraWorldBounds("all");
    assert.ok(allBounds !== null);
    assert.strictEqual(allBounds.minX, 0);
    assert.strictEqual(allBounds.maxX, 3800);

    var AllBounds = ctx.Transform.getEraWorldBounds("All");
    assert.deepStrictEqual(AllBounds, allBounds);
  });
});

describe("AdminTimelineTransform — computePanForEra", () => {
  test("centres Life era at scale 1.0 in a 1280px viewport", () => {
    var ctx = createSandbox();
    var pan = ctx.Transform.computePanForEra("Life", 1280, 1.0);
    assert.ok(pan !== null);
    // Life centre = (600+900)/2 = 750; panX = 640 - 750 = -110
    assert.strictEqual(pan.panX, -110);
    assert.strictEqual(pan.panY, 0);
  });

  test("centres Life era at scale 2.0 in a 1280px viewport", () => {
    var ctx = createSandbox();
    var pan = ctx.Transform.computePanForEra("Life", 1280, 2.0);
    assert.ok(pan !== null);
    assert.strictEqual(pan.panX, -860);
  });

  test('returns valid pan for "all" era (reset to default)', () => {
    var ctx = createSandbox();
    var pan = ctx.Transform.computePanForEra("all", 1280, 1.0);
    assert.ok(pan !== null);
    // Full timeline centre = 1900; panX = 640 - 1900 = -1260
    assert.strictEqual(pan.panX, -1260);
  });

  test("defaults scale to 1.0 when omitted", () => {
    var ctx = createSandbox();
    var withScale = ctx.Transform.computePanForEra("Life", 1280, 1.0);
    var withoutScale = ctx.Transform.computePanForEra("Life", 1280);
    assert.deepStrictEqual(withScale, withoutScale);
  });

  test("returns null for an unrecognised era key", () => {
    var ctx = createSandbox();
    assert.strictEqual(ctx.Transform.computePanForEra("InvalidEra", 1280, 1.0), null);
  });
});

describe("AdminTimelineTransform — clampPan", () => {
  test("passes through a safe pan value", () => {
    var ctx = createSandbox();
    var clamped = ctx.Transform.clampPan(-500, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, -500);
    assert.strictEqual(clamped.panY, 0);
  });

  test("clamps panX away from left edge when too far left", () => {
    var ctx = createSandbox();
    // minPanX = -3800 * 0.9 = -3420
    var clamped = ctx.Transform.clampPan(-5000, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, -3420);
  });

  test("clamps panX away from right edge when too far right", () => {
    var ctx = createSandbox();
    // maxPanX = 3800 * 0.1 = 380
    var clamped = ctx.Transform.clampPan(2000, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, 380);
  });

  test("scale affects the clamp bounds", () => {
    var ctx = createSandbox();
    // At scale 2.0, scaledWorld = 7600, minPanX = -6840
    var clamped = ctx.Transform.clampPan(-7000, 0, 2.0, 3800);
    assert.strictEqual(clamped.panX, -6840);
  });
});
