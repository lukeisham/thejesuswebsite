// Admin arbor edge re-route tests — uses node:test + node:assert.
// Exercises the pure waypoint-manipulation helpers in
// admin-arbor/arbor-edge-reroute.js (grid snap, insert/remove/move/nudge,
// commit payload). The DOM-bound drag/keyboard wiring is validated manually
// via browser testing (see setup/TESTS/admin_tests.md).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const reroutePath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-arbor",
  "arbor-edge-reroute.js",
);
const rerouteSource = fs.readFileSync(reroutePath, "utf8");

function loadReroute() {
  const sandbox = {
    window: {
      AdminArborCanvas: {
        getTransformGroup: function () {
          return null;
        },
        getTransform: function () {
          return { x: 0, y: 0, scale: 1 };
        },
        clientToDiagram: function (x, y) {
          return { x: x, y: y };
        },
      },
      AdminArborGeometry: { NODE_WIDTH: 200, NODE_HEIGHT: 80 },
      AdminArborEdges: {
        computeEdgePath: function () {
          return "";
        },
        setEdgeWaypoints: function () {},
        renderEdges: function () {},
      },
      UpdateRecord: {
        updateEdge: async function (id, data) {
          return Object.assign({ id: id }, data);
        },
      },
      showToast: function () {},
    },
    document: {
      querySelector: function () {
        return null;
      },
      addEventListener: function () {},
      removeEventListener: function () {},
      createElementNS: function () {
        return {
          setAttribute: function () {},
          appendChild: function () {},
          addEventListener: function () {},
          style: {},
        };
      },
    },
    console: { error: function () {} },
  };
  vm.runInNewContext(rerouteSource, sandbox);
  return sandbox.window.AdminArborEdgeReroute;
}

const Reroute = loadReroute();

// Objects returned by vm.runInNewContext live in a different realm, so
// assert.deepEqual (deepStrictEqual) fails on prototype identity even when
// structurally identical. Compare via JSON instead (mirrors the rest of this
// suite's property-by-property style for the same reason).
function deq(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

// ── snapToGrid ───────────────────────────────────────────────────────────────

describe("snapToGrid", function () {
  test("snaps to the nearest 12px grid step by default", function () {
    assert.equal(Reroute.snapToGrid(5), 0);
    assert.equal(Reroute.snapToGrid(7), 12);
    assert.equal(Reroute.snapToGrid(18), 24);
    assert.equal(Reroute.snapToGrid(24), 24);
  });

  test("honours a custom grid size", function () {
    assert.equal(Reroute.snapToGrid(9, 10), 10);
    assert.equal(Reroute.snapToGrid(4, 10), 0);
  });

  test("handles negative coordinates", function () {
    assert.equal(Reroute.snapToGrid(-7), -12);
    // Math.round(-5/12) yields -0, not 0 — assert.equal (Object.is-based)
    // would fail on sign alone even though -0 === 0 everywhere it's used.
    assert.ok(Reroute.snapToGrid(-5) === 0);
  });
});

// ── insertWaypointAtSegment ────────────────────────────────────────────────

describe("insertWaypointAtSegment", function () {
  test("inserts at the given segment index without mutating the input", function () {
    const original = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
    const result = Reroute.insertWaypointAtSegment(original, 1, 15, 15);
    assert.equal(result.length, 3);
    deq(result[1], { x: 15, y: 15 });
    assert.equal(original.length, 2, "input array must not be mutated");
  });

  test("inserting at index 0 prepends (segment between source and first waypoint)", function () {
    const result = Reroute.insertWaypointAtSegment([{ x: 20, y: 20 }], 0, 5, 5);
    deq(result[0], { x: 5, y: 5 });
    deq(result[1], { x: 20, y: 20 });
  });

  test("inserting at index === length appends (segment before target)", function () {
    const result = Reroute.insertWaypointAtSegment([{ x: 5, y: 5 }], 1, 20, 20);
    deq(result[1], { x: 20, y: 20 });
  });

  test("works on an empty waypoints array", function () {
    const result = Reroute.insertWaypointAtSegment([], 0, 1, 2);
    deq(result, [{ x: 1, y: 2 }]);
  });
});

// ── removeWaypointAt ─────────────────────────────────────────────────────────

describe("removeWaypointAt", function () {
  test("removes the waypoint at the given index without mutating the input", function () {
    const original = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    const result = Reroute.removeWaypointAt(original, 1);
    deq(result, [{ x: 1, y: 1 }, { x: 3, y: 3 }]);
    assert.equal(original.length, 3, "input array must not be mutated");
  });

  test("removing the only waypoint yields an empty array", function () {
    const result = Reroute.removeWaypointAt([{ x: 1, y: 1 }], 0);
    deq(result, []);
  });
});

// ── moveWaypoint ─────────────────────────────────────────────────────────────

describe("moveWaypoint", function () {
  test("moves and snaps a waypoint to the grid", function () {
    const original = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const result = Reroute.moveWaypoint(original, 0, 7, 19);
    deq(result[0], { x: 12, y: 24 });
    deq(result[1], { x: 100, y: 100 }, "other waypoints untouched");
    deq(original[0], { x: 0, y: 0 }, "input array must not be mutated");
  });
});

// ── nudgeWaypoint ────────────────────────────────────────────────────────────

describe("nudgeWaypoint", function () {
  test("nudges by one grid step in each cardinal direction", function () {
    const start = [{ x: 24, y: 24 }];
    deq(Reroute.nudgeWaypoint(start, 0, 1, 0), [{ x: 36, y: 24 }]);
    deq(Reroute.nudgeWaypoint(start, 0, -1, 0), [{ x: 12, y: 24 }]);
    deq(Reroute.nudgeWaypoint(start, 0, 0, 1), [{ x: 24, y: 36 }]);
    deq(Reroute.nudgeWaypoint(start, 0, 0, -1), [{ x: 24, y: 12 }]);
  });

  test("honours a custom grid size", function () {
    const result = Reroute.nudgeWaypoint([{ x: 0, y: 0 }], 0, 1, 0, 5);
    deq(result, [{ x: 5, y: 0 }]);
  });

  test("does not mutate the input array", function () {
    const original = [{ x: 0, y: 0 }];
    Reroute.nudgeWaypoint(original, 0, 1, 1);
    deq(original[0], { x: 0, y: 0 });
  });
});

// ── buildCommitPayload ───────────────────────────────────────────────────────

describe("buildCommitPayload", function () {
  test("wraps a non-empty waypoints array as-is", function () {
    const points = [{ x: 1, y: 2 }];
    const payload = Reroute.buildCommitPayload(points);
    deq(payload, { waypoints: points });
  });

  test("an empty array commits as null (clears re-routing, default path)", function () {
    const payload = Reroute.buildCommitPayload([]);
    deq(payload, { waypoints: null });
  });
});
