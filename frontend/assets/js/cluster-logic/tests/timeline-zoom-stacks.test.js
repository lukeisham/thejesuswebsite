// Timeline zoom stack tests — node:test + node:assert.
// Imports the real module. Checks: close nodes stack at their mean x, far nodes
// stay apart, the blend runs from stacks (zoomed out) to exact positions (zoomed
// in), and the view that a stack click asks for.

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

let stacks;

before(async () => {
  stacks = await import(
    pathToFileURL(path.resolve(__dirname, "..", "timeline-zoom-stacks.js")).href
  );
});

const SPINE_Y = 140;

/** Nodes in one tight period and one far away. */
const NODES = [
  { x: 100, y: 100 },
  { x: 110, y: 160 },
  { x: 130, y: 140 },
  { x: 900, y: 140 },
];

describe("stackBlend", () => {
  test("is 0 at and below the start, 1 at and above the end", () => {
    assert.equal(stacks.stackBlend(0.3), 0);
    assert.equal(stacks.stackBlend(stacks.STACK_BLEND_START), 0);
    assert.equal(stacks.stackBlend(stacks.STACK_BLEND_END), 1);
    assert.equal(stacks.stackBlend(3), 1);
  });

  test("grows steadily in between", () => {
    const mid = (stacks.STACK_BLEND_START + stacks.STACK_BLEND_END) / 2;
    assert.ok(Math.abs(stacks.stackBlend(mid) - 0.5) < 1e-9);
  });
});

describe("computeZoomStacks: zoomed out", () => {
  test("close nodes gather in one stack at their mean x; a far node stays alone", () => {
    const r = stacks.computeZoomStacks(NODES, 0.5, SPINE_Y);
    assert.equal(r.collapsed, true);
    assert.equal(r.stacks.length, 1);
    assert.deepEqual(r.stacks[0].members.sort(), [0, 1, 2]);
    assert.ok(Math.abs(r.stacks[0].x - (100 + 110 + 130) / 3) < 1e-9);
    assert.equal(r.stacks[0].count, 3);
    assert.equal(r.positions[3].stackIndex, -1);
    assert.deepEqual([r.positions[3].x, r.positions[3].y], [900, 140]);
  });

  test("members form one column, ordered by their exact y, centred on the spine", () => {
    const r = stacks.computeZoomStacks(NODES, 0.5, SPINE_Y);
    const column = r.stacks[0].members; // top to bottom
    assert.deepEqual(column, [0, 2, 1]); // y 100, 140, 160
    const ys = column.map((i) => r.positions[i].y);
    assert.ok(ys[0] < ys[1] && ys[1] < ys[2]);
    assert.ok(Math.abs((ys[0] + ys[2]) / 2 - SPINE_Y) < 1e-9);
    const xs = column.map((i) => r.positions[i].x);
    assert.ok(xs.every((x) => Math.abs(x - xs[0]) < 1e-9));
  });

  test("the column spacing is the same on screen at every zoom", () => {
    for (const scale of [0.3, 0.5, stacks.STACK_BLEND_START]) {
      const r = stacks.computeZoomStacks(NODES, scale, SPINE_Y);
      const [a, b] = r.stacks[0].members.map((i) => r.positions[i].y);
      assert.ok(Math.abs((b - a) * scale - stacks.STACK_SPACING_PX) < 1e-9);
    }
  });

  test("a chain of close nodes does not become one huge stack", () => {
    const chain = Array.from({ length: 30 }, (_, i) => ({ x: i * 10, y: 140 }));
    const r = stacks.computeZoomStacks(chain, 1, SPINE_Y);
    assert.ok(r.stacks.length > 1);
    for (const s of r.stacks) assert.ok((s.maxX - s.minX) * 1 <= stacks.STACK_MERGE_PX);
  });
});

describe("computeZoomStacks: zoomed in", () => {
  test("every node is at its exact position from the end of the blend", () => {
    const r = stacks.computeZoomStacks(NODES, 1.2, SPINE_Y);
    assert.equal(r.collapsed, false);
    r.positions.forEach((p, i) => {
      assert.ok(Math.abs(p.x - NODES[i].x) < 1e-9 && Math.abs(p.y - NODES[i].y) < 1e-9);
    });
  });

  test("halfway through the blend a node is halfway between its two spots", () => {
    const mid = (stacks.STACK_BLEND_START + stacks.STACK_BLEND_END) / 2;
    const r = stacks.computeZoomStacks(NODES, mid, SPINE_Y);
    // Node 0 is the top of a three-node column; its stack spot is one step above the spine.
    const stackSpotY = SPINE_Y - stacks.STACK_SPACING_PX / mid;
    assert.ok(Math.abs(r.positions[0].y - (stackSpotY + NODES[0].y) / 2) < 1e-9);
    const stackSpotX = (100 + 110 + 130) / 3;
    assert.ok(Math.abs(r.positions[0].x - (stackSpotX + NODES[0].x) / 2) < 1e-9);
  });

  test("the stack's x range is the exact range of its members", () => {
    const [s] = stacks.computeZoomStacks(NODES, 0.5, SPINE_Y).stacks;
    assert.equal(s.minX, 100);
    assert.equal(s.maxX, 130);
  });
});

describe("computeZoomStacks: bad input", () => {
  test("a bad scale returns an empty result and warns", () => {
    const original = console.warn;
    let warned = 0;
    console.warn = () => { warned++; };
    try {
      const r = stacks.computeZoomStacks(NODES, 0, SPINE_Y);
      assert.deepEqual(r.positions, []);
    } finally {
      console.warn = original;
    }
    assert.equal(warned, 1);
  });

  test("an empty node list gives no stacks", () => {
    const r = stacks.computeZoomStacks([], 0.5, SPINE_Y);
    assert.deepEqual([r.stacks, r.positions], [[], []]);
  });
});

describe("fitStackView", () => {
  test("a wide stack fits about half the view", () => {
    const { scale } = stacks.fitStackView(100, 500, 1000, 0.3, 3);
    assert.ok(Math.abs(scale * 400 - 500) < 1e-9 || scale === stacks.STACK_BLEND_END);
  });

  test("the scale is never below the end of the blend, so the stack dissolves", () => {
    const { scale } = stacks.fitStackView(0, 5000, 1000, 0.3, 3);
    assert.equal(scale, stacks.STACK_BLEND_END);
  });

  test("a stack of nodes on one spot zooms to the largest scale", () => {
    const { scale } = stacks.fitStackView(300, 300, 1000, 0.3, 3);
    assert.equal(scale, 3);
  });

  test("the pan puts the middle of the nodes in the middle of the view", () => {
    const { scale, panX } = stacks.fitStackView(200, 260, 1000, 0.3, 3);
    assert.ok(Math.abs(230 * scale + panX - 500) < 1e-9);
  });
});
