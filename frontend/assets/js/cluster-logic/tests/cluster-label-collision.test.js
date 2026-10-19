// Cluster label collision tests — node:test + node:assert.
// Imports the real module. The collision resolver serves the vertical (mobile)
// timeline labels and the mobile era headings. Checks: labels that do not
// overlap stay at tier 0, overlapping labels fan out, the tier stops at
// MAX_TIER, and a label that starts at a higher tier is tested where it is drawn.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

let collision;

before(async () => {
  collision = await import(
    pathToFileURL(path.resolve(__dirname, "..", "cluster-label-collision.js")).href
  );
});

/** Centre-based descriptor in the shape the resolver takes. */
function label(x, y, over = {}) {
  return { x, y, width: 80, height: 16, tierIndex: 0, axis: "x", primaryStep: 12, ...over };
}

/** True when two resolved labels are closer than the gap that the module keeps. */
function tooClose(a, b) {
  const gap = collision.LABEL_GAP_PX;
  return (
    a.x + a.width / 2 + gap > b.x - b.width / 2 &&
    b.x + b.width / 2 + gap > a.x - a.width / 2 &&
    a.y + a.height / 2 + gap > b.y - b.height / 2 &&
    b.y + b.height / 2 + gap > a.y - a.height / 2
  );
}

describe("resolveLabelCollisions: tier escalation", () => {
  test("an empty list returns an empty list", () => {
    assert.deepEqual(collision.resolveLabelCollisions([]), []);
    assert.deepEqual(collision.resolveLabelCollisions(null), []);
  });

  test("labels that do not overlap stay at tier 0", () => {
    const resolved = collision.resolveLabelCollisions([label(100, 80), label(300, 80)]);
    assert.deepEqual(resolved.map((r) => r.tierIndex), [0, 0]);
  });

  test("an overlapping label escalates to a higher tier", () => {
    const resolved = collision.resolveLabelCollisions([label(100, 80), label(120, 80)]);
    assert.equal(resolved[0].tierIndex, 0);
    assert.ok(resolved[1].tierIndex > 0);
  });

  test("three labels on one spot fan out until none overlaps", () => {
    const resolved = collision.resolveLabelCollisions([
      label(100, 80, { width: 100 }),
      label(100, 80, { width: 100 }),
      label(100, 80, { width: 100 }),
    ]);
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        assert.equal(tooClose(resolved[i], resolved[j]), false, `labels ${i} and ${j} overlap`);
      }
    }
  });

  test("the tier never exceeds MAX_TIER", () => {
    const crowd = Array.from({ length: 15 }, () => label(100, 80));
    for (const r of collision.resolveLabelCollisions(crowd)) {
      assert.ok(r.tierIndex <= collision.MAX_TIER);
    }
  });

  test("on the y axis the labels move along x and keep their y", () => {
    const resolved = collision.resolveLabelCollisions([
      label(50, 100, { width: 60, axis: "y", primaryStep: 40 }),
      label(50, 100, { width: 60, axis: "y", primaryStep: 40 }),
    ]);
    assert.deepEqual(resolved.map((r) => r.y), [100, 100]);
    assert.equal(resolved[0].x, 50);
    assert.notEqual(resolved[1].x, 50);
  });

  test("the caller's descriptors are not changed", () => {
    const input = [label(100, 80), label(120, 80)];
    collision.resolveLabelCollisions(input);
    assert.deepEqual(input.map((d) => d.tierIndex), [0, 0]);
  });
});

describe("tierShift", () => {
  test("tier 0 gives no shift", () => {
    assert.equal(collision.tierShift(0, 12), 0);
  });

  test("odd tiers move negative and even tiers move positive", () => {
    assert.equal(collision.tierShift(1, 12), -12);
    assert.equal(collision.tierShift(2, 12), 12);
    assert.equal(collision.tierShift(3, 12), -24);
    assert.equal(collision.tierShift(4, 12), 24);
  });

  test("the shift stays small at the maximum tier", () => {
    assert.ok(Math.abs(collision.tierShift(collision.MAX_TIER, 12)) <= 12 * collision.MAX_TIER);
  });
});

describe("resolveLabelCollisions: labels that start at a higher tier", () => {
  test("a label drawn at tier 1 is tested at its shifted position", () => {
    const resolved = collision.resolveLabelCollisions([
      label(100, 80),
      label(100, 80 + 12, { tierIndex: 1 }),
    ]);
    const second = resolved.find((r) => r.tierIndex >= 1);
    assert.ok(second, "the tier-1 label keeps at least tier 1");
  });

  test("a label at a higher tier that overlaps nothing keeps its tier", () => {
    const resolved = collision.resolveLabelCollisions([label(100, 80, { tierIndex: 2 })]);
    assert.equal(resolved[0].tierIndex, 2);
  });
});
