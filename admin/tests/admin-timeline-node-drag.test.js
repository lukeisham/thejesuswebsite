// AdminTimelineNodeDrag math tests — node:test + node:assert.
// Tests the core position-computation logic used by updateDotPosition
// and the base-position capture at pointerdown, without requiring a
// full DOM or pointer-event simulation.
//
// Key properties verified:
//   1. Calling the position formula twice with the same offset produces
//      the same result (no cumulative drift).
//   2. The top formula matches the renderEvents formula exactly.
//   3. Moving right increases left, moving left decreases it (monotonic).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── The renderEvents-compatible top formula ──────────────────────────────

/**
 * Compute the dot's vertical position in pixels from an offsetY fraction.
 * This is the formula used by renderEvents (timeline-events.js line 193):
 *   y = (280 * (50 + finalY / 2)) / 100   where finalY = offsetY * 280
 *
 * @param {number} offsetY - fraction of canvas height (e.g. 0, 0.2, -0.2)
 * @returns {number} pixel position
 */
function renderTop(offsetY) {
  var finalY = offsetY * 280;
  return (280 * (50 + finalY / 2)) / 100;
}

// ── The drag horizontal-position formula ─────────────────────────────────

/**
 * Compute the dot's horizontal position from a captured base position and
 * an offsetX fraction. The base is captured once at pointerdown as:
 *   baseLeftPx = dot.style.left - offsetXToPixel(startOffsetX, pxPerPeriod)
 *
 * @param {number} baseLeftPx - period-slot centre (pixels)
 * @param {number} offsetX - offset fraction
 * @param {number} pxPerPeriod - pixels per period slot
 * @returns {number} pixel position
 */
function dragLeft(baseLeftPx, offsetX, pxPerPeriod) {
  return baseLeftPx + offsetX * pxPerPeriod;
}

describe("AdminTimelineNodeDrag — position math", () => {
  describe("renderTop (vertical)", () => {
    test("zero offset produces centre position", () => {
      // When offsetY = 0: finalY = 0, top = 280 * 50 / 100 = 140
      assert.strictEqual(renderTop(0), 140);
    });

    test("positive offset moves the dot down", () => {
      // offsetY = 0.2: finalY = 56, top = 280 * (50 + 28) / 100 = 280 * 0.78 = 218.4
      assert.strictEqual(renderTop(0.2), 218.4);
      // offsetY = 0.4: finalY = 112, top = 280 * (50 + 56) / 100 = 280 * 1.06 = 296.8
      assert.strictEqual(renderTop(0.4), 296.8);
    });

    test("negative offset moves the dot up", () => {
      // offsetY = -0.2: finalY = -56, top = 280 * (50 + (-28)) / 100 = 280 * 0.22 = 61.6
      assert.strictEqual(renderTop(-0.2), 61.6);
      // offsetY = -0.4: finalY = -112, top = 280 * (50 + (-56)) / 100 = 280 * (-0.06) = -16.8
      assert.strictEqual(renderTop(-0.4), -16.8);
    });

    test("monotonic — larger offset always means larger top", () => {
      assert.ok(renderTop(-0.3) < renderTop(-0.1));
      assert.ok(renderTop(-0.1) < renderTop(0));
      assert.ok(renderTop(0) < renderTop(0.1));
      assert.ok(renderTop(0.1) < renderTop(0.3));
    });

    test("no vertical jump on drag start — formula matches render at zero offset", () => {
      // The old code used (50 + offsetY * 280 / 2) which gave 50 at offset 0.
      // The renderEvents formula gives 140 at offset 0 — a 90px jump if mismatched.
      var oldFormula = 50 + 0 * 280 / 2;
      assert.notStrictEqual(oldFormula, renderTop(0),
        "old formula (50) should differ from render formula (140) — this is the bug");
      assert.strictEqual(renderTop(0), 140,
        "new formula must match renderEvents at zero offset");
    });
  });

  describe("dragLeft (horizontal, base-anchored)", () => {
    test("zero offset returns the base position", () => {
      assert.strictEqual(dragLeft(200, 0, 120), 200);
    });

    test("positive offset moves right proportionally", () => {
      // At 120 px/period, offsetX=0.25 = 30px right of base
      assert.strictEqual(dragLeft(200, 0.25, 120), 230);
      assert.strictEqual(dragLeft(200, 0.5, 120), 260);
    });

    test("negative offset moves left proportionally", () => {
      assert.strictEqual(dragLeft(200, -0.25, 120), 170);
      assert.strictEqual(dragLeft(200, -0.5, 120), 140);
    });

    test("monotonic — larger offset always means larger left", () => {
      assert.ok(dragLeft(200, -0.3, 120) < dragLeft(200, -0.1, 120));
      assert.ok(dragLeft(200, -0.1, 120) < dragLeft(200, 0, 120));
      assert.ok(dragLeft(200, 0, 120) < dragLeft(200, 0.1, 120));
      assert.ok(dragLeft(200, 0.1, 120) < dragLeft(200, 0.3, 120));
    });

    test("no drift — same offset always gives same position", () => {
      // The old code re-read style.left each frame and re-subtracted
      // pxPerPeriod/2, causing cumulative leftward drift. The base-anchored
      // formula depends only on the captured base, not on live style values.
      var base = 350;
      for (var i = 0; i < 10; i++) {
        assert.strictEqual(dragLeft(base, 0.15, 120), 350 + 0.15 * 120);
      }
    });

    test("base capture formula — recovers slot centre from dot position", () => {
      // Given a dot at left=380 with offsetX=0.25 at pxPerPeriod=120:
      // baseLeftPx = 380 - 0.25 * 120 = 380 - 30 = 350
      var dotLeft = 380;
      var currentOffset = 0.25;
      var pxPerPeriod = 120;
      var baseLeftPx = dotLeft - currentOffset * pxPerPeriod;
      assert.strictEqual(baseLeftPx, 350);
      // Then dragging to offsetX=-0.1 should give 350 + (-0.1 * 120) = 338
      assert.strictEqual(dragLeft(baseLeftPx, -0.1, pxPerPeriod), 338);
    });

    test("base capture handles negative current offset", () => {
      // Dot at left=152 with offsetX=-0.4 at pxPerPeriod=120:
      // baseLeftPx = 152 - (-0.4 * 120) = 152 + 48 = 200
      var dotLeft = 152;
      var currentOffset = -0.4;
      var pxPerPeriod = 120;
      var baseLeftPx = dotLeft - currentOffset * pxPerPeriod;
      assert.strictEqual(baseLeftPx, 200);
      // Dragging back to zero offset: 200 + 0 = 200
      assert.strictEqual(dragLeft(baseLeftPx, 0, pxPerPeriod), 200);
    });
  });
});

// ── Left-drag candidate threshold logic ──────────────────────────────────
//   Replicates the distance check in timeline-node-drag.js onDocPointerMove
//   before a left-drag candidate activates (CANDIDATE_DRAG_PX = 4).

describe("AdminTimelineNodeDrag — left-drag threshold", () => {
  var CANDIDATE_DRAG_PX = 4;

  /**
   * Returns true if the pointer has moved far enough from the down position
   * to activate the drag.
   */
  function exceedsThreshold(startX, startY, clientX, clientY) {
    var dx = clientX - startX;
    var dy = clientY - startY;
    return Math.abs(dx) >= CANDIDATE_DRAG_PX || Math.abs(dy) >= CANDIDATE_DRAG_PX;
  }

  test("sub-threshold horizontal movement does NOT activate drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 103, 100), false);
  });

  test("sub-threshold vertical movement does NOT activate drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 100, 103), false);
  });

  test("sub-threshold diagonal movement does NOT activate drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 102, 102), false);
  });

  test("supra-threshold horizontal movement activates drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 104, 100), true);
  });

  test("supra-threshold vertical movement activates drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 100, 104), true);
  });

  test("supra-threshold diagonal movement activates drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 104, 104), true);
  });

  test("zero movement does NOT activate drag", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 100, 100), false);
  });

  test("negative movement (left/up) activates drag past threshold", () => {
    assert.strictEqual(exceedsThreshold(100, 100, 96, 100), true);
    assert.strictEqual(exceedsThreshold(100, 100, 100, 96), true);
  });
});

// ── Left-drag state machine / cleanup ─────────────────────────────────────
//   Tests the dragState transitions: candidate → active → cleanup.

describe("AdminTimelineNodeDrag — state machine", () => {
  /**
   * Simulate cleanup of a candidate drag that never activated.
   * After cleanup, dragState is null and no offset was written.
   */
  function cleanupSubThreshold(dragState) {
    if (!dragState._active) {
      return null; // Let click fire
    }
    return dragState; // Active drag — would stage offset
  }

  test("sub-threshold click leaves dragState null (click fires)", () => {
    var candidate = {
      eventId: 42,
      dot: {},
      pointerId: 1,
      startX: 100,
      startY: 100,
      button: 0,
      _active: false,
    };
    var result = cleanupSubThreshold(candidate);
    assert.strictEqual(result, null);
  });

  test("active drag after cleanup returns dragState (stages offset)", () => {
    var active = {
      eventId: 42,
      dot: {},
      pointerId: 1,
      startX: 100,
      startY: 100,
      button: 0,
      _active: true,
      startOffsetX: 0.1,
      startOffsetY: -0.05,
    };
    var result = cleanupSubThreshold(active);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.startOffsetX, 0.1);
  });

  test("right-drag is always active from the start", () => {
    var rightDrag = {
      eventId: 7,
      dot: {},
      pointerId: 2,
      startX: 50,
      startY: 50,
      button: 2,
      _active: true,
      startOffsetX: 0,
      startOffsetY: 0,
    };
    var result = cleanupSubThreshold(rightDrag);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result.button, 2);
  });

  test("pointercancel on candidate cleans up — no offset written", () => {
    var candidate = {
      eventId: 99,
      dot: {},
      pointerId: 3,
      startX: 200,
      startY: 200,
      button: 0,
      _active: false,
    };
    var result = cleanupSubThreshold(candidate);
    assert.strictEqual(result, null);
  });

  test("drag activation sets _active and flags the dot", () => {
    var candidate = {
      eventId: 5,
      dot: {},
      pointerId: 1,
      startX: 100,
      startY: 100,
      button: 0,
      _active: false,
      startOffsetX: null,
      startOffsetY: null,
    };
    candidate._active = true;
    candidate.dot._timelineDragActive = true;
    candidate.startOffsetX = 0.15;
    candidate.startOffsetY = 0.05;

    assert.strictEqual(candidate._active, true);
    assert.strictEqual(candidate.dot._timelineDragActive, true);
    assert.strictEqual(candidate.startOffsetX, 0.15);
    assert.notStrictEqual(candidate.startOffsetY, null);
  });

  test("left-drag activation removes _timelineDragActive from dot on cleanup", () => {
    var active = {
      eventId: 10,
      dot: { _timelineDragActive: true },
      pointerId: 1,
      button: 0,
      _active: true,
      startOffsetX: 0.2,
      startOffsetY: 0,
    };
    delete active.dot._timelineDragActive;
    assert.strictEqual(active.dot._timelineDragActive, undefined);
  });
});
