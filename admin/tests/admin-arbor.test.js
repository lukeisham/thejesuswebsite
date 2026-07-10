// Admin arbor tests — uses node:test + node:assert.
// Tests the pure coordinate helpers from admin-arbor/arbor-canvas.js
// (screenToDiagram, diagramToScreen) and the edge-validation logic from
// admin-arbor/arbor-edges.js (validateConnection).
//
// The DOM-bound drag/click canvas wiring is validated manually via browser
// testing (see setup/TESTS/admin_tests.md for the manual checklist).

const { test, describe } = require("node:test");
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
