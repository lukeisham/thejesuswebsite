// Admin maps tests — uses node:test + node:assert.
// Tests the pure coordinate-mapping helpers from admin-maps/maps-render.js
// (screenToPercent, percentToScreen, buildPinPayload, clampPercent).
//
// The DOM-bound drag/click logic in maps-pins.js and the region selector in
// maps-regions.js are validated manually via browser testing against a running
// API server. Only the pure, DOM-free exported functions from maps-render.js
// are exercised here (see setup/TESTS/admin_tests.md for the manual checklist).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load maps-render.js in a sandboxed context ──────────────────────────────

const renderPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-maps",
  "maps-render.js",
);
const renderSource = fs.readFileSync(renderPath, "utf8");

const sandbox = {
  window: {},
  document: {
    getElementById: function () { return null; },
  },
  console: { error: function () {} },
};

vm.runInNewContext(renderSource, sandbox);

const { screenToPercent, percentToScreen, buildPinPayload } =
  sandbox.window.AdminMapsRender;

// ── ImageRect fixture ──────────────────────────────────────────────────────
// Simulates a 1000×600 image positioned at (20, 10) within the canvas.

/**
 * @returns {{width: number, height: number, left: number, top: number}}
 */
function makeRect(width, height, left, top) {
  return { width: width, height: height, left: left, top: top };
}

const FIXTURE_RECT = makeRect(1000, 600, 20, 10);

// ── screenToPercent ────────────────────────────────────────────────────────

describe("screenToPercent", function () {
  test("converts centre of image to 50%", function () {
    var result = screenToPercent(520, 310, FIXTURE_RECT);
    assert.ok(Math.abs(result.x - 50) < 0.01, "x should be ~50");
    assert.ok(Math.abs(result.y - 50) < 0.01, "y should be ~50");
  });

  test("converts top-left corner to 0%", function () {
    var result = screenToPercent(20, 10, FIXTURE_RECT);
    assert.ok(Math.abs(result.x) < 0.01, "x should be ~0");
    assert.ok(Math.abs(result.y) < 0.01, "y should be ~0");
  });

  test("converts bottom-right corner to 100%", function () {
    var result = screenToPercent(1020, 610, FIXTURE_RECT);
    assert.ok(Math.abs(result.x - 100) < 0.01, "x should be ~100");
    assert.ok(Math.abs(result.y - 100) < 0.01, "y should be ~100");
  });

  test("clamps values outside the image to 0–100", function () {
    var result = screenToPercent(-100, -100, FIXTURE_RECT);
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);

    result = screenToPercent(2000, 2000, FIXTURE_RECT);
    assert.equal(result.x, 100);
    assert.equal(result.y, 100);
  });

  test("returns 0,0 for a zero-size rect", function () {
    var result = screenToPercent(50, 50, { width: 0, height: 0, left: 0, top: 0 });
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });

  test("returns 0,0 for a null rect", function () {
    var result = screenToPercent(50, 50, null);
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });
});

// ── percentToScreen ────────────────────────────────────────────────────────

describe("percentToScreen", function () {
  test("converts 50% centre to screen coordinates", function () {
    var result = percentToScreen(50, 50, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 520) < 0.01);
    assert.ok(Math.abs(result.screenY - 310) < 0.01);
  });

  test("converts 0% to top-left", function () {
    var result = percentToScreen(0, 0, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 20) < 0.01);
    assert.ok(Math.abs(result.screenY - 10) < 0.01);
  });

  test("converts 100% to bottom-right", function () {
    var result = percentToScreen(100, 100, FIXTURE_RECT);
    assert.ok(Math.abs(result.screenX - 1020) < 0.01);
    assert.ok(Math.abs(result.screenY - 610) < 0.01);
  });

  test("returns 0,0 for a zero-size rect", function () {
    var result = percentToScreen(50, 50, { width: 0, height: 0, left: 5, top: 5 });
    assert.equal(result.screenX, 0);
    assert.equal(result.screenY, 0);
  });

  test("returns 0,0 for a null rect", function () {
    var result = percentToScreen(50, 50, null);
    assert.equal(result.screenX, 0);
    assert.equal(result.screenY, 0);
  });
});

// ── round-trip stability ───────────────────────────────────────────────────

describe("screenToPercent ↔ percentToScreen round-trip", function () {
  test("round-trips centre point", function () {
    var pct = screenToPercent(520, 310, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 520) < 0.01);
    assert.ok(Math.abs(screen.screenY - 310) < 0.01);
  });

  test("round-trips top-left", function () {
    var pct = screenToPercent(20, 10, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 20) < 0.01);
    assert.ok(Math.abs(screen.screenY - 10) < 0.01);
  });

  test("round-trips arbitrary point", function () {
    var pct = screenToPercent(345, 222, FIXTURE_RECT);
    var screen = percentToScreen(pct.x, pct.y, FIXTURE_RECT);
    assert.ok(Math.abs(screen.screenX - 345) < 0.2);
    assert.ok(Math.abs(screen.screenY - 222) < 0.2);
  });

  test("round-trips percentages back to percentages", function () {
    var screen = percentToScreen(37.5, 82.3, FIXTURE_RECT);
    var pct = screenToPercent(screen.screenX, screen.screenY, FIXTURE_RECT);
    assert.ok(Math.abs(pct.x - 37.5) < 0.1);
    assert.ok(Math.abs(pct.y - 82.3) < 0.1);
  });
});

// ── buildPinPayload ────────────────────────────────────────────────────────

describe("buildPinPayload", function () {
  test("rounds coordinates to 2 decimal places", function () {
    var payload = buildPinPayload(1, 123, 456, FIXTURE_RECT);

    assert.equal(payload.map_id, 1);
    // x: (123 - 20) / 1000 * 100 = 10.3
    assert.equal(payload.x, 10.3);
    // y: (456 - 10) / 600 * 100 = 74.33...
    assert.ok(Math.abs(payload.y - 74.33) < 0.01);
  });

  test("label and evidence_id default to null", function () {
    var payload = buildPinPayload(1, 100, 100, FIXTURE_RECT);
    assert.equal(payload.label, null);
    assert.equal(payload.evidence_id, null);
  });

  test("map_id is passed through", function () {
    var payload = buildPinPayload(42, 100, 100, FIXTURE_RECT);
    assert.equal(payload.map_id, 42);
  });
});

// ── Bounding rect edge cases ────────────────────────────────────────────────

describe("coordinate helpers with edge-case rects", function () {
  test("handles image rect with non-zero offset", function () {
    // Image offset 100px from left, 50px from top
    var rect = makeRect(800, 400, 100, 50);

    var pct = screenToPercent(500, 250, rect);
    // x: (500 - 100) / 800 * 100 = 50
    // y: (250 - 50) / 400 * 100 = 50
    assert.ok(Math.abs(pct.x - 50) < 0.01);
    assert.ok(Math.abs(pct.y - 50) < 0.01);

    var screen = percentToScreen(50, 50, rect);
    assert.ok(Math.abs(screen.screenX - 500) < 0.01);
    assert.ok(Math.abs(screen.screenY - 250) < 0.01);
  });

  test("handles very small image", function () {
    var rect = makeRect(10, 10, 5, 5);

    var pct = screenToPercent(10, 10, rect);
    assert.ok(Math.abs(pct.x - 50) < 0.01);
    assert.ok(Math.abs(pct.y - 50) < 0.01);

    var screen = percentToScreen(100, 100, rect);
    assert.ok(Math.abs(screen.screenX - 15) < 0.01);
    assert.ok(Math.abs(screen.screenY - 15) < 0.01);
  });
});
