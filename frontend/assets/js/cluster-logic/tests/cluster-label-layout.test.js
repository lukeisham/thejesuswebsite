// Cluster label layout tests — node:test + node:assert.
// Imports the real module. Checks the properties that matter on screen: a label
// starts beside its dot, nothing covers a dot or another label, a moved label
// gets a leader, and the result does not depend on the input order.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "cluster-label-layout.js");
const FIELD = { width: 3800, height: 280 };

let layout;

before(async () => {
  layout = await import(pathToFileURL(MODULE).href);
});

/** @returns {{left:number, top:number, width:number, height:number}} */
function dotBox(node) {
  const r = layout.DOT_CLEARANCE_PX;
  return { left: node.x - r, top: node.y - r, width: 2 * r, height: 2 * r };
}

function overlap(a, b) {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

/** Fail when a label covers another label or any dot. */
function assertClean(nodes, placed) {
  nodes.forEach((n, i) => {
    if (!(n.height > 0)) return;
    nodes.forEach((m, j) => {
      assert.ok(!overlap(placed[i], dotBox(m)), `label ${i} covers the dot of node ${j}`);
      if (j > i && m.height > 0) {
        assert.ok(!overlap(placed[i], placed[j]), `label ${i} overlaps label ${j}`);
      }
    });
  });
}

function captureWarnings(fn) {
  const original = console.warn;
  const messages = [];
  console.warn = (...args) => messages.push(args.join(" "));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return messages;
}

describe("layoutLabelsBesideNodes", () => {
  test("a lone label starts just right of its dot, centred on it, with no leader", () => {
    const nodes = [{ x: 500, y: 140, width: 90, height: 14 }];
    const [p] = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.equal(p.side, "right");
    assert.equal(p.leader, false);
    assert.equal(p.top + p.height / 2, 140);
    assert.ok(p.left > 500 && p.left - 500 < 20);
  });

  test("near the right edge a label starts on the left of its dot", () => {
    const nodes = [{ x: 3790, y: 140, width: 90, height: 14 }];
    const [p] = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.equal(p.side, "left");
    assert.equal(p.leader, false);
    assert.ok(p.left + p.width < 3790);
  });

  test("two nodes on one spot use both sides of it, with no leader", () => {
    const nodes = [
      { x: 500, y: 140, width: 90, height: 14 },
      { x: 500, y: 140, width: 90, height: 14 },
    ];
    const placed = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.deepEqual(placed.map((p) => p.side).sort(), ["left", "right"]);
    assert.ok(placed.every((p) => !p.leader));
    assertClean(nodes, placed);
  });

  test("a third node on the same spot moves its label and gets a leader", () => {
    const nodes = [0, 1, 2].map(() => ({ x: 500, y: 140, width: 90, height: 14 }));
    const placed = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.equal(placed.filter((p) => p.leader).length, 1);
    assertClean(nodes, placed);
  });

  test("a tight column of ten nodes leaves no overlaps", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({
      x: 500 + (i % 3) * 4,
      y: 100 + i * 6,
      width: 80 + (i % 4) * 12,
      height: 14,
    }));
    const placed = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.ok(placed.every((p) => p.placed));
    assertClean(nodes, placed);
  });

  test("a hidden label is not placed, but its dot still blocks the others", () => {
    const nodes = [
      { x: 500, y: 140, width: 0, height: 0 },
      { x: 480, y: 140, width: 90, height: 14 },
    ];
    const placed = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.equal(placed[0].height, 0);
    assert.ok(!overlap(placed[1], dotBox(nodes[0])));
  });

  test("the result does not depend on the order of the input", () => {
    const nodes = [
      { x: 500, y: 140, width: 90, height: 14 },
      { x: 505, y: 150, width: 100, height: 14 },
      { x: 700, y: 60, width: 70, height: 14 },
    ];
    const forward = layout.layoutLabelsBesideNodes(nodes, FIELD);
    const reversed = layout.layoutLabelsBesideNodes([...nodes].reverse(), FIELD).reverse();
    assert.deepEqual(reversed, forward);
  });

  test("a label stays inside the field", () => {
    const nodes = [{ x: 3, y: 2, width: 90, height: 14 }];
    const [p] = layout.layoutLabelsBesideNodes(nodes, FIELD);
    assert.ok(p.left >= 0 && p.top >= 0);
    assert.ok(p.left + p.width <= FIELD.width && p.top + p.height <= FIELD.height);
  });

  test("with no free spot, it reports placed false and warns", () => {
    const nodes = [
      { x: 20, y: 20, width: 90, height: 14 },
      { x: 20, y: 20, width: 90, height: 14 },
    ];
    const warnings = captureWarnings(() => {
      const placed = layout.layoutLabelsBesideNodes(nodes, { width: 100, height: 30 });
      assert.equal(placed.some((p) => !p.placed), true);
    });
    assert.ok(warnings.length >= 1);
  });

  test("invalid input returns an empty list and warns", () => {
    const warnings = captureWarnings(() => {
      assert.deepEqual(layout.layoutLabelsBesideNodes(null, FIELD), []);
      assert.deepEqual(layout.layoutLabelsBesideNodes([], { width: 0, height: 10 }), []);
    });
    assert.equal(warnings.length, 2);
  });
});

describe("computeLeaderLine", () => {
  test("for a label on the right the line ends at the start of the name", () => {
    const label = { left: 200, top: 100, width: 80, height: 14, side: "right" };
    const line = layout.computeLeaderLine({ x: 150, y: 140 }, 7, label);
    assert.equal(line.x2, 200);
    assert.equal(line.y2, 107);
  });

  test("the line starts on the dot's edge, not at its centre", () => {
    const label = { left: 200, top: 100, width: 80, height: 14, side: "right" };
    const node = { x: 150, y: 140 };
    const line = layout.computeLeaderLine(node, 7, label);
    const fromCentre = Math.hypot(line.x1 - node.x, line.y1 - node.y);
    assert.ok(Math.abs(fromCentre - 7) < 1e-9);
  });

  test("for a label on the left the line ends at the edge nearest the dot", () => {
    const label = { left: 20, top: 100, width: 80, height: 14, side: "left" };
    const line = layout.computeLeaderLine({ x: 150, y: 140 }, 7, label);
    assert.equal(line.x2, 100);
  });

  test("a label at the dot's centre does not divide by zero", () => {
    const label = { left: 150, top: 133, width: 0, height: 14, side: "right" };
    const line = layout.computeLeaderLine({ x: 150, y: 140 }, 7, label);
    assert.ok(Number.isFinite(line.x1) && Number.isFinite(line.y1));
  });
});
