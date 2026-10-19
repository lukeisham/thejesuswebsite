// Timeline offset maths tests — node:test + node:assert.
// The expected numbers are the mapping that the public timeline used before the
// maths moved into one module, so a stored node must not move.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-offsets.js");

let offsets;

before(async () => {
  // Node detects the ES module syntax, so the real module and its geometry
  // import load as they are.
  offsets = await import(pathToFileURL(MODULE).href);
});

describe("timeline offsets: pixel conversion", () => {
  test("x offset moves 100 px per slot", () => {
    assert.equal(offsets.offsetXToPixels(0.1), 10);
    assert.equal(offsets.offsetXToPixels(-0.25), -25);
  });

  test("y offset scales by the 280 px canvas height", () => {
    assert.equal(offsets.offsetYToPixels(0.1), 28);
    assert.equal(offsets.offsetYToPixels(-0.5), -140);
  });

  test("pixels convert back to the same offset", () => {
    for (const f of [-0.4, -0.123, 0, 0.0059, 0.44]) {
      assert.ok(Math.abs(offsets.pixelsToOffsetX(offsets.offsetXToPixels(f)) - f) < 1e-12);
      assert.ok(Math.abs(offsets.pixelsToOffsetY(offsets.offsetYToPixels(f)) - f) < 1e-12);
    }
  });

  test("the spine is at 50% and the stored mapping adds half the pixels", () => {
    assert.equal(offsets.crossAxisToTopPercent(0), 50);
    assert.equal(offsets.crossAxisToTopPercent(offsets.offsetYToPixels(0.1)), 64);
    assert.equal(offsets.crossAxisToTopPercent(-20), 40);
  });
});

describe("timeline offsets: pointer distance", () => {
  test("a pointer distance in the dot field moves the dot by the same distance", () => {
    // The dot's on-screen top is crossAxisToTopPercent(c) percent of the 280 px field.
    const fieldHeight = 280;
    for (const boxPixels of [-60, -7, 0, 25, 100]) {
      const c = offsets.boxPixelsToCrossAxisPixels(boxPixels);
      const movedPixels =
        ((offsets.crossAxisToTopPercent(c) - offsets.crossAxisToTopPercent(0)) / 100) *
        fieldHeight;
      assert.ok(Math.abs(movedPixels - boxPixels) < 1e-9);
    }
  });
});

describe("timeline offsets: clamps", () => {
  test("limits match the API limits and the drag margin", () => {
    assert.equal(offsets.OFFSET_LIMIT_X, 0.5);
    assert.equal(offsets.OFFSET_LIMIT_Y, 0.4);
    assert.equal(offsets.DRAG_LIMIT_X, 0.45);
  });

  test("a drag stops at 0.45 on x", () => {
    assert.equal(offsets.clampDragOffsetX(0.49), 0.45);
    assert.equal(offsets.clampDragOffsetX(-0.7), -0.45);
    assert.equal(offsets.clampDragOffsetX(0.2), 0.2);
  });

  test("a start of 0.5 stays at 0.5 going outwards", () => {
    assert.equal(offsets.clampDragOffsetX(0.5, 0.5), 0.5);
    assert.equal(offsets.clampDragOffsetX(0.9, 0.5), 0.5);
    assert.equal(offsets.clampDragOffsetX(-0.5, -0.5), -0.5);
  });

  test("a start of 0.5 can move inwards to 0.3", () => {
    assert.equal(offsets.clampDragOffsetX(0.3, 0.5), 0.3);
  });

  test("a start of 0 stops at 0.45", () => {
    assert.equal(offsets.clampDragOffsetX(0.49, 0), 0.45);
    assert.equal(offsets.clampDragOffsetX(-0.49, 0), -0.45);
  });

  test("no result passes the 0.5 limit the API stores", () => {
    assert.equal(offsets.clampDragOffsetX(2, 2), 0.5);
    assert.equal(offsets.clampDragOffsetX(-2, -2), -0.5);
  });

  test("y stops at 0.4", () => {
    assert.equal(offsets.clampOffsetY(0.9), 0.4);
    assert.equal(offsets.clampOffsetY(-0.9), -0.4);
    assert.equal(offsets.clampOffsetY(-0.1), -0.1);
  });
});
