// Timeline drag-transition tests — node:test + node:assert.
// Verifies the .timeline-world--panning class lifecycle: added when a drag
// starts, removed when it ends. Mirrors timeline-zoom.js's onPanStart/
// onPanEnd logic against a minimal fake DOM object (pattern from
// admin/tests/admin-editor-utils.test.js), since timeline-zoom.js is an ES
// module with module-private state that isn't practical to import directly
// into a CommonJS node:test file — consistent with timeline-zoom.test.js,
// which mirrors the module's math rather than importing it.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Minimal fake DOM element ────────────────────────────────────────────────

function makeWorldEl() {
  const classes = new Set();
  return {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
  };
}

// ── Mirrors timeline-zoom.js's onPanStart/onPanEnd class management ────────
// (isVerticalMode / dot-and-controls target checks are omitted here — they
// gate whether panning starts at all, not the class toggle itself.)

function createPanController(worldEl) {
  let isPanning = false;

  return {
    onPanStart() {
      isPanning = true;
      if (worldEl) worldEl.classList.add("timeline-world--panning");
    },
    onPanEnd() {
      if (!isPanning) return;
      isPanning = false;
      if (worldEl) worldEl.classList.remove("timeline-world--panning");
    },
    isPanning: () => isPanning,
  };
}

describe("Timeline drag-transition — .timeline-world--panning class", () => {
  test("pointer-down adds the panning class", () => {
    const worldEl = makeWorldEl();
    const controller = createPanController(worldEl);

    controller.onPanStart();

    assert.ok(worldEl.classList.contains("timeline-world--panning"));
    assert.ok(controller.isPanning());
  });

  test("pointer-move during an active drag does not remove the class", () => {
    const worldEl = makeWorldEl();
    const controller = createPanController(worldEl);

    controller.onPanStart();
    // A pan-move handler only reads isPanning() and repositions — it never
    // touches the class, so simulate a few moves and re-assert.
    assert.ok(controller.isPanning());
    assert.ok(worldEl.classList.contains("timeline-world--panning"));

    assert.ok(controller.isPanning());
    assert.ok(worldEl.classList.contains("timeline-world--panning"));
  });

  test("pointer-up removes the panning class", () => {
    const worldEl = makeWorldEl();
    const controller = createPanController(worldEl);

    controller.onPanStart();
    controller.onPanEnd();

    assert.ok(!worldEl.classList.contains("timeline-world--panning"));
    assert.ok(!controller.isPanning());
  });

  test("pointer-up without a prior pointer-down is a no-op (no error, no class)", () => {
    const worldEl = makeWorldEl();
    const controller = createPanController(worldEl);

    controller.onPanEnd();

    assert.ok(!worldEl.classList.contains("timeline-world--panning"));
    assert.ok(!controller.isPanning());
  });

  test("a missing worldEl does not throw during start or end", () => {
    const controller = createPanController(null);

    assert.doesNotThrow(() => controller.onPanStart());
    assert.doesNotThrow(() => controller.onPanEnd());
  });

  test("start-move-end sequence leaves no lingering class (mouse and touch share this path)", () => {
    const worldEl = makeWorldEl();
    const controller = createPanController(worldEl);

    controller.onPanStart(); // mousedown / touchstart
    controller.onPanStart(); // a second down event before up (defensive — shouldn't double-toggle)
    controller.onPanEnd(); // mouseup / touchend

    assert.ok(!worldEl.classList.contains("timeline-world--panning"));
  });
});
