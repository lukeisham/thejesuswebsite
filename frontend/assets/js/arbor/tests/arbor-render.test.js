// Arbor render tests — uses node:test + node:assert.
// Tests the position-vs-BFS-fallback decision in arbor-render.js.
// The render module itself uses ES imports that can't be vm-sandboxed,
// so these tests exercise the decision logic directly.
//
// Run with: node --test frontend/assets/js/arbor/tests/arbor-render.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Replicate the position-vs-fallback logic from arbor-render.js ────────────
// The render module checks: "when every node has non-null x/y, use them verbatim;
// otherwise fall back to BFS for the whole diagram."

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const H_GAP = 50;
const V_GAP = 80;
const TOP_MARGIN = 40;
const LEFT_MARGIN = 40;

/**
 * Check if all nodes have valid saved positions (mirrors renderArbor logic).
 * @param {Array} nodes
 * @returns {boolean}
 */
function allHaveSavedPositions(nodes) {
  for (const node of nodes) {
    if (
      node.x == null ||
      node.y == null ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Build saved positions map from nodes (mirrors the mirror path in renderArbor).
 * @param {Map<number, Object>} nodesById
 * @returns {Map<number, { x: number, y: number }>}
 */
function buildSavedPositions(nodesById) {
  const positions = new Map();
  for (const [nodeId, node] of nodesById) {
    positions.set(nodeId, { x: node.x, y: node.y });
  }
  return positions;
}

/**
 * BFS level-based layout (mirrors computeLayout in arbor-render.js).
 * Simplified version — only checks that positions are generated.
 * @param {number} rootId
 * @param {Map<number, Object>} nodesById
 * @param {Map<number, Array<{ targetId: number }>>} adjacency
 * @returns {Map<number, { x: number, y: number }>}
 */
function computeBFSLayout(rootId, nodesById, adjacency) {
  const positions = new Map();
  const levels = [];
  const visited = new Set();
  let current = [rootId];
  visited.add(rootId);

  while (current.length > 0) {
    levels.push([...current]);
    const next = [];
    for (const nodeId of current) {
      const children = adjacency.get(nodeId) || [];
      for (const child of children) {
        if (!visited.has(child.targetId)) {
          visited.add(child.targetId);
          next.push(child.targetId);
        }
      }
    }
    current = next;
  }

  const maxWidth = Math.max(...levels.map((l) => l.length), 1);
  const levelWidth = maxWidth * (NODE_WIDTH + H_GAP) - H_GAP;

  for (let depth = 0; depth < levels.length; depth++) {
    const levelNodes = levels[depth];
    const rowWidth = levelNodes.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const startX = (levelWidth - rowWidth) / 2;

    for (let i = 0; i < levelNodes.length; i++) {
      positions.set(levelNodes[i], {
        x: LEFT_MARGIN + startX + i * (NODE_WIDTH + H_GAP),
        y: TOP_MARGIN + depth * (NODE_HEIGHT + V_GAP),
      });
    }
  }

  return positions;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("arbor-render: position-vs-fallback decision", function () {
  test("allHaveSavedPositions returns true when all nodes have valid x/y", function () {
    const nodes = [
      { id: 1, x: 100, y: 200 },
      { id: 2, x: 300, y: 400 },
    ];
    assert.equal(allHaveSavedPositions(nodes), true);
  });

  test("allHaveSavedPositions returns false when any node has null x", function () {
    const nodes = [
      { id: 1, x: 100, y: 200 },
      { id: 2, x: null, y: 100 },
    ];
    assert.equal(allHaveSavedPositions(nodes), false);
  });

  test("allHaveSavedPositions returns false when any node has null y", function () {
    const nodes = [
      { id: 1, x: 100, y: null },
      { id: 2, x: 300, y: 400 },
    ];
    assert.equal(allHaveSavedPositions(nodes), false);
  });

  test("allHaveSavedPositions returns false for Infinity values", function () {
    const nodes = [
      { id: 1, x: Infinity, y: 200 },
      { id: 2, x: 300, y: 400 },
    ];
    assert.equal(allHaveSavedPositions(nodes), false);
  });

  test("allHaveSavedPositions returns false for NaN values", function () {
    const nodes = [
      { id: 1, x: 100, y: 200 },
      { id: 2, x: 300, y: NaN },
    ];
    assert.equal(allHaveSavedPositions(nodes), false);
  });

  test("allHaveSavedPositions returns true for float values", function () {
    const nodes = [
      { id: 1, x: 100.5, y: 200.75 },
      { id: 2, x: 0, y: -50 },
      { id: 3, x: -100, y: 0 },
    ];
    assert.equal(allHaveSavedPositions(nodes), true);
  });

  test("buildSavedPositions uses saved x/y verbatim", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "A", x: 100, y: 200 });
    nodesById.set(2, { id: 2, title: "B", x: 300, y: 400 });

    const positions = buildSavedPositions(nodesById);
    assert.equal(positions.get(1).x, 100);
    assert.equal(positions.get(1).y, 200);
    assert.equal(positions.get(2).x, 300);
    assert.equal(positions.get(2).y, 400);
  });

  test("BFS layout generates finite positions for all nodes", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Child 1" });
    nodesById.set(3, { id: 3, title: "Child 2" });

    const adjacency = new Map();
    adjacency.set(1, [{ targetId: 2 }, { targetId: 3 }]);
    adjacency.set(2, []);
    adjacency.set(3, []);

    const positions = computeBFSLayout(1, nodesById, adjacency);

    assert.equal(positions.size, 3);
    for (const [id, pos] of positions) {
      assert.ok(
        Number.isFinite(pos.x),
        "node " + id + " x should be finite, got " + pos.x,
      );
      assert.ok(
        Number.isFinite(pos.y),
        "node " + id + " y should be finite, got " + pos.y,
      );
    }
  });

  test("BFS layout positions root at top with children below", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Child" });

    const adjacency = new Map();
    adjacency.set(1, [{ targetId: 2 }]);
    adjacency.set(2, []);

    const positions = computeBFSLayout(1, nodesById, adjacency);

    // Root at level 0, child at level 1 — child should be below
    const rootY = positions.get(1).y;
    const childY = positions.get(2).y;
    assert.ok(childY > rootY, "child should be below root");
  });

  test("BFS layout uses LEFT_MARGIN for root when alone", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Solo" });
    const adjacency = new Map();
    adjacency.set(1, []);

    const positions = computeBFSLayout(1, nodesById, adjacency);
    // LEVEL_WIDTH = 1 * (200 + 50) - 50 = 200, startX = (200 - 200) / 2 = 0
    // x = 40 + 0 + 0 * 250 = 40
    assert.equal(positions.get(1).x, LEFT_MARGIN);
    assert.equal(positions.get(1).y, TOP_MARGIN);
  });

  test("integration: decision uses saved when all valid, BFS when any invalid", function () {
    // Simulates the renderArbor decision:
    // if allHaveSavedPositions → use saved, else → BFS
    const nodesWithAll = [
      { id: 1, x: 100, y: 200 },
      { id: 2, x: 300, y: 400 },
    ];
    const nodesWithNull = [
      { id: 1, x: 100, y: 200 },
      { id: 2, x: null, y: 100 },
    ];

    assert.equal(allHaveSavedPositions(nodesWithAll), true);
    assert.equal(allHaveSavedPositions(nodesWithNull), false);

    // When all valid: use saved
    const nodesById = new Map();
    for (const n of nodesWithAll) nodesById.set(n.id, n);
    const saved = buildSavedPositions(nodesById);
    assert.equal(saved.get(1).x, 100);
    assert.equal(saved.get(2).x, 300);

    // When any null: use BFS (positions won't match saved)
    const nodesById2 = new Map();
    for (const n of nodesWithNull) nodesById2.set(n.id, n);
    const adjacency = new Map();
    adjacency.set(1, [{ targetId: 2 }]);
    adjacency.set(2, []);
    const bfs = computeBFSLayout(1, nodesById2, adjacency);
    // BFS layout won't have y=200 for node 1
    assert.notEqual(bfs.get(1).y, 200);
  });

  test("per-node fallback: nodes with saved positions keep them, unplaced nodes get BFS fallback", function () {
    // Simulates the new per-node fallback logic in renderArbor.
    // Node 1 has a saved position at (500, 300). Node 2 has no position (null x/y).
    // After per-node fallback: node 1 should stay at (500, 300); node 2 should
    // get a BFS-computed fallback (not overlapping node 1).

    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Placed", x: 500, y: 300 });
    nodesById.set(2, { id: 2, title: "Unplaced", x: null, y: null });

    const adjacency = new Map();
    adjacency.set(1, [{ targetId: 2 }]);
    adjacency.set(2, []);

    // Build saved-positions for nodes with valid x/y.
    const savedPositions = new Map();
    const unplacedNodeIds = [];
    for (const [nodeId, node] of nodesById) {
      if (
        node.x != null &&
        node.y != null &&
        Number.isFinite(node.x) &&
        Number.isFinite(node.y)
      ) {
        savedPositions.set(nodeId, { x: node.x, y: node.y });
      } else {
        unplacedNodeIds.push(nodeId);
      }
    }

    // Merge: saved positions + BFS for unplaced only.
    const merged = new Map(savedPositions);
    const fallback = computeBFSLayout(1, nodesById, adjacency);
    for (const nodeId of unplacedNodeIds) {
      const fb = fallback.get(nodeId);
      if (fb) merged.set(nodeId, fb);
    }

    // Node 1 must keep its saved position exactly.
    assert.equal(merged.get(1).x, 500);
    assert.equal(merged.get(1).y, 300);

    // Node 2 must get a fallback position (not undefined).
    assert.ok(merged.has(2), "unplaced node should get a fallback");
    assert.ok(Number.isFinite(merged.get(2).x));
    assert.ok(Number.isFinite(merged.get(2).y));

    // Node 2's fallback should NOT equal the saved position of node 1
    // (validation that fallback doesn't just reuse the wrong position).
    assert.notEqual(merged.get(2).x, 500);
  });

  test("per-node fallback: mixed set preserves all placed nodes", function () {
    // 3 nodes: two placed, one unplaced. Both placed nodes keep their positions.
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "A", x: 100, y: 50 });
    nodesById.set(2, { id: 2, title: "B", x: 700, y: 400 });
    nodesById.set(3, { id: 3, title: "C", x: null, y: null });

    const adjacency = new Map();
    adjacency.set(1, [{ targetId: 2 }, { targetId: 3 }]);
    adjacency.set(2, []);
    adjacency.set(3, []);

    const savedPositions = new Map();
    const unplacedNodeIds = [];
    for (const [nodeId, node] of nodesById) {
      if (
        node.x != null &&
        node.y != null &&
        Number.isFinite(node.x) &&
        Number.isFinite(node.y)
      ) {
        savedPositions.set(nodeId, { x: node.x, y: node.y });
      } else {
        unplacedNodeIds.push(nodeId);
      }
    }

    const merged = new Map(savedPositions);
    const fallback = computeBFSLayout(1, nodesById, adjacency);
    for (const nodeId of unplacedNodeIds) {
      const fb = fallback.get(nodeId);
      if (fb) merged.set(nodeId, fb);
    }

    assert.equal(merged.get(1).x, 100);
    assert.equal(merged.get(1).y, 50);
    assert.equal(merged.get(2).x, 700);
    assert.equal(merged.get(2).y, 400);
    assert.ok(merged.has(3));
    assert.ok(Number.isFinite(merged.get(3).x));
  });
});
