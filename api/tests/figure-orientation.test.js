// Figure orientation resolver tests — verifies resolveOrientation() classes
// landscape/portrait/square images correctly, and degrades safely on
// invalid dimensions.
// Uses node:test + node:assert.
//
// The real resolveOrientation lives in a frontend ES module and is loaded
// via dynamic import() so tests always run against the live implementation
// (Issues.md #110 — a hand-copied "synced copy" in the test file would keep
// passing after the real implementation changes or is deleted).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

describe("resolveOrientation", () => {
  test("wider than tall is landscape", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(1600, 1200), "landscape");
  });

  test("taller than wide is portrait", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(600, 900), "portrait");
  });

  test("equal width and height is square", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(500, 500), "square");
  });

  test("zero dimensions do not throw and degrade to portrait", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(0, 0), "portrait");
    assert.equal(resolveOrientation(0, 500), "portrait");
    assert.equal(resolveOrientation(500, 0), "portrait");
  });

  test("NaN dimensions do not throw and degrade to portrait", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(NaN, 500), "portrait");
    assert.equal(resolveOrientation(500, NaN), "portrait");
    assert.equal(resolveOrientation(NaN, NaN), "portrait");
  });

  test("negative dimensions do not throw and degrade to portrait", async () => {
    const { resolveOrientation } = await import(
      "../../frontend/assets/js/utils/figure-orientation.js"
    );
    assert.equal(resolveOrientation(-100, 200), "portrait");
  });
});
