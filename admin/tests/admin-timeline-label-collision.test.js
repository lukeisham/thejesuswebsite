// Admin timeline label-collision tests — uses node:test + node:assert.
// Pins the behaviour of the admin code that measures label elements, runs the
// canonical collision resolver, and writes the result back to each label's
// style.top. The public timeline does not use this code, so the expected values
// here are the only guard against the editor drifting from what it did before.
//
// Runs against a small hand-built fake DOM (TEST-8): a label is an object with
// getBoundingClientRect(), dataset, style and offsetParent.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { loadBridge, runClassicScript } = require("./helpers/load-bridge");

// The one line that decides which implementation these tests exercise.
function loadResolve() {
  const win = loadBridge("cluster-label-collision-bridge.js");
  runClassicScript("admin-timeline/timeline-label-collision.js", win);
  return win.AdminTimelineLabelCollision.resolve;
}

// ── Fake DOM ─────────────────────────────────────────────────────────────────

/** A parent whose layout height is 280 px and whose screen scale is 1. */
const PARENT = {
  offsetHeight: 280,
  getBoundingClientRect: () => ({ height: 280 }),
};

/**
 * @param {Object} opts
 * @param {number} opts.cx - centre x on screen
 * @param {number} opts.cy - centre y on screen
 * @param {string} [opts.originalTop] - dataset.originalTop, for horizontal mode
 * @param {string} [opts.originalLeft] - dataset.originalLeft, for vertical mode
 * @param {string} [opts.tierIndex] - dataset.tierIndex
 * @returns {Object} fake label element
 */
function makeLabel({ cx, cy, originalTop, originalLeft, tierIndex }) {
  const width = 60;
  const height = 14;
  const dataset = {};
  if (originalTop !== undefined) dataset.originalTop = originalTop;
  if (originalLeft !== undefined) dataset.originalLeft = originalLeft;
  if (tierIndex !== undefined) dataset.tierIndex = tierIndex;
  return {
    dataset,
    style: {},
    offsetParent: PARENT,
    getBoundingClientRect: () => ({
      left: cx - width / 2,
      top: cy - height / 2,
      width,
      height,
    }),
  };
}

// ── Cases ────────────────────────────────────────────────────────────────────

describe("admin label collision: resolve", () => {
  test("an empty list returns quietly", () => {
    const resolve = loadResolve();
    assert.equal(resolve([], "x", 12), undefined);
    assert.equal(resolve(null, "x", 12), undefined);
  });

  test("a lone label above the spine keeps tier 0 and sits 10% above its dot", () => {
    const resolve = loadResolve();
    const label = makeLabel({ cx: 100, cy: 100, originalTop: "40%" });
    resolve([label], "x", 12);
    assert.equal(label.style.top, "30%");
    assert.equal(label.dataset.tierIndex, "0");
  });

  test("a lone label below the spine sits 10% below its dot", () => {
    const resolve = loadResolve();
    const label = makeLabel({ cx: 100, cy: 100, originalTop: "60%" });
    resolve([label], "x", 12);
    assert.equal(label.style.top, "70%");
  });

  test("a label without originalTop is treated as sitting on the spine", () => {
    const resolve = loadResolve();
    const label = makeLabel({ cx: 100, cy: 100 });
    resolve([label], "x", 12);
    assert.equal(label.style.top, "40%");
  });

  test("two overlapping labels: the second escalates to tier 1 and moves up one step", () => {
    const resolve = loadResolve();
    const first = makeLabel({ cx: 100, cy: 100, originalTop: "40%" });
    const second = makeLabel({ cx: 100, cy: 100, originalTop: "40%" });
    resolve([first, second], "x", 12);
    assert.equal(first.style.top, "30%");
    assert.equal(first.dataset.tierIndex, "0");
    assert.equal(second.style.top, "18%");
    assert.equal(second.dataset.tierIndex, "1");
  });

  test("a third overlapping label escalates to tier 2 and moves down one step", () => {
    const resolve = loadResolve();
    const labels = [0, 1, 2].map(() =>
      makeLabel({ cx: 100, cy: 100, originalTop: "40%" }),
    );
    resolve(labels, "x", 12);
    assert.deepEqual(
      labels.map((l) => l.dataset.tierIndex),
      ["0", "1", "2"],
    );
    assert.equal(labels[2].style.top, "42%");
  });

  test("labels that do not overlap stay at tier 0", () => {
    const resolve = loadResolve();
    const left = makeLabel({ cx: 100, cy: 100, originalTop: "40%" });
    const right = makeLabel({ cx: 400, cy: 100, originalTop: "40%" });
    resolve([left, right], "x", 12);
    assert.equal(left.dataset.tierIndex, "0");
    assert.equal(right.dataset.tierIndex, "0");
    assert.equal(right.style.top, "30%");
  });

  test("a label that starts at tier 2 keeps that tier and its shift", () => {
    const resolve = loadResolve();
    const label = makeLabel({
      cx: 100,
      cy: 100,
      originalTop: "40%",
      tierIndex: "2",
    });
    resolve([label], "x", 12);
    assert.equal(label.dataset.tierIndex, "2");
    assert.equal(label.style.top, "42%");
  });

  test("an unreadable originalTop leaves style.top alone but still writes the tier", () => {
    const resolve = loadResolve();
    const label = makeLabel({ cx: 100, cy: 100, originalTop: "abc" });
    resolve([label], "x", 12);
    assert.equal(label.style.top, undefined);
    assert.equal(label.dataset.tierIndex, "0");
  });

  // A 12 px step cannot clear a 60 px wide label, so the second label climbs
  // to the top tier (10) and sits 10 steps along: 50% + 10 x 12.
  test("vertical mode shifts style.left by one step per tier", () => {
    const resolve = loadResolve();
    const first = makeLabel({ cx: 100, cy: 100, originalLeft: "50%" });
    const second = makeLabel({ cx: 100, cy: 100, originalLeft: "50%" });
    resolve([first, second], "y", 12);
    assert.equal(first.style.left, "50%");
    assert.equal(second.style.left, "170%");
    assert.equal(second.dataset.tierIndex, "10");
  });
});

// Keeps the helper's classic-script path exercised once the adapter file exists.
describe("admin label collision: loader", () => {
  test("runClassicScript is exported for the adapter test", () => {
    assert.equal(typeof runClassicScript, "function");
  });
});
