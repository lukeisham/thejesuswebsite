// Arbor data tests — uses node:test + node:assert.
// Tests the topologicalSort helper added for mobile vertical flow.
//
// Run with: node --test frontend/assets/js/arbor/tests/arbor-data.test.js

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Mirror the topologicalSort logic from arbor-data.js ──────────────────────
// Replicated here so tests can run without ES module tooling.

/**
 * Replicates getChildren helper.
 */
function getChildren(adjacency, nodeId) {
  return adjacency.get(nodeId) || [];
}

/**
 * Replicates the topologicalSort export from arbor-data.js.
 *
 * @param {Object|null} root
 * @param {Map<number, Array>} adjacency
 * @param {Map<number, Object>} nodesById
 * @returns {Array<Object>}
 */
function topologicalSort(root, adjacency, nodesById) {
  const visited = new Set();
  const result = [];

  if (root && nodesById.has(root.id)) {
    const queue = [root.id];
    visited.add(root.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const node = nodesById.get(currentId);
      if (node) result.push(node);

      const children = getChildren(adjacency, currentId);
      for (const child of children) {
        if (child.relationshipType === "root" || child.relationshipType === "related")
          continue;
        if (!visited.has(child.targetId)) {
          visited.add(child.targetId);
          queue.push(child.targetId);
        }
      }
    }
  }

  const orphans = [];
  for (const [id, node] of nodesById) {
    if (!visited.has(id)) {
      orphans.push(node);
    }
  }
  orphans.sort((a, b) => {
    const aOrder = a.sort_order;
    const bOrder = b.sort_order;
    if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.id - b.id;
  });

  return result.concat(orphans);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("arbor-data: topologicalSort", function () {
  test("orders nodes root-first from tree edges (supports, leads_to)", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Child A" });
    nodesById.set(3, { id: 3, title: "Child B" });

    const adjacency = new Map();
    adjacency.set(1, [
      { targetId: 2, relationshipType: "supports" },
      { targetId: 3, relationshipType: "leads_to" },
    ]);
    adjacency.set(2, []);
    adjacency.set(3, []);

    const root = nodesById.get(1);
    const result = topologicalSort(root, adjacency, nodesById);

    assert.equal(result.length, 3);
    assert.equal(result[0].id, 1);
    // both children at same depth; BFS order preserved
    assert.ok(result[1].id === 2 || result[1].id === 3);
    assert.ok(result[2].id !== result[0].id);
  });

  test("skips 'root' and 'related' edges when building tree order", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Child" });
    nodesById.set(3, { id: 3, title: "Related" });

    const adjacency = new Map();
    adjacency.set(1, [
      { targetId: 2, relationshipType: "supports" },
    ]);
    adjacency.set(2, [
      { targetId: 3, relationshipType: "related" },
    ]);
    adjacency.set(3, []);

    const root = nodesById.get(1);
    const result = topologicalSort(root, adjacency, nodesById);

    // Node 3 is reached via 'related' → should NOT be included in tree
    // Node 3 becomes an orphan appended after tree nodes
    assert.equal(result.length, 3);
    assert.equal(result[0].id, 1);
    assert.equal(result[1].id, 2);
    // Node 3 should be last (appended as orphan)
    assert.equal(result[2].id, 3);
  });

  test("orphan nodes appended after tree nodes, sorted by sort_order then id", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Orphan B", sort_order: 200 });
    nodesById.set(3, { id: 3, title: "Orphan A", sort_order: 100 });
    nodesById.set(4, { id: 4, title: "Orphan C" }); // no sort_order

    const adjacency = new Map();
    adjacency.set(1, []);
    adjacency.set(2, []);
    adjacency.set(3, []);
    adjacency.set(4, []);

    const root = nodesById.get(1);
    const result = topologicalSort(root, adjacency, nodesById);

    assert.equal(result.length, 4);
    assert.equal(result[0].id, 1); // root first
    // Orphans sorted: sort_order 100 (id 3), sort_order 200 (id 2), then id 4
    assert.equal(result[1].id, 3);
    assert.equal(result[2].id, 2);
    assert.equal(result[3].id, 4);
  });

  test("no root returns all nodes sorted as orphans", function () {
    const nodesById = new Map();
    nodesById.set(10, { id: 10, title: "A" });
    nodesById.set(5, { id: 5, title: "B" });
    nodesById.set(7, { id: 7, title: "C" });

    const adjacency = new Map();
    adjacency.set(10, []);
    adjacency.set(5, []);
    adjacency.set(7, []);

    const result = topologicalSort(null, adjacency, nodesById);

    assert.equal(result.length, 3);
    // sorted by id ascending (no sort_order)
    assert.equal(result[0].id, 5);
    assert.equal(result[1].id, 7);
    assert.equal(result[2].id, 10);
  });

  test("cycle in graph does not cause infinite loop", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "Cyclic A" });
    nodesById.set(3, { id: 3, title: "Cyclic B" });

    // A → B → A cycle
    const adjacency = new Map();
    adjacency.set(1, [
      { targetId: 2, relationshipType: "supports" },
    ]);
    adjacency.set(2, [
      { targetId: 3, relationshipType: "supports" },
    ]);
    adjacency.set(3, [
      { targetId: 2, relationshipType: "supports" },
    ]);

    const root = nodesById.get(1);
    const result = topologicalSort(root, adjacency, nodesById);

    // All three nodes should be present; no duplicates
    assert.equal(result.length, 3);
    const ids = result.map((n) => n.id);
    assert.ok(ids.includes(1));
    assert.ok(ids.includes(2));
    assert.ok(ids.includes(3));
  });

  test("empty nodesById returns empty array", function () {
    const nodesById = new Map();
    const adjacency = new Map();
    const root = { id: 1, title: "Ghost" };

    const result = topologicalSort(root, adjacency, nodesById);
    assert.equal(result.length, 0);
  });

  test("multi-depth tree ordered BFS level-by-level", function () {
    const nodesById = new Map();
    nodesById.set(1, { id: 1, title: "Root" });
    nodesById.set(2, { id: 2, title: "L1-A" });
    nodesById.set(3, { id: 3, title: "L1-B" });
    nodesById.set(4, { id: 4, title: "L2-A" });
    nodesById.set(5, { id: 5, title: "L2-B" });

    const adjacency = new Map();
    adjacency.set(1, [
      { targetId: 2, relationshipType: "supports" },
      { targetId: 3, relationshipType: "supports" },
    ]);
    adjacency.set(2, [
      { targetId: 4, relationshipType: "leads_to" },
    ]);
    adjacency.set(3, [
      { targetId: 5, relationshipType: "leads_to" },
    ]);
    adjacency.set(4, []);
    adjacency.set(5, []);

    const root = nodesById.get(1);
    const result = topologicalSort(root, adjacency, nodesById);

    assert.equal(result.length, 5);
    // Root first
    assert.equal(result[0].id, 1);
    // Level 1 nodes (2, 3) before level 2 nodes (4, 5)
    const l1Ids = [result[1].id, result[2].id];
    const l2Ids = [result[3].id, result[4].id];
    l1Ids.sort();
    l2Ids.sort();
    assert.deepEqual(l1Ids, [2, 3]);
    assert.deepEqual(l2Ids, [4, 5]);
  });

  test("orphans with same sort_order fall back to id ordering", function () {
    const nodesById = new Map();
    nodesById.set(5, { id: 5, title: "Z", sort_order: 10 });
    nodesById.set(3, { id: 3, title: "X", sort_order: 10 });
    nodesById.set(4, { id: 4, title: "Y", sort_order: 10 });

    const adjacency = new Map();
    adjacency.set(5, []);
    adjacency.set(3, []);
    adjacency.set(4, []);

    const result = topologicalSort(null, adjacency, nodesById);

    assert.equal(result.length, 3);
    // Same sort_order → fall back to id ascending
    assert.equal(result[0].id, 3);
    assert.equal(result[1].id, 4);
    assert.equal(result[2].id, 5);
  });
});
