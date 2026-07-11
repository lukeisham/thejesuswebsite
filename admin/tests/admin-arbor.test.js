// Admin arbor tests — uses node:test + node:assert.
// Tests the pure coordinate helpers from admin-arbor/arbor-canvas.js
// (screenToDiagram, diagramToScreen) and the edge-validation logic from
// admin-arbor/arbor-edges.js (validateConnection).
//
// The DOM-bound drag/click canvas wiring is validated manually via browser
// testing (see setup/TESTS/admin_tests.md for the manual checklist).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load arbor-canvas.js in a sandboxed context ──────────────────────────────

const canvasPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-canvas.js",
);
const canvasSource = fs.readFileSync(canvasPath, "utf8");

const canvasSandbox = {
  window: {},
  document: {
    createElementNS: function () {
      return {
        setAttribute: function () {},
        appendChild: function () {},
        addEventListener: function () {},
        style: {},
        getAttribute: function () {
          return null;
        },
      };
    },
    addEventListener: function () {},
    removeEventListener: function () {},
  },
  console: { error: function () {} },
};

// ── Load arbor-geometry.js (shared constants required by arbor-canvas/edges) ──

const geometryPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-geometry.js",
);
const geometrySource = fs.readFileSync(geometryPath, "utf8");

vm.runInNewContext(geometrySource, canvasSandbox);

vm.runInNewContext(canvasSource, canvasSandbox);

const { screenToDiagram, diagramToScreen } =
  canvasSandbox.window.AdminArborCanvas;

// ── Load arbor-edges.js for validateConnection ───────────────────────────────

const edgesPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-edges.js",
);
const edgesSource = fs.readFileSync(edgesPath, "utf8");

const edgesSandbox = {
  window: {
    AdminArborGeometry: {
      NODE_WIDTH: 200,
      NODE_HEIGHT: 80,
      EDGE_STYLES: {
        default: { stroke: "var(--border-strong)" },
        root: { stroke: "var(--accent)", "stroke-width": "2" },
        related: { "stroke-dasharray": "6 4", stroke: "var(--border-strong)" },
      },
    },
    AdminArborCanvas: {
      getTransformGroup: function () {
        return null;
      },
      createEdgeLine: function () {
        return { setAttribute: function () {} };
      },
      createNodeLabel: function () {
        return { setAttribute: function () {}, textContent: "" };
      },
      screenToDiagram: function (x, y) {
        return { x: x, y: y };
      },
      getTransform: function () {
        return { x: 0, y: 0, scale: 1 };
      },
    },
    AdminArborNodes: {
      getNodeById: function () {
        return null;
      },
    },
    UpdateRecord: {
      saveEdge: async function () {
        return {};
      },
      deleteEdge: async function () {},
    },
  },
  document: {
    getElementById: function () {
      return null;
    },
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    createElement: function () {
      return {
        setAttribute: function () {},
        appendChild: function () {},
        addEventListener: function () {},
        style: {},
        classList: {
          add: function () {},
          remove: function () {},
          toggle: function () {},
        },
      };
    },
  },
  console: { error: function () {} },
};

vm.runInNewContext(edgesSource, edgesSandbox);

const { validateConnection } = edgesSandbox.window.AdminArborEdges;

// ── screenToDiagram ──────────────────────────────────────────────────────────

describe("screenToDiagram", function () {
  test("converts screen coordinates to diagram space at scale 1, no pan", function () {
    var tx = { x: 0, y: 0, scale: 1 };
    var result = screenToDiagram(100, 200, tx);
    assert.equal(result.x, 100);
    assert.equal(result.y, 200);
  });

  test("accounts for pan offset", function () {
    var tx = { x: 50, y: 30, scale: 1 };
    var result = screenToDiagram(150, 230, tx);
    assert.equal(result.x, 100);
    assert.equal(result.y, 200);
  });

  test("accounts for zoom scale", function () {
    var tx = { x: 0, y: 0, scale: 2 };
    var result = screenToDiagram(200, 400, tx);
    assert.equal(result.x, 100);
    assert.equal(result.y, 200);
  });

  test("combines pan and zoom", function () {
    var tx = { x: 100, y: 50, scale: 0.5 };
    // screenX = 200, diagX = (200 - 100) / 0.5 = 200
    var result = screenToDiagram(200, 150, tx);
    assert.equal(result.x, 200);
    assert.equal(result.y, 200);
  });

  test("returns screen coords unchanged when scale is 0", function () {
    var tx = { x: 100, y: 50, scale: 0 };
    var result = screenToDiagram(200, 150, tx);
    assert.equal(result.x, 200);
    assert.equal(result.y, 150);
  });

  test("returns screen coords unchanged for null transform", function () {
    var result = screenToDiagram(50, 60, null);
    assert.equal(result.x, 50);
    assert.equal(result.y, 60);
  });
});

// ── diagramToScreen ──────────────────────────────────────────────────────────

describe("diagramToScreen", function () {
  test("converts diagram coordinates to screen space at scale 1, no pan", function () {
    var tx = { x: 0, y: 0, scale: 1 };
    var result = diagramToScreen(100, 200, tx);
    assert.equal(result.x, 100);
    assert.equal(result.y, 200);
  });

  test("accounts for pan offset", function () {
    var tx = { x: 50, y: 30, scale: 1 };
    var result = diagramToScreen(100, 200, tx);
    assert.equal(result.x, 150);
    assert.equal(result.y, 230);
  });

  test("accounts for zoom scale", function () {
    var tx = { x: 0, y: 0, scale: 2 };
    var result = diagramToScreen(100, 200, tx);
    assert.equal(result.x, 200);
    assert.equal(result.y, 400);
  });

  test("combines pan and zoom", function () {
    var tx = { x: 50, y: 100, scale: 1.5 };
    var result = diagramToScreen(100, 200, tx);
    assert.equal(result.x, 200);
    assert.equal(result.y, 400);
  });

  test("returns diagram coords unchanged for null transform", function () {
    var result = diagramToScreen(50, 60, null);
    assert.equal(result.x, 50);
    assert.equal(result.y, 60);
  });
});

// ── Round-trip stability ─────────────────────────────────────────────────────

describe("screenToDiagram ↔ diagramToScreen round-trip", function () {
  test("round-trips a point at default scale", function () {
    var tx = { x: 0, y: 0, scale: 1 };
    var diag = screenToDiagram(350, 420, tx);
    var screen = diagramToScreen(diag.x, diag.y, tx);
    assert.equal(screen.x, 350);
    assert.equal(screen.y, 420);
  });

  test("round-trips a point with pan and zoom", function () {
    var tx = { x: 100, y: -50, scale: 1.75 };
    var diag = screenToDiagram(500, 300, tx);
    var screen = diagramToScreen(diag.x, diag.y, tx);
    assert.ok(Math.abs(screen.x - 500) < 0.01);
    assert.ok(Math.abs(screen.y - 300) < 0.01);
  });

  test("round-trips diagram coordinates back", function () {
    var tx = { x: 75, y: 25, scale: 1.3 };
    var screen = diagramToScreen(200, 150, tx);
    var diag = screenToDiagram(screen.x, screen.y, tx);
    assert.ok(Math.abs(diag.x - 200) < 0.01);
    assert.ok(Math.abs(diag.y - 150) < 0.01);
  });
});

// ── Edge validation ──────────────────────────────────────────────────────────

describe("validateConnection", function () {
  test("rejects self-edges", function () {
    var err = validateConnection(1, 1, "supports", []);
    assert.ok(err !== null);
    assert.ok(err.indexOf("cannot connect to itself") !== -1);
  });

  test("rejects invalid relationship types", function () {
    var err = validateConnection(1, 2, "invalid_type", []);
    assert.ok(err !== null);
    assert.ok(err.indexOf("Invalid relationship type") !== -1);
  });

  test("accepts all four valid types", function () {
    var types = ["root", "supports", "leads_to", "related"];
    for (var i = 0; i < types.length; i++) {
      var err = validateConnection(1, 2, types[i], []);
      assert.equal(err, null, types[i] + " should be valid");
    }
  });

  test("rejects duplicate edges", function () {
    var existing = [
      { source_id: 1, target_id: 2, relationship_type: "supports" },
      { source_id: 2, target_id: 3, relationship_type: "leads_to" },
    ];
    var err = validateConnection(1, 2, "related", existing);
    assert.ok(err !== null);
    assert.ok(err.indexOf("already exists") !== -1);
  });

  test("allows reverse-direction edges", function () {
    var existing = [
      { source_id: 1, target_id: 2, relationship_type: "supports" },
    ];
    // 2 → 1 is the reverse direction — should be allowed
    var err = validateConnection(2, 1, "supports", existing);
    assert.equal(err, null);
  });

  test("allows new unique connection", function () {
    var existing = [
      { source_id: 1, target_id: 2, relationship_type: "supports" },
    ];
    var err = validateConnection(1, 3, "related", existing);
    assert.equal(err, null);
  });

  test("accepts with empty edges array", function () {
    var err = validateConnection(5, 10, "root", []);
    assert.equal(err, null);
  });
});

// ── Drop hit-testing (pure logic) ────────────────────────────────────────────

/**
 * Pure function matching the hit-test logic of getNodeAtDiagramPosition.
 * Given a list of nodes (each with id, arbor_x, arbor_y), a diagram point,
 * node dimensions, and an optional excludeId, returns the matching node or null.
 */
function hitTestNode(nodes, diagX, diagY, nodeWidth, nodeHeight, excludeId) {
  for (var i = nodes.length - 1; i >= 0; i--) {
    var n = nodes[i];
    if (excludeId !== undefined && n.id === excludeId) continue;
    var nx = n.arbor_x || 0;
    var ny = n.arbor_y || 0;
    if (
      diagX >= nx &&
      diagX <= nx + nodeWidth &&
      diagY >= ny &&
      diagY <= ny + nodeHeight
    ) {
      return n;
    }
  }
  return null;
}

describe("hitTestNode (drop hit-testing)", function () {
  var nodes;

  beforeEach(function () {
    nodes = [
      { id: 1, arbor_x: 100, arbor_y: 100 },
      { id: 2, arbor_x: 400, arbor_y: 200 },
      { id: 3, arbor_x: 200, arbor_y: 300 },
    ];
  });

  test("finds a node whose bounding rect contains the point", function () {
    var result = hitTestNode(nodes, 150, 150, 200, 80);
    assert.ok(result);
    assert.equal(result.id, 1);
  });

  test("returns null when no node covers the point", function () {
    var result = hitTestNode(nodes, 50, 50, 200, 80);
    assert.equal(result, null);
  });

  test("returns the topmost node when nodes overlap", function () {
    // Node 3 overlaps node 1 — iterating in reverse means 3 is found first
    nodes[0].arbor_x = 200;
    nodes[0].arbor_y = 300;
    var result = hitTestNode(nodes, 250, 340, 200, 80);
    assert.ok(result);
    assert.equal(result.id, 3); // topmost (last in array)
  });

  test("excludes a node when excludeId is set", function () {
    var result = hitTestNode(nodes, 150, 150, 200, 80, 1);
    assert.equal(result, null);
  });

  test("handles nodes with null positions (arbor_x/y undefined)", function () {
    nodes.push({ id: 4, arbor_x: undefined, arbor_y: undefined });
    // Point at (0,0) — the null-position node is treated as (0,0)
    var result = hitTestNode(nodes, 50, 40, 200, 80);
    assert.ok(result);
    assert.equal(result.id, 4);
  });
});

// ── Parent-edge decision logic ───────────────────────────────────────────────

/**
 * Pure logic: given a target node ID and existing edges, find the first
 * incoming non-"related" edge (the one that should be re-pointed on drop).
 * Returns the edge object or null.
 */
function findExistingParentEdge(edges, targetId) {
  for (var i = 0; i < edges.length; i++) {
    if (
      edges[i].target_id === targetId &&
      edges[i].relationship_type !== "related"
    ) {
      return edges[i];
    }
  }
  return null;
}

describe("findExistingParentEdge (re-point vs create decision)", function () {
  var edges;

  beforeEach(function () {
    edges = [
      { id: 10, source_id: 1, target_id: 2, relationship_type: "supports" },
      { id: 11, source_id: 2, target_id: 3, relationship_type: "related" },
      { id: 12, source_id: 4, target_id: 5, relationship_type: "leads_to" },
    ];
  });

  test("finds an existing incoming non-related edge to re-point", function () {
    var result = findExistingParentEdge(edges, 2);
    assert.ok(result);
    assert.equal(result.id, 10);
    assert.equal(result.source_id, 1);
  });

  test("ignores 'related' edges — they should not be re-pointed", function () {
    // Edge 11 is "related" pointing to node 3 — should be ignored
    // Edge 12 is "leads_to" pointing to node 5 — distinct target
    var result = findExistingParentEdge(edges, 3);
    assert.equal(result, null);
  });

  test("returns null when no incoming edges exist for the target", function () {
    var result = findExistingParentEdge(edges, 999);
    assert.equal(result, null);
  });

  test("returns null when only incoming edge is 'related'", function () {
    edges = [
      { id: 20, source_id: 10, target_id: 20, relationship_type: "related" },
    ];
    var result = findExistingParentEdge(edges, 20);
    assert.equal(result, null);
  });

  test("finds 'leads_to' edge for re-pointing", function () {
    var result = findExistingParentEdge(edges, 5);
    assert.ok(result);
    assert.equal(result.id, 12);
  });
});

// ── Pen chip filtering (already-placed evidence) ─────────────────────────────

/**
 * Pure logic: given a list of evidence chips and the set of placed node IDs,
 * filter out chips that are already on the canvas.
 */
function filterUnplacedChips(allEvidence, placedNodeIds) {
  var placedSet = new Set(placedNodeIds);
  return allEvidence.filter(function (evidence) {
    return !placedSet.has(evidence.id);
  });
}

describe("pen chip filtering (already-placed evidence)", function () {
  var allEvidence;

  beforeEach(function () {
    allEvidence = [
      { id: 1, title: "Evidence A" },
      { id: 2, title: "Evidence B" },
      { id: 3, title: "Evidence C" },
    ];
  });

  test("returns all evidence when nothing is placed", function () {
    var result = filterUnplacedChips(allEvidence, []);
    assert.equal(result.length, 3);
  });

  test("excludes placed evidence from the result", function () {
    var result = filterUnplacedChips(allEvidence, [1, 3]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 2);
  });

  test("returns empty array when everything is placed", function () {
    var result = filterUnplacedChips(allEvidence, [1, 2, 3]);
    assert.equal(result.length, 0);
  });

  test("handles empty evidence list", function () {
    var result = filterUnplacedChips([], [1, 2]);
    assert.equal(result.length, 0);
  });
});

// ── Edge anchor alignment ────────────────────────────────────────────────────
// Verifies that createEdgeElement computes centre-bottom → centre-top anchors
// (x + NODE_WIDTH/2, y + NODE_HEIGHT) → (x + NODE_WIDTH/2, y), matching the
// frontend's edge-drawing logic.

describe("edge anchor alignment", function () {
  // Re-load edges.js with a mock that captures the line coordinates.
  var capturedEdges = null;

  var anchorSandbox = {
    window: {
      AdminArborGeometry: {
        NODE_WIDTH: 200,
        NODE_HEIGHT: 80,
        EDGE_STYLES: {
          default: { stroke: "var(--border-strong)" },
          root: { stroke: "var(--accent)", "stroke-width": "2" },
          related: {
            "stroke-dasharray": "6 4",
            stroke: "var(--border-strong)",
          },
        },
      },
      AdminArborCanvas: {
        getTransformGroup: function () {
          return null;
        },
        createEdgeLine: function (x1, y1, x2, y2) {
          capturedEdges = { x1: x1, y1: y1, x2: x2, y2: y2 };
          return { setAttribute: function () {} };
        },
        createNodeLabel: function () {
          return { setAttribute: function () {}, textContent: "" };
        },
        screenToDiagram: function (x, y) {
          return { x: x, y: y };
        },
        getTransform: function () {
          return { x: 0, y: 0, scale: 1 };
        },
      },
      AdminArborNodes: {
        getNodeById: function () {
          return null;
        },
      },
      UpdateRecord: {
        saveEdge: async function () {
          return {};
        },
        deleteEdge: async function () {},
      },
    },
    document: {
      createElementNS: function () {
        return {
          setAttribute: function () {},
          appendChild: function () {},
          addEventListener: function () {},
          style: {},
          classList: {
            add: function () {},
            remove: function () {},
            toggle: function () {},
          },
        };
      },
      getElementById: function () {
        return null;
      },
      querySelector: function () {
        return null;
      },
      querySelectorAll: function () {
        return [];
      },
      addEventListener: function () {},
      removeEventListener: function () {},
      createElement: function () {
        return {
          setAttribute: function () {},
          appendChild: function () {},
          addEventListener: function () {},
          style: {},
          classList: {
            add: function () {},
            remove: function () {},
            toggle: function () {},
          },
        };
      },
    },
    console: { error: function () {} },
  };

  // Load geometry and edges into the capture sandbox.
  var edgesSource2 = fs.readFileSync(edgesPath, "utf8");
  var geometrySource2 = fs.readFileSync(geometryPath, "utf8");
  vm.runInNewContext(geometrySource2, anchorSandbox);
  vm.runInNewContext(edgesSource2, anchorSandbox);

  var createEdgeElement =
    anchorSandbox.window.AdminArborEdges.createEdgeElement;

  test("anchors source at centre-bottom (x + NODE_WIDTH/2, y + NODE_HEIGHT)", function () {
    capturedEdges = null;
    var sourceNode = { arbor_x: 100, arbor_y: 200 };
    var targetNode = { arbor_x: 500, arbor_y: 600 };
    var edge = { id: 1, relationship_type: "supports" };

    createEdgeElement(edge, sourceNode, targetNode);

    // Source: centre-bottom
    assert.equal(capturedEdges.x1, 100 + 200 / 2); // 200
    assert.equal(capturedEdges.y1, 200 + 80); // 280
  });

  test("anchors target at centre-top (x + NODE_WIDTH/2, y)", function () {
    capturedEdges = null;
    var sourceNode = { arbor_x: 100, arbor_y: 200 };
    var targetNode = { arbor_x: 500, arbor_y: 600 };
    var edge = { id: 1, relationship_type: "supports" };

    createEdgeElement(edge, sourceNode, targetNode);

    // Target: centre-top
    assert.equal(capturedEdges.x2, 500 + 200 / 2); // 600
    assert.equal(capturedEdges.y2, 600); // top of target
  });

  test("handles nodes with null arbor_x/y (falls back to 0)", function () {
    capturedEdges = null;
    var sourceNode = { arbor_x: null, arbor_y: null };
    var targetNode = { arbor_x: null, arbor_y: null };
    var edge = { id: 1, relationship_type: "supports" };

    createEdgeElement(edge, sourceNode, targetNode);

    // Nulls become 0, plus offset
    assert.equal(capturedEdges.x1, 0 + 100);
    assert.equal(capturedEdges.y1, 0 + 80);
    assert.equal(capturedEdges.x2, 0 + 100);
    assert.equal(capturedEdges.y2, 0);
  });
});

// ── Connect-menu position clamping ──────────────────────────────────────────

/**
 * Pure logic matching the viewport-clamping in arbor-connect-menu.js.
 * Given a cursor position, menu dimensions, and viewport size, returns
 * the clamped { left, top } position.
 */
function clampMenuPosition(
  screenX,
  screenY,
  menuWidth,
  menuHeight,
  viewW,
  viewH,
) {
  var left = screenX;
  var top = screenY;
  if (left + menuWidth > viewW) {
    left = viewW - menuWidth - 8;
  }
  if (top + menuHeight > viewH) {
    top = viewH - menuHeight - 8;
  }
  if (left < 0) left = 8;
  if (top < 0) top = 8;
  return { left: left, top: top };
}

describe("connect-menu position clamping", function () {
  test("positions menu at cursor when within viewport", function () {
    var result = clampMenuPosition(200, 300, 140, 152, 1024, 768);
    assert.equal(result.left, 200);
    assert.equal(result.top, 300);
  });

  test("clamps right edge when overflow", function () {
    var result = clampMenuPosition(950, 300, 140, 152, 1024, 768);
    assert.equal(result.left, 1024 - 140 - 8);
  });

  test("clamps bottom edge when overflow", function () {
    var result = clampMenuPosition(200, 700, 140, 152, 1024, 768);
    assert.equal(result.top, 768 - 152 - 8);
  });

  test("clamps left edge when negative", function () {
    var result = clampMenuPosition(-10, 300, 140, 152, 1024, 768);
    assert.equal(result.left, 8);
  });

  test("clamps top edge when negative", function () {
    var result = clampMenuPosition(200, -10, 140, 152, 1024, 768);
    assert.equal(result.top, 8);
  });
});
