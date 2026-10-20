// Timeline transform tests — node:test + node:assert.
// Imports the real timeline-transform.js. The expected numbers are written out
// by hand from the period layout (100 px per period, 38 periods), so a change to
// the layout or the era spans fails here.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-transform.js");

let getEraWorldBounds;
let computePanForEra;
let clampPan;

before(async () => {
  ({ getEraWorldBounds, computePanForEra, clampPan } = await import(pathToFileURL(MODULE).href));
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TimelineTransform — getEraWorldBounds", () => {
  test("returns bounds for a known era", () => {
    const bounds = getEraWorldBounds("Life");
    assert.ok(bounds !== null);
    assert.ok(typeof bounds.minX === "number");
    assert.ok(typeof bounds.maxX === "number");
    // Life spans periods 6-8: first period centre = 6*100+50 = 650
    assert.strictEqual(bounds.minX, 650 - 50); // 600
    // Life ends at period 8: centre = 8*100+50 = 850
    assert.strictEqual(bounds.maxX, 850 + 50); // 900
  });

  test("bounds for PassionWeek cover 16 periods (18-33)", () => {
    const bounds = getEraWorldBounds("PassionWeek");
    assert.ok(bounds !== null);
    // start=18: periodX(18)=1850, minX=1800
    assert.strictEqual(bounds.minX, 1800);
    // end=33: periodX(33)=3350, maxX=3400
    assert.strictEqual(bounds.maxX, 3400);
  });

  test("returns null for an unrecognised era key", () => {
    assert.strictEqual(getEraWorldBounds("InvalidEra"), null);
    assert.strictEqual(getEraWorldBounds(""), null);
  });

  test('"all" / "All" sentinel returns full-timeline bounds', () => {
    const allBounds = getEraWorldBounds("all");
    assert.ok(allBounds !== null);
    assert.strictEqual(allBounds.minX, 0);
    // Last period index: 37, periodX(37)=3750, maxX=3750+50=3800
    assert.strictEqual(allBounds.maxX, 3800);

    // "All" (capital A) returns the same
    const AllBounds = getEraWorldBounds("All");
    assert.deepStrictEqual(AllBounds, allBounds);
  });
});

describe("TimelineTransform — computePanForEra", () => {
  test("centres Life era at scale 1.0 in a 1280px viewport", () => {
    const pan = computePanForEra("Life", 1280, 1.0);
    assert.ok(pan !== null);
    // Life centre = (600 + 900)/2 = 750
    // panX = 1280/2 - 750*1.0 = 640 - 750 = -110
    assert.strictEqual(pan.panX, -110);
    assert.strictEqual(pan.panY, 0);
  });

  test("centres Life era at scale 2.0 in a 1280px viewport", () => {
    const pan = computePanForEra("Life", 1280, 2.0);
    assert.ok(pan !== null);
    // panX = 640 - 750*2.0 = 640 - 1500 = -860
    assert.strictEqual(pan.panX, -860);
  });

  test('returns valid pan for "all" era (reset to default)', () => {
    const pan = computePanForEra("all", 1280, 1.0);
    assert.ok(pan !== null);
    // Full timeline centre = 3800/2 = 1900
    // panX = 640 - 1900*1.0 = -1260
    assert.strictEqual(pan.panX, -1260);
  });

  test("defaults scale to 1.0 when omitted", () => {
    const withScale = computePanForEra("Life", 1280, 1.0);
    const withoutScale = computePanForEra("Life", 1280);
    assert.deepStrictEqual(withScale, withoutScale);
  });

  test("returns null for an unrecognised era key", () => {
    assert.strictEqual(computePanForEra("InvalidEra", 1280, 1.0), null);
  });

  test("Post-Passion era at scale 0.5 centres correctly", () => {
    // Post-Passion: start=34, end=37 (4 periods)
    // periodX(34)=3450, minX=3400; periodX(37)=3750, maxX=3800
    // centre = 3600
    const pan = computePanForEra("Post-Passion", 1280, 0.5);
    assert.ok(pan !== null);
    assert.strictEqual(pan.panX, 640 - 3600 * 0.5); // 640 - 1800 = -1160
    assert.strictEqual(pan.panX, -1160);
  });
});

describe("TimelineTransform — clampPan", () => {
  test("passes through a safe pan value", () => {
    const clamped = clampPan(-500, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, -500);
    assert.strictEqual(clamped.panY, 0);
  });

  test("clamps panX away from left edge when too far left", () => {
    // worldWidth=3800, scale=1.0, scaledWorld=3800
    // minPanX = -3800 * 0.9 = -3420
    const clamped = clampPan(-5000, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, -3420);
  });

  test("clamps panX away from right edge when too far right", () => {
    // maxPanX = 3800 * 0.1 = 380
    const clamped = clampPan(2000, 0, 1.0, 3800);
    assert.strictEqual(clamped.panX, 380);
  });

  test("scale affects the clamp bounds", () => {
    // At scale 2.0, scaledWorld = 7600
    // minPanX = -7600 * 0.9 = -6840
    const clamped = clampPan(-7000, 0, 2.0, 3800);
    assert.strictEqual(clamped.panX, -6840);
  });
});
