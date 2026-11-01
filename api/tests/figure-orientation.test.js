// Figure orientation resolver tests — verifies resolveOrientation() classes
// landscape/portrait/square images correctly, and degrades safely on
// invalid dimensions.
// Uses node:test + node:assert.
//
// The real resolveOrientation lives in a frontend ES module and is loaded
// via dynamic import() so tests always run against the live implementation.
// A hand-copied replica would keep passing after the real module changes.

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

// classify() only touches closest(), classList, hasAttribute, setAttribute and
// the natural size, so a hand-built element is enough (TEST-8).
function fakeImage({ natural, attrs }) {
  const classes = new Set();
  const figure = {
    classList: {
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      add: (name) => classes.add(name),
    },
  };
  const attributes = { ...attrs };
  return {
    classes,
    attributes,
    naturalWidth: natural[0],
    naturalHeight: natural[1],
    closest: () => figure,
    hasAttribute: (name) => name in attributes,
    setAttribute: (name, value) => {
      attributes[name] = String(value);
    },
  };
}

describe("classify", () => {
  test("a picture with a stored size keeps its width and height", async () => {
    const { classify } = await import("../../frontend/assets/js/utils/figure-orientation.js");
    const img = fakeImage({
      natural: [380, 207],
      attrs: { width: "1440", height: "785", "data-stored-size": "" },
    });
    classify(img);
    assert.equal(img.attributes.width, "1440");
    assert.equal(img.attributes.height, "785");
    assert.ok(img.classes.has("figure--landscape"));
  });

  test("a picture with a guessed size gets the natural size", async () => {
    const { classify } = await import("../../frontend/assets/js/utils/figure-orientation.js");
    const img = fakeImage({ natural: [600, 900], attrs: { width: "720", height: "480" } });
    classify(img);
    assert.equal(img.attributes.width, "600");
    assert.equal(img.attributes.height, "900");
    assert.ok(img.classes.has("figure--portrait"));
  });
});

